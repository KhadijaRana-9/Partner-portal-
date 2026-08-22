import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project-ref'))

// When credentials aren't set yet, `supabase` is null and every service
// falls back to its local mock-data implementation (see services/*.js).
// This keeps the app fully functional in demo mode while the real
// Postgres/Auth/Realtime backend is one .env away from going live.
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null
