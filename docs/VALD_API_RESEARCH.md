# VALD API Integration — Research Notes

**Status: research only.** Nothing in this document has been implemented. Josh confirmed he
hasn't set up an API integration like this before, so when we do move forward, this becomes a
live, guided walkthrough rather than something built silently ahead of time. This file exists
so that walkthrough has an accurate starting point instead of starting from zero.

This is also consistent with `CLIENT_BUILD_PLAN.md`'s existing guidance: manual file upload was
chosen deliberately for the MVP so the workflow gets proven before taking on a vendor API
dependency. Nothing here changes that — it just means the *next* phase is well-scoped when
Josh is ready for it.

## Companion document: the Install & Troubleshooting Brief

Colin dropped `../Colin AMS VALD API Install Brief.pdf` into the working folder on 2026-08-22 —
a credential-free technical reference from a prior real ForceDecks API build (different client,
same VALD product line). It's the implementation-level companion to this file: this document
covers *whether/when/why* to build the integration; the brief covers *exactly how*, with real
endpoint shapes, working code, and every concrete bug hit building it the first time. Read it in
full before writing the actual sync function — the gotchas below are a summary, not a
replacement.

**Reconciles cleanly with everything above** — same OAuth2 client-credentials flow, same token
URL, same `audience=vald-api-external` requirement, same three regions, same "region/tenant
must be discovered live, never assumed" rule, same recommendation to land data in Supabase via a
background-executed function rather than one long HTTP request. One refinement: this file said
to cache the access token "for several hours"; the brief's more specific guidance is to fetch a
fresh token at the *start of every function invocation* and not try to persist it across
invocations unless the platform gives a reliable TTL-aware cache — simpler and it's what the
brief's own production build settled on, so follow that instead.

