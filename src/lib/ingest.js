/**
 * Match parsed rows to the roster and hand off to the store. Kept separate from parsers.js so
 * "parse the file" and "match/write the data" stay independently testable/replaceable — see
 * the reference project's parsers.js / ingest.js split (docs/IMPORT_SPEC.md).
 */
function normalizeName(name) {
  return name.trim().toLowerCase()
}

/**
 * @param {Array} parsedRows  output of parseGenericTestingFile().rows
 * @param {Array} athletes    current roster (all teams — caller may pre-filter to one team)
 * @returns {{ matchedRows: Array, unmatchedNames: string[] }}
 */
export function matchRowsToRoster(parsedRows, athletes) {
  const byName = new Map(athletes.map((a) => [normalizeName(a.displayName), a]))
  const matchedRows = []
  const unmatchedNames = new Set()

  for (const row of parsedRows) {
    const athlete = byName.get(normalizeName(row.athleteName))
    if (!athlete) {
      unmatchedNames.add(row.athleteName)
      continue
    }
    matchedRows.push({
      athleteId: athlete.id,
      date: row.date,
      metricKey: row.metricKey,
      value: row.value,
      status: row.status ?? null,
      raw: row.raw,
    })
  }

  return { matchedRows, unmatchedNames: Array.from(unmatchedNames) }
}
