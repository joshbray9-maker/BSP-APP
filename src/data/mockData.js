/**
 * Data seed for this build. Two layers, kept structurally separate on purpose:
 *
 * 1. DEMO_* — fully synthetic "Team Alpha"/"Team Beta" data, kept around at Josh's request for
 *    testing multi-team/org switching. Safe to delete later: remove the DEMO_* declarations
 *    below and their two spreads in ORGANIZATIONS/TEAMS/ROSTER — nothing else references them
 *    by name.
 * 2. PROGRAM_* — real client organizations/teams/branding, added program by program as Josh
 *    sends them. Team/org names, logos, and colors here are REAL — but per Josh's direction,
 *    athlete rosters stay synthetic placeholders until real rosters are provided. See
 *    docs/PROGRAMS.md for the source of each program's branding and CLAUDE.md for the
 *    athlete-data privacy rule this depends on.
 */
import { getActiveMetrics } from '../lib/metrics.js'

// Deterministic pseudo-random so the seeded dataset looks the same on every load (mulberry32).
function seededRandom(seed) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// DEMO DATA — synthetic, kept for testing. See file header for removal steps.
// ---------------------------------------------------------------------------

const DEMO_ORGANIZATIONS = [
  {
    id: 'org-alpha',
    name: 'Org Alpha Athletics',
    logoUrl: null,
    colorPrimary: '#0f766e',
    colorAccent: '#14b8a6',
  },
  {
    id: 'org-beta',
    name: 'Org Beta Performance',
    logoUrl: null,
    colorPrimary: '#5b21b6',
    colorAccent: '#8b5cf6',
  },
]

