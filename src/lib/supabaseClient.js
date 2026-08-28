/**
 * Supabase client — inert until real project credentials exist. See docs/PLAYER_ACCESS.md for
 * activation steps. `isSupabaseConfigured` lets player-facing code detect "not set up yet" and
 * show a message instead of throwing, since this ships before Josh has a Supabase project.
 *
 * Only the publishable/anon key belongs here (VITE_-prefixed = bundled into the browser build).
 * The secret/service-role key must never be imported into client code — see CLAUDE.md.
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null
