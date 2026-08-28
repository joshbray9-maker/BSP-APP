import { useEffect, useState } from 'react'
import { METRICS, getActiveMetrics } from '../../lib/metrics.js'
import { getTeamAthletes } from '../../lib/selectors.js'
import { exportWeeklyInsightPdf } from '../../lib/reports/weeklyInsightExport.js'

/**
 * "A weekly insight for each coach of their team (with the capacity to select specific players
 * (i.e injuries or trades))" — Josh's 2026-08-17 notes. Deliberately no date picker (see
 * buildWeeklyInsight in selectors.js) — the one control this export adds over the others is
 * choosing which athletes to include.
 */
export default function WeeklyInsightSection({ org, team, store, reportTitle, recipient }) {
  const athletes = getTeamAthletes(store, team.id)
  const [selectedAthleteIds, setSelectedAthleteIds] = useState(() => athletes.map((a) => a.id))
  const [selectedKeys, setSelectedKeys] = useState(() => getActiveMetrics().map((m) => m.key))

  useEffect(() => {
    setSelectedAthleteIds(getTeamAthletes(store, team.id).map((a) => a.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id])

  function toggleAthlete(id) {
    setSelectedAthleteIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleMetric(key) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const canExport = selectedAthleteIds.length > 0 && selectedKeys.length > 0

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="font-medium text-text">Weekly Coach Insight</div>
      <p className="text-xs text-muted -mt-2">
        A quick "what changed since I last checked" snapshot — each athlete's own two most
        recent tests, whatever their dates. Uncheck a player to leave them out (e.g. injured or
        just traded) without touching the roster itself.
      </p>

      <div>
        <div className="text-xs text-muted uppercase tracking-wide mb-1.5">
          Players included ({selectedAthleteIds.length} of {athletes.length})
        </div>
        <div className="flex flex-wrap gap-3 border border-border rounded-md p-2">
          {athletes.map((athlete) => (
            <label key={athlete.id} className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={selectedAthleteIds.includes(athlete.id)}
                onChange={() => toggleAthlete(athlete.id)}
                className="accent-accent"
              />
              {athlete.displayName}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs text-muted uppercase tracking-wide mb-1.5">
          Metrics included ({selectedKeys.length})
        </div>
        <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto border border-border rounded-md p-2">
          {METRICS.map((metric) => (
            <label key={metric.key} className="flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={selectedKeys.includes(metric.key)}
                onChange={() => toggleMetric(metric.key)}
                className="accent-accent"
              />
              {metric.label}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() =>
          exportWeeklyInsightPdf({
            org,
            team,
            store,
            metricKeys: selectedKeys,
            athleteIds: selectedAthleteIds,
            reportTitle,
            recipient,
          })
        }
        disabled={!canExport}
        className="bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Export Weekly Insight PDF
      </button>
    </div>
  )
}
