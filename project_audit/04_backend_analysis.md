# Phase 1.4 — Backend Analysis

Source: `backend/` — single Django project `sap_backend`, 13 local apps. Settings:
[backend/sap_backend/settings.py](../backend/sap_backend/settings.py). Root URLs:
[backend/sap_backend/urls.py](../backend/sap_backend/urls.py).

## Apps / modules & mount points

| App | Mount | Routes | Models | Responsibility |
|-----|-------|-------:|-------:|----------------|
| `authentication` | `/api/auth/` | 58 | 9 | Tenancy, identity, sessions, security, rate-limiting |
| `finance` | `/api/finance/` | 88 | 23 | Quotations, POs, invoices, payments, vendors, TDS, tax codes |
| `hr` | `/api/hr/` (+ `/api/public/`) | 50 | 15 | Employees, attendance, payroll, recruitment, compliance jobs |
| `inventory` | `/api/inventory/` | 25 | 16 | Products, warehouses, stock, suppliers, audits |
| `crm` | `/api/crm/` | 40 | 26 | Leads→deals pipeline, tickets/SLA, campaigns, segmentation |
| `company_dashboard` | `/api/company-dashboard/` | 21 | 7 | Tenant dashboard, analytics, email settings, numbering |
| `configuration` | `/api/` | 9 | 6 | System config, DB backup/restore, maintenance |
| `analytics` | `/api/analytics/` | 10 | 4 | System metrics, service health, API metrics, alerts |
| `reports` | `/api/reports/` | 5 | 0 | Cross-module reporting (aggregation only) |
| `notifications` | `/api/notifications/` | 5 | 1 | In-app notifications |
| `ai_assistant` | `/api/ai/` | 5 | 2 | Document embeddings + semantic query history |
| `orchestrator` | `/api/` | 2 | 5 | Error-pattern auto-fix / workflow automation (internal) |
| `orders` | `/api/orders/` | 1 | 0 | Placeholder / legacy (empty models) |

> Two apps mount at bare `/api/` (`configuration`, `orchestrator`) — their paths live in the
> root API namespace; check for collisions when adding endpoints.

## Models (high level)

Full table-by-table breakdown is in **[05_database_analysis.md](05_database_analysis.md)**.
Highlights:

- **`authentication`:** `MasterAdmin`, `Company`, `CompanyAutoCodeSettings`, `Service`,
  `CompanyService`, `CompanyUser`, `CompanyServiceUser`, `ServiceUserSession`, `SecurityLog`.
- **`finance`** (largest, 3,535-line models): `HSNCode`, `SACCode`, `NumberingRule`,
  `NumberingCounter`, `Product`, `Customer`, `CustomerShippingAddress`, `Quotation`(+Item),
  `PurchaseOrder`(+Item), `ProformaInvoice`(+Item), `Invoice`(+Item), `Payment`, `Vendor`,
  `PurchaseRequest`(+Item), `VendorInvoice`(+Item), `PurchasePayment`, `TDSDeposit`.
- **`inventory`:** `Category`, `Supplier`, `Warehouse`, `Product`(+`Variant`/`Bundle`/`BundleItem`),
  `StockLevel`, `StockMovement`, `StockAlert`, `InventoryAudit`(+Item), `CycleCount`(+Item),
  `PurchaseOrder`(+Item). *(Note: `Product` and `PurchaseOrder` exist in **both** finance and
  inventory — distinct tables, potential confusion.)*
- **`hr`:** `Department`, `Designation`, `Employee`, `JobPosting`, `JobApplication`,
  `Attendance`(+`System`/`Device`/`Log`), `PerformanceReview`, payroll
  (`SalaryComponent`, `PayrollSettings`, `PayrollCycle`, `Payslip`, `PayrollReport`).
- **`crm`:** full sales+service suite — `Lead`/`Contact`/`Account`/`Opportunity`/`Deal`
  (+`PipelineStage`, `DealStageHistory`), `Campaign`(+Member), `Ticket`(+`Category`/`SLA`),
  `KnowledgeBase`, `LeadScore`/`ScoringCriteria`, `CustomerHealthScore`, `CustomerSegment`
  (+Membership), `EmailIntegration`/`CalendarIntegration`/`EmailActivity`.

## APIs

- Style: mostly DRF `ViewSet`/`APIView` mounted via per-app `urls.py` (DefaultRouter +
  explicit `path()`). `reports/viewsets`, `common/viewsets.py` provide shared base viewsets.
