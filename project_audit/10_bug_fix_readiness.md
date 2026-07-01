# Phase 5 — Bug-Fix Readiness Report

## 1. Local setup guide (exact commands)

> Assumes Ubuntu/Linux, Python 3.11, Node 18+, PostgreSQL, Redis. The repo ships a one-shot
> `./setup_and_run.sh`, but the manual path below is clearer for debugging.

```bash
# 0. System libs (WeasyPrint, magic, postgres, build tools for dlib/face-recognition)
sudo apt update
sudo apt install -y python3-venv python3-dev build-essential cmake \
  libpq-dev libmagic1 libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
  libffi-dev redis-server postgresql

# 1. Database
sudo -u postgres psql -c "CREATE DATABASE modernsap;"
sudo -u postgres psql -c "CREATE USER postgres WITH PASSWORD 'postgres';" 2>/dev/null || true
#   Import existing dump if present (large, contains data):
#   psql -U postgres -d modernsap -f modernsap_backup.sql
#   ...or start clean and rely on migrations (step 3).

# 2. Backend env + deps
cd backend
python3 -m venv venv && source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt        # heavy (torch/dlib); or requirements-lite.txt
cp .env.example .env                   # then edit per project_audit/07_local_development.md

# 3. Migrate + (optional) seed + run
python manage.py migrate
python manage.py createsuperuser       # for /admin
python manage.py runserver 0.0.0.0:8000

# 4. Redis (separate terminal) — usually already running as a service
redis-server   # or: sudo systemctl start redis-server

# 5. Celery worker + beat (separate terminals; only if testing async/scheduled jobs)
cd backend && source venv/bin/activate
celery -A sap_backend worker -l info        # see start_celery.sh
celery -A sap_backend beat -l info

# 6. Frontend (separate terminal)
cd frontend
npm install -g pnpm        # if not installed
pnpm install
cp .env.example .env       # set VITE_API_URL=http://localhost:8000
pnpm dev                   # http://localhost:3000
```

Access: frontend `http://localhost:3000`, API `http://localhost:8000`, API docs (non-prod)
`http://localhost:8000/api/docs/`, Django admin `http://localhost:8000/admin/`.

## 2. Dependency checklist

- [ ] Python **3.11** + venv active
- [ ] System libs: `libpq`, `libmagic`, Pango/Cairo/gdk-pixbuf (WeasyPrint), `cmake`+`build-essential` (dlib/face-recognition)
- [ ] `pip install -r requirements.txt` succeeds (or `requirements-lite.txt` for non-ML work)
- [ ] Node **18+** + `pnpm`; `pnpm install` succeeds
- [ ] PostgreSQL running; `modernsap` DB exists
- [ ] Redis running (`redis-cli ping` → PONG)
- [ ] (Optional) Celery worker + beat start without import errors

## 3. Environment checklist

- [ ] `backend/.env` created with DB, REDIS_URL, SECRET_KEY, `ENVIRONMENT=local`, `DEBUG=True`
- [ ] `EMAIL_ENCRYPTION_KEY` set (generate your own Fernet key; do not reuse the committed default)
- [ ] `EMAIL_BACKEND=...console...` locally (avoid sending real mail)
- [ ] `frontend/.env` with `VITE_API_URL`, `VITE_WS_URL` (+ `VITE_API_BASE_URL` to be safe)
- [ ] No real production secrets in any local `.env`

## 4. Database setup checklist

- [ ] `modernsap` database created
- [ ] DB user/password match `.env`
- [ ] Either imported a dump **or** ran `python manage.py migrate` clean
- [ ] Reference data loaded if needed (HSN/SAC, units — see root `add_*_units.sql`)
- [ ] Superuser created for `/admin`
- [ ] At least one `Company` + `CompanyServiceUser` exists to exercise service-user flows

## 5. Frontend startup checklist

- [ ] `pnpm install` clean (Node 18+)
- [ ] `frontend/.env` present, `VITE_API_URL` points at running backend
- [ ] `pnpm dev` serves on :3000 with no console import errors
- [ ] Login page loads; network calls hit `:8000` (check CORS — backend allows :3000/:3001/:3002 in DEBUG)
- [ ] `pnpm run type-check` / `pnpm lint` (optional gate)

## 6. Backend startup checklist

- [ ] `runserver` boots with no missing-env errors
- [ ] `/api/docs/` reachable (non-prod)
- [ ] `/admin/` login works
- [ ] DB connection healthy (no `psycopg2` errors)
- [ ] Redis cache works (no Redis connection warnings)
- [ ] Migrations applied (`showmigrations` all `[X]`)

