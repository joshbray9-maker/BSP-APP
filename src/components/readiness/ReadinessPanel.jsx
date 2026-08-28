import { Fragment, useState } from 'react'
import { METRICS, getActiveMetrics, getMetric } from '../../lib/metrics.js'
import { buildAthleteReadiness, buildTeamReadiness, DEFAULT_SCORE_THRESHOLDS } from '../../lib/readiness.js'
import { useStore } from '../../lib/store.js'
import RoleGate, { ROLES } from '../RoleGate.jsx'

function StoplightDot({ band, size = 'md' }) {
  const dim = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'
  return (
    <span
      className={`inline-block rounded-full ${dim}`}
      style={{ backgroundColor: band?.color ?? '#3f4354' }}
      title={band?.label ?? 'Not enough history'}
    />
  )
}

export default function ReadinessPanel({ team, role }) {
  const store = useStore()
  const selectedMetricKeys = store.readinessConfig?.selectedMetricKeys ?? getActiveMetrics().map((m) => m.key)
  const [expandedAthleteId, setExpandedAthleteId] = useState(null)

  function toggleMetric(key) {
    const next = selectedMetricKeys.includes(key)
      ? selectedMetricKeys.filter((k) => k !== key)
      : [...selectedMetricKeys, key]
    store.setReadinessMetrics(next)
  }

  const teamReadiness = buildTeamReadiness(store, team.id, selectedMetricKeys)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text mb-1">Weekly Readiness — {team.name}</h2>
        <p className="text-sm text-muted max-w-2xl">
          Framework preview. Scoring shown here uses a PLACEHOLDER formula (value vs. this
          athlete's own rolling baseline) — not confirmed readiness definitions. Once you send
          sample data, the scoring rule per metric gets replaced without changing this layout.
          See <code>docs/OPEN_QUESTIONS.md</code>.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="text-sm font-medium text-text mb-2">Metrics included in readiness</div>
        <div className="flex flex-wrap gap-3">
          {METRICS.map((metric) => (
            <label key={metric.key} className="flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={selectedMetricKeys.includes(metric.key)}
                onChange={() => toggleMetric(metric.key)}
                className="accent-accent"
              />
              {metric.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted mt-2">
          Any collected metric can be toggled in or out — this list should grow as you add more
          data sources.
        </p>
      </div>

      <RoleGate role={role} allow={[ROLES.ADMIN]}>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-sm font-medium text-text mb-1">Scoring thresholds</div>
          <p className="text-xs text-muted mb-3 max-w-2xl">
            Set what counts as a 5, 4, 3, or 2 for each metric — as a % of the athlete's own
            rolling baseline (anything below the "2" cutoff scores a 1). Defaults to a generic
            starting point until you set real numbers per metric; changes apply immediately.
          </p>
          <div className="overflow-x-auto">
            <table className="text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pr-3 py-1.5 font-medium">Metric</th>
                  <th className="px-2 py-1.5 font-medium">
                    Score 5 ≥<span className="block font-normal normal-case text-[10px]">% of baseline</span>
                  </th>
                  <th className="px-2 py-1.5 font-medium">
                    Score 4 ≥<span className="block font-normal normal-case text-[10px]">% of baseline</span>
                  </th>
                  <th className="px-2 py-1.5 font-medium">
                    Score 3 ≥<span className="block font-normal normal-case text-[10px]">% of baseline</span>
                  </th>
                  <th className="px-2 py-1.5 font-medium">
                    Score 2 ≥<span className="block font-normal normal-case text-[10px]">% of baseline</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedMetricKeys.map((key) => (
                  <ThresholdRow key={key} metricKey={key} store={store} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </RoleGate>

      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="px-3 py-2 font-medium sticky left-0 bg-bg">Athlete</th>
              <th className="px-3 py-2 font-medium">Overall</th>
              {selectedMetricKeys.map((key) => {
                const metric = METRICS.find((m) => m.key === key)
                return (
                  <th key={key} className="px-3 py-2 font-medium whitespace-nowrap">
                    {metric?.label ?? key}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {teamReadiness.map(({ athlete, readiness }) => (
              <Fragment key={athlete.id}>
                <tr
                  onClick={() => setExpandedAthleteId((id) => (id === athlete.id ? null : athlete.id))}
                  className="border-b border-border last:border-0 cursor-pointer hover:bg-surface2"
                >
                  <td className="px-3 py-2 text-text sticky left-0 bg-bg">{athlete.displayName}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <StoplightDot band={readiness.overallBand} />
                      <span className="text-text">{readiness.overallScore ?? '—'}/5</span>
                    </div>
                  </td>
                  {readiness.perMetric.map((m) => (
                    <td key={m.metricKey} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <StoplightDot band={m.band} size="sm" />
                        <span className="text-muted">{m.score ?? '—'}</span>
                      </div>
                    </td>
                  ))}
                </tr>
                {expandedAthleteId === athlete.id && (
                  <tr className="bg-surface2/50 border-b border-border">
                    <td colSpan={2 + selectedMetricKeys.length} className="px-3 py-3">
                      <IndividualReadiness athlete={athlete} metricKeys={selectedMetricKeys} store={store} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ThresholdRow({ metricKey, store }) {
  const metric = getMetric(metricKey)
  const thresholds = store.readinessConfig?.thresholds?.[metricKey] ?? DEFAULT_SCORE_THRESHOLDS

  function update(level, rawValue) {
    const num = Number(rawValue)
    if (!Number.isFinite(num)) return
    store.setReadinessThreshold(metricKey, { ...thresholds, [level]: num })
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="pr-3 py-1.5 text-text whitespace-nowrap">{metric?.label ?? metricKey}</td>
      {['score5', 'score4', 'score3', 'score2'].map((level) => (
        <td key={level} className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="any"
              value={thresholds[level]}
              onChange={(e) => update(level, e.target.value)}
              className="w-14 bg-surface2 border border-border rounded-md px-2 py-1 text-text"
            />
            <span className="text-muted text-xs">%</span>
          </div>
        </td>
      ))}
    </tr>
  )
}

function IndividualReadiness({ athlete, metricKeys, store }) {
  const readiness = buildAthleteReadiness(store, athlete.id, metricKeys)
  return (
    <div>
      <div className="text-sm font-medium text-text mb-2">
        {athlete.displayName} — individual readiness breakdown
      </div>
      <div className="flex flex-wrap gap-3">
        {readiness.perMetric.map((m) => (
          <div
            key={m.metricKey}
            className="bg-surface border border-border rounded-md px-3 py-2 min-w-[140px]"
          >
            <div className="flex items-center gap-2 mb-1">
              <StoplightDot band={m.band} />
              <span className="text-xs text-muted">{m.label}</span>
            </div>
            <div className="text-text font-medium">
              {m.score ?? '—'}/5
              <span className="text-xs text-muted ml-2">
                ({m.latestValue ?? 'n/a'} {m.unit})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