- Pagination: global `PageNumberPagination`, `PAGE_SIZE=20`.
- Filtering: `DjangoFilterBackend` + `SearchFilter` + `OrderingFilter` globally enabled.
- Docs: drf-spectacular (`/api/schema`, `/api/docs`, `/api/redoc`) — **non-production only**.
- Exceptions: custom handler `sap_backend.exceptions.custom_exception_handler`.
- The largest API surfaces are `finance/views.py` (5,103 lines) and `authentication/views.py`
  (4,633 lines) — see code-quality report.

## Middleware stack (order matters)

From `settings.MIDDLEWARE`:

1. `corsheaders.middleware.CorsMiddleware`
2. `django.middleware.security.SecurityMiddleware`
3. **`common.middleware.CorrelationIdMiddleware`** — attaches a correlation/request id (tracing).
4. **`authentication.middleware.RateLimitMiddleware`** — custom rate limiting (Redis-backed).
5. Session → Common → CSRF → Auth → Messages → Clickjacking (Django defaults).
6. **`orchestrator.middleware.OrchestratorMiddleware`** — request/error interception for the
   auto-fix/workflow subsystem (last; wraps the response).

Additional non-registered middleware exists: `sap_backend/pdf_middleware.py` (PDF response
handling) — confirm where it's wired.

## Authentication (backend)

Two `DEFAULT_AUTHENTICATION_CLASSES`:

1. **`JWTAuthentication`** (SimpleJWT) — for `MasterAdmin` and `CompanyUser`. Access 60 min,
   refresh 1440 min, **rotation + blacklist** on. Signing key = `SECRET_KEY`, HS256.
2. **`authentication.authentication.ServiceUserSessionAuthentication`** — custom
   `BaseAuthentication` reading a Bearer session key from the `Authorization` header, resolving
   it to a `ServiceUserSession` → `CompanyServiceUser`.

2FA: TOTP via `pyotp`. Rate limiting: `RateLimitMiddleware`. Security events logged to
`SecurityLog`.

## Authorization

Custom DRF permission classes in
[backend/authentication/permissions.py](../backend/authentication/permissions.py):

- `IsMasterAdmin`, `IsCompanyUser`, `IsServiceUser`, `IsServiceUserAuthenticated`.

Default permission is `IsAuthenticated` globally; individual views layer the above. Tenancy is
enforced by scoping querysets to the caller's `Company` (the `AGENTS.md` mandate: business
rules must be server-side, not just UI). **Verify per-view that company scoping is actually
applied** — this is the highest-value security audit task.

## Background jobs (Celery)

- App: [backend/celery_app.py](../backend/celery_app.py) + `sap_backend/celery.py`.
  Broker & result backend = Redis. Timezone `Asia/Kolkata`. Beat scheduler =
  `django_celery_beat` (DB-backed). Results via `django_celery_results`.
- Task modules: `hr/tasks.py` (13 tasks) and `finance/tasks.py`.
- **Beat schedule (from `celery_app.py`)** — all HR statutory/compliance automation:
  - daily: compliance checks, statutory backup, employee sync
  - hourly: statutory calculation validation
  - weekly: compliance reminders, alert cleanup
  - monthly: ECR generation, compliance reports, statutory rate updates
- HR task set includes government-return submission, monthly form generation, ESI/ECR reports.

## Realtime

- Django Channels (ASGI app `sap_backend.asgi.application`) with `RedisChannelLayer`
  (`REDIS_URL` DB 0). Used for live notifications/dashboards. Frontend also bundles
  `socket.io-client` — confirm whether that targets Channels or a separate gateway.

## Signals

- `finance/signals.py`, `hr/signals.py` — domain side effects (e.g. numbering, payroll,
  notifications) triggered on model save. Read these before changing finance/HR write paths.

## Database architecture

- PostgreSQL (`modernsap`). `CONN_MAX_AGE=60`, health checks on, 5s connect timeout.
- Default Django `auth.User` is the identity table; tenant/role data layered via
  `authentication` models (multi-tenant by FK to `Company`, **row-level** isolation).
- Per-company auto-numbering via `CompanyAutoCodeSettings` / `NumberingRule` /
  `NumberingCounter` with DB-locking to avoid duplicate document numbers (a recurring
  bug area per the root `*_NUMBERING_*.md` notes).
