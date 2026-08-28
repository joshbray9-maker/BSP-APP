/**
 * Pure read-side functions over the store's data shape. Kept out of components per CLAUDE.md's
 * "domain logic lives in lib/, not components" convention.
 */
import { rollingAvg, flagForValue, DEFAULT_TIERS } from './flags.js'
import { getMetric, METRICS } from './metrics.js'

export function getTeamAthletes(store, teamId) {
  return store.athletes.filter((a) => a.teamId === teamId)
}

export function getAthleteSessions(store, athleteId) {
  return store.sessions
    .filter((s) => s.athleteId === athleteId)
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

export function getResultForSession(store, sessionId, metricKey) {
  return store.results.find((r) => r.sessionId === sessionId && r.metricKey === metricKey) ?? null
}

/** Looks up an existing value for one athlete/date/metric, regardless of source, so the bulk
 * entry grid can pre-fill cells like an editable spreadsheet rather than always starting blank.
 * Returns the string "DNC" (not a number) when the existing result is flagged did-not-complete,
 * so reopening the grid shows "DNC" back in the cell rather than a blank. */
export function getValueForAthleteDateMetric(store, athleteId, date, metricKey) {
  const session = store.sessions.find((s) => s.athleteId === athleteId && s.date === date)
  if (!session) return null
  const result = getResultForSession(store, session.id, metricKey)
  if (!result) return null
  return result.status === 'dnc' ? 'DNC' : result.value
}

/** Builds a chronological {date, value, status, flag}[] series for one athlete + metric.
 * `status` is `'dnc'` for a did-not-complete result (see docs/reference/REPORT_FRAMEWORKS.md's
 * cross-cutting notes on distinguishing DNC from a metric that was simply never tested), else
 * `null`. A DNC point always has `value: null` — it's never included in numeric aggregation
 * (charts/averages), only in tables/exports that show one cell per date. */
export function buildAthleteMetricSeries(store, athleteId, metricKey) {
  const sessions = getAthleteSessions(store, athleteId)
  const higherIsBetter = getMetric(metricKey)?.higherIsBetter ?? true
  const values = []
  const series = []

  for (const session of sessions) {
    const result = getResultForSession(store, session.id, metricKey)
    const value = result ? result.value : null
    const status = result?.status ?? null
    if (value != null) values.push(value)
    const baseline = value != null ? rollingAvg(values.slice(0, -1), 5) : null
    series.push({
      date: session.date,
      value,
      status,
      flag: value != null && baseline != null ? flagForValue(value, baseline, undefined, higherIsBetter) : null,
    })
  }

  return series
}

/** True if an athlete has ever recorded a real numeric value for this metric, anywhere in their
 * history (not scoped to any particular date) — the "never tested at all" vs. "tested, just not
 * at this checkpoint" distinction used by resolveCheckpoint() below. */
export function hasAnyRecordedValue(series) {
  return series.some((p) => p.value != null)
}

/** Builds a team-average trend line for a metric, one point per distinct session date. */
export function buildTeamMetricTrend(store, teamId, metricKey) {
  const athletes = getTeamAthletes(store, teamId)
  const byDate = new Map()

  for (const athlete of athletes) {
    const series = buildAthleteMetricSeries(store, athlete.id, metricKey)
    for (const point of series) {
      if (point.value == null) continue
      if (!byDate.has(point.date)) byDate.set(point.date, [])
      byDate.get(point.date).push(point.value)
    }
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, values]) => ({
      date,
      average: Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100,
    }))
}

/** All distinct session dates recorded for a team's roster, sorted chronologically — used to
 * populate the "From"/"To" date pickers for the team progress grid export. */
export function getTeamSessionDates(store, teamId) {
  const athleteIds = new Set(getTeamAthletes(store, teamId).map((a) => a.id))
  const dates = new Set(
    store.sessions.filter((s) => athleteIds.has(s.athleteId)).map((s) => s.date),
  )
  return Array.from(dates).sort()
}

/** Most recent recorded *event* in a metric series at or before a given date — not an exact date
 * match, since not every athlete/metric is necessarily tested on the exact labeled date (mirrors
 * how the reference report in docs/reference/REPORT_FRAMEWORKS.md shows a slightly different
 * actual date per athlete/metric under one shared nominal testing-block label). Matches a real
 * value OR a DNC entry — a did-not-complete attempt is still the most recent thing that happened
 * and should surface as "DNC," not be silently skipped in favor of an older real value. */
function valueAtOrBefore(series, date) {
  return [...series].reverse().find((p) => p.date <= date && (p.value != null || p.status === 'dnc')) ?? null
}

