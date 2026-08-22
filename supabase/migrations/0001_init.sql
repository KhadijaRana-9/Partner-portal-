-- =============================================================================
-- Digitalsofts Partner Portal — initial schema, RLS policies, auto-provisioning
-- and demo seed data.
--
-- HOW TO APPLY:
--   1. Open your Supabase project -> SQL Editor -> New query
--   2. Paste this entire file and click Run
--   3. Sign up in the app once (/signup) -> a profile + partner row is
--      auto-created by the trigger below, and starter demo data is seeded
--      for that partner automatically.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user (mirrors auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  avatar_url text,
  phone text,
  company text,
  country text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- partners — the partner account tied to a profile
-- ---------------------------------------------------------------------------
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  partner_code text not null unique,
  partner_type text not null default 'reseller'
    check (partner_type in ('affiliate', 'referral', 'reseller', 'certified', 'strategic')),
  tier text not null default 'registered'
    check (tier in ('registered', 'silver', 'gold', 'platinum', 'strategic')),
  status text not null default 'active' check (status in ('active', 'suspended', 'pending')),
  total_revenue numeric(14, 2) not null default 0,
  target_revenue numeric(14, 2) not null default 1000000,
  created_at timestamptz not null default now()
);

create or replace function public.auth_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.partners where profile_id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  email text,
  phone text,
  industry text,
  product text,
  estimated_value numeric(14, 2) not null default 0,
  source text,
  status text not null default 'New'
    check (status in ('New', 'Contacted', 'Qualified', 'Demo', 'Proposal', 'Won', 'Lost')),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- opportunities
-- ---------------------------------------------------------------------------
create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  company_name text not null,
  contact_name text,
  product text,
  value numeric(14, 2) not null default 0,
  probability integer not null default 20 check (probability between 0 and 100),
  stage text not null default 'New Lead'
    check (stage in ('New Lead', 'Qualified', 'Demo', 'Proposal', 'Negotiation', 'Won', 'Lost')),
  expected_close_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- deal_registrations
-- ---------------------------------------------------------------------------
create table if not exists public.deal_registrations (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  customer_name text not null,
  industry text,
  country text default 'Pakistan',
  contact text,
  product text,
  estimated_value numeric(14, 2) not null default 0,
  expected_close_date date,
  notes text,
  status text not null default 'Pending'
    check (status in ('Pending', 'Approved', 'Rejected', 'Expired')),
  protection_start date,
  protection_end date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  company_name text not null,
  contact_name text,
  email text,
  industry text,
  country text default 'Pakistan',
  status text not null default 'Active' check (status in ('Active', 'Trial', 'At Risk', 'Churned')),
  total_revenue numeric(14, 2) not null default 0,
  renewal_date date,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products — global catalog, readable by every authenticated partner
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text,
  retail_price numeric(14, 2) not null default 0,
  partner_price numeric(14, 2) not null default 0,
  margin_percentage numeric(5, 2) not null default 0,
  recurring_commission numeric(5, 2) not null default 0,
  image_url text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- commissions
-- ---------------------------------------------------------------------------
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  revenue numeric(14, 2) not null default 0,
  commission_percentage numeric(5, 2) not null default 0,
  commission_amount numeric(14, 2) not null default 0,
  status text not null default 'Pending' check (status in ('Pending', 'Paid')),
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- payouts
-- ---------------------------------------------------------------------------
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  amount numeric(14, 2) not null,
  payout_method text not null default 'Bank Transfer',
  status text not null default 'Pending' check (status in ('Pending', 'Processing', 'Paid', 'Failed')),
  reference text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'system'
    check (type in ('deal', 'commission', 'tier', 'training', 'ticket', 'payout', 'certification', 'system')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- support_tickets + support_messages
-- ---------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  subject text not null,
  category text not null default 'Other',
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status text not null default 'Open'
    check (status in ('Open', 'In Progress', 'Waiting for Customer', 'Resolved', 'Closed')),
  customer_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  sender_role text not null default 'partner' check (sender_role in ('partner', 'support')),
  message text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- training_courses (global) + training_progress (per partner)
-- ---------------------------------------------------------------------------
create table if not exists public.training_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text,
  duration text,
  lessons integer not null default 1,
  thumbnail text,
  created_at timestamptz not null default now()
);

create table if not exists public.training_progress (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  course_id uuid not null references public.training_courses (id) on delete cascade,
  progress integer not null default 0 check (progress between 0 and 100),
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (partner_id, course_id)
);

-- ---------------------------------------------------------------------------
-- certifications
-- ---------------------------------------------------------------------------
create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  certification_name text not null,
  certification_type text not null
    check (certification_type in ('Sales Certified', 'Implementation Certified', 'Technical Certified')),
  issued_at date,
  expiry_date date,
  status text not null default 'Available' check (status in ('Available', 'In Progress', 'Earned')),
  progress integer not null default 0 check (progress between 0 and 100),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security — a partner may only ever see their own rows.
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.partners enable row level security;
alter table public.leads enable row level security;
alter table public.opportunities enable row level security;
alter table public.deal_registrations enable row level security;
alter table public.customers enable row level security;
alter table public.products enable row level security;
alter table public.commissions enable row level security;
alter table public.payouts enable row level security;
alter table public.notifications enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.training_courses enable row level security;
alter table public.training_progress enable row level security;
alter table public.certifications enable row level security;

-- profiles: a user can only read/update their own profile
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

-- partners: a user can only read/update their own partner record
create policy "partners_select_own" on public.partners for select using (profile_id = auth.uid());
create policy "partners_update_own" on public.partners for update using (profile_id = auth.uid());

-- generic partner-scoped policy, reused per table via the pattern below
create policy "leads_all_own" on public.leads for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

create policy "opportunities_all_own" on public.opportunities for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

create policy "deal_registrations_all_own" on public.deal_registrations for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

create policy "customers_all_own" on public.customers for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

create policy "commissions_select_own" on public.commissions for select
  using (partner_id = public.auth_partner_id());

create policy "payouts_all_own" on public.payouts for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

create policy "notifications_all_own" on public.notifications for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

create policy "support_tickets_all_own" on public.support_tickets for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

create policy "support_messages_all_own" on public.support_messages for all
  using (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.partner_id = public.auth_partner_id()
    )
  )
  with check (
    exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.partner_id = public.auth_partner_id()
    )
  );

