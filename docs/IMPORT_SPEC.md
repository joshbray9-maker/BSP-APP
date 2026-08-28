# Import Spec

## Current state

No real VALD ForceDecks export has been provided yet, so there is no confirmed column mapping.
This preliminary build's parser (`src/lib/parsers.js`) works against a **generic synthetic
CSV/XLSX shape** (see `sample-data/mock-testing.csv`) to prove the ingest pipeline end to end:

```
athlete_name, date, metric_key, value
```

`value` accepts a number, or the literal text `DNC` (did not complete, case-insensitive) for a
test that was attempted but not completed — stored as a distinct status rather than a blank, so
it's never confused with a metric that was simply never tested. See
`docs/reference/REPORT_FRAMEWORKS.md`'s cross-cutting notes and `src/lib/selectors.js`'s
`resolveCheckpoint()`. A blank/missing `value` cell is still a parse error (as before) — `DNC`
must be entered explicitly, it's not implied by an empty cell.

## How to add a real source once a sample export arrives

1. Add the sample file (de-identified) somewhere outside version control, or as a synthetic
   stand-in inside `sample-data/` — never commit a real athlete export.
2. Add a new entry to the `PARSERS` map in `src/lib/parsers.js` for the new source, following
   the existing generic parser's normalization approach (dates → `YYYY-MM-DD`, numbers coerced,
   blanks stay `null`, unrecognized columns preserved rather than dropped).
3. Add the source's metrics to `src/lib/metrics.js` so they render on the dashboard.
4. Do not change the core `TestSession`/`TestResult` shape — new sources should plug into the
   existing pipeline (parse → normalize → match athlete → create session/results), not require
   a new pipeline.

## Athlete matching

Matching is by display name, case-insensitive and trimmed — same approach as the reference
project, with the same known limitation: a typo or naming-format drift will silently fail to
match rather than fail loudly. Unmatched names are surfaced in the upload result, never
auto-created as new athletes.

## Open questions before real ingestion can be built

See `OPEN_QUESTIONS.md`.
