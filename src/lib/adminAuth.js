/**
 * Admin/coach session hook — magic-link auth via Supabase, added 2026-08-26 alongside the
 * localStorage -> Supabase data migration (see store.js). Mirrors playerAuth.js's
 * usePlayerSession() exactly; kept as a separate hook (not a shared generic one) since the two
 * roles' `profiles` lookups and gating rules are different enough that sharing code would mean
 * branching inside one hook instead of two small clear ones. The RLS "admin full access" policies
 * in database/schema/schema_sketch.sql are what actually enforce anything — this hook only
 * surfaces session/profile state to the UI, it is not itself a security boundary.
 */
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

export function useAdminSession() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => subscription.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) return
    if (!session) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('profiles')
      .select('role, athlete_id')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null)
        setLoading(false)
      })
  }, [session])

  async function sendMagicLink(email) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured yet.')
    return supabase.auth.signInWithOtp({ email })
  }

  async function signOut() {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
  }

  return { session, profile, loading, sendMagicLink, signOut }
}
