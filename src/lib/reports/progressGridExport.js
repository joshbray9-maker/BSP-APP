/**
 * Team Progress Grid export — the "20 athletes vertically orientated with tests horizontally
 * across the top, before/after/%Δ per test" layout Josh described in his 2026-08-17 notes,
 * matching report A in docs/reference/REPORT_FRAMEWORKS.md almost exactly (that reference was
 * itself a single-page PDF). This is a distinct export from the existing team PDF (which lists
 * only latest values) — this one is specifically for comparing two points in time (e.g.
 * pre-season vs. post-season), with a progression/regression indicator per cell.
 *
 * Deterministic, no AI — same as every other exporter in this folder. Uses jspdf-autotable for
 * the grid itself (hand-rolled cell positioning doesn't scale to a variable, sometimes-wide
 * number of metric columns with correct pagination).
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getMetric } from '../metrics.js'
import { buildTeamProgressGrid } from '../selectors.js'
import { resolveBrandColors } from '../theme.js'
import { formatCellValue } from './formatCell.js'

const PAGE_MARGIN = 14
const MAX_METRICS_PER_PAGE = 4 // keeps each page's columns readable at A4 width

const UP_COLOR = [22, 163, 74] // flagGreen-ish
const DOWN_COLOR = [220, 38, 38] // flagRed-ish
const FLAT_COLOR = [100, 100, 100]

function hexToRgbTuple(hex) {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.padEnd(6, '0')
  const num = parseInt(full, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function formatPct(pctChange) {
  if (pctChange == null) return 'n/a'
  const sign = pctChange > 0 ? '+' : ''
  return `${sign}${pctChange}%`
}

function directionColor(direction) {
  if (direction === 'up') return UP_COLOR
  if (direction === 'down') return DOWN_COLOR
  return FLAT_COLOR
}

export function exportTeamProgressGridPdf({
  org,
  team,
  store,
  metricKeys,
  fromDate,
  toDate,
  reportTitle,
  recipient,
}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const { primary } = resolveBrandColors({ team, org })
  const [r, g, b] = hexToRgbTuple(primary)
  const pageWidth = doc.internal.pageSize.getWidth()

  const title = reportTitle?.trim() || `${team.name} — Progress Grid`
  const subtitleParts = [org.name, team.sport, `${fromDate} → ${toDate}`, `Generated ${new Date().toLocaleDateString()}`]
  if (recipient?.trim()) subtitleParts.unshift(`For: ${recipient.trim()}`)
  const subtitle = subtitleParts.join(' · ')

  const grid = buildTeamProgressGrid(store, team.id, metricKeys, fromDate, toDate)

  // Split into pages of at most MAX_METRICS_PER_PAGE metrics each, same idea as report B in
  // docs/reference/REPORT_FRAMEWORKS.md splitting a wide table across multiple slides.
  const pages = []
  for (let i = 0; i < metricKeys.length; i += MAX_METRICS_PER_PAGE) {
    pages.push(metricKeys.slice(i, i + MAX_METRICS_PER_PAGE))
  }
  if (pages.length === 0) pages.push([])

  pages.forEach((pageMetricKeys, pageIndex) => {
    if (pageIndex > 0) doc.addPage()

    doc.setFillColor(r, g, b)
    doc.rect(0, 0, pageWidth, 4, 'F')
    doc.setFontSize(16)
    doc.setTextColor(20, 20, 20)
    doc.text(title, PAGE_MARGIN, 16)
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(subtitle, PAGE_MARGIN, 22)
    if (pages.length > 1) {
      doc.text(`Page ${pageIndex + 1} of ${pages.length}`, pageWidth - PAGE_MARGIN, 22, { align: 'right' })
    }

    const headRow1 = ['Athlete']
    const headRow2 = ['']
    for (const key of pageMetricKeys) {
      const metric = getMetric(key)
      headRow1.push({ content: metric?.label ?? key, colSpan: 3, styles: { halign: 'center' } })
      headRow1.push('', '')
      headRow2.push('Before', 'After', '%Δ')
    }

    const body = grid.map(({ athlete, cells }) => {
      const row = [athlete.displayName]
      for (const key of pageMetricKeys) {
        const cell = cells.find((c) => c.metricKey === key)
        const metric = getMetric(key)
        row.push(formatCellValue(cell?.before, cell?.beforeStatus, metric?.unit))
        row.push(formatCellValue(cell?.after, cell?.afterStatus, metric?.unit))
        row.push(formatPct(cell?.pctChange))
      }
      return row
    })

    autoTable(doc, {
      startY: 28,
      head: [headRow1, headRow2],
      body,
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN },
      styles: { fontSize: 8, cellPadding: 1.8 },
      headStyles: { fillColor: [r, g, b], textColor: 255, fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      didParseCell(data) {
        if (data.section !== 'body') return
        // Column 0 is the athlete name; each metric occupies 3 columns after that, and the
        // %Δ column is the 3rd (index 2) of each group — that's the one to color by direction.
        const col = data.column.index
        if (col === 0) return
        const withinGroup = (col - 1) % 3
        if (withinGroup !== 2) return
        const metricIdx = Math.floor((col - 1) / 3)
        const key = pageMetricKeys[metricIdx]
        const gridRow = grid[data.row.index]
        const cell = gridRow?.cells.find((c) => c.metricKey === key)
        if (cell?.direction) {
          data.cell.styles.textColor = directionColor(cell.direction)
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    doc.setFontSize(7)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Generated by Performance Hub — preliminary build. Green/red indicate improvement/decline relative to the metric\'s own direction (e.g. a faster sprint time is green), not a confirmed coaching threshold.',
      PAGE_MARGIN,
      doc.internal.pageSize.getHeight() - 8,
    )
  })

  doc.save(`${team.name.replace(/\s+/g, '-').toLowerCase()}-progress-grid.pdf`)
}
