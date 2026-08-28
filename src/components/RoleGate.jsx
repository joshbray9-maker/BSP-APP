import { ROLES } from '../lib/roles.js'

/**
 * Declarative role-gated rendering — UX layer only, adapted from the reference project's
 * RoleGate.jsx. See src/lib/roles.js for why this is not a real security boundary yet.
 */
export default function RoleGate({ role, allow, children, fallback = null }) {
  if (!allow || allow.includes(role)) return children
  return fallback
}

export { ROLES }
