# Fix Won Leads Missing — Pagination Limit Increase

> **Status:** In Progress

## Root Cause

`fetchLeads(page=1, limit=200)` only loads 200 leads per page. Database has 620+
leads ordered by `updated_at DESC`. Won leads (last updated April 2026) fall off
page 1 and never load in the frontend.

## Changes

### 1. `src/stores/leads.ts` — Raise limit + fix merge
- Default limit: 200 → 5000
- Add merge logic when `since` is set (sync no longer replaces all leads)

### 2. `backend/src/routes/leads.ts` — Raise max limit
- Max limit: 500 → 10000
- Default page limit: 200 → 500

## Deployment

1. Build frontend + backend
2. SCP to production server
3. Docker compose rebuild frontend + backend
4. Verify all 620+ leads load including won leads
