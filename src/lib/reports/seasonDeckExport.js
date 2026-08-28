/**
 * Season Progress Deck — the "pre-season, mid-season, post-season... not just 3, ideally as
 * often as needed" slide-deck export from Josh's 2026-08-17 notes: "a list of the players on
 * the team with each of their respective test scores with an indicator of progression or
 * regression, which would ideally update based on stage of season."
 *
 * Structurally mirrors report B in docs/reference/REPORT_FRAMEWORKS.md: a title slide, a
 * roster-status overview slide, then detail table slides split by metric *category* (this app's
 * own ForceDecks/Speed/COD/Conditioning/Grip/Strength taxonomy from src/lib/metrics.js stands in
 * for that reference deck's ad-hoc "Jump Testing / RSImod / Agility & Deadhang" groupings — same
 * idea, driven by config instead of invented per-export). At most 2 metrics per detail slide,
 * matching that same reference deck's own precedent, so a table with several stage columns per
 * metric stays legible instead of overflowing the slide.
 *
 * Deterministic, no AI — same as every other exporter in this folder.
 */
import PptxGenJS from 'pptxgenjs'
import { getMetric, CATEGORIES } from '../metrics.js'
import { buildTeamSeasonProgress, buildTeamSeasonSummary } from '../selectors.js'
import { resolveBrandColors } from '../theme.js'
import { formatCellValue } from './formatCell.js'

const MAX_METRICS_PER_SLIDE = 2

const UP_COLOR = '16A34A'
const DOWN_COLOR = 'DC2626'
const FLAT_COLOR = '9CA3AF'
const TEXT_COLOR = 'E8EAF0'
const MUTED_COLOR = 'A0A4B8'
const SURFACE_COLOR = '1A1D26'
const BORDER_COLOR = '252836'

function hexNoHash(hex) {
  return hex.replace('#', '')
}

function directionColor(direction) {
  if (direction === 'up') return UP_COLOR
  if (direction === 'down') return DOWN_COLOR
  return FLAT_COLOR
}

function formatPct(pctChange) {
  if (pctChange == null) return 'n/a'
  const sign = pctChange > 0 ? '+' : ''
  return `${sign}${pctChange}%`
}

function addSlideBase(pptx, title) {
  const slide = pptx.addSlide()
  slide.background = { color: '0a0c10' }
  slide.addText(title, { x: 0.5, y: 0.35, fontSize: 20, bold: true, color: 'FFFFFF' })
  return slide
}

function buildDetailTable(grid, metricKeys, stages) {
  const headRow1 = [{ text: 'Athlete', options: { rowspan: 2, color: TEXT_COLOR, bold: true, fill: { color: SURFACE_COLOR } } }]
  const headRow2 = []
  for (const key of metricKeys) {
    const metric = getMetric(key)
    const span = 1 + 2 * (stages.length - 1)
    headRow1.push({
      text: `${metric?.label ?? key}${metric?.unit ? ` (${metric.unit})` : ''}`,
      options: { colspan: span, align: 'center', color: TEXT_COLOR, bold: true, fill: { color: SURFACE_COLOR } },
    })
    stages.forEach((stage, i) => {
      headRow2.push({ text: stage.label, options: { color: MUTED_COLOR, fill: { color: SURFACE_COLOR }, fontSize: 9 } })
      if (i > 0) headRow2.push({ text: '%Δ', options: { color: MUTED_COLOR, fill: { color: SURFACE_COLOR }, fontSize: 9 } })
    })
  }

  const body = grid.map(({ athlete, metrics }) => {
    const row = [{ text: athlete.displayName, options: { color: TEXT_COLOR, fill: { color: '111318' } } }]
    for (const key of metricKeys) {
      const metric = getMetric(key)
      const m = metrics.find((x) => x.metricKey === key)
      m.cells.forEach((cell, i) => {
        row.push({ text: formatCellValue(cell.point, cell.status, metric?.unit), options: { color: TEXT_COLOR, fill: { color: '111318' }, fontSize: 9 } })
        if (i > 0) {
          row.push({
            text: formatPct(cell.pctChange),
            options: { color: cell.direction ? directionColor(cell.direction) : MUTED_COLOR, bold: !!cell.direction, fill: { color: '111318' }, fontSize: 9 },
          })
        }
      })
    }
    return row
  })

  return { rows: [headRow1, headRow2, ...body] }
}

