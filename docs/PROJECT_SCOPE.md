# Project Scope

See `../../CLIENT_BUILD_PLAN.md` for the full analysis. This file is the short, in-repo version.

## In scope (this build)
- Multi-organization/team performance data hub, with per-team/org color palette + logo that
  automatically re-themes the UI and exports (`src/lib/theme.js`).
- Self-service organization creation (`src/components/manage/AddOrganizationModal.jsx`, the "+
  Org" header button) — name, an uploaded logo (stored as a data URI, no file backend yet), and
  picked colors, rather than the earlier Claude-assisted logo/color-sourcing process used for
  every real program added so far (still the right process for a *real* branded program — see
  `docs/PROGRAMS.md`; this self-service path is for a new org's own DIY branding).
- Upload of a file, a spreadsheet-style bulk entry grid (one session, whole roster at once —
  `src/components/uploads/BulkEntryGrid.jsx`, with a `DNC` did-not-complete value alongside
  numbers), and a quick single-value correction form.
- Team dashboard with every metric the team actually has recorded data for (not a fixed curated
  subset), a Full/Last N session display-range filter (`src/lib/chartRange.js` — also on the
  athlete detail view), and a same-day red-flag alert banner scoped to the whole organization
  (`buildTodaysRedFlags` in `src/lib/selectors.js`).
- Individual athlete history view, plus a standalone "Player Profiles" tab
  (`src/components/athletes/PlayerProfilesPanel.jsx`) reaching the same view via an athlete
  dropdown instead of only through a dashboard roster click, with roster-wide PDF/PPTX exports
  (one athlete per page/slide — `exportRosterPdf`, `exportRosterPptx`).
- Report export: PDF, CSV, and a first-draft PPTX (`src/lib/reports/`), with an optional custom
  title/recipient field on the team report panel.
- Weekly readiness framework: configurable metric selection, an editable per-metric scoring
  threshold table (admin-only — what raw value counts as a 5/4/3/2, see
  `src/lib/readiness.js`'s `DEFAULT_SCORE_THRESHOLDS` and `setReadinessThreshold` in
  `src/lib/store.js`), stoplight display, team-wide + individual views.
- Role-access scaffolding: a master-admin vs. coach role concept with a demo role switcher and
  view-level gating (`src/lib/roles.js`, `src/components/RoleGate.jsx`) — UI simulation only,
  not real authentication.

## Deferred (structured for, not built)
- Real coach login (Supabase Auth) and the real permission rule for what a coach can see —
  today's role switcher is a client-side demo toggle, not a security boundary.
- Editable-threshold UI (config file exists; no admin screen yet).
- Real readiness scoring definitions (framework is built; formula is a labeled placeholder).
- Bulk roster report export (combined PDF vs. ZIP — packaging not yet confirmed).
- Real VALD ForceDecks column mapping (needs a real sample export).
- Real Supabase connection (needs a client-owned Supabase account).
- Real org/team logo images and finished brand color palettes (schema/theme support exists;
  current colors are an interim placeholder, not Josh's brand).
- PPTX layout refinement (a first draft exists; no example deck reviewed yet).
- VALD API integration for automatic data pulls — researched, not built. Requires a backend
  component this project doesn't have yet (a client secret can't live in the browser). See
  `docs/VALD_API_RESEARCH.md`. Josh has confirmed he hasn't done an integration like this
  before, so this becomes a guided walkthrough when we get to it, not a silent build step.

## Out of scope (do not build without an explicit scope conversation)
Programming/exercise software, annual planning/calendars, private-client business management,
payment tracking, CRM, injury/medical tracking, vendor API integrations, AI-driven coaching
decisions, Wix changes.
