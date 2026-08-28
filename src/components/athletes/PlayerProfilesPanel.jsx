import { useState } from 'react'
import { getTeamAthletes } from '../../lib/selectors.js'
import { useStore } from '../../lib/store.js'
import { exportRosterPdf } from '../../lib/reports/pdfExport.js'
import { exportRosterPptx } from '../../lib/reports/rosterDeckExport.js'
import AthleteDetail from './AthleteDetail.jsx'

/**
 * A standalone "Player Profiles" tab — reuses AthleteDetail's exact content (radar chart,
 * team-average trend charts, session history, per-athlete Export PDF/CSV) but reached directly
 * from the nav with a dropdown to switch which athlete is shown, instead of only being reachable
 * by clicking a roster card on the Dashboard. Adds the two roster-wide exports on top: one PDF
 * packet (one athlete per page) and one PPTX deck (one athlete per slide) — both capture and
 * embed real chart images per athlete (see src/lib/reports/chartCapture.js), so a full roster
 * export takes a few seconds per athlete rather than being instant; the buttons show a
 * "Generating…" busy state for that reason rather than looking unresponsive.
 */
export default function PlayerProfilesPanel({ team, org }) {
  const store = useStore()
  const athletes = getTeamAthletes(store, team.id)
  const [athleteId, setAthleteId] = useState(athletes[0]?.id ?? null)
  const athlete = athletes.find((a) => a.id === athleteId) ?? athletes[0] ?? null
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingPptx, setExportingPptx] = useState(false)

  if (!athlete) {
    return <div className="text-sm text-muted">No athletes on this team yet — add a roster in Manage Teams.</div>
  }

  async function handleExportRosterPdf() {
    setExportingPdf(true)
    try {
      await exportRosterPdf({ org, team, store })
    } finally {
      setExportingPdf(false)
    }
  }

  async function handleExportRosterPptx() {
    setExportingPptx(true)
    try {
      await exportRosterPptx({ org, team, store })
    } finally {
      setExportingPptx(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm text-muted flex items-center gap-2">
          Player
          <select
            value={athlete.id}
            onChange={(e) => setAthleteId(e.target.value)}
            className="bg-surface border border-border rounded-md px-2 py-1.5 text-text"
          >
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.displayName}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportRosterPdf}
            disabled={exportingPdf}
            className="text-sm border border-border rounded-md px-3 py-1.5 text-text hover:border-accent disabled:opacity-50"
          >
            {exportingPdf ? 'Generating…' : 'Export Roster PDF (all players)'}
          </button>
          <button
            onClick={handleExportRosterPptx}
            disabled={exportingPptx}
            className="text-sm border border-border rounded-md px-3 py-1.5 text-text hover:border-accent disabled:opacity-50"
          >
            {exportingPptx ? 'Generating…' : 'Export Roster PPTX (all players)'}
          </button>
        </div>
      </div>

      <AthleteDetail athlete={athlete} team={team} org={org} onBack={null} />
    </div>
  )
}