/**
 * Resolves what a before/after or stage-to-stage comparison point actually is, distinguishing
 * three non-numeric states rather than collapsing them all into one blank (see
 * docs/reference/REPORT_FRAMEWORKS.md's cross-cutting notes):
 * - `'dnc'` — the most recent attempt at/before this date was recorded as did-not-complete.
 * - `'not-retested'` — this athlete has real data for this metric somewhere in their history,
 *   just nothing new at/before this specific checkpoint (either their history starts later, or —
 *   when `previousPoint` is passed — the closest point found is the *same* point already used
 *   for the previous checkpoint, meaning no new test happened between the two).
 * - `'never-tested'` — this athlete has zero recorded values for this metric, ever.
 * - `'ok'` — a genuine new value/point for this checkpoint; `point` is set.
 *
 * `previousPoint` (optional) is the point resolved for the *previous* checkpoint in a chain
 * (e.g. the prior season stage) — passing it prevents a stale value from silently being reused
 * as if it were a fresh retest.
 */
export function resolveCheckpoint(series, date, previousPoint = null) {
  const point = valueAtOrBefore(series, date)
  if (!point) {
    return { point: null, status: hasAnyRecordedValue(series) ? 'not-retested' : 'never-tested' }
  }
  if (point.status === 'dnc') {
    return { point, status: 'dnc' }
  }
  if (previousPoint && point.date === previousPoint.date) {
    return { point: null, status: 'not-retested' }
  }
  return { point, status: 'ok' }
}

/** Direction-aware %Δ between two points, respecting a metric's higherIsBetter flag so a faster
 * time still reads as an improvement rather than a decline. Returns nulls if either point is
 * missing, has no numeric value (e.g. a DNC point), or has a zero baseline. */
function computeChange(fromPoint, toPoint, higherIsBetter) {
  if (!fromPoint || !toPoint || fromPoint.value == null || toPoint.value == null || fromPoint.value === 0) {
    return { pctChange: null, direction: null }
  }
  const pctChange = Math.round(((toPoint.value - fromPoint.value) / Math.abs(fromPoint.value)) * 10000) / 100
  const improved = higherIsBetter ? toPoint.value > fromPoint.value : toPoint.value < fromPoint.value
  const declined = higherIsBetter ? toPoint.value < fromPoint.value : toPoint.value > fromPoint.value
  return { pctChange, direction: improved ? 'up' : declined ? 'down' : 'flat' }
}

/**
 * Builds a roster×metric before/after grid for the given date range — the "20 athletes down
 * the side, tests across the top" layout Josh described, and the same shape as report A in
 * docs/reference/REPORT_FRAMEWORKS.md.
 */
export function buildTeamProgressGrid(store, teamId, metricKeys, fromDate, toDate) {
  const athletes = getTeamAthletes(store, teamId)
  return athletes.map((athlete) => {
    const cells = metricKeys.map((metricKey) => {
      const series = buildAthleteMetricSeries(store, athlete.id, metricKey)
      const beforeCheckpoint = resolveCheckpoint(series, fromDate)
      const afterCheckpoint = resolveCheckpoint(series, toDate, beforeCheckpoint.point)
      const higherIsBetter = getMetric(metricKey)?.higherIsBetter ?? true
      const { pctChange, direction } = computeChange(beforeCheckpoint.point, afterCheckpoint.point, higherIsBetter)
      return {
        metricKey,
        before: beforeCheckpoint.point,
        beforeStatus: beforeCheckpoint.status,
        after: afterCheckpoint.point,
        afterStatus: afterCheckpoint.status,
        pctChange,
        direction,
      }
    })
    return { athlete, cells }
  })
}

/**
 * Builds a multi-stage progression table — the generalization of buildTeamProgressGrid's 2-point
 * before/after to Josh's "pre-season, mid-season, post-season... not just 3, ideally as often as
 * needed" request. `stages` is an ordered [{date, label}] list (any length ≥ 2). Each stage after
 * the first gets a %Δ from the immediately *preceding* stage (a progression chain), matching
 * "an indicator of progression or regression... [that] would ideally update based on stage of
 * season" — each new stage's indicator is relative to the last checkpoint, not always vs. the
 * original baseline.
 */