## 7. Common failure points

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `pip install` fails on `dlib`/`face-recognition` | Missing `cmake`/`build-essential` | Install build tools, or use `requirements-lite.txt` |
| WeasyPrint import/render error | Missing Pango/Cairo/gdk-pixbuf | `apt install libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0` |
| `psycopg2` build error | Missing `libpq-dev` | `apt install libpq-dev` |
| `python-magic` error | Missing `libmagic1` | `apt install libmagic1` |
| Login works but APIs 401 | Wrong auth type — service users need session key, not JWT | Use `/service-login`; confirm `Authorization` header |
| 500 on cache/realtime | Redis not running | Start Redis; check `REDIS_URL` |
| Celery won't start | Redis down or `DJANGO_SETTINGS_MODULE` unset | Start Redis; run from `backend/` |
| Duplicate/gap document numbers | `NumberingRule`/`NumberingCounter` race | Known fragile area — review `finance/signals.py` + numbering views before touching |
| CORS errors in browser | Origin not in DEBUG allowlist | Use :3000/:3001/:3002, or set `CORS_ALLOWED_ORIGINS` |
| Prod boot fails: "SECRET_KEY must be set" | `ENVIRONMENT=production` with default key | Set a real `SECRET_KEY` |
| Frontend can't reach API | `VITE_API_URL` wrong / backend down | Fix `.env`, restart `pnpm dev` |
| Wrong model edited | `Product`/`PurchaseOrder` exist in finance **and** inventory | Confirm app before editing |

## 8. Developer onboarding guide (new joiner)

1. **Read first (in this order):** `project_audit/00_INDEX.md` → `02_repository_structure.md` →
   `04_backend_analysis.md` → `03_frontend_analysis.md` → `06_workflow_analysis.md`. Then
   `AGENTS.md` (guardrails) and `README.md`.
2. **Ignore the noise:** the ~159 root `*.md` and 62 root scripts are historical fix logs — do
   not treat them as current design docs.
3. **Mental model:** multi-tenant ERP. `Company` is the tenant; every record scopes to it.
   Three personas: Master Admin (JWT), Company User (JWT + lifecycle gating), Service User
   (session-key auth). Services = finance/hr/inventory/crm.
4. **Run it locally** (section 1). Get login + one service dashboard working before changing code.
5. **Find code by area:** backend `backend/<app>/{models,serializers,views,urls}.py`; frontend
   `frontend/src/pages/services/<area>/` + `frontend/src/lib/api.ts`.
6. **Before any change:** check `finance/signals.py` / `hr/signals.py`, the relevant DRF
   permission class, and whether company-scoping is applied. Add backend tests per `AGENTS.md`.
7. **Never** commit `.env`, DB dumps, or credentials.

## 9. Safe change areas (low blast radius)

- Frontend presentational components & styling (Tailwind/AntD), copy, icons.
- New **read-only** report endpoints in `reports/` (aggregation only, no writes).
- `notifications` content/templates.
- Adding new fields to a form + serializer **with a migration** (additive, nullable).
- `ai_assistant` (isolated; experimental).
- Documentation, lint fixes, removing dead debug artifacts.
- New CRM list filters/columns (read paths).

## 10. High-risk areas (change with extreme care + tests)

- 🔴 **Finance document lifecycle** (`finance/models.py`, `views.py`, `serializers.py`,
  `signals.py`): quotations→PO→proforma→invoice→payment, totals, TDS, GST. Money + legal docs.
- 🔴 **Auto-numbering** (`NumberingRule`/`NumberingCounter`, `company_dashboard` numbering): race
  conditions cause duplicate/gap invoice numbers (compliance failures).
- 🔴 **Authentication & tenancy** (`authentication/` models, permissions, custom session auth,
  `RateLimitMiddleware`): a scoping mistake leaks data across tenants.
- 🔴 **Migrations on production data:** CI runs `migrate` automatically with no rollback.
- 🟠 **Orchestrator middleware:** intercepts requests/errors globally — can alter behavior app-wide.
- 🟠 **Payroll/compliance Celery tasks** (`hr/tasks.py`): statutory (ECR/ESI/govt returns) — errors
  have legal consequences.
- 🟠 **Inventory stock movements:** double-counting / negative-stock risks.
- 🟠 **Email encryption** (`EMAIL_ENCRYPTION_KEY`, per-company SMTP): rotating the key breaks
  decryption of stored credentials.
