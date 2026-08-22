-- =============================================================================
-- "Become a Partner" investment module.
--
-- The original spec explicitly does NOT define a profit formula, and forbids
-- inventing one. This migration implements the full technical module —
-- application, investment records, date-wise profit ledger, whole/profit-only
-- withdrawal, admin approval — with every business number admin-configurable
-- and defaulted to inert/zero values (module disabled, 0% rate) until a real
-- business decision is entered. Nothing here pays out or promises a return
-- unless an admin explicitly configures and enables it.
-- =============================================================================

create table public.partner_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  min_investment numeric(14, 2) not null default 0,
  max_investment numeric(14, 2),
  -- 'manual' = admin posts each profit entry by hand (the safe default —
  -- makes no assumption about a rate). 'fixed_percentage' = admin sets a
  -- rate + frequency below and can trigger admin_run_partner_profit_cycle()
  -- to auto-post that period's profit to every active investment.
  profit_calculation_type text not null default 'manual' check (profit_calculation_type in ('manual', 'fixed_percentage')),
  profit_rate_percentage numeric(6, 3) not null default 0,
  profit_frequency text not null default 'weekly' check (profit_frequency in ('weekly', 'monthly')),
  allow_principal_withdrawal boolean not null default true,
  allow_profit_only_withdrawal boolean not null default true,
  withdrawal_fee_percentage numeric(5, 2) not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.partner_settings (id) values (true) on conflict (id) do nothing;

create table public.partner_investments (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'closed', 'rejected')),
  principal_amount numeric(14, 2) not null,
  proof_image_url text,
  available_principal numeric(14, 2) not null default 0,
  available_profit numeric(14, 2) not null default 0,
  total_profit_earned numeric(14, 2) not null default 0,
  admin_note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index partner_investments_affiliate_idx on public.partner_investments (affiliate_id);

create table public.partner_profit_entries (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.partner_investments (id) on delete cascade,
  amount numeric(14, 2) not null,
  entry_date date not null default current_date,
  note text,
  created_by text not null default 'admin' check (created_by in ('admin', 'system')),
  created_at timestamptz not null default now()
);

create index partner_profit_entries_investment_idx on public.partner_profit_entries (investment_id);

