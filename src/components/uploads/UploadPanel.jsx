import { useState } from 'react'
import { parseGenericTestingFile } from '../../lib/parsers.js'
import { matchRowsToRoster } from '../../lib/ingest.js'
import { METRICS } from '../../lib/metrics.js'
import { getTeamAthletes } from '../../lib/selectors.js'
import { useStore } from '../../lib/store.js'
import BulkEntryGrid from './BulkEntryGrid.jsx'

/**
 * Per Josh: the two real long-term data paths are file upload and (eventually) an automated
 * VALD API pull — see docs/VALD_API_RESEARCH.md. Manual entry below is a deliberate SKELETON,
 * not a committed feature; he may remove it once file upload + API pull are proven. Don't
 * invest further polish here without checking docs/OPEN_QUESTIONS.md first.
 */
export default function UploadPanel({ team }) {
  const store = useStore()
  const athletes = getTeamAthletes(store, team.id)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const [manualAthleteId, setManualAthleteId] = useState(athletes[0]?.id ?? '')
  const [manualDate, setManualDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [manualMetric, setManualMetric] = useState(METRICS[0].key)
  const [manualValue, setManualValue] = useState('')
  const [manualSaved, setManualSaved] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const buffer = await file.arrayBuffer()
      const { rows, errors } = parseGenericTestingFile(buffer)
      const { matchedRows, unmatchedNames } = matchRowsToRoster(rows, athletes)
      const uploadId = await store.ingestRows({
        fileName: file.name,
        rows: matchedRows,
        matchedCount: matchedRows.length,
        unmatchedNames,
      })
      setResult({
        fileName: file.name,
        uploadId,
        matchedCount: matchedRows.length,
        errorCount: errors.length,
        errors,
        unmatchedNames,
      })
    } catch (err) {
      setResult({ error: String(err?.message ?? err) })
    } finally {
      setBusy(false)
      e.target.value = ''
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault()
    const trimmed = manualValue.trim()
    const isDnc = trimmed.toUpperCase() === 'DNC'
    if (!manualAthleteId || !manualDate || !manualMetric || trimmed === '') return
    if (!isDnc && !Number.isFinite(Number(trimmed))) return
    store.addManualResult({
      athleteId: manualAthleteId,
      date: manualDate,
      metricKey: manualMetric,
      value: isDnc ? 'DNC' : Number(trimmed),
    })
    setManualSaved(true)
    setManualValue('')
    setTimeout(() => setManualSaved(false), 2000)
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Upload a testing file</h2>
        <p className="text-sm text-muted mb-3">
          The primary data path. Accepts a CSV/XLSX with columns{' '}
          <code className="text-accent">athlete_name, date, metric_key, value</code> — see{' '}
          <code>sample-data/mock-testing.csv</code> for an example. This is a generic format for
          this preliminary build, not the real VALD ForceDecks export layout (see
          docs/IMPORT_SPEC.md). An automated VALD API pull is researched but not yet built — see
          docs/VALD_API_RESEARCH.md — and will use this same ingest pipeline once it exists.
        </p>
        <input
          type="file"
          accept=".csv,.xlsx"
          onChange={handleFile}
          disabled={busy}
          className="block text-sm text-text file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-accent file:text-accentFg file:font-medium file:cursor-pointer"
        />

        {result?.error && (
          <div className="mt-3 text-sm text-flagRed bg-flagRed/10 border border-flagRed/30 rounded-md p-3">
            {result.error}
          </div>
        )}

        {result && !result.error && (
          <div className="mt-3 bg-surface border border-border rounded-lg p-3 text-sm space-y-1">
            <div className="text-text">
              <strong>{result.fileName}</strong>: {result.matchedCount} row(s) ingested
            </div>
            {result.errorCount > 0 && (
              <div className="text-flagYellow">{result.errorCount} row(s) flagged and skipped</div>
            )}
            {result.unmatchedNames.length > 0 && (
              <div className="text-flagYellow">
                Unmatched athlete name(s): {result.unmatchedNames.join(', ')}
              </div>
            )}
            {result.errorCount === 0 && result.unmatchedNames.length === 0 && (
              <div className="text-flagGreen">No issues found.</div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-dashed border-border pt-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-base font-semibold text-muted">Manual entry (temporary skeleton)</h2>
        </div>
        <p className="text-sm text-muted mb-4 max-w-xl">
          For the occasional value that doesn't come through a file or the API. This isn't a
          committed long-term feature — Josh may remove it entirely once file upload and the
          VALD API pull are both proven, so it's kept intentionally simple.
        </p>

        <div className="space-y-6 opacity-90">
          <BulkEntryGrid team={team} athletes={athletes} />

          <div>
            <h3 className="text-sm font-medium text-muted mb-1">Quick single correction</h3>
            <p className="text-xs text-muted mb-3">
              For fixing or adding one value without opening the whole session grid above.
            </p>
            <form onSubmit={handleManualSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm text-muted flex flex-col gap-1">
                Athlete
                <select
                  value={manualAthleteId}
                  onChange={(e) => setManualAthleteId(e.target.value)}
                  className="bg-surface border border-border rounded-md px-2 py-2 text-text"
                >
                  {athletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-muted flex flex-col gap-1">
                Date
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="bg-surface border border-border rounded-md px-2 py-2 text-text"
                />
              </label>
              <label className="text-sm text-muted flex flex-col gap-1">
                Metric
                <select
                  value={manualMetric}
                  onChange={(e) => setManualMetric(e.target.value)}
                  className="bg-surface border border-border rounded-md px-2 py-2 text-text"
                >
                  {METRICS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-muted flex flex-col gap-1">
                Value
                <input
                  type="text"
                  inputMode="decimal"
                  value={manualValue}
                  onChange={(e) => setManualValue(e.target.value)}
                  placeholder="number, or DNC"
                  title="A number, or DNC if this test was attempted but not completed"
                  className="bg-surface border border-border rounded-md px-2 py-2 text-text"
                />
              </label>
              <button
                type="submit"
                className="sm:col-span-2 border border-border text-text text-sm font-medium px-4 py-2 rounded-md hover:border-accent"
              >
                {manualSaved ? 'Saved ✓' : 'Save result'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
