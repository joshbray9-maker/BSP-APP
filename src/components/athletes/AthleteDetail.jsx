import { useEffect, useState } from 'react'
import { CATEGORIES } from '../../lib/metrics.js'
import {
  buildAthleteMetricSeries,
  buildAthleteVsTeamTrend,
  buildAthleteRadarData,
  getMetricsWithAthleteData,
} from '../../lib/selectors.js'
import { RANGE_OPTIONS, sliceByRange } from '../../lib/chartRange.js'
import { useStore } from '../../lib/store.js'
import MetricChart from '../dashboard/MetricChart.jsx'
import AthleteRadarChart from './AthleteRadarChart.jsx'
import { exportAthletePdf } from '../../lib/reports/pdfExport.js'
import { exportAthleteCsv } from '../../lib/reports/csvExport.js'

export default function AthleteDetail({ athlete, team, org, onBack }) {
  const store = useStore()
  // Every test this athlete has at least one recorded result for — the toggleable universe for
  // the "Tests shown" picker below. Defaults to all of them selected (one-stop view of
  // everything tested), with the picker letting the coach narrow it down per Josh's request to
  // control what shows up on the radar and which trend charts render, without losing anything.
  const availableMetrics = getMetricsWithAthleteData(store, athlete.id)
  const [selectedKeys, setSelectedKeys] = useState(() => availableMetrics.map((m) => m.key))

  // Reset the selection to "everything" whenever the athlete changes (e.g. switching via the
  // Player Profiles dropdown) — a prior athlete's narrowed-down selection shouldn't carry over
  // and silently hide tests on someone new.
  useEffect(() => {
    setSelectedKeys(getMetricsWithAthleteData(store, athlete.id).map((m) => m.key))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athlete.id])

  const selectedMetrics = availableMetrics.filter((m) => selectedKeys.includes(m.key))
  const categorizedAvailable = Object.keys(CATEGORIES)
    .map((catKey) => ({
      key: catKey,
      label: CATEGORIES[catKey],
      metrics: availableMetrics.filter((m) => m.category === catKey),
    }))
    .filter((cat) => cat.metrics.length > 0)

  function toggleMetric(key) {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const [rangeKey, setRangeKey] = useState('full')
  const [exportingPdf, setExportingPdf] = useState(false)

  async function handleExportPdf() {
    setExportingPdf(true)
    try {
      await exportAthletePdf({ org, team, athlete, store, metricKeys: selectedKeys })
    } finally {
      setExportingPdf(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {onBack && (
            <button onClick={onBack} className="text-xs text-muted hover:text-text mb-1">
              ← Back to {team.name}
            </button>
          )}
          <h2 className="text-lg font-semibold text-text">{athlete.displayName}</h2>
          <p className="text-sm text-muted">
            {athlete.position} · {team.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="bg-accent text-accentFg text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {exportingPdf ? 'Generating…' : 'Export PDF'}
          </button>
          <button
            onClick={() => exportAthleteCsv({ team, athlete, store, metricKeys: selectedKeys })}
            className="text-sm border border-border rounded-md px-4 py-2 text-text hover:border-accent"
          >
            Export CSV
          </button>
        </div>
      </div>

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

      {availableMetrics.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No test data recorded for this athlete yet.</p>
      ) : (
        <>
          <div className="space-y-2">
            <span className="text-xs text-muted uppercase tracking-wide">Tests shown</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {categorizedAvailable.map((cat) => (
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

          {selectedMetrics.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">
              Select at least one test above to see charts and history.
            </p>
          ) : (
            <>
              <AthleteRadarChart
                data={buildAthleteRadarData(store, athlete.id, team.id, selectedMetrics.map((m) => m.key))}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedMetrics.map((metric) => {
                  const merged = buildAthleteVsTeamTrend(store, athlete.id, team.id, metric.key)
                  const data = sliceByRange(merged, rangeKey)
                  return (
                    <MetricChart
                      key={metric.key}
                      title={metric.label}
                      unit={metric.unit}
                      color={metric.color}
                      data={data}
                      showTeamAvg
                    />
                  )
                })}
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-wide text-muted mb-2">Session history</h3>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted border-b border-border">
                        <th className="px-3 py-2 font-medium sticky left-0 bg-bg">Date</th>
                        {selectedMetrics.map((m) => (
                          <th key={m.key} className="px-3 py-2 font-medium">
                            {m.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {buildAthleteMetricSeries(store, athlete.id, selectedMetrics[0].key).map((row, i) => (
                        <tr key={row.date} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 text-text sticky left-0 bg-bg">{row.date}</td>
                          {selectedMetrics.map((m) => {
                            const series = buildAthleteMetricSeries(store, athlete.id, m.key)
                            const point = series[i]
                            const display = point?.status === 'dnc' ? 'DNC' : point?.value ?? '—'
                            return (
                              <td key={m.key} className="px-3 py-2 text-text">
                                {display}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
