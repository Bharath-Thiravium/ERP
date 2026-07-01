# MASTER_ADMIN_BUG_CHECKLIST.md

Business-workflow defects found by reading `backend/authentication/{views,serializers,permissions,
authentication}.py`. **READ-ONLY — no code changed.** Each item = where, why it's a defect, how to
reproduce, severity. Severity: 🔴 High · 🟠 Medium · 🟡 Low.

## Architecture / correctness

### 1. 🔴 Every workflow view class is DEFINED TWICE in `views.py`
- **Where:** `CompanyListCreateView` (138 & 2439), `CompanyDetailView` (266 & 2567),
  `CompanyApprovalView` (553 & 2854), `CompanyUserLoginView` (616 & 2917), `CompanyServicesView`
  (878 & 3179), `ServiceAccessView` (911 & 3212), `CompanyServiceCredentialsView` (1229 & 3530),
  `ServiceUserLoginView` (1420 & 3721), `CompanyServiceUserListCreateView` (1494 & 3795),
  `CompanyServiceUserDetailView` (1536 & 3837), `CompanyPasswordResetView` (1965 & 4266).
- **Why a defect:** Python keeps only the **last** definition; ~1,400 lines of the first copies are
  dead/shadowed. A maintainer can "fix" the wrong copy and see no effect, or the two copies can
  drift, causing behavior that doesn't match the code being read.
- **Repro:** `grep -n "^class CompanyListCreateView" authentication/views.py` → two hits.
- **Action:** Confirm which definition is live; reconcile/remove the dead one (in a later, tested change).

### 2. 🟠 Authorization done by in-method checks, not `permission_classes`
- **Where:** Nearly all use `permission_classes=[IsAuthenticated]` then manually
  `if not hasattr(request.user,'master_admin'): 403`. (`CompanyListCreateView`, `CompanyApprovalView`,
  `ServiceAccessView`, etc.) Dedicated classes `IsMasterAdmin`/`IsCompanyUser` exist but are unused here.
- **Why a defect:** Adding a new HTTP method (e.g. `PATCH`) without repeating the manual check
  silently exposes it. Inconsistent with `IsMasterAdmin`/`IsCompanyUser` that already exist.
- **Repro:** Review each view's methods; check every non-GET path repeats the role guard.
- **Action:** Prefer declarative `permission_classes=[IsMasterAdmin]` etc.

### 3. 🔴 Service-user `role` is unvalidated → privilege escalation
- **Where:** `CompanyServiceUserCreateSerializer` (serializers.py:446); `fields = [..., 'role', ...]`
  with **no `validate_role`** and no creator-capability check.
- **Why a defect:** A company user can create a service user with `role='admin'`. AGENTS.md
  explicitly requires "role enforcement (project admin cannot create admins)." No server guard exists.
- **Repro:** `POST /api/auth/company/service-users/` with `{"role":"admin", ...}` → likely 201.
- **Action:** Add server-side role allow-list + creator-capability rule.

### 4. 🟠 Two non-idempotent paths for `CompanyService` assignment
- **Where:** bare `CompanyService.objects.create(...)` (views.py:2611) vs
  `get_or_create(...)` (3502).
- **Why a defect:** The `create` path can raise `IntegrityError` (unique_together company+service)
  → 500 on re-assignment, depending on which endpoint is used.
- **Repro:** Assign the same service twice through the create-path endpoint.
- **Action:** Standardize on `get_or_create`/upsert.

## Data integrity

### 5. 🟠 `company_prefix` uniqueness race / 500
- **Where:** `Company.company_prefix` unique; created during company creation.
- **Why a defect:** Concurrent creates or a duplicate prefix raise `IntegrityError` surfaced as 500
  rather than a clean 400; a duplicated prefix would corrupt per-company auto-numbering.
- **Repro:** Create two companies with the same prefix / hammer concurrently.
- **Action:** Validate + handle uniqueness explicitly; serialize prefix allocation.

