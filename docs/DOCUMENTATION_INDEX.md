# Documentation Index — Shanuzz Academy LMS

## Current Architecture
- **Frontend**: Vue 3 + TypeScript + Pinia + Vite + Tailwind CSS
- **Backend**: Express + PostgreSQL (self-hosted Docker)
- **Deployment**: Docker Compose on NAS, Traefik reverse proxy
- **Live URL**: https://sa0lms.myaddr.tools

---

## 📖 Documentation by Topic

### Deployment & Operations
| Document | What It Covers |
|----------|---------------|
| [DEPLOYMENT_SELF_HOSTED.md](DEPLOYMENT_SELF_HOSTED.md) | **Current** — Docker Compose deploy, rsync, SSH commands |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Redirect note → see DEPLOYMENT_SELF_HOSTED.md |
| [PRODUCTION_BUILD.md](PRODUCTION_BUILD.md) | `npm run build`, env vars, build output |

### Developer Reference
| Document | What It Covers |
|----------|---------------|
| [DEVELOPER.md](DEVELOPER.md) | Local dev setup, scripts, environment |
| [CODE_CHANGES_REFERENCE.md](CODE_CHANGES_REFERENCE.md) | Session-by-session change log with root causes and code diffs |
| [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) | ⚠️ Outdated (GAS era) — banners added |
| [SERVICES_SUMMARY.md](SERVICES_SUMMARY.md) | `src/services/` layer overview |
| [ADVANCED_SYNC_GUIDE.md](ADVANCED_SYNC_GUIDE.md) | Offline-first sync, conflict detection, caching |
| [SYNC_INTEGRATION_EXAMPLES.md](SYNC_INTEGRATION_EXAMPLES.md) | Practical sync code examples |
| [LOST_UPDATES_FIX.md](LOST_UPDATES_FIX.md) | Fetch-before-save conflict prevention pattern |

### Component & UI Reference
| Document | What It Covers |
|----------|---------------|
| [COMPONENT_DOCUMENTATION.md](COMPONENT_DOCUMENTATION.md) | Vue component prop/emit API reference |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Design tokens, color palette, typography |
| [CUSTOMIZATION.md](CUSTOMIZATION.md) | ⚠️ Partially outdated (GAS backend section) — frontend guide valid |

### Role Management System
| Document | What It Covers |
|----------|---------------|
| [ROLE_LIMITS_SUMMARY.md](ROLE_LIMITS_SUMMARY.md) | Complete overview, usage examples, quick reference, testing checklist |
| [ROLE_LIMITS_IMPLEMENTATION.md](ROLE_LIMITS_IMPLEMENTATION.md) | ⚠️ Partially outdated (GAS backend) — frontend sections valid |
| [ROLE_MANAGEMENT_ARCHITECTURE.md](ROLE_MANAGEMENT_ARCHITECTURE.md) | Architecture diagrams, permission matrix, data flow |
| [DELIVERY_SUMMARY.md](DELIVERY_SUMMARY.md) | Role management delivery status |

### Testing & Checklists
| Document | What It Covers |
|----------|---------------|
| [TESTING.md](TESTING.md) | Testing guidelines, patterns, coverage goals |
| [IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md) | Feature task tracking, deployment checklist |
| [GITHUB_INTEGRATION_CHECKLIST.md](GITHUB_INTEGRATION_CHECKLIST.md) | GitHub repo setup steps |

### Server & Infrastructure
| Document | What It Covers |
|----------|---------------|
| [system-server.md](../system-server.md) | NAS server reference (root level) |

---

## 🎯 Find What You Need

| I want to... | Read this |
|---|---|
| Deploy to production | [DEPLOYMENT_SELF_HOSTED.md](DEPLOYMENT_SELF_HOSTED.md) |
| Understand recent bug fixes | [CODE_CHANGES_REFERENCE.md](CODE_CHANGES_REFERENCE.md) |
| Add a new component | [COMPONENT_DOCUMENTATION.md](COMPONENT_DOCUMENTATION.md) |
| Understand sync/offline | [ADVANCED_SYNC_GUIDE.md](ADVANCED_SYNC_GUIDE.md) |
| Work with role limits | [ROLE_LIMITS_SUMMARY.md](ROLE_LIMITS_SUMMARY.md) |
| Set up local dev | [DEVELOPER.md](DEVELOPER.md) |
| See design tokens/colors | [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) |
| Understand the service layer | [SERVICES_SUMMARY.md](SERVICES_SUMMARY.md) |

---

## ⚠️ Removed / Archived Docs

The following files were removed during the April 2026 cleanup because they documented the legacy Netlify + Google Apps Script stack:

- `CORS_SETUP_NETLIFY_GAS.md` — GAS + Netlify CORS (not in use)
- `GAS_SETUP.md` — Google Apps Script setup
- `NETLIFY_DEPLOYMENT.md` — Netlify Functions deployment
- `NETLIFY_READY_STATUS.md` — Netlify readiness status
- `REMOVE_DEMO_DATA.md` — Referenced code.gs
- `ROLE_LIMITS_QUICK_REFERENCE.md` — Merged into ROLE_LIMITS_SUMMARY.md
