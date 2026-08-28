/**
 * Player session hook — magic-link auth via Supabase. A player is a real `auth.users` row
 * linked to exactly one athlete through `profiles.athlete_id` (see database/schema/schema_sketch.sql).
 * The RLS policies on that link are what actually enforce "own data only" — this hook just
 * surfaces session/profile state to the UI, it is not itself a security boundary.
 */
import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

export function usePlayerSession() {
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