create table public.partner_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  investment_id uuid not null references public.partner_investments (id) on delete cascade,
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  withdrawal_type text not null check (withdrawal_type in ('whole', 'profit_only')),
  amount numeric(14, 2) not null,
  fee_percentage numeric(5, 2) not null,
  fee_amount numeric(14, 2) not null,
  net_amount numeric(14, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index partner_withdrawal_requests_affiliate_idx on public.partner_withdrawal_requests (affiliate_id);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.partner_settings enable row level security;
alter table public.partner_investments enable row level security;
alter table public.partner_profit_entries enable row level security;
alter table public.partner_withdrawal_requests enable row level security;

create policy "partner_settings_select_all" on public.partner_settings for select using (true);
create policy "partner_settings_admin_write" on public.partner_settings for update
  using (public.is_admin()) with check (public.is_admin());

create policy "partner_investments_select_own_or_admin" on public.partner_investments for select
  using (affiliate_id = public.auth_affiliate_id() or public.is_admin());
create policy "partner_investments_insert_own" on public.partner_investments for insert
  with check (affiliate_id = public.auth_affiliate_id());

create policy "partner_profit_entries_select_own_or_admin" on public.partner_profit_entries for select
  using (exists (
    select 1 from public.partner_investments i where i.id = investment_id
    and (i.affiliate_id = public.auth_affiliate_id() or public.is_admin())
  ));

create policy "partner_withdrawal_requests_select_own_or_admin" on public.partner_withdrawal_requests for select
  using (affiliate_id = public.auth_affiliate_id() or public.is_admin());

-- =============================================================================
-- Business logic — SECURITY DEFINER, server-side only (never trust a
-- client-supplied amount/rate/balance for money movement).
-- =============================================================================

-- Affiliate applies to become a partner. Reuses the same "pay externally,
-- upload proof, admin verifies" pattern as order checkout — no payment
-- gateway is wired up for investments either.
create or replace function public.apply_for_partner(p_principal_amount numeric, p_proof_image_url text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_affiliate_id uuid;
  v_settings public.partner_settings%rowtype;
  v_id uuid;
begin
  v_affiliate_id := public.auth_affiliate_id();
  if v_affiliate_id is null then raise exception 'not authenticated'; end if;

  select * into v_settings from public.partner_settings limit 1;
  if not v_settings.enabled then raise exception 'the partner investment program is not currently open'; end if;
  if p_principal_amount < v_settings.min_investment then
    raise exception 'amount is below the minimum investment of %', v_settings.min_investment;
  end if;
  if v_settings.max_investment is not null and p_principal_amount > v_settings.max_investment then
    raise exception 'amount exceeds the maximum investment of %', v_settings.max_investment;
  end if;

  insert into public.partner_investments (affiliate_id, principal_amount, proof_image_url, status)
  values (v_affiliate_id, p_principal_amount, p_proof_image_url, 'pending')
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.apply_for_partner(numeric, text) to authenticated;

create or replace function public.admin_set_investment_status(p_investment_id uuid, p_new_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_old text; v_principal numeric;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select status, principal_amount into v_old, v_principal from public.partner_investments where id = p_investment_id;
  if v_old is null then raise exception 'investment not found'; end if;
  if v_old <> 'pending' then raise exception 'only a pending application can be approved or rejected'; end if;

  if p_new_status = 'active' then
    update public.partner_investments
    set status = 'active', available_principal = v_principal, approved_at = now(), admin_note = p_note
    where id = p_investment_id;
  elsif p_new_status = 'rejected' then
    update public.partner_investments set status = 'rejected', admin_note = p_note where id = p_investment_id;
  else
    raise exception 'invalid status transition';
  end if;
end;
$$;

grant execute on function public.admin_set_investment_status(uuid, text, text) to authenticated;

-- Admin manually posts a profit entry (the safe default mode).
create or replace function public.admin_post_partner_profit(p_investment_id uuid, p_amount numeric, p_entry_date date, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select status into v_status from public.partner_investments where id = p_investment_id for update;
  if v_status is null then raise exception 'investment not found'; end if;
  if v_status <> 'active' then raise exception 'investment is not active'; end if;

  insert into public.partner_profit_entries (investment_id, amount, entry_date, note, created_by)
  values (p_investment_id, p_amount, coalesce(p_entry_date, current_date), p_note, 'admin');

  update public.partner_investments
  set available_profit = available_profit + p_amount, total_profit_earned = total_profit_earned + p_amount
  where id = p_investment_id;
end;
$$;

grant execute on function public.admin_post_partner_profit(uuid, numeric, date, text) to authenticated;

-- Optional automatic mode: admin sets profit_calculation_type='fixed_percentage'
-- and a real rate, then triggers this (manually, or via pg_cron / a scheduled
-- Edge Function in production — not configured here) to post one period's
-- profit to every active investment at the configured rate. No-ops safely if
-- disabled or the rate is still 0.
create or replace function public.admin_run_partner_profit_cycle()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_settings public.partner_settings%rowtype;
  v_inv record;
  v_amount numeric;
  v_count integer := 0;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into v_settings from public.partner_settings limit 1;
  if not v_settings.enabled or v_settings.profit_calculation_type <> 'fixed_percentage' or v_settings.profit_rate_percentage <= 0 then
    return 0;
  end if;

  for v_inv in select * from public.partner_investments where status = 'active' loop
    v_amount := round(v_inv.available_principal * v_settings.profit_rate_percentage / 100, 2);
    if v_amount > 0 then
      insert into public.partner_profit_entries (investment_id, amount, entry_date, note, created_by)
      values (v_inv.id, v_amount, current_date, format('Auto: %s%% %s', v_settings.profit_rate_percentage, v_settings.profit_frequency), 'system');

      update public.partner_investments
      set available_profit = available_profit + v_amount, total_profit_earned = total_profit_earned + v_amount
      where id = v_inv.id;

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.admin_run_partner_profit_cycle() to authenticated;

-- Reserves the requested amount out of the relevant bucket immediately
-- (same reserve-at-request-time pattern as request_withdrawal), so a
-- pending request can never be double-spent.
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

grant execute on function public.request_partner_withdrawal(uuid, text, numeric) to authenticated;

-- Idempotent admin transition — mirrors admin_set_withdrawal_status exactly.
create or replace function public.admin_set_partner_withdrawal_status(p_id uuid, p_new_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_old text; v_investment_id uuid; v_type text; v_amount numeric;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  select status, investment_id, withdrawal_type, amount into v_old, v_investment_id, v_type, v_amount
  from public.partner_withdrawal_requests where id = p_id for update;
  if v_old is null then raise exception 'withdrawal not found'; end if;
  if v_old in ('paid', 'rejected', 'cancelled') then
    raise exception 'withdrawal already finalized (%), no further transitions allowed', v_old;
  end if;

  update public.partner_withdrawal_requests
  set status = p_new_status, admin_note = coalesce(p_note, admin_note), processed_at = now()
  where id = p_id;

  if p_new_status in ('rejected', 'cancelled') then
    if v_type = 'profit_only' then
      update public.partner_investments set available_profit = available_profit + v_amount where id = v_investment_id;
    else
      update public.partner_investments set available_principal = available_principal + v_amount where id = v_investment_id;
    end if;
  end if;
end;
$$;

grant execute on function public.admin_set_partner_withdrawal_status(uuid, text, text) to authenticated;
