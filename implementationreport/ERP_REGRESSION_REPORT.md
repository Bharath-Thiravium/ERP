# ERP_REGRESSION_REPORT.md
## Full ERP Regression Test — Post Phase 1 Security Remediation
**Project:** SAP-Python Multi-Tenant ERP
**Date:** 2026-07-02
**Scope:** Verify every previously working feature still behaves correctly after Authentication, Analytics, Finance, CRM, HR, and Inventory Phase 1 security fixes.
**Mode:** READ-ONLY. No application code was modified during this regression pass.

---

## 1. Executive Summary

Phase 1 security work across all 6 modules did **not** introduce any regression detectable by the Django automated test suite: all 40 tests written during Phase 1 (CRM 17, HR 26 incl. pre-existing, Inventory 12) pass, and every one of the 24 test failures/errors present in the full suite run was traced to a specific, verifiable, **pre-existing** root cause unrelated to any of the 6 phases' code changes (confirmed via `git log`/`git status` on each implicated file).

One **genuine frontend regression** was found via manual code cross-check (not caught by the backend test suite, since it lives entirely on the frontend side): HR Phase 1's fix to `mobile_attendance` (correctly adding authentication to a previously fully-unauthenticated endpoint — a critical vulnerability) broke `MobileAttendanceDemo.tsx`, which never attached an `Authorization` header to its request. This is the expected, unavoidable cost of closing a real security hole; the correct remediation is a one-line frontend fix, not reverting the backend security fix.

Two **critical, severe, pre-existing infrastructure bugs** were discovered during this sweep that are NOT Phase 1 regressions but are significant enough to flag as deployment blockers: (1) `crm/migrations/0012_alter_emailintegration_credentials.py`, added by an unrelated "server sync" commit, performs an impossible direct `jsonb→bytea` PostgreSQL cast and **blocks provisioning any fresh database** (confirmed unapplied on the dev database itself); (2) the shared test fixture helper `authentication/test_fixtures.py` calls `User.objects.make_random_password()`, an API removed in the installed Django version, which breaks 16 pre-existing cross-module tenant-isolation/CRUD contract tests that would otherwise have provided strong independent regression coverage for exactly the modules Phase 1 touched.

All backend infrastructure (URL routing, static files, WebSocket/Channels, Celery, Redis) verified healthy. Frontend TypeScript typecheck and production build both pass cleanly on the current codebase; the `globalErrorHandler.js` import error the user observed in their terminal was already resolved by an external commit landed after that terminal session and is not reproducible on current `HEAD`.

**Overall verdict: Phase 1 security work is a clean, low-risk change set.** See Section 11 for the full production-readiness verdict, which is gated primarily on pre-existing issues, not Phase 1 regressions.

---

## 2. Modules Tested

| Module | Method | Result |
|--------|--------|--------|
| Authentication (session auth, tenant isolation contracts) | Automated tests (`authentication` app, 38 tests) + code review | 22 pass, 16 error (pre-existing fixture bug) |
| Master Admin (company/service creation, master admin login) | Automated tests (subset of `authentication` app) + `manage.py check` | Pass (see Section 4) |
| Company (dashboard, settings, users, roles) | `manage.py check`, URL resolution, migration check | No code-level issues found; not manually click-tested (no browser tooling available in this session) |
| Finance | Automated tests (`finance` app, 18 tests) + code review | 16 pass, 2 error (both pre-existing, files untouched by any phase) |
| HR | Automated tests (`hr` app, 26 tests) + code review + frontend cross-check | 20 pass, 5 error + 1 fail (all pre-existing, documented in HR Phase 1 report); 1 genuine frontend regression found |
| Inventory | Automated tests (`inventory` app, 12 tests) | 12/12 pass |
| CRM | Automated tests (`crm` app, 17 tests) | 17/17 pass |
| Analytics | `manage.py check`; no test suite exists for this app | No issues found; zero test coverage (pre-existing gap) |
| Security (tenant/company/service isolation, permission boundaries, cross-tenant access) | Automated tests across CRM/HR/Inventory Phase 1 suites (40 tests) + code review | All passing tests confirm isolation holds for the 6 modules audited |

---

## 3. Total Tests Executed

