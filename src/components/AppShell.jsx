import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../lib/store.js'
import { applyBrandTheme } from '../lib/theme.js'
import { ROLES, ROLE_LABELS, canAccessView } from '../lib/roles.js'
import RoleGate from './RoleGate.jsx'
import BrandBadge from './BrandBadge.jsx'
import TeamDashboard from './dashboard/TeamDashboard.jsx'
import AthleteDetail from './athletes/AthleteDetail.jsx'
import PlayerProfilesPanel from './athletes/PlayerProfilesPanel.jsx'
import UploadPanel from './uploads/UploadPanel.jsx'
import ReportPanel from './reports/ReportPanel.jsx'
import ReadinessPanel from './readiness/ReadinessPanel.jsx'
import ManageTeamsPanel from './manage/ManageTeamsPanel.jsx'
import AddOrganizationModal from './manage/AddOrganizationModal.jsx'

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'readiness', label: 'Readiness' },
  { key: 'players', label: 'Player Profiles' },
  { key: 'upload', label: 'Upload / Enter Data' },
  { key: 'reports', label: 'Reports' },
  { key: 'manage', label: 'Manage Teams' },
]

export default function AppShell({ onSignOut }) {
  const store = useStore()
  // Two-level selection: pick an organization/program first, then a team within it — instead
  // of one flat list of every team across every org. See CLIENT_BUILD_PLAN.md's addendum on
  // this change for why (a program like BCS has several teams underneath it).
  const [orgId, setOrgId] = useState(store.organizations[0]?.id ?? null)
  const [teamId, setTeamId] = useState(null)
  const [view, setView] = useState('dashboard')
  const [selectedAthlete, setSelectedAthlete] = useState(null)
  // Demo-only role toggle — see src/lib/roles.js. Not real auth; resets on reload.
  const [role, setRole] = useState(ROLES.ADMIN)
  const [showAddOrg, setShowAddOrg] = useState(false)

  // Compared as strings throughout this component: Supabase's bigint ids come through as JS
  // numbers, but a <select>'s onChange always hands back a string — a strict === would silently
  // fail to match any org/team picked from a dropdown except whichever loaded as the default.
  const orgTeams = useMemo(
    () => store.teams.filter((t) => String(t.orgId) === String(orgId)),
    [store.teams, orgId],
  )

  // With the Supabase-backed store, organizations load asynchronously — the useState initializer
  // above already ran (and captured null) before that fetch resolved. Self-heal once real data
  // arrives, so the org selector isn't stuck empty forever. A no-op for the local store, where
  // organizations are already present at mount.
  useEffect(() => {
    if (!orgId && store.organizations.length > 0) setOrgId(store.organizations[0].id)
  }, [store.organizations, orgId])

  // Keep teamId valid whenever the selected org changes (or its team list changes) — default
  // to that org's first team rather than leaving the team dropdown empty.
  useEffect(() => {
    if (!orgTeams.some((t) => String(t.id) === String(teamId))) {
      setTeamId(orgTeams[0]?.id ?? null)
      setSelectedAthlete(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, orgTeams])

  const team = useMemo(
    () => store.teams.find((t) => String(t.id) === String(teamId)) ?? null,
    [store.teams, teamId],
  )
  const org = useMemo(
    () => store.organizations.find((o) => String(o.id) === String(orgId)) ?? null,
    [store.organizations, orgId],
  )

  // Per-team/org branding → runtime theme. See src/lib/theme.js.
  useEffect(() => {
    if (team || org) applyBrandTheme({ team, org })
  }, [team, org])

  // If the current role loses access to the active view (e.g. switching to Coach while on
  // Upload), fall back to a view the role can still see.
  useEffect(() => {
    if (!canAccessView(role, view)) setView('dashboard')
  }, [role, view])

  function handleSelectOrg(nextOrgId) {
    setOrgId(nextOrgId)
    setSelectedAthlete(null)
    setView('dashboard')
  }

  function handleSelectTeam(nextTeamId) {
    setTeamId(nextTeamId)
    setSelectedAthlete(null)
    setView('dashboard')
  }

  function handleSelectView(nextView) {
    setSelectedAthlete(null)
    setView(nextView)
  }

  if (store.loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Loading…</div>
  }

  if (store.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 text-center">
        <p className="text-sm text-flagRed max-w-sm">Couldn't load data: {store.error}</p>
      </div>
    )
  }

  if (!org) {
    return <div className="p-6 text-muted">No organization selected.</div>
  }

  const visibleNavItems = NAV_ITEMS.filter((item) => canAccessView(role, item.key))

  return (
    <div className="min-h-screen flex flex-col">
      {/*
        The nav row always renders (no hidden hamburger-menu mode) and wraps via flex-wrap at
        narrow widths instead of disappearing. An earlier version hid this row below Tailwind's
        `md` (768px) breakpoint behind a "Menu" toggle button — at the width the embedded
        preview pane actually renders (~700px), that collapsed the entire primary navigation
        into a button easy to miss, which looked like "nothing is clickable." Keep every nav
        item always visible/clickable regardless of pane width.
      */}
      <header className="sticky top-0 z-10 bg-surface border-b border-border">
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <BrandBadge team={team} org={org} size="md" />
            <span className="font-semibold text-text whitespace-nowrap hidden lg:inline">
              Performance Hub
            </span>
            <select
              value={orgId}
              onChange={(e) => handleSelectOrg(e.target.value)}
              className="bg-surface2 border border-border rounded-md px-2 py-2 sm:py-1.5 text-sm text-text max-w-[38vw] sm:max-w-[220px] truncate"
            >
              {store.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <select
              value={teamId ?? ''}
              onChange={(e) => handleSelectTeam(e.target.value)}
              className="bg-surface2 border border-border rounded-md px-2 py-2 sm:py-1.5 text-sm text-text max-w-[32vw] sm:max-w-[200px] truncate"
            >
              {orgTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <RoleGate role={role} allow={[ROLES.ADMIN]}>
              <button
                onClick={() => setShowAddOrg(true)}
                title="Add a new organization"
                className="text-sm border border-border text-muted px-2 py-2 sm:py-1.5 rounded-md hover:border-accent hover:text-text flex-shrink-0"
              >
                + Org
              </button>
            </RoleGate>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <span className="hidden sm:inline">Viewing as</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="bg-surface2 border border-border rounded-md px-2 py-1.5 sm:py-1 text-xs text-text"
                title="Demo-only role simulation — see src/lib/roles.js"
              >
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </label>
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="text-xs border border-border text-muted px-2 py-1.5 sm:py-1 rounded-md hover:text-text"
              >
                Sign out
              </button>
            )}
          </div>
        </div>

        <nav className="px-3 sm:px-4 pb-2.5 sm:pb-3 flex items-center gap-1 flex-wrap">
          {visibleNavItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleSelectView(item.key)}
              className={`text-sm px-3 py-2 sm:py-1.5 rounded-md transition-colors ${
                view === item.key && !selectedAthlete
                  ? 'bg-accent text-accentFg font-medium'
                  : 'text-muted hover:text-text'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 md:px-6 py-6">
        {!team ? (
          <RoleGate
            role={role}
            allow={[ROLES.ADMIN]}
            fallback={<div className="text-sm text-muted">This organization has no teams yet — ask an admin to add one.</div>}
          >
            <ManageTeamsPanel org={org} team={null} />
          </RoleGate>
        ) : selectedAthlete ? (
          <AthleteDetail
            athlete={selectedAthlete}
            team={team}
            org={org}
            onBack={() => setSelectedAthlete(null)}
          />
        ) : view === 'dashboard' ? (
          <TeamDashboard team={team} org={org} onSelectAthlete={setSelectedAthlete} />
        ) : view === 'readiness' ? (
          <ReadinessPanel team={team} role={role} />
        ) : view === 'players' ? (
          <PlayerProfilesPanel team={team} org={org} />
        ) : view === 'upload' ? (
          <RoleGate role={role} allow={[ROLES.ADMIN]} fallback={<AccessNote view="Upload / Enter Data" />}>
            <UploadPanel team={team} />
          </RoleGate>
        ) : view === 'reports' ? (
          <RoleGate role={role} allow={[ROLES.ADMIN]} fallback={<AccessNote view="Reports" />}>
            <ReportPanel org={org} team={team} />
          </RoleGate>
        ) : (
          <RoleGate role={role} allow={[ROLES.ADMIN]} fallback={<AccessNote view="Manage Teams" />}>
            <ManageTeamsPanel org={org} team={team} />
          </RoleGate>
        )}
      </main>

      <AddOrganizationModal
        open={showAddOrg}
        onClose={() => setShowAddOrg(false)}
        onCreated={(newOrgId) => {
          setShowAddOrg(false)
          handleSelectOrg(newOrgId)
          setView('manage')
        }}
      />
    </div>
  )
}

function AccessNote({ view }) {
  return (
    <div className="text-sm text-muted bg-surface border border-border rounded-lg p-4 max-w-md">
      The current role doesn't have access to {view}. This is a placeholder rule — see
      src/lib/roles.js and docs/OPEN_QUESTIONS.md; real coach permissions are still to be
      confirmed.
    </div>
  )
}