export function exportTeamSeasonDeck({ org, team, store, metricKeys, stages, reportTitle, recipient }) {
  const { primary } = resolveBrandColors({ team, org })
  const pptx = new PptxGenJS()
  pptx.defineLayout({ name: 'A4_16x9', width: 10, height: 5.63 })
  pptx.layout = 'A4_16x9'

  // Title slide
  const title = pptx.addSlide()
  title.background = { color: '0a0c10' }
  title.addShape('rect', { x: 0, y: 0, w: 10, h: 0.15, fill: { color: hexNoHash(primary) } })
  title.addText(reportTitle?.trim() || `${team.name} — Season Progress`, {
    x: 0.5, y: 1.8, w: 9, h: 1, fontSize: 30, bold: true, color: 'FFFFFF',
  })
  const stageSummary = stages.map((s) => `${s.label} (${s.date})`).join('  →  ')
  const subtitleParts = [org.name, team.sport, new Date().toLocaleDateString()]
  if (recipient?.trim()) subtitleParts.unshift(`For: ${recipient.trim()}`)
  title.addText(subtitleParts.join(' · '), { x: 0.5, y: 2.7, w: 9, h: 0.4, fontSize: 13, color: 'A0A4B8' })
  title.addText(stageSummary, { x: 0.5, y: 3.15, w: 9, h: 0.4, fontSize: 11, color: hexNoHash(primary) })

  // Overview slide
  const summary = buildTeamSeasonSummary(store, team.id, metricKeys, stages)
  const overview = addSlideBase(pptx, 'Team Overview')
  const statRows = [
    ['Roster Size', String(summary.rosterSize)],
    [`Tested at all ${stages.length} stages`, String(summary.fullyTested)],
    ['Tested at some stages', String(summary.partiallyTested)],
    ['No data on file', String(summary.noData)],
    [`Avg % Change (${stages[0].label} → ${stages[stages.length - 1].label})`, summary.avgPctChange != null ? `${summary.avgPctChange > 0 ? '+' : ''}${summary.avgPctChange}%` : 'n/a'],
  ]
  overview.addTable(statRows, {
    x: 0.5, y: 1.1, w: 6, fontSize: 13, color: TEXT_COLOR,
    border: { type: 'solid', color: BORDER_COLOR, pt: 1 },
    fill: { color: SURFACE_COLOR },
    autoPage: false,
  })
  overview.addText(
    'Stages included:\n' + stages.map((s) => `${s.label} — ${s.date}`).join('\n'),
    { x: 7, y: 1.1, w: 2.5, h: 2.5, fontSize: 11, color: MUTED_COLOR, valign: 'top' },
  )

  // Detail slides, grouped by category (this app's own metric taxonomy), 2 metrics per slide.
  const grid = buildTeamSeasonProgress(store, team.id, metricKeys, stages)
  for (const categoryKey of Object.keys(CATEGORIES)) {
    const keysInCategory = metricKeys.filter((k) => getMetric(k)?.category === categoryKey)
    if (keysInCategory.length === 0) continue
    for (let i = 0; i < keysInCategory.length; i += MAX_METRICS_PER_SLIDE) {
      const chunk = keysInCategory.slice(i, i + MAX_METRICS_PER_SLIDE)
      const slide = addSlideBase(pptx, `${team.name} — ${CATEGORIES[categoryKey]}`)
      const { rows } = buildDetailTable(grid, chunk, stages)
      slide.addTable(rows, {
        x: 0.4, y: 1.0, w: 9.2, fontSize: 9,
        border: { type: 'solid', color: BORDER_COLOR, pt: 1 },
        autoPage: false,
      })
    }
  }

  const last = pptx.addSlide()
  last.background = { color: '111318' }
  last.addText(
    'Generated by Performance Hub — preliminary build. Green/red indicate improvement/decline ' +
      "relative to each metric's own direction (e.g. a faster sprint time is green) and are " +
      'compared to the immediately preceding stage, not a fixed baseline — not confirmed ' +
      'coaching thresholds.',
    { x: 0.5, y: 2.3, w: 9, fontSize: 12, color: MUTED_COLOR, align: 'center' },
  )

  pptx.writeFile({ fileName: `${team.name.replace(/\s+/g, '-').toLowerCase()}-season-progress.pptx` })
}
