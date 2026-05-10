# Audit Report

Date: 2026-05-10
Repository: `/var/www/SAP-Python`
Scope: Full static repository audit of backend, frontend, settings, deployment scripts, CI/CD, and database-access patterns.

## Executive Summary

Overall code health: `42/100`
Security: `24/100`
Scalability: `38/100`
Performance: `46/100`
Maintainability: `31/100`
Technical debt: `22/100`
Production readiness: `34/100`

This repository contains a production-intended Django/React system with meaningful domain depth, but it is currently exposed to several severe operational and security risks:

1. Publicly reachable backend surfaces execute or expose database query behavior too broadly.
2. Credentials and secret-like artifacts are committed in the repository.
3. Large routed backend areas bypass the newer tenant-scoped authorization layer and instead rely on legacy `AllowAny` plus ad hoc session handling.
4. Frontend authentication/session handling leaks security state into browser storage and URL/query patterns.
5. The deployment layer contains destructive and credential-embedding scripts that are not safe as live production automation.

The strongest architectural pattern in the repo is the newer shared scoping/auth base in `backend/common/viewsets.py`, but that secure path is only partially adopted. The main remediation strategy should be containment first, then surface reduction, then migration to centralized auth/scoping, then performance and maintainability cleanup.

## Verification Notes

The following verification was completed during audit:

- `frontend/pnpm run build` completed successfully.
- Build output included a `752.96 kB` JavaScript dashboard chunk and `189.09 kB` CSS file.
- `backend/./venv/bin/python manage.py check --deploy` completed and reported `610` issues/warnings, including Django security warnings `W004`, `W008`, `W009`, `W012`, and `W016`.
- `backend/./venv/bin/python manage.py test authentication.tests.test_service_user_auth` was started and created the test database, but did not complete within the audit window.

## Audit Method

This report is evidence-driven and based on inspection of actual repository files, including:

- Django settings, URLs, views, serializers, models, migrations, permissions, and middleware
- Frontend React code, router/auth state, API client, and build config
- Tailwind and Vite configuration
- CI/CD workflow and deployment shell scripts
- SQL export/backup scripts and raw SQL call sites
- Secret/artifact files committed into the repository

No internet-derived recommendations were used. Findings below reference actual file paths and lines inspected in this codebase.

## Critical Findings

### 1. Public AI assistant SQL execution surface

Severity: `Critical`
Risk level: `Critical`
Primary impact: data exfiltration, schema disclosure, potential destructive SQL depending on DB privileges

Evidence:

- [backend/ai_assistant/views.py](/var/www/SAP-Python/backend/ai_assistant/views.py:109)
- [backend/ai_assistant/views.py](/var/www/SAP-Python/backend/ai_assistant/views.py:124)
- [backend/ai_assistant/urls.py](/var/www/SAP-Python/backend/ai_assistant/urls.py:6)

Problem:

- `export_query_data` executes client-supplied SQL directly with `cursor.execute(sql)`.
- `ai_query`, `initialize_embeddings`, and export/history/table enumeration are routed without meaningful auth protection.
- The same module exposes schema/table discovery.

Why this is dangerous:

- Any user or script that reaches `/api/ai/export/` can submit arbitrary SQL text.
- Even if the code intends reporting, the implementation grants direct execution capability.
- If the PostgreSQL role has broad permissions, exploitation can include data extraction across modules or destructive writes.

Exploit path:

1. Send POST to `/api/ai/export/` with attacker SQL.
2. Receive raw query results as JSON.
3. Iterate through tables via `/api/ai/tables/` or infer schema from errors.

Required remediation:

- Remove arbitrary SQL input from the API contract.
- Make AI endpoints authenticated and restricted to a narrow admin audience only.
- Persist server-generated query IDs and only allow export by query ID owned by the requester.
- Enforce server-side SQL allowlisting for any generated query.

Implementation plan:

1. Require authenticated master-admin access for all `/api/ai/*` routes.
2. Replace raw `sql` export payload with `query_id`.
3. Validate generated SQL against an allowlist:
   - `SELECT` only
   - single-table reads only
   - approved table list only
   - no semicolons/comments/DDL/DML
   - capped `LIMIT`
4. Disable schema/embed endpoints in production unless explicitly enabled.

Mitigation while work is pending:

