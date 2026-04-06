/**
 * Maximum number of accounts allowed per role.
 * Keep in sync with src/constants/roleLimits.ts in the frontend.
 */
export const ROLE_LIMITS: Record<string, number> = {
  superuser: 1,
  admin: 5,
  agent: 10,
  user: Infinity,
}
