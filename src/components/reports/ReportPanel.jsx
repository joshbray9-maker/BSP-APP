import { useEffect, useState } from 'react'
import { METRICS, getActiveMetrics } from '../../lib/metrics.js'
import { getTeamAthletes } from '../../lib/selectors.js'
import { useStore } from '../../lib/store.js'
import { exportTeamPdf, exportAthletePdf } from '../../lib/reports/pdfExport.js'
import { exportTeamCsv, exportAthleteCsv } from '../../lib/reports/csvExport.js'
import { exportTeamPptx } from '../../lib/reports/pptxExport.js'
import ProgressGridSection from './ProgressGridSection.jsx'
import SeasonDeckSection from './SeasonDeckSection.jsx'
import WeeklyInsightSection from './WeeklyInsightSection.jsx'

const SECONDARY_BUTTON =
  'text-xs border border-border rounded-md px-3 py-1.5 text-text hover:border-accent'

export default function ReportPanel({ org, team }) {
  const store = useStore()
  const athletes = getTeamAthletes(store, team.id)
  const [reportTitle, setReportTitle] = useState('')
  const [recipient, setRecipient] = useState('')
  const [exportingAthleteId, setExportingAthleteId] = useState(null)
  const [teamMetricKeys, setTeamMetricKeys] = useState(() => getActiveMetrics().map((m) => m.key))

  useEffect(() => {
    setTeamMetricKeys(getActiveMetrics().map((m) => m.key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id])

  function toggleTeamMetric(key) {
    setTeamMetricKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const canExportTeam = teamMetricKeys.length > 0

  async function handleExportAthletePdf(athlete) {
    setExportingAthleteId(athlete.id)
    try {
      await exportAthletePdf({ org, team, athlete, store, recipient })
    } finally {
      setExportingAthleteId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Reports</h2>
        <p className="text-sm text-muted mb-3">
          PDF, CSV, and PPTX are all wired up for the team report. PPTX uses a first-draft slide
          layout — no example deck has been shared yet, so treat it as a starting point to
          refine together, not a finished design. See docs/OPEN_QUESTIONS.md.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="font-medium text-text">Cover title / recipient (optional)</div>
        <p className="text-xs text-muted -mt-2">
          Just relabels the exports below — it doesn't change what data goes in. "Title override"
          replaces the default heading (e.g. "Team Alpha — Team Report") on every PDF/PPTX export
          on this page. "Recipient" adds a "For: Coach Martinez" line under that heading, useful
          if you're sending this to someone specific. Leave both blank to use the defaults. Not
          used by CSV exports, since those are raw data files, not formatted reports.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm text-muted flex flex-col gap-1">
            Title override
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder={`${team.name} — Team Report`}
              className="bg-surface2 border border-border rounded-md px-2 py-1.5 text-text"
            />
          </label>
          <label className="text-sm text-muted flex flex-col gap-1">
            Recipient
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. Coach Martinez"
              className="bg-surface2 border border-border rounded-md px-2 py-1.5 text-text"
            />
          </label>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
        <div className="font-medium text-text">{team.name} — full team report</div>
        <p className="text-xs text-muted -mt-2">
          Team averages only — one number per metric, not a per-athlete dump (that's what
          Individual Athlete Reports and Player Profiles are for, below). PDF and PPTX both page
          automatically, however many metrics you pick.
        </p>

        <div>
          <div className="text-xs text-muted uppercase tracking-wide mb-1.5">
            Metrics included ({teamMetricKeys.length})
          </div>
          <div className="flex flex-wrap gap-3 max-h-32 overflow-y-auto border border-border rounded-md p-2">
            {METRICS.map((metric) => (
              <label key={metric.key} className="flex items-center gap-1.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={teamMetricKeys.includes(metric.key)}
                  onChange={() => toggleTeamMetric(metric.key)}
                  className="accent-accent"
                />
                {metric.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => exportTeamPdf({ org, team, store, metricKeys: teamMetricKeys, reportTitle, recipient })}
            disabled={!canExportTeam}
            className="bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Export Team PDF
          </button>
          <button
            onClick={() => exportTeamCsv({ team, store, metricKeys: teamMetricKeys })}
            disabled={!canExportTeam}
            className={`${SECONDARY_BUTTON} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Export Team CSV
          </button>
          <button
            onClick={() => exportTeamPptx({ org, team, store, metricKeys: teamMetricKeys, reportTitle, recipient })}
            disabled={!canExportTeam}
            className={`${SECONDARY_BUTTON} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Export Team PPTX
          </button>
        </div>
      </div>

      <WeeklyInsightSection org={org} team={team} store={store} reportTitle={reportTitle} recipient={recipient} />
      <ProgressGridSection org={org} team={team} store={store} reportTitle={reportTitle} recipient={recipient} />
      <SeasonDeckSection org={org} team={team} store={store} reportTitle={reportTitle} recipient={recipient} />

      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="font-medium text-text mb-3">Individual athlete reports</div>
        <div className="space-y-2">
          {athletes.map((athlete) => (
            <div key={athlete.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-text">{athlete.displayName}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportAthletePdf(athlete)}
                  disabled={exportingAthleteId === athlete.id}
                  className={`${SECONDARY_BUTTON} disabled:opacity-50`}
                >
                  {exportingAthleteId === athlete.id ? 'Generating…' : 'PDF'}
                </button>
                <button
                  onClick={() => exportAthleteCsv({ team, athlete, store })}
                  className={SECONDARY_BUTTON}
                >
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">
          A single "export whole roster" action (one combined PDF or a ZIP of individual PDFs)
          is deferred until Josh confirms which packaging he wants — see
          docs/OPEN_QUESTIONS.md item 8.
        </p>
      </div>
    </div>
  )
}
