/**
 * Data store — two implementations behind one identical Context API, chosen once at mount by
 * `isSupabaseConfigured` (a module-level constant, so this is not a conditional-hooks violation):
 *
 * - `LocalStoreProvider` — localStorage-backed, exactly as this project ran before real Supabase
 *   credentials existed. Kept so the app still works standalone with zero backend (demo/dev use).
 * - `SupabaseStoreProvider` — added 2026-08-26, the real thing: reads/writes Postgres via
 *   database/schema/schema_sketch.sql. Every mutator writes, then refetches everything rather
 *   than patching local state piecemeal — simpler to get right than partial optimistic updates,
 *   and this app's data volume (a handful of teams/rosters) makes the extra round-trip cheap.
 *
 * Both providers expose the exact same method names/shapes so no component needs to know or
 * care which one is mounted.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { MOCK_SEED } from '../data/mockData.js'
import { supabase, isSupabaseConfigured } from './supabaseClient.js'

const StoreContext = createContext(null)

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}

export function StoreProvider({ children }) {
  const Provider = isSupabaseConfigured ? SupabaseStoreProvider : LocalStoreProvider
  return React.createElement(Provider, null, children)
}

// =================================================================================================
// Local (localStorage) implementation — unchanged behavior from before the Supabase migration.
// =================================================================================================

// Bump this key whenever mockData.js's seed structure changes meaningfully (e.g. a new
// program added) so returning browsers pick up the new seed instead of a stale cached one.
const STORAGE_KEY = 'performance-hub-demo-data-v6'

function loadInitialState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage unavailable or corrupt — fall back to the seed dataset
  }
  return MOCK_SEED
}

function LocalStoreProvider({ children }) {
  const [data, setData] = useState(loadInitialState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // best-effort persistence only — not a blocker for the demo
    }
  }, [data])

  const api = useMemo(
    () => ({
      ...data,
      loading: false,

      resetToSeed() {
        setData(MOCK_SEED)
      },

      setReadinessMetrics(metricKeys) {
        setData((prev) => ({
          ...prev,
          readinessConfig: { ...prev.readinessConfig, selectedMetricKeys: metricKeys },
        }))
      },

      setReadinessThreshold(metricKey, thresholds) {
        setData((prev) => ({
          ...prev,
          readinessConfig: {
            ...prev.readinessConfig,
            thresholds: { ...(prev.readinessConfig?.thresholds ?? {}), [metricKey]: thresholds },
          },
        }))
      },

      addOrganization({ name, logoUrl, colorPrimary, colorAccent }) {
        const org = {
          id: `org-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          name,
          logoUrl: logoUrl || null,
          colorPrimary: colorPrimary || null,
          colorAccent: colorAccent || null,
        }
        setData((prev) => ({ ...prev, organizations: [...prev.organizations, org] }))
        return org.id
      },

      addManualResult({ athleteId, date, metricKey, value }) {
        const isDnc = typeof value === 'string' && value.trim().toUpperCase() === 'DNC'
        const numericValue = isDnc ? null : Number(value)
        const status = isDnc ? 'dnc' : null
        setData((prev) => {
          let session = prev.sessions.find(
            (s) => s.athleteId === athleteId && s.date === date && s.source === 'manual-entry',
          )
          const sessions = [...prev.sessions]
          if (!session) {
            session = {
              id: `session-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
              athleteId,
              date,
              source: 'manual-entry',
              uploadId: null,
            }
            sessions.push(session)
          }
          const results = prev.results.filter(
            (r) => !(r.sessionId === session.id && r.metricKey === metricKey),
          )
          results.push({
            id: `result-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
            sessionId: session.id,
            metricKey,
            value: numericValue,
            status,
            raw: {},
          })
          return { ...prev, sessions, results }
        })
      },

      addTeam({ orgId, name, sport }) {
        const team = {
          id: `team-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          orgId,
          name,
          sport,
          logoUrl: null,
          colorPrimary: null,
          colorAccent: null,
        }
        setData((prev) => ({ ...prev, teams: [...prev.teams, team] }))
        return team.id
      },

      removeTeam(teamId) {
        setData((prev) => {
          const hasRoster = prev.athletes.some((a) => a.teamId === teamId)
          if (hasRoster) return prev
          return { ...prev, teams: prev.teams.filter((t) => t.id !== teamId) }
        })
      },

      addAthlete({ teamId, displayName, position }) {
        const athlete = {
          id: `athlete-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          teamId,
          displayName,
          position,
        }
        setData((prev) => ({ ...prev, athletes: [...prev.athletes, athlete] }))
        return athlete.id
      },

      removeAthlete(athleteId) {
        setData((prev) => {
          const removedSessionIds = new Set(
            prev.sessions.filter((s) => s.athleteId === athleteId).map((s) => s.id),
          )
          return {
            ...prev,
            athletes: prev.athletes.filter((a) => a.id !== athleteId),
            sessions: prev.sessions.filter((s) => s.athleteId !== athleteId),
            results: prev.results.filter((r) => !removedSessionIds.has(r.sessionId)),
          }
        })
      },

      moveAthlete({ athleteId, toTeamId }) {
        setData((prev) => ({
          ...prev,
          athletes: prev.athletes.map((a) => (a.id === athleteId ? { ...a, teamId: toTeamId } : a)),
        }))
      },

      ingestRows({ fileName, rows, matchedCount, unmatchedNames }) {
        const uploadId = `upload-${Date.now()}`
        setData((prev) => {
          const sessions = [...prev.sessions]
          const results = [...prev.results]
          const sessionByKey = new Map(
            sessions.map((s) => [`${s.athleteId}|${s.date}|${s.source}`, s]),
          )

          for (const row of rows) {
            const sourceLabel = `upload:${fileName}`
            const key = `${row.athleteId}|${row.date}|${sourceLabel}`
            let session = sessionByKey.get(key)
            if (!session) {
              session = {
                id: `session-${Date.now()}-${Math.round(Math.random() * 1e6)}-${sessions.length}`,
                athleteId: row.athleteId,
                date: row.date,
                source: sourceLabel,
                uploadId,
              }
              sessions.push(session)
              sessionByKey.set(key, session)
            }
            const existingIdx = results.findIndex(
              (r) => r.sessionId === session.id && r.metricKey === row.metricKey,
            )
            const resultRow = {
              id: `result-${Date.now()}-${Math.round(Math.random() * 1e6)}-${results.length}`,
              sessionId: session.id,
              metricKey: row.metricKey,
              value: row.value,
              status: row.status ?? null,
              raw: row.raw ?? {},
            }
            if (existingIdx >= 0) results[existingIdx] = resultRow
            else results.push(resultRow)
          }

          const uploads = [
            ...(prev.uploads ?? []),
            {
              id: uploadId,
              fileName,
              rowCount: rows.length,
              matchedCount,
              unmatchedNames,
              createdAt: new Date().toISOString(),
            },
          ]

          return { ...prev, sessions, results, uploads }
        })
        return uploadId
      },
    }),
    [data],
  )

  return React.createElement(StoreContext.Provider, { value: api }, children)
}

// =================================================================================================
// Supabase implementation — added 2026-08-26. See database/schema/schema_sketch.sql for the real
// column shapes; the map* functions below are the only place camelCase (JS) <-> snake_case
// (Postgres) conversion happens, so components never need to know the DB's column names.
// =================================================================================================

const mapOrg = (r) => ({
  id: r.id,
  name: r.name,
  logoUrl: r.logo_url,
  colorPrimary: r.color_primary,
  colorAccent: r.color_accent,
})
const mapTeam = (r) => ({
  id: r.id,
  orgId: r.org_id,
  name: r.name,
  sport: r.sport,
  logoUrl: r.logo_url,
  colorPrimary: r.color_primary,
  colorAccent: r.color_accent,
})
const mapAthlete = (r) => ({ id: r.id, teamId: r.team_id, displayName: r.display_name, position: r.position })
const mapSession = (r) => ({ id: r.id, athleteId: r.athlete_id, date: r.session_date, source: r.source, uploadId: r.source_file_id })
const mapResult = (r) => ({ id: r.id, sessionId: r.session_id, metricKey: r.metric_key, value: r.value, status: r.status, raw: r.raw_json ?? {} })
const mapUpload = (r) => ({ id: r.id, fileName: r.file_name, rowCount: r.row_count, matchedCount: null, unmatchedNames: null, createdAt: r.created_at })

const EMPTY_DATA = {
  organizations: [],
  teams: [],
  athletes: [],
  sessions: [],
  results: [],
  uploads: [],
  readinessConfig: { selectedMetricKeys: [], thresholds: {} },
}

async function fetchAllData() {
  const [orgs, teams, athletes, sessions, results, uploads, readiness] = await Promise.all([
    supabase.from('organizations').select('*'),
    supabase.from('teams').select('*'),
    supabase.from('athletes').select('*').eq('active', true),
    supabase.from('test_sessions').select('*'),
    supabase.from('test_results').select('*'),
    supabase.from('uploaded_files').select('*'),
    supabase.from('readiness_config').select('*').eq('id', 1).maybeSingle(),
  ])

  for (const res of [orgs, teams, athletes, sessions, results, uploads, readiness]) {
    if (res.error) throw new Error(res.error.message)
  }

  return {
    organizations: (orgs.data ?? []).map(mapOrg),
    teams: (teams.data ?? []).map(mapTeam),
    athletes: (athletes.data ?? []).map(mapAthlete),
    sessions: (sessions.data ?? []).map(mapSession),
    results: (results.data ?? []).map(mapResult),
    uploads: (uploads.data ?? []).map(mapUpload),
    readinessConfig: {
      selectedMetricKeys: readiness.data?.selected_metric_keys ?? [],
      thresholds: readiness.data?.thresholds ?? {},
    },
  }
}

function SupabaseStoreProvider({ children }) {
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function refetch() {
    try {
      setData(await fetchAllData())
      setError(null)
    } catch (e) {
      setError(e.message ?? String(e))
    }
  }

  useEffect(() => {
    refetch().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const api = useMemo(
    () => ({
      ...data,
      loading,
      error,

      resetToSeed() {
        // Deliberately a no-op against a real database — nothing in the UI calls this today, and
        // wiping a client's real entered data on a stray click would be a real data-loss risk.
        console.warn('resetToSeed() is a no-op when Supabase is connected — real data is never bulk-reset from the UI.')
      },

      async setReadinessMetrics(metricKeys) {
        const { error: err } = await supabase
          .from('readiness_config')
          .update({ selected_metric_keys: metricKeys, updated_at: new Date().toISOString() })
          .eq('id', 1)
        if (err) return setError(err.message)
        await refetch()
      },

      async setReadinessThreshold(metricKey, thresholds) {
        const merged = { ...(data.readinessConfig?.thresholds ?? {}), [metricKey]: thresholds }
        const { error: err } = await supabase
          .from('readiness_config')
          .update({ thresholds: merged, updated_at: new Date().toISOString() })
          .eq('id', 1)
        if (err) return setError(err.message)
        await refetch()
      },

      async addOrganization({ name, logoUrl, colorPrimary, colorAccent }) {
        const { data: row, error: err } = await supabase
          .from('organizations')
          .insert({ name, logo_url: logoUrl || null, color_primary: colorPrimary || null, color_accent: colorAccent || null })
          .select('id')
          .single()
        if (err) {
          setError(err.message)
          return null
        }
        await refetch()
        return row.id
      },

      async addManualResult({ athleteId, date, metricKey, value }) {
        const isDnc = typeof value === 'string' && value.trim().toUpperCase() === 'DNC'
        const numericValue = isDnc ? null : Number(value)
        const status = isDnc ? 'dnc' : null

        const { data: session, error: sessionErr } = await supabase
          .from('test_sessions')
          .upsert({ athlete_id: athleteId, session_date: date, source: 'manual-entry' }, { onConflict: 'athlete_id,session_date,source' })
          .select('id')
          .single()
        if (sessionErr) return setError(sessionErr.message)

        const { error: resultErr } = await supabase
          .from('test_results')
          .upsert({ session_id: session.id, metric_key: metricKey, value: numericValue, status }, { onConflict: 'session_id,metric_key' })
        if (resultErr) return setError(resultErr.message)
        await refetch()
      },

      async addTeam({ orgId, name, sport }) {
        const { data: row, error: err } = await supabase
          .from('teams')
          .insert({ org_id: orgId, name, sport })
          .select('id')
          .single()
        if (err) {
          setError(err.message)
          return null
        }
        await refetch()
        return row.id
      },

      async removeTeam(teamId) {
        const hasRoster = data.athletes.some((a) => a.teamId === teamId)
        if (hasRoster) return
        const { error: err } = await supabase.from('teams').delete().eq('id', teamId)
        if (err) return setError(err.message)
        await refetch()
      },

      async addAthlete({ teamId, displayName, position }) {
        const { data: row, error: err } = await supabase
          .from('athletes')
          .insert({ team_id: teamId, display_name: displayName, position, active: true })
          .select('id')
          .single()
        if (err) {
          setError(err.message)
          return null
        }
        await refetch()
        return row.id
      },

      async removeAthlete(athleteId) {
        // FK `on delete cascade` on test_sessions.athlete_id (and results -> sessions) removes
        // the athlete's history automatically — same end result as the local path's explicit
        // filtering, just enforced by the database instead of app code.
        const { error: err } = await supabase.from('athletes').delete().eq('id', athleteId)
        if (err) return setError(err.message)
        await refetch()
      },

      async moveAthlete({ athleteId, toTeamId }) {
        const { error: err } = await supabase.from('athletes').update({ team_id: toTeamId }).eq('id', athleteId)
        if (err) return setError(err.message)
        await refetch()
      },

      async ingestRows({ fileName, rows, matchedCount, unmatchedNames }) {
        const { data: uploadRow, error: uploadErr } = await supabase
          .from('uploaded_files')
          .insert({
            file_name: fileName,
            data_source: 'upload',
            status: 'complete',
            row_count: rows.length,
            message: `${matchedCount} matched, ${unmatchedNames?.length ?? 0} unmatched`,
          })
          .select('id')
          .single()
        if (uploadErr) {
          setError(uploadErr.message)
          return null
        }

        // Sequential, not batched — upload sizes here are small (a team's roster worth of rows
        // per file), and each row needs its session's id before its result can reference it.
        for (const row of rows) {
          const { data: session, error: sessionErr } = await supabase
            .from('test_sessions')
            .upsert(
              { athlete_id: row.athleteId, session_date: row.date, source: `upload:${fileName}`, source_file_id: uploadRow.id },
              { onConflict: 'athlete_id,session_date,source' },
            )
            .select('id')
            .single()
          if (sessionErr) {
            setError(sessionErr.message)
            continue
          }
          const { error: resultErr } = await supabase
            .from('test_results')
            .upsert(
              { session_id: session.id, metric_key: row.metricKey, value: row.value, status: row.status ?? null, raw_json: row.raw ?? {} },
              { onConflict: 'session_id,metric_key' },
            )
          if (resultErr) setError(resultErr.message)
        }

        await refetch()
        return uploadRow.id
      },
    }),
    [data, loading, error],
  )

  return React.createElement(StoreContext.Provider, { value: api }, children)
}