export function buildTeamSeasonProgress(store, teamId, metricKeys, stages) {
  const athletes = getTeamAthletes(store, teamId)
  return athletes.map((athlete) => {
    // Exact-date test coverage (for the roster-status summary) is intentionally distinct from
    // the carried-forward "closest at or before" value used for display below — this count
    // should reflect genuinely-recorded stages, not values carried forward from an earlier test.
    const exactDates = new Set(
      store.sessions.filter((s) => s.athleteId === athlete.id).map((s) => s.date),
    )
    const testedStageCount = stages.filter((s) => exactDates.has(s.date)).length

    const metrics = metricKeys.map((metricKey) => {
      const series = buildAthleteMetricSeries(store, athlete.id, metricKey)
      const higherIsBetter = getMetric(metricKey)?.higherIsBetter ?? true
      const cells = []
      let lastRealPoint = null
      stages.forEach((stage, i) => {
        const checkpoint = resolveCheckpoint(series, stage.date, lastRealPoint)
        if (i === 0) {
          cells.push({ point: checkpoint.point, status: checkpoint.status, pctChange: null, direction: null })
        } else {
          const { pctChange, direction } = computeChange(lastRealPoint, checkpoint.point, higherIsBetter)
          cells.push({ point: checkpoint.point, status: checkpoint.status, pctChange, direction })
        }
        // Only a genuine new value becomes the baseline for the *next* stage's comparison — a
        // DNC or not-retested checkpoint should still compare forward against the last real
        // value, not silently reset to nothing (see resolveCheckpoint's docstring above).
        if (checkpoint.point?.value != null) lastRealPoint = checkpoint.point
      })
      return { metricKey, cells }
    })

    return { athlete, testedStageCount, metrics }
  })
}

/** Roster-level summary for the season deck's overview slide: how much of the roster has data
 * at every selected stage vs. some vs. none, and the average %Δ from the first to the last
 * stage across every athlete/metric pair that has both endpoints recorded. */
export function buildTeamSeasonSummary(store, teamId, metricKeys, stages) {
  const grid = buildTeamSeasonProgress(store, teamId, metricKeys, stages)
  const fullyTested = grid.filter((r) => r.testedStageCount === stages.length).length
  const partiallyTested = grid.filter((r) => r.testedStageCount > 0 && r.testedStageCount < stages.length).length
  const noData = grid.filter((r) => r.testedStageCount === 0).length

  let sum = 0
  let count = 0
  for (const row of grid) {
    for (const m of row.metrics) {
      const first = m.cells[0]?.point
      const last = m.cells[m.cells.length - 1]?.point
      if (!first || !last || first.value == null || last.value == null || first.value === 0) continue
      const higherIsBetter = getMetric(m.metricKey)?.higherIsBetter ?? true
      const raw = ((last.value - first.value) / Math.abs(first.value)) * 100
      sum += higherIsBetter ? raw : -raw
      count += 1
    }
  }
  const avgPctChange = count ? Math.round((sum / count) * 100) / 100 : null

  return { rosterSize: grid.length, fullyTested, partiallyTested, noData, avgPctChange }
}

/**
 * Builds a "this week vs. last time tested" snapshot for a chosen subset of a team's roster —
 * Josh's "weekly insight for each coach of their team (with the capacity to select specific
 * players (i.e injuries or trades))" request. Unlike buildTeamProgressGrid/
 * buildTeamSeasonProgress, there's no date picker here on purpose: each athlete's own latest two
 * recorded values are used directly (whatever those dates happen to be), since the point of a
 * "weekly" send is "what's new since I last checked," not a specific chosen date range.
 * `athleteIds` filters which of the team's roster to include (the "select specific players"
 * part — e.g. leaving out an athlete who was just traded away).
 */
export function buildWeeklyInsight(store, teamId, metricKeys, athleteIds) {
  const athletes = getTeamAthletes(store, teamId).filter((a) => athleteIds.includes(a.id))
  return athletes.map((athlete) => {
    const metrics = metricKeys.map((metricKey) => {
      const series = buildAthleteMetricSeries(store, athlete.id, metricKey)
      // Include DNC events, not just real values, so a did-not-complete test is still the
      // "latest" thing that happened rather than silently falling back to an older real value.
      const events = series.filter((p) => p.value != null || p.status === 'dnc')
      const latest = events[events.length - 1] ?? null
      const previous = events.length > 1 ? events[events.length - 2] : null
      const latestStatus = !latest ? 'never-tested' : latest.status === 'dnc' ? 'dnc' : 'ok'
      const higherIsBetter = getMetric(metricKey)?.higherIsBetter ?? true
      const { pctChange, direction } = computeChange(previous, latest, higherIsBetter)
      return { metricKey, latest, latestStatus, previous, pctChange, direction }
    })
    return { athlete, metrics }
  })
}

/** Most recent date among any athlete's latest recorded value in a weekly insight grid — used
 * to label the export "Week of {date}" without needing a separate date picker in the UI. */
export function latestDateInWeeklyInsight(grid) {
  let max = null
  for (const row of grid) {
    for (const m of row.metrics) {
      if (m.latest?.date && (!max || m.latest.date > max)) max = m.latest.date
    }
  }
  return max
}

