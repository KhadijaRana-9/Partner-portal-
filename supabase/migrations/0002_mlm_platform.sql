-- =============================================================================
-- Digitalsofts Affiliate + E-commerce + MLM Platform
-- Supersedes the B2B channel-partner schema created by 0001_init.sql.
--
-- HOW TO APPLY:
--   1. Open your Supabase project -> SQL Editor -> New query
--   2. Paste this entire file and click Run. Safe on a fresh project AND on
--      top of 0001_init.sql (drops the old B2B tables first — this project
--      has no production data, only demo seed data).
--   3. Sign up in the app once (/registration) -> a profile + affiliate row
--      + empty wallet row are auto-created by the trigger below.
--   4. To create your first Super Admin: sign up normally, then run
--         update public.affiliates set role = 'admin' where referral_code = 'DS########';
--      (swap in the code shown on that account's Settings page), or see the
--      bootstrap block at the bottom of this file for a one-shot version.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 0. Drop old B2B-only objects (pre-launch, no prod data to preserve)
-- ---------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.seed_demo_data_for_partner(uuid);

drop table if exists public.support_messages;
drop table if exists public.support_tickets;
drop table if exists public.training_progress;
drop table if exists public.training_courses;
drop table if exists public.certifications;
drop table if exists public.deal_registrations;
drop table if exists public.opportunities;
drop table if exists public.leads;
drop table if exists public.customers;
drop table if exists public.commissions;
drop table if exists public.payouts;
drop table if exists public.products;
drop table if exists public.notifications;

drop function if exists public.auth_partner_id();
drop table if exists public.partners;

alter table public.profiles drop column if exists company;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists phone text;

-- ---------------------------------------------------------------------------
-- 1. affiliates — one row per registered user (was `partners`)
-- ---------------------------------------------------------------------------
create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  referral_code text not null unique,
  referred_by uuid references public.affiliates (id) on delete set null,
  role text not null default 'affiliate' check (role in ('affiliate', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  created_at timestamptz not null default now()
);

create index affiliates_referred_by_idx on public.affiliates (referred_by);
create index affiliates_referral_code_idx on public.affiliates (referral_code);

create or replace function public.auth_affiliate_id()
returns uuid language sql stable security definer set search_path = public
as $$ select id from public.affiliates where profile_id = auth.uid() $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select coalesce((select role = 'admin' from public.affiliates where profile_id = auth.uid()), false) $$;

-- Resolves an email-or-phone login identifier to the auth email so the login
-- form can accept either without a real phone/OTP auth provider configured.
create or replace function public.email_for_identifier(identifier text)
returns text language sql stable security definer set search_path = public
as $$ select email from public.profiles where email = identifier or phone = identifier limit 1 $$;

grant execute on function public.email_for_identifier(text) to anon, authenticated;

-- Recursive downline walker for referral-network stats/tree (levels 1-5).
create or replace function public.get_downline(p_affiliate_id uuid, p_max_depth int default 5)
returns table (id uuid, level int)
language sql stable security definer set search_path = public
as $$
  with recursive downline as (
    select a.id, 1 as level from public.affiliates a where a.referred_by = p_affiliate_id
    union all
    select a.id, d.level + 1
    from public.affiliates a
    join downline d on a.referred_by = d.id
    where d.level < p_max_depth
  )
  select id, level from downline
$$;

grant execute on function public.get_downline(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. product_categories + products — consumer goods catalog
-- ---------------------------------------------------------------------------
create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories (id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12, 2) not null default 0,
  compare_at_price numeric(12, 2),
  image_url text,
  gallery jsonb not null default '[]'::jsonb,
  stock_quantity integer not null default 0,
  sku text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'archived')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status);

-- ---------------------------------------------------------------------------
-- 3. orders, order_items, payment_proofs
-- ---------------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  affiliate_id uuid references public.affiliates (id) on delete set null, -- null = guest checkout
  customer_name text not null,
  customer_email text,
  customer_phone text not null,
  shipping_address text not null,
  shipping_city text not null,
  shipping_notes text,
  payment_method text not null
    check (payment_method in ('jazzcash', 'easypaisa', 'bank_transfer', 'crypto', 'cash')),
  subtotal numeric(12, 2) not null default 0,
  shipping_fee numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  status text not null default 'pending_payment'
    check (status in (
      'pending_payment', 'payment_submitted', 'payment_approved', 'order_confirmed',
      'processing', 'delivered', 'rejected', 'cancelled', 'returned', 'refunded'
    )),
  admin_note text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,      -- snapshot, survives product edits/deletion
  unit_price numeric(12, 2) not null,
  quantity integer not null default 1,
  line_total numeric(12, 2) not null
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  image_url text not null,
  note text,
  uploaded_at timestamptz not null default now()
);

