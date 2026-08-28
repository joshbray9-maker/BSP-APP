import { useState } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'

export default function PlayerLogin({ sendMagicLink }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    setStatus(null)
    try {
      await sendMagicLink(email.trim())
      setStatus({ ok: true, message: `Check ${email.trim()} for a sign-in link.` })
    } catch (err) {
      setStatus({ ok: false, message: String(err?.message ?? err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6">
        <h1 className="text-lg font-semibold text-text mb-1">Player Sign In</h1>
        <p className="text-sm text-muted mb-4">
          Enter the email your coach set up for you. We'll send a sign-in link — no password
          needed.
        </p>

        {!isSupabaseConfigured ? (
          <p className="text-sm text-flagYellow bg-flagYellow/10 border border-flagYellow/30 rounded-md p-3">
            Player sign-in isn't set up yet — this build hasn't been connected to a real backend.
            See docs/PLAYER_ACCESS.md.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-text"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40"
            >
              {busy ? 'Sending…' : 'Send sign-in link'}
            </button>
            {status && (
              <p className={`text-sm ${status.ok ? 'text-flagGreen' : 'text-flagRed'}`}>{status.message}</p>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