- Immediately remove or block `/api/ai/*` at the reverse proxy.
- If immediate code deploy is unavailable, deny these routes in Nginx except from a temporary admin IP allowlist.

Acceptance criteria:

- No AI route accepts raw SQL from the client.
- Unauthorized requests to `/api/ai/*` receive `401/403`.
- Export path only works for authenticated owner-created query history.

### 2. Secret material committed in repository

Severity: `Critical`
Risk level: `Critical`
Primary impact: account takeover, environment compromise, lateral movement

Evidence:

- [backend/scripts/reset_credentials_mak47_20260417_132524.txt](/var/www/SAP-Python/backend/scripts/reset_credentials_mak47_20260417_132524.txt:8)
- [backend/.env](/var/www/SAP-Python/backend/.env:1)
- [backend/sap_backend/settings.py](/var/www/SAP-Python/backend/sap_backend/settings.py:61)
- [backend/sap_backend/settings.py](/var/www/SAP-Python/backend/sap_backend/settings.py:170)
- [backend/sap_backend/settings.py](/var/www/SAP-Python/backend/sap_backend/settings.py:363)

Problem:

- Plaintext reset-credential artifacts are committed.
- Repository contains committed `.env` files.
- Settings contain insecure defaults for `SECRET_KEY`, DB password, and encryption key.

Why this is dangerous:

- Repo access becomes credential access.
- Old secrets remain exploitable even after file deletion unless history is rewritten and credentials are rotated.
- Hardcoded defaults increase the chance of accidental insecure bootstraps.

Required remediation:

1. Rotate all exposed user passwords, DB credentials, API keys, email credentials, and encryption keys.
2. Remove committed secret files from current tree and Git history.
3. Fail application startup when mandatory secrets are missing.
4. Move secret storage to environment/secret manager only.

Mitigation while work is pending:

- Invalidate exposed credentials immediately.
- Disable affected accounts where rotation cannot happen same-day.

Acceptance criteria:

- No live secrets or credential-reset artifacts remain in tracked files.
- App refuses to boot in production without externally provided secrets.

### 3. Legacy `AllowAny` routed APIs bypass centralized authorization

Severity: `Critical`
Risk level: `High`
Primary impact: inconsistent tenant isolation, future auth bypass regressions, lifecycle enforcement drift

Evidence:

- [backend/finance/analytics_views.py](/var/www/SAP-Python/backend/finance/analytics_views.py:34)
- [backend/finance/direct_payment_views.py](/var/www/SAP-Python/backend/finance/direct_payment_views.py:13)
- [backend/reports/views.py](/var/www/SAP-Python/backend/reports/views.py:85)
- [backend/company_dashboard/quotation_template_views.py](/var/www/SAP-Python/backend/company_dashboard/quotation_template_views.py:113)
- [backend/common/viewsets.py](/var/www/SAP-Python/backend/common/viewsets.py:25)

Problem:

- Many routed endpoints disable DRF authentication and use `permission_classes = [AllowAny]`.
- Some manually inspect `session_key`; others rely on inconsistent checks.
- New secure scoping exists, but legacy routed surfaces bypass it.

Why this is dangerous:

- The codebase now has two security models:
  - centralized, enforceable, testable
  - distributed, manual, drift-prone
- Every legacy endpoint is a regression opportunity.

Required remediation:

1. Inventory every routed `AllowAny` API.
2. Classify each one:
   - must remain public
   - should be JWT-authenticated
   - should be service-user-authenticated
   - should be removed
3. Migrate internal CRUD/list/report paths onto:
   - `ServiceUserSessionAuthentication`
   - `IsServiceUserAuthenticated`
   - `CompanyScopedModelViewSet`
4. Add regression tests for cross-tenant isolation on all migrated paths.

Mitigation while work is pending:

- Put route-level blocks around the highest-risk legacy endpoints not required for immediate business operation.

Acceptance criteria:

- No internal finance/hr/inventory/crm data endpoint is routed with `AllowAny`.

### 4. Browser token/session handling is too permissive

Severity: `High`
Risk level: `High`
Primary impact: token leakage, stale-session trust, XSS blast radius expansion

Evidence:

