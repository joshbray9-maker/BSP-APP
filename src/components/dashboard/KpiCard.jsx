export default function KpiCard({ label, unit, average, athleteCount }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-3 sm:p-4 min-w-0">
      <div className="text-muted text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-semibold text-text">
        {average != null ? average : '—'}
        {average != null && unit ? <span className="text-sm text-muted ml-1">{unit}</span> : null}
      </div>
      <div className="text-xs text-muted mt-1">team average · {athleteCount} athletes</div>
    </div>
  )
}
