# Hair Patch Landing Page Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Build a static landing page at `hp-landing.aika-shuz.fyi` that captures hair patch leads via a form that POSTs to the existing HP LMS backend API.

**Architecture:** Single static `index.html` with Tailwind CDN, served by nginx:alpine. The form POSTs directly to `https://hp-lms.aika-shuz.fyi/api/leads` using the `X-API-Key` header (MOON_API_KEY) for authentication. A new `landing` service is added to `docker-compose.hp.yml` with its own Traefik labels for `hp-landing.aika-shuz.fyi`.

**Tech Stack:** Static HTML, Tailwind CSS CDN, vanilla JavaScript (fetch API), nginx:alpine, Docker Compose, Traefik

---

## Design Reference

### Field Mapping (Form → Backend)

| Form Field | Backend Field | Required | Notes |
|---|---|---|---|
| Name | `name` | No | |
| Contact Number | `phone` | **Yes** | |
| Age | `age` | No | |
| Location | `location` | No | |
| Profession | `notes` (appended) | No | Combined with enquiry text |
| *(hardcoded)* | `interest: "Hair Patch"` | — | Always set |
| *(hardcoded)* | `source: "hp-landing"` | — | Always set |
| *(hardcoded)* | `status: "New"` | — | Always set |

### Layout
- **Hero section**: emerald badge, headline, subtext, 3 benefit bullets
- **Form section**: card container with emerald accent, stacked fields, submit button with loading/success/error states
- **Responsive**: max-w-lg centered, full-width on mobile

---

## Tasks

### Task 1: Create landing page HTML with hero + form

**TDD scenario:** New feature — manual visual verification

**Files:**
- Create: `hp-landing.aika-shuz.fyi/index.html`

**Step 1: Write the HTML page**

The complete landing page with:
- Tailwind CDN for styling
- Emerald/green color scheme matching existing brand
- Hero section with badge, headline, subtext, benefit bullets
- Form section with all 6 fields: Name, Contact Number, Age, Location, Profession, Hair Patch Enquiry (title)
- JavaScript form handler that POSTs to `https://hp-lms.aika-shuz.fyi/api/leads`
- Loading spinner on submit button
- Success banner (green) on successful submission
- Error banner (red) with API error message on failure
- Validation: phone is required, age must be 1-120 if provided
- X-API-Key header from inline config (value from .env MOON_API_KEY)

**Step 2: Visual verification**

