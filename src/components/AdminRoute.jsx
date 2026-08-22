import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'

// Client-side route gate — purely a UX convenience so non-admins never see
// the admin shell flash on screen. It is NOT the security boundary: every
// admin read/write goes through Supabase RLS policies and SECURITY DEFINER
// functions that independently check is_admin() server-side (see
// supabase/migrations/0002_mlm_platform.sql), so a user who bypasses this
// component client-side still cannot read or mutate admin-only data.
export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/super-admin/login" replace state={{ from: location }} />
  }

  return children
}