const DEMO_TEAMS = [
  { id: 'team-alpha', orgId: 'org-alpha', name: 'Team Alpha', sport: 'Basketball', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-beta', orgId: 'org-beta', name: 'Team Beta', sport: 'Rugby', logoUrl: null, colorPrimary: null, colorAccent: null },
]

const DEMO_ROSTER = {
  'team-alpha': [
    { id: 'athlete-a01', displayName: 'Athlete A01', position: 'Guard' },
    { id: 'athlete-a02', displayName: 'Athlete A02', position: 'Forward' },
    { id: 'athlete-a03', displayName: 'Athlete A03', position: 'Center' },
    { id: 'athlete-a04', displayName: 'Athlete A04', position: 'Guard' },
  ],
  'team-beta': [
    { id: 'athlete-b01', displayName: 'Athlete B01', position: 'Prop' },
    { id: 'athlete-b02', displayName: 'Athlete B02', position: 'Fly-half' },
    { id: 'athlete-b03', displayName: 'Athlete B03', position: 'Fullback' },
    { id: 'athlete-b04', displayName: 'Athlete B04', position: 'Lock' },
  ],
}

// ---------------------------------------------------------------------------
// REAL PROGRAMS — org/team names, logos, and colors are real. Athletes are
// intentionally synthetic placeholders — see docs/PROGRAMS.md and CLAUDE.md.
// ---------------------------------------------------------------------------

// Which of Josh's two VALD accounts each real program's data will come from, per Colin
// 2026-08-22 — Académie Universel has its own dedicated VALD account; every other program
// (BCS, Bishop's University, Iona) authenticates under Josh's personal VALD account instead.
// Purely metadata today (no VALD credentials exist yet) — this is what lets the eventual sync
// function know which of the two credential sets to use for a given org's teams. See
// docs/VALD_API_RESEARCH.md and database/schema/schema_sketch.sql's vald_accounts table.
const VALD_ACCOUNT = {
  PERSONAL: 'personal',
  UNIVERSEL: 'universel',
}

const PROGRAM_ORGANIZATIONS = [
  {
    id: 'org-bcs',
    name: "Bishop's College School",
    logoUrl: '/logos/bcs-bears.jpeg',
    // Official brand purple, taken from bishopscollegeschool.com's own site CSS (the
    // `.bcs-ath-btn` athletics button and page background both use this exact value).
    // See docs/PROGRAMS.md for how this was sourced.
    colorPrimary: '#631d76',
    colorAccent: '#631d76',
    valdAccount: VALD_ACCOUNT.PERSONAL,
  },
  {
    id: 'org-universel',
    name: 'Académie Universel',
    logoUrl: '/logos/universel-academie.jpg',
    // Official brand green, taken from universelacademie.com's own site CSS (the "S'informer"
    // CTA button background). The academy's own social posts sign off with a green/black
    // heart pair (💚🖤), confirming green + black as the two brand colors. See docs/PROGRAMS.md.
    colorPrimary: '#249346',
    colorAccent: '#249346',
    valdAccount: VALD_ACCOUNT.UNIVERSEL,
  },
  {
    id: 'org-bishops-university',
    name: "Bishop's University",
    logoUrl: '/logos/bishops-university-rugby.jpg',
    // Official brand purple, taken from gaiters.ca's own site CSS (the dominant button/link
    // color across the live site, used 28x on the athletics homepage). Note: this is a
    // different institution from "Bishop's College School" (org-bcs) above, even though both
    // are in Sherbrooke/Lennoxville, Quebec and both happen to use purple. See docs/PROGRAMS.md.
    colorPrimary: '#753bb0',
    colorAccent: '#753bb0',
    valdAccount: VALD_ACCOUNT.PERSONAL,
  },
  {
    id: 'org-iona',
    name: 'Iona University',
    logoUrl: '/logos/iona-gaels.jpg',
    // Official brand maroon, taken from ionagaels.com's own site CSS — matches the shield
    // background in the Iona Gaels crest. Gold (#ffcc00) is the site's secondary/CTA color;
    // maroon was used here as the single primary since it's the dominant identity color in the
    // crest itself. See docs/PROGRAMS.md.
    colorPrimary: '#661e2b',
    colorAccent: '#661e2b',
    valdAccount: VALD_ACCOUNT.PERSONAL,
  },
]

const PROGRAM_TEAMS = [
  { id: 'team-bcs-hockey-varsity', orgId: 'org-bcs', name: 'BCS Bears Varsity (U18 Hockey)', sport: 'Hockey', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-bcs-hockey-prep', orgId: 'org-bcs', name: 'BCS Bears Prep (U16 Hockey)', sport: 'Hockey', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-bcs-basketball-varsity', orgId: 'org-bcs', name: 'BCS Basketball Varsity', sport: 'Basketball', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-bcs-basketball-prep', orgId: 'org-bcs', name: 'BCS Basketball Prep', sport: 'Basketball', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-universel-ncdc-vermont', orgId: 'org-universel', name: 'Universel NCDC Vermont', sport: 'Hockey', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-universel-ncdc-quebec', orgId: 'org-universel', name: 'Universel NCDC Quebec', sport: 'Hockey', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-universel-usphl', orgId: 'org-universel', name: 'Universel USPHL', sport: 'Hockey', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-universel-varsity', orgId: 'org-universel', name: 'Universel Varsity', sport: 'Hockey', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-bu-mens-rugby', orgId: 'org-bishops-university', name: "BU Men's Rugby", sport: 'Rugby', logoUrl: null, colorPrimary: null, colorAccent: null },
  { id: 'team-iona-mens-rugby', orgId: 'org-iona', name: "Iona Men's Rugby", sport: 'Rugby', logoUrl: null, colorPrimary: null, colorAccent: null },
]

const PROGRAM_ROSTER = {
  'team-bcs-hockey-varsity': [
    { id: 'athlete-hv01', displayName: 'Athlete HV01', position: 'Forward' },
    { id: 'athlete-hv02', displayName: 'Athlete HV02', position: 'Defense' },
    { id: 'athlete-hv03', displayName: 'Athlete HV03', position: 'Goalie' },
    { id: 'athlete-hv04', displayName: 'Athlete HV04', position: 'Forward' },
  ],
  'team-bcs-hockey-prep': [
    { id: 'athlete-hp01', displayName: 'Athlete HP01', position: 'Forward' },
    { id: 'athlete-hp02', displayName: 'Athlete HP02', position: 'Defense' },
    { id: 'athlete-hp03', displayName: 'Athlete HP03', position: 'Goalie' },
    { id: 'athlete-hp04', displayName: 'Athlete HP04', position: 'Defense' },
  ],
  'team-bcs-basketball-varsity': [
    { id: 'athlete-kv01', displayName: 'Athlete KV01', position: 'Guard' },
    { id: 'athlete-kv02', displayName: 'Athlete KV02', position: 'Forward' },
    { id: 'athlete-kv03', displayName: 'Athlete KV03', position: 'Center' },
    { id: 'athlete-kv04', displayName: 'Athlete KV04', position: 'Guard' },
  ],
  'team-bcs-basketball-prep': [
    { id: 'athlete-kp01', displayName: 'Athlete KP01', position: 'Guard' },
    { id: 'athlete-kp02', displayName: 'Athlete KP02', position: 'Forward' },
    { id: 'athlete-kp03', displayName: 'Athlete KP03', position: 'Center' },
    { id: 'athlete-kp04', displayName: 'Athlete KP04', position: 'Forward' },
  ],
  'team-universel-ncdc-vermont': [
    { id: 'athlete-uv01', displayName: 'Athlete UV01', position: 'Forward' },
    { id: 'athlete-uv02', displayName: 'Athlete UV02', position: 'Defense' },
    { id: 'athlete-uv03', displayName: 'Athlete UV03', position: 'Goalie' },
    { id: 'athlete-uv04', displayName: 'Athlete UV04', position: 'Forward' },
  ],
  'team-universel-ncdc-quebec': [
    { id: 'athlete-uq01', displayName: 'Athlete UQ01', position: 'Forward' },
    { id: 'athlete-uq02', displayName: 'Athlete UQ02', position: 'Defense' },
    { id: 'athlete-uq03', displayName: 'Athlete UQ03', position: 'Goalie' },
    { id: 'athlete-uq04', displayName: 'Athlete UQ04', position: 'Defense' },
  ],
  'team-universel-usphl': [
    { id: 'athlete-uu01', displayName: 'Athlete UU01', position: 'Forward' },
    { id: 'athlete-uu02', displayName: 'Athlete UU02', position: 'Defense' },
    { id: 'athlete-uu03', displayName: 'Athlete UU03', position: 'Goalie' },
    { id: 'athlete-uu04', displayName: 'Athlete UU04', position: 'Forward' },
  ],
  'team-universel-varsity': [
    { id: 'athlete-ut01', displayName: 'Athlete UT01', position: 'Forward' },
    { id: 'athlete-ut02', displayName: 'Athlete UT02', position: 'Defense' },
    { id: 'athlete-ut03', displayName: 'Athlete UT03', position: 'Goalie' },
    { id: 'athlete-ut04', displayName: 'Athlete UT04', position: 'Defense' },
  ],
  'team-bu-mens-rugby': [
    { id: 'athlete-bu01', displayName: 'Athlete BU01', position: 'Prop' },
    { id: 'athlete-bu02', displayName: 'Athlete BU02', position: 'Hooker' },
    { id: 'athlete-bu03', displayName: 'Athlete BU03', position: 'Fly-half' },
    { id: 'athlete-bu04', displayName: 'Athlete BU04', position: 'Fullback' },
  ],
  'team-iona-mens-rugby': [
    { id: 'athlete-io01', displayName: 'Athlete IO01', position: 'Prop' },
    { id: 'athlete-io02', displayName: 'Athlete IO02', position: 'Lock' },
    { id: 'athlete-io03', displayName: 'Athlete IO03', position: 'Fly-half' },
    { id: 'athlete-io04', displayName: 'Athlete IO04', position: 'Wing' },
  ],
}

// ---------------------------------------------------------------------------
// Combined exports — add future programs by appending to PROGRAM_* above.
// ---------------------------------------------------------------------------

export const ORGANIZATIONS = [...DEMO_ORGANIZATIONS, ...PROGRAM_ORGANIZATIONS]
export const TEAMS = [...DEMO_TEAMS, ...PROGRAM_TEAMS]
const ROSTER = { ...DEMO_ROSTER, ...PROGRAM_ROSTER }

export const ATHLETES = Object.entries(ROSTER).flatMap(([teamId, athletes]) =>
  athletes.map((a) => ({ ...a, teamId })),
)

// Synthetic sessions are only generated for the metrics listed here — a deliberately partial
// slice of the full battery in src/lib/metrics.js, matching the real-world reality that a given
// team hasn't tested most of it (Josh: "I won't test all, but will test all at some point with
// any one group"). The first 4 are his defaultOn "currently uses" set; the next 6 extend that to
// the rest of the metric vocabulary his own anonymized reference reports actually show values
// for (docs/reference/REPORT_FRAMEWORKS.md reports A–D) — every base/spread here is read off (or
// closely bracketed by) real numbers in those tables, not invented. Metrics with no numeric
// anchor anywhere in Josh's notes or reference reports (Cooper, bronco, on-ice tests, sprints,
// 3RM strength) are deliberately left unseeded rather than guessed at.
const METRIC_BASELINES = {
  cmj_height_cm: { base: 38, spread: 10 },
  rsi_modified: { base: 0.45, spread: 0.15 },
  cm_depth_cm: { base: 30, spread: 8 },
  grip_dynamometer_kg: { base: 45, spread: 10 },
  // Report B (Pineapple Mach group): Squat Jump 26.8-47.7cm.
  sj_height_cm: { base: 34, spread: 16 },
  // Report B: Abalakov 30.2-54.8cm.
  abalakov_height_cm: { base: 38, spread: 18 },
  // Report A: IMTP 1458-3598N. Report C: 2630-3039N.
  imtp_n: { base: 2600, spread: 1000 },
  // Report A "Rel. Str." 18.77-73.7 N/kg (bulk of rows 30-55). Report C "N/kg" 31.04-35.79.
  rel_peak_force_n_kg: { base: 38, spread: 14 },
  // Report B: 5-10-5 4.82-5.88s.
  pro_agility_5_10_5_s: { base: 5.3, spread: 0.5 },
  // Report B: Deadhang 48-135s.
  deadhang_s: { base: 95, spread: 35 },
}

const SESSION_DATES = ['2026-07-07', '2026-07-14', '2026-07-21', '2026-07-28', '2026-08-04', '2026-08-11']

function buildSessionsAndResults() {
  const sessions = []
  const results = []
  let sessionCounter = 0
  let resultCounter = 0

  for (const athlete of ATHLETES) {
    const rand = seededRandom(hashCode(athlete.id))
    for (const date of SESSION_DATES) {
      sessionCounter += 1
      const sessionId = `session-${sessionCounter}`
      sessions.push({
        id: sessionId,
        athleteId: athlete.id,
        date,
        source: 'sample-data',
        uploadId: null,
      })

      for (const metricKey of Object.keys(METRIC_BASELINES)) {
        const { base, spread } = METRIC_BASELINES[metricKey]
        const drift = (rand() - 0.5) * spread
        const value = Math.round((base + drift) * 100) / 100
        resultCounter += 1
        results.push({
          id: `result-${resultCounter}`,
          sessionId,
          metricKey,
          value,
          raw: {},
        })
      }
    }
  }

  return { sessions, results }
}

function hashCode(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return h
}

const { sessions: SEED_SESSIONS, results: SEED_RESULTS } = buildSessionsAndResults()

export const MOCK_SEED = {
  organizations: ORGANIZATIONS,
  teams: TEAMS,
  athletes: ATHLETES,
  sessions: SEED_SESSIONS,
  results: SEED_RESULTS,
  // Defaults to the metrics on by default (RSI mod, CM depth, jump height, grip strength) —
  // matches what Josh's 2026-08-17 notes say he currently uses for readiness. Any collected
  // metric can still be toggled in via the picker in ReadinessPanel — see src/lib/readiness.js.
  readinessConfig: { selectedMetricKeys: getActiveMetrics().map((m) => m.key) },
}
