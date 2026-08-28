/**
 * Generic CSV/XLSX parser — works against the synthetic shape documented in
 * docs/IMPORT_SPEC.md (athlete_name, date, metric_key, value). This is intentionally NOT a
 * VALD ForceDecks parser yet — no real export sample has been provided. See docs/IMPORT_SPEC.md
 * for how to add a real source once one arrives.
 *
 * Normalization approach follows the reference project's lessons: coerce dates/numbers, keep
 * blanks as null (never zero-fill), and never silently drop a row — malformed rows are
 * returned separately so the UI can flag them.
 */
import * as XLSX from 'xlsx'

const REQUIRED_COLUMNS = ['athlete_name', 'date', 'metric_key', 'value']

function toISODate(raw) {
  if (raw == null || raw === '') return null
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  // Excel serial date number
  if (typeof raw === 'number') {
    const parsed = XLSX.SSF.parse_date_code(raw)
    if (!parsed) return null
    const mm = String(parsed.m).padStart(2, '0')
    const dd = String(parsed.d).padStart(2, '0')
    return `${parsed.y}-${mm}-${dd}`
  }
  const str = String(raw).trim()
  const isoMatch = str.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) return str
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashMatch) {
    const [, m, d, y] = slashMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

/** "DNC" (did not complete) is a valid, intentional non-numeric value — see
 * docs/reference/REPORT_FRAMEWORKS.md's cross-cutting notes: a test that was attempted but not
 * completed is meaningfully different from a metric that was simply never tested, and both are
 * different from a normal blank cell. Recognized case-insensitively, same convention as manual
 * entry (src/lib/store.js's addManualResult). */
function parseValueCell(raw) {
  if (raw == null || raw === '') return { value: null, status: null, valid: false }
  if (String(raw).trim().toUpperCase() === 'DNC') return { value: null, status: 'dnc', valid: true }
  const n = Number(raw)
  return Number.isFinite(n) ? { value: n, status: null, valid: true } : { value: null, status: null, valid: false }
}

/**
 * @param {ArrayBuffer} arrayBuffer
 * @returns {{ rows: Array, errors: Array<{ rowIndex: number, reason: string }> }}
 */
export function parseGenericTestingFile(arrayBuffer) {
  // `raw: true` is required here: without it, SheetJS "helpfully" auto-detects ISO-looking date
  // strings in CSV input and round-trips them through a local-timezone JS Date conversion,
  // which silently shifts the date backward by one day for any user west of UTC (verified: a
  // "2026-08-04" cell became 2026-08-03 under an America/New_York locale). Reading raw keeps
  // date/number cells as plain text so toISODate()/toNumber() below do the only conversion,
  // deterministically and without a timezone round-trip. Genuine numeric Excel date serials in
  // real .xlsx files are unaffected — this only changes how CSV text is interpreted.
  const workbook = XLSX.read(arrayBuffer, { type: 'array', raw: true })
  const firstSheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[firstSheetName]
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: null })

  const rows = []
  const errors = []

  raw.forEach((record, idx) => {
    const normalizedKeys = Object.fromEntries(
      Object.entries(record).map(([k, v]) => [k.trim().toLowerCase(), v]),
    )
    const missing = REQUIRED_COLUMNS.filter((c) => !(c in normalizedKeys))
    if (missing.length) {
      errors.push({ rowIndex: idx, reason: `Missing column(s): ${missing.join(', ')}` })
      return
    }

    const date = toISODate(normalizedKeys.date)
    const parsedValue = parseValueCell(normalizedKeys.value)
    const athleteName = String(normalizedKeys.athlete_name ?? '').trim()
    const metricKey = String(normalizedKeys.metric_key ?? '').trim()

    if (!athleteName || !date || !metricKey || !parsedValue.valid) {
      errors.push({ rowIndex: idx, reason: 'Unparseable athlete name, date, metric, or value' })
      return
    }

    const knownColumns = new Set(REQUIRED_COLUMNS)
    const extra = Object.fromEntries(
      Object.entries(normalizedKeys).filter(([k]) => !knownColumns.has(k)),
    )

    rows.push({
      athleteName,
      date,
      metricKey,
      value: parsedValue.value,
      status: parsedValue.status,
      raw: extra,
    })
  })

  return { rows, errors }
}
