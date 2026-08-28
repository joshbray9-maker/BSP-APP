/**
 * Shared shape reference for this codebase (JS + JSDoc, no TypeScript for this MVP).
 * See docs/DATA_MODEL.md for the reasoning behind these shapes.
 *
 * @typedef {Object} Organization
 * @property {string} id
 * @property {string} name
 * @property {string|null} logoUrl
 * @property {string|null} colorPrimary
 * @property {string|null} colorAccent
 *
 * @typedef {Object} Team
 * @property {string} id
 * @property {string} orgId
 * @property {string} name
 * @property {string} sport
 *
 * @typedef {Object} Athlete
 * @property {string} id
 * @property {string} teamId
 * @property {string} displayName
 * @property {string} position
 *
 * @typedef {Object} TestSession
 * @property {string} id
 * @property {string} athleteId
 * @property {string} date  ISO date string, YYYY-MM-DD
 * @property {string} source  'manual-entry' | 'sample-data' | `upload:${filename}`
 * @property {string|null} uploadId
 *
 * @typedef {Object} TestResult
 * @property {string} id
 * @property {string} sessionId
 * @property {string} metricKey
 * @property {number|null} value
 * @property {Object} [raw]
 */

export {}
