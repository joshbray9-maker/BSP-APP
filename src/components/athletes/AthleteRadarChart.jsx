import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts'

/**
 * Athlete-vs-team-average radar — report C/D's web chart in
 * docs/reference/REPORT_FRAMEWORKS.md, adapted to this app's own metric set. Each axis is one
 * metric; the athlete's value is plotted as % of the team average for that metric
 * (direction-adjusted — see buildAthleteRadarData in src/lib/selectors.js), so 100 always means
 * "exactly at team average" regardless of whether the metric is higher- or lower-is-better. The
 * team average itself is drawn as a constant dashed ring at 100 for reference.
 *
 * `theme` — see MetricChart.jsx's matching prop; 'light' is only used for the captured
 * player-profile PDF image, never the live app. `animate` — same file's matching prop, for the
 * same reason: a screenshot taken immediately after mount would otherwise catch the radar
 * mid-animation, before its shape is actually drawn.
 */
export default function AthleteRadarChart({ data, theme = 'dark', animate = true }) {
  const light = theme === 'light'
  const hasAnyData = data.some((d) => d.athletePct != null)

  return (
    <div className={light ? 'bg-white border border-slate-200 rounded-lg p-4' : 'bg-surface border border-border rounded-lg p-4'}>
      <div className={`text-sm mb-2 ${light ? 'text-slate-500' : 'text-muted'}`}>This athlete vs. team average</div>
      {!hasAnyData ? (
        <p className={`text-sm py-8 text-center ${light ? 'text-slate-500' : 'text-muted'}`}>Not enough recorded data yet.</p>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="70%">
              <PolarGrid stroke={light ? '#e2e8f0' : 'var(--border)'} />
              <PolarAngleAxis dataKey="label" stroke={light ? '#475569' : '#8b8fa3'} fontSize={10} />
              <PolarRadiusAxis stroke={light ? '#475569' : '#8b8fa3'} fontSize={9} angle={30} />
              <Tooltip
                contentStyle={{
                  background: light ? '#ffffff' : 'var(--surface2)',
                  border: `1px solid ${light ? '#e2e8f0' : 'var(--border)'}`,
                  fontSize: 12,
                }}
                labelStyle={{ color: light ? '#111827' : '#e8eaf0' }}
                formatter={(value) => (value == null ? 'n/a' : `${value}%`)}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: light ? '#334155' : undefined }} />
              <Radar
                name="Team average"
                dataKey="teamPct"
                stroke="#9ca3af"
                strokeDasharray="4 3"
                fill="#9ca3af"
                fillOpacity={0.05}
                isAnimationActive={animate}
              />
              <Radar
                name="This athlete"
                dataKey="athletePct"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.25}
                isAnimationActive={animate}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className={`text-xs mt-2 ${light ? 'text-slate-500' : 'text-muted'}`}>
        Each axis = one metric, plotted as % of this team's average (direction-adjusted, so
        further out is always better). 100% = exactly at the team average.
      </p>
    </div>
  )
}
