# Subdomain Restructure Plan — Academy & HP LMS

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Split the single `lms.aika-shuz.fyi` domain into three subdomains: a landing page at the root domain, Academy LMS at `ac-lms.aika-shuz.fyi`, and Hair Patch LMS at `hp-lms.aika-shuz.fyi`.

**Architecture:** DNS is managed via Cloudflare (A records → `154.84.215.26`). Traefik handles SSL termination and routing based on Host header. Each LMS instance runs its own Docker Compose stack with isolated DB + API + Web + Nginx containers. A new static landing page container will serve the root domain.

**Tech Stack:** Cloudflare DNS, Traefik (Let's Encrypt), Docker Compose, Nginx, Vue 3 + Vite (PWA), Node.js/Express backend, PostgreSQL

**Risk:** Medium. DNS propagation is gradual (~5 min). Downtime per stack: ~30 seconds during container restart. Backward-compatible — old domains (`lms.aika-shuz.fyi`, `hplms.aika-shuz.fyi`) will get a redirect.

---

## Current State

```
lms.aika-shuz.fyi    ──→ Academy LMS (docker-compose.yml)
hplms.aika-shuz.fyi  ──→ HP LMS (docker-compose.hp.yml)
```

## Target State

```
lms.aika-shuz.fyi    ──→ Landing page (links to both)
ac-lms.aika-shuz.fyi ──→ Academy LMS (docker-compose.yml)
hp-lms.aika-shuz.fyi ──→ HP LMS (docker-compose.hp.yml)
```

---

### All Files That Need Changes

| File / Resource | What to Change |
|---|---|
| **Cloudflare DNS** | Add A records for `ac-lms.aika-shuz.fyi` and `hp-lms.aika-shuz.fyi` |
| `docker-compose.yml` | Traefik Host labels: `lms.aika-shuz.fyi` → `ac-lms.aika-shuz.fyi` |
| `docker-compose.hp.yml` | Traefik Host labels: `hplms.aika-shuz.fyi` → `hp-lms.aika-shuz.fyi` |
| `docker-compose.traefik.yml` | Same Traefik Host changes (if used) |
| `nginx/nginx.conf` | Update `server_name` comment (cosmetic) |
| `nginx/nginx-hp.conf` | Update `server_name hplms.aika-shuz.fyi` → `hp-lms.aika-shuz.fyi` |
| `.env` (local + NAS) | `ALLOWED_ORIGINS=https://lms.aika-shuz.fyi,...` → all 3 domains |
| `.env.example` | Same `ALLOWED_ORIGINS` update |
| `src/main.ts` | `tracePropagationTargets: ['lms.aika-shuz.fyi', ...]` → include new domains |
| `vite.config.ts` | Bump PWA `cacheId` to force new service worker |
| **Landing page** *(new)* | Static HTML + new Docker Compose landing service or added to nginx |
| `docs/URL_CHANGE_FIX.md` | Update domain references |
| `system-server.md` | Update server doc |
| `.pi/skills/deploy/SKILL.md` | Update deploy skill domain references |
| `.pi/agents/deploy.md` | Update deploy agent domain references |

---

## Task Breakdown

### Phase 1: DNS (Manual — done by user)

**Task 1: Add Cloudflare DNS records**

1. Log into Cloudflare dashboard for `aika-shuz.fyi`
2. Add two new A records (proxied 🟠):
   - `ac-lms` → `154.84.215.26` (☁️ proxied)
   - `hp-lms` → `154.84.215.26` (☁️ proxied)
3. Wait 2-5 minutes for DNS propagation

**Step 1: Verify DNS**

```bash
dig +short ac-lms.aika-shuz.fyi
dig +short hp-lms.aika-shuz.fyi
```

Expected: Returns `154.84.215.26` (or Cloudflare proxied IPs).

---

### Phase 2: Landing Page

**Task 2: Create landing page container/compose**

**Files:**
- Create: `landing/index.html`
- Create: `landing/Dockerfile`
- Modify: `docker-compose.yml` (add landing service + Traefik labels for root domain)

**Step 1: Create `landing/index.html`**

A simple static page with links to both LMS instances:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LeadFlow LMS</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen flex items-center justify-center">
  <div class="text-center max-w-md mx-auto p-8">
    <h1 class="text-3xl font-bold text-slate-800 mb-2">LeadFlow LMS</h1>
    <p class="text-slate-500 mb-8">Select your instance</p>
    <div class="space-y-4">
      <a href="https://ac-lms.aika-shuz.fyi"
         class="block w-full py-4 px-6 bg-blue-600 text-white rounded-xl font-semibold
                hover:bg-blue-700 transition shadow-lg shadow-blue-200">
        🎓 Academy LMS
      </a>
      <a href="https://hp-lms.aika-shuz.fyi"
         class="block w-full py-4 px-6 bg-emerald-600 text-white rounded-xl font-semibold
                hover:bg-emerald-700 transition shadow-lg shadow-emerald-200">
        💇 Hair Patch LMS
      </a>
    </div>
  </div>
</body>
</html>
```

**Step 2: Create `landing/Dockerfile`**

```dockerfile
FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
```

**Step 3: Add landing service to `docker-compose.yml`**

Insert after the `nginx` service (before `volumes:`):

```yaml
  landing:
    build:
      context: ./landing
      dockerfile: Dockerfile
    container_name: lms_landing
    restart: unless-stopped
    networks:
      - lms_net
      - coolify
    labels:
      - "traefik.enable=true"
      # ── Landing page: lms.aika-shuz.fyi ──
      - "traefik.http.routers.lms-landing.rule=Host(`lms.aika-shuz.fyi`)"
      - "traefik.http.routers.lms-landing.entrypoints=https"
      - "traefik.http.routers.lms-landing.tls=true"
      - "traefik.http.routers.lms-landing.tls.certresolver=letsencrypt"
      - "traefik.http.services.lms-landing.loadbalancer.server.port=80"
      - "traefik.docker.network=coolify"
      # HTTP → HTTPS redirect for landing
      - "traefik.http.routers.lms-landing-http.rule=Host(`lms.aika-shuz.fyi`)"
      - "traefik.http.routers.lms-landing-http.entrypoints=http"
      - "traefik.http.routers.lms-landing-http.middlewares=redirect-to-https"
```

---

### Phase 3: Docker Compose & Traefik Labels

**Task 3: Update `docker-compose.yml` — Academy stack**

**Files:**
- Modify: `docker-compose.yml`
- Modify: `docker-compose.traefik.yml` (if it's the active compose file)

**Step 1: Change nginx service Traefik labels**

Find the `nginx` service in `docker-compose.yml`. Replace the Academy labels:

```yaml
# BEFORE
- "traefik.http.routers.lms.rule=Host(`lms.aika-shuz.fyi`)"
- "traefik.http.routers.lms.entrypoints=https"
...
- "traefik.http.routers.lms-http.rule=Host(`lms.aika-shuz.fyi`)"

# AFTER
- "traefik.http.routers.lms.rule=Host(`ac-lms.aika-shuz.fyi`)"
- "traefik.http.routers.lms.entrypoints=https"
...
- "traefik.http.routers.lms-http.rule=Host(`ac-lms.aika-shuz.fyi`)"
```

**Step 2: Update old redirect**

The `sa0lms.myaddr.tools` redirect should now point to the new Academy domain:

```yaml
# BEFORE
- "traefik.http.middlewares.lms-old-redirect.redirectregex.replacement=https://lms.aika-shuz.fyi$${1}"

# AFTER
- "traefik.http.middlewares.lms-old-redirect.redirectregex.replacement=https://ac-lms.aika-shuz.fyi$${1}"
```

**Step 3: Commit**

```bash
git add docker-compose.yml docker-compose.traefik.yml
git commit -m "feat: route Academy LMS to ac-lms.aika-shuz.fyi, add landing page at root domain"
```

---

**Task 4: Update `docker-compose.hp.yml` — HP stack**

**Files:**
- Modify: `docker-compose.hp.yml`

**Step 1: Update Traefik Host labels and ALLOWED_ORIGINS**

```yaml
# BEFORE
ALLOWED_ORIGINS:  https://hplms.aika-shuz.fyi
...
- "traefik.http.routers.lms-hp.rule=Host(`hplms.aika-shuz.fyi`)"
- "traefik.http.routers.lms-hp-http.rule=Host(`hplms.aika-shuz.fyi`)"

# AFTER
ALLOWED_ORIGINS:  https://hp-lms.aika-shuz.fyi
...
- "traefik.http.routers.lms-hp.rule=Host(`hp-lms.aika-shuz.fyi`)"
- "traefik.http.routers.lms-hp-http.rule=Host(`hp-lms.aika-shuz.fyi`)"
```

**Step 2: Commit**

```bash
git add docker-compose.hp.yml
git commit -m "feat: route HP LMS to hp-lms.aika-shuz.fyi"
```

---

### Phase 4: Nginx Configuration

**Task 5: Update nginx configs**

**Files:**
- Modify: `nginx/nginx.conf`
- Modify: `nginx/nginx-hp.conf`

**Step 1: `nginx/nginx.conf`** — update server_name

```nginx
# BEFORE
server_name sa0lms.myaddr.tools;

# AFTER  
server_name ac-lms.aika-shuz.fyi;
```

**Step 2: `nginx/nginx-hp.conf`** — update server_name

```nginx
# BEFORE
server_name hplms.aika-shuz.fyi;

# AFTER
server_name hp-lms.aika-shuz.fyi;
```

**Step 3: Commit**

```bash
git add nginx/nginx.conf nginx/nginx-hp.conf
git commit -m "chore: update nginx server_name to new subdomains"
```

---

### Phase 5: Application Code & Environment

**Task 6: Update `.env` and `.env.example`**

**Files:**
- Modify: `.env`
- Modify: `.env.example`

**Step 1: Update ALLOWED_ORIGINS**

```bash
# BEFORE
ALLOWED_ORIGINS=https://lms.aika-shuz.fyi,http://localhost:3000

# AFTER
ALLOWED_ORIGINS=https://lms.aika-shuz.fyi,https://ac-lms.aika-shuz.fyi,https://hp-lms.aika-shuz.fyi,http://localhost:3000
```

**Step 2: Commit**

```bash
git add .env .env.example
git commit -m "chore: update ALLOWED_ORIGINS with new subdomains"
```

---

**Task 7: Update `src/main.ts` — Sentry trace targets**

**Files:**
- Modify: `src/main.ts`

**Step 1: Update tracePropagationTargets**

```typescript
// BEFORE (line 42)
tracePropagationTargets: ['lms.aika-shuz.fyi', /^\/api\//],

// AFTER
tracePropagationTargets: ['lms.aika-shuz.fyi', 'ac-lms.aika-shuz.fyi', 'hp-lms.aika-shuz.fyi', /^\/api\//],
```

**Step 2: Commit**

```bash
git add src/main.ts
git commit -m "chore: add new subdomains to Sentry trace propagation targets"
```

---

**Task 8: Update `vite.config.ts` — Force new service worker**

**Files:**
- Modify: `vite.config.ts`

**Step 1: Bump cacheId from `shanuzz-lms-v3` → `shanuzz-lms-v4`**

Without this, users who accessed the old domain may have the old service worker cached with stale config.

```bash
git add vite.config.ts
git commit -m "chore: bump PWA cacheId to force new service worker for domain change"
```

---

### Phase 6: Documentation

**Task 9: Update docs**

**Files:**
- Modify: `docs/URL_CHANGE_FIX.md`
- Modify: `system-server.md`
- Modify: `.pi/skills/deploy/SKILL.md`
- Modify: `.pi/agents/deploy.md`

**Step 1: Replace old domain references**

Search each file for `lms.aika-shuz.fyi`, `hplms.aika-shuz.fyi` and replace with new URLs as appropriate.

**Step 2: Commit**

```bash
git add docs/URL_CHANGE_FIX.md system-server.md .pi/skills/deploy/SKILL.md .pi/agents/deploy.md
git commit -m "docs: update domain references to new subdomain structure"
```

---

### Phase 7: Deploy

**Task 10: Deploy to NAS**

This task requires the DNS changes from Phase 1 to be live first.

**Step 1: Backup databases**

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "bash /home/nas/scripts/backup-lms.sh && bash /home/nas/scripts/backup-hp.sh"
```

**Step 2: Build locally to verify**

```bash
npm run build
```

Expected: `✓ built in X.XXs` — exit 0.

**Step 3: Rsync source to NAS**

```bash
rsync -avz \
  -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='dev-dist' \
  --exclude='.env' --exclude='.env.production' --exclude='.env.local' \
  "./" nas@154.84.215.26:/home/nas/lms-app/
```

**Step 4: Rebuild Academy stack**

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "cd /home/nas/lms-app && docker compose up -d --build"
```

**Step 5: Rebuild HP stack**

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "cd /home/nas/lms-app && docker compose -f docker-compose.hp.yml up -d --build"
```

**Step 6: Restart nginx containers**

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "docker restart lms_nginx lms_hp_nginx"
```

**Step 7: Verify all 3 subdomains**

```bash
curl -s -o /dev/null -w "%{http_code}" https://lms.aika-shuz.fyi/     # landing → 200
curl -s -o /dev/null -w "%{http_code}" https://ac-lms.aika-shuz.fyi/  # academy → 200
curl -s -o /dev/null -w "%{http_code}" https://hp-lms.aika-shuz.fyi/  # hp → 200
```

**Step 8: Push to GitHub**

```bash
git push origin master
```

---

### Phase 8: Forwarding old → new (Post-Deploy)

**Task 11: Redirect old HP domain to new one**

**Files:**
- Modify: `docker-compose.hp.yml` (add redirect middleware)

Add a redirect router in the HP nginx service to forward `hplms.aika-shuz.fyi` → `hp-lms.aika-shuz.fyi`:

```yaml
# Add these Traefik labels to the lms_hp_nginx service:
- "traefik.http.middlewares.hp-old-redirect.redirectregex.regex=^https://hplms\\.aika-shuz\\.fyi(.*)"
- "traefik.http.middlewares.hp-old-redirect.redirectregex.replacement=https://hp-lms.aika-shuz.fyi$${1}"
- "traefik.http.middlewares.hp-old-redirect.redirectregex.permanent=true"
- "traefik.http.routers.lms-hp-old.rule=Host(`hplms.aika-shuz.fyi`)"
- "traefik.http.routers.lms-hp-old.entrypoints=https"
- "traefik.http.routers.lms-hp-old.tls=true"
- "traefik.http.routers.lms-hp-old.middlewares=hp-old-redirect"
```

Similarly for the Academy, the old `lms.aika-shuz.fyi` → Academy now redirects via the landing page container — but we may want a permanent redirect from old Academy paths to new ones. This can be done with Traefik's `RedirectRegex` middleware on the landing service.

---

## Summary

| Task | What | Risk |
|------|------|------|
| 1 | Add DNS records (Cloudflare) | Low — manual step by user |
| 2 | Create landing page + add service | Low — new static content |
| 3 | Update Academy compose Traefik labels | Medium — domain change, backward-compatible with old redirect |
| 4 | Update HP compose Traefik labels | Medium — domain change |
| 5 | Update nginx server_name | Low — cosmetic behind Traefik |
| 6 | Update .env ALLOWED_ORIGINS | Low — additive |
| 7 | Update Sentry trace targets | Low — additive |
| 8 | Bump PWA cacheId | Low — forces new SW |
| 9 | Update docs | Low |
| 10 | Deploy all to NAS | Medium — 30s downtime per stack |
| 11 | Add old→new redirects | Low — adds forwarding |

**Estimated effort:** 2-3 hours total (including DNS propagation wait)

**Downtime:** ~30 seconds per LMS stack during container recreation. No database downtime.

**Rollback:** All changes are in docker-compose files and nginx configs. Git revert + redeploy restores old state within minutes.