- [frontend/src/lib/api.ts](/var/www/SAP-Python/frontend/src/lib/api.ts:121)
- [frontend/src/lib/tokenManager.ts](/var/www/SAP-Python/frontend/src/lib/tokenManager.ts:15)
- [frontend/src/lib/router.tsx](/var/www/SAP-Python/frontend/src/lib/router.tsx:95)
- [frontend/src/store/serviceUserStore.ts](/var/www/SAP-Python/frontend/src/store/serviceUserStore.ts:255)
- [frontend/src/pages/services/finance/components/CustomerList.tsx](/var/www/SAP-Python/frontend/src/pages/services/finance/components/CustomerList.tsx:113)

Problem:

- Session keys are injected into query params in parts of the app.
- Tokens are stored in `localStorage`/`sessionStorage`.
- “Encryption” is reversible base64.
- Session validity checks are intentionally disabled.
- Debug logs print session-bearing request details.

Required remediation:

1. Remove query-string auth.
2. Restrict auth transport to headers or httpOnly cookies.
3. Remove reversible client-side token encoding.
4. Restore server-validated session state checks.
5. Strip security-sensitive console logs.

Mitigation while work is pending:

- Disable verbose frontend logging in production build immediately.
- Purge any reverse-proxy/app logs that might already contain query-string session keys.

Acceptance criteria:

- No session token appears in URL, logs, or persisted browser storage unless explicitly justified and documented.

## High-Priority Findings

### 5. Production deployment scripts embed credentials and unsafe defaults

Evidence:

- [deploy_live_production.sh](/var/www/SAP-Python/deploy_live_production.sh:98)
- [deploy_live_production.sh](/var/www/SAP-Python/deploy_live_production.sh:139)
- [.github/workflows/deploy.yml](/var/www/SAP-Python/.github/workflows/deploy.yml:87)

Problems:

- Static DB password creation in deployment script
- Static superuser password creation in deployment script
- CI deploy resets live server state with `git reset --hard` and `git clean -fd`

Required remediation:

- Retire these scripts from production use.
- Replace with secret-backed provisioning and non-destructive deployment.
- Move database/user bootstrap into one-time operator-run setup, not routine deploy.

### 6. Stored-XSS risk in CRM email template preview

Evidence:

- [frontend/src/pages/services/crm/components/EmailTemplatePreviewModal.tsx](/var/www/SAP-Python/frontend/src/pages/services/crm/components/EmailTemplatePreviewModal.tsx:38)

Problem:

- `dangerouslySetInnerHTML` renders template HTML without evidence of sanitization.

Required remediation:

- Sanitize HTML server-side and client-side or render within a sandboxed iframe.

### 7. Public API documentation exposure in top-level URLs

Evidence:

- [backend/sap_backend/urls.py](/var/www/SAP-Python/backend/sap_backend/urls.py:37)

Problem:

- Schema and Swagger/ReDoc are mounted unconditionally.

Required remediation:

- Gate docs behind admin auth or disable in production.

## Medium-Priority Findings

### 8. Duplicate/parallel backend implementations create drift

Evidence:

- [backend/authentication/views.py](/var/www/SAP-Python/backend/authentication/views.py:1468)
- [backend/authentication/views.py](/var/www/SAP-Python/backend/authentication/views.py:3769)
- [backend/finance/viewsets.py](/var/www/SAP-Python/backend/finance/viewsets.py:68)
- [backend/finance/views.py](/var/www/SAP-Python/backend/finance/views.py:80)
- [backend/finance/views_new.py](/var/www/SAP-Python/backend/finance/views_new.py:1)

Problem:

- Duplicate service-user auth blocks and multiple finance implementations increase merge risk and security divergence.

Remediation:

- Collapse to one active implementation path per domain.

### 9. Serializer hot paths likely cause N+1 and heavy per-row logic

Evidence:

- [backend/finance/serializers.py](/var/www/SAP-Python/backend/finance/serializers.py:723)
- [backend/finance/serializers.py](/var/www/SAP-Python/backend/finance/serializers.py:1046)
- [backend/finance/serializers.py](/var/www/SAP-Python/backend/finance/serializers.py:2121)
- [backend/finance/serializers.py](/var/www/SAP-Python/backend/finance/serializers.py:2245)

Problem:

- List serializers compute counts, nested items, shipping-address resolution, and TDS loops per object.

Remediation:

- Move repeated calculations into annotated querysets, prefetched relations, or denormalized read models.

