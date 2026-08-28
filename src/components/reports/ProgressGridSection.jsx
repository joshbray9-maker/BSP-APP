import { useEffect, useState } from 'react'
import { METRICS, getActiveMetrics } from '../../lib/metrics.js'
import { getTeamSessionDates } from '../../lib/selectors.js'
import { exportTeamProgressGridPdf } from '../../lib/reports/progressGridExport.js'

/**
 * "20 athletes vertically orientated with tests horizontally across top" — Josh's 2026-08-17
 * notes, matching report A in docs/reference/REPORT_FRAMEWORKS.md. Pick two dates (defaulting
 * to the team's earliest/latest recorded session — e.g. pre-season vs. most recent), pick which
 * metrics to include (defaults to the same active set as the dashboard, but any of the full
 * battery can be added), export a roster×metric before/after grid with a progression/regression
 * indicator per cell.
 */
export default function ProgressGridSection({ org, team, store, reportTitle, recipient }) {
  const sessionDates = getTeamSessionDates(store, team.id)
  const [fromDate, setFromDate] = useState(sessionDates[0] ?? '')
  const [toDate, setToDate] = useState(sessionDates[sessionDates.length - 1] ?? '')
  const [selectedKeys, setSelectedKeys] = useState(() => getActiveMetrics().map((m) => m.key))

  // Reset the date range (not the metric selection) whenever the team changes — a different
  // team's session dates may not even exist for the previously selected team.
  useEffect(() => {
    setFromDate(sessionDates[0] ?? '')
    setToDate(sessionDates[sessionDates.length - 1] ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id])

  function toggleMetric(key) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const canExport = selectedKeys.length > 0 && fromDate && toDate && sessionDates.length > 0

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
      <div className="font-medium text-text">Progress Grid (Before / After)</div>
      <p className="text-xs text-muted -mt-2">
        A roster×metric grid comparing two dates — e.g. pre-season vs. post-season — with a
        progression/regression indicator per cell. Pick any two recorded session dates below.
      </p>

      {sessionDates.length === 0 ? (
        <p className="text-sm text-muted">No recorded sessions for this team yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm text-muted flex flex-col gap-1">
              From date
              <select
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-surface2 border border-border rounded-md px-2 py-1.5 text-text"
              >
                {sessionDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-muted flex flex-col gap-1">
              To date
              <select
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-surface2 border border-border rounded-md px-2 py-1.5 text-text"
              >
                {sessionDates.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
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
              exportTeamProgressGridPdf({
                org,
                team,
                store,
                metricKeys: selectedKeys,
                fromDate,
                toDate,
                reportTitle,
                recipient,
              })
            }
            disabled={!canExport}
            className="bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export Progress Grid PDF
          </button>
        </>
      )}
    </div>
  )
}