create index orders_affiliate_idx on public.orders (affiliate_id);
create index order_items_order_idx on public.order_items (order_id);
create index payment_proofs_order_idx on public.payment_proofs (order_id);

insert into storage.buckets (id, name, public) values ('payment-proofs', 'payment-proofs', true)
  on conflict (id) do nothing;
create policy "payment_proofs_upload_anyone" on storage.objects for insert
  with check (bucket_id = 'payment-proofs');
create policy "payment_proofs_read_all" on storage.objects for select
  using (bucket_id = 'payment-proofs');

-- ---------------------------------------------------------------------------
-- 4. commission_levels (single configuration source, admin-editable)
-- ---------------------------------------------------------------------------
create table public.commission_levels (
  level integer primary key check (level between 1 and 5),
  percentage numeric(5, 2) not null
);

insert into public.commission_levels (level, percentage) values
  (1, 10), (2, 5), (3, 3), (4, 2), (5, 1)
on conflict (level) do nothing;

-- ---------------------------------------------------------------------------
-- 5. platform_settings — singleton row, admin-editable withdrawal rules
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  id boolean primary key default true check (id),
  min_withdrawal numeric(12, 2) not null default 1000,
  max_withdrawal numeric(12, 2),
  withdrawal_fee_percentage numeric(5, 2) not null default 5,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. commissions + wallets + withdrawal_requests
-- ---------------------------------------------------------------------------
create table public.commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  order_id uuid references public.orders (id) on delete set null,
  source_affiliate_id uuid references public.affiliates (id) on delete set null,
  level integer not null check (level between 1 and 5),
  commission_percentage numeric(5, 2) not null,
  order_amount numeric(12, 2) not null,
  commission_amount numeric(12, 2) not null,
  -- 'pending' is reserved for a future manual-review step; the engine below
  -- only ever writes 'approved' (on payment approval) or 'reversed' (on
  -- return/refund) — never on order creation alone. 'paid' is available for
  -- admin bookkeeping but isn't auto-transitioned (withdrawals are an
  -- aggregate wallet debit, not tied to individual commission rows).
  status text not null default 'approved' check (status in ('pending', 'approved', 'reversed', 'paid')),
  created_at timestamptz not null default now()
);

create index commissions_affiliate_idx on public.commissions (affiliate_id);
create index commissions_order_idx on public.commissions (order_id);

create table public.wallets (
  affiliate_id uuid primary key references public.affiliates (id) on delete cascade,
  available_balance numeric(12, 2) not null default 0,
  lifetime_earned numeric(12, 2) not null default 0,
  lifetime_withdrawn numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now()
);

create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  amount numeric(12, 2) not null,
  fee_percentage numeric(5, 2) not null,
  fee_amount numeric(12, 2) not null,
  net_amount numeric(12, 2) not null,
  method text not null check (method in ('jazzcash', 'easypaisa', 'bank_transfer', 'crypto')),
  account_details text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  admin_note text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create index withdrawal_requests_affiliate_idx on public.withdrawal_requests (affiliate_id);

-- ---------------------------------------------------------------------------
-- 7. notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system' check (type in ('order', 'commission', 'referral', 'withdrawal', 'system')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Business logic — kept server-side (SECURITY DEFINER functions), never
-- computed client-side. RLS + these functions are the actual authorization
-- boundary: a client cannot self-grant admin, fabricate a commission, or
-- double-spend a wallet balance, regardless of what the UI shows.
-- =============================================================================

