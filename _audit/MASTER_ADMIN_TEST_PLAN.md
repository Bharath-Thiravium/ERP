# MASTER_ADMIN_TEST_PLAN.md

**Scope:** The Master Admin provisioning workflow only, as actually implemented in
`backend/authentication/`. **READ-ONLY analysis — no code modified.**

```
Master Admin → Company Creation → Service Assignment → Company Login
            → Service User Creation → Permission Assignment
```

**Implementing endpoints (verified in `authentication/urls.py` + `views.py`):**
| Step | Endpoint | View (active def) |
|------|----------|-------------------|
| MA login | `POST /api/auth/master-admin/login/` | `MasterAdminLoginView` |
| Create company | `POST /api/auth/companies/` | `CompanyListCreateView` (views.py:2439) |
| List/inspect companies | `GET /api/auth/companies/` , `GET /api/auth/companies/<id>/` | `CompanyListCreateView`, `CompanyDetailView` (2567) |
| Service assignment | during create; `GET/POST /api/auth/companies/<id>/service-credentials/` | `CompanyServiceCredentialsView` (3530) |
| Approve/reject | `POST /api/auth/companies/<id>/approve/` | `CompanyApprovalView` (2854) |
| Company login | `POST /api/auth/company/login/` | `CompanyUserLoginView` (2917) |
| Service-user CRUD | `GET/POST /api/auth/company/service-users/`, `…/<id>/` | `CompanyServiceUserListCreateView` (3795), `…DetailView` (3837) |
| Service access (perm) | `POST /api/auth/services/<id>/access/` | `ServiceAccessView` (3212) |
| Reset company pw | `POST /api/auth/companies/<id>/reset-password/` | `CompanyPasswordResetView` (4266) |

> ⚠️ Note for testers: every one of these view classes is **defined twice** in `views.py`
> (e.g. lines 138 **and** 2439). Python keeps the **second** definition; the first is dead code.
> Test against runtime behavior, and see `MASTER_ADMIN_BUG_CHECKLIST.md` item #1.

---

## STEP 1 — Master Admin Login

**Expected behavior:** Valid master-admin credentials return a JWT (`access`/`refresh`) and
`is_master_admin=true`; optional TOTP 2FA step. Invalid creds → 401. Routes to `/master-admin`.

**Database impact:** Reads `MasterAdmin`→`auth_user`. Writes a `SecurityLog` row (login event).
No tenant data touched.

**Security risks:** Brute force (mitigated by `RateLimitMiddleware`); JWT signed with `SECRET_KEY`
(insecure default must be overridden); 2FA bypass if `requires_2fa` not enforced server-side.

**Common bugs:** 2FA enforced only in UI; token lifetime misconfig; login succeeds but role flag
missing → UI lets a non-admin reach `/master-admin` then 403s on API.

**Validation steps:**
1. Login with valid MA creds → 200 + tokens.
2. Login with wrong password → 401, `SecurityLog` records failure.
3. Exceed rate limit → 429.
4. With 2FA enabled, ensure step-2 is required by the **API**, not just the SPA.

