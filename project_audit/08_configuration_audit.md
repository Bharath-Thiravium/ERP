# Phase 3 — Configuration Audit

## Files reviewed

| Config | Present? | Location |
|--------|----------|----------|
| `.gitignore` (root) | ✅ | `/.gitignore` |
| `.gitignore` (backend) | ✅ | `/backend/.gitignore` |
| `.gitignore` (frontend) | ✅ | `/frontend/.gitignore` |
| Dockerfile | ❌ | none |
| docker-compose | ❌ | none |
| Nginx config | ❌ | not in repo (lives on server; referenced by deploy) |
| CI/CD | ✅ | `.github/workflows/deploy.yml` (GitHub Actions) |
| Deployment scripts | ✅ (many) | `deploy.sh`, `deploy_production.sh`, `deploy_live_production.sh`, `update_production.sh`, `restart_services.sh`, `secure_production.sh`, `monitor_production.sh`, … |
| Build scripts | ✅ | `frontend/package.json` scripts, `setup_and_run.sh`, `import_database.sh` |
| Frontend tooling | ✅ | `vite.config.ts` (+ `.performance.ts`), `tsconfig*.json`, `eslint.config.js`, `tailwind.config.js`, `postcss.config.js` |

## CI/CD (`.github/workflows/deploy.yml`)

- **Triggers:** push + PR to `main`.
- **Test job:** spins up `postgres:13` + `redis:6` services, Python 3.11, installs full
  `requirements.txt`, runs `python manage.py test`.
- **Deploy job:** on push to `main` only → SSH (`appleboy/ssh-action`) into the VPS and:
  `git reset --hard HEAD && git clean -fd && git pull` → `pip install -r requirements.txt` →
  `migrate` → `collectstatic` → frontend `pnpm install && pnpm run build` →
  `systemctl restart gunicorn && nginx`.
- **Secrets used:** `HOST`, `USERNAME`, `SSH_KEY`, `PORT` (GitHub Actions secrets — good).

### CI/CD risks

| Risk | Severity | Detail |
|------|----------|--------|
| `git reset --hard` + `git clean -fd` on server | 🟠 | Any server-side hotfix or untracked file is destroyed on every deploy. Intentional but dangerous; no backup step before reset. |
| Installs **full** `requirements.txt` every deploy | 🟡 | Includes torch/dlib/transformers — slow, fragile builds; a single dependency break blocks deploy. |
| No migration backup / rollback step | 🟠 | `migrate` runs unconditionally; a bad migration on prod has no automated rollback. |
| Tests must pass with full ML deps in CI | 🟡 | Heavy install can flake CI; no caching configured. |
| Single VPS, no blue/green | 🟡 | `systemctl restart gunicorn` causes brief downtime; no health gate. |
| No frontend/lint/type-check gate | 🟡 | CI only runs backend `manage.py test`; frontend build only happens on the server during deploy. |

## Security concerns — committed secrets & data (🔴 highest priority)

Confirmed via `git ls-files`:

| Item | Risk | Notes |
|------|------|-------|
| `modernsap_backup.sql` (4.1 MB) | 🔴 | **Full production DB dump tracked in git history.** Likely contains real customer/tenant data, hashed passwords, etc. Root `.gitignore` does not cover it. |
| `backups/*.sql.gz`, `backend/backups/*.sql.gz`, `backend/backups/system/*.sql.gz` | 🔴 | Additional DB dumps committed (backend gitignore added later doesn't untrack existing files). |
| `backend/PROJECT_CREDENTIALS_SUMMARY.md` | 🔴 | A credentials summary document is tracked. Review and purge. |
| `EMAIL_ENCRYPTION_KEY` default in `settings.py` | 🔴 | A real Fernet key (`b'ZmDfcTF7_...='`) is hard-coded as the default — anyone with repo access can decrypt stored per-company SMTP credentials. Must be env-only + rotated. |
| `SECRET_KEY` insecure default | 🟠 | `django-insecure-...` default present (guarded so prod raises if unchanged — good), but still in source. |
| `DB_PASSWORD` default `mango` | 🟡 | Weak default in `settings.py`; fine only if always overridden. |
| `backend/test_quotation_*.pdf` | 🟡 | Generated test artifacts committed. |
| `government_credentials_*` modules | 🟡 | Government API credential storage — confirm values are encrypted at rest and no plaintext creds are in migrations/fixtures. |
| `HSN.csv` (1.3 MB), `SAC.csv` | 🟡 | Large reference data committed (acceptable but bloats repo; consider a data fixture/asset store). |

> **Recommended remediation (do NOT execute as part of this read-only audit):** rotate the
> Fernet `EMAIL_ENCRYPTION_KEY`, any DB passwords, and SMTP/government API credentials that may
> have been exposed; remove DB dumps & credential docs from the working tree and purge from git
> history (e.g. `git filter-repo`); add the patterns to the **root** `.gitignore`.

## Configuration risks (non-secret)

| Risk | Severity | Detail |
|------|----------|--------|
| Root `.gitignore` ignores `.env` but not `*.sql` / `backup` dumps | 🟠 | Backend gitignore covers `*.sql`/`*.gz`/`backups/`, but the **root** does not — hence the committed root-level dumps. |
| `decouple` import has a silent fallback shim | 🟡 | If `python-decouple` isn't installed, config silently falls back to `os.environ` — masks missing-dependency errors. |
| Two apps mounted at bare `/api/` | 🟡 | `configuration` + `orchestrator` share the root API namespace (collision risk). |
| API docs gated by `IS_PRODUCTION` | 🟢 (good) | Swagger/Redoc + static/media serving disabled in production. |
| Security headers auto-enabled in prod | 🟢 (good) | HSTS, SSL redirect, secure cookies, `SameSite=Strict`, XFO=DENY all switch on when `ENVIRONMENT=production`. |
| `CORS_ALLOW_CREDENTIALS=True` with explicit origin allowlist | 🟢 (good) | No `CORS_ALLOW_ALL_ORIGINS`. |

## Production-only dependencies / behavior

- `gunicorn`, `uvicorn`, `whitenoise` — prod serving (also a `requirements-prod.txt` pinning
  older gunicorn 21.2 / whitenoise 6.6, **conflicting** with `requirements.txt`'s 23.0 / 6.11 —
  reconcile which is authoritative).
- Static/media served from `/var/www/sap-backend/...` in prod (env-overridable).
- Nginx + systemd (`gunicorn`, `nginx` units) expected on the server but **not version-controlled**
  — a gap: the reverse-proxy/TLS config and systemd unit files should live in the repo
  (e.g. a `deploy/` folder) for reproducibility.

## Missing files / gaps

- ❌ No `Dockerfile` / `docker-compose.yml` (no reproducible containerized local/prod env).
- ❌ Nginx config & systemd unit files not in repo.
- ❌ No `pytest`/coverage config; tests are Django's `manage.py test` only.
- ❌ No pre-commit hooks / secret-scanning config (would have caught the committed dumps).
- ❌ No dependency lockfile for backend (only `requirements*.txt`, unpinned transitive deps);
  frontend has `pnpm-lock.yaml` (good).
- ⚠️ Conflicting requirements files (`requirements.txt` vs `requirements-prod.txt` versions).
