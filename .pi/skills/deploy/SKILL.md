---
name: deploy
description: Deploy the webApp x LMS project to production. Verifies git state, builds, deploys via Coolify auto-deploy or manual rsync+Docker to the NAS, and handles Moon WhatsApp pairing.
tools: read, bash, shell_exec, edit
model: sonnet
---

# Deploy Agent — webApp x LMS

You are a deployment automation agent. Your job is to build, deploy, and verify the LMS project.

## Prerequisites

- SSH key: `~/.ssh/id_ed25519_nas` (passwordless)
- NAS: `nas@154.84.215.26` port `2222`
- Remote path: `/home/nas/lms-app/`
- Git remote: `origin` (`https://github.com/syntaxFool/app.lms.saam`)

---

## Moon WhatsApp Pairing

Moon (the WhatsApp-to-LMS bridge) requires a special pairing workflow. **CRITICAL: Never copy `auth_info_moon` session files between machines.** WhatsApp detects IP/device mismatch and permanently kills copied sessions with 503/401 errors.

### When to pair Moon:
- First deployment
- After `auth_info_moon` is cleared
- After Moon logs show "🔴 Logged out from WhatsApp"
- When user says "moon not working", "pair moon", "scan moon QR"

### Pairing Workflow:

```bash
# Step 1: Clear old auth and start Moon on NAS
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "cd /home/nas/lms-app && docker compose -f docker-compose.yml stop moon && docker compose -f docker-compose.yml rm -f moon && rm -rf whatsapp-moon/auth_info_moon/* && docker compose -f docker-compose.yml up -d moon"

# Step 2: Wait 10 seconds for Moon to start, then extract QR
sleep 10
B64=$(ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "docker logs lms_moon 2>&1 | grep 'base64,' | tail -1 | grep -oP 'base64,\K[A-Za-z0-9+/=]+'")
QR_TEXT=$(echo "$B64" | base64 -d)

# Step 3: Generate QR PNG instantly and save to project
npx --yes qrcode -o "whatsapp-moon/nas_qr.png" "$QR_TEXT"
echo "📱 QR saved to whatsapp-moon/nas_qr.png — OPEN NOW and scan with WhatsApp"

# Step 4: Wait and verify pairing
sleep 15
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "docker logs lms_moon 2>&1 | grep -E 'pairing configured|Moon connected'"

# Step 5: If not paired, refresh QR every 12 seconds (up to 5 times)
for i in 1 2 3 4 5; do
  ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
    "docker logs lms_moon 2>&1 | grep -c 'Moon connected'" 2>/dev/null
  CONNECTED=$(ssh ... "docker logs ... | grep -c 'Moon connected'")
  if [ "$CONNECTED" -gt 0 ]; then echo "✅ Moon connected!"; break; fi
  # Refresh QR
  B64=$(ssh ... "docker logs ... | grep 'base64,' | tail -1 | grep -oP 'base64,\K[A-Za-z0-9+/=]+'")
  QR_TEXT=$(echo "$B64" | base64 -d)
  npx --yes qrcode -o "whatsapp-moon/nas_qr.png" "$QR_TEXT"
  echo "🔄 QR refreshed — keep file open"
  sleep 12
done

# Step 6: Verify stability (no 503 errors after 30+ seconds)
sleep 30
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "docker logs lms_moon 2>&1 | grep -E '503|Moon connected' | tail -5"
```

### IMPORTANT NOTES:
- **NEVER copy auth_info_moon between machines** — sessions are IP-locked by WhatsApp
- **DO NOT use MOON_PHONE/pairing codes** — they don't work reliably with Baileys
- **DO NOT use WARP proxy or any proxy** — the NAS office network reaches WhatsApp fine
- QRs expire in ~20 seconds — generate and display them as fast as possible
- Moon connects through Docker bridge network (`lms_net`) — no special networking needed

---

## Deployment Workflow

### Step 1: Assess what changed

Show the user what will be deployed:

```bash
git log origin/master..HEAD --oneline    # unpushed commits
git diff --stat                          # unstaged changes
```

### Step 2: Verify git state

```bash
git branch --show-current
git status --porcelain
```

### Step 3: Build

```bash
# Frontend
npm run build

# WhatsApp moon service
cd whatsapp-moon && npm run build && cd ..
```

### Step 4: Decide deployment path

**Path A — Push to GitHub (Coolify auto-deploy):**
- `git push origin master`

**Path B — Manual rsync + Docker:**
```bash
rsync -avz -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  --exclude='.git' --exclude='node_modules' --exclude='dist' \
  ./ nas@154.84.215.26:/home/nas/lms-app/
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "cd /home/nas/lms-app && docker compose up -d --build"
```

### Step 5: Check Moon status

```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "docker ps --format '{{.Names}}: {{.Status}}' | grep moon"
```

If Moon is in a restart loop or shows "not logged in", follow the Moon Pairing Workflow above.

### Step 6: Verify

```bash
curl -s https://ac-lms.aika-shuz.fyi/ | grep -o 'assets/[^"]*\.js'
curl -s -o /dev/null -w "%{http_code}" https://lms.aika-shuz.fyi/
```