-- Distributes commission up to 5 levels of upline when an order's payment is
-- approved. Idempotent (a unique order_id+level guard prevents double-pay if
-- called twice). Never called for guest orders (affiliate_id is null).
create or replace function public.distribute_commissions(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_order record;
  v_upline_id uuid;
  v_level int := 1;
  v_percent numeric;
  v_amount numeric;
begin
  select * into v_order from public.orders where id = p_order_id;
  if v_order.affiliate_id is null then return; end if;
  if exists (select 1 from public.commissions where order_id = p_order_id) then return; end if;

  select referred_by into v_upline_id from public.affiliates where id = v_order.affiliate_id;

  while v_upline_id is not null and v_level <= 5 loop
    select percentage into v_percent from public.commission_levels where level = v_level;
    v_amount := round(v_order.subtotal * v_percent / 100, 2);

    insert into public.commissions
      (affiliate_id, order_id, source_affiliate_id, level, commission_percentage, order_amount, commission_amount, status)
    values (v_upline_id, p_order_id, v_order.affiliate_id, v_level, v_percent, v_order.subtotal, v_amount, 'approved');

    insert into public.wallets (affiliate_id, available_balance, lifetime_earned)
    values (v_upline_id, v_amount, v_amount)
    on conflict (affiliate_id) do update
      set available_balance = public.wallets.available_balance + v_amount,
          lifetime_earned = public.wallets.lifetime_earned + v_amount,
          updated_at = now();

    select referred_by into v_upline_id from public.affiliates where id = v_upline_id;
    v_level := v_level + 1;
  end loop;
end;
$$;

-- Reverses any approved commissions tied to an order (return/refund), once.
create or replace function public.reverse_commissions(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in select * from public.commissions where order_id = p_order_id and status = 'approved' loop
    update public.commissions set status = 'reversed' where id = r.id;
    update public.wallets
      set available_balance = greatest(0, available_balance - r.commission_amount), updated_at = now()
      where affiliate_id = r.affiliate_id;
  end loop;
end;
$$;

-- The ONLY sanctioned way to move an order through its lifecycle. Admin-only.
-- Triggers commission distribution exactly once, on the transition into
-- 'payment_approved' — never on order creation.
create or replace function public.admin_set_order_status(p_order_id uuid, p_new_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select status into v_old from public.orders where id = p_order_id;
  if v_old is null then raise exception 'order not found'; end if;

  update public.orders set status = p_new_status, admin_note = coalesce(p_note, admin_note), updated_at = now()
  where id = p_order_id;

  if p_new_status = 'payment_approved' and v_old <> 'payment_approved' then
    perform public.distribute_commissions(p_order_id);
  end if;

  if p_new_status in ('returned', 'refunded') and v_old not in ('returned', 'refunded') then
    perform public.reverse_commissions(p_order_id);
  end if;
end;
$$;

grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated;

-- Reserves the withdrawal amount out of available_balance immediately (not
-- at approval time) so a pending request can never be double-spent.
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

grant execute on function public.request_withdrawal(numeric, text, text) to authenticated;

-- Admin-only, idempotent withdrawal transition. Rejecting/cancelling refunds
-- the reserved balance exactly once — a withdrawal already finalized
-- (paid/rejected/cancelled) cannot be transitioned again, so a duplicate
-- admin click can never double-refund or double-pay.
create or replace function public.admin_set_withdrawal_status(p_id uuid, p_new_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_old text; v_affiliate_id uuid; v_amount numeric;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;

  select status, affiliate_id, amount into v_old, v_affiliate_id, v_amount
  from public.withdrawal_requests where id = p_id for update;
  if v_old is null then raise exception 'withdrawal not found'; end if;
  if v_old in ('paid', 'rejected', 'cancelled') then
    raise exception 'withdrawal already finalized (%), no further transitions allowed', v_old;
  end if;

  update public.withdrawal_requests
  set status = p_new_status, admin_note = coalesce(p_note, admin_note), processed_at = now()
  where id = p_id;

  if p_new_status in ('rejected', 'cancelled') then
    update public.wallets set available_balance = available_balance + v_amount, updated_at = now()
    where affiliate_id = v_affiliate_id;
  end if;

  if p_new_status = 'paid' then
    update public.wallets set lifetime_withdrawn = lifetime_withdrawn + v_amount, updated_at = now()
    where affiliate_id = v_affiliate_id;
  end if;
end;
$$;

grant execute on function public.admin_set_withdrawal_status(uuid, text, text) to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.affiliates enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.commission_levels enable row level security;
alter table public.platform_settings enable row level security;
alter table public.commissions enable row level security;
alter table public.wallets enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.notifications enable row level security;

create policy "affiliates_select_own_or_admin" on public.affiliates for select
  using (profile_id = auth.uid() or public.is_admin());
create policy "affiliates_update_own_or_admin" on public.affiliates for update
  using (profile_id = auth.uid() or public.is_admin());

create policy "product_categories_select_all" on public.product_categories for select using (true);
create policy "product_categories_admin_write" on public.product_categories for all
  using (public.is_admin()) with check (public.is_admin());

create policy "products_select_storefront_or_admin" on public.products for select
  using ((status = 'approved' and is_active = true) or public.is_admin());
create policy "products_admin_write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- Checkout must work fully logged-out (guest checkout): insert is open to
-- anon. Select is scoped to the owning affiliate, guest orders (unguessable
-- UUID — a standard "confirmation URL" trust boundary), or admin.
create policy "orders_insert_anyone" on public.orders for insert with check (true);
create policy "orders_select_own_or_guest_or_admin" on public.orders for select
  using (affiliate_id = public.auth_affiliate_id() or affiliate_id is null or public.is_admin());

create policy "order_items_insert_anyone" on public.order_items for insert with check (true);
create policy "order_items_select_scoped" on public.order_items for select
  using (exists (
    select 1 from public.orders o where o.id = order_id
    and (o.affiliate_id = public.auth_affiliate_id() or o.affiliate_id is null or public.is_admin())
  ));

create policy "payment_proofs_insert_anyone" on public.payment_proofs for insert with check (true);
create policy "payment_proofs_select_scoped" on public.payment_proofs for select
  using (exists (
    select 1 from public.orders o where o.id = order_id
    and (o.affiliate_id = public.auth_affiliate_id() or o.affiliate_id is null or public.is_admin())
  ));

create policy "commission_levels_select_all" on public.commission_levels for select using (true);
create policy "commission_levels_admin_write" on public.commission_levels for update
  using (public.is_admin()) with check (public.is_admin());

create policy "platform_settings_select_all" on public.platform_settings for select using (true);
create policy "platform_settings_admin_write" on public.platform_settings for update
  using (public.is_admin()) with check (public.is_admin());

create policy "commissions_select_own_or_admin" on public.commissions for select
  using (affiliate_id = public.auth_affiliate_id() or public.is_admin());

create policy "wallets_select_own_or_admin" on public.wallets for select
  using (affiliate_id = public.auth_affiliate_id() or public.is_admin());

create policy "withdrawal_requests_select_own_or_admin" on public.withdrawal_requests for select
  using (affiliate_id = public.auth_affiliate_id() or public.is_admin());

create policy "notifications_all_own" on public.notifications for all
  using (affiliate_id = public.auth_affiliate_id()) with check (affiliate_id = public.auth_affiliate_id());

-- =============================================================================
-- Auto-provisioning: new auth user -> profile + affiliate (+ referral link) + wallet
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_affiliate_id uuid;
  new_code text;
  upline_id uuid;
begin
  insert into public.profiles (id, full_name, email, phone, city, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'city',
    coalesce(new.raw_user_meta_data ->> 'country', 'Pakistan')
  );

  new_code := 'DS' || upper(substr(replace(new.id::text, '-', ''), 1, 8));

  if coalesce(new.raw_user_meta_data ->> 'referral_code', '') <> '' then
    select id into upline_id from public.affiliates where referral_code = new.raw_user_meta_data ->> 'referral_code';
  end if;

  insert into public.affiliates (profile_id, referral_code, referred_by, role, status)
  values (new.id, new_code, upline_id, 'affiliate', 'active')
  returning id into new_affiliate_id;

  insert into public.wallets (affiliate_id) values (new_affiliate_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Seed data — product catalog
-- =============================================================================
insert into public.product_categories (name, slug, sort_order) values
  ('Clothing', 'clothing', 1),
  ('Mobile Accessories', 'mobile-accessories', 2),
  ('Herbal Products', 'herbal-products', 3),
  ('Watches', 'watches', 4),
  ('Gents', 'gents', 5),
  ('Ladies', 'ladies', 6)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, description, price, compare_at_price, image_url, stock_quantity, sku, status)
select c.id, v.name, v.slug, v.description, v.price, v.compare_at_price, v.image_url, v.stock, v.sku, 'approved'
from (values
  ('clothing', 'Cotton Casual Shirt', 'cotton-casual-shirt', 'Breathable cotton shirt for everyday wear.', 2490, 2990, 'https://picsum.photos/seed/cl1/600/600', 120, 'CL-001'),
  ('clothing', 'Slim Fit Jeans', 'slim-fit-jeans', 'Stretch-denim slim fit jeans.', 3290, null, 'https://picsum.photos/seed/cl2/600/600', 95, 'CL-002'),
  ('clothing', 'Printed Kurta', 'printed-kurta', 'Lightweight printed cotton kurta.', 1990, 2390, 'https://picsum.photos/seed/cl3/600/600', 140, 'CL-003'),
  ('mobile-accessories', 'Fast-Charge Power Bank 20000mAh', 'power-bank-20000', 'Dual USB-C fast charging power bank.', 3990, null, 'https://picsum.photos/seed/ma1/600/600', 80, 'MA-001'),
  ('mobile-accessories', 'Wireless Earbuds Pro', 'wireless-earbuds-pro', 'Bluetooth 5.3 earbuds with charging case.', 4490, 5490, 'https://picsum.photos/seed/ma2/600/600', 60, 'MA-002'),
  ('mobile-accessories', 'Tempered Glass Screen Protector', 'tempered-glass-protector', '9H hardness tempered glass, universal fit.', 490, null, 'https://picsum.photos/seed/ma3/600/600', 300, 'MA-003'),
  ('herbal-products', 'Herbal Immunity Booster', 'herbal-immunity-booster', 'Natural herbal supplement for daily immunity.', 1590, null, 'https://picsum.photos/seed/hp1/600/600', 200, 'HP-001'),
  ('herbal-products', 'Herbal Hair Oil', 'herbal-hair-oil', 'Cold-pressed herbal oil blend for hair growth.', 990, 1290, 'https://picsum.photos/seed/hp2/600/600', 180, 'HP-002'),
  ('herbal-products', 'Herbal Green Tea', 'herbal-green-tea', 'Antioxidant-rich herbal green tea, 100 bags.', 690, null, 'https://picsum.photos/seed/hp3/600/600', 250, 'HP-003'),
  ('watches', 'Classic Analog Watch', 'classic-analog-watch', 'Stainless steel analog watch with leather strap.', 4990, 5990, 'https://picsum.photos/seed/wt1/600/600', 60, 'WT-001'),
  ('watches', 'Digital Sports Watch', 'digital-sports-watch', 'Water-resistant digital sports watch.', 2990, null, 'https://picsum.photos/seed/wt2/600/600', 70, 'WT-002'),
  ('gents', 'Gents Leather Wallet', 'gents-leather-wallet', 'Genuine leather bifold wallet.', 1990, null, 'https://picsum.photos/seed/gt1/600/600', 150, 'GT-001'),
  ('gents', 'Gents Formal Belt', 'gents-formal-belt', 'Genuine leather formal belt with metal buckle.', 1490, 1790, 'https://picsum.photos/seed/gt2/600/600', 130, 'GT-002'),
  ('ladies', 'Ladies Embroidered Handbag', 'ladies-embroidered-handbag', 'Hand-embroidered everyday handbag.', 3490, 3990, 'https://picsum.photos/seed/ld1/600/600', 90, 'LD-001'),
  ('ladies', 'Ladies Stone Earrings', 'ladies-stone-earrings', 'Statement earrings with stone accents.', 890, null, 'https://picsum.photos/seed/ld2/600/600', 160, 'LD-002')
) as v(cat_slug, name, slug, description, price, compare_at_price, image_url, stock, sku)
join public.product_categories c on c.slug = v.cat_slug
where not exists (select 1 from public.products);
