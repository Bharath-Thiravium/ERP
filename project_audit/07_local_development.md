# Phase 2 — Local Development Analysis

## What is required to run locally

| # | Requirement | Needed? | Notes |
|---|-------------|---------|-------|
| 1 | **Frontend** | Yes | Node.js 18+ (16+ per README), `pnpm`. `cd frontend && pnpm install && pnpm dev` → port **3000** (Vite `--host`). |
| 2 | **Backend** | Yes | Python 3.11 (CI) / 3.8+ (README). venv + `pip install -r backend/requirements.txt`. `python manage.py migrate && runserver` → port **8000**. |
| 3 | **Database** | Yes | PostgreSQL, DB `modernsap`. Import `modernsap_backup.sql` or run migrations + seed. |
| 4 | **Redis** | Yes (for full app) | Used as Celery broker/result (DB 0), cache (DB 1), and Channels layer (DB 0). Backend runs without it for basic CRUD but cache/realtime/Celery break. |
| 5 | **Celery worker** | Optional (dev) | Needed for HR compliance jobs, email automation, async tasks. `backend/start_celery.sh`. Not required to load the UI. |
| 6 | **Celery Beat** | Optional (dev) | Scheduler for periodic tasks (`django_celery_beat`). Only if testing scheduled jobs. |
| 7 | **Queue / broker** | = Redis | No separate RabbitMQ/SQS; Redis is the broker. |
| 8 | **External services** | Optional (dev) | SMTP (email send), GSTIN API (GST validation), Hugging Face (AI assistant model download). All can be stubbed/skipped locally. |
| 9 | **System libs** | Yes (some) | `weasyprint` needs Pango/Cairo/GDK; `dlib`/`face-recognition` need cmake + build tools; `python-magic` needs libmagic; `psycopg2` needs libpq. See failure points in report 10. |

**Minimum to see the app:** PostgreSQL + backend + frontend. **Redis** strongly recommended.
Celery/Beat and external APIs are optional for most local work.

## Heavy dependency warning

`requirements.txt` pulls **torch, transformers, dlib, face-recognition, opencv,
sentence-transformers** — multi-GB download + native compilation. For routine local work
(finance/HR/CRM UI + APIs), prefer `requirements-lite.txt` if it covers your area, or install the
heavy ML/CV packages only when working on `ai_assistant` or HR face-attendance.

---

## Backend environment variables

Source of truth: [backend/sap_backend/settings.py](../backend/sap_backend/settings.py) +
`backend/.env.example`. (`Dummy OK?` = a placeholder value works for local dev.)

| Variable | Required? | Purpose | Example | Dummy OK locally? |
|----------|-----------|---------|---------|-------------------|
| `ENVIRONMENT` | Recommended | `local` vs `production` toggles security defaults & API docs | `local` | Yes (`local`) |
| `DEBUG` | Recommended | Django debug mode | `True` | Yes |
| `SECRET_KEY` | Yes (prod) | Crypto signing + JWT key. Has insecure default; **must** override in prod | `dev-only-change-me` | Yes (dev) / **No (prod)** |
| `ALLOWED_HOSTS` | Recommended | Comma list of allowed hosts | `localhost,127.0.0.1` | Yes |
| `DB_NAME` | Yes | Postgres database name | `modernsap` | Yes (real DB name) |
| `DB_USER` | Yes | Postgres user | `postgres` | Yes |
| `DB_PASSWORD` | Yes | Postgres password (default `mango` in code) | `postgres` | Yes (local pw) |
| `DB_HOST` | Yes | DB host | `localhost` | Yes |
| `DB_PORT` | Yes | DB port | `5432` | Yes |
| `REDIS_URL` | Recommended | Redis for cache/broker/channels | `redis://localhost:6379/0` | Yes |
| `CELERY_BROKER_URL` | If using Celery | Broker URL | `redis://localhost:6379/0` | Yes |
| `CELERY_RESULT_BACKEND` | If using Celery | Result backend | `redis://localhost:6379/0` | Yes |
| `CORS_ALLOWED_ORIGINS` | Prod | Allowed frontend origins (prod) | `http://localhost:3000` | Yes |
| `CSRF_TRUSTED_ORIGINS` | Prod | Trusted origins for CSRF | `http://localhost:3000` | Yes |
| `EMAIL_BACKEND` | No | Email backend; use console backend locally | `django.core.mail.backends.console.EmailBackend` | Yes |
| `EMAIL_HOST` | No | SMTP host | `smtp.hostinger.com` | Yes (unused if console) |
| `EMAIL_PORT` | No | SMTP port | `587` | Yes |
| `EMAIL_HOST_USER` | No | SMTP user | `you@example.com` | Yes (blank ok) |
| `EMAIL_HOST_PASSWORD` | No | SMTP password (**never commit real**) | `app-password` | Yes (blank ok) |
| `EMAIL_USE_TLS` | No | TLS toggle | `True` | Yes |
| `EMAIL_USE_SSL` | No | SSL toggle | `False` | Yes |
| `DEFAULT_FROM_EMAIL` | No | Default sender | `system@example.com` | Yes |
| `EMAIL_TIMEOUT` | No | SMTP timeout (s) | `30` | Yes |
| `EMAIL_ENCRYPTION_KEY` | Recommended | **Fernet key** to encrypt per-company SMTP creds. Has a committed default — **generate your own** | (Fernet 32-byte base64) | Yes (generate) / **rotate in prod** |
| `GSTINCHECK_API_KEY` | No | GST number verification API | `dummy` | Yes (validation degraded) |
| `JWT_ACCESS_TOKEN_LIFETIME` | No | Access token minutes | `60` | Yes |
| `JWT_REFRESH_TOKEN_LIFETIME` | No | Refresh token minutes | `1440` | Yes |
| `FRONTEND_URL` | No | Base URL used in email links | `http://localhost:3001` | Yes |
| `BACKUP_DIR` | No | DB backup output dir | `./backups` | Yes |
| `STATIC_ROOT` | Prod | Static files dir (prod) | `/var/www/sap-backend/static/` | n/a local |
| `MEDIA_ROOT` | Prod | Media files dir (prod) | `/var/www/sap-backend/media/` | n/a local |
| `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_*`, `USE_X_FORWARDED_*` | Prod | HTTPS/proxy hardening; auto-on when `ENVIRONMENT=production` | `False` (local) | Yes (leave default) |