**Schema note:** the brief's reference schema uses a placeholder `forcedecks_tests` table with a
`metrics jsonb` blob — by its own admission a generic starting point, not a rule. This project's
actual planned shape (`database/schema/schema_sketch.sql`) is `test_sessions` (one per
athlete/date) + `test_results` (one row per metric, long-form) — the same shape manual upload
and manual entry already write to. Map into *that* shape, not the brief's generic one, so VALD
sync reuses the exact same upsert/provenance pattern already proven for those two paths (as this
file's "What pulling ForceDecks data actually looks like" section already anticipated). The
brief's `vald_profile_map` (athlete_id ↔ VALD profileId) and `vald_sync_log`/`vald_sync_state`
tables are new pieces not yet in `schema_sketch.sql` — add them when the sync function is
actually built.

**Hard-won gotchas worth knowing before writing any mapping code** (full detail + code in the
brief; this is just enough to recognize them if hit during the build):

- **The tests-list endpoint doesn't carry real metric values** — those live on a separate
  per-test `/trials` call. Don't build metric mapping against the tests-list payload.
- **Every trial metric appears 4x** — once per `limb`: `Trial` (the real combined value),
  `Left`, `Right`, `Asym`. The single most common first-pass bug is grabbing whatever's last in
  the array instead of explicitly filtering `limb === 'Trial'` — silently swaps in the asymmetry
  differential instead of the real value, with no error thrown.
- **Scale/units are not always what the field name implies** (jump height came back in cm in
  the brief's build; one RSI field needed a project-specific correction factor that must be
  re-derived, not copied). Rule: pull real trial data and sanity-check every new metric's scale
  against a number you already trust before wiring it to a column — never trust the field name
  or written docs alone.
- **A freshly-recorded test 204'ing on `/trials` is normal**, not a bug — VALD can take hours to
  finish server-side processing. Don't debug the mapping code first; wait and re-sync.
- **Rate limiting (429) fails silently per-test if unhandled** — you get a row with the right
  athlete/date/type but every metric null, indistinguishable from a mapping bug. Needs
  retry-with-backoff, a concurrency cap (3 was reliable in the brief's build), and explicit
  failure counting/surfacing — build this in from day one, not as a later hardening pass.
- **Athlete matching is the highest-stakes part.** Two real data-corruption incidents happened
  in the brief's build from guessing on ambiguous matches. Non-negotiable rules: match against
  *active* roster records only; if a VALD name matches more than one active athlete, skip and
  report it rather than picking one; if it matches none, report unmatched rather than
  auto-creating a record. Never silently guess on an uncertain match.
- **Security: the sync function needs its own caller-authorization check in code**, separate
  from whatever platform-level "is this a validly-signed request" check exists — a low-privilege
  public/anon key is validly-signed too. Two legitimate callers: an authenticated staff session
  (role checked server-side, never trusted from the client) or a scheduled job authorized by a
  separate shared secret you generate yourself. Before considering this done: manually confirm
  the sync endpoint rejects a request made with only the public/anon key.
- **Writes must be idempotent upserts on a natural key** (athlete + date + test type), and
  same-batch duplicates (e.g. a warm-up rep recorded as a separate test) need de-duplicating in
  memory before the write — most databases' upsert can't apply two updates to the same row in
  one statement.

## What VALD actually offers

VALD publishes a family of **External APIs**, one per product line (Tenants, Profiles,
ForceDecks, ForceFrame, NordBord, SmartSpeed, DynaMo, HumanTrak). They're standard REST APIs
with Swagger/OpenAPI docs per region, not a single unified API. Relevant to Josh:

- **External ForceDecks API** — the priority source per his Additional Notes.
- **External SmartSpeed API** — relevant if/when he consolidates his speed-gate testing onto
  VALD's platform, per the Project Brief.
- **External Tenants API** and **External Profiles API** — supporting APIs every integration
  needs first, to resolve the org/team ID and athlete IDs before pulling test data.

## Access process — is email the only way in?

**Yes, as far as VALD's own documentation shows.** There is no self-service developer portal
where you register an app and get a key instantly (the kind of flow common with, say, Stripe or
Google APIs). VALD's own "how to integrate" guide describes only the email-and-approval process
below, and nothing in VALD's public knowledge base, blog, or the third-party `valdr` R package
docs references any alternative signup path. If that ever changes, VALD would announce it
alongside their API docs — worth a quick check before starting, but budget for the email process.

1. Email `support@vald.com` requesting external API access, including the **VALD organization
   ID** (found in VALD Hub).
2. Because this system is being built by a third party on Josh's behalf (i.e. us, not VALD),
   VALD requires Josh to be CC'd on that request for approval, **and** requires signing an
   **API License Agreement** before credentials are issued.
3. VALD emails a **clientId** and **clientSecret** via a link that expires in 7 days — these
   must be captured and stored securely immediately, not left sitting in an inbox.

**Implication:** this has a real lead time (an email exchange + an agreement to sign) before
any code can even be tested. It's worth starting the access request in parallel with other
prep, once Josh decides he wants to move forward — it doesn't block anything else in the
current build.

## Authentication

OAuth2 **client-credentials** grant (no user login involved — this authenticates the
*integration*, not a person):

- Token URL: `https://auth.prd.vald.com/oauth/token`
- Must include `audience=vald-api-external` in the token request (VALD migrated auth providers
  in March 2026; the old `security.valdperformance.com` token URL is deprecated and will
  reject requests).
- Tokens are valid for several hours — cache and reuse until expiry rather than requesting a
  new one per call.
- Handle `401 Unauthorized` and `429 Too Many Requests` explicitly; VALD enforces rate limits.

## Resolved: the two API keys Josh saw were Nookal / Cliniko

Confirmed with Josh — the two no-email API key screens he found in VALD Hub were for the
**Nookal** and **Cliniko** practice-management-system integrations (`Management → Integration →
Configure`). As suspected: those keys belong to the *other* system (Nookal's/Cliniko's own key,
pasted into VALD Hub so it can sync profile data one-way from that PMS into VALD). They're
unrelated to the External ForceDecks API this document is about, and don't offer a shortcut
around the email/agreement process for pulling test-result data out. Not a dead end though —
see the "Sync Now" button idea below, which is a real way to make this feel automatic sooner.

## Region matters

Each tenant's data lives in one of three regions, each with its own base URL (Australia East,
US East, or Europe West) — **the wrong region returns no data, not an error**, which is an easy
silent-failure trap. **Open question for Josh:** which region his VALD Hub tenant is actually
in — not yet confirmed. Given his academy is referenced with a U.S. university contract but the
rest of his programs weren't clearly located in the discovery call, this needs a direct
confirmation before any integration work starts, not an assumption.

## What pulling ForceDecks data actually looks like

1. Resolve `tenantId` via the External Tenants API (`GET /tenants`).
2. Resolve `profileId` (athlete) values via the External Profiles API — this is notable: **VALD
   has a stable athlete identifier**, which is a meaningfully better matching key than the
   name-based matching our current upload parser uses (see `docs/IMPORT_SPEC.md`). If this
   integration happens, storing `vald_profile_id` on our `athletes` table and matching on that
   instead of display name would fix the "typo silently drops the row" limitation noted in
   `PRE_CONSULTATION_HANDOFF.md`'s Known Issues.
3. Pull tests: `GET /tests?tenantId={tenantId}&modifiedFromUtc={cursor}&profileId={optional}` —
   returns tests ordered by `modifiedDateUtc`; keep paging by advancing `modifiedFromUtc` to the
   last result's timestamp until the API returns `204 No Content`. This is a standard
   **incremental sync cursor** pattern — store the last successful `modifiedFromUtc` somewhere
   persistent so a scheduled job only asks for what's new each run.
4. Pull rep-level detail if needed: `GET /v2019q3/teams/{teamId}/tests/{testId}/trials`.
5. Raw recordings are available but require a **separate explicit permission request** to VALD
   support — almost certainly unnecessary for Josh's use case (he wants results/metrics, not
   raw force-plate recordings).

