# Phase 1.2 — Repository Structure & Architecture

## Top-level layout

```
SAP-Python/
├── backend/                  # Django REST API (the core system)
├── frontend/                 # React 19 + Vite SPA (main web app)
├── EmployeeAttendanceApp/    # React Native mobile app (employee attendance)
├── masteradmin-export/       # Separate exported "master admin" bundle (own backend+frontend)
├── docs/                     # Architecture / specs / QA docs
├── .github/workflows/        # CI/CD (deploy.yml)
├── backups/                  # Backup artifacts
├── invoice/ po/ quotation/   # Stray output/sample dirs (PDF templates/samples)
│   profomainvoice/
├── *.md                      # ~150+ status / fix / implementation markdown files (clutter)
├── *.sh / *.py / *.sql       # Dozens of one-off ops/fix/deploy scripts at root
├── modernsap_backup.sql      # ⚠️ 4.1 MB committed DB dump
├── HSN.csv / SAC.csv         # GST tax-code reference data (1.3 MB / 47 KB)
├── README.md                 # Setup guide
└── AGENTS.md                 # AI-agent guardrails for this repo
```

> **Navigation hazard:** the repository root is dominated by transient documentation
> (`*_FIX.md`, `*_COMPLETE.md`, `*_SUMMARY.md`) and throwaway scripts. The *real* code lives
> almost entirely in `backend/`, `frontend/`, and `EmployeeAttendanceApp/`. Treat the root
> `.md`/`.sh`/`.py` files as historical notes, not source of truth.

## Architecture overview

```
                         ┌─────────────────────────────┐
   Web browser  ────────▶│  React SPA (frontend/)       │
   (Master Admin,        │  Vite build → nginx static   │
    Company, Service)    └──────────────┬──────────────┘
                                        │ HTTPS  /api/*  (Axios)
                                        │ JWT  or  service session key
                         ┌──────────────▼──────────────┐
   Mobile (RN app) ─────▶│  Django + DRF (backend/)     │
   /api/* + JWT          │  gunicorn (WSGI) + uvicorn   │
                         │  (ASGI/Channels) behind nginx│
                         └───┬─────────┬─────────┬──────┘
                             │         │         │
                    ┌────────▼──┐ ┌────▼────┐ ┌──▼──────────┐
                    │PostgreSQL │ │  Redis  │ │ Celery       │
                    │ modernsap │ │ cache/  │ │ worker+beat  │
                    └───────────┘ │ broker/ │ │ (HR jobs,    │
                                  │ channel │ │  email autom)│
                                  └─────────┘ └─────────────┘
                                        │
                              External: SMTP (Hostinger),
                              GSTIN API, Hugging Face Hub
```

**Architecture style:** Modular monolith. A single Django project (`sap_backend`) with 13
local apps, each app a bounded context exposing its own DRF URL module mounted under `/api/<area>/`.
The frontend is a separate SPA consuming those APIs. Multi-tenancy is **row-level / scoped**
(every business record is tied to a `Company`), not schema-per-tenant.

## Backend module map (`backend/`)

