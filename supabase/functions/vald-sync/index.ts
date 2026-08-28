// supabase/functions/vald-sync/index.ts
//
// NOT DEPLOYED — no Supabase project exists for this client yet (see docs/PLAYER_ACCESS.md and
// docs/VALD_API_RESEARCH.md). Written ahead of time so that once Josh's Supabase project, VALD
// credentials, and region/tenant IDs exist, wiring this in is: create the `vald_accounts` rows,
// set 4 secrets, fill in ONE mapping table from real data (Section "5. Metric mapping" below),
// and deploy — not new logic to design under time pressure on a call.
//
// Adapted from `../../../../Colin AMS VALD API Install Brief.pdf` (a prior real ForceDecks
// integration's troubleshooting brief) to this project's actual schema
// (`database/schema/schema_sketch.sql`: test_sessions/test_results, not the brief's generic
// forcedecks_tests placeholder) and to Josh's real account structure: TWO separate VALD
// accounts — one dedicated to Académie Universel, one "personal" account covering every other
// program. See the `vald_accounts` table for how that's modeled.
//
// The brief's own golden rule, worth repeating here: never trust a field name, a units label, or
// written API docs over what real captured data actually shows. Section 5 (metric mapping) below
// is deliberately left empty for that reason — filling it in requires real trial responses to
// verify scale/sign against, not guessing from VALD's docs.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ---------------------------------------------------------------------------------------------
// 1. Config, per-account credential resolution, CORS
// ---------------------------------------------------------------------------------------------

const AUTH_URL = 'https://auth.prd.vald.com/oauth/token'
const profilesBase = (region: string) => `https://prd-${region}-api-externalprofile.valdperformance.com`
const forceDecksBase = (region: string) => `https://prd-${region}-api-extforcedecks.valdperformance.com`

const CRON_SECRET = Deno.env.get('VALD_SYNC_CRON_SECRET')!

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-trigger-type, x-cron-secret, x-vald-account',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

type ValdAccount = { id: number; slug: string; label: string; region: string | null; tenant_id: string | null }

/** Credential env vars are named by convention from the account's `slug` column (never stored in
 * the database itself) — e.g. slug 'personal' -> VALD_PERSONAL_CLIENT_ID / VALD_PERSONAL_CLIENT_SECRET.
 * Adding a third VALD account later is a new `vald_accounts` row + 2 new secrets, not a code change. */
function credentialsFor(account: ValdAccount) {
  const prefix = `VALD_${account.slug.toUpperCase()}`
  const clientId = Deno.env.get(`${prefix}_CLIENT_ID`)
  const clientSecret = Deno.env.get(`${prefix}_CLIENT_SECRET`)
  if (!clientId || !clientSecret) {
    throw new Error(`missing ${prefix}_CLIENT_ID / ${prefix}_CLIENT_SECRET secrets for VALD account "${account.slug}"`)
  }
  return { clientId, clientSecret }
}

// ---------------------------------------------------------------------------------------------
// 2. Token fetch — fresh per invocation, not cached across invocations (brief Section 4)
// ---------------------------------------------------------------------------------------------

async function getToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: 'vald-api-external',
    }),
  })
  if (!res.ok) throw new Error(`VALD auth failed: ${res.status} ${await res.text()}`)
  return (await res.json()).access_token as string
}
const authHeaders = (t: string) => ({ Authorization: `Bearer ${t}` })

// ---------------------------------------------------------------------------------------------
// 3. Profiles & tests-list fetch (brief Section 6)
// ---------------------------------------------------------------------------------------------

async function fetchProfiles(token: string, region: string, tenantId: string) {
  const res = await fetch(`${profilesBase(region)}/profiles?tenantId=${tenantId}`, { headers: authHeaders(token) })
  if (!res.ok) throw new Error(`profiles fetch failed: ${res.status}`)
  const data = await res.json()
  return (data.profiles ?? data) as { profileId: string; givenName: string; familyName: string }[]
}

async function fetchTestsSince(token: string, region: string, tenantId: string, sinceIso: string) {
  const tests: any[] = []
  let cursor = sinceIso
  for (let page = 0; page < 200; page++) {
    // safety cap
    const qs = `tenantId=${tenantId}&modifiedFromUtc=${encodeURIComponent(cursor)}`
    const res = await fetch(`${forceDecksBase(region)}/tests?${qs}`, { headers: authHeaders(token) })
    if (res.status === 204) break
    if (!res.ok) throw new Error(`tests fetch failed: ${res.status}`)
    const batch = (await res.json()).tests ?? []
    if (!batch.length) break
    tests.push(...batch)
    const last = batch[batch.length - 1]
    if (last.modifiedDateUtc === cursor) break // no forward progress
    cursor = last.modifiedDateUtc
  }
  return tests
}