## Why this can't just be added to the current app as-is

The current build is a browser-only SPA by design (see `CLIENT_BUILD_PLAN.md` Phase 4) — there
is no backend, and the browser's publishable/anon key is public by design. A VALD `clientSecret`
is exactly the kind of value that **must never reach the browser** — if it did, anyone could
extract it from the page and pull Josh's athlete data directly from VALD.

**This means real automated VALD ingestion requires adding a small backend piece that doesn't
exist yet.** "Just plug the API in" isn't quite right — nothing in the current browser-only app
can hold a secret or run unattended on a schedule. The pipeline logic itself is small and
already half-built; what's missing is a place for it to *run*.

### What a "pull every night at 12am" job actually needs

1. **Somewhere to hold the secret and execute code outside the browser.** Two realistic options
   given the stack already planned for this project (Vite/React + Supabase + Vercel):

   | Option | How it'd work | Trade-offs (checked 2026) |
   |---|---|---|
   | **Supabase Scheduled Edge Function** (recommended) | Supabase's built-in `pg_cron` + `pg_net` extensions (on by default on every project) fire on a cron schedule and invoke a Deno Edge Function, which calls VALD's API and writes straight into the same Postgres database. Supabase also has a "Supabase Cron" UI on top of this so the schedule is a dashboard setting, not hand-written SQL. | Everything lives in one vendor (Supabase) instead of splitting logic across Supabase + Vercel. Edge Functions get meaningfully more execution time than Vercel's Hobby-tier cron budget (below), which matters if pulling several teams/athletes in one run. |
   | **Vercel Cron Job** | A cron entry in `vercel.json` hits a serverless API route on schedule; that route does the same VALD-call-then-write-to-Supabase work. | As of Jan 2026, Vercel raised the per-project cron job limit to 100 on **every** plan including Hobby (free) — so job *count* isn't a blocker. But Hobby cron jobs: can fire **at most once per day** (a once-daily 12am pull fits this exactly), are UTC-only, only guaranteed to fire sometime within the hour (not exactly on the minute), and — the real constraint — each invocation has only a **10-second execution timeout** on Hobby. Pulling and writing several teams' worth of data in 10 seconds could be tight; Vercel's paid Pro tier removes that ceiling. |

   **Recommendation:** Supabase Scheduled Edge Functions, since the data is landing in Supabase
   anyway (no cross-vendor hop) and it avoids the Hobby-tier 10-second wall entirely without
   needing to upgrade a Vercel plan just for this one job. Vercel Cron remains a fine choice if
   Josh ends up on Vercel Pro for other reasons.

   **Is this actually free? Yes, comfortably, at Josh's scale.** Supabase's free tier includes
   **500,000 Edge Function invocations per month** — a daily pull is 30-31 invocations a month,
   nowhere close to that ceiling even with room to run hourly instead of daily. `pg_cron` (what
   fires the schedule) is a core Postgres extension enabled by default on every Supabase
   project, not a paid add-on. Confirm against Supabase's current pricing page before committing
   long-term, but there's no cost barrier to trying this.

   **What about n8n?** n8n (the workflow-automation tool) has no VALD-specific integration, but
   its generic "HTTP Request" node can call any REST API, so it *could* build this same pull-
   and-write workflow visually instead of as code. The tradeoff: n8n itself has to run somewhere
   continuously (self-hosted on a server you maintain, or n8n Cloud, a paid product) — that's
   *more* infrastructure to operate, not less, when a small Supabase Edge Function already does
   the job within a vendor already in this project's stack. The "other coach" Josh mentioned may
   well have used n8n, or may have used exactly the Supabase/Vercel approach above — both are
   real options, but n8n isn't a necessary piece here given what's already planned.