Open `hp-landing.aika-shuz.fyi/index.html` in a browser directly (file:// protocol) to verify:
- Hero renders correctly with emerald badges and bullets
- Form renders with all fields
- Responsive layout at mobile and desktop widths
- Form validation triggers on empty phone
- Success/error states display correctly (mock the fetch call for testing)

**Step 3: Code review the HTML**

Check:
- All form fields present and correctly named
- API endpoint URL is correct (`https://hp-lms.aika-shuz.fyi/api/leads`)
- X-API-Key header is included
- Error handling extracts `response.data.error` from the API response
- No console errors
- Semantic HTML (labels, proper input types, accessible)

**Step 4: Commit**

```bash
git add hp-landing.aika-shuz.fyi/index.html
git commit -m "feat: add hair patch landing page with lead capture form"
```

---

### Task 2: Create Dockerfile for landing page

**TDD scenario:** New file — follows existing pattern

**Files:**
- Create: `hp-landing.aika-shuz.fyi/Dockerfile`

**Step 1: Write Dockerfile**

```dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html
```

(Exact same pattern as `landing/Dockerfile`)

**Step 2: Commit**

```bash
git add hp-landing.aika-shuz.fyi/Dockerfile
git commit -m "feat: add Dockerfile for hp-landing nginx container"
```

---

### Task 3: Add MOON_API_KEY and fix CORS in docker-compose.hp.yml backend env

**TDD scenario:** Modify existing config — two-line additions

**Files:**
- Modify: `docker-compose.hp.yml` (backend service environment block)

**Step 1: Add MOON_API_KEY**

In `docker-compose.hp.yml`, under the `backend` service's `environment` section, add:
```yaml
      MOON_API_KEY:     ${MOON_API_KEY}
```

This allows the `allowApiKey` middleware to authenticate landing page form submissions.

**Step 2: Add hp-landing origin to ALLOWED_ORIGINS**

The backend CORS middleware (`backend/src/index.ts`) checks `ALLOWED_ORIGINS` (comma-separated). Currently:
```yaml
      ALLOWED_ORIGINS:  https://hp-lms.aika-shuz.fyi
```

Update to include the landing subdomain:
```yaml
      ALLOWED_ORIGINS:  https://hp-lms.aika-shuz.fyi,https://hp-landing.aika-shuz.fyi
```

This is required because the landing page on `hp-landing.aika-shuz.fyi` makes cross-origin POST requests to `hp-lms.aika-shuz.fyi/api/leads`.

**Step 3: Verify**

```bash
grep -E "MOON_API_KEY|ALLOWED_ORIGINS" docker-compose.hp.yml
```
Expected: Both lines appear under the backend environment block with correct values.

**Step 4: Commit**

```bash
git add docker-compose.hp.yml
git commit -m "fix: add MOON_API_KEY and hp-landing CORS origin to hp backend"
```

---

### Task 4: Add landing service to docker-compose.hp.yml

**TDD scenario:** Modify existing config — add new service block + network + volume

**Files:**
- Modify: `docker-compose.hp.yml`

**Step 1: Add the landing service block**

Add after the `nginx` service (before `volumes:`):

```yaml
  landing:
    build:
      context: ./hp-landing.aika-shuz.fyi
      dockerfile: Dockerfile
    container_name: lms_hp_landing
    restart: unless-stopped
    networks:
      - lms_hp_net
      - coolify
    labels:
      - "traefik.enable=true"
      # ── Hair Patch Landing: hp-landing.aika-shuz.fyi ──
      - "traefik.http.routers.hp-landing.rule=Host(`hp-landing.aika-shuz.fyi`)"
      - "traefik.http.routers.hp-landing.entrypoints=https"
      - "traefik.http.routers.hp-landing.tls=true"
      - "traefik.http.routers.hp-landing.tls.certresolver=letsencrypt"
      - "traefik.http.services.hp-landing.loadbalancer.server.port=80"
      - "traefik.docker.network=coolify"
      # HTTP → HTTPS redirect
      - "traefik.http.routers.hp-landing-http.rule=Host(`hp-landing.aika-shuz.fyi`)"
      - "traefik.http.routers.hp-landing-http.entrypoints=http"
      - "traefik.http.routers.hp-landing-http.middlewares=redirect-to-https"
```

**Step 2: Verify YAML structure**

```bash
docker compose -f docker-compose.hp.yml config --quiet
```
Expected: No errors, valid compose file.

**Step 3: Commit**

```bash
git add docker-compose.hp.yml
git commit -m "feat: add hp-landing service with Traefik routing"
```

---

### Task 5: Verify and review the complete setup

**TDD scenario:** Manual verification — check all files are consistent

**Step 1: File inventory**

Verify all files exist and are correct:
```bash
ls -la hp-landing.aika-shuz.fyi/
cat hp-landing.aika-shuz.fyi/Dockerfile
grep MOON_API_KEY docker-compose.hp.yml
grep "hp-landing" docker-compose.hp.yml
```

**Step 2: Cross-reference checks**

- [ ] `index.html` POSTs to correct URL: `https://hp-lms.aika-shuz.fyi/api/leads`
- [ ] `index.html` includes `X-API-Key` header in fetch
- [ ] `index.html` field names match `createLeadSchema` (phone, name, age, location, interest, source, notes)
- [ ] `Dockerfile` copies `index.html` to the correct nginx path
- [ ] `docker-compose.hp.yml` backend has `MOON_API_KEY`
- [ ] `docker-compose.hp.yml` landing service has correct Traefik host rule
- [ ] No CORS issues — landing page and API are on different subdomains but the backend has wildcard or specific origins? Verify `ALLOWED_ORIGINS` includes the landing subdomain

**Step 3: CORS check**

Already handled in Task 3 — verify ALLOWED_ORIGINS includes hp-landing.aika-shuz.fyi.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final review and verification of hp-landing setup"
```
