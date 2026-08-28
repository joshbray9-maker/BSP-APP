# Data Model

## Conceptual shape

```
Organization
  └── Team
        └── Athlete
              └── TestSession (a date + a source)
                    └── TestResult (one metric value)
```

This mirrors the brief's required relationship: `Organizations → Teams → Athletes → Test
Sessions → Test Results`.

## Entities (as implemented in `src/data/mockData.js` for this preliminary build)

- **Organization** — `{ id, name, logoUrl, colorPrimary, colorAccent }`. `logoUrl`/color fields
  exist now so branding is a data change later, not a rebuild (Additional Notes #1).
- **Team** — `{ id, orgId, name, sport }`.
- **Athlete** — `{ id, teamId, displayName, position }`. No demographic fields beyond what's
  needed to render a roster — see `CLIENT_BUILD_PLAN.md` Phase 1 ("additional demographic
  fields should not be added unless required").
- **TestSession** — `{ id, athleteId, date, source, uploadId }`. `source` identifies where the
  data came from (`manual-entry`, `upload:<filename>`, `sample-data`); `uploadId` is the
  provenance link back to the file that produced it (or `null` for manual entries) — the
  reference project's `source_file_id` pattern, so a bad upload can eventually be traced/undone.
- **TestResult** — `{ id, sessionId, metricKey, value, status, raw }`. `raw` is the catch-all for
  anything not mapped to a known metric — the reference project's `raw_json` pattern, kept here
  as a plain object since there's no real database yet. `status` is `'dnc'` (did not complete —
  attempted but no valid result) or `null`; a DNC result always has `value: null`. Added
  2026-08-18 to distinguish "attempted, didn't complete" from "never tested" — both previously
  collapsed into the same blank. See `docs/reference/REPORT_FRAMEWORKS.md`'s cross-cutting notes
  and `src/lib/selectors.js`'s `resolveCheckpoint()`, which additionally derives a third state,
  `'not-retested'` (real history exists for this athlete/metric, just nothing new at this
  specific checkpoint) — that one is computed at read time, not stored.

## Intended Postgres schema (for when Supabase is actually connected)

See `../database/schema/schema_sketch.sql`. It is a **sketch**, not applied anywhere yet — no
Supabase project exists for this client at time of writing. It follows the reference project's
proven `raw_json` + natural-unique-key + `source_file_id` pattern, adapted to a real `teams`/
`organizations` table (the reference project hard-coded two teams via an enum; Josh has ~9
teams across multiple organizations, so a real table is required here, not an enum).

## What's intentionally NOT modeled yet

- Flag thresholds as a database table (currently a code config in `src/lib/flags.js`) — added
  once real thresholds are confirmed.
- Coach/role permissions as real rows — the schema sketch includes a `role` concept but no
  second account exists.
- Injury/availability tracking — not requested for this system (brief explicitly separates
  "potential future injury information" from this build's confirmed scope).
