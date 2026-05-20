# Fix: Admin Password Change — Wrong Parameter Index Bug

**Date:** 2026-05-20
**Affected endpoint:** `PUT /api/users/:id` (admin/superuser editing another user's password)
**Severity:** Medium — silently corrupts passwords instead of setting the intended value

---

## The Bug

**File:** `backend/src/routes/users.ts`  
**Line:** ~121 (inside `router.put('/:id', ...)` handler)  
**Symptom:** When an admin changes a user's password via the User Management modal, the password is set to the **user's UUID** instead of the new password. Afterward, the user cannot log in (bcrypt.compare fails against the UUID string).

### Root Cause

The SQL parameter numbering is wrong when `password` is provided:

```typescript
let passwordClause = ''
const params: any[] = [name || null, mobile || null, role || null, id]  // 4 elements

if (password) {
  const hashed = await bcrypt.hash(password, 12)
  passwordClause = ', password = $5'       // ← BUG: should be $4
  params.splice(3, 0, hashed)              // inserts hashed at index 3
  // params is now: [name, mobile, role, hashed, id] — 5 elements
}                                           //          $1    $2    $3   $4    $5

// SQL uses $${params.length} = $5 for WHERE id = $5, so:
// password = $5  → maps to params[4] = id (the UUID) ❌
// WHERE id = $5  → maps to params[4] = id (correct for WHERE) ✓
// $4 = hashed   → NEVER USED in the SQL                ❌
```

The hashed password at `params[3]` (`$4`) is never referenced. `$5` is used twice — once for password (wrong) and once for WHERE (correct).

### Why the user saw a 500

The 500 is a secondary symptom. The SQL itself is syntactically valid and the parameter count matches — PostgreSQL wouldn't reject it. A 500 may come from:

1. **A session timeout** — the `requireAuth` middleware checks for recent session activity (40-minute window). If the admin's session is stale while the form was open, the session check itself might fail, causing the middleware to bail with 401 or a DB error from the session query.

2. **A Zod v4-specific validation edge case** — the `updateUserSchema` is validated against Zod v4 (`^4.3.6`), which has known breaking changes vs v3. An empty/malformed field could cause validation to fail in an unexpected way.

3. **Environmental** — DB pool exhaustion, connection timeout, etc.

**However, even if the 500 is intermittent, the `$4` bug is deterministic** — every time an admin changes a password, it silently sets the password to the UUID instead of the intended value. This is the primary bug and must be fixed regardless.

---

## The Fix

**Change `passwordClause = ', password = $5'` to `passwordClause = ', password = $4'`**

After the fix:

```typescript
if (password) {
  const hashed = await bcrypt.hash(password, 12)
  passwordClause = ', password = $4'       // ✓ $4 = hashed
  params.splice(3, 0, hashed)              // hashed is now at index 3
}
```

Generated SQL:
```sql
UPDATE users SET
  name   = COALESCE($1, name),    -- $1 = name     ✓
  mobile = COALESCE($2, mobile),  -- $2 = mobile   ✓
  role   = COALESCE($3::user_role, role), -- $3 = role ✓
  password = $4,                  -- $4 = hashed   ✓
  updated_at = NOW()
WHERE id = $5                     -- $5 = id       ✓
```

All parameters correctly mapped. The password gets set to the newly hashed value.

## Files to Change

| File | Change |
|------|--------|
| `backend/src/routes/users.ts` | `', password = $5'` → `', password = $4'` |
| `backend/dist/routes/users.js` | Same change in compiled output (for immediate deploy) |

---

## Steps

1. **Fix source** — change `'$5'` to `'$4'` in `backend/src/routes/users.ts`
2. **Fix dist** — same change in `backend/dist/routes/users.js`
3. **Build & verify** — run `cd backend && npm run build` and confirm no TypeScript errors
4. **Deploy** — rebuild the backend Docker container:
   ```bash
   docker compose build backend && docker compose up -d backend
   ```
5. **Smoke test** — log in as superuser, edit a user, change only their password (leave name/role as-is), then log out and log in as that user with the new password
6. **Check logs** — after deploy, monitor `docker compose logs -f backend` for any remaining errors

---

## Optional Follow-up: Defensive Improvement

To prevent future parameter-indexing bugs, consider restructuring the handler to use named parameters or a query builder. Minimal change: compute the password index dynamically:

```typescript
if (password) {
  const hashed = await bcrypt.hash(password, 12)
  const pwdIdx = params.length + 1  // would be 4
  passwordClause = `, password = $${pwdIdx}`
  params.push(hashed)
  // params: [name, mobile, role, id, hashed] — 5 elements
  // WHERE id = $4, password = $5
}
```

This avoids hardcoded `$N` values entirely.
