-- ============================================================================
-- Security hardening — fixes 4 issues found in a pre-launch security audit,
-- before this project is ever connected to a live Supabase instance:
--
--   1. Admin self-escalation: affiliates_update_own_or_admin had no column
--      restriction, so any authenticated user could run
--      `update affiliates set role='admin' where id=<their own id>` directly
--      via the JS client and grant themselves admin (is_admin() just reads
--      this same column). Also let a user rewrite their own referred_by to
--      set up a referral-commission farming cycle with a second account.
--   2. Guest order / order_items / payment_proofs PII leak: the "guest
--      checkout" SELECT policies used `or affiliate_id is null`, which is a
--      blanket grant — RLS has no notion of "caller already knows this one
--      ID", so literally anyone (including anon) could run
--      `select * from payment_proofs` and read every guest order's name,
--      phone, address, and payment-proof image for every guest checkout ever
--      placed, not just their own.
--   3. Order price tampering: order_items.unit_price / orders.subtotal/total
--      were trusted verbatim from the client (orderService.js), with no
--      server-side recomputation against products.price — a classic
--      price-tampering hole that also inflates/deflates referral commission
--      payouts (distribute_commissions() pays on orders.subtotal).
--   4. request_partner_withdrawal had no amount>0 check (unlike its sibling
--      request_withdrawal), so any user with an active investment could
--      submit a negative amount and have it SUBTRACTED from their reserved
--      balance, i.e. add money to their own available_profit/principal for
--      free.
-- Run after 0001-0005.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Lock down role / status / referred_by on affiliates to admin-only,
--    regardless of what the "update your own row" RLS policy allows.
--    Mirrors the same pattern used for profiles elsewhere in this app: the
--    RLS policy decides *which rows* you can touch, this trigger decides
--    *which columns* you're allowed to actually change on them.
-- ----------------------------------------------------------------------------
create or replace function public.protect_affiliate_privilege_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.referred_by is distinct from old.referred_by)
     and not public.is_admin() then
    raise exception 'Not authorized to change role, status, or referred_by';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_affiliates_protect_privilege_fields on public.affiliates;
create trigger trg_affiliates_protect_privilege_fields
  before update on public.affiliates
  for each row execute function public.protect_affiliate_privilege_fields();

-- ----------------------------------------------------------------------------
-- 2. Guest order access: replace the blanket "affiliate_id is null" SELECT
--    grant with a per-order secret token, checked inside a SECURITY DEFINER
--    RPC instead of a row-level policy. Logged-in affiliates and admins keep
--    reading their own/all orders exactly as before (unchanged clauses).
-- ----------------------------------------------------------------------------
alter table public.orders add column if not exists access_token uuid not null default gen_random_uuid();

drop policy if exists "orders_select_own_or_guest_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders for select
  using (affiliate_id = public.auth_affiliate_id() or public.is_admin());

drop policy if exists "order_items_select_scoped" on public.order_items;
create policy "order_items_select_scoped" on public.order_items for select
  using (exists (
    select 1 from public.orders o where o.id = order_id
    and (o.affiliate_id = public.auth_affiliate_id() or public.is_admin())
  ));

drop policy if exists "payment_proofs_select_scoped" on public.payment_proofs;
create policy "payment_proofs_select_scoped" on public.payment_proofs for select
  using (exists (
    select 1 from public.orders o where o.id = order_id
    and (o.affiliate_id = public.auth_affiliate_id() or public.is_admin())
  ));

