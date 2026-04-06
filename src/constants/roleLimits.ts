/**
 * Maximum number of accounts allowed per role.
 * This is the single source of truth — both the frontend auth store
 * and the backend users route import from here (or a copy of this file).
 */
export const ROLE_LIMITS: Record<string, number> = {
  superuser: 1,
  admin: 5,
  agent: 10,
  user: Infinity,
}
