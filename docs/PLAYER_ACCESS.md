# Player Mobile Access

Status as of 2026-08-18: **skeleton only, not live.** Nothing here talks to a real backend yet —
there is no Supabase project for this client. This documents what's built, what it needs to
actually work, and what must be checked before any real athlete logs in with real data.

## What's built

- `database/schema/schema_sketch.sql` — a `profiles` table linking `auth.users` to a role
  (`admin`/`coach`/`player`) and, for players, to exactly one `athlete_id`. RLS policies for
  `admin` (full access) and `player` (read-only, own athlete row + own team/org branding + own
  sessions/results only) are written and enabled. **Coach RLS is intentionally not written** —
  Josh's coach visibility rule still isn't confirmed (`docs/OPEN_QUESTIONS.md` #11); don't guess
  at it later just because this file exists.
- `src/lib/supabaseClient.js` — creates a Supabase client from `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_PUBLISHABLE_KEY` if both are set, otherwise exports `null` and
  `isSupabaseConfigured = false`. Every player-facing file checks this flag rather than assuming
  a connection exists.
- `src/lib/playerAuth.js` — `usePlayerSession()` hook: magic-link sign-in
  (`supabase.auth.signInWithOtp`), session state, and looks up the caller's `profiles` row.
- `src/player/` — a **separate app tree** from the coach/admin app (`AppShell.jsx`), not a role
  branch inside it:
  - `PlayerApp.jsx` — gates on session/profile state, routes to login or profile.
  - `PlayerLogin.jsx` — email → magic link.
  - `PlayerProfile.jsx` — read-only: the player's own metric trend charts + session history
    table. Fetches `athletes`/`teams`/`organizations`/`test_sessions`/`test_results` with no
    client-side filtering by athlete ID — RLS is what actually restricts the rows returned, not
    application code. Reshapes the Supabase response into the same `{sessions, results}` shape
    `src/lib/selectors.js` already expects, so the existing chart components work unchanged.
- `src/App.jsx` — splits on `window.location.pathname.startsWith('/player')` between the
  existing coach/admin app and `PlayerApp`. No router library added for one split; revisit if a
  third entry point shows up.

## Why there's no team-average comparison in the player view yet

`AthleteDetail.jsx` (the coach/admin view) shows each metric against the team average, and a
radar chart of the athlete vs. that average — both need every teammate's raw results to compute.
Josh's own requirement was that a player must **never** access another user's data, so the
player-facing RLS policies deliberately do not grant read access to teammates' rows. Giving the
*app code* that access and just hiding it in the UI would not satisfy that requirement — it has
to be enforced at the database level.

The correct way to still show a team-average line to a player is a `SECURITY DEFINER` Postgres
function that computes and returns only the aggregate number (e.g. `avg(value) where team_id =
...`), never individual rows. That's a small, well-scoped addition once the base skeleton is
proven — not built speculatively here. Until then, players see only their own trend.

## To activate once Josh sends Supabase credentials

1. Create a free Supabase project at supabase.com.
2. Run `database/schema/schema_sketch.sql` against it (SQL editor or `supabase db push`).
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local` (see
   `.env.example`) — the publishable/anon key only, never the secret key.
4. For each real player: create their `auth.users` row (Supabase dashboard → Authentication, or
   invite by email) and a matching `profiles` row with `role = 'player'` and their `athlete_id`.
   There's no admin UI for this yet — it's a manual/SQL step until player accounts are a
   day-to-day operation worth building a screen for.
5. Confirm your hosting setup serves `index.html` for the `/player` path too (SPA client-side
   routing needs a rewrite rule on most static hosts — Netlify/Vercel/etc. each have their own
   config for this; whichever host is chosen for the real deployment, that rule needs adding).

## Security check before any real athlete data goes in (do this, don't skip it)

- Create two test player accounts pointing at two different synthetic athletes. Confirm player
  A's session cannot read player B's `athletes`/`test_sessions`/`test_results` rows — try it via
  the Supabase client directly (browser console), not just through the app UI, since the UI not
  showing a button proves nothing about what the API actually allows.
- Confirm a player session gets nothing back from `organizations`/`teams` beyond their own team's
  branding row.
- Confirm the anon/publishable key alone (no valid session) can't read any athlete data — RLS
  should block unauthenticated reads entirely.
- Confirm the secret/service-role key never appears in any client-bundled file (`grep` the
  `dist/` build output for it after a real deploy).
- Re-read `CLAUDE.md`'s data/privacy rules before real athlete data (vs. the current synthetic
  rosters) goes into any of this.

This isn't a one-time checklist to satisfy once — re-run it after any schema or policy change.
