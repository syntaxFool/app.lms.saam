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
```bash
# From local machine
rsync -avz --exclude node_modules --exclude .git --exclude dist --exclude dev-dist \
  --exclude backend/node_modules --exclude backend/dist \
  -e "ssh -p 2222 -i ~/.ssh/id_ed25519_nas" \
  . nas@154.84.215.26:/home/nas/lms-app/

# On server
ssh -p 2222 -i ~/.ssh/id_ed25519_nas nas@154.84.215.26 \
  "cd /home/nas/lms-app && docker compose up -d --build"
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
