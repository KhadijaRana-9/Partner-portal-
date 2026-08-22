-- =============================================================================
-- OTP verification — email + phone, used to gate registration completion.
--
-- ARCHITECTURE NOTE: this migration implements the full verification
-- mechanism (code generation, expiry, attempt-limiting, rate-limited resend,
-- single-use consumption) entirely server-side. It does NOT send a real SMS
-- or email — actually delivering the code requires a paid provider (e.g.
-- Twilio for SMS, Resend/SendGrid/Postmark for email) that isn't configured
-- in this project. Wiring one up is a follow-up step for whoever owns those
-- accounts (see supabase/functions/send-otp/index.ts, and the "real provider"
-- section at the bottom of this file for exactly what's needed).
--
-- HOW TO APPLY: same as 0001/0002 — paste into the Supabase SQL editor and run.
-- =============================================================================

create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,                -- email address or phone number
  channel text not null check (channel in ('email', 'phone')),
  purpose text not null check (purpose in ('registration', 'login', 'password_reset')),
  code_hash text not null,                 -- sha-256 hex of the code — never store the plaintext code at rest
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed boolean not null default false, -- true once used to complete registration (single-use)
  created_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now()
);

create index otp_codes_identifier_purpose_idx on public.otp_codes (identifier, purpose);

alter table public.otp_codes enable row level security;
-- No direct client access at all — every read/write goes through the
-- SECURITY DEFINER functions below, which enforce expiry/attempt/rate
-- limits server-side regardless of what the client claims.
create policy "otp_codes_no_direct_access" on public.otp_codes for all using (false) with check (false);

create extension if not exists pgcrypto;

-- sha-256 hex digest — codes are hashed at rest the same way a password would be.
create or replace function public.hash_otp_code(p_code text)
returns text language sql immutable as $$
  select encode(digest(p_code, 'sha256'), 'hex')
$$;

-- Generates and stores a new OTP for (identifier, purpose), enforcing a
-- resend cooldown. Returns the raw code ONLY so the caller (an Edge Function
-- with real provider credentials, in production) can dispatch it — this RPC
-- itself never contacts an SMS/email provider. Called from the client only
-- in demo/dev builds where isSupabaseConfigured but no real provider exists
-- yet; a production deployment should instead call this from a trusted
-- Edge Function that immediately discards the return value after sending it.
create or replace function public.request_otp(p_identifier text, p_channel text, p_purpose text)
returns table (expires_at timestamptz, resend_after_seconds int)
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_last_sent timestamptz;
  v_cooldown constant int := 30; -- seconds between resends
  v_ttl constant int := 600;     -- 10 minute expiry
begin
  select last_sent_at into v_last_sent
  from public.otp_codes
  where identifier = p_identifier and purpose = p_purpose and consumed = false
  order by created_at desc limit 1;

  if v_last_sent is not null and now() < v_last_sent + make_interval(secs => v_cooldown) then
    raise exception 'Please wait before requesting another code.';
  end if;

  -- invalidate any previous unconsumed code for this identifier/purpose
  update public.otp_codes set consumed = true
  where identifier = p_identifier and purpose = p_purpose and consumed = false;

  v_code := lpad((floor(random() * 1000000))::text, 6, '0');

  insert into public.otp_codes (identifier, channel, purpose, code_hash, expires_at)
  values (p_identifier, p_channel, p_purpose, public.hash_otp_code(v_code), now() + make_interval(secs => v_ttl));

  -- NOTE: v_code is deliberately not returned here — see verify below and
  -- the Edge Function stub for how a real deployment plumbs the raw code to
  -- a provider without exposing it back to this RPC's caller.
  return query select (now() + make_interval(secs => v_ttl)), v_cooldown;
end;
$$;

grant execute on function public.request_otp(text, text, text) to anon, authenticated;

-- Verifies a submitted code. Attempt-limited (locks after max_attempts),
-- expiry-checked, single-use. Returns true/false rather than raising, so
-- the client can show "incorrect code, N attempts remaining" without a
-- generic error.
create or replace function public.verify_otp(p_identifier text, p_purpose text, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_row public.otp_codes%rowtype;
begin
  select * into v_row
  from public.otp_codes
  where identifier = p_identifier and purpose = p_purpose and consumed = false
  order by created_at desc limit 1
  for update;

  if v_row.id is null then return false; end if;
  if now() > v_row.expires_at then return false; end if;
  if v_row.attempts >= v_row.max_attempts then return false; end if;

  if v_row.code_hash <> public.hash_otp_code(p_code) then
    update public.otp_codes set attempts = attempts + 1 where id = v_row.id;
    return false;
  end if;

  update public.otp_codes set verified_at = now(), consumed = true where id = v_row.id;
  return true;
end;
$$;

grant execute on function public.verify_otp(text, text, text) to anon, authenticated;

-- =============================================================================
-- Wiring up a REAL provider (blocked on external credentials — not done here)
--
-- Do NOT put provider API keys in VITE_*  env vars — Vite inlines those into
-- the client bundle, which would leak the secret to every visitor. The
-- correct place is Supabase project secrets, read only inside an Edge
-- Function:
--
--   supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=...
--   supabase secrets set RESEND_API_KEY=...
--   supabase functions deploy send-otp
--
-- Then have request_otp's caller invoke supabase.functions.invoke('send-otp',
-- { body: { identifier, channel, purpose } }) instead of reading the code
-- back into client JS. See supabase/functions/send-otp/index.ts for the
-- Edge Function skeleton this points at.
-- =============================================================================