create policy "training_progress_all_own" on public.training_progress for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

create policy "certifications_all_own" on public.certifications for all
  using (partner_id = public.auth_partner_id()) with check (partner_id = public.auth_partner_id());

-- global read-only catalogs: any authenticated partner can read
create policy "products_select_all" on public.products for select using (auth.role() = 'authenticated');
create policy "training_courses_select_all" on public.training_courses for select using (auth.role() = 'authenticated');

-- =============================================================================
-- Auto-provisioning: creating an auth user creates a profile + partner row.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_partner_id uuid;
begin
  insert into public.profiles (id, full_name, email, company, country)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'company', ''),
    coalesce(new.raw_user_meta_data ->> 'country', 'Pakistan')
  );

  insert into public.partners (profile_id, partner_code, partner_type, tier, total_revenue, target_revenue)
  values (
    new.id,
    'DS-' || upper(substr(replace(new.id::text, '-', ''), 1, 8)),
    'reseller',
    'registered',
    0,
    1000000
  )
  returning id into new_partner_id;

  perform public.seed_demo_data_for_partner(new_partner_id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- Demo data seeding — gives every new partner a realistic starter workspace.
-- Product & training catalogs are seeded once globally, below.
-- =============================================================================

create or replace function public.seed_demo_data_for_partner(p_partner_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cust_logistics uuid;
  cust_jewellers uuid;
  cust_retail uuid;
begin
  update public.partners
  set total_revenue = 7500000, target_revenue = 10000000, tier = 'gold'
  where id = p_partner_id;

  insert into public.leads (partner_id, company_name, contact_name, email, phone, industry, product, estimated_value, source, status, notes)
  values
    (p_partner_id, 'Zainab Textiles Ltd.', 'Ahmed Raza', 'ahmed.raza@zainabtextiles.pk', '+92 321 4567890', 'Textile', 'Digitalsofts Textile Manufacturing ERP', 720000, 'Trade Show', 'Qualified', 'Needs yarn costing module and 3 branch licenses.'),
    (p_partner_id, 'Metro Jewellers', 'Sana Malik', 'sana@metrojewellers.pk', '+92 300 9988776', 'Jewellery', 'Digitalsofts Jewellery Suite', 250000, 'Referral', 'Demo', 'Demo scheduled for gold-rate integration walkthrough.'),
    (p_partner_id, 'Al-Falah Poultry Farms', 'Bilal Farooq', 'bilal.farooq@alfalahpoultry.pk', '+92 333 2211445', 'Poultry', 'Digitalsofts Poultry Pro', 220000, 'Cold Call', 'Contacted', 'Interested in FCR tracking across 4 sheds.'),
    (p_partner_id, 'Sindh Agro Industries', 'Fatima Sheikh', 'fatima@sindhagro.pk', '+92 312 5566778', 'Agriculture', 'Digitalsofts AgriFarm Manager', 310000, 'Website', 'New', 'Submitted demo request via website contact form.'),
    (p_partner_id, 'Bright Retail Group', 'Nida Yousaf', 'nida@brightretailgroup.pk', '+92 302 6677889', 'Retail', 'Digitalsofts Retail POS', 380000, 'Social Media', 'Qualified', '6-branch retail chain, needs loyalty program and online sync.'),
    (p_partner_id, 'Nova CyberWorks', 'Hassan Iqbal', 'hassan@novacyberworks.pk', '+92 334 8899001', 'Cybersecurity', 'Digitalsofts CyberShield', 340000, 'Website', 'Demo', 'Security audit scheduled next week.');

  insert into public.customers (partner_id, company_name, contact_name, email, industry, status, total_revenue, renewal_date)
  values
    (p_partner_id, 'Karachi Logistics Hub', 'Ayesha Khan', 'ayesha.khan@karachilogistics.pk', 'Logistics', 'Active', 540000, current_date + interval '9 months')
    returning id into cust_logistics;

  insert into public.customers (partner_id, company_name, contact_name, email, industry, status, total_revenue, renewal_date)
  values
    (p_partner_id, 'Royal Jewels & Co.', 'Junaid Malik', 'junaid@royaljewels.pk', 'Jewellery', 'Active', 375000, current_date + interval '8 months')
    returning id into cust_jewellers;

  insert into public.customers (partner_id, company_name, contact_name, email, industry, status, total_revenue, renewal_date)
  values
    (p_partner_id, 'Bright Retail Group', 'Nida Yousaf', 'nida@brightretailgroup.pk', 'Retail', 'Active', 380000, current_date + interval '6 months')
    returning id into cust_retail;

  insert into public.opportunities (partner_id, company_name, contact_name, product, value, probability, stage, expected_close_date)
  values
    (p_partner_id, 'Golden Thread Textile Mills', 'Rabia Anwar', 'Digitalsofts Textile Manufacturing ERP', 1440000, 85, 'Negotiation', current_date + interval '6 days'),
    (p_partner_id, 'Lahore Grand Hotel', 'Usman Tariq', 'Digitalsofts Hospitality PMS', 460000, 80, 'Proposal', current_date + interval '9 days'),
    (p_partner_id, 'Skyline Hospitality Group', 'Omer Farooq', 'Digitalsofts Hospitality PMS', 1380000, 55, 'Qualified', current_date + interval '37 days'),
    (p_partner_id, 'Vertex AI Solutions', 'Mariam Chaudhry', 'Digitalsofts AI Lead Engine', 610000, 40, 'New Lead', current_date + interval '43 days');

  insert into public.commissions (partner_id, customer_id, revenue, commission_percentage, commission_amount, status, is_recurring, created_at)
  values
    (p_partner_id, cust_logistics, 540000, 15, 81000, 'Paid', false, now() - interval '75 days'),
    (p_partner_id, cust_jewellers, 375000, 15, 56250, 'Paid', false, now() - interval '115 days'),
    (p_partner_id, cust_retail, 380000, 20, 76000, 'Paid', false, now() - interval '190 days'),
    (p_partner_id, cust_retail, 5000, 30, 1500, 'Paid', true, now() - interval '20 days'),
    (p_partner_id, cust_retail, 5000, 30, 1500, 'Pending', true, now() - interval '1 days');

  insert into public.payouts (partner_id, amount, payout_method, status, reference, requested_at, processed_at)
  values
    (p_partner_id, 82500, 'Bank Transfer', 'Paid', 'HBL-TXN-88213', now() - interval '19 days', now() - interval '18 days'),
    (p_partner_id, 56250, 'Bank Transfer', 'Paid', 'HBL-TXN-77341', now() - interval '113 days', now() - interval '112 days'),
    (p_partner_id, 37500, 'Bank Transfer', 'Pending', null, now() - interval '1 days', null);

  insert into public.deal_registrations (partner_id, customer_name, industry, contact, product, estimated_value, expected_close_date, status, protection_start, protection_end)
  values
    (p_partner_id, 'Golden Thread Textile Mills', 'Textile', 'Rabia Anwar', 'Digitalsofts Textile Manufacturing ERP', 1440000, current_date + interval '6 days', 'Approved', current_date - interval '49 days', current_date + interval '41 days'),
    (p_partner_id, 'Vertex AI Solutions', 'AI', 'Mariam Chaudhry', 'Digitalsofts AI Lead Engine', 610000, current_date + interval '43 days', 'Pending', null, null);

  insert into public.notifications (partner_id, title, message, type, is_read, created_at)
  values
    (p_partner_id, 'Deal registration approved', 'Your deal registration for Golden Thread Textile Mills was approved.', 'deal', false, now() - interval '11 hours'),
    (p_partner_id, 'Commission earned', 'You earned PKR 45,000 commission from Metro Jewellers.', 'commission', false, now() - interval '1 days'),
    (p_partner_id, 'Tier progress update', 'Your Gold tier is 75% complete toward Platinum.', 'tier', false, now() - interval '2 days'),
    (p_partner_id, 'New training available', 'New product training is available: "Selling the AI Lead Engine."', 'training', true, now() - interval '3 days');

  insert into public.support_tickets (partner_id, subject, category, priority, status, customer_name, created_at, updated_at)
  values
    (p_partner_id, 'Loyalty program not syncing across branches', 'Technical', 'High', 'In Progress', 'Bright Retail Group', now() - interval '7 days', now() - interval '2 days');
end;
$$;

-- ---------------------------------------------------------------------------
-- Global product catalog (seeded once — skip if already present)
-- ---------------------------------------------------------------------------
insert into public.products (name, category, description, retail_price, partner_price, margin_percentage, recurring_commission, status)
select * from (values
  ('Digitalsofts ERP Core', 'ERP', 'Full-featured enterprise resource planning suite covering finance, inventory, procurement and HR.', 950000, 665000, 30, 18, 'Active'),
  ('Digitalsofts Retail POS', 'Retail', 'Point-of-sale and retail management platform with omnichannel inventory and loyalty programs.', 380000, 266000, 30, 20, 'Active'),
  ('Digitalsofts Jewellery Suite', 'Jewellery', 'Purpose-built management system for jewellers with karat-wise inventory and gold-rate pricing.', 250000, 175000, 30, 15, 'Active'),
  ('Digitalsofts Textile Manufacturing ERP', 'Textile', 'End-to-end production planning for spinning, weaving and garment units.', 720000, 518400, 28, 16, 'Active'),
  ('Digitalsofts AgriFarm Manager', 'Agriculture', 'Farm management platform for crop planning, input tracking and yield forecasting.', 310000, 232500, 25, 14, 'Active'),
  ('Digitalsofts Poultry Pro', 'Poultry', 'Flock management, feed conversion tracking and hatchery operations.', 220000, 165000, 25, 14, 'Active'),
  ('Digitalsofts Hospitality PMS', 'Hospitality', 'Property management system for hotels covering reservations and channel management.', 460000, 331200, 28, 17, 'Active'),
  ('Digitalsofts Logistics TMS', 'Logistics', 'Transport management system for fleet dispatch and route optimization.', 540000, 394200, 27, 15, 'Active'),
  ('Digitalsofts Real Estate CRM', 'Real Estate', 'Property listing, plot inventory and installment-plan CRM for developers.', 400000, 288000, 28, 16, 'Active'),
  ('Digitalsofts AI Lead Engine', 'AI', 'AI-powered lead scoring, conversational assistants and sales forecasting.', 610000, 414800, 32, 22, 'Active'),
  ('Digitalsofts Cloud Hosting', 'Cloud', 'Managed private cloud hosting with automated backups and 99.9% uptime SLA.', 180000, 140400, 22, 12, 'Active'),
  ('Digitalsofts CyberShield', 'Cybersecurity', 'Managed endpoint protection, firewall monitoring and compliance reporting.', 340000, 251600, 26, 18, 'Active')
) as v(name, category, description, retail_price, partner_price, margin_percentage, recurring_commission, status)
where not exists (select 1 from public.products);

insert into public.training_courses (title, category, description, duration, lessons)
select * from (values
  ('Digitalsofts Platform Fundamentals', 'Product 101', 'A guided tour of the full Digitalsofts product line.', '1h 20m', 8),
  ('ERP Core — Product Deep Dive', 'Product Specialist', 'Deep dive into finance, inventory and HR modules.', '2h 45m', 12),
  ('Consultative Selling for Partners', 'Sales Certification', 'A discovery-led framework for partner sales conversations.', '3h 00m', 14),
  ('Running a Winning Product Demo', 'Demo Certification', 'How to structure and deliver a high-converting product demo.', '1h 50m', 9),
  ('Jewellery Suite — Implementation Essentials', 'Implementation Certification', 'Rate-feed setup, making-charge rules and go-live checklist.', '4h 15m', 16),
  ('Tier 1 Support Playbook', 'Support Certification', 'Triage, troubleshooting and escalation for partner support teams.', '2h 30m', 11),
  ('Selling the AI Lead Engine', 'AI Sales Certification', 'Positioning and objection handling for the AI Lead Engine.', '2h 05m', 10)
) as v(title, category, description, duration, lessons)
where not exists (select 1 from public.training_courses);
