/**
 * @fileoverview Shared API contracts between backend and frontend.
 * Import from '@taskmaster/shared-types' in either app.
 * Use JSDoc typedefs here so both sides stay in sync without TypeScript.
 */

/**
 * @typedef {Object} HealthResponse
 * @property {'ok' | 'error'} status
 * @property {'connected' | 'disconnected'} db
 * @property {string} [message] - Present only when status is 'error'
 */

export {};