### 10. Frontend build/bundle inefficiency

Evidence:

- Build output during audit
- [frontend/src/pages/services/crm/index.tsx](/var/www/SAP-Python/frontend/src/pages/services/crm/index.tsx:8)
- [frontend/src/pages/services/crm/CRMLayout.tsx](/var/www/SAP-Python/frontend/src/pages/services/crm/CRMLayout.tsx:1)

Problem:

- A dynamically imported CRM dashboard is also statically imported elsewhere, defeating chunk splitting.
- One route chunk is oversized at `752.96 kB`.

Remediation:

- Fix static/dynamic duplication.
- Split dashboard-heavy modules more aggressively.
- Remove unused dependencies.

## Dead Code / Abandoned Surface

Potentially safe-to-delete or archive after verification:

- [frontend/src/hooks/useAuth.tsx](/var/www/SAP-Python/frontend/src/hooks/useAuth.tsx:1)
  Confidence: `95%`
- [backend/finance/views_new.py](/var/www/SAP-Python/backend/finance/views_new.py:1)
  Confidence: `85%`
- [frontend/src/utils/diagnostic.js](/var/www/SAP-Python/frontend/src/utils/diagnostic.js:1)
  Confidence: `90%`
- [frontend/src/utils/quickPosition.js](/var/www/SAP-Python/frontend/src/utils/quickPosition.js:1)
  Confidence: `90%`
- [frontend/src/utils/positionElement.js](/var/www/SAP-Python/frontend/src/utils/positionElement.js:1)
  Confidence: `90%`
- `backend/venv/` committed under repo root
  Confidence: `100%` as non-source artifact

## Dependency Findings

### Frontend packages with no import hits in scanned app code

Observed zero import hits for:

- `antd`
- `@ant-design/icons`
- `moment`
- `dayjs`
- `chart.js`
- `react-chartjs-2`
- `html2canvas`
- `jspdf`
- `socket.io-client`
- `@headlessui/react`
- `vite-plugin-pwa`
- `workbox-window`

Impact:

- Install size bloat
- Lockfile complexity
- Potential build/update churn

### Backend heavyweight packages with little or no observed usage

Observed no import hits for:

- `sentence-transformers`
- `transformers`
- `torch`
- `sklearn`
- `matplotlib`
- `seaborn`

Observed limited import usage:

- `face_recognition` only in [backend/hr/attendance_views.py](/var/www/SAP-Python/backend/hr/attendance_views.py:471)

Recommendation:

- Split heavy optional features into separate requirements files or service boundaries.

## Database / ORM Findings

### Dynamic table-name SQL in backup/export logic

Evidence:

- [backend/configuration/backup_manager.py](/var/www/SAP-Python/backend/configuration/backup_manager.py:303)
- [backend/configuration/backup_manager.py](/var/www/SAP-Python/backend/configuration/backup_manager.py:336)

Problem:

- Table identifiers are interpolated into raw SQL strings.

Risk:

- If identifier sources broaden beyond trusted internals, SQL injection risk appears at the identifier layer.

Remediation:

- Use identifier-safe composition with `psycopg.sql.Identifier`.

### Index recommendations

Based on routed queryset patterns and ordering:

```sql
CREATE INDEX CONCURRENTLY idx_finance_customer_company_created
ON finance_customer (company_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_finance_payment_company_date_created
ON finance_payment (company_id, payment_date DESC, created_at DESC);

CREATE INDEX CONCURRENTLY idx_finance_invoice_company_date
ON finance_invoice (company_id, invoice_date DESC);
```

Evidence driving recommendation:

- [backend/finance/viewsets.py](/var/www/SAP-Python/backend/finance/viewsets.py:128)
- [backend/finance/direct_payment_views.py](/var/www/SAP-Python/backend/finance/direct_payment_views.py:105)
- [backend/reports/views.py](/var/www/SAP-Python/backend/reports/views.py:108)

Estimated gain:

- `30-60%` faster list/report queries on the most common company-scoped paths once combined with query cleanup.

## Testing Assessment

Backend:

- About `37` test files were found excluding the committed virtualenv.
- Strongest visible tenant-isolation coverage is [backend/authentication/tests/test_service_user_auth.py](/var/www/SAP-Python/backend/authentication/tests/test_service_user_auth.py:17).
- That coverage is valuable, but it is aligned mainly to the newer scoped/authenticated pattern, not the full legacy routed surface still in use.

