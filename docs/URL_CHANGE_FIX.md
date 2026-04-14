# URL Change Fix - LeadFlow LMS

**Date**: April 14, 2026  
**Old URL**: `https://sa0lms.myaddr.tools`  
**New URL**: `https://lms.aika-shuz.fyi`

## Problems Encountered

After changing the domain, users experienced:
1. ✅ **Constant logouts** - App kept logging users out intermittently
2. ✅ **Data disappearing on refresh** - Leads would vanish after refresh, requiring re-login
3. ✅ **Incorrect branding** - "LeadFlow India" instead of "LeadFlow LMS"

## Root Cause

**Service Worker Cache Conflict**: The PWA service worker was aggressively caching assets and API responses from the old domain. When users accessed the new domain, the old service worker tried to serve stale cached data, causing authentication and data inconsistencies.

## Fixes Applied

### 1. Service Worker Cache ID Update
- **File**: `vite.config.ts`
- **Change**: Bumped `cacheId` from `'shanuzz-lms-v2'` to `'shanuzz-lms-v3'`
- **Effect**: Forces all clients to download a fresh service worker and clear old cache

### 2. Traefik Domain Label Update
- **File**: `docker-compose.yml`
- **Change**: Updated router rule from `Host('sa0lms.myaddr.tools')` to `Host('lms.aika-shuz.fyi')`
- **Effect**: Traefik now routes the new domain correctly with Let's Encrypt SSL

### 3. Branding Update
- **Files**: `Login.vue`, `app.ts`, `UserManagementModal.vue`
- **Change**: All "LeadFlow India" references changed to "LeadFlow LMS"
- **Effect**: Consistent branding across login page, header, and settings

### 4. Auth Store Export Fix
- **File**: `src/stores/auth.ts`
- **Change**: Added `checkSessionStatus` to the store's return statement
- **Effect**: Fixed TypeScript error preventing inactivity tracking from working correctly

## Deployment Steps

1. ✅ TypeScript validation (frontend + backend)
2. ✅ Git commit and push to GitHub
3. ✅ Rsync source files to server
4. ✅ Rebuild frontend container (new service worker)
5. ✅ Recreate nginx container (new Traefik labels)
6. ✅ Verify deployment

## What Users Need to Do

### Desktop Users
**Hard refresh the browser** to force the new service worker to install:
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R`

### Mobile Users (Android/iOS)
**Clear site data**:
1. Go to browser settings
2. Find "Site settings" or "Clear browsing data"
3. Select "lms.aika-shuz.fyi"
4. Clear cache and cookies
5. Reload the page

OR simply **uninstall and reinstall the PWA**:
1. Remove the app icon from home screen
2. Visit `https://lms.aika-shuz.fyi` in browser
3. Re-add to home screen

## Verification

After hard refresh, users should see:
- ✅ "LeadFlow LMS" branding on login page
- ✅ Stable sessions - no random logouts
- ✅ Persistent data after refresh
- ✅ All leads visible without re-login

## Technical Notes

### CORS Configuration
- **Backend**: `ALLOWED_ORIGINS` was already correctly set to `https://lms.aika-shuz.fyi` in `/home/nas/lms-app/.env`
- **No changes needed** - CORS was never the issue

### DNS & SSL
- **DNS**: Cloudflare proxied A record pointing to `154.84.215.26`
- **SSL**: Traefik + Let's Encrypt automatic certificate
- **Status**: ✅ Valid SSL certificate, HTTP/2 enabled

### Service Worker Strategy
- **Cache ID**: Version bump forces complete cache invalidation
- **Strategy**: `NetworkFirst` for API calls, `CacheFirst` for static assets
- **Cleanup**: `cleanupOutdatedCaches: true` removes old caches automatically

## Files Changed

| File | Change |
|------|--------|
| `docker-compose.yml` | Traefik domain label |
| `vite.config.ts` | Service worker cache ID |
| `src/views/Login.vue` | Branding text |
| `src/stores/app.ts` | Default app name, fallback values |
| `src/stores/auth.ts` | Export `checkSessionStatus` |
| `src/components/UserManagementModal.vue` | Branding text and placeholder |

## Commit

```
be3a2eb - Fix URL change issues: Update domain to lms.aika-shuz.fyi, bump service worker cache, change branding to LeadFlow LMS
```

## Live URL

✅ **https://lms.aika-shuz.fyi**
