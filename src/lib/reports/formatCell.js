/**
 * Shared cell-text formatting for the three checkpoint-style exports (Progress Grid, Season
 * Deck, Weekly Insight) — one place for the "how do we render a missing value" rule so all
 * three stay consistent. See src/lib/selectors.js's resolveCheckpoint() for where these
 * statuses come from, and docs/reference/REPORT_FRAMEWORKS.md's cross-cutting notes for why
 * they're kept distinct rather than one generic blank/dash.
 */
export function formatCellValue(point, status, unit) {
  if (status === 'dnc') return 'DNC'
  if (status === 'not-retested') return 'Not retested'
  if (status === 'never-tested') return '—'
  if (!point || point.value == null) return '—'
  return unit ? `${point.value} ${unit}` : `${point.value}`
}
