/**
 * VALD ForceDecks response-shape logic — pure functions, no network/secrets/Supabase involved,
 * so this can be written and even sanity-checked (via a local script + a handful of real trial
 * responses once credentials exist) before any backend exists to run it in. Every rule here is
 * copied from `../../../Colin AMS VALD API Install Brief.pdf` (a prior real ForceDecks
 * integration's troubleshooting brief), not invented — see that file for the full reasoning and
 * the real bugs each rule prevents.
 *
 * This is the prototype/spec version. The deployed Edge Function
 * (`supabase/functions/vald-sync/index.ts`) duplicates the same logic inline rather than
 * importing this file, since Supabase's function bundler doesn't reliably follow imports outside
 * a function's own directory — keep the two in sync if either changes. This file's real job is
 * to be the place that logic is written and reasoned about once, and a target for local
 * verification scripts later (see brief Section 15, step 3: "build a small proof-of-concept
 * script... to validate field mapping against real data before anything user-facing exists").
 */

/** The only limb value that represents an athlete's real combined result. Every other limb
 * value ('Left', 'Right', 'Asym') is a variant of the same metric — grabbing whichever happens
 * to be last in the results array instead of filtering explicitly is the brief's documented
 * "most common first-pass bug" (silently substitutes the Left/Right/Asym value for the real one,
 * with no error thrown). */
export const TRIAL_LIMB = 'Trial'

/**
 * @param {{definition?: {result?: string}, limb?: string, value?: number}[]} results
 * @param {string} resultKey - VALD's result string, e.g. 'JUMP_HEIGHT'
 * @returns {number | undefined}
 */
export function extractTrialValue(results, resultKey) {
  return results?.find((r) => r.definition?.result === resultKey && r.limb === TRIAL_LIMB)?.value
}

/**
 * Which trial (rep) represents "the test" for a given day, when a test contains multiple trials.
 * Reasonable default per the brief, NOT a documented universal VALD rule — re-verify once real
 * data exists for each new test type (brief Section 7).
 *
 * @param {{results?: {definition?: {result?: string}, limb?: string, value?: number}[]}[]} trials
 * @returns {object | null} the chosen trial, or null if `trials` is empty
 */
export function pickRepresentativeTrial(trials) {
  if (!trials?.length) return null
  let best = null
  let bestJump = -Infinity
  let anyJump = false
  for (const trial of trials) {
    const v = extractTrialValue(trial.results ?? [], 'JUMP_HEIGHT')
    if (v != null) {
      anyJump = true
      if (v > bestJump) {
        bestJump = v
        best = trial
      }
    }
  }
  // Non-jump tests (isometric pulls and similar) report no JUMP_HEIGHT at all — fall back to
  // the last recorded trial for those.
  return anyJump ? best : trials[trials.length - 1]
}

/**
 * Maps one trial's results onto destination column names, SCOPED BY TEST TYPE (brief Section 8's
 * required pattern) — different test types can report near-identical result-string vocabularies
 * (e.g. two isometric test types both using PEAK_VERTICAL_FORCE) that need to land in different
 * columns. A flat global map would silently merge unrelated tests' data the moment two test
 * types share a field name, so `resultToColumnByTestType` MUST be keyed by test type, never flat.
 *
 * @param {string} testType
 * @param {{definition?: {result?: string}, limb?: string, value?: number}[]} results
 * @param {Record<string, Record<string, string>>} resultToColumnByTestType - { [testType]: { [resultString]: yourColumnName } }
 * @returns {{ mapped: Record<string, number>, raw: Record<string, number> }} `mapped` = values
 *   that hit a known column for this test type; `raw` = every other Trial-limb value, kept
 *   (never dropped) for the raw_json catch-all column.
 */
export function mapTrialResults(testType, results, resultToColumnByTestType) {
  const scoped = resultToColumnByTestType[testType] ?? {}
  const mapped = {}
  const raw = {}
  for (const r of results ?? []) {
    const key = r.definition?.result
    if (!key || r.limb !== TRIAL_LIMB) continue
    if (scoped[key]) mapped[scoped[key]] = r.value
    else raw[key] = r.value
  }
  return { mapped, raw }
}

/**
 * Athlete/profile matching — the highest-stakes part of this integration per the brief (Section
 * 11): getting it wrong doesn't crash anything, it silently attributes real performance data to
 * the wrong person. Two real data-integrity incidents happened in the brief's own prior build
 * from skipping these exact rules. Non-negotiable, not stylistic:
 *   1. Only match against active roster records.
 *   2. A name matching more than one active record is reported as ambiguous, never guessed.
 *   3. A VALD profile matching no active record is reported as unmatched, never silently dropped
 *      or auto-created.
 *
 * @param {{profileId: string, givenName: string, familyName: string}[]} valdProfiles
 * @param {{id: number|string, displayName: string}[]} activeAthletes - already filtered to
 *   `active = true` by the caller; this function does not re-check activeness itself, since
 *   whether a record is "active" is a caller-side data concern, not a name-matching one.
 * @returns {{
 *   matched: {athleteId: number|string, profileId: string}[],
 *   unmatched: {profileId: string, name: string}[],
 *   ambiguous: {name: string, profileIds: string[]}[],
 * }}
 */
export function matchProfilesToAthletes(valdProfiles, activeAthletes) {
  const normalize = (s) => s.trim().toLowerCase()

  const athletesByName = new Map()
  for (const athlete of activeAthletes) {
    const key = normalize(athlete.displayName)
    if (!athletesByName.has(key)) athletesByName.set(key, [])
    athletesByName.get(key).push(athlete)
  }

  const matched = []
  const unmatched = []
  const ambiguousByName = new Map()

  for (const profile of valdProfiles) {
    const name = `${profile.givenName} ${profile.familyName}`.trim()
    const key = normalize(name)
    const candidates = athletesByName.get(key) ?? []

    if (candidates.length === 1) {
      matched.push({ athleteId: candidates[0].id, profileId: profile.profileId })
    } else if (candidates.length === 0) {
      unmatched.push({ profileId: profile.profileId, name })
    } else {
      // More than one ACTIVE athlete shares this name — do not guess which one. Report once per
      // name, not once per VALD profile, since it's the same ambiguity either way.
      if (!ambiguousByName.has(key)) ambiguousByName.set(key, { name, profileIds: [] })
      ambiguousByName.get(key).profileIds.push(profile.profileId)
    }
  }

  return { matched, unmatched, ambiguous: [...ambiguousByName.values()] }
}
