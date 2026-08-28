/**
 * Metric definitions as config data — see CLAUDE.md: "adding or changing a displayed metric
 * should be a config edit, not a new component." This is the reference project's most reusable
 * pattern, and directly serves Josh's request to "swap in and out different ones, as I won't
 * test all, but will test all at some point with any one group" (client notes, 2026-08-17).
 *
 * This is now the FULL test battery Josh listed, grouped by category exactly as he wrote it.
 * `defaultOn` controls which metrics show on the team/athlete dashboards and standard exports
 * by default (see `getActiveMetrics()`) — kept to the small set Josh named as already in
 * regular use, so the dashboard doesn't turn into 30 mostly-empty charts for a team that hasn't
 * tested most of this battery yet. Every metric is still available everywhere a metric picker
 * exists (manual entry, readiness config) — `defaultOn: false` means "not shown by default,"
 * not "unavailable." Values/units/exact test names are Josh's own, not invented — see
 * `docs/reference/REPORT_FRAMEWORKS.md` and `Josh Bray Client Notes 8-17-2026.md`.
 *
 * `higherIsBetter` matters for flagging/readiness direction (src/lib/flags.js,
 * src/lib/readiness.js) — most force/height/power/strength/time-held metrics are "more is
 * better," but every timed sprint/agility/conditioning-time metric is "less is better." Getting
 * this wrong would flag a faster sprint as a decline, so it's set explicitly per metric rather
 * than assumed. This mirrors report D in the reference framework doc, which already handles the
 * 5-10-5 this same way ("direction-adjusted, faster = further out").
 */

export const CATEGORIES = {
  forcedecks: 'ForceDecks',
  speed: 'Speed',
  cod: 'Change of Direction',
  conditioning: 'Conditioning',
  grip: 'Grip',
  strength: 'Strength',
}

