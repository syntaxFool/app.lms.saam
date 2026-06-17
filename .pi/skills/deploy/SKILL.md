---
name: deploy
description: Deploy the webApp x LMS project to production. Verifies git state, builds the frontend, pushes to GitHub for Coolify auto-deploy, or performs manual rsync+Docker deploy to the NAS server.
---

> **Related skills:** Use `/skill:verification-before-completion` before deploying. Use `/skill:finishing-a-development-branch` after pushing.

> **Automated deployment:** Use the `deploy` agent (`.pi/agents/deploy.md`) to run the full workflow automatically. Invoke via `Agent` with `subagent_type: "deploy"` and prompt describing what to deploy.

# Deploy — webApp x LMS

## Overview

Two deployment paths exist for this project:

1. **Coolify auto-deploy (default)** — Push to `origin/master` on GitHub. Coolify detects the push, pulls, builds containers, and redeploys. Fastest path for routine patches.
2. **Manual rsync + Docker** — Rsync source to the NAS server, then SSH and rebuild containers. Use when you need immediate deploy or Coolify is unavailable.

---

## Data Safety — Academy DB

The Academy database (`ac-lms.aika-shuz.fyi`) has real data that must never be lost.

### Automated backups (NAS)

A daily cron job runs at 2:00 AM IST on the NAS:
- `pg_dump` → gzip → `/home/nas/backups/lms/lmsdb_YYYY-MM-DD_HHMM.sql.gz`
- Retains last **90 days** of backups
- Logged to `/home/nas/backups/lms/backup.log`

### Pre-deploy backup

Before any deployment that touches containers, take a manual backup:

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "bash /home/nas/scripts/backup-lms.sh"
```

### Restore from backup

```bash
gunzip -c /home/nas/backups/lms/lmsdb_YYYY-MM-DD_HHMM.sql.gz | \
  docker exec -i lms_db psql -U lms lmsdb
```

⚠️ **Never run `docker compose down -v` on the Academy stack** — it destroys the database volume. Use `docker compose down` (without `-v`) to stop gracefully.

---

## Data Safety — HP (Hair Patch) DB

The HP database (`hpac-lms.aika-shuz.fyi`) has the same backup setup.

### Automated backups (NAS)

A daily cron job runs at 2:30 AM IST:
- `pg_dump` → gzip → `/home/nas/backups/hp/lmsdb_hp_YYYY-MM-DD_HHMM.sql.gz`
- Retains last **90 days**
- Logged to `/home/nas/backups/hp/backup.log`

### Pre-deploy backup

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "bash /home/nas/scripts/backup-hp.sh"
```

### Restore from backup

```bash
gunzip -c /home/nas/backups/hp/lmsdb_hp_YYYY-MM-DD_HHMM.sql.gz | \
  docker exec -i lms_hp_db psql -U lms lmsdb
```

⚠️ **Never run `docker compose -f docker-compose.hp.yml down -v` on the HP stack** — same risk.

---

## Prerequisites

- Clean git working tree (`git status` shows no modified tracked files)
- On `master` branch
- `npm run build` passes
- SSH key `~/.ssh/id_ed25519_nas` exists (for manual path)

---

## Path A — Coolify Auto-Deploy (Default)

Use for routine patches, bug fixes, and small features.

### Step 1: Verify git state

```bash
git status --porcelain
```

Confirm: no unstaged changes on tracked files.
Expected output (untracked files like `node_modules/`, `dev-dist/` are OK):

```
 M .pi/superpowers-state.json
?? dev-dist/
```

### Step 2: Build and verify

```bash
npm run build
```

Expected: `✓ built in X.XXs` — exit 0.

### Step 3: Push to GitHub

```bash
git push origin master
```

Expected output lists the pushed commits:
```
   <old-commit>..<new-commit>  master -> master
```

### Step 4: Verify remote is up-to-date

```bash
git fetch origin --quiet && git rev-list --count HEAD..origin/master && git rev-list --count origin/master..HEAD
```

Expected: both commands return `0` (local and remote are in sync).

### Step 5: Confirm on Coolify

- Log into Coolify dashboard
- Check deployment status for the LMS project
- Or visit `https://ac-lms.aika-shuz.fyi` and verify the changes are live

---

## Path B — Manual rsync + Docker Deploy

Use when Coolify auto-deploy fails or you need to bypass GitHub.

### Step 1: Verify git state + build (same as Path A)

```bash
git status --porcelain
npm run build
```

Same checks as Path A.

### Step 2: Rsync source to NAS

```bash
rsync -avz \
  -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='dev-dist' \
  --exclude='.env' \
  --exclude='.env.production' \
  --exclude='.env.local' \
  "/Drive/codeProject/Shanuzz/saLab-server/webApp x LMS/" \
  nas@154.84.215.26:/home/nas/lms-app/
```

### Step 3: Rebuild containers on NAS

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "cd /home/nas/lms-app && docker compose up -d --build"
```

### Step 4: Restart nginx

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "docker restart lms_nginx"
```

### Step 5: Verify logs

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "docker logs lms_api --tail 30"
```

Check for: `Server running on port 8080` and no crash loops.

---

## Rollback

If the deploy breaks the live site:

### Rollback Coolify deploy
1. Log into Coolify dashboard
2. Navigate to the LMS project → Deployments
3. Find the previous working deployment
4. Click "Rollback"

### Rollback manual deploy
```bash
# On the local machine, checkout the previous commit
git checkout HEAD~1 -- .
npm run build

# Then re-run Path B steps 2-4 (rsync + rebuild + nginx restart)
```

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `git push` blocked | Git Guardrails | Run `/git-guardrails allow-next push` then retry |
| `npm run build` fails | TypeScript error | Check console output for error, fix before deploy |
| Coolify not deploying | Webhook missed | Trigger "Manual Deploy" from Coolify dashboard |
| Container crash loop | Docker build issue | `docker logs lms_api` on NAS to see error |
| SSL cert issue | Let's Encrypt renewal | Traefik handles this automatically — wait 5 min |
