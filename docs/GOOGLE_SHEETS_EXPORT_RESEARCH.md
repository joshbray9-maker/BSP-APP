# Google Sheets Export Integration — Research Notes

**Status: research only.** Nothing in this document has been implemented — same treatment as
`docs/VALD_API_RESEARCH.md`.

**What Josh is actually asking for**, clarified in chat on 2026-08-18: not a data *source* (data
already gets in via file upload today, and via the VALD API pull once that's built — see
`docs/VALD_API_RESEARCH.md` and the resolved `docs/OPEN_QUESTIONS.md` item 15) but a data
**destination** — pushing a team's or athlete's data out as a real Google Sheet that lands
directly in his Google Drive, through an integration, rather than downloading a CSV and manually
importing it.

## The short version

This is **meaningfully easier than the VALD integration** in one important way: **it doesn't
need a backend.** Google's OAuth model for this kind of "user grants your app permission to act
in their own Drive" integration is designed to run entirely in the browser — unlike VALD's
client-credentials grant, which requires a secret that can never reach the browser. That's the
single biggest structural difference between these two integrations, and it means this could be
built as a client-side-only feature, the same shape as every export already in this app.

## What it would take

1. **A Google Cloud project + OAuth Client ID** (Web application type) — created once, in Google
   Cloud Console. Unlike VALD, this is fully self-service: no emailing a vendor, no waiting on
   anyone's approval, no license agreement to sign. Takes minutes, not days.
2. **Enable the Google Sheets API** on that project (one click in Cloud Console).
3. **Client-side auth via Google Identity Services (GIS)** — the current, non-deprecated way to
   do this (the old `gapi.auth2` client library is deprecated; GIS's token client is what Google
   now recommends). Concretely: an "Export to Google Sheets" button calls
   `google.accounts.oauth2.initTokenClient(...).requestAccessToken()`, which pops Google's
   standard consent screen ("Performance Hub wants to: See, edit, create, and delete your Google
   Sheets spreadsheets"). Josh approves once per session; the app gets a short-lived access
   token back — no secret ever touches this app's code or a server.
4. **Two API calls** with that token, both against `https://sheets.googleapis.com/v4/`:
   - `spreadsheets.create` — creates a new spreadsheet in Josh's own Drive (the one tied to
     whichever Google account he authorizes with) and returns its ID.
   - `spreadsheets.values.update` (or `.append`) — writes the same tabular rows the CSV exporter
     already produces (`src/lib/reports/csvExport.js`) into that new sheet.
5. That's the whole integration. The resulting file is a completely normal Google Sheet, sitting
   in Josh's Drive, shareable/editable the way any Sheet is — not a one-way export he then has
   to manually upload into Sheets himself.

## The one real wrinkle: unverified-app limits

Google requires **app verification** (a review process — privacy policy, possibly a demo video,
1–2+ weeks turnaround) before an OAuth app can request a "sensitive" scope like
`https://www.googleapis.com/auth/spreadsheets` from the general public. For an internal tool
with a handful of real users (Josh, maybe a couple coaches), **verification isn't needed** —
Google Cloud projects can stay in **Testing** publishing status and add up to 100 named **test
users** directly in the OAuth consent screen config, no review required.

The trade-off: **test-user authorizations expire 7 days after consent.** In Testing mode, Josh
(and anyone else added as a test user) would need to click through the Google consent screen
again about once a week — not a one-time setup. That's a real but minor UX cost, not a blocker,
and it's the kind of thing worth surfacing to Josh directly rather than deciding for him:
verification removes the 7-day re-consent requirement entirely, at the cost of a review process
with real lead time. Staying unverified is almost certainly the right call for launch — it can
always be verified later if this becomes a heavily-used feature.

A narrower `drive.file` scope (access limited only to files the app itself created) is worth a
closer look before committing to `spreadsheets` — it may reduce how "sensitive" Google considers
the request, which could matter if verification ever becomes worth pursuing.

## Comparison to the VALD integration

| | VALD API pull | Google Sheets export |
|---|---|---|
| Needs a backend? | **Yes** — a secret can't live in the browser | **No** — OAuth token model runs client-side |
| Access process | Email `support@vald.com`, sign a license agreement, wait for credentials | Fully self-service in Google Cloud Console, no waiting |
| Can it be automatic/scheduled? | Yes, once a backend exists (`pg_cron` + Edge Function) | **No, not without a backend** — GIS's browser token flow requires a user gesture each time a token is needed; there's no silent background refresh without a server holding a refresh token |
| Cost | Free at Josh's scale | Free at Josh's scale |

That last row matters: if Josh wants this to run unattended on a schedule (the same "push last
night's data to a Sheet automatically" idea as the VALD nightly-pull ask), that *would* need the
same backend piece described in `docs/VALD_API_RESEARCH.md` — the browser-only version only
supports "click a button while I'm here," not "do this while I'm asleep." Worth confirming which
one Josh actually wants before building: a click-to-export button (buildable today, no new
infrastructure) or a background auto-sync (needs the backend either integration would eventually
need anyway).

## Recommended sequencing (not started yet)

1. **Confirm with Josh**: is a click-triggered "Export to Google Sheets" button (creates a new
   sheet on demand, same gesture as today's "Export CSV" button) what he actually wants, or is he
   picturing something that updates automatically without him opening the app? The two have very
   different build costs (the first needs nothing new infrastructure-wise; the second needs the
   same backend the VALD nightly pull needs).
2. **If it's the button version**: this is a genuinely small addition — a Google Cloud project +
   OAuth Client ID (self-service, minutes), a new `googleSheetsExport.js` alongside the existing
   `pdfExport.js`/`pptxExport.js`/`csvExport.js`, and a button next to the existing export
   buttons in `ReportPanel.jsx`. No new architecture, no backend, no vendor approval wait.
3. **If it's the automatic version**: fold it into the same backend-infrastructure decision as
   the VALD nightly pull (see `docs/VALD_API_RESEARCH.md`'s Supabase Scheduled Edge Function
   recommendation) rather than standing up separate infrastructure for two different scheduled
   jobs.

## What Josh will need to do when we start this

- Decide which of the two versions above he actually wants.
- If the button version: nothing beyond approving the Google Cloud project creation (can be done
  under his own Google account, or a project account, whichever he prefers to own it under).

Sources consulted, current as of this write-up:
- [Using OAuth 2.0 to Access Google APIs](https://developers.google.com/identity/protocols/oauth2)
- [Migrate to Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/migration-to-gis)
- [Use the token model — Google Identity Services](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [Google Sheets API v4 reference — spreadsheets.values](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values)
- [Unverified apps — Google Cloud Platform Console Help](https://support.google.com/cloud/answer/7454865)
- [Manage App Audience — Google Cloud Platform Console Help](https://support.google.com/cloud/answer/15549945)
- [Sensitive scope verification — Google for Developers](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