-- Single lookup RPC covering all three legitimate callers: the owning
-- affiliate (via auth_affiliate_id()), an admin, or a guest presenting the
-- order's own access_token (e.g. from its confirmation-page URL) — nobody
-- else, and no way to enumerate/list orders this way (must already have one
-- specific id+token or be authorized).
create or replace function public.get_order_full(p_order_id uuid, p_token uuid default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_items jsonb;
  v_proofs jsonb;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.id is null then
    raise exception 'order not found';
  end if;

  if not (
    v_order.affiliate_id = public.auth_affiliate_id()
    or public.is_admin()
    or (p_token is not null and v_order.access_token = p_token)
  ) then
    raise exception 'not authorized';
  end if;

  select coalesce(jsonb_agg(to_jsonb(oi)), '[]'::jsonb) into v_items
    from public.order_items oi where oi.order_id = p_order_id;
  select coalesce(jsonb_agg(to_jsonb(pp)), '[]'::jsonb) into v_proofs
    from public.payment_proofs pp where pp.order_id = p_order_id;

  return jsonb_build_object('order', to_jsonb(v_order), 'items', v_items, 'proofs', v_proofs);
end;
$$;

grant execute on function public.get_order_full(uuid, uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Price tampering: order_items.unit_price/line_total are now always
--    recomputed server-side from products.price, never trusted from the
--    insert payload, and orders.subtotal/total are recalculated from the
--    (now-trustworthy) order_items right after. This runs regardless of what
--    orderService.js sends, so it closes the hole even before any frontend
--    change ships.
-- ----------------------------------------------------------------------------
create or replace function public.enforce_order_item_price()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_price numeric;
begin
  if new.quantity <= 0 then
    raise exception 'quantity must be positive';
  end if;
  if new.product_id is null then
    raise exception 'order_items.product_id is required';
  end if;

  select price into v_price from public.products where id = new.product_id;
  if v_price is null then
    raise exception 'product not found: %', new.product_id;
  end if;

  new.unit_price := v_price;
  new.line_total := round(v_price * new.quantity, 2);
  return new;
end;
$$;

drop trigger if exists trg_order_items_enforce_price on public.order_items;
create trigger trg_order_items_enforce_price
  before insert on public.order_items
  for each row execute function public.enforce_order_item_price();

create or replace function public.recalc_order_totals()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_subtotal numeric;
begin
  select coalesce(sum(line_total), 0) into v_subtotal
    from public.order_items where order_id = new.order_id;

  update public.orders
  set subtotal = v_subtotal, total = v_subtotal + shipping_fee, updated_at = now()
  where id = new.order_id;

  return new;
end;
$$;

drop trigger if exists trg_order_items_recalc_order_totals on public.order_items;
create trigger trg_order_items_recalc_order_totals
  after insert on public.order_items
  for each row execute function public.recalc_order_totals();

-- ----------------------------------------------------------------------------
-- 4. request_partner_withdrawal: add the amount>0 guard its sibling
--    request_withdrawal already had. Same signature, so a plain replace.
-- ----------------------------------------------------------------------------
create or replace function public.request_partner_withdrawal(p_investment_id uuid, p_type text, p_amount numeric)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_affiliate_id uuid;
  v_inv public.partner_investments%rowtype;
  v_settings public.partner_settings%rowtype;
  v_fee numeric;
  v_id uuid;
begin
  v_affiliate_id := public.auth_affiliate_id();
  if v_affiliate_id is null then raise exception 'not authenticated'; end if;

  if p_amount <= 0 then raise exception 'amount must be positive'; end if;

  select * into v_inv from public.partner_investments where id = p_investment_id and affiliate_id = v_affiliate_id for update;
  if v_inv.id is null then raise exception 'investment not found or not owned by you'; end if;
  if v_inv.status <> 'active' then raise exception 'investment is not active'; end if;

  select * into v_settings from public.partner_settings limit 1;

  if p_type = 'profit_only' then
    if not v_settings.allow_profit_only_withdrawal then raise exception 'profit-only withdrawal is not currently allowed'; end if;
    if p_amount > v_inv.available_profit then raise exception 'amount exceeds available profit'; end if;
    update public.partner_investments set available_profit = available_profit - p_amount where id = p_investment_id;
  elsif p_type = 'whole' then
    if not v_settings.allow_principal_withdrawal then raise exception 'whole-amount withdrawal is not currently allowed'; end if;
    if p_amount > (v_inv.available_principal + v_inv.available_profit) then raise exception 'amount exceeds available balance'; end if;
    -- draw profit first, then principal
    update public.partner_investments
    set available_profit = greatest(0, available_profit - p_amount),
        available_principal = available_principal - greatest(0, p_amount - available_profit)
    where id = p_investment_id;
  else
    raise exception 'invalid withdrawal type';
  end if;

  v_fee := round(p_amount * v_settings.withdrawal_fee_percentage / 100, 2);

  insert into public.partner_withdrawal_requests
    (investment_id, affiliate_id, withdrawal_type, amount, fee_percentage, fee_amount, net_amount, status)
  values (p_investment_id, v_affiliate_id, p_type, p_amount, v_settings.withdrawal_fee_percentage, v_fee, p_amount - v_fee, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

-- Defense-in-depth belt-and-suspenders for the main wallet withdrawal path
-- too (already indirectly guarded by min_withdrawal, but that only holds as
-- long as an admin never sets min_withdrawal <= 0 — see the CHECK
-- constraints below).
create or replace function public.request_withdrawal(p_amount numeric, p_method text, p_account_details text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_affiliate_id uuid;
  v_available numeric;
  v_min numeric;
  v_max numeric;
  v_fee_pct numeric;
  v_fee numeric;
  v_id uuid;
begin
  v_affiliate_id := public.auth_affiliate_id();
  if v_affiliate_id is null then raise exception 'not authenticated'; end if;

  if p_amount <= 0 then raise exception 'amount must be positive'; end if;

  select min_withdrawal, max_withdrawal, withdrawal_fee_percentage
    into v_min, v_max, v_fee_pct from public.platform_settings limit 1;

  if p_amount < v_min then raise exception 'amount below minimum withdrawal of %', v_min; end if;
  if v_max is not null and p_amount > v_max then raise exception 'amount exceeds maximum withdrawal of %', v_max; end if;

  select available_balance into v_available from public.wallets where affiliate_id = v_affiliate_id for update;
  if v_available is null or p_amount > v_available then raise exception 'insufficient balance'; end if;

  update public.wallets set available_balance = available_balance - p_amount, updated_at = now()
  where affiliate_id = v_affiliate_id;

  v_fee := round(p_amount * v_fee_pct / 100, 2);

  insert into public.withdrawal_requests
    (affiliate_id, amount, fee_percentage, fee_amount, net_amount, method, account_details, status)
  values (v_affiliate_id, p_amount, v_fee_pct, v_fee, p_amount - v_fee, p_method, p_account_details, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

-- Prevents an admin setting (e.g. via AdminSettings.jsx) from silently
-- reopening the negative-withdrawal hole for either module.
alter table public.platform_settings
  drop constraint if exists platform_settings_min_withdrawal_nonneg,
  add constraint platform_settings_min_withdrawal_nonneg check (min_withdrawal >= 0);
alter table public.platform_settings
  drop constraint if exists platform_settings_max_withdrawal_order,
  add constraint platform_settings_max_withdrawal_order check (max_withdrawal is null or max_withdrawal >= min_withdrawal);

alter table public.partner_settings
  drop constraint if exists partner_settings_min_investment_nonneg,
  add constraint partner_settings_min_investment_nonneg check (min_investment >= 0);
alter table public.partner_settings
  drop constraint if exists partner_settings_max_investment_order,
  add constraint partner_settings_max_investment_order check (max_investment is null or max_investment >= min_investment);

-- ----------------------------------------------------------------------------
-- 5. Low-severity: profiles.phone has no uniqueness constraint, so
--    email_for_identifier()'s `... limit 1` lookup (used to resolve a
--    phone-based login) can land on an unpredictable row if two profiles
--    ever share a phone number. Partial index so multiple NULLs stay legal.
-- ----------------------------------------------------------------------------
create unique index if not exists profiles_phone_unique_idx on public.profiles (phone) where phone is not null;