export const METRICS = [
  // --- ForceDecks --------------------------------------------------------
  {
    key: 'cmj_height_cm',
    label: 'CMJ Jump Height',
    unit: 'cm',
    color: '#f97316',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: true,
  },
  {
    key: 'sj_height_cm',
    label: 'SJ (Squat Jump) Height',
    unit: 'cm',
    color: '#fb923c',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'abalakov_height_cm',
    label: 'Abalakov Jump Height',
    unit: 'cm',
    color: '#fdba74',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'jump_height_im_cm',
    label: 'Jump Height (Impulse-Momentum)',
    unit: 'cm',
    color: '#fcd34d',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'rsi_modified',
    label: 'RSI Mod',
    unit: '',
    color: '#60a5fa',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: true,
  },
  {
    key: 'cm_depth_cm',
    // "Better" direction for countermovement depth is genuinely context-dependent in real
    // sport science (not simply "more"), unlike the other metrics here — higherIsBetter: true
    // is a simplifying placeholder for the flag/readiness display, not a coaching claim. See
    // CLAUDE.md's rule against inventing sport-science thresholds.
    label: 'Countermovement Depth',
    unit: 'cm',
    color: '#38bdf8',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: true,
  },
  {
    key: 'ecc_braking_force_n',
    label: 'Eccentric Braking Force',
    unit: 'N',
    color: '#22d3ee',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'braking_duration_ms',
    label: 'Braking Duration',
    unit: 'ms',
    color: '#2dd4bf',
    category: 'forcedecks',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'time_to_peak_force_ms',
    label: 'Time to Peak Force',
    unit: 'ms',
    color: '#34d399',
    category: 'forcedecks',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'rel_propulsive_power_w_kg',
    label: 'Relative Propulsive Power',
    unit: 'W/kg',
    color: '#4ade80',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'rel_peak_force_n_kg',
    label: 'Relative Peak Force',
    unit: 'N/kg',
    color: '#a3e635',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'concentric_mean_power_w',
    label: 'Concentric Mean Power',
    unit: 'W',
    color: '#facc15',
    category: 'forcedecks',
    higherIsBetter: true,
    defaultOn: false,
  },

  // --- Speed ---------------------------------------------------------------
  {
    key: 'sprint_5m_s',
    label: '5m Acceleration',
    unit: 's',
    color: '#c084fc',
    category: 'speed',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'sprint_1_5m_s',
    label: '1+5m Acceleration',
    unit: 's',
    color: '#d8b4fe',
    category: 'speed',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'sprint_10_10fly_s',
    label: '10+10 Fly',
    unit: 's',
    color: '#e9d5ff',
    category: 'speed',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'sprint_20m_s',
    label: '20m Sprint',
    unit: 's',
    color: '#f0abfc',
    category: 'speed',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'sprint_30m_s',
    label: '30m Sprint',
    unit: 's',
    color: '#f5d0fe',
    category: 'speed',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'sprint_40m_s',
    label: '40m Sprint',
    unit: 's',
    color: '#e879f9',
    category: 'speed',
    higherIsBetter: false,
    defaultOn: false,
  },

  // --- Change of Direction ---------------------------------------------------------
  {
    key: 'pro_agility_5_10_5_s',
    label: '5-10-5 Pro Agility',
    unit: 's',
    color: '#fb7185',
    category: 'cod',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'on_ice_agility_s',
    label: 'On-Ice Agility Test',
    unit: 's',
    color: '#f472b6',
    category: 'cod',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'on_ice_speed_s',
    label: 'On-Ice Speed Test',
    unit: 's',
    color: '#f9a8d4',
    category: 'cod',
    higherIsBetter: false,
    defaultOn: false,
  },

  // --- Conditioning ---------------------------------------------------------
  {
    key: 'cooper_12min_m',
    label: 'Cooper 12-Minute Test',
    unit: 'm',
    color: '#fb923c',
    category: 'conditioning',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'bronco_s',
    label: 'Bronco Test',
    unit: 's',
    color: '#f97316',
    category: 'conditioning',
    higherIsBetter: false,
    defaultOn: false,
  },
  {
    key: 'on_ice_conditioning_s',
    label: 'On-Ice Conditioning Test',
    unit: 's',
    color: '#ea580c',
    category: 'conditioning',
    higherIsBetter: false,
    defaultOn: false,
  },

  // --- Grip ---------------------------------------------------------
  {
    key: 'grip_dynamometer_kg',
    label: 'Grip Strength (Dynamometer)',
    unit: 'kg',
    color: '#2dd4bf',
    category: 'grip',
    higherIsBetter: true,
    defaultOn: true,
  },
  {
    key: 'deadhang_s',
    label: 'Deadhang',
    unit: 's',
    color: '#5eead4',
    category: 'grip',
    higherIsBetter: true,
    defaultOn: false,
  },

  // --- Strength ---------------------------------------------------------
  {
    key: 'imtp_n',
    label: 'IMTP (Peak Force)',
    unit: 'N',
    color: '#818cf8',
    category: 'strength',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'trapbar_3rm_kg',
    label: '3RM Trap Bar',
    unit: 'kg',
    color: '#a5b4fc',
    category: 'strength',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'bench_3rm_kg',
    label: '3RM Bench Press',
    unit: 'kg',
    color: '#93c5fd',
    category: 'strength',
    higherIsBetter: true,
    defaultOn: false,
  },
  {
    key: 'chinup_3rm_kg',
    label: '3RM Chin-Up',
    unit: 'kg',
    color: '#67e8f9',
    category: 'strength',
    higherIsBetter: true,
    defaultOn: false,
  },
]

export function getMetric(key) {
  return METRICS.find((m) => m.key === key) ?? null
}

/** Metrics shown by default on dashboards/standard exports — see file header. */
export function getActiveMetrics() {
  return METRICS.filter((m) => m.defaultOn)
}

export function getMetricsByCategory(category) {
  return METRICS.filter((m) => m.category === category)
}
