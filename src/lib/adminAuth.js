/**
 * Admin/coach session hook — email+password auth via Supabase. Replaced magic-link auth
 * 2026-08-27 per Josh's request (simpler to test with, no email rate-limit dependency). The RLS
 * "admin full access" policies in database/schema/schema_sketch.sql are what actually enforce
 * anything — this hook only surfaces session/profile state to the UI, it is not itself a
 * security boundary.
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

  async function signIn(email, password) {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured yet.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signOut() {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut()
  }

  return { session, profile, loading, signIn, signOut }
}
