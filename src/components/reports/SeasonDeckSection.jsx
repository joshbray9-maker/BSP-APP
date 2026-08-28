import { useEffect, useState } from 'react'
import { METRICS, getActiveMetrics } from '../../lib/metrics.js'
import { getTeamSessionDates } from '../../lib/selectors.js'
import { exportTeamSeasonDeck } from '../../lib/reports/seasonDeckExport.js'

function defaultLabelFor(index, total) {
  if (total === 3) return ['Pre-Season', 'Mid-Season', 'Post-Season'][index]
  return `Stage ${index + 1}`
}

/** Picks a sensible default stage set from a team's actual session dates: all of them if there
 * are 3 or fewer, otherwise first/middle/last (an approximation of pre/mid/post-season) — the
 * user can add/remove/relabel from there. */
function defaultStageDates(dates) {
  if (dates.length <= 3) return dates
  const mid = dates[Math.floor((dates.length - 1) / 2)]
  return [dates[0], mid, dates[dates.length - 1]]
}

function buildInitialStages(dates) {
  const picked = defaultStageDates(dates)
  return picked.map((date, i) => ({ date, label: defaultLabelFor(i, picked.length) }))
}

/**
 * "Pre-season, mid-season, post-season testing... not just 3, ideally as often as needed" —
 * Josh's 2026-08-17 notes. Pick any number of the team's recorded session dates as "stages,"
 * label each one (defaults to Pre/Mid/Post-Season when exactly 3 are picked), pick which
 * metrics to include, export a slide deck split by metric category (report B's pattern in
 * docs/reference/REPORT_FRAMEWORKS.md) with a progression/regression indicator between each
 * consecutive stage.
 */
export default function SeasonDeckSection({ org, team, store, reportTitle, recipient }) {
  const sessionDates = getTeamSessionDates(store, team.id)
  const [stages, setStages] = useState(() => buildInitialStages(sessionDates))
  const [selectedKeys, setSelectedKeys] = useState(() => getActiveMetrics().map((m) => m.key))

  useEffect(() => {
    setStages(buildInitialStages(getTeamSessionDates(store, team.id)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id])

  function toggleDate(date) {
    setStages((prev) => {
      const exists = prev.some((s) => s.date === date)
      const next = exists
        ? prev.filter((s) => s.date !== date)
        : [...prev, { date, label: '' }].sort((a, b) => (a.date < b.date ? -1 : 1))
      return next.map((s, i) => (s.label ? s : { ...s, label: defaultLabelFor(i, next.length) }))
    })
  }

  function relabel(date, label) {
    setStages((prev) => prev.map((s) => (s.date === date ? { ...s, label } : s)))
  }

  function toggleMetric(key) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const canExport = selectedKeys.length > 0 && stages.length >= 2

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="font-medium text-text">Season Progress Deck (PPTX)</div>
      <p className="text-xs text-muted -mt-2">
        A slide deck across any number of testing stages — pick which recorded dates count as a
        stage, label each one, and get a progression/regression indicator between consecutive
        stages, split into slides by metric category.
      </p>

      {sessionDates.length < 2 ? (
        <p className="text-sm text-muted">Need at least 2 recorded sessions for this team.</p>
      ) : (
        <>
          <div>
            <div className="text-xs text-muted uppercase tracking-wide mb-1.5">
              Stages ({stages.length})
            </div>
            <div className="space-y-1.5">
              {sessionDates.map((date) => {
                const stage = stages.find((s) => s.date === date)
                return (
                  <div key={date} className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-muted w-28 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={!!stage}
                        onChange={() => toggleDate(date)}
                        className="accent-accent"
                      />
                      {date}
                    </label>
                    {stage && (
                      <input
                        type="text"
                        value={stage.label}
                        onChange={(e) => relabel(date, e.target.value)}
                        placeholder="Stage label"
                        className="bg-surface2 border border-border rounded-md px-2 py-1 text-xs text-text w-40"
                      />
                    )}
                  </div>
                )
              })}
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
              exportTeamSeasonDeck({
                org,
                team,
                store,
                metricKeys: selectedKeys,
                stages,
                reportTitle,
                recipient,
              })
            }
            disabled={!canExport}
            className="bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export Season Deck PPTX
          </button>
          {stages.length < 2 && (
            <p className="text-xs text-flagYellow">Pick at least 2 stages to export.</p>
          )}
        </>
      )}
    </div>
  )
}