2. **The sync job itself:**
   - Authenticate to VALD with the client secret (a server-only env var, never `VITE_`-prefixed).
   - Pull anything new since the last stored cursor (`modifiedFromUtc`).
   - Map VALD's response shape into our existing `test_sessions`/`test_results` schema and
     upsert into Supabase — reusing the same natural-key-upsert, `raw_json`-catch-all,
     provenance pattern already built for manual uploads (see
     `database/schema/schema_sketch.sql`), just with `source = 'api-sync:vald-forcedecks'`
     instead of `source = 'upload:<filename>'`.
   - Store the new cursor value somewhere durable (a small `sync_state` table) so the next run
     only asks for what's new.

In other words: the ingestion *pipeline* we already built (parse → normalize → match → upsert →
log) doesn't need to be rebuilt for this — only the "where rows come from" step changes. But a
scheduled function has to exist to run it, and that's a genuinely new piece of infrastructure —
the first backend compute this project would have — not a small addition or a config toggle.

## A "Sync Now" button first, a schedule second

Josh's idea — a button that pulls that day's tests on demand instead of a fully automatic
midnight job — is a genuinely good phase-in step, not a lesser version of the real thing:

**The important insight: a button and a schedule need the exact same backend function.**
Either way, something has to run server-side, hold the VALD secret, authenticate, pull tests,
and write them into Supabase. The *only* difference is what triggers that function —

- A **button** in the app calling that function directly when clicked, or
- **`pg_cron`** calling the same function automatically at 12am.

So "add a button after the API integration" isn't a separate, smaller feature — it's **the same
integration work, minus the scheduling step**, which makes it the natural first milestone:
easier to test (click it, watch it work, look at the result immediately instead of waiting for
a midnight run and checking logs the next morning), easier to debug, and it still fully
delivers "I don't have to download a file and upload it." Once the button version is solid,
turning it into an automatic nightly pull is a small, low-risk addition on top — same code,
just also invoked by a cron schedule.

## Two VALD accounts, not one — and what's prebuilt for that (2026-08-22)

Colin confirmed Josh actually authenticates against **two separate VALD accounts**, not one:
**Académie Universel has its own dedicated account**; every other program (BCS, Bishop's
University, Iona) shares **Josh's personal account** instead. That's a real architecture fact,
not a detail to patch in later — every table and every credential lookup below is per-account,
not global.

Ahead of Josh's real credentials existing, the backend/config layer for this is now fully built
so the remaining work when he's ready is *configuration*, not *design*:

- **`database/schema/schema_sketch.sql`** — a `vald_accounts` table (one row per VALD account:
  `slug`, `label`, `region`, `tenant_id`) plus `organizations.vald_account_id` saying which
  account a given org's teams sync against, `vald_profile_map` (athlete ↔ VALD profileId, per
  account), `vald_sync_state` (incremental cursor, per account), and `vald_sync_log` (per sync
  run, for the status poll). None of this is applied anywhere yet — no Supabase project exists.
- **`src/data/mockData.js`** — each real organization now carries a `valdAccount:
  'personal' | 'universel'` field recording which account it maps to (demo orgs: none).