**API checks:** `POST /api/auth/master-admin/login/`; then `GET /api/auth/validate-token/` with the
access token → confirms `master_admin` linkage. Also test `simple-login/` and `test-login/`
endpoints exist — **verify these are not auth bypasses** (see bug checklist #12).

**UI checks:** `/login` (userType=master) → `/2fa` when required → `/master-admin`. Wrong creds show
error, no token persisted.

---

## STEP 2 — Company Creation

**Expected behavior:** Master admin `POST /api/auth/companies/` creates a `Company`
(`approval_status='pending'`, unique `company_prefix`), a primary `CompanyUser` (+ `auth_user`),
optional `CompanyService` rows, and a `Notification` to the company user. Response returns the
company + the **company user's plaintext password once**. Non-master → 403.

**Database impact (single `transaction.atomic`):** INSERT `Company`, `auth_user`, `CompanyUser`,
`CompanyService`(s), `Notification`; `SecurityLog` (`COMPANY_CREATED`); **writes a service-
credentials file to disk** (`_save_service_credentials_file`).

**Security risks:**
- Plaintext company-user password in the HTTP response (must be HTTPS-only, never logged).
- Service credentials persisted to a file on disk (`scripts/service_credentials_*.txt`) — sensitive.
- `company_prefix` uniqueness race → duplicate prefixes corrupt auto-numbering across tenants.
- Mass-assignment: ensure `approval_status`/`created_by` cannot be set from payload.

**Common bugs:** Duplicate `company_prefix` (unique constraint → 500 instead of 400); partial
creation if the atomic block is broken; missing company user (`company.users.first()` is `None`)
→ notification/credentials skipped silently; email/domain normalization edge cases.

**Validation steps:**
1. Create company as MA → 201; verify Company + CompanyUser + CompanyService + Notification rows.
2. Attempt duplicate `company_prefix`/email → expect 400 (not 500).
3. Create as a **company user** or **service user** → 403.
4. Verify the credentials file is created with restrictive perms and is gitignored.
5. Confirm `approval_status` defaults to `pending` regardless of payload.

**API checks:** `POST /api/auth/companies/` (MA token); negative tests with company/service tokens
and no token (401). `GET /api/auth/companies/` returns the new company for MA only.

**UI checks:** Master-admin dashboard "Create Company" form; success shows one-time credentials;
new company appears as **Pending**.

---

## STEP 3 — Service Assignment

**Expected behavior:** Master admin assigns Services to a company → `CompanyService` rows
(`unique_together` company+service), each with a `service_password` and `assigned_by=MA`. Re-assign
is idempotent (`get_or_create`).

**Database impact:** INSERT/UPDATE `CompanyService` (idempotent via `get_or_create` at
views.py:3502); writes/updates service credentials; `SecurityLog`.

**Security risks:** Per-company `service_password` is a **shared secret** across all that company's
users; stored hashed (good) but transmitted/recorded at creation; assigning a service to the wrong
company (IDOR on `company_id`).

**Common bugs:** Duplicate assignment not idempotent in all code paths (two patterns exist: bare
`create` at 2611 vs `get_or_create` at 3502 → possible `IntegrityError`); inactive service still
assignable; `is_active` flag not respected on access.

**Validation steps:**
1. Assign a service to a company → `CompanyService` created, `is_active=True`.
2. Re-assign same service → no duplicate, no 500.
3. Assign a disabled/inactive `Service` → expect rejection.
4. Confirm `assigned_by` = the acting master admin.

**API checks:** `GET/POST /api/auth/companies/<id>/service-credentials/`;
`GET /api/auth/company/assigned-services/` (as company user) reflects assignment.
Master-admin service catalog: `GET /api/auth/master-admin/services/`, create/update/toggle/delete.

**UI checks:** Services-management screen lists/toggles services; company dashboard "Service
Selection" shows only assigned, active services.

---

## STEP 4 — Company Login

**Expected behavior:** `POST /api/auth/company/login/` returns JWT for the `CompanyUser`, plus
lifecycle flags `first_login_required` / `approval_pending`. A pending company logs in but is gated
(profile/approval). Forced password change if flagged.

**Database impact:** Reads `CompanyUser`→`auth_user`→`Company`; `SecurityLog`; may set
`UPDATE_LAST_LOGIN` (off by default).

**Security risks:** Lifecycle gating must be **server-enforced** on every business endpoint, not
just returned as flags for the SPA; a pending company must not reach service data.

**Common bugs:** `approval_pending`/`first_login_required` returned but not enforced by APIs;
rejected company can still authenticate and call endpoints; password-reset flag not honored.

**Validation steps:**
1. Login as approved company → 200, `approval_pending=false`.
2. Login as pending company → 200 but business endpoints 403.
3. Login as rejected company → confirm access blocked at API.
4. With forced-reset set → login requires password change before any other call.

**API checks:** `POST /api/auth/company/login/`; then call a service endpoint while pending → expect
403 (`ServiceAccessView` enforces `approval_status=='approved'`).

**UI checks:** `/company` → redirects to `/company/detailed-info` (first login) or
`/company/waiting-approval` (pending); blocking `PasswordChangeModal` when forced.

---

## STEP 5 — Service User Creation

**Expected behavior:** A **company user** `POST /api/auth/company/service-users/` creates a
`CompanyServiceUser` scoped to **their own** company, for a service **assigned & active** for that
company, with a generated `unique_service_id` + one-time password. Master admin does **not** create
service users (company admin does).

**Database impact:** INSERT `CompanyServiceUser` (`company` bound server-side, `created_by=request
user`, `password` hashed, `password_expires_at=+90d`); `SecurityLog`.

**Security risks (verified in `CompanyServiceUserCreateSerializer`, serializers.py:446):**
- ✅ `company` is bound from `request.user.company_user.company` (not payload) — no cross-tenant create.
- ✅ `service_id` validated to be assigned & active for the company.
- 🔴 **`role` is accepted from the payload with no validation** — a company user can create a
  service user with `role='admin'` (privilege escalation). Violates the AGENTS.md guardrail
  "project admin cannot create admins." See bug checklist #3.
- Generated password is 12 chars **letters+digits only** (no special chars) — may not meet the
  company password policy; returned in plaintext once.

**Common bugs:** Username uniqueness uses `initial_data.get('service_id')` (may be `None` if field
ordering differs) → duplicate usernames; email/domain auto-format edge cases; creating a user for a
service the company doesn't have (should 400).

**Validation steps:**
1. As company user, create a service user for an assigned service → 201 with one-time credentials.
2. Create for a **non-assigned** service → 400 ("Service not assigned to your company").
3. Create with `role='admin'` → **EXPECTED to be blocked; currently likely allowed** (record result).
4. Duplicate username within same company+service → 400.
5. Attempt to set `company`/`company_id` in payload → must be ignored (server binds it).

**API checks:** `POST /api/auth/company/service-users/`; `GET` returns only this company's users;
`…/<id>/` PUT/PATCH/DELETE only within company (404 otherwise).

**UI checks:** Company dashboard "Service Users" create form; role dropdown; one-time credential
display; list shows only this company's users.

---

## STEP 6 — Permission Assignment (Service Access / Role)

**Expected behavior:** Service user logs in via `POST /api/auth/service-user/login/` → receives a
`session_key` (custom session auth). Access to a service requires the company to be approved, the
service assigned/active, and (for `ServiceAccessView`) the correct `service_password`. Role
(admin/manager/user) governs in-service capability.

**Database impact:** INSERT `ServiceUserSession` (`session_key`, `is_active`, `expires_at`); updates
`last_seen_at`; `SecurityLog` (`SERVICE_ACCESS`).

**Security risks:**
- 🔴 Session key accepted as a **URL query parameter** (`?session_key=`) in both the auth class and
  `IsServiceUser` — leaks into logs/history/referer. See PERMISSION_LEAK_CHECKLIST.md.
- Role checks must be enforced **server-side per action**, not just hidden in UI.
- `IsServiceUser.has_permission` grants access to any authenticated `company_user` without a
  company match — relies on view-level scoping.

**Common bugs:** Expired session still accepted (verify `expires_at` check fires); inactive
service user/company not blocked (the `IsServiceUserAuthenticated` checks exist — verify they're
actually applied to every service endpoint); role escalation (a `user` performing `admin` actions).

**Validation steps:**
1. Service-user login → `session_key`; call a service endpoint with `Authorization: Bearer <key>`.
2. Use an **expired**/`is_active=false` session → 401.
3. Service user of company A queries company B's IDs → 403/404 (no data).
4. Role `user` attempts an admin-only action → 403.
5. Company set to `pending` after login → subsequent calls blocked (`IsServiceUserAuthenticated`).

**API checks:** `POST /api/auth/service-user/login/`, `…/logout/`, `…/change-password/`;
`POST /api/auth/services/<id>/access/`; cross-tenant negative tests on every `/api/<service>/` area.

**UI checks:** `/service-login` → service dashboard; logout invalidates session; role-gated buttons
hidden AND backed by server checks.

---

## Regression / cross-cutting test matrix

| Test | Expectation |
|------|-------------|
| Non-MA hits any `companies/*` write | 403 / empty queryset |
| Company A user reads Company B service-users | 404 / none |
| Service user A reads service B (not assigned) | 403/404 |
| Pending company calls any business API | 403 |
| Rejected company login → business API | blocked |
| Duplicate company_prefix | 400 (not 500) |
| role='admin' on service-user create | should be blocked (verify) |
| session_key in query string | should be rejected/deprecated |
| One-time passwords | never logged; HTTPS only |
