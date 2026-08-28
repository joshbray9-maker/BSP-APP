import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'

/**
 * @param {{date:string, average:number, teamAvg?:number}[]} data
 * @param {boolean} [showTeamAvg] - overlays a dashed team-average reference line (see
 *   buildAthleteVsTeamTrend in src/lib/selectors.js) — used on the athlete detail page so an
 *   individual's trend is never shown in isolation, matching report C in
 *   docs/reference/REPORT_FRAMEWORKS.md.
 * @param {'dark'|'light'} [theme] - 'dark' (default) matches the live app. 'light' swaps grid/
 *   axis/tooltip/card colors for a white background — used only when this chart is captured as
 *   an image for the player-profile PDF export (see src/lib/reports/chartCapture.js), which
 *   deliberately stays light/print-friendly per Josh's request, independent of the live app's
 *   dark theme. Data colors (bars, team-average line) stay the same on both — they're already
 *   legible against either background.
 * @param {boolean} [animate] - true (default) matches the live app's mount animation. Only
 *   chartCapture.js sets this false — it screenshots the chart immediately after mounting, and
 *   Recharts' default grow-in animation means an early screenshot shows empty axes with no
 *   bars/lines at all (captured mid-animation, before anything's actually drawn).
 */
export default function MetricChart({ title, unit, data, color, showTeamAvg = false, theme = 'dark', animate = true }) {
  const light = theme === 'light'
  return (
    <div className={light ? 'bg-white border border-slate-200 rounded-lg p-4' : 'bg-surface border border-border rounded-lg p-4'}>
      <div className={`text-sm mb-2 ${light ? 'text-slate-500' : 'text-muted'}`}>
        {title} {unit ? <span>({unit})</span> : null}
      </div>
      <div className="h-[200px] md:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={light ? '#e2e8f0' : 'var(--border)'} strokeDasharray="3 3" />
            <XAxis dataKey="date" stroke={light ? '#475569' : '#8b8fa3'} fontSize={11} />
            <YAxis stroke={light ? '#475569' : '#8b8fa3'} fontSize={11} domain={['auto', 'auto']} />
            <Tooltip
              contentStyle={{
                background: light ? '#ffffff' : 'var(--surface2)',
                border: `1px solid ${light ? '#e2e8f0' : 'var(--border)'}`,
                fontSize: 12,
              }}
              labelStyle={{ color: light ? '#111827' : '#e8eaf0' }}
            />
            {showTeamAvg && <Legend wrapperStyle={{ fontSize: 11, color: light ? '#334155' : undefined }} />}
            <Bar dataKey="average" name="This athlete" fill={color} radius={[3, 3, 0, 0]} isAnimationActive={animate} />
            <Line
              type="monotone"
              dataKey="average"
              name="This athlete"
              stroke={light ? '#1f2937' : '#e8eaf0'}
              strokeWidth={1}
              dot={false}
              legendType="none"
              isAnimationActive={animate}
            />
            {showTeamAvg && (
              <Line
                type="monotone"
                dataKey="teamAvg"
                name="Team average"
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
                isAnimationActive={animate}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