**Backend (Django):** 111 tests across 6 apps with test suites (`authentication`, `finance`, `hr`, `inventory`, `crm`; `analytics`/`company_dashboard`/`configuration`/`notifications`/`ai_assistant` have zero tests).

No `pytest` installation or configuration exists in this project (`pip show pytest` → not found); Django's built-in `unittest`-based test runner is the only test framework in use, and it was run in full.

**Frontend:** `pnpm run lint` (full repo), `pnpm run type-check` (`tsc --noEmit`), `pnpm run build` (production Rollup build) — no automated test suite (e.g. Jest/Vitest) exists in the frontend project.

---

## 4. Passed

**87 / 111 backend tests passed** (78%):

| App | Passed / Total | Notes |
|-----|-----------------|-------|
| `authentication` | 22 / 38 | Includes `test_company_creation`, `test_master_admin_creation`, `test_master_admin_login_invalid_credentials`, `test_service_creation`, `test_complete_tenant_isolation`, `test_valid_session_succeeds_and_data_is_company_scoped`, `test_post_with_company_payload_saves_under_session_company`, session expiry/revocation tests — solid coverage for Master Admin and core session/tenant-isolation contracts |
| `finance` | 16 / 18 | |
| `hr` | 20 / 26 | Includes the 11-test `HRPhase1SecurityTest` suite added in HR Phase 1 (all pass) |
| `inventory` | 12 / 12 | `InventoryPhase1SecurityTest` — all pass |
| `crm` | 17 / 17 | `CRMPhase1SecurityTest` — all pass |

**Backend infrastructure — all clean:**
- `python manage.py check` → **0 issues**
- URL configuration loads without error (20 top-level patterns resolved)
- `python manage.py collectstatic --dry-run --noinput` → 163 files, no errors
- ASGI/Channels: `sap_backend.asgi` imports cleanly; `ASGI_APPLICATION` and `CHANNEL_LAYERS` (Redis-backed) both configured; `routing.py` present in `notifications` and `analytics` apps
- Celery: `sap_backend.celery` imports cleanly; `CELERY_BROKER_URL`/`CELERY_RESULT_BACKEND` both point to Redis
- Redis: live connection confirmed (`PING` → `True`)

**Frontend — mostly clean:**
- `pnpm run type-check` (`tsc --noEmit`) → **0 errors**, exit code 0
- `pnpm run build` (production build, cache cleared and rebuilt fresh to rule out stale-cache false positives) → **succeeds**, 3632 modules transformed, exit code 0, one non-blocking chunk-optimization warning (CRMDashboard.tsx statically+dynamically imported)
- Dev server (`pnpm dev`) verified starting cleanly on current `HEAD`: `VITE ready`, `HTTP_STATUS:200`

---

## 5. Failed

**1 failure, 23 errors** (24 total) across the backend suite — **every one traced to a pre-existing root cause**, detailed in Section 8. Zero backend test failures are attributable to Phase 1 code changes.

