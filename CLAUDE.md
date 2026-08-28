# CLAUDE.md

Guidance for any Claude Code session (or human) picking up this project.

## Project purpose

A performance-data hub for Josh Bray (ETX Training), Director of Sports Performance. Consolidates
testing data across multiple teams/organizations into one system: upload or hand-enter results →
standardized dashboard per team → individual athlete history → exportable reports. See
`../CLIENT_BUILD_PLAN.md` (one directory up) for the full planning rationale, and
`docs/OPEN_QUESTIONS.md` for what's still unconfirmed.

## Scope boundaries — read before adding anything

This is a **performance monitoring/reporting** tool. It is explicitly **not**:
- A programming/exercise-prescription platform.
- A calendar/annual-planning system.
- A private-client business/CRM/payment system.
- An injury/medical records system.
- A multi-user product with *real* coach or athlete logins. A **skeleton** exists for both: the
  coach/admin role switcher (see Architecture summary below) and, as of 2026-08-18, a Supabase
  Auth + RLS skeleton for read-only player access (`src/player/`, `database/schema/schema_sketch.sql`,
  `docs/PLAYER_ACCESS.md`) — but neither is connected to a real backend yet. Don't treat either
  as live auth until a real Supabase project exists and the security checklist in
  `docs/PLAYER_ACCESS.md` has actually been run.

If a request sounds like one of the above, it is out of scope for this build. Flag it rather
than building it. See `CLIENT_BUILD_PLAN.md` Phase 3 for the full BUILD NOW / STRUCTURE FOR
LATER / DO NOT BUILD YET breakdown.

## Data / privacy rules

- **Organization/team names, logos, and colors may be real** once Josh confirms a program (see
  `docs/PROGRAMS.md`) — this is public branding information (school athletics sites, public
  logos), not sensitive data. **Athlete rosters must stay synthetic placeholders** (e.g.
  "Athlete HV01") under that real branding until Josh explicitly says otherwise for a given
  program — confirmed in chat, not to be changed unilaterally.
- Do not paste real athlete data into a Claude prompt, even to "help design a chart." Use
  de-identified samples or synthetic data to establish file *shape*.
- No real secrets belong in this repo. `.env.example` is safe to commit (placeholders only);
  `.env` / `.env.local` are git-ignored and must never be committed.
- If/when real Supabase credentials exist, the publishable/anon key is the only one that ever
  goes in a `VITE_`-prefixed variable. The secret/service-role key is tooling-only, never in
  client code, never in a prompt.

## Architecture summary

- Vite + React 18 (JavaScript, no TypeScript) + Tailwind CSS.
- No backend server. Data currently lives in-memory + `localStorage` (see
  `src/lib/store.js`) as a stand-in for a future Supabase Postgres database — this is a
  **preliminary build**, no real database is connected yet.
- Domain logic lives in `src/lib/*.js` as pure functions, not inside components. Components
  read config and call these functions — do not put calculation logic directly in JSX.
- Metrics are **config data** (`src/lib/metrics.js`), not hard-coded per chart. Adding or
  changing a displayed metric should be a config edit, not a new component.
- Flag thresholds are placeholders (`src/lib/flags.js`), explicitly commented as such. **Do not
  invent real sport-science thresholds.** If asked to add flagging logic, keep it in this
  editable config shape and label unconfirmed values clearly.
- Per-team/org branding (`src/lib/theme.js`) sets CSS custom properties (`--accent`,
  `--accent-fg`, `--brand-primary`) at runtime from the selected team's (or its org's)
  `colorAccent`/`colorPrimary`. Tailwind's `accent`/`accentFg` color tokens read these vars
  (see `tailwind.config.js`) — use `bg-accent`/`text-accentFg`/`border-accent` classes, not
  hardcoded hex, so new UI stays on-theme automatically. Report exporters
  (`src/lib/reports/*.js`) call `resolveBrandColors()` for the same reason.
- The dark-theme background surfaces (`--bg`/`--surface`/`--surface2`/`--border`, → Tailwind's
  `bg`/`surface`/`surface2`/`border` tokens) are *also* set per-org in `applyBrandTheme` — hue
  is derived from the org's accent color, fixed saturation/lightness per surface (see
  `BG_SHADES` in `theme.js`). This is deliberately algorithmic, not a hand-picked color per
  program, so every org (current and future) automatically gets a tinted-dark background that
  "feels like" its brand color without a new special case each time. Don't add a per-org
  if/switch for this — add/adjust `BG_SHADES` if the tint intensity needs to change globally.
- Role-access is **UI scaffolding, not security** (`src/lib/roles.js`, `RoleGate.jsx`). The role
  switcher in the header is a session-only demo toggle. Never treat a `RoleGate` check as a
  real permission boundary — when real auth is connected, enforcement must move to Supabase
  RLS (see the reference packet's `rls_policies_pattern.sql`).
- The player-facing app (`src/player/`) is a **separate tree from `AppShell.jsx`**, not a role
  branch inside it, so a player's session never loads coach/admin-only code paths at all. It's
  gated by `isSupabaseConfigured` (`src/lib/supabaseClient.js`) and stays inert — showing a
  "not set up yet" message — until real Supabase credentials exist. See `docs/PLAYER_ACCESS.md`
  before touching any of this: it explains why the player view deliberately has no team-average
  comparison (that needs its own RLS-safe aggregate function, not built yet) and the security
  checklist to run before any real athlete data goes in.
- Weekly readiness (`src/lib/readiness.js`, `src/components/readiness/`) is a **framework**
  awaiting Josh's real scoring definitions — the 1–5 formula is explicitly commented as a
  placeholder. Don't firm up the formula without new client input.
- If a Tailwind color token change (in `tailwind.config.js`) doesn't seem to show up in the
  dev server, clear `node_modules/.vite` and restart — seen once in this project where the
  compiled CSS kept a stale static color after the config was edited to use a CSS variable.

## Coding conventions

- Deterministic calculations (parsing, matching, averages, thresholds, PDF generation) must stay
  deterministic code — never delegate these to an AI call at runtime.
- Keep ingestion (`src/lib/parsers.js`, `src/lib/ingest.js`) generic: normalize dates/numbers,
  map known columns, and stash anything unrecognized rather than dropping it.
- New data sources should be addable by adding a parser + column map, not by restructuring the
  core schema. See `docs/IMPORT_SPEC.md`.

## Deferred features (do not build without a scope discussion)

See `CLIENT_BUILD_PLAN.md` Phase 3 "STRUCTURE FOR LATER" and "DO NOT BUILD YET," and
`docs/PROJECT_SCOPE.md` for the current split. In short: real coach/athlete authentication,
editable-threshold UI beyond the current config file, bulk report packaging, real VALD column
mapping, confirmed readiness scoring rules, and anything vendor-API-integration-shaped.

## Requirement not to invent sport-science rules

If a task requires a coaching threshold, KPI definition, or flagging rule that isn't already in
`CLIENT_BUILD_PLAN.md` as confirmed, **do not invent one.** Add a clearly-labeled placeholder
and note it in `docs/OPEN_QUESTIONS.md` instead.
