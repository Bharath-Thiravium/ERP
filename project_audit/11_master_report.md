# Phase 6 — Final Master Report

## A. Executive Summary

**SAP-Python** ("modern SAP" / internal codename **Athens**) is a **multi-tenant SaaS ERP** for
Indian businesses, covering Finance, HR, Inventory, CRM, Reports and Analytics, with an AI
assistant and an operational self-healing "orchestrator". It is a **Django 5.2 + DRF** backend
(~98k LOC, 13 apps, ~100+ models), a **React 19 + Vite + TypeScript** SPA (~127k LOC), a **React
Native** employee-attendance mobile app, and a separate exported "master admin" control-plane
bundle. It runs on a **single self-managed VPS** (gunicorn + nginx + systemd), with Redis +
Celery for caching/realtime/async, deployed via a GitHub Actions SSH pipeline.

The system is **functionally rich and clearly in active production use**, but carries significant
**operational and security debt**: production database dumps and a Fernet encryption key are
committed to git, the repo root is buried under ~159 status documents and ~62 one-off scripts,
and several core modules are 4,000–5,000-line "god files". None of this blocks running the app —
but it materially raises the risk of mistakes during change.

**Overall readiness for a new developer to safely fix bugs:** 🟡 **Moderate.** The app is
runnable locally with the documented steps, but the high-risk financial/auth/numbering paths and
the committed-secret exposure require care and remediation before confident change.

## B. Architecture Summary

- **Pattern:** Modular monolith. One Django project, 13 domain apps under `/api/<area>/`; React
  SPA consumes the REST API; mobile app hits the same API.
- **Tenancy:** Row-level — `authentication.Company` is the tenant; all business records FK to it.
- **Identity/Auth:** Django `auth.User` + layered tenant/role models. **Dual auth**: SimpleJWT
  (master admin + company users) and a custom **session-key** auth for service users; plus TOTP 2FA.
- **Async/Realtime:** Redis (broker/cache/channels) + Celery worker & beat (HR statutory
  automation, email) + Django Channels (WebSockets).
- **Documents:** Server-side PDF (WeasyPrint/ReportLab) with per-company templates & numbering.
- **Deploy:** GitHub Actions → SSH → `git pull` + migrate + collectstatic + frontend build +
  systemd restart. No containers.

(See `02_repository_structure.md` for the diagram.)

## C. Module Inventory

| App | Mount | Models | Routes | Domain |
|-----|-------|-------:|-------:|--------|
| authentication | /api/auth/ | 9 | 58 | Tenancy, identity, sessions, security |
| finance | /api/finance/ | 23 | 88 | Quotes, POs, invoices, payments, vendors, TDS, tax codes |
| hr | /api/hr/ (+/api/public/) | 15 | 50 | Employees, attendance, payroll, recruitment, compliance |
| inventory | /api/inventory/ | 16 | 25 | Products, warehouses, stock, suppliers, audits |
| crm | /api/crm/ | 26 | 40 | Leads→deals, tickets/SLA, campaigns, segmentation |
| company_dashboard | /api/company-dashboard/ | 7 | 21 | Tenant dashboard, email settings, numbering |
| configuration | /api/ | 6 | 9 | System config, DB backup/restore, maintenance |
| analytics | /api/analytics/ | 4 | 10 | System metrics, health, API metrics, alerts |
| notifications | /api/notifications/ | 1 | 5 | In-app notifications |
| ai_assistant | /api/ai/ | 2 | 5 | Document embeddings, semantic query |
| orchestrator | /api/ | 5 | 2 | Error-pattern auto-fix / workflow automation |
| reports | /api/reports/ | 0 | 5 | Cross-module aggregation reporting |
| orders | /api/orders/ | 0 | 1 | Placeholder/legacy |

Frontend modules: `pages/{auth,company,master-admin,public,services/{finance,hr,inventory,crm}}`,
shared `components/`, `lib/` (api/router/token), `services/`, Zustand `store/`.

## D. Workflow Inventory

(Full detail in `06_workflow_analysis.md`.) Master-admin login (JWT+2FA); company
registration→profile→approval lifecycle gating; service-user session login; dashboards; generic
CRUD; **finance sales chain** Quotation→PO→Proforma→Invoice→Payment with revise/reject approval &
auto-numbering; procurement PurchaseRequest→VendorInvoice→PurchasePayment(+TDS); HR
onboarding→attendance→payroll→statutory compliance (Celery); public recruitment portal;
notifications (in-app + Channels + email); orchestrator self-healing.

## E. API Inventory

- **324 routes** across 13 apps (per-app counts in module inventory). Largest surfaces:
  finance (88), authentication (58), hr (50), crm (40), inventory (25).
- DRF ViewSets/APIViews, global `PageNumberPagination` (20), `DjangoFilterBackend` + Search +
  Ordering. OpenAPI via drf-spectacular at `/api/schema|docs|redoc` (**non-prod only**).
- Custom exception handler; correlation-id, rate-limit, and orchestrator middleware in the chain.

## F. Database Inventory

- PostgreSQL `modernsap`, ~100+ tables, row-level multi-tenancy. Core: `auth_user` + `MasterAdmin`
  / `Company` / `CompanyUser` / `Service` / `CompanyService` / `CompanyServiceUser` /
  `ServiceUserSession`. Finance document chain + procurement + per-company numbering. HR
  employees/attendance/payroll. Inventory products/stock/warehouses. CRM full sales+service suite.