**1 genuine regression** found via frontend code cross-check (not caught by any automated test, since it's a frontend-only defect with no frontend test suite to catch it) — detailed in Section 7.

**Frontend lint:** 1815 problems (1660 errors, 155 warnings) via `pnpm run lint` — see Section 8; classified as pre-existing codebase-wide style debt, not functional failures (typecheck and build both pass).

---

## 6. Skipped

No tests were explicitly skipped by the test runner (`Ran 111 tests`, no `skipped` count reported by Django's runner). No live UI click-through testing was performed for Master Admin/Company/Finance/HR/Inventory/CRM/Analytics screens — this session has no browser automation tool available, so "Company Dashboard," "Settings," "Roles/Permissions" UI, and similar screens without a corresponding backend automated test were verified only at the code/configuration level (URL resolution, `manage.py check`, migration consistency), not by simulating user clicks. This is flagged explicitly rather than silently assumed as passing.

---

## 7. Regressions Introduced by Phase 1

### 7.1 — HR Mobile Attendance: `MobileAttendanceDemo.tsx` will now always return 401

| Field | Detail |
|---|---|
| **Module** | HR |
| **Feature** | Mobile attendance check-in/check-out (demo/kiosk UI) |
| **File** | `frontend/src/pages/services/hr/components/attendance/MobileAttendanceDemo.tsx` (rendered at `frontend/src/pages/services/hr/pages/Attendance.tsx:391`, "Mobile" tab) |
| **Steps to reproduce** | 1. Log in as a Service User. 2. Navigate to HR → Attendance → Mobile tab. 3. Select an employee, capture/allow location, submit check-in. |
| **Expected result** | `POST /api/hr/attendance/mobile/` succeeds (200), attendance is recorded. |
| **Actual result** | `POST /api/hr/attendance/mobile/` returns **401 Unauthorized**. |
| **Root cause** | HR Phase 1 correctly added `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated` to `mobile_attendance` (`backend/hr/attendance_views.py`), which previously had **zero authentication** (a critical, now-fixed vulnerability). `ServiceUserSessionAuthentication.authenticate()` (`backend/authentication/authentication.py:16-29`) reads the session key **only** from the `Authorization: Bearer` header — never from query parameters, despite a stale docstring claiming otherwise. `MobileAttendanceDemo.tsx:165-169` calls `api.post('/api/hr/attendance/mobile/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })` with **no `Authorization` header**. The global axios interceptor (`frontend/src/lib/api.ts:113-139`) only adds the session key as a **query parameter** fallback when no `Authorization` header is already present — which the backend now ignores entirely. Before Phase 1, this didn't matter (endpoint was `AllowAny`); after Phase 1's correct fix, this specific call now fails. Sibling components in the same directory (`BiometricAttendance.tsx:48,62,84,103,123`, `FaceRecognitionAttendance.tsx:131-134`) already correctly set `headers: { Authorization: \`Bearer ${sessionKey}\` }` — `MobileAttendanceDemo.tsx` is the one component that never adopted this pattern. The component already has `sessionKey` in scope via `useServiceUserStore()` (line 10), so the header is trivially available; it's just never attached to this one request. |
| **Severity** | **High** — this specific UI flow (demo/kiosk mobile check-in) is completely broken; other attendance flows (biometric, face recognition) are unaffected. |
| **Regression or Pre-existing** | **Regression**, directly caused by the (correct and necessary) HR Phase 1 authentication fix. The frontend file itself has not been modified since 2025-11-04 — it is old code whose latent bug was only exposed once the backend closed the unauthenticated hole it was silently relying on. |
| **Suggested priority** | **P1** — fix before Phase 1 ships to production if the mobile/kiosk check-in flow is in active use. Fix is a one-line addition of `Authorization: \`Bearer ${sessionKey}\`` to the existing `headers` object, mirroring the sibling components. Do **not** revert the backend authentication fix — the pre-Phase-1 state was a critical unauthenticated-write vulnerability. |

No other frontend regressions were found. A dedicated cross-check confirmed: inventory stock-transfer UI already sends `destination_warehouse` and has proper (if generic) error handling; all inventory/CRM dropdowns are populated from company-scoped endpoints so the new FK-ownership validation can never legitimately trigger; CRM lead-conversion UI has no error-suppression workaround for the old (now-fixed) 500 bug; HR leave-approval UI is unaffected by the new `transaction.atomic()` wrapping (response shape unchanged); no optimistic-UI-update patterns were found for product/stock-movement/purchase-order/CRM-entity creation that could show stale "success" state on a new 400 rejection.

---

## 8. Pre-existing Issues

### 8.1 — CRITICAL: Migration `crm/0012_alter_emailintegration_credentials` blocks fresh database provisioning

| Field | Detail |
|---|---|
| **Module** | CRM / Infrastructure |
| **File** | `backend/crm/migrations/0012_alter_emailintegration_credentials.py` |
| **Steps to reproduce** | On any fresh database (or a fresh test database, i.e. `manage.py test` without `--keepdb`, or the dev database from scratch): `python manage.py migrate`. |
| **Expected result** | Migration applies cleanly. |
| **Actual result** | `django.db.utils.ProgrammingError: cannot cast type jsonb to bytea` — the migration does a direct `migrations.AlterField(model_name='emailintegration', name='credentials', field=models.BinaryField())` against a column that is currently `jsonb` in the database; PostgreSQL has no implicit cast path between `jsonb` and `bytea`. |
| **Severity** | **Critical** |
| **Regression or Pre-existing** | **Pre-existing.** Confirmed via `git log`: this migration was added by commit `2225177 "sync: add server migration 0012 crm emailintegration credentials"`, an external "server sync" commit, not part of any of the 6 Phase 1 implementations (CRM Phase 1's own migrations were `0010_encrypt_integration_credentials.py` and `0011_percompany_unique_identifiers.py`, both of which use the correct add-column/migrate-data/drop-old-column/rename pattern and apply cleanly). Confirmed via `python manage.py showmigrations crm` against the **dev** database: `0012` shows as **unapplied** — this migration has never successfully run anywhere in this environment. |
| **Suggested priority** | **P0 — must fix before any fresh deployment or CI pipeline that provisions a database from scratch.** The fix is a data migration (add new `BinaryField` column, encrypt-or-null-fill from the existing `jsonb` data, drop the old column, rename), mirroring the pattern already used correctly in migrations `0010`/`0011`. |
| **Note on this regression sweep** | To run the automated test suite at all, a workaround was applied to the **disposable `test_modernsap` database only**: a row was inserted directly into that database's `django_migrations` ledger via raw SQL marking `0012` as applied, without altering the actual column type or any application code. The **dev database was not permanently affected** — it still correctly reports `0012` as unapplied. (One brief, immediately-reverted mistake occurred during this process: a `migrate --fake` was run against the dev database by mistake and undone in the same interaction; verified via `showmigrations` that the dev database's migration ledger is in its original, accurate state.) |

### 8.2 — Shared test fixture helper broken by Django version upgrade (masks 16 tests of cross-module regression coverage)

| Field | Detail |
|---|---|
| **Module** | Authentication (test infrastructure) |
| **File** | `backend/authentication/test_fixtures.py:107`, consumed by `backend/authentication/tests/test_security_contracts.py` |
| **Steps to reproduce** | `python manage.py test authentication.tests.test_security_contracts` |
| **Expected result** | 16 tests covering session expiry/revocation, CRUD operations, and tenant isolation across CRM/Finance/HR/Inventory all run and pass. |
| **Actual result** | All 16 error identically at `setUp()`: `AttributeError: 'UserManager' object has no attribute 'make_random_password'`. |
| **Severity** | **Medium** (test infrastructure, not production code) but with an outsized impact on regression confidence — see note below. |
| **Regression or Pre-existing** | **Pre-existing.** `User.objects.make_random_password()` was removed from Django's `UserManager` in a version this project has since upgraded to; `test_fixtures.py` was committed 2026-03-16, and this specific file has not been modified by any of the 6 Phase 1 implementations. |
| **Suggested priority** | **P1.** These are exactly the tests (`CRMModuleSecurityTests`, `FinanceModuleSecurityTests`, `HRModuleSecurityTests`, `InventoryModuleSecurityTests`, `TenantIsolationContractTests`) that would provide independent, cross-cutting verification of the modules Phase 1 touched — with this fixture broken, that layer of coverage has effectively never run in this environment. Fix is a one-line change: replace `User.objects.make_random_password()` with `secrets.token_urlsafe(16)` or Django's `django.utils.crypto.get_random_string()`. |
| **Mitigating factor** | The 40 new Phase 1 regression tests (CRM 17, HR 11 of 26, Inventory 12) use self-contained fixtures that do **not** depend on this broken helper, and all pass — so tenant isolation for the specific endpoints touched in Phase 1 **is** independently verified, just not via this particular pre-existing suite. |

### 8.3 — `Payslip`/statutory calculation test fixtures missing required field (already documented in HR Phase 1 report)

| Field | Detail |
|---|---|
| **Module** | HR |
| **File** | `backend/hr/tests_compliance.py` (5 errors: `test_end_to_end_compliance_flow`, `test_esi_calculation`, `test_invalid_input_handling`, `test_pf_calculation`, `test_professional_tax_calculation`) |
| **Actual result** | `IntegrityError: null value in column "created_by_id" of relation "authentication_company"` — `Company.objects.create(...)` in these tests' `setUp()` omits the required `created_by` field. |
| **Severity** | Low (test-only) |
| **Regression or Pre-existing** | **Pre-existing** — confirmed via `git diff --stat` showing zero changes to this file across all of Phase 1 (already documented in `HR_PHASE1_IMPLEMENTATION_REPORT.md` Section 4). |
| **Suggested priority** | P3 — one-line fixture fix (`created_by=<a User instance>`) per `setUp()`. |

### 8.4 — `SecurityValidator.validate_file_path()` assertion mismatch (already documented in HR Phase 1 report)

| Field | Detail |
|---|---|
| **Module** | HR |
| **File** | `backend/hr/tests_compliance.py::SecurityTests.test_input_sanitization` |
| **Actual result** | `AssertionError: ValidationError not raised` |
| **Severity** | Low |
| **Regression or Pre-existing** | **Pre-existing**, same file/commit history as 8.3. |
| **Suggested priority** | P3. |

### 8.5 — Finance: `Quotation.update_balance_tracking()` mixes `float` and `Decimal`

| Field | Detail |
|---|---|
| **Module** | Finance |
| **Feature** | Proforma Invoice PDF generation / balance tracking against a linked Purchase Order |
| **File** | `backend/finance/models.py:1522`, surfaced by `finance/tests.py::ProformaPDFShippingFallbackTest.test_proforma_pdf_uses_po_shipping_address_when_proforma_shipping_is_missing` |
| **Steps to reproduce** | Create a `ProformaInvoice` linked to a `PurchaseOrder`, triggering `PurchaseOrder.update_balance_tracking()`. |
| **Actual result** | `TypeError: unsupported operand type(s) for -: 'float' and 'decimal.Decimal'` at `reduced_proforma_base = self.subtotal - invoice_subtotal_total`. |
| **Severity** | **Medium** — this is a genuine Decimal-safety bug of the same class fixed in Inventory Phase 1 (Fix 4), but in `finance/models.py`, a file **not modified by Finance Phase 1** (confirmed via `git log -S "reduced_proforma_base"` — last touched by an unrelated older commit `1f44922`). |
| **Regression or Pre-existing** | **Pre-existing.** |
| **Suggested priority** | P2 — recommend for Finance Phase 2 scope, using the same Decimal-safety pattern established in Inventory Phase 1. |

### 8.6 — Finance/Company Dashboard: `DocumentNumberingConfig.get_next_number()` transaction abort

| Field | Detail |
|---|---|
| **Module** | Finance / Company Dashboard |
| **File** | `backend/company_dashboard/document_numbering_models.py:150`, surfaced by `finance/tests_numbering.py::NumberingGeneratorTests.test_custom_document_numbering_supports_fy_short_placeholder` |
| **Actual result** | `django.db.utils.InternalError: current transaction is aborted, commands ignored until end of transaction block` on `config.save(update_fields=['current_counter'])`. |
| **Severity** | Medium — root SQL statement that first poisoned the transaction was not captured in the available traceback; needs isolated reproduction to pin down precisely. |
| **Regression or Pre-existing** | **Pre-existing** — `company_dashboard` app was not touched by any of the 6 phases. |
| **Suggested priority** | P2 — needs isolated investigation (run this single test alone with `--debug-sql` to capture the actual first failing statement). |

### 8.7 — `company_dashboard` model/migration drift

| Field | Detail |
|---|---|
| **Module** | Company Dashboard |
| **File** | `backend/company_dashboard/models.py` (4 field alterations pending: `selected_invoice_template`, `selected_po_template`, `selected_proforma_template`, `selected_template` on `CompanyQuotationTemplateSettings`) |
| **Actual result** | `python manage.py makemigrations --check --dry-run` reports an unmade migration. |
| **Severity** | Low-Medium — doesn't block current operation (existing DB schema still functions), but any deploy pipeline enforcing "no pending model changes" would fail, and the actual DB schema silently differs from what the model file declares. |
| **Regression or Pre-existing** | **Pre-existing** — `company_dashboard/models.py` last committed 2025-11-25, before any Phase 1 work. |
| **Suggested priority** | P2 — run `makemigrations company_dashboard` and review/apply. |

### 8.8 — Frontend: pervasive `@typescript-eslint/no-explicit-any` lint debt

| Field | Detail |
|---|---|
| **Module** | Frontend (all modules) |
| **Actual result** | `pnpm run lint` → 1815 problems (1660 errors, 155 warnings), spread across effectively the entire `src/` tree (App.tsx, all service API clients, all Zustand stores, most page components). |
| **Severity** | Low — style/type-safety debt, not functional defects (TypeScript compiles cleanly, production build succeeds). |
| **Regression or Pre-existing** | **Pre-existing** and codebase-wide — zero frontend files were modified during any of the 6 Phase 1 implementations (`git status --short -- frontend/` is empty), so this cannot be phase-related. |
| **Suggested priority** | P3 — large-scale cleanup effort, out of scope for any single phase. |

### 8.9 — User-reported `globalErrorHandler.js` Vite error: not reproducible on current `HEAD`

| Field | Detail |
|---|---|
| **Module** | Frontend build tooling |
| **Actual result observed by user** | `Failed to resolve import "./utils/globalErrorHandler.js" from "src/main.tsx"` when running `pnpm dev`. |
| **Investigation** | The **current** `frontend/src/main.tsx` (matching `HEAD`, zero uncommitted changes) does **not** contain this import at all — it was removed by commit `39e79cf "server"` (2026-07-02 10:09:59), landing after commit `8de7996 "all edited"` deleted the physical file `frontend/src/utils/globalErrorHandler.js`. Both commits are external "server sync" commits, unrelated to any of the 6 backend phases. Verified by starting `pnpm dev` fresh (with `node_modules/.vite` and `dist` cleared) on current `HEAD`: server starts cleanly (`VITE ready in 208 ms`), and `curl http://localhost:8004/` returns `HTTP_STATUS:200`. |
| **Severity** | N/A — not currently reproducible. |
| **Regression or Pre-existing** | **Neither** — already resolved by an external commit before this regression sweep began. The user's terminal output reflects a state of the repository that predates that fix (a stale local checkout or cached dev-server state at the time it was captured). |
| **Suggested priority** | No action needed; flagging only for completeness since the user explicitly reported it. |

---

## 9. Security Regressions

**None found.** All 40 Phase 1 security regression tests (CRM 17, HR 11, Inventory 12 — the tests specifically written to verify tenant isolation, cross-company FK rejection, and negative-stock/transfer correctness) pass. No previously-enforced authorization boundary was found to have been loosened or removed by any of the 6 phases. The one regression found (Section 7.1) is the opposite of a security regression — it is UI breakage caused by *correctly* closing a previously-unauthenticated endpoint.

---

## 10. Deployment Blockers

| # | Blocker | Severity | Source |
|---|---|---|---|
| 1 | `crm/migrations/0012_alter_emailintegration_credentials.py` cannot apply to any fresh database (`jsonb`→`bytea` cast error) | **Critical** | Pre-existing (external sync commit, Section 8.1) |
| 2 | `MobileAttendanceDemo.tsx` mobile check-in UI returns 401 for all submissions | **High** | Phase 1 regression (Section 7.1) — only blocks this specific flow if it's in active production use |

No other Phase-1-introduced blocker was found. Items in Section 8 (8.2–8.8) are pre-existing quality/coverage gaps, not blockers for shipping Phase 1's security fixes specifically, but should be triaged before general production sign-off given their severity.

---

## 11. Production Readiness Verdict

**Phase 1 security work (Authentication, Analytics, Finance, CRM, HR, Inventory) is production-ready from a regression standpoint, contingent on two fixes:**

1. Apply the one-line frontend fix to `MobileAttendanceDemo.tsx` (add the `Authorization` header, matching its sibling components) before relying on the mobile/kiosk attendance check-in flow in production — this is a direct, known side effect of Phase 1's necessary security fix and should ship together with it.
2. The pre-existing `crm/0012` migration bug (Section 8.1) is **unrelated to Phase 1** but is a **release-blocking infrastructure defect independent of this work** — any deployment to a fresh environment, or any CI pipeline that provisions a database from scratch, will fail at `migrate` regardless of Phase 1. This should be fixed before the **next** deployment of any kind, not specifically gated on Phase 1.

No security regressions were found. No tenant-isolation, authorization, or authentication boundary was weakened by any of the 6 phases. The pre-existing gaps in automated coverage (Sections 8.2, 8.8, and the absence of any Analytics test suite) reduce *confidence* in areas outside what Phase 1 directly touched, but do not indicate active defects in those areas based on the code-level and configuration-level review performed here.

**Recommendation:** Ship Phase 1 together with the `MobileAttendanceDemo.tsx` one-line fix. Track the `crm/0012` migration bug as a separate, higher-priority, pre-existing incident — it affects the ability to deploy *anything* to a fresh environment, independent of this security work.
