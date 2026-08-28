import { useState } from 'react'
import { useStore } from '../../lib/store.js'
import { isSupabaseConfigured, supabase } from '../../lib/supabaseClient.js'

const VALD_ACCOUNT_LABELS = {
  personal: "Josh's personal VALD account",
  universel: 'Académie Universel VALD account',
}

/**
 * Team/roster lifecycle management — directly answers Josh's 2026-08-17 notes: "I'd like the
 * ability to add and subtract teams willingly and the same for rosters. Being able to move,
 * remove, and add players as needed, ideally with the data transferring over to their new
 * team." This is also the UI-level version of the "keep Team Alpha/Beta removable" capability
 * from the earlier BCS round — see CLIENT_BUILD_PLAN.md.
 *
 * Scoped to the currently selected org (Teams section) and team (Roster section), matching the
 * org→team selector already at the top of the app rather than introducing a second one here.
 * New teams are added under the current org only. `team` may be null — a freshly created
 * organization (see AddOrganizationModal.jsx) has zero teams yet, so the Roster section is
 * skipped until at least one team exists to hold a roster.
 */
export default function ManageTeamsPanel({ org, team }) {
  const store = useStore()
  const orgTeams = store.teams.filter((t) => t.orgId === org.id)
  const roster = team ? store.athletes.filter((a) => a.teamId === team.id) : []

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Manage Teams — {org.name}</h2>
        <p className="text-sm text-muted max-w-xl">
          Add or remove teams under this organization. A team can't be removed while it still
          has a roster — move or remove those athletes first, so history is never deleted by
          accident.
        </p>
      </div>

      <TeamList teams={orgTeams} store={store} />
      <AddTeamForm orgId={org.id} store={store} />

      <VaidSyncSection org={org} />

      {team ? (
        <>
          <div className="border-t border-border pt-8">
            <h2 className="text-lg font-semibold text-text mb-1">Manage Roster — {team.name}</h2>
            <p className="text-sm text-muted max-w-xl">
              Add, remove, or move athletes on this team. Moving an athlete carries their full
              test history to the new team automatically — nothing is re-entered.
            </p>
          </div>

          <RosterList roster={roster} currentTeamId={team.id} store={store} />
          <AddAthleteForm teamId={team.id} store={store} />
        </>
      ) : (
        <div className="border-t border-border pt-8 text-sm text-muted">
          Add a team above to start building its roster.
        </div>
      )}
    </div>
  )
}

/**
 * VALD ForceDecks sync trigger — prebuilt ahead of Josh's real credentials so there's nothing
 * left to *design* once they exist, only to configure (see supabase/functions/vald-sync/index.ts
 * and docs/VALD_API_RESEARCH.md). Inert (disabled button, "not connected yet" message) until
 * `isSupabaseConfigured` is true, matching the same activation pattern already used for the
 * player-facing app (src/player/) — see CLAUDE.md.
 *
 * `org.valdAccount` (set in src/data/mockData.js) records which of Josh's two VALD accounts this
 * org's data will come from — Académie Universel has its own dedicated account; every other
 * program shares his personal one. Demo orgs (Team Alpha/Beta) have no VALD account at all.
 */
function VaidSyncSection({ org }) {
  const [status, setStatus] = useState(null) // null | 'syncing' | {message, isError}

  const accountLabel = org.valdAccount ? VALD_ACCOUNT_LABELS[org.valdAccount] : null

  async function handleSyncNow() {
    setStatus('syncing')
    try {
      const { data, error } = await supabase.functions.invoke('vald-sync', {
        headers: { 'x-vald-account': org.valdAccount },
      })
      if (error) throw error
      const logId = data?.logIds?.[0]
      const result = logId ? await pollSyncLog(logId) : null
      setStatus({ message: result?.message ?? 'Sync started.', isError: result?.status === 'error' })
    } catch (e) {
      setStatus({ message: e.message ?? 'Sync failed.', isError: true })
    }
  }

  async function pollSyncLog(logId) {
    for (let i = 0; i < 30; i++) {
      const { data: row } = await supabase.from('vald_sync_log').select('status, message').eq('id', logId).single()
      if (row && row.status !== 'processing') return row
      await new Promise((r) => setTimeout(r, 2000))
    }
    return null
  }

  return (
    <div className="border-t border-border pt-8">
      <h2 className="text-lg font-semibold text-text mb-1">VALD ForceDecks Sync — {org.name}</h2>
      {accountLabel ? (
        <p className="text-sm text-muted max-w-xl mb-3">
          Pulls test results directly from VALD instead of a manual file upload. This org syncs
          against <span className="text-text">{accountLabel}</span>.
        </p>
      ) : (
        <p className="text-sm text-muted max-w-xl mb-3">
          This organization isn't mapped to either of Josh's VALD accounts yet — set it in
          <code className="text-xs bg-surface2 px-1 py-0.5 rounded mx-1">src/data/mockData.js</code>
          once known.
        </p>
      )}

      {!isSupabaseConfigured ? (
        <p className="text-xs text-muted">
          Not connected yet — no Supabase project exists for this client. Once it does, this
          button starts working with no code changes. See docs/VALD_API_RESEARCH.md.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncNow}
            disabled={status === 'syncing' || !org.valdAccount}
            className="bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {status === 'syncing' ? 'Syncing…' : 'Sync Now'}
          </button>
          {status && status !== 'syncing' && (
            <span className={`text-xs ${status.isError ? 'text-flagRed' : 'text-muted'}`}>{status.message}</span>
          )}
        </div>
      )}
    </div>
  )
}

