-- SCHEMA SKETCH — not applied anywhere yet.
-- No Supabase project exists for this client at time of writing. This documents the intended
-- Postgres shape for when persistence moves from localStorage to a real database, adapted from
-- the reference project's proven organization/team/athlete/session pattern (see
-- ../../../CLIENT_BUILD_PLAN.md Phase 2 and the reference packet's schema_pattern.sql).
--
-- Key difference from the reference project: teams here are a real table with an FK to
-- organizations, not a hard-coded two-value enum — Josh has ~9 team environments across
-- multiple organizations, so a real table is required from the start.

create table organizations (
  id bigint generated always as identity primary key,
  name text not null,
  logo_url text,
  color_primary text,
  color_accent text,
  created_at timestamptz not null default now()
);

create table teams (
  id bigint generated always as identity primary key,
  org_id bigint not null references organizations(id) on delete cascade,
  name text not null,
  sport text,
  -- Optional per-team branding override — falls back to the org's colors/logo when null. Added
  -- 2026-08-26 during the localStorage -> Supabase migration; theme.js already expects these on
  -- the team object, this was just missing from the schema until now.
  logo_url text,
  color_primary text,
  color_accent text,
  created_at timestamptz not null default now()
);

create table athletes (
  id bigint generated always as identity primary key,
  team_id bigint not null references teams(id) on delete cascade,
  display_name text not null,
  position text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table uploaded_files (
  id bigint generated always as identity primary key,
  uploaded_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  data_source text not null,
  status text not null default 'pending', -- pending | processing | complete | error | needs_review
  row_count integer,
  message text,
  created_at timestamptz not null default now()
);

create table test_sessions (
  id bigint generated always as identity primary key,
  athlete_id bigint not null references athletes(id) on delete cascade,
  session_date date not null,
  source text not null, -- e.g. 'manual-entry', 'upload:vald-forcedecks'
  source_file_id bigint references uploaded_files(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (athlete_id, session_date, source)
);

create table test_results (
  id bigint generated always as identity primary key,
  session_id bigint not null references test_sessions(id) on delete cascade,
  metric_key text not null,
  value numeric,
  -- 'dnc' = attempted but did not complete, kept distinct from a metric that was simply never
  -- tested (value/status both null) — see docs/reference/REPORT_FRAMEWORKS.md's cross-cutting
  -- notes and src/lib/selectors.js's resolveCheckpoint(). Mirrors src/lib/store.js's local shape.
  status text check (status is null or status = 'dnc'),
  raw_json jsonb, -- catch-all for unmapped columns from the source file
  created_at timestamptz not null default now(),
  unique (session_id, metric_key)
);

-- Placeholder for later — editable flag thresholds, once real thresholds are confirmed.
-- Mirrors the reference project's DB-config-merged-over-code-defaults pattern.
create table flag_thresholds (
  id bigint generated always as identity primary key,
  metric_key text not null unique,
  tiers jsonb not null, -- ordered [{label, color, min_pct}]
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Singleton row (id always 1) holding the Readiness panel's coach-editable config: which metrics
-- are included, and each one's 5/4/3/2 scoring thresholds — see src/lib/readiness.js. Was
-- localStorage-only until the 2026-08-26 migration; one row is enough since there's one admin.
create table readiness_config (
  id integer primary key default 1,
  selected_metric_keys jsonb not null default '[]'::jsonb,
  thresholds jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);
insert into readiness_config (id) values (1) on conflict (id) do nothing;

-- ============================================================================================
-- PLAYER ACCESS — added 2026-08-18. Josh confirmed the requirement in his own words: "a player
-- should only ever have access to their own personal data and under no circumstances would be
-- able to access another user's data." Written now because that rule is confirmed; coach RLS
-- below is still deliberately left unwritten because the coach visibility rule is NOT confirmed
-- (see docs/OPEN_QUESTIONS.md #11) — don't guess at it when this file gets applied for real.
-- ============================================================================================

-- One row per Supabase Auth user. 'player' rows must carry an athlete_id; 'admin' rows don't
-- need one (Josh is the only admin today per the original note below). No 'coach' policies are
-- written yet — a coach profile can exist here, it just won't be granted any RLS access below
-- until that rule is confirmed, matching how the app's client-side RoleGate already withholds
-- Upload/Reports/Manage from the coach role as an unconfirmed placeholder.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'coach', 'player')),
  athlete_id bigint references athletes(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint player_requires_athlete check (role <> 'player' or athlete_id is not null)
);

-- SECURITY DEFINER so policies on `athletes`/`test_sessions`/etc. can check the caller's role
-- without those policies themselves needing SELECT access to `profiles` (which would recurse).
create or replace function private.current_profile()
returns table (role text, athlete_id bigint)
language sql security definer stable
as $$
  select role, athlete_id from profiles where id = auth.uid();
$$;

alter table organizations enable row level security;
alter table teams enable row level security;
alter table athletes enable row level security;
alter table test_sessions enable row level security;
alter table test_results enable row level security;
alter table profiles enable row level security;
alter table uploaded_files enable row level security;
alter table readiness_config enable row level security;
-- vald_sync_log is normally written only by the Edge Function (service-role key, bypasses RLS
-- automatically) — but ManageTeamsPanel's "Sync Now" status poll reads it directly from the
-- browser with the anon key, so it needs its own admin-read policy too, added here for the same
-- 2026-08-26 migration that added real admin auth to check against.
alter table vald_sync_log enable row level security;

-- Admin: full access everywhere. Josh is the only admin today (see original note below) — this
-- is intentionally broad rather than per-table-scoped, since there's exactly one admin account.
create policy "admin full access: organizations" on organizations for all
  using (exists (select 1 from private.current_profile() p where p.role = 'admin'));
create policy "admin full access: teams" on teams for all
  using (exists (select 1 from private.current_profile() p where p.role = 'admin'));
create policy "admin full access: athletes" on athletes for all
  using (exists (select 1 from private.current_profile() p where p.role = 'admin'));
create policy "admin full access: test_sessions" on test_sessions for all
  using (exists (select 1 from private.current_profile() p where p.role = 'admin'));
create policy "admin full access: test_results" on test_results for all
  using (exists (select 1 from private.current_profile() p where p.role = 'admin'));
create policy "admin full access: uploaded_files" on uploaded_files for all
  using (exists (select 1 from private.current_profile() p where p.role = 'admin'));
create policy "admin full access: readiness_config" on readiness_config for all
  using (exists (select 1 from private.current_profile() p where p.role = 'admin'));
create policy "admin read: vald_sync_log" on vald_sync_log for select
  using (exists (select 1 from private.current_profile() p where p.role = 'admin'));

-- Player: read-only, own athlete row only. No insert/update/delete policies exist for players
-- on any table — a player can never write, only read their own history. Deliberately NOT
-- granted read access to teammates' rows, `teams`, or `organizations` beyond their own team's
-- name/branding (needed to render "which team am I on" in the player UI) — a team-average
-- comparison chart for players would need a separate SECURITY DEFINER aggregate function that
-- returns only a computed average, never other athletes' raw rows; that's flagged as a follow-up
-- in docs/PLAYER_ACCESS.md rather than built speculatively here.
create policy "players read own profile" on profiles for select
  using (id = auth.uid());
create policy "players read own athlete row" on athletes for select
  using (id = (select athlete_id from private.current_profile()));
create policy "players read own team" on teams for select
  using (id = (select team_id from athletes where id = (select athlete_id from private.current_profile())));
create policy "players read own org" on organizations for select
  using (id = (select org_id from teams where id = (
    select team_id from athletes where id = (select athlete_id from private.current_profile())
  )));
create policy "players read own sessions" on test_sessions for select
  using (athlete_id = (select athlete_id from private.current_profile()));
create policy "players read own results" on test_results for select
  using (exists (
    select 1 from test_sessions s
    where s.id = test_results.session_id
      and s.athlete_id = (select athlete_id from private.current_profile())
  ));

-- RLS: enable on every table before any real athlete data goes in. Coach policies are not
-- written here because the coach visibility rule isn't confirmed yet (see docs/OPEN_QUESTIONS.md
-- #11) — do not guess at it. See the reference packet's rls_policies_pattern.sql for the
-- SECURITY DEFINER helper-function approach this section already follows.

-- ============================================================================================
-- VALD API SYNC — added 2026-08-22, still not applied anywhere (no Supabase project exists).
-- Prebuilt ahead of Josh's real credentials so wiring them in later is config, not new schema
-- work. See ../../docs/VALD_API_RESEARCH.md and ../../../Colin AMS VALD API Install Brief.pdf
-- for the full integration reference this was built from.
--
-- Multi-account, not single-account: Josh authenticates against TWO separate VALD accounts —
-- one dedicated to Académie Universel, one "personal" account covering every other program
-- (BCS, Bishop's University, Iona). The brief's own reference schema assumes one global
-- clientId/clientSecret/tenantId; that doesn't fit here, so `vald_accounts` exists to hold N
-- credential sets, and `organizations.vald_account_id` says which one a given org's teams sync
-- against. `slug` drives the env var naming convention the sync function looks credentials up
-- by (e.g. slug 'personal' -> secrets VALD_PERSONAL_CLIENT_ID / VALD_PERSONAL_CLIENT_SECRET) —
-- see supabase/functions/vald-sync/index.ts. The secret VALUES never live in this table or any
-- table; only which secret NAME to look up.
-- ============================================================================================

create table vald_accounts (
  id bigint generated always as identity primary key,
  slug text not null unique, -- 'personal' | 'universel' today; drives env var lookup, see above
  label text not null, -- human-readable, e.g. 'Josh — personal account', 'Académie Universel'
  region text check (region in ('use', 'aue', 'euw')), -- confirm live per account (brief Section 5), don't assume
  tenant_id text, -- resolved via the Tenants API once credentials exist; null until then
  created_at timestamptz not null default now()
);

alter table organizations add column vald_account_id bigint references vald_accounts(id);

-- VALD's stable athlete identifier (profileId), once resolved by name-matching — see
-- docs/VALD_API_RESEARCH.md's note on why this is a better long-term key than display-name
-- matching on every sync. One athlete maps to at most one VALD profile.
create table vald_profile_map (
  athlete_id bigint primary key references athletes(id) on delete cascade,
  vald_account_id bigint not null references vald_accounts(id),
  profile_id text not null,
  unique (vald_account_id, profile_id)
);

-- Incremental sync cursor, kept per VALD account (each account's `/tests` feed is independent).
create table vald_sync_state (
  vald_account_id bigint not null references vald_accounts(id),
  resource text not null default 'forcedecks_tests',
  last_modified_utc text not null,
  last_synced_at timestamptz,
  primary key (vald_account_id, resource)
);

-- One row per sync run (manual button click or scheduled), for the client-side status poll
-- (brief Section 13) and so unmatched/ambiguous athlete names and fetch failures are visible
-- somewhere instead of silent (brief Sections 10 & 11).
create table vald_sync_log (
  id bigint generated always as identity primary key,
  vald_account_id bigint references vald_accounts(id),
  triggered_by uuid references auth.users(id) on delete set null,
  trigger_type text not null check (trigger_type in ('manual', 'scheduled')),
  status text not null check (status in ('processing', 'complete', 'error')),
  message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
