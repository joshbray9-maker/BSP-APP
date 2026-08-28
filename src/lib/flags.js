/**
 * PLACEHOLDER flag thresholds. These are NOT confirmed sport-science thresholds — Josh has not
 * defined flagging rules yet (see CLIENT_BUILD_PLAN.md Phase 1, "Confirmed Business Rules").
 * They exist only so the dashboard can demonstrate the *concept* of tiered flagging against a
 * rolling baseline. Do not present these as real coaching guidance. See docs/OPEN_QUESTIONS.md.
 *
 * Mirrors the reference project's "DB-editable config merged over code defaults" shape, so a
 * real `flag_thresholds` table can slot in later without changing how dashboards/reports read
 * this data — see database/schema/schema_sketch.sql.
 */
export const DEFAULT_TIERS = [
  { label: 'High', color: '#ef4444', minPct: 115 },
  { label: 'Normal', color: '#22c55e', minPct: 85 },
  { label: 'Low', color: '#eab308', minPct: 0 },
]

/**
 * Session-count rolling average — no calendar zero-fill, mean of the last N recorded values.
 * Adapted from the reference project's reusable rolling_avg_util.js.
 */
export function rollingAvg(values, n) {
  if (!values.length) return null
  const slice = values.slice(Math.max(0, values.length - n))
  const sum = slice.reduce((acc, v) => acc + v, 0)
  return sum / slice.length
}

/**
 * Returns a flag tier for a value against a baseline, using PLACEHOLDER thresholds.
 * Returns null (neutral / not enough history) rather than guessing when baseline is missing.
 *
 * `higherIsBetter` (default true) flips the ratio for timed metrics where a lower number is the
 * better result (sprints, agility, braking duration, etc. — see src/lib/metrics.js) so a faster
 * time still reads as "above baseline" rather than being flagged as a decline.
 */
export function flagForValue(value, baseline, tiers = DEFAULT_TIERS, higherIsBetter = true) {
  if (value == null || baseline == null || baseline === 0 || value === 0) return null
  const ratio = higherIsBetter ? value / baseline : baseline / value
  const pct = Math.round(ratio * 100)
  const tier = tiers.find((t) => pct >= t.minPct) ?? tiers[tiers.length - 1]
  return { pct, ...tier }
}