Frontend:

- No `*.test.*` or `*.spec.*` files were found under `frontend/src`.

Risk:

- Security-sensitive regressions in frontend auth handling and route gating are unlikely to be caught automatically.

## Lifecycle / Access-State Assessment

Evidence:

- [backend/authentication/models.py](/var/www/SAP-Python/backend/authentication/models.py:316)
- [backend/authentication/models.py](/var/www/SAP-Python/backend/authentication/models.py:324)
- [backend/verify_user_management.py](/var/www/SAP-Python/backend/verify_user_management.py:118)
- [frontend/src/store/authStore.ts](/var/www/SAP-Python/frontend/src/store/authStore.ts:145)

Problem:

- Lifecycle access-state logic exists on the model, but the required centralized access-state endpoint is not implemented.
- Frontend still gates based on locally stored auth flags.

Operational consequence:

- Workflow gating is vulnerable to drift between backend truth and frontend navigation behavior.

Required remediation:

1. Create a single backend access-state endpoint.
2. Return:
   - access stage
   - allowed modules
   - redirect target
   - explanation
3. Make frontend route/menu guards consume that endpoint only.

## Observability and Logging

Evidence:

- `796` `console.*` matches in `frontend/src`
- `1332` `print/logger.*` matches in `backend`
- [secure_production.sh](/var/www/SAP-Python/secure_production.sh:168)

Problems:

- Excessive debug logging remains in production code paths.
- PostgreSQL hardening script enables `log_statement = 'all'`, which is too broad and can leak sensitive content.
- No evidence of centralized monitoring such as Sentry, OpenTelemetry, or Prometheus.

Remediation:

- Adopt structured application logging.
- Remove secret-bearing debug statements.
- Replace full SQL statement logging with targeted slow-query logging.

## Performance Bottleneck Matrix

| Area | Severity | Impact | Root Cause | Recommended Fix | Estimated Gain |
|---|---|---:|---|---|---:|
| AI/API security surface | Critical | Extreme | Public SQL execution/export path | Require auth, remove raw SQL input, add allowlist | Risk elimination |
| Frontend initial load | High | High | Oversized route chunks and CSS | Split dashboard modules, remove unused deps | `120-220 kB` initial JS reduction |
| ORM serialization | High | Medium/High | Per-object serializer loops and nested queries | annotate/prefetch/select_related | `40-70%` fewer queries on some lists |
| DB list/report queries | Medium | Medium | Missing composite indexes | add company/date indexes | `30-60%` query improvement |
| Auth/session UX | High | High | stale local storage trust and disabled validation | server access-state + header-only auth | lower stale-session failures |
| Deployment | High | High | destructive CI and credentialed shell scripts | non-destructive deploy + secret-backed provisioning | major operational risk reduction |

## Remediation Workbook

### Phase 0: Emergency Containment

Target window: `same day`
Owner: platform/backend lead

Tasks:

- Block or disable `/api/ai/*` at reverse proxy until backend hardening lands.
- Rotate all exposed credentials:
  - user reset passwords
  - DB credentials
  - SMTP/app passwords
  - Django secret key
  - encryption key
- Disable public docs endpoints in production.
- Remove production debug logging that includes auth/session details.

Success criteria:

- No public arbitrary SQL execution path remains reachable.
- All exposed secrets are invalidated.

Rollback/mitigation:

- If AI assistant is business-critical, temporarily restrict by source IP and admin-only basic auth instead of full removal while code remediation is prepared.

### Phase 1: Access Control Normalization

Target window: `1-2 weeks`
Owner: backend lead

Tasks:

1. Build an endpoint inventory of routed `AllowAny` APIs.
2. Reclassify each endpoint by intended audience.
3. Migrate finance/report routes first to:
   - `ServiceUserSessionAuthentication`
   - `IsServiceUserAuthenticated`
   - `CompanyScopedModelViewSet`
4. Add route-level tests for:
   - missing auth
   - invalid session
   - suspended company
   - cross-tenant retrieve/update/delete

Success criteria:

- No internal finance/report CRUD path remains `AllowAny`.
- Tenant-scoping tests pass for migrated surfaces.

Mitigation:

- Use feature flags or route-by-route migration rather than attempting a single large auth rewrite.