## Frontend environment variables

Source: `frontend/.env.example` + `import.meta.env` usage.

| Variable | Required? | Purpose | Example | Dummy OK locally? |
|----------|-----------|---------|---------|-------------------|
| `VITE_API_URL` | Yes | Backend REST base URL | `http://localhost:8000` | Yes |
| `VITE_API_BASE_URL` | Maybe | Alt base URL referenced in code (verify which `api.ts` uses) | `http://localhost:8000/api` | Yes |
| `VITE_WS_URL` | Recommended | WebSocket (Channels) URL | `ws://localhost:8000` | Yes |
| `VITE_BASE_PATH` | No | App base path (prod served under `/dashboard/`) | `/` | Yes |
| `VITE_SPECIAL_CHARS` | No | Referenced in code; purpose unclear — verify | (string) | Yes |

> ⚠️ Two API-URL vars (`VITE_API_URL`, `VITE_API_BASE_URL`) and a `VITE_SPECIAL_CHARS` appear in
> code. Confirm in `frontend/src/lib/api.ts` which are actually consumed and set both to be safe.

---

## Generated `backend/.env.example` (placeholders only)

```dotenv
# ── Environment ─────────────────────────────────────────────
ENVIRONMENT=local
DEBUG=True
SECRET_KEY=dev-only-secret-change-me

# ── Database (PostgreSQL) ───────────────────────────────────
DB_NAME=modernsap
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432

# ── Hosts / CORS / CSRF ─────────────────────────────────────
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://localhost:3001

# ── Redis / Celery ──────────────────────────────────────────
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# ── Email (use console backend locally; never commit real creds) ──
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=system@example.com
EMAIL_TIMEOUT=30

# ── Encryption (GENERATE YOUR OWN: python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())") ──
EMAIL_ENCRYPTION_KEY=replace_with_generated_fernet_key

# ── JWT ─────────────────────────────────────────────────────
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# ── External APIs (dummy for local) ─────────────────────────
GSTINCHECK_API_KEY=dummy

# ── Misc ────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3001
BACKUP_DIR=./backups
```

## Generated `frontend/.env.example` (placeholders only)

```dotenv
# Local development
VITE_API_URL=http://localhost:8000
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000
VITE_BASE_PATH=/

# Production (uncomment & set per deployment)
# VITE_API_URL=https://your-domain.com
# VITE_WS_URL=wss://your-domain.com
# VITE_BASE_PATH=/dashboard/
```

> No production secrets are reproduced here. Replace every placeholder with your own local value.
> Existing `.env.example` files in the repo already use placeholders — keep it that way.