function TeamList({ teams, store }) {
  const [confirmingId, setConfirmingId] = useState(null)

  return (
    <div className="border border-border rounded-lg divide-y divide-border">
      {teams.length === 0 && <div className="p-3 text-sm text-muted">No teams in this organization yet.</div>}
      {teams.map((t) => {
        const rosterCount = store.athletes.filter((a) => a.teamId === t.id).length
        const confirming = confirmingId === t.id
        return (
          <div key={t.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-text font-medium">{t.name}</div>
              <div className="text-xs text-muted">
                {t.sport} · {rosterCount} athlete{rosterCount === 1 ? '' : 's'}
              </div>
            </div>
            {rosterCount > 0 ? (
              <span className="text-xs text-muted" title="Move or remove this team's athletes first">
                Roster must be empty to remove
              </span>
            ) : confirming ? (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    store.removeTeam(t.id)
                    setConfirmingId(null)
                  }}
                  className="text-xs bg-flagRed text-white px-2.5 py-1 rounded-md font-medium"
                >
                  Confirm remove
                </button>
                <button
                  onClick={() => setConfirmingId(null)}
                  className="text-xs border border-border text-muted px-2.5 py-1 rounded-md"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingId(t.id)}
                className="text-xs border border-border text-muted px-2.5 py-1 rounded-md hover:border-flagRed hover:text-flagRed"
              >
                Remove team
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AddTeamForm({ orgId, store }) {
  const [name, setName] = useState('')
  const [sport, setSport] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !sport.trim()) return
    store.addTeam({ orgId, name: name.trim(), sport: sport.trim() })
    setName('')
    setSport('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-muted flex flex-col gap-1 w-full sm:w-auto">
        New team name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. U16 Prep"
          className="bg-surface border border-border rounded-md px-2 py-2 text-text w-full sm:w-56"
        />
      </label>
      <label className="text-sm text-muted flex flex-col gap-1 w-full sm:w-auto">
        Sport
        <input
          type="text"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          placeholder="e.g. Hockey"
          className="bg-surface border border-border rounded-md px-2 py-2 text-text w-full sm:w-40"
        />
      </label>
      <button
        type="submit"
        className="w-full sm:w-auto bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90"
      >
        Add team
      </button>
    </form>
  )
}

function RosterList({ roster, currentTeamId, store }) {
  const [confirmingId, setConfirmingId] = useState(null)
  const [moveTargets, setMoveTargets] = useState({})

  const teamOptions = store.teams
    .map((t) => ({ ...t, orgName: store.organizations.find((o) => o.id === t.orgId)?.name ?? '' }))
    .sort((a, b) => (a.orgName < b.orgName ? -1 : a.orgName > b.orgName ? 1 : a.name < b.name ? -1 : 1))

  function handleMove(athleteId) {
    const toTeamId = moveTargets[athleteId]
    if (!toTeamId || toTeamId === currentTeamId) return
    store.moveAthlete({ athleteId, toTeamId })
  }

  return (
    <div className="border border-border rounded-lg divide-y divide-border">
      {roster.length === 0 && <div className="p-3 text-sm text-muted">No athletes on this team yet.</div>}
      {roster.map((athlete) => {
        const confirming = confirmingId === athlete.id
        return (
          <div key={athlete.id} className="p-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-text font-medium">{athlete.displayName}</div>
              <div className="text-xs text-muted">{athlete.position}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={moveTargets[athlete.id] ?? currentTeamId}
                onChange={(e) => setMoveTargets((prev) => ({ ...prev, [athlete.id]: e.target.value }))}
                className="bg-surface border border-border rounded-md px-2 py-1.5 text-xs text-text max-w-[55vw] sm:max-w-[220px] truncate"
              >
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.orgName} — {t.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleMove(athlete.id)}
                disabled={(moveTargets[athlete.id] ?? currentTeamId) === currentTeamId}
                className="text-xs border border-border text-text px-2.5 py-1 rounded-md hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Move
              </button>
              {confirming ? (
                <>
                  <button
                    onClick={() => {
                      store.removeAthlete(athlete.id)
                      setConfirmingId(null)
                    }}
                    className="text-xs bg-flagRed text-white px-2.5 py-1 rounded-md font-medium"
                  >
                    Confirm remove
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="text-xs border border-border text-muted px-2.5 py-1 rounded-md"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setConfirmingId(athlete.id)}
                  className="text-xs border border-border text-muted px-2.5 py-1 rounded-md hover:border-flagRed hover:text-flagRed"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AddAthleteForm({ teamId, store }) {
  const [displayName, setDisplayName] = useState('')
  const [position, setPosition] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!displayName.trim()) return
    store.addAthlete({ teamId, displayName: displayName.trim(), position: position.trim() })
    setDisplayName('')
    setPosition('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <label className="text-sm text-muted flex flex-col gap-1 w-full sm:w-auto">
        New athlete name
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Athlete N05"
          className="bg-surface border border-border rounded-md px-2 py-2 text-text w-full sm:w-56"
        />
      </label>
      <label className="text-sm text-muted flex flex-col gap-1 w-full sm:w-auto">
        Position
        <input
          type="text"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="e.g. Forward"
          className="bg-surface border border-border rounded-md px-2 py-2 text-text w-full sm:w-40"
        />
      </label>
      <button
        type="submit"
        className="w-full sm:w-auto bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90"
      >
        Add athlete
      </button>
    </form>
  )
}
