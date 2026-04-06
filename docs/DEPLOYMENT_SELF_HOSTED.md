# Self-Hosted Deployment — webApp x LMS x Shanuzz

## Live URL
**https://sa0lms.myaddr.tools**

---

## Stack

| Layer | Technology | Container |
|---|---|---|
| Frontend | Vue 3 + Vite → Nginx | `lms_web` |
| API | Node 20 + Express + TypeScript | `lms_api` |
| Database | PostgreSQL 16 | `lms_db` |
| Reverse Proxy / SSL | Nginx → Traefik (Coolify) | `lms_nginx` |

**Server:** `nas-office` — `154.84.215.26:2222` (SSH key: `~/.ssh/id_ed25519_nas`)  
**DNS:** `sa0lms.myaddr.tools` via [myaddr.tools](https://myaddr.tools) dynamic DNS

---

## Project Structure

```
/
├── backend/                  Express API
│   ├── src/
│   │   ├── index.ts          Entry point, Express app + middleware
│   │   ├── db.ts             PostgreSQL pool + query helpers
│   │   ├── middleware/
│   │   │   └── auth.ts       JWT requireAuth / requireRole middleware
│   │   └── routes/
│   │       ├── auth.ts       POST /api/auth/login, GET /api/auth/validate
│   │       ├── leads.ts      Full CRUD + tasks + activities
│   │       └── users.ts      User management with role limits
│   ├── db/migrations/
│   │   └── 001_init.sql      Schema: users, leads, activities, tasks
│   ├── Dockerfile
│   └── package.json
├── src/                      Vue 3 frontend (unchanged structure)
│   ├── services/api.ts       REST client — replaced gasApi
│   ├── services/auth.ts      Uses /api/auth/* endpoints
│   └── ...
├── nginx/nginx.conf          Root nginx: routes / → web, /api/ → backend
├── nginx-frontend.conf       In-container nginx for SPA fallback
├── Dockerfile                Frontend multi-stage build
├── docker-compose.yml        All 4 services + Traefik labels
└── .env.example              Required environment variables
```

---

## Environment Variables

Create `/home/nas/lms-app/.env` on the server:

```env
DB_NAME=lmsdb
DB_USER=lms
DB_PASSWORD=<strong_password>
JWT_SECRET=<min_32_char_random_string>
ALLOWED_ORIGINS=https://sa0lms.myaddr.tools
```

---

## API Reference

### Auth
| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | `{ uid, password }` | — |
| GET | `/api/auth/validate` | — | Bearer |
| POST | `/api/auth/logout` | — | Bearer |

### Leads
| Method | Path | Auth | Role |
|---|---|---|---|
| GET | `/api/leads?since=<ms>` | Bearer | any |
| POST | `/api/leads` | Bearer | agent+ |
| PUT | `/api/leads/:id` | Bearer | agent+ |
| DELETE | `/api/leads/:id` | Bearer | admin+ |
| PUT | `/api/leads/bulk` | Bearer | agent+ |
| DELETE | `/api/leads/bulk` | Bearer | admin+ |
| GET | `/api/leads/check-updates?since=<ms>` | Bearer | any |
| POST | `/api/leads/:id/activities` | Bearer | any |
| POST | `/api/leads/:id/tasks` | Bearer | any |
| PUT | `/api/leads/:id/tasks/:taskId` | Bearer | any |
| DELETE | `/api/leads/:id/tasks/:taskId` | Bearer | any |

### Users
| Method | Path | Auth | Role |
|---|---|---|---|
| GET | `/api/users` | Bearer | admin+ |
| POST | `/api/users` | Bearer | admin+ |
| PUT | `/api/users/:id` | Bearer | admin+ |
| DELETE | `/api/users/:id` | Bearer | superuser |

### Health
```
GET /api/health  →  { success: true, status: "ok", ts: <epoch> }
```

---

## Role System

| Role | Limit | Permissions |
|---|---|---|
| `superuser` | 1 | Full access, delete users |
| `admin` | 5 | Manage users/leads, no superuser creation |
| `agent` | 10 | Create/update leads, tasks |
| `user` | ∞ | Read only |

---

## Default Login

> **Change the password immediately after first login.**

| Field | Value |
|---|---|
| Username | `superuser` |
| Password | `changeme123` |

---

## Server Operations

### SSH into server
```bash
ssh -p 2222 -i ~/.ssh/id_ed25519_nas nas@154.84.215.26
cd /home/nas/lms-app
```

### View logs
```bash
docker logs lms_api -f
docker logs lms_db -f
docker logs lms_nginx -f
```

### Restart services
```bash
docker compose restart
```

### Redeploy after code changes

> **Important:** The deploy directory on the NAS (`/home/nas/lms-app`) is **not a git repo** — code is rsynced from local. Never `git pull` on the server.

**Step 1 — Commit and push (local)**
```bash
cd "/Drive/codeProject/Shanuzz/App-Tools/webApp x LMS"
git add -A
git commit -m "your message"
git push origin master
```

**Step 2 — Rsync to NAS (local)**
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
  "/Drive/codeProject/Shanuzz/App-Tools/webApp x LMS/" \
  nas@154.84.215.26:/home/nas/lms-app/
```

**Step 3 — Rebuild containers (local → runs on NAS)**
```bash
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "cd /home/nas/lms-app && docker compose up -d --build && docker restart lms_nginx"
```

> **Why `docker restart lms_nginx`?** The nginx reverse proxy container is not rebuilt during the build (it uses a pre-built image), so it keeps stale container IP addresses for `lms_api` and `lms_web`. Restarting it forces Docker DNS re-resolution. Without this step you will get **502 Bad Gateway** immediately after rebuilding.

**One-liner (combines steps 2 + 3)**
```bash
rsync -avz -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  --exclude='.git' --exclude='node_modules' --exclude='dist' \
  --exclude='dev-dist' --exclude='.env' --exclude='.env.production' \
  --exclude='.env.local' \
  "/Drive/codeProject/Shanuzz/App-Tools/webApp x LMS/" \
  nas@154.84.215.26:/home/nas/lms-app/ && \
ssh -i ~/.ssh/id_ed25519_nas -p 2222 nas@154.84.215.26 \
  "cd /home/nas/lms-app && docker compose up -d --build && docker restart lms_nginx"
```

### Database access
```bash
docker exec -it lms_db psql -U lms -d lmsdb
```

### Update DNS record (if server IP changes)
```bash
curl "https://myaddr.tools/update?key=<secret_key>&ip=<new_ip>"
```

---

## Security Notes

- JWT tokens expire after **7 days**
- Login endpoint is rate-limited: **20 requests / 15 min** per IP
- Global rate limit: **300 requests / 15 min** per IP  
- CORS is restricted to `ALLOWED_ORIGINS` only
- Passwords are hashed with **bcrypt (cost 12)**
- Role limits enforced server-side — cannot be bypassed from frontend