### 6. 🟠 Approval has no state-machine guard (idempotency)
- **Where:** `CompanyApprovalView.post` (2854) sets status unconditionally.
- **Why a defect:** Approving an already-approved (or re-rejecting) company re-sends notifications
  and re-stamps `approved_by/at`; no guard against approve→reject→approve flapping.
- **Repro:** Call approve twice → two "approved" notifications.
- **Action:** Guard transitions; no-op if already in target state.

### 7. 🟡 `company.users.first()` assumed present
- **Where:** `CompanyListCreateView.create` (notification + credentials).
- **Why a defect:** If no `CompanyUser` was created, notification/credentials are silently skipped;
  response `user_credentials.email=None`.
- **Repro:** Any creation path that doesn't produce a company user.
- **Action:** Assert a company user exists within the atomic block.

## Secrets / disclosure

### 8. 🔴 Service credentials written to a file on disk
- **Where:** `_save_service_credentials_file` (CompanyListCreateView) → `get_safe_scripts_path()`;
  `.gitignore` already excludes `service_credentials_*.txt` (confirming sensitivity).
- **Why a defect:** Plaintext service credentials persisted to disk = exposure if the box or backups
  are compromised; lifecycle/rotation unclear.
- **Action:** Avoid persisting plaintext; deliver once via response, store only hashes.

### 9. 🟠 One-time passwords returned in plaintext in responses
- **Where:** company-user password in create response; service-user generated password in
  `perform_create`/`create`.
- **Why a defect:** Sensitive material in API bodies — must be HTTPS-only and never logged; risk if
  request/response logging is enabled.
- **Action:** Confirm no logging middleware captures bodies; document one-time handling.

### 10. 🟡 Weak generated passwords (no special chars / complexity)
- **Where:** serializer `''.join(secrets.choice(ascii_letters+digits) for _ in range(12))`.
- **Why a defect:** 12 chars without symbols/guaranteed classes; may not satisfy the password policy
  the frontend advertises (`@$!%*?&`). Inconsistent policy.
- **Action:** Use a policy-compliant generator.

## Auth surface

### 11. 🔴 `session_key` accepted via URL query parameter
- **Where:** `ServiceUserSessionAuthentication.authenticate` and `IsServiceUser.has_permission`
  both fall back to `request.GET.get('session_key')`.
- **Why a defect:** Session keys in URLs leak via access logs, browser history, `Referer`. (Detail
  in PERMISSION_LEAK_CHECKLIST.md.)
- **Action:** Accept only the `Authorization` header.

### 12. 🟠 Extra/alternate login endpoints — verify they're not bypasses
- **Where:** `master-admin/simple-login/` (`simple_master_admin_login`), `master-admin/test-login/`
  (`test_login`), and `test-no-auth/` (`test_no_auth`).
- **Why a defect:** "simple"/"test"/"no-auth" endpoints in production auth surface are classic
  bypass risks (weaker checks, debug shortcuts).
- **Repro:** Call each unauthenticated; inspect what they return/grant.
- **Action:** Confirm they enforce full auth or remove them from prod routing.

### 13. 🟡 `IsServiceUser` trusts any authenticated `company_user`
- **Where:** `permissions.py` — `if hasattr(request.user,'company_user') and authenticated: return True`.
- **Why a defect:** Grants the permission regardless of which company/resource; safe only because
  views scope querysets. A view that trusts the permission alone leaks across tenants.
- **Action:** Pair with object-level/company scoping everywhere; don't rely on this class alone.

## Quick verification commands (read-only)
```bash
cd backend
grep -nc "^class CompanyListCreateView" authentication/views.py          # expect 2 (bug #1)
grep -n "validate_role" authentication/serializers.py                    # expect none (bug #3)
grep -n "session_key" authentication/authentication.py authentication/permissions.py  # query-param (bug #11)
grep -n "simple-login\|test-login\|test-no-auth" authentication/urls.py  # bug #12
```