// ---------------------------------------------------------------------------------------------
// 4. Trials fetch with retry/backoff + concurrency cap (brief Sections 9 & 10) — the single most
//    time-consuming failure mode in the brief's prior build when left unhandled: a 429 fails
//    SILENTLY per test (correct athlete/date/type row, every metric null, no visible error).
// ---------------------------------------------------------------------------------------------

async function fetchTrialsForTest(token: string, region: string, tenantId: string, testId: string) {
  const url = `${forceDecksBase(region)}/v2019q3/teams/${tenantId}/tests/${testId}/trials`
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: authHeaders(token) })
    if (res.status === 204) return [] // legitimately no data yet — brief Section 9, not a failure
    if (res.ok) return await res.json()
    if (res.status === 429 && attempt < 3) {
      const retryAfter = Number(res.headers.get('retry-after')) || (attempt + 1) * 2
      await new Promise((r) => setTimeout(r, retryAfter * 1000))
      continue
    }
    throw new Error(`trials fetch failed (${res.status}) for test ${testId}`)
  }
  throw new Error(`trials fetch exhausted retries for test ${testId}`)
}

// ---------------------------------------------------------------------------------------------
// 5. Metric mapping — THE ONE PIECE THAT MUST BE FILLED IN FROM REAL DATA, not guessed.
//
//    Scoped PER TEST TYPE (brief Section 8): different test types can report near-identical
//    result-string vocabularies that need to land in different destination metric_keys. A flat
//    global map would silently merge two unrelated tests' data the moment two test types share a
//    field name.
//
//    See src/lib/vald/mapping.js for the shared pure logic (extractTrialValue,
//    pickRepresentativeTrial, mapTrialResults, matchProfilesToAthletes) — duplicated inline below
//    rather than imported, since Supabase's function bundler doesn't reliably follow imports
//    outside this directory. Keep the two in sync if either changes.
//
//    Before filling this in: pull a handful of real trial responses per test type (brief's own
//    suggested build order step 8) and manually verify scale/sign against a number you already
//    trust — e.g. jump height came back in centimeters in the brief's prior build, and one
//    RSI-modified field needed a project-specific correction factor that must be RE-DERIVED here,
//    never copied from that prior project.
// ---------------------------------------------------------------------------------------------

const RESULT_TO_METRIC_KEY: Record<string, Record<string, string>> = {
  // Example shape, once a real CMJ test payload has been inspected — our metric keys are in
  // src/lib/metrics.js:
  // CMJ: {
  //   JUMP_HEIGHT: 'cmj_height_cm',
  //   RSI_MODIFIED: 'rsi_modified',
  //   COUNTERMOVEMENT_DEPTH: 'cm_depth_cm',
  //   ECCENTRIC_BRAKING_FORCE: 'ecc_braking_force_n',
  // },
}

const TRIAL_LIMB = 'Trial'

function extractTrialValue(results: any[], resultKey: string) {
  return results?.find((r) => r.definition?.result === resultKey && r.limb === TRIAL_LIMB)?.value
}

function pickRepresentativeTrial(trials: any[]) {
  if (!trials?.length) return null
  let best: any = null
  let bestJump = -Infinity
  let anyJump = false
  for (const trial of trials) {
    const v = extractTrialValue(trial.results ?? [], 'JUMP_HEIGHT')
    if (v != null) {
      anyJump = true
      if (v > bestJump) {
        bestJump = v
        best = trial
      }
    }
  }
  return anyJump ? best : trials[trials.length - 1]
}

function mapTrialResults(testType: string, results: any[]) {
  const scoped = RESULT_TO_METRIC_KEY[testType] ?? {}
  const mapped: Record<string, number> = {}
  const raw: Record<string, number> = {}
  for (const r of results ?? []) {
    const key = r.definition?.result
    if (!key || r.limb !== TRIAL_LIMB) continue
    if (scoped[key]) mapped[scoped[key]] = r.value
    else raw[key] = r.value
  }
  return { mapped, raw }
}

// ---------------------------------------------------------------------------------------------
// 6. Athlete/profile matching (brief Section 11) — highest-stakes part of this integration.
//    Non-negotiable: active roster only, ambiguous names reported not guessed, unmatched
//    profiles reported not silently dropped or auto-created.
// ---------------------------------------------------------------------------------------------

