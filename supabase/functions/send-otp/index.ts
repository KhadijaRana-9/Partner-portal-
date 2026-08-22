// Supabase Edge Function skeleton — NOT deployed by this project (no
// Supabase project or provider credentials are configured here). This is
// the correct place to hold real SMS/email provider secrets: Edge Function
// environment variables set via `supabase secrets set`, never VITE_* client
// env vars (those get inlined into the browser bundle and would leak keys).
//
// Intended flow once deployed:
//   1. Client calls supabase.functions.invoke('send-otp', { body: { identifier, channel, purpose } })
//   2. This function calls the `request_otp` Postgres RPC via the Supabase
//      service-role client to generate + store the code (see
//      supabase/migrations/0003_otp_verification.sql) — but unlike the
//      client-facing RPC call in src/services/otpService.js, THIS call can
//      read the raw code back (service-role bypasses RLS) because it runs
//      server-side, never in the browser.
//   3. This function sends that code via a real provider:
//        - email: Resend / Postmark / SendGrid
//        - phone: Twilio / a local Pakistani SMS gateway
//   4. Returns { sent: true } to the client — never the code itself.
//
// Required secrets (set via `supabase secrets set KEY=value`, NOT `.env`):
//   RESEND_API_KEY            — or your chosen email provider's key
//   TWILIO_ACCOUNT_SID
//   TWILIO_AUTH_TOKEN
//   TWILIO_FROM_NUMBER
//
// Deploy with: supabase functions deploy send-otp
//
// This file is intentionally left unimplemented beyond the request
// contract below — wiring in one of the providers above is a business
// decision (which provider, whose account) that wasn't part of the original
// requirements, so it isn't guessed at here.

// @ts-nocheck — this file targets the Deno runtime Supabase Edge Functions
// run on, not the Vite/Node toolchain the rest of this repo uses.
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { identifier, channel, purpose } = await req.json()

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') // service-role, server-side only
  )

  const { error } = await supabaseAdmin.rpc('request_otp', {
    p_identifier: identifier,
    p_channel: channel,
    p_purpose: purpose,
  })
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 })
  }

  // TODO (blocked on provider credentials): read the freshly generated code
  // and dispatch it via Twilio (channel === 'phone') or an email provider
  // (channel === 'email'). Not implemented — no provider is configured for
  // this project.

  return new Response(
    JSON.stringify({ sent: false, reason: 'No SMS/email provider is configured for this deployment yet.' }),
    { status: 501, headers: { 'Content-Type': 'application/json' } }
  )
})
