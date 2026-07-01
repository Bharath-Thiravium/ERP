# Phase 4 — Code Quality Audit

## TODO / FIXME comments

Surprisingly few inline markers (the project tracks work in root `*.md` files instead):

| Location | Note |
|----------|------|
| `backend/finance/email_service.py:51` | `# TODO: Attach PDF if requested` |
| `backend/authentication/ultra_security.py:240` | `# Format as XXXX-XXXX` |
| `frontend/.../finance/components/EInvoiceManager.tsx:68` | `// TODO: Implement E-Invoice generation API` |
| `frontend/.../finance/components/EInvoiceManager.tsx:81` | `// TODO: Implement bulk E-Invoice generation API` |
| `TODO.md` (root) | Open item: hard-delete proforma TC-PRO-2627-000001/2 + recalc balances |

> The low inline-TODO count is **misleading** — incomplete/in-flight work is recorded across
> ~159 root markdown files (`*_FIX.md`, `*_PROGRESS_REPORT.md`, `ISSUE_*`), not in code.

## Large files (refactor candidates)

**Backend (lines):**

| File | Lines |
|------|------:|
| `backend/finance/views.py` | 5,103 |
| `backend/authentication/views.py` | 4,633 |
| `backend/finance/serializers.py` | 4,278 |
| `backend/finance/models.py` | 3,535 |
| `backend/inventory/views.py` | 1,738 |
| `backend/finance/email_utils.py` | 1,162 |
| `backend/crm/models.py` | 1,142 |
| `backend/inventory/models.py` | 1,137 |
| `backend/hr/views.py` | 1,072 |
| `backend/finance/viewsets.py` | 1,059 |

**Frontend (lines):**

| File | Lines |
|------|------:|
| `.../inventory/components/products/ProductList.tsx` | 1,921 |
| `frontend/src/lib/api.ts` | 1,651 |
| `.../master-admin/UltraSecureSettings.tsx` | 1,644 |
| `.../company/Dashboard.tsx` | 1,601 |
| `.../finance/pages/Dashboard.tsx` | 1,588 |
| `.../master-admin/EnhancedDashboard.tsx` | 1,588 |
| `.../hr/components/employees/EmployeeForm.tsx` | 1,550 |
| `.../finance/components/CustomerForm.tsx` | 1,549 |
| `.../finance/components/PurchaseOrderForm.tsx` | 1,531 |

> Single files >1,500 lines are the dominant maintainability risk. `finance/views.py` (5k lines)
> and `finance/serializers.py` (4.3k lines) are change-magnets — split by resource before any
> large refactor.

## Duplicate / overlapping logic

- **Three date libraries** in frontend deps (`moment`, `date-fns`, `dayjs`) + Ant Design also
  uses dayjs. Currently `date-fns` (1 file) and dayjs in use; `moment` appears unused in `src`
  but is a dependency — consolidate to one (dayjs, since AntD needs it).
- **`Product` and `PurchaseOrder` duplicated** across `finance` and `inventory` apps (separate
  models/tables) — overlapping concepts, confusing for new devs and prone to wrong-model bugs.
- **Two PDF pipelines:** server-side WeasyPrint/ReportLab **and** client-side jspdf+html2canvas.
- **Repeated CRUD/form patterns** across the 1,000+ line `*Form.tsx` files — strong candidates
  for a shared form abstraction (not present).
- Multiple near-duplicate deploy scripts (`deploy.sh`, `deploy_production.sh`,
  `deploy_live_production.sh`, `update_production.sh`) with overlapping responsibilities.

## Dead / unused / placeholder code

| Item | Observation |
|------|-------------|
| `backend/orders/` app | `models.py` is 3 lines, 1 route — placeholder/legacy. Registered in `INSTALLED_APPS`. |
| `reports` models | No models (3-line file); aggregation-only app. |
| `socket.io-client` (frontend) | Backend realtime is Django Channels; verify socket.io is actually wired or remove. |
| `moment` dependency | No imports found in `src` — likely removable. |
| Commented-out imports in `App.tsx` | e.g. `useServiceUserStore` "Removed unused import". |
| `frontend/remove_unused.sh`, `frontend/debug-console.js`, `enhanced-debug.js`, `test-position.html`, `test-position.html` | Ad-hoc debug/cleanup artifacts in the frontend root. |
| `backend/add_debug.py`, `backend/fix_*.py` (×many), `backend/test_*.py` (×26 at app root) | One-off scripts living beside the app package — not part of the test suite structure. |

## Repository hygiene / clutter (tech debt)

- **159 markdown files** + **62 scripts** (`.sh`/`.py`/`.sql`) at the repo **root**. The vast
  majority are point-in-time fix logs. This is the #1 onboarding friction item.
- **26 `test_*.py` / `fix_*.py`** scripts directly in `backend/` (not under a `tests/` package).
- Stray output dirs at root: `invoice/`, `po/`, `quotation/`, `profomainvoice/`.
- **245 `console.log`** statements in frontend `src` — should be stripped/guarded for production
  (some are intentional auth-debug logs in `router.tsx`).

## Technical debt summary

| Theme | Impact | Effort to fix |
|-------|--------|---------------|
| Committed secrets/DB dumps (see report 08) | 🔴 Critical | Medium (history purge + rotation) |
| Root clutter (docs/scripts) | 🟠 Onboarding/navigation | Low (move to `/docs`, `/scripts`, archive) |
| God-files (finance views/serializers/models) | 🟠 Maintainability/merge conflicts | High |
| Duplicate Product/PurchaseOrder concepts | 🟡 Bug risk | High (data model) |
| Dual auth complexity (JWT + session) | 🟡 Cognitive load | Medium (document, don't change) |
| Heavy ML deps in default install | 🟡 Build time/fragility | Medium (split requirements) |
| console.log / debug artifacts | 🟢 Minor | Low |

## Circular dependencies

- No automated import-cycle scan was run (read-only audit). Watch points: `finance` ↔
  `company_dashboard` (numbering/email), `authentication` is imported widely (it owns
  `Company`/`CompanyServiceUser` used as FKs across apps) — keep `authentication` dependency-free
  of business apps to avoid cycles. The `orchestrator` middleware importing app internals is a
  potential cycle source — verify before refactoring.

## Tests

- Backend: Django `manage.py test` (run in CI). Many `test_*.py` at `backend/` root are **ad-hoc
  scripts**, not discoverable unittest cases — actual coverage is unclear.
- Frontend: no test runner configured in `package.json` (only `lint`/`type-check`).
- Mobile: Jest configured (`EmployeeAttendanceApp`).
- `AGENTS.md` mandates backend tests for scope/role/lifecycle enforcement — verify these exist
  before trusting tenant isolation.