- **Naming collision:** `Product` and `PurchaseOrder` exist in both finance and inventory.
- Reference data: HSN/SAC GST codes (from `HSN.csv`/`SAC.csv`). (ER diagrams in `05_database_analysis.md`.)

## G. Environment Variables Inventory

- **Backend (~38 vars):** ENVIRONMENT, DEBUG, SECRET_KEY, DB_* (5), ALLOWED_HOSTS,
  CORS/CSRF origins, REDIS_URL, CELERY_* (2), EMAIL_* (9), EMAIL_ENCRYPTION_KEY,
  GSTINCHECK_API_KEY, JWT_* (2), FRONTEND_URL, BACKUP_DIR, STATIC/MEDIA_ROOT, SECURE_*/HSTS/proxy.
- **Frontend (5):** VITE_API_URL, VITE_API_BASE_URL, VITE_WS_URL, VITE_BASE_PATH, VITE_SPECIAL_CHARS.
- Full tables + generated `.env.example` files in `07_local_development.md`.

## H. Local Development Setup Guide

See `10_bug_fix_readiness.md` §1 for exact commands. Minimum: PostgreSQL + Redis + backend
(`migrate` + `runserver`) + frontend (`pnpm dev`). Celery/Beat and external APIs optional. Watch
the heavy ML/CV install (`torch`/`dlib`/`face-recognition`) — use `requirements-lite.txt` when not
working on AI/face features.

## I. Risk Assessment

| # | Risk | Severity | Likelihood | Area |
|---|------|----------|------------|------|
| 1 | Production DB dumps committed to git (`modernsap_backup.sql`, `backups/*.gz`) | 🔴 Critical | Confirmed | Data exposure |
| 2 | Hard-coded `EMAIL_ENCRYPTION_KEY` Fernet default in `settings.py` | 🔴 Critical | Confirmed | Secret exposure |
| 3 | `PROJECT_CREDENTIALS_SUMMARY.md` + government-credential modules tracked | 🔴 High | Confirmed | Secret exposure |
| 4 | Auto-numbering race → duplicate/gap invoice numbers | 🔴 High | Historical (many fix logs) | Finance/compliance |
| 5 | Tenant-scoping mistakes leak data across companies | 🔴 High | Latent | Auth/tenancy |
| 6 | Auto `migrate` on prod with `git reset --hard`, no rollback | 🟠 Med-High | Per deploy | DevOps |
| 7 | God-files (finance 5k/4.3k lines) → merge conflicts, regressions | 🟠 Medium | Ongoing | Maintainability |
| 8 | Heavy ML deps break clean installs/CI | 🟠 Medium | Common | Build |
| 9 | Repo clutter (159 docs / 62 scripts) slows onboarding & hides truth | 🟠 Medium | Ongoing | Hygiene |
| 10 | No containers / nginx & systemd not in VCS | 🟡 Medium | Latent | Reproducibility |
| 11 | Conflicting requirements files (prod vs main) | 🟡 Low-Med | Latent | Build |
| 12 | Duplicate Product/PurchaseOrder concepts; 3 date libs; socket.io vs Channels | 🟡 Low-Med | Latent | Code quality |
| 13 | 245 console.logs / debug artifacts shipped | 🟢 Low | Confirmed | Hygiene |

## J. Recommended Next Steps

**Do not change application code yet** (per the audit mandate). The following is a prioritized
backlog for when remediation is approved:

**Immediate (security — week 1):**
1. Rotate **all** potentially exposed secrets: `EMAIL_ENCRYPTION_KEY` (Fernet), DB passwords,
   SMTP creds, government API creds. Coordinate the Fernet rotation with re-encryption of stored
   per-company SMTP credentials (rotating without re-encrypt breaks them).
2. Remove DB dumps, `PROJECT_CREDENTIALS_SUMMARY.md`, and test PDFs from the working tree; purge
   from git history (`git filter-repo`); force-push with team coordination.
3. Add DB-dump / credential patterns to the **root** `.gitignore`; add a secret-scanning
   pre-commit hook (e.g. gitleaks) and a CI secret-scan gate.

**Short term (stability — weeks 2–4):**
4. Add a **DB backup step before `migrate`** in the deploy pipeline; add a migration rollback plan.
5. Reconcile `requirements.txt` vs `requirements-prod.txt`; split a clear `requirements-base` /
   `requirements-ml` so routine work skips torch/dlib.
6. Verify (and add, per `AGENTS.md`) backend tests for **company scope**, **role enforcement**,
   and **lifecycle gating** — these protect the tenancy boundary.
7. Add frontend lint/type-check (and a minimal test setup) to CI before the deploy job.

**Medium term (maintainability):**
8. Move root `*.md` fix-logs into `docs/archive/` and one-off scripts into `scripts/`; keep the
   root to README + a handful of canonical docs.
9. Commit nginx config + systemd unit files (a `deploy/` folder) and consider Dockerizing
   local dev (compose: web + db + redis + worker).
10. Begin splitting `finance/views.py` & `finance/serializers.py` by resource (incremental, behind tests).
11. Consolidate date libraries; confirm/remove socket.io vs Channels; document the
    finance/inventory `Product`/`PurchaseOrder` distinction.

**Documentation:**
12. Promote this `project_audit/` set into the team wiki; keep `00_INDEX.md` as the entry point
    and update it as the above items are addressed.

---

*Audit complete. No application code was modified, no dependencies installed, no bugs fixed —
analysis and documentation only.*
