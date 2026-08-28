import { useMemo, useState } from 'react'
import { METRICS } from '../../lib/metrics.js'
import { getValueForAthleteDateMetric } from '../../lib/selectors.js'
import { useStore } from '../../lib/store.js'

/**
 * Spreadsheet-style bulk entry: pick one session date, fill in a grid of athlete × metric
 * cells, save the whole session at once. This is the direct answer to Additional Notes #2 —
 * "the ability to enter data directly into the database as if I'm entering into excel" — which
 * a single-row-at-a-time form doesn't really satisfy. Mirrors the reference project's bulk
 * entry pattern (one pre-populated row per athlete, single Save).
 */
export default function BulkEntryGrid({ team, athletes }) {
  const store = useStore()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [cells, setCells] = useState({})
  const [savedAt, setSavedAt] = useState(null)

  // Re-key by date so switching the date shows that date's existing values, like reopening a
  // spreadsheet tab rather than carrying stale edits from a different date into view.
  const cellKey = (athleteId, metricKey) => `${date}|${athleteId}|${metricKey}`

  const grid = useMemo(
    () =>
      athletes.map((athlete) => ({
        athlete,
        cells: METRICS.map((metric) => {
          const key = cellKey(athlete.id, metric.key)
          const existing = getValueForAthleteDateMetric(store, athlete.id, date, metric.key)
          const value = key in cells ? cells[key] : existing != null ? String(existing) : ''
          return { metric, key, value }
        }),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [athletes, date, cells, store.sessions, store.results],
  )

  function handleCellChange(key, value) {
    setCells((prev) => ({ ...prev, [key]: value }))
  }

  function handleSaveSession() {
    let count = 0
    for (const row of grid) {
      for (const cell of row.cells) {
        if (cell.value === '' || cell.value == null) continue
        const trimmed = String(cell.value).trim()
        const isDnc = trimmed.toUpperCase() === 'DNC'
        if (!isDnc && !Number.isFinite(Number(trimmed))) continue
        store.addManualResult({
          athleteId: row.athlete.id,
          date,
          metricKey: cell.metric.key,
          value: isDnc ? 'DNC' : Number(trimmed),
        })
        count += 1
      }
    }
    setCells({})
    setSavedAt(`Saved ${count} value(s) for ${date}.`)
    setTimeout(() => setSavedAt(null), 3000)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-text mb-1">Enter a whole session at once</h2>
      <p className="text-sm text-muted mb-3">
        Pick a date, fill in the grid like a spreadsheet, save everything together. Existing
        values for that date are pre-filled and can be corrected here. Type{' '}
        <code className="text-accent">DNC</code> in a cell for a test that was attempted but not
        completed — kept distinct from a cell you just leave blank (never tested).
      </p>

      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm text-muted flex items-center gap-2">
          Session date
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setCells({})
            }}
            className="bg-surface border border-border rounded-md px-2 py-1.5 text-text"
          />
        </label>
        {savedAt && <span className="text-xs text-flagGreen">{savedAt}</span>}
      </div>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="px-3 py-2 font-medium sticky left-0 bg-bg">Athlete</th>
              {METRICS.map((m) => (
                <th key={m.key} className="px-3 py-2 font-medium whitespace-nowrap">
                  {m.label} {m.unit ? <span className="text-muted">({m.unit})</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.athlete.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 text-text whitespace-nowrap sticky left-0 bg-bg">
                  {row.athlete.displayName}
                </td>
                {row.cells.map((cell) => (
                  <td key={cell.key} className="px-3 py-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cell.value}
                      onChange={(e) => handleCellChange(cell.key, e.target.value)}
                      placeholder="— or DNC"
                      title="A number, or DNC if this test was attempted but not completed"
                      className="w-24 bg-surface2 border border-border rounded-md px-2 py-1 text-text"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        onClick={handleSaveSession}
        className="mt-3 bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90"
      >
        Save Session
      </button>
    </div>
  )
}
