/**
 * Shared display-range options for trend charts (team dashboard + athlete detail). See the
 * comment in TeamDashboard.jsx: this only slices what's drawn, never the underlying
 * baseline/flag calculations, which always use full history.
 */
export const RANGE_OPTIONS = [
  { key: 'full', label: 'Full', count: null },
  { key: 'last4', label: 'Last 4', count: 4 },
  { key: 'last2', label: 'Last 2', count: 2 },
]

export function sliceByRange(series, rangeKey) {
  const range = RANGE_OPTIONS.find((r) => r.key === rangeKey) ?? RANGE_OPTIONS[0]
  return range.count ? series.slice(-range.count) : series
}
