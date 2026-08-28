/**
 * Weekly readiness scoring — FRAMEWORK ONLY. Josh has asked for this feature but has not yet
 * supplied the sample data or the real 1–5 readiness definitions ("I'll probably need to give
 * you some sample data first"). Everything scored here is a clearly-labeled placeholder so the
 * concept — configurable metrics, a 1–5 score, a stoplight display — can be demonstrated and
 * then swapped for his real definitions without restructuring the UI. See docs/OPEN_QUESTIONS.md.
 *
 * Confirmed requirements this framework satisfies:
 * - Any collected metric should be selectable for inclusion (not a fixed list).
 * - Metrics should be easy to swap in/out/redefine over time.
 * - A 1–5 readiness score per metric.
 * - A simple stoplight display: green = go, yellow = caution, red = intervention.
 */
import { METRICS } from './metrics.js'
import { rollingAvg } from './flags.js'
import { buildAthleteMetricSeries, getTeamAthletes } from './selectors.js'

export const READINESS_BANDS = {
  GO: { label: 'Go', color: '#22c55e' },
  CAUTION: { label: 'Caution', color: '#eab308' },
  INTERVENTION: { label: 'Intervention', color: '#ef4444' },
}

export function bandForScore(score) {
  if (score == null) return null
  if (score >= 4) return READINESS_BANDS.GO
  if (score === 3) return READINESS_BANDS.CAUTION
  return READINESS_BANDS.INTERVENTION
}

/**
 * Default 1–5 scoring bands: value as a percentage of the athlete's own rolling baseline. Kept
 * as the fallback when a coach hasn't customized a metric's thresholds yet — see
 * setReadinessThreshold in src/lib/store.js and the "Scoring thresholds" editor in
 * ReadinessPanel.jsx, which is how a coach defines what a 5 vs. a 3 actually means per metric,
 * per Josh's explicit request ("the coach needs the ability to determine what a 5, 3, etc is for
 * each metric"). These numbers are still an unconfirmed starting point, not sport-science policy
 * — the whole point of the editor is that Josh sets the real ones himself, per metric.
 */
export const DEFAULT_SCORE_THRESHOLDS = { score5: 100, score4: 90, score3: 80, score2: 70 }

/**
 * 1–5 scoring: value as a percentage of the athlete's own rolling baseline, binned into five
 * bands defined by `thresholds` (each a "% of baseline at or above which this score applies";
 * anything below `score2` scores 1). `higherIsBetter` (see src/lib/metrics.js) flips the ratio
 * for timed metrics so a faster time still scores as an improvement rather than a decline.
 */
export function scoreMetricValue(value, baseline, higherIsBetter = true, thresholds = DEFAULT_SCORE_THRESHOLDS) {
  if (value == null || baseline == null || baseline === 0 || value === 0) return null
  const pct = higherIsBetter ? (value / baseline) * 100 : (baseline / value) * 100
  if (pct >= thresholds.score5) return 5
  if (pct >= thresholds.score4) return 4
  if (pct >= thresholds.score3) return 3
  if (pct >= thresholds.score2) return 2
  return 1
}

/** Builds a readiness snapshot for one athlete across the given (selected) metric keys. Reads
 * each metric's coach-configured thresholds from store.readinessConfig.thresholds, falling back
 * to DEFAULT_SCORE_THRESHOLDS for any metric that hasn't been customized yet. */
export function buildAthleteReadiness(store, athleteId, metricKeys) {
  const perMetric = metricKeys.map((metricKey) => {
    const metric = METRICS.find((m) => m.key === metricKey)
    const series = buildAthleteMetricSeries(store, athleteId, metricKey)
    const withValue = series.filter((p) => p.value != null)
    const latest = withValue[withValue.length - 1] ?? null
    const baseline = withValue.length > 1 ? rollingAvg(withValue.slice(0, -1).map((p) => p.value), 5) : null
    const thresholds = store.readinessConfig?.thresholds?.[metricKey] ?? DEFAULT_SCORE_THRESHOLDS
    const score = latest ? scoreMetricValue(latest.value, baseline, metric?.higherIsBetter ?? true, thresholds) : null
    return {
      metricKey,
      label: metric?.label ?? metricKey,
      unit: metric?.unit ?? '',
      latestValue: latest?.value ?? null,
      score,
      band: bandForScore(score),
    }
  })

  const scored = perMetric.filter((m) => m.score != null)
  const overallScore = scored.length
    ? Math.round(scored.reduce((a, m) => a + m.score, 0) / scored.length)
    : null

  return { perMetric, overallScore, overallBand: bandForScore(overallScore) }
}

/** Builds a team-wide readiness grid: one row per athlete. */
export function buildTeamReadiness(store, teamId, metricKeys) {
  return getTeamAthletes(store, teamId).map((athlete) => ({
    athlete,
    readiness: buildAthleteReadiness(store, athlete.id, metricKeys),
  }))
}
