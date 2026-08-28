import { StoreProvider } from './lib/store.js'
import { useAdminSession } from './lib/adminAuth.js'
import { isSupabaseConfigured } from './lib/supabaseClient.js'
import AppShell from './components/AppShell.jsx'
import AdminLogin from './components/AdminLogin.jsx'
import PlayerApp from './player/PlayerApp.jsx'

/**
 * Coach/admin entry point when Supabase is connected — gates AppShell behind a real magic-link
 * session, added 2026-08-26 alongside the localStorage -> Supabase data migration (see
 * store.js). Only `role: 'admin'` is let through: the schema's RLS only has admin policies today
 * (coach RLS is deliberately unwritten — see docs/OPEN_QUESTIONS.md #11), so a coach profile
 * would load AppShell into an app that can't actually read anything. Bypassed entirely when
 * Supabase isn't configured — see App() below — so local/demo use never needs a login at all.
 */
function AdminGate() {
  const { session, profile, loading, signIn, signOut } = useAdminSession()

  if (!session) {
    return <AdminLogin signIn={signIn} />
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Loading…</div>
  }

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm text-text">
            This account isn't set up for admin access yet. Ask whoever administers this project
            to add a <code>profiles</code> row for you with <code>role = 'admin'</code>.
          </p>
          <button onClick={signOut} className="text-xs border border-border text-muted px-3 py-2 rounded-md">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <StoreProvider>
      <AppShell onSignOut={signOut} />
    </StoreProvider>
  )
}

// Path-based split, not a role branch inside AppShell — see PlayerApp.jsx for why. No router
// dependency yet since there are only these two entry points; revisit if that grows.
export default function App() {
  if (window.location.pathname.startsWith('/player')) {
    return <PlayerApp />
  }

  if (!isSupabaseConfigured) {
    return (
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    )
  }

  return <AdminGate />
}
