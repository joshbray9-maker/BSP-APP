# Performance Hub — Preliminary Build

A multi-team athlete performance data hub for Josh Bray / ETX Training. This is a
**pre-consultation preliminary build** — see `../CLIENT_BUILD_PLAN.md` for the full plan and
`../PRE_CONSULTATION_HANDOFF.md` for exactly what works, what's mocked, and what to discuss.

## What this app does (right now)

- Lets you switch between two **synthetic** teams and see a standardized dashboard repopulate.
- Shows per-athlete history for any athlete on the selected team.
- Accepts a CSV/XLSX upload and parses it into the same data shape as the mock data.
- Lets you manually enter a single test result through a form.
- Exports a PDF report for a team or an individual athlete.

None of this uses real athlete data, and no external accounts are required to run it locally.

## Local setup

```bash
npm install
npm run dev       # starts the dev server, prints a local URL
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

No environment variables are required to run the app as it stands today — see `.env.example`
for the variables a future Supabase connection will need, and
`docs/OPEN_QUESTIONS.md` for why that isn't wired up yet.

## Required accounts (not needed yet, will be for the next phase)

- **Supabase** — for real persistent storage once real data is ready to be entered.
- **GitHub** — to host the code and trigger deploys.
- **Vercel** — to host the running app so it's reachable from any device.

None of these need to exist for this preliminary build to run locally.

## Development workflow

- `src/data/mockData.js` is the synthetic dataset. Edit it to add teams/athletes/sessions for
  demo purposes — never put real athlete data here.
- `src/lib/` holds all calculation/parsing/reporting logic as plain functions; `src/components/`
  is presentation only.
- See `CLAUDE.md` for scope boundaries and conventions before adding a feature.

## Sample-data workflow

`sample-data/` holds tiny synthetic CSV files shaped like what a real upload will look like.
Use `npm run dev`, go to the Upload panel, and select one of these files to see the ingest path
work end-to-end. When a real VALD export sample arrives from the client, it should be
de-identified before it ever gets used with an AI tool — see the privacy rule in `CLAUDE.md`.

## Real-data privacy warning

**Do not put real athlete names, medical/injury information, or real team rosters into this
repository, into `sample-data/`, or into a Claude prompt.** Use athlete IDs or synthetic names
(`Athlete A01`, `Player B`) for anything committed to source control or shared with an AI tool.

## Resuming development through Claude Code

Open this folder in Claude Code and point it at `CLAUDE.md` first — it has the scope boundaries,
data/privacy rules, and architecture summary a fresh session needs before making changes.
