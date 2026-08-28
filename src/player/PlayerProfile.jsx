import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { getActiveMetrics } from '../lib/metrics.js'
import { buildAthleteMetricSeries } from '../lib/selectors.js'
import MetricChart from '../components/dashboard/MetricChart.jsx'
import BrandBadge from '../components/BrandBadge.jsx'

/**
 * A player's own read-only view. Deliberately does NOT show a team-average comparison the way
 * AthleteDetail.jsx does for coaches/admins (see buildAthleteVsTeamTrend/buildAthleteRadarData
 * in src/lib/selectors.js) — those need every teammate's raw results to compute an average, and
 * the RLS policies in database/schema/schema_sketch.sql deliberately don't grant a player read
 * access to teammates' rows. A team-average comparison for players needs a dedicated
 * SECURITY DEFINER aggregate function that returns only the computed number, never other
 * athletes' rows — see docs/PLAYER_ACCESS.md. Only this athlete's own trend is shown here.
 */
export default function PlayerProfile({ onSignOut }) {
  const [state, setState] = useState({ loading: true, error: null, athlete: null, team: null, org: null, store: null })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { data: athlete, error: athleteErr } = await supabase.from('athletes').select('*').single()
        if (athleteErr) throw athleteErr

        const { data: team, error: teamErr } = await supabase
          .from('teams')
          .select('*')
          .eq('id', athlete.team_id)
          .single()
        if (teamErr) throw teamErr

        const { data: org, error: orgErr } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', team.org_id)
          .single()
        if (orgErr) throw orgErr

        const { data: sessionsRaw, error: sessionsErr } = await supabase
          .from('test_sessions')
          .select('id, session_date, source, test_results(id, metric_key, value, status, raw_json)')
          .order('session_date')
        if (sessionsErr) throw sessionsErr

        // Re-shape into the same {sessions, results} pair src/lib/selectors.js already expects
        // (see src/lib/store.js) so the existing selector functions/chart components work
        // unchanged — this is the "swap of internals" migration docs/DATA_MODEL.md describes.
        const sessions = sessionsRaw.map((s) => ({
          id: s.id,
          athleteId: athlete.id,
          date: s.session_date,
          source: s.source,
          uploadId: null,
        }))
        const results = sessionsRaw.flatMap((s) =>
          (s.test_results ?? []).map((r) => ({
            id: r.id,
            sessionId: s.id,
            metricKey: r.metric_key,
            value: r.value,
            status: r.status ?? null,
            raw: r.raw_json ?? {},
          })),
        )

        if (cancelled) return
        setState({
          loading: false,
          error: null,
          athlete: { id: athlete.id, displayName: athlete.display_name, position: athlete.position },
          team: { id: team.id, name: team.name, sport: team.sport, logoUrl: team.logo_url },
          org: { id: org.id, name: org.name, logoUrl: org.logo_url },
          store: { sessions, results },
        })
      } catch (err) {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false, error: String(err?.message ?? err) }))
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (state.loading) return <div className="p-6 text-muted">Loading your data…</div>
  if (state.error) {
    return (
      <div className="p-6 text-sm text-flagRed bg-flagRed/10 border border-flagRed/30 rounded-md m-4">
        Couldn't load your profile: {state.error}
      </div>
    )
  }

  const { athlete, team, org, store } = state
  const activeMetrics = getActiveMetrics()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-surface border-b border-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandBadge team={team} org={org} size="md" />
          <div className="min-w-0">
            <div className="font-semibold text-text truncate">{athlete.displayName}</div>
            <div className="text-xs text-muted truncate">
              {team.name} · {athlete.position}
            </div>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs border border-border text-muted px-2.5 py-2 rounded-md hover:text-text flex-shrink-0"
        >
          Sign out
        </button>
      </header>

      <main className="px-4 py-6 space-y-4 max-w-2xl mx-auto">
        <p className="text-xs text-muted">
          Your own recorded results only. This is a preliminary build — see docs/PLAYER_ACCESS.md.
        </p>

        {activeMetrics.map((metric) => {
          const series = buildAthleteMetricSeries(store, athlete.id, metric.key)
          const data = series.map((p) => ({ date: p.date, average: p.value }))
          return <MetricChart key={metric.key} title={metric.label} unit={metric.unit} color={metric.color} data={data} />
        })}

        <div>
          <h3 className="text-sm uppercase tracking-wide text-muted mb-2">Session history</h3>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="px-3 py-2 font-medium sticky left-0 bg-bg">Date</th>
                  {activeMetrics.map((m) => (
                    <th key={m.key} className="px-3 py-2 font-medium">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {buildAthleteMetricSeries(store, athlete.id, activeMetrics[0].key).map((row, i) => (
                  <tr key={row.date} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-text sticky left-0 bg-bg">{row.date}</td>
                    {activeMetrics.map((m) => {
                      const point = buildAthleteMetricSeries(store, athlete.id, m.key)[i]
                      const display = point?.status === 'dnc' ? 'DNC' : point?.value ?? '—'
                      return (
                        <td key={m.key} className="px-3 py-2 text-text">
                          {display}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
