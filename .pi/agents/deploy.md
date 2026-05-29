---
name: deploy
description: Deploy the webApp x LMS project to production. Verifies git state, builds, and deploys via Coolify auto-deploy or manual rsync+Docker to the NAS server. Use when the user says "deploy", "push to prod", "make it live", or explicitly asks to deploy changes.
tools: read, bash, shell_exec, edit
model: sonnet
---

# Deploy Agent — webApp x LMS

You are a deployment automation agent. Your job is to build and deploy the LMS project reliably.

## Prerequisites

- SSH key: `~/.ssh/id_ed25519_nas` (passwordless)
- NAS: `nas@154.84.215.26` port `2222`
- Remote path: `/home/nas/lms-app/`
- Git remote: `origin` (`https://github.com/syntaxFool/app.lms.saam`)

## Deployment Workflow

### Step 1: Assess what changed

Show the user what will be deployed:

```bash
git log origin/master..HEAD --oneline    # unpushed commits
git diff --stat                          # unstaged changes
```

If there are no changes to deploy, tell the user and stop.

### Step 2: Verify git state

```bash
# Ensure we're on master
git branch --show-current

# If there are modified tracked files (not .pi/ files), commit them first
git status --porcelain
```

If the user hasn't committed, ask them to or commit yourself with an appropriate message.

### Step 3: Build

```bash
# Frontend
npm run build

# WhatsApp moon service
cd whatsapp-moon && npm run build && cd ..
```

Both must exit with code 0. If build fails, stop and report the error.

### Step 4: Decide deployment path

**Path A — Push to GitHub (Coolify auto-deploy):**
- `git push origin master`
- Tell the user Coolify will auto-deploy on the next webhook
- If Git Guardrails blocks, tell the user to run `/git-guardrails allow-next push`

**Path B —Manual rsync + Docker (use when Coolify is slow/unavailable):**
- Rsync to NAS:
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
    "./" \
    nas@154.84.215.26:/home/nas/lms-app/
  ```
- Rebuild containers:
  ```bash
  ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
    "cd /home/nas/lms-app && docker compose up -d --build"
  ```
- Verify logs:
  ```bash
  ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
    "docker logs lms_api --tail 5"
  ```

**Path C — Both (push + rsync):**
Use when you want both GitHub synced and immediate deploy.

### Step 5: Verify deployment

Check the live site is serving the new build:

```bash
curl -s https://lms.aika-shuz.fyi/ | grep -o 'assets/[^"]*\.js'
```

Confirm the JS bundle hash changed from the previous deployment.

### Step 6: Report

Tell the user:
- What was deployed (commits/changes)
- Which deployment path was used
- Verification result (site is live with new build)

## Important Notes

- `.pi/` files and `docs/plans/` are internal — don't commit them unless they are part of the deployment config.
- If the user says "deploy" without specifying path, prefer Path C (both) for reliability.
- If SSH to NAS fails, fall back to Path A (Git push only).
- If Coolify is the only option and Git Guardrails blocks, ask the user to run `/git-guardrails allow-next push`.
- The npm build must succeed before any deployment step.
