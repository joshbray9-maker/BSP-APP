import { buildAthleteRadarData, buildAthleteVsTeamTrend } from '../../lib/selectors.js'
import { getMetric } from '../../lib/metrics.js'
import MetricChart from '../dashboard/MetricChart.jsx'
import AthleteRadarChart from './AthleteRadarChart.jsx'

/**
 * Off-screen-only render target — never shown in the live app. Reproduces the athlete detail
 * page's chart section (radar + every requested metric's trend-vs-team-average chart) at a
 * fixed pixel width so src/lib/reports/chartCapture.js can mount it in a hidden container,
 * let Recharts actually paint, and rasterize the result into the player-profile PDF/PPTX
 * exports — "mimic the page with the graphs" rather than a text/table summary. Session history
 * and the callout/narrative text that used to live in the PDF are deliberately not reproduced
 * here; that data still lives in the CSV export.
 *
 * `layout`:
 * - 'stacked' (default) — radar above a 2-column trend-chart grid, all full width. Suits the
 *   PDF's portrait page (exportAthletePdf/exportRosterPdf in pdfExport.js).
 * - 'landscape' — radar and trend charts side by side (radar left, trend charts in a grid to
 *   its right) so the overall captured image comes out close to a 16:9 shape instead of a tall
 *   stack, so it actually fills a landscape PPTX slide instead of leaving big empty margins
 *   above/below a centered portrait-shaped image. Used only by rosterDeckExport.js.
 */
export default function AthleteChartsSnapshot({ athlete, team, org, store, metricKeys, theme = 'dark', widthPx = 900, layout = 'stacked' }) {
  const light = theme === 'light'
  const landscape = layout === 'landscape'

  const radar = (
    <AthleteRadarChart
      data={buildAthleteRadarData(store, athlete.id, team.id, metricKeys)}
      theme={theme}
      animate={false}
    />
  )

  const trendCharts = metricKeys.map((key) => {
    const metric = getMetric(key)
    const data = buildAthleteVsTeamTrend(store, athlete.id, team.id, key)
    return (
      <MetricChart
        key={key}
        title={metric?.label ?? key}
        unit={metric?.unit}
        color={metric?.color}
        data={data}
        showTeamAvg
        theme={theme}
        animate={false}
      />
    )
  })

  return (
    <div style={{ width: widthPx }} className={light ? 'bg-white p-6' : 'bg-bg p-6'}>
      <div className="mb-4">
        <div className={`text-2xl font-bold ${light ? 'text-slate-900' : 'text-text'}`}>{athlete.displayName}</div>
        <div className={`text-sm ${light ? 'text-slate-500' : 'text-muted'}`}>
          {[athlete.position, team.name, org.name].filter(Boolean).join(' · ')}
        </div>
      </div>

      {landscape ? (
        <div className="flex gap-4 items-start">
          <div className="flex-shrink-0 w-[360px]">{radar}</div>
          <div className="grid grid-cols-2 gap-4 flex-1">{trendCharts}</div>
        </div>
      ) : (
        <>
          {radar}
          <div className="grid grid-cols-2 gap-4 mt-4">{trendCharts}</div>
        </>
      )}
    </div>
  )
}
