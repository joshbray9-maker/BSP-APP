import { usePlayerSession } from '../lib/playerAuth.js'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'
import PlayerLogin from './PlayerLogin.jsx'
import PlayerProfile from './PlayerProfile.jsx'

/**
 * Entry point for the player-facing experience — deliberately a separate tree from AppShell.jsx
 * (the coach/admin app), not a role branch inside it. Keeping them structurally apart means a
 * player's browser session never even loads the components/queries that assume coach/admin
 * access, rather than relying on a UI-level check alone. See docs/PLAYER_ACCESS.md.
 */
export default function PlayerApp() {
  const { session, profile, loading, sendMagicLink, signOut } = usePlayerSession()

  if (!isSupabaseConfigured || !session) {
    return <PlayerLogin sendMagicLink={sendMagicLink} />
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Loading…</div>
  }

  if (!profile || profile.role !== 'player' || !profile.athlete_id) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-sm text-text">
            This account isn't set up for player access yet. Ask your coach to check your login.
          </p>
          <button onClick={signOut} className="text-xs border border-border text-muted px-3 py-2 rounded-md">
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return <PlayerProfile onSignOut={signOut} />
}