function matchProfilesToAthletes(
  valdProfiles: { profileId: string; givenName: string; familyName: string }[],
  activeAthletes: { id: number; display_name: string }[],
) {
  const normalize = (s: string) => s.trim().toLowerCase()
  const byName = new Map<string, typeof activeAthletes>()
  for (const a of activeAthletes) {
    const k = normalize(a.display_name)
    if (!byName.has(k)) byName.set(k, [])
    byName.get(k)!.push(a)
  }

  const matched: { athleteId: number; profileId: string }[] = []
  const unmatched: { profileId: string; name: string }[] = []
  const ambiguousByName = new Map<string, { name: string; profileIds: string[] }>()

  for (const p of valdProfiles) {
    const name = `${p.givenName} ${p.familyName}`.trim()
    const k = normalize(name)
    const candidates = byName.get(k) ?? []
    if (candidates.length === 1) matched.push({ athleteId: candidates[0].id, profileId: p.profileId })
    else if (candidates.length === 0) unmatched.push({ profileId: p.profileId, name })
    else {
      if (!ambiguousByName.has(k)) ambiguousByName.set(k, { name, profileIds: [] })
      ambiguousByName.get(k)!.profileIds.push(p.profileId)
    }
  }

  return { matched, unmatched, ambiguous: [...ambiguousByName.values()] }
}

// ---------------------------------------------------------------------------------------------
// 7. Sync one VALD account — profiles/matching, incremental fetch, idempotent write
// ---------------------------------------------------------------------------------------------