### Phase 2: Secret and Deployment Hygiene

Target window: `1-2 weeks`
Owner: DevOps/platform

Tasks:

- Remove tracked `.env` and credential artifacts from repo.
- Move all required secrets to deployment environment or secret manager.
- Replace destructive CI deploy with safe rollout steps.
- Retire static-credential bootstrap scripts from active use.

Success criteria:

- Clean production deployment requires externally injected secrets only.
- CI deploy no longer wipes local server state.

Mitigation:

- Keep old scripts archived outside production path for forensic reference only, not executable by normal workflows.

### Phase 3: Lifecycle Access-State Centralization

Target window: `1-2 weeks`
Owner: backend + frontend

Tasks:

- Implement backend access-state endpoint driven by model lifecycle logic.
- Return canonical stage and allowed module list.
- Refactor frontend route/menu gating to consume endpoint instead of local flags.

Success criteria:

- Route protection no longer depends on locally cached lifecycle booleans.

Mitigation:

- Keep old frontend gating temporarily behind fallback only during rollout, then remove once verified.

### Phase 4: Query and Bundle Performance

Target window: `2-4 weeks`
Owner: backend/frontend leads

Tasks:

- Optimize serializer/queryset hot paths.
- Add recommended DB indexes.
- Fix CRM chunking collision and oversized dashboard bundles.
- Remove unused dependencies and debug utilities.

Success criteria:

- Query counts decrease measurably on finance list pages.
- Frontend initial load is reduced on heavy dashboards.

Mitigation:

- Benchmark before/after to avoid accidental regressions from premature micro-optimizations.

## Detailed Action Plan

### Immediate actions

1. Disable `/api/ai/*` publicly.
2. Rotate secrets and invalidate credential-reset artifacts.
3. Disable production docs exposure.
4. Remove session-bearing console logging from finance/frontend hot paths.

### Short-term actions

1. Convert AI assistant to authenticated, admin-only, query-ID-based export flow.
2. Migrate finance analytics, reports, and direct-payment routes to centralized auth/scoping.
3. Replace query-string service auth with header-only transport.
4. Implement backend access-state endpoint for lifecycle gating.

### Medium-term actions

1. Collapse duplicate auth implementations in `authentication/views.py`.
2. Remove dead frontend debug utilities and unused deps.
3. Normalize deployment scripts and retire unsafe bootstrap logic.
4. Add structured logging and centralized monitoring.

### Long-term actions

1. Separate auxiliary products and exports from the main app repo.
2. Split heavy optional ML/vision features into isolated services or optional installs.
3. Establish domain-based architecture ownership with enforced security base classes.

## Mitigation Plan

### If full remediation cannot happen immediately

Apply these controls in order:

1. Reverse-proxy deny rules for AI and docs routes.
2. Credential rotation and account invalidation.
3. Production logging reduction.
4. Route allowlisting for critical internal APIs only.
5. Manual review gate for all changes touching auth, permissions, routing, and deployment scripts.

### Monitoring during remediation

Track:

- 401/403/429 rates on migrated endpoints
- access to `/api/ai/*`, `/api/docs/*`, `/api/schema/*`
- auth failures and suspicious cross-tenant access attempts
- DB slow query logs for finance/reporting paths
- frontend error rate on auth/session transitions

### Rollback approach

- Migrate routes incrementally behind clear versioned endpoints or feature flags.
- Keep old endpoints disabled rather than partially exposed.
- Do not roll back secret rotations; instead update dependent services to new credentials.

## Recommended Deliverables After This Report

1. Route inventory spreadsheet of all `AllowAny` endpoints with intended audience and remediation owner.
2. Secret-rotation checklist and completion log.
3. AI assistant hardening change set.
4. Access-state endpoint design note.
5. Deployment pipeline replacement plan.
6. Backend query/performance benchmark pack.

## Closing Assessment

This codebase is not irredeemable; the core issue is not lack of capability but lack of consolidation. Secure patterns already exist in the repository. The fastest path to materially lower risk is:

1. contain exposed surfaces,
2. remove secrets from source control,
3. migrate routed APIs onto the secure shared auth/scoping layer,
4. centralize lifecycle access-state,
5. simplify the deployment story.

That sequence reduces production risk faster than broad refactoring and should be treated as the governing remediation order.