- **`src/lib/vald/mapping.js`** — the pure, credential-free transformation logic from the brief
  (Trial-limb filtering, representative-trial selection, per-test-type-scoped metric mapping,
  active-only/no-guessing athlete matching) as plain JS functions — usable today for local
  verification once real trial responses exist, before anything is wired to a live database.
- **`supabase/functions/vald-sync/index.ts`** — a complete, ready-to-deploy Edge Function:
  per-account credential resolution (env vars named by convention from each account's `slug`,
  e.g. `VALD_PERSONAL_CLIENT_ID`/`_CLIENT_SECRET`), token fetch, profile matching scoped to the
  right account's athletes, incremental tests fetch, trials fetch with retry/backoff + concurrency
  cap, idempotent writes into this project's real `test_sessions`/`test_results` schema (not the
  brief's generic placeholder table), the two-caller security gate, and background execution +
  status logging. **Deliberately left undone:** the `RESULT_TO_METRIC_KEY` mapping table near the
  top of that file — per the brief's own golden rule, that has to come from real trial data, not
  a guess, so it's clearly marked and empty rather than filled with assumed field names.
- **Manage Teams → "VALD ForceDecks Sync"** (`src/components/manage/ManageTeamsPanel.jsx`) — a
  per-org "Sync Now" button + status display, wired to call the Edge Function above and poll
  `vald_sync_log`. Inert today (shows "not connected yet") the same way the player app does until
  `isSupabaseConfigured` is true — no code changes needed once it is.

## Recommended sequencing (not started yet)

1. **Now:** keep proving the workflow with manual upload, as the brief and this build's MVP
   scope call for.
2. **Once a real ForceDecks export has been mapped and trusted** (see `docs/IMPORT_SPEC.md`),
   start the VALD access-request email in parallel — it has lead time independent of build work.
   Two accounts means two separate email/agreement rounds if they haven't both been done yet —
   confirm with Josh whether Académie Universel's access is already sorted independently of his
   personal account's.
3. **When credentials exist:** confirm the correct region *per account* (Tenants API, Section 5
   of the brief), then use `src/lib/vald/mapping.js` to validate field mapping against real data
   — a handful of real trial responses per test type — before filling in
   `RESULT_TO_METRIC_KEY` in the Edge Function.
4. **Deploy the "Sync Now" button's Edge Function** (already written — see above) once the
   `RESULT_TO_METRIC_KEY` mapping from step 3 is filled in — this is the first milestone that
   actually removes the manual file download/upload step Josh wants gone.
5. **Only after the button has run reliably for real data:** add a `pg_cron` schedule that
   invokes the same function automatically (e.g. nightly) — Josh can keep the button too, for
   an on-demand refresh whenever he wants one without waiting for the schedule.

## What Josh will need to do when we start this

- Confirm his VALD Hub organization ID and which region his data lives in, **for each of his two
  accounts** — Académie Universel and his personal account are very likely different tenants and
  could even be in different regions.
- Send (or approve us sending, with him CC'd) the API access request to `support@vald.com`,
  **once per account** if not already done for both.
- Review and sign VALD's API License Agreement.
- Decide whether raw recordings are ever needed (default assumption: no).

None of this needs to happen now — it's here so it's ready when he is.

Sources consulted, current as of this write-up:
- [How to integrate with VALD APIs](https://support.vald.com/hc/en-au/articles/23415335574553-How-to-integrate-with-VALD-APIs)
- [A guide to using the External ForceDecks API](https://support.vald.com/hc/en-au/articles/38086939480729-A-guide-to-using-the-External-ForceDecks-API)
- [API Updates – March 2026 Breaking Changes](https://support.vald.com/hc/en-au/articles/55205316766233-API-Updates-March-2026-Breaking-Changes)
- [Introducing valdr: Direct, flexible access to your VALD data](https://valdperformance.com/news/introducing-valdr)
- [Scheduling Edge Functions – Supabase Docs](https://supabase.com/docs/guides/functions/schedule-functions)
- [Supabase Cron – Schedule Recurring Jobs in Postgres](https://supabase.com/modules/cron)
- [Cron jobs now support 100 per project on every plan – Vercel changelog](https://vercel.com/changelog/cron-jobs-now-support-100-per-project-on-every-plan)
- [Vercel Limits documentation](https://vercel.com/docs/limits)
