/**
 * Role-access SCAFFOLDING ONLY. There is no real authentication in this preliminary build —
 * see CLAUDE.md. This exists so the shape (a master admin with full control, plus coach
 * logins restricted to "certain information that is predetermined for them") is in place to
 * build on top of, per Josh's explicit request, even though the exact coach visibility rules
 * are not yet defined (see docs/OPEN_QUESTIONS.md).
 *
 * In the running app today, "role" is a local, session-only UI toggle (see AppShell's role
 * switcher) so the restricted view can be demonstrated live. It is NOT a security boundary.
 * When real Supabase Auth is connected, this must be re-implemented as Row-Level Security
 * policies — a client-side role check can always be bypassed. See the reference packet's
 * RLS pattern (../../TCL_REFERENCE_PACKET_AMS/reusable-assets/rls_policies_pattern.sql) for
 * the approach to follow: a `users` profile table + `SECURITY DEFINER` helper functions.
 */
export const ROLES = {
  ADMIN: 'admin',
  COACH: 'coach',
}

export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Master Admin',
  [ROLES.COACH]: 'Coach',
}

/**
 * PLACEHOLDER policy: which top-level views each role may open. Josh has confirmed a coach
 * should see "certain information that is predetermined for them" but has not yet said what —
 * this defaults a coach to read-only views (dashboard, athlete detail, readiness) and hides
 * data-entry/export surfaces (upload, reports) until the real rule is confirmed.
 */
const VIEW_ACCESS = {
  dashboard: [ROLES.ADMIN, ROLES.COACH],
  readiness: [ROLES.ADMIN, ROLES.COACH],
  players: [ROLES.ADMIN, ROLES.COACH],
  upload: [ROLES.ADMIN],
  reports: [ROLES.ADMIN],
  manage: [ROLES.ADMIN],
}

export function canAccessView(role, viewKey) {
  const allowed = VIEW_ACCESS[viewKey]
  return allowed ? allowed.includes(role) : true
}
