## Worktree Context: implement-complete-moon

**Task:** Implement the complete Moon WhatsApp bridge service as described in docs/MOON_WHATSAPP_PLAN.md.

The plan document is at docs/MOON_WHATSAPP_PLAN.md (in the project root). Read it first, then implement every phase in order:

Phase 1: DB Migration (backend/db/migrations/013_notifications.sql)
Phase 2: Backend (apiKey middleware, schemas, notification routes, register routes, add allowApiKey to leads routes)
Phase 3: Moon Service (whatsapp-moon/ directory with all 8 source files)
Phase 4: Docker (Dockerfile for Moon, docker-compose.yml updates)
Phase 5: Frontend (NotificationDropdown.vue polling update)

Implement ALL phases. Create ALL files. Make ALL file modifications.

IMPORTANT IMPLEMENTATION NOTES:
- The backend is at backend/src/ with routes in backend/src/routes/, Express app at backend/src/index.ts
- The `allowApiKey` middleware must be new (backend/src/middleware/apiKey.ts)
- Notification schemas go in backend/src/schemas.ts at the bottom
- Notification routes go in backend/src/routes/notifications.ts
- Register it in backend/src/index.ts after settings routes
- Add `allowApiKey` to leads.ts for: check-duplicate GET, leads POST, activities POST
- The whatsapp-moon/ is a NEW directory in the project root
- Use TypeScript for Moon service (tsconfig)
- Use @whiskeysockets/baileys for WhatsApp connection
- The phone normalization from JID to LMS format is critical (JID: "918452093228@s.whatsapp.net" → "+91 8452093228")
- Docker Compose updates: add moon service, add moon_auth volume, add MOON_API_KEY to backend env
- Frontend: add server notification polling to NotificationDropdown.vue using the api service

When done, verify by running: git diff --stat to confirm all files were created/modified
**Branch:** feat/whatsapp-moon
**Status:** running
