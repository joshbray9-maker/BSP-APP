# Open Questions

Carried over from `CLIENT_BUILD_PLAN.md` Phase 1. These block moving from "preliminary build"
to "real data" — they do not block this preliminary build itself.

1. Can you send an anonymized VALD ForceDecks export (plus a second one from the same source,
   if possible) so the real column layout can be mapped?
2. Can you send an anonymized copy of one of your current tracking sheets?
3. ~~What are the 5–10 metrics you actually want on the main team dashboard?~~ **Answered
   2026-08-17** — Josh sent the full test battery by category (ForceDecks, Speed, COD,
   Conditioning, Grip, Strength) and wants the *capability* to swap in whichever subset a given
   team actually tests, not one fixed list. See `CLIENT_BUILD_PLAN.md`'s 2026-08-17 (night)
   addendum and `docs/reference/REPORT_FRAMEWORKS.md`.
4. What should the weekly stoplight readiness report show — which metrics, and what
   green/yellow/red rule per metric? **Partially answered 2026-08-21** — the *mechanism* is now
   built: an admin-only editable table on the Readiness view lets you set what raw % of an
   athlete's own rolling baseline counts as a 5/4/3/2 (anything below the "2" cutoff scores a 1),
   per metric (see `src/lib/readiness.js`). Still open: the actual numbers are unset placeholders
   until you fill them in per metric, and the green/yellow/red *band* boundaries themselves
   (currently fixed: 4-5 = Go, 3 = Caution, 1-2 = Intervention — see `READINESS_BANDS` in the
   same file) aren't yet configurable, only the 1-5 score is.
5. Is version one exclusively the team monitoring/reporting system, or do you expect
   programming/planning features in this same engagement?
6. Which single team/organization should be the "real" first one once real data is ready?
7. Do all your teams collect the same tests, or does this vary meaningfully by sport?
8. For a bulk athlete-report export: one combined PDF, or individual PDFs packaged together?
9. Does anyone besides you need login access in version one?
10. Will real athlete data ever include injury/medical information, or does this system stay
    strictly performance/testing data?
11. What should a coach be able to see and do, specifically? Confirmed so far, from Additional
    Notes #3 verbatim ("coach accessibility, restrained to their team and what I want them to
    see"): (a) a coach must be scoped to their own team only — not able to switch to other
    teams the way the org/team selector currently allows any role to do, and (b) restricted to
    "predetermined" information within that team, exact rule still undefined. Today's
    `src/lib/roles.js`/`RoleGate` only implements (b)-shaped view-hiding (Upload/Reports/Manage)
    as a placeholder — it does not yet implement (a), team-scoping, since there's no real
    per-coach account to scope. When real coach auth is eventually built, model it the same way
    `docs/PLAYER_ACCESS.md` models players: RLS scoped to one team via a `profiles` row, not a
    client-side toggle.
12. What is the real 1–5 readiness definition per metric, and which metrics belong in it? The
    framework in `src/lib/readiness.js` is built and waiting on your sample data.
13. Which VALD region is your Hub tenant in (Australia East / US East / Europe West)? **Partially
    answered 2026-08-22** — Colin confirmed Josh actually has *two* separate VALD accounts: one
    dedicated to Académie Universel, one "personal" account covering every other program (BCS,
    Bishop's University, Iona). The backend/schema is now built for that (see
    `database/schema/schema_sketch.sql`'s `vald_accounts` table and
    `supabase/functions/vald-sync/index.ts`) — still open: the actual region for **each** of the
    two accounts, confirmed live via the Tenants API once credentials exist, not assumed.

## Not a blocker, but worth deciding together

- PPTX export layout/content expectations — no longer "no example seen": the 4 reference
  dashboards Josh sent 2026-08-17 give concrete target layouts (see
  `docs/reference/REPORT_FRAMEWORKS.md`). Still worth confirming the season-stage slide deck's
  exact stage boundaries (pre/mid/post is the default, but Josh said "as often as needed").
- Whether uploads should replace or append on a repeat upload of overlapping dates.
- Real Supabase Auth + RLS design for the admin/coach role split (today's role switcher is a
  client-side demo toggle only — see the security note in `src/lib/roles.js`).

## New from the 2026-08-17 client notes — needs Josh's steer before building

14. ~~Light vs. dark theme scope.~~ **Resolved 2026-08-17 (Colin's call, pending Josh
    confirmation):** exports stay light (already true), live dashboard app stays dark. Revisit
    only if Josh explicitly asks for the app itself to go lighter.
15. ~~Is Google Sheets a viable/desired data *source*?~~ **Resolved 2026-08-18, but re-scoped**
    — Colin clarified Josh actually means Google Sheets as an export *destination* (push a
    team's/athlete's data out as a real Sheet in his own Drive), not a data source — data
    already gets in via file upload (built) or the VALD API pull (researched). Researched as a
    destination in `docs/GOOGLE_SHEETS_EXPORT_RESEARCH.md`: unlike the VALD pull, this doesn't
    need a backend and can be built as a simple client-side "Export to Google Sheets" button —
    **open question for Josh**: does he want that (buildable now), or an automatic/scheduled
    push (needs the same backend the VALD nightly pull would need)?
16. ~~How much player-facing mobile access does Josh actually want?~~ **Resolved 2026-08-18** —
    Josh confirmed: read-only, own data only, "under no circumstances" another user's data. A
    Supabase Auth + RLS skeleton for exactly that is now built (inert, no live project yet) —
    see `docs/PLAYER_ACCESS.md`. Open sub-question once real accounts are set up: does a player
    want a team-average comparison too? (Needs a dedicated aggregate function, not built yet —
    see that doc's "why no team-average" section.)
