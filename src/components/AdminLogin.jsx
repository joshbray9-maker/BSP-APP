import { useState } from 'react'

export default function AdminLogin({ signIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) return
    setBusy(true)
    setStatus(null)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setStatus({ ok: false, message: String(err?.message ?? err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6">
        <h1 className="text-lg font-semibold text-text mb-1">Performance Hub — Sign In</h1>
        <p className="text-sm text-muted mb-4">Enter your admin email and password.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="username"
            required
            className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-text"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            required
            className="w-full bg-surface2 border border-border rounded-md px-3 py-2 text-text"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {status && (
            <p className={`text-sm ${status.ok ? 'text-flagGreen' : 'text-flagRed'}`}>{status.message}</p>
          )}
        </form>
      </div>
    </div>
  )
}
