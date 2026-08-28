import { useEffect, useState } from 'react'
import { getActiveMetrics, CATEGORIES } from '../../lib/metrics.js'
import {
  buildTeamKpi,
  buildTeamMetricTrend,
  getTeamAthletes,
  buildAthleteMetricSeries,
  getMetricsWithTeamData,
  buildTodaysRedFlags,
} from '../../lib/selectors.js'
import { RANGE_OPTIONS, sliceByRange } from '../../lib/chartRange.js'
import { useStore } from '../../lib/store.js'
import BrandBadge from '../BrandBadge.jsx'
import KpiCard from './KpiCard.jsx'
import MetricChart from './MetricChart.jsx'

export default function TeamDashboard({ team, org, onSelectAthlete }) {
  const store = useStore()
  const athletes = getTeamAthletes(store, team.id)
  // Show every metric this team actually has data for (not just the small curated default
  // set) per Josh's request — "I want all testing metrics to pop up with trendlines." Falls
  // back to the curated defaults only when a team has no recorded data at all yet, so a
  // brand-new team's dashboard isn't completely blank.
  const metricsWithData = getMetricsWithTeamData(store, team.id)
  const dashboardMetrics = metricsWithData.length ? metricsWithData : getActiveMetrics()

  // "Tests shown" picker — same pattern as the individual athlete page's toggle. Defaults to
  // every metric this team has data for (one-stop view), coach can narrow it down from there.
  const [selectedKeys, setSelectedKeys] = useState(() => dashboardMetrics.map((m) => m.key))

  // Reset to "everything" whenever the team changes — a previous team's narrowed selection
  // shouldn't silently carry over and hide tests on a different roster.
  useEffect(() => {
    const metrics = getMetricsWithTeamData(store, team.id)
    const fallback = metrics.length ? metrics : getActiveMetrics()
    setSelectedKeys(fallback.map((m) => m.key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id])

  function toggleMetric(key) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const visibleMetrics = dashboardMetrics.filter((m) => selectedKeys.includes(m.key))

  // Grouped by category (ForceDecks/Speed/COD/Conditioning/Grip/Strength) rather than one flat
  // grid — per Josh's request to keep every test this team actually does on the dashboard as
  // "one stop everything," which only stays legible as the tested battery grows if it's
  // organized by test family instead of a wall of undifferentiated cards.
  const categorize = (metrics) =>
    Object.keys(CATEGORIES)
      .map((catKey) => ({
        key: catKey,
        label: CATEGORIES[catKey],
        metrics: metrics.filter((m) => m.category === catKey),
      }))
      .filter((cat) => cat.metrics.length > 0)
  const availableCategorized = categorize(dashboardMetrics)
  const categorizedMetrics = categorize(visibleMetrics)

  const [rangeKey, setRangeKey] = useState('full')
  const todaysRedFlags = buildTodaysRedFlags(store, org.id)

  return (
    <div className="space-y-6">
      {/*
        Branded hero — deliberately more visually "owned" by the org than the rest of the
        (still dark-themed) dashboard: a bigger logo and a tinted wash using the org/team's
        actual color via the --accent/--accent-soft CSS vars theme.js sets on selection, so it
        re-themes automatically with no per-org code. See src/lib/theme.js.
      */}
      <div
        className="rounded-xl border p-4 sm:p-5 flex items-center gap-4"
        style={{
          borderColor: 'var(--accent)',
          background: 'linear-gradient(135deg, var(--accent-soft), transparent 75%)',
        }}
      >
        <BrandBadge team={team} org={org} size="lg" />
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-text truncate">{team.name}</h2>
          <p className="text-sm text-muted truncate">
            {org.name} · {team.sport}
          </p>
        </div>
      </div>

      {todaysRedFlags.length > 0 ? (
        <div className="rounded-lg border border-flagRed bg-flagRed/10 p-4">
          <div className="flex items-center gap-2 text-flagRed font-semibold text-sm mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-flagRed flex-shrink-0" />
            {todaysRedFlags.length} red flag{todaysRedFlags.length === 1 ? '' : 's'} today across{' '}
            {org.name}
          </div>
          <ul className="text-sm text-text space-y-1">
            {todaysRedFlags.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.athlete.displayName}</span>{' '}
                <span className="text-muted">({f.team.name})</span> — {f.metric.label}: {f.value}{' '}
                {f.metric.unit}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-3 text-xs text-muted">
          No red flags today across {org.name}.
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wide">Chart range</span>
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setRangeKey(opt.key)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                rangeKey === opt.key ? 'bg-accent text-accentFg font-medium' : 'text-muted border border-border hover:text-text'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs text-muted uppercase tracking-wide">Tests shown</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {availableCategorized.map((cat) => (
            <div key={cat.key} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted">{cat.label}:</span>
              {cat.metrics.map((metric) => {
                const active = selectedKeys.includes(metric.key)
                return (
                  <button
                    key={metric.key}
                    onClick={() => toggleMetric(metric.key)}
                    className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                      active
                        ? 'bg-accent text-accentFg font-medium'
                        : 'text-muted border border-border hover:text-text'
                    }`}
                  >
                    {metric.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {visibleMetrics.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">
          Select at least one test above to see KPI cards and trend charts.
        </p>
      ) : (
        categorizedMetrics.map((cat) => (
          <div key={cat.key} className="space-y-3">
            <h3 className="text-sm uppercase tracking-wide text-muted border-b border-border pb-1.5">
              {cat.label}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {cat.metrics.map((metric) => {
                const kpi = buildTeamKpi(store, team.id, metric.key)
                return (
                  <KpiCard
                    key={metric.key}
                    label={metric.label}
                    unit={metric.unit}
                    average={kpi.average}
                    athleteCount={kpi.athleteCount}
                  />
                )
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {cat.metrics.map((metric) => {
                const trend = buildTeamMetricTrend(store, team.id, metric.key)
                const sliced = sliceByRange(trend, rangeKey)
                return (
                  <MetricChart
                    key={metric.key}
                    title={`${metric.label} — team trend`}
                    unit={metric.unit}
                    color={metric.color}
                    data={sliced}
                  />
                )
              })}
            </div>
          </div>
        ))
      )}

      <div>
        <h3 className="text-sm uppercase tracking-wide text-muted mb-2">Roster</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {athletes.map((athlete) => {
            const primaryMetric = dashboardMetrics[0]
            const series = buildAthleteMetricSeries(store, athlete.id, primaryMetric.key)
            const latest = [...series].reverse().find((p) => p.value != null || p.status === 'dnc')
            const flagColor = latest?.flag?.color ?? '#71717a'
            const latestDisplay = latest?.status === 'dnc' ? 'DNC' : latest != null ? `${latest.value ?? '—'} ${primaryMetric.unit}` : '—'
            return (
              <button
                key={athlete.id}
                onClick={() => onSelectAthlete(athlete)}
                className="text-left bg-surface border border-border rounded-lg p-3 hover:border-accent transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text">{athlete.displayName}</span>
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: flagColor }}
                    title={latest?.flag?.label ?? 'No baseline yet'}
                  />
                </div>
                <div className="text-xs text-muted mt-1">{athlete.position}</div>
                <div className="text-xs text-muted mt-1">
                  {primaryMetric.label}: {latestDisplay}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