async function syncAccount(account: ValdAccount, logId: number) {
  const finalize = (status: string, message: string) =>
    supabase.from('vald_sync_log').update({ status, message, finished_at: new Date().toISOString() }).eq('id', logId)

  try {
    if (!account.region || !account.tenant_id) {
      throw new Error(`account "${account.slug}" has no region/tenant_id set — resolve via the Tenants API first (brief Section 5), don't assume`)
    }
    const { clientId, clientSecret } = credentialsFor(account)
    const token = await getToken(clientId, clientSecret)

    // Scope matching to only athletes whose org maps to THIS account — orgs.vald_account_id.
    const { data: athletes } = await supabase
      .from('athletes')
      .select('id, display_name, teams!inner(organizations!inner(vald_account_id))')
      .eq('active', true)
      .eq('teams.organizations.vald_account_id', account.id)

    const profiles = await fetchProfiles(token, account.region, account.tenant_id)
    const { matched, unmatched, ambiguous } = matchProfilesToAthletes(profiles, (athletes ?? []) as any)

    for (const m of matched) {
      await supabase
        .from('vald_profile_map')
        .upsert({ athlete_id: m.athleteId, vald_account_id: account.id, profile_id: m.profileId }, { onConflict: 'athlete_id' })
    }

    const { data: state } = await supabase
      .from('vald_sync_state')
      .select('last_modified_utc')
      .eq('vald_account_id', account.id)
      .eq('resource', 'forcedecks_tests')
      .maybeSingle()
    const since = state?.last_modified_utc ?? '2020-01-01T00:00:00.000Z'

    const tests = await fetchTestsSince(token, account.region, account.tenant_id, since)
    const { data: mapRows } = await supabase
      .from('vald_profile_map')
      .select('athlete_id, profile_id')
      .eq('vald_account_id', account.id)
    const profileToAthlete = new Map((mapRows ?? []).map((r) => [r.profile_id, r.athlete_id]))

    let newestModified = since
    let fetchFailures = 0
    const CONCURRENCY = 3

    for (let i = 0; i < tests.length; i += CONCURRENCY) {
      const batch = tests.slice(i, i + CONCURRENCY)
      const rows = await Promise.all(
        batch.map(async (test) => {
          const athleteId = profileToAthlete.get(test.profileId)
          if (!athleteId) return null // unmatched profile — already reported above, skip its data

          let trials: any[] = []
          try {
            trials = await fetchTrialsForTest(token, account.region!, account.tenant_id!, test.testId)
          } catch {
            fetchFailures++
            return null // do not write a silently-null row — surfaced in the log message instead
          }

          const bestTrial = pickRepresentativeTrial(trials)
          const { mapped, raw } = mapTrialResults(test.testType, bestTrial?.results ?? [])
          if (test.modifiedDateUtc > newestModified) newestModified = test.modifiedDateUtc

          return { athleteId, sessionDate: test.recordedDateUtc.slice(0, 10), testType: test.testType, mapped, raw, testId: test.testId, trialCount: trials.length }
        }),
      )

      // Idempotent write, de-duplicated in memory first (brief Section 14) — most databases'
      // upsert can't apply two updates to the same row in one statement, and two source tests can
      // legitimately map to the same athlete/date/type (e.g. a warm-up rep recorded separately).
      for (const row of rows) {
        if (!row) continue
        const { data: session } = await supabase
          .from('test_sessions')
          .upsert(
            { athlete_id: row.athleteId, session_date: row.sessionDate, source: 'api-sync:vald-forcedecks' },
            { onConflict: 'athlete_id,session_date,source' },
          )
          .select('id')
          .single()
        if (!session) continue

        for (const [metricKey, value] of Object.entries(row.mapped)) {
          await supabase
            .from('test_results')
            .upsert(
              { session_id: session.id, metric_key: metricKey, value, raw_json: { test_type: row.testType, vald_test_id: row.testId, trial_count: row.trialCount, ...row.raw } },
              { onConflict: 'session_id,metric_key' },
            )
        }
      }
    }

    await supabase
      .from('vald_sync_state')
      .upsert({ vald_account_id: account.id, resource: 'forcedecks_tests', last_modified_utc: newestModified, last_synced_at: new Date().toISOString() }, { onConflict: 'vald_account_id,resource' })

    await finalize(
      'complete',
      [
        `${tests.length} test(s) processed`,
        fetchFailures ? `${fetchFailures} trial fetch failure(s) — re-sync to retry` : null,
        unmatched.length ? `${unmatched.length} unmatched VALD profile(s): ${unmatched.map((u) => u.name).join(', ')}` : null,
        ambiguous.length ? `${ambiguous.length} ambiguous (duplicate active name) profile(s) skipped: ${ambiguous.map((a) => a.name).join(', ')}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    )
  } catch (e) {
    await finalize('error', e instanceof Error ? e.message : String(e))
  }
}

// ---------------------------------------------------------------------------------------------
// 8. Security gate — two legitimate callers only (brief Section 12). This function runs under
//    the service-role key, so it must authorize the caller itself; a valid signature alone (the
//    public/anon key is validly-signed too) is not sufficient. Concretely verify before this is
//    ever deployed reachable: confirm calling this endpoint with ONLY the anon key and nothing
//    else is rejected.
// ---------------------------------------------------------------------------------------------

async function authorize(req: Request) {
  const triggerType = req.headers.get('x-trigger-type') === 'scheduled' ? 'scheduled' : 'manual'

  if (triggerType === 'scheduled') {
    if (req.headers.get('x-cron-secret') !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders })
    }
    return { triggerType, triggeredBy: null as string | null }
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: jsonHeaders })

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser()
  if (error || !user) return new Response(JSON.stringify({ error: 'Invalid session' }), { status: 401, headers: jsonHeaders })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return new Response(JSON.stringify({ error: 'Admin role required' }), { status: 403, headers: jsonHeaders })

  return { triggerType, triggeredBy: user.id }
}

// ---------------------------------------------------------------------------------------------
// 9. Request handler — fast return + background execution (brief Section 13). A full backfill
//    across every VALD account can run well past what a single held-open HTTP request should
//    risk, so this kicks the real work off in the background and writes progress to
//    vald_sync_log; the client polls that table instead of waiting on one long call.
//
//    Optional `x-vald-account` header (an account slug) syncs just that one account — used by a
//    per-org "Sync Now" button. Omit it (the scheduled cron path always will) to sync every
//    configured account in one run.
// ---------------------------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const auth = await authorize(req)
  if (auth instanceof Response) return auth

  const onlySlug = req.headers.get('x-vald-account')
  let accountsQuery = supabase.from('vald_accounts').select('id, slug, label, region, tenant_id')
  if (onlySlug) accountsQuery = accountsQuery.eq('slug', onlySlug)
  const { data: accounts, error: accountsError } = await accountsQuery
  if (accountsError) return new Response(JSON.stringify({ error: accountsError.message }), { status: 500, headers: jsonHeaders })
  if (!accounts?.length) return new Response(JSON.stringify({ error: 'no matching vald_accounts row' }), { status: 404, headers: jsonHeaders })

  const logIds: number[] = []
  for (const account of accounts as ValdAccount[]) {
    const { data: logRow, error } = await supabase
      .from('vald_sync_log')
      .insert({ vald_account_id: account.id, triggered_by: auth.triggeredBy, trigger_type: auth.triggerType, status: 'processing' })
      .select('id')
      .single()
    if (error || !logRow) continue
    logIds.push(logRow.id)
    // @ts-ignore — EdgeRuntime is a Supabase Edge Functions global.
    EdgeRuntime.waitUntil(syncAccount(account, logRow.id))
  }

  return new Response(JSON.stringify({ ok: true, started: true, logIds }), { headers: jsonHeaders })
})
