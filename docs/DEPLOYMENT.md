# Deployment Guide

> **Note:** This project is deployed as a self-hosted Docker stack (Express + PostgreSQL + nginx).
>
> See **[DEPLOYMENT_SELF_HOSTED.md](DEPLOYMENT_SELF_HOSTED.md)** for the current deployment instructions.

---

The previous Netlify-based deployment is no longer in use. All deployment operations use:

- `docker compose up -d --build` on the NAS server
- rsync to transfer files over SSH
- Traefik as the reverse proxy

Refer to `DEPLOYMENT_SELF_HOSTED.md` for step-by-step instructions.