/** Builds a per-team KPI for a metric: team average of each athlete's latest recorded value. */
export function buildTeamKpi(store, teamId, metricKey) {
  const athletes = getTeamAthletes(store, teamId)
  const latestValues = athletes
    .map((athlete) => {
      const series = buildAthleteMetricSeries(store, athlete.id, metricKey)
      const withValue = series.filter((p) => p.value != null)
      return withValue.length ? withValue[withValue.length - 1].value : null
    })
    .filter((v) => v != null)

  if (!latestValues.length) return { average: null, athleteCount: athletes.length }
  const average = latestValues.reduce((a, b) => a + b, 0) / latestValues.length
  return { average: Math.round(average * 100) / 100, athleteCount: athletes.length }
}

/** Merges an athlete's own metric trend with the team's average trend for the same metric, by
 * date — powers the team-average reference line on the athlete detail page's charts (report C
 * in docs/reference/REPORT_FRAMEWORKS.md shows every individual trend chart this way, not just
 * the athlete's own line in isolation). */
export function buildAthleteVsTeamTrend(store, athleteId, teamId, metricKey) {
  const athleteSeries = buildAthleteMetricSeries(store, athleteId, metricKey)
  const teamTrend = buildTeamMetricTrend(store, teamId, metricKey)
  const teamByDate = new Map(teamTrend.map((p) => [p.date, p.average]))
  return athleteSeries.map((p) => ({
    date: p.date,
    average: p.value,
    teamAvg: teamByDate.get(p.date) ?? null,
  }))
}

/**
 * Radar-chart data for one athlete: each metric's latest value expressed as % of the team
 * average for that same metric, direction-adjusted so "further out is always better" regardless
 * of whether the metric itself is higher-is-better or lower-is-better — same convention as
 * report D's web chart in docs/reference/REPORT_FRAMEWORKS.md ("5-10-5 is direction-adjusted,
 * faster = further out"). 100 always represents "exactly at the team average."
 */
export function buildAthleteRadarData(store, athleteId, teamId, metricKeys) {
  return metricKeys.map((metricKey) => {
    const metric = getMetric(metricKey)
    const series = buildAthleteMetricSeries(store, athleteId, metricKey)
    const withValue = series.filter((p) => p.value != null)
    const latest = withValue[withValue.length - 1] ?? null
    const teamAvg = buildTeamKpi(store, teamId, metricKey).average
    const higherIsBetter = metric?.higherIsBetter ?? true
    let athletePct = null
    if (latest && teamAvg) {
      athletePct = Math.round((higherIsBetter ? (latest.value / teamAvg) * 100 : (teamAvg / latest.value) * 100) * 10) / 10
    }
    return { metricKey, label: metric?.label ?? metricKey, athletePct, teamPct: 100 }
  })
}

/** Every metric this one athlete has at least one recorded real value for, in the full battery's
 * defined order — used anywhere "show everything this athlete has actually been tested on"
 * matters more than the curated dashboard-default subset (see getActiveMetrics in metrics.js),
 * e.g. the roster-wide player profile exports. */
export function getMetricsWithAthleteData(store, athleteId) {
  return METRICS.filter((metric) =>
    buildAthleteMetricSeries(store, athleteId, metric.key).some((p) => p.value != null),
  )
}

/** Every metric any athlete on this team has at least one recorded real value for — the
 * dashboard's "show all testing metrics with trendlines" request, rather than only the small
 * curated defaultOn subset. Falls back to an empty list (caller decides the fallback) for a
 * brand-new team with no data at all yet. */
export function getMetricsWithTeamData(store, teamId) {
  const athletes = getTeamAthletes(store, teamId)
  const keys = new Set()
  for (const athlete of athletes) {
    for (const metric of getMetricsWithAthleteData(store, athlete.id)) keys.add(metric.key)
  }
  return METRICS.filter((m) => keys.has(m.key))
}

/**
 * Every athlete/metric across an entire organization (all of its teams) whose most recent
 * recorded value happens to fall on today's date and lands in the "red" flag tier — the
 * dashboard's "alert anyone in the org who flags red for the day" request. Uses the same
 * rolling-baseline flag already computed per point in buildAthleteMetricSeries (see
 * src/lib/flags.js) rather than a separate flagging system, so it stays consistent with the
 * flag dots already shown elsewhere. "Red" = the first (most severe) tier in DEFAULT_TIERS —
 * matched by color rather than by label, in case the placeholder tier labels change later.
 */
export function buildTodaysRedFlags(store, orgId) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const redColor = DEFAULT_TIERS[0].color
  const teams = store.teams.filter((t) => t.orgId === orgId)
  const flags = []
  for (const team of teams) {
    for (const athlete of getTeamAthletes(store, team.id)) {
      for (const metric of METRICS) {
        const series = buildAthleteMetricSeries(store, athlete.id, metric.key)
        const todayPoint = series.find((p) => p.date === todayStr)
        if (todayPoint?.flag?.color === redColor) {
          flags.push({ athlete, team, metric, value: todayPoint.value, flag: todayPoint.flag })
        }
      }
    }
  }
  return flags
}
