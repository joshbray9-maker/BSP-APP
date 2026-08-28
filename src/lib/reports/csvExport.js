/**
 * Deterministic CSV export — same underlying data as the PDF/dashboard, no AI involved.
 * Long-form (one row per athlete/date/metric) rather than wide-format, so it stays generic as
 * metrics are added/removed (see src/lib/metrics.js) without changing the column shape.
 */
import { METRICS } from '../metrics.js'
import { buildAthleteMetricSeries, getTeamAthletes } from '../selectors.js'

function toCsv(rows, headers) {
  const escape = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  return lines.join('\n')
}

function downloadCsv(content, fileName) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const HEADERS = ['team', 'athlete', 'position', 'date', 'metric', 'unit', 'value']

export function exportTeamCsv({ team, store, metricKeys }) {
  const athletes = getTeamAthletes(store, team.id)
  const metrics = metricKeys?.length ? METRICS.filter((m) => metricKeys.includes(m.key)) : METRICS
  const rows = []

  for (const athlete of athletes) {
    for (const metric of metrics) {
      const series = buildAthleteMetricSeries(store, athlete.id, metric.key)
      for (const point of series) {
        if (point.value == null && point.status !== 'dnc') continue
        rows.push({
          team: team.name,
          athlete: athlete.displayName,
          position: athlete.position,
          date: point.date,
          metric: metric.label,
          unit: metric.unit,
          value: point.status === 'dnc' ? 'DNC' : point.value,
        })
      }
    }
  }

  downloadCsv(toCsv(rows, HEADERS), `${team.name.replace(/\s+/g, '-').toLowerCase()}-data.csv`)
}

export function exportAthleteCsv({ team, athlete, store, metricKeys }) {
  const metrics = metricKeys?.length ? METRICS.filter((m) => metricKeys.includes(m.key)) : METRICS
  const rows = []
  for (const metric of metrics) {
    const series = buildAthleteMetricSeries(store, athlete.id, metric.key)
    for (const point of series) {
      if (point.value == null && point.status !== 'dnc') continue
      rows.push({
        team: team.name,
        athlete: athlete.displayName,
        position: athlete.position,
        date: point.date,
        metric: metric.label,
        unit: metric.unit,
        value: point.status === 'dnc' ? 'DNC' : point.value,
      })
    }
  }

  downloadCsv(
    toCsv(rows, HEADERS),
    `${athlete.displayName.replace(/\s+/g, '-').toLowerCase()}-data.csv`,
  )
}