| Folder | Role |
|--------|------|
| `sap_backend/` | Django project: `settings.py`, root `urls.py`, `asgi.py`/`wsgi.py`, `celery.py`, custom `exceptions.py`, `pdf_middleware.py`, `optimizations.py`, `views.py` (home). |
| `authentication/` | **Tenancy + identity.** MasterAdmin, Company, Service, CompanyUser, CompanyServiceUser, sessions, security logs, rate-limit middleware, custom session auth. (58 routes) |
| `finance/` | **Largest business app.** Quotations, Purchase Orders, Proforma/Tax Invoices, Payments, Vendors, TDS, HSN/SAC codes, numbering rules, PDF templates. (88 routes, 23 models) |
| `hr/` | Employees, departments, designations, attendance (+ devices/logs), payroll (components, cycles, payslips), job postings/applications, Celery compliance tasks. (50 routes, 15 models) |
| `inventory/` | Categories, suppliers, warehouses, products/variants/bundles, stock levels & movements, alerts, audits, cycle counts, purchase orders. (25 routes, 16 models) |
| `crm/` | Leads, contacts, accounts, opportunities, deals/pipeline, campaigns, tickets/SLA, knowledge base, lead scoring, customer health/segmentation, email/calendar integration. (40 routes, 26 models) |
| `company_dashboard/` | Per-company dashboard: utilization, analytics, activity logs, notifications, **company email settings (encrypted SMTP)**, document numbering. (21 routes, 7 models) |
| `configuration/` | System configuration, **DB backup/restore/upload/schedule**, maintenance windows. (9 routes, 6 models) |
| `analytics/` | System metrics, service health, API metrics, system alerts. (10 routes, 4 models) |
| `reports/` | Cross-module reporting endpoints (no own models; aggregates finance/hr/etc.). (5 routes) |
| `notifications/` | Notification model + delivery endpoints. (5 routes) |
| `ai_assistant/` | Document embeddings + query history (semantic assistant over transformers). (5 routes, 2 models) |
| `orchestrator/` | **Self-healing/automation layer** — ErrorPattern, FixMethod, WorkflowExecution/Error, AmazonQHistory + `OrchestratorMiddleware`. Internal ops tooling. (2 routes, 5 models) |
| `orders/` | Near-empty app (3-line `models.py`, 1 route) — likely placeholder/legacy. |
| `common/` | Shared middleware (`CorrelationIdMiddleware`) and utilities. |
| `tests_common/` | Shared test helpers. |
| `scripts/` | Operational scripts (credential reset, security logging — gitignored outputs). |
| `backups/` | Backend backup artifacts (incl. `system/`). |

## Frontend module map (`frontend/src/`)

| Folder | Role |
|--------|------|
| `App.tsx` / `main.tsx` | Root: QueryClientProvider, Router, Toaster, ErrorBoundary, AuthWrapper, theme + auth init. |
| `lib/` | `router.tsx` (route table + `ProtectedRoute`), `api.ts` (1,651-line Axios layer), `tokenManager.ts`, `serviceRouter.tsx`, `sanitizer.ts`, `security.ts`, `utils.ts`. |
| `pages/` | Route screens: `auth/`, `company/`, `master-admin/`, `public/` (job portal), `services/` (finance, hr, inventory, crm), plus `EmployeeApp.tsx`, `Reports.tsx`, `NotFoundPage.tsx`. |
| `components/` | Reusable UI: `ui/`, `layout/`, `forms/`, `modals/`, `auth/`, `security/`, `profile/`, `ai-assistant/`, `company/`. |
| `services/` | API client modules (`financeApi.ts`, `analyticsApi.ts`, `employeeAPI.ts`, `governmentApi.ts`, `integrationApi.ts`). |
| `store/` | Zustand stores: `authStore.ts`, `serviceUserStore.ts`, `themeStore.ts`. |
| `hooks/`, `types/`, `utils/`, `styles/`, `assets/` | Custom hooks, TS types, helpers, styles, static assets. |

## `masteradmin-export/`

A **self-contained second project** (own `backend/apps/...` incl. `athens_control_plane`,
`analytics`, `notifications`, `configuration`, `authentication`, and a `frontend/` with
`pages/master-admin`, `components`, `hooks`, `services`). Appears to be an **exported subset /
control-plane bundle** ("Athens") packaged for separate deployment. It overlaps conceptually
with the main `authentication` + `master-admin` features. Treat as a parallel artifact — confirm
with the team whether it is live or a one-time export before touching it.

## Architectural observations

- Clean app-per-domain separation on the backend; URL mounting is consistent
  (`/api/<area>/`), **except** `configuration` and `orchestrator` are mounted at bare `/api/`
  (so their routes share the top-level namespace — watch for collisions).
- The `orchestrator` app + `OrchestratorMiddleware` + `AmazonQHistory` suggest an
  experimental AI-driven "auto-fix" subsystem layered over the request cycle. Understand it
  before debugging request flow.
- "Athens" is the internal codename (see `AGENTS.md`, `ATHENS_*` docs) for the
  tenant/workflow access-gating layer.
