# MULTI_TENANT_SECURITY_CHECKLIST.md

Tenant-isolation verification for the Master Admin workflow. The tenant boundary is
**`authentication.Company`**; every business record FKs to it (row-level multi-tenancy).
**READ-ONLY analysis — no code changed.**

## Tenant model (verified)

- `MasterAdmin` (global) → creates/approves `Company`.
- `CompanyUser` (1–1 `auth_user`, FK `Company`) — tenant admin, **JWT** auth.
- `CompanyServiceUser` (FK `Company` + `Service`, role admin/manager/user) — **session-key** auth.
- Isolation is enforced by **scoping querysets to the caller's company**, not by separate schemas.
  → Any view that forgets the company filter is a cross-tenant leak.

## Confirmed-correct controls (keep these as regression tests)

| Control | Evidence |
|---------|----------|
| Company list/detail visible to master admin only | `CompanyListCreateView.get_queryset` returns `Company.objects.none()` for non-MA (views.py:2446) |
| Service-user create binds company server-side | `CompanyServiceUserCreateSerializer.create`: `company = request.user.company_user.company` (not payload) |
| Service-user list/detail scoped to caller's company | `CompanyServiceUserListCreateView`/`DetailView.get_queryset` filter `company=request.user.company_user.company` |
| Service-user create restricted to assigned, active services | `validate_service_id` checks `CompanyService(company, service_id, is_active=True)` |
| Service access requires approved company + assigned service | `ServiceAccessView` checks `approval_status=='approved'` and `CompanyService` |
| Service session enforces active user + approved company | `IsServiceUserAuthenticated` |

## Isolation checklist (must all pass)

### A. Company-scope on reads
- [ ] Company A's `CompanyUser` cannot list/read Company B's service users
      (`GET /api/auth/company/service-users/` returns only A's — verified by `get_queryset`).
- [ ] Master-admin-only company endpoints return **none/403** for company & service users.
- [ ] Every `/api/<finance|hr|inventory|crm|company-dashboard>/` list view filters by the caller's
      company. **AUDIT each app's `get_queryset`** — `authentication` is correct; the business apps
      must be checked the same way (this doc covers the auth flow; extend per app).

### B. Company-scope on writes (IDOR)
- [ ] `PUT/PATCH/DELETE /api/auth/company/service-users/<id>/` for an id belonging to **another**
      company → 404 (DetailView `get_queryset` scopes by company — verify no alternate path bypasses).
- [ ] Service-user create cannot set `company`/`company_id` via payload (server overrides — verify
      no field accepts it).
- [ ] `companies/<id>/approve|reset-password|service-credentials/` reject non-master admins.

### C. Cross-tenant object references
- [ ] A `CompanyServiceUser` of company A cannot be assigned a `Service` that is only assigned to B.
- [ ] Notifications created on company actions set `company_id` to the correct tenant only.
- [ ] `created_by`/`assigned_by`/`approved_by` always reference the acting principal, never spoofable.

### D. Lifecycle gating (server-enforced, not UI-only)
- [ ] `pending`/`rejected` company → business endpoints 403 (`ServiceAccessView` +
      `IsServiceUserAuthenticated` enforce `approval_status=='approved'`). Verify EVERY business app
      enforces it, not just `authentication`.
- [ ] `first_login_required` company cannot call business APIs before profile completion.
- [ ] Forced password reset blocks all other calls until changed (server-side, not just modal).

### E. Auth-token tenant binding
- [ ] A company-user JWT cannot be used to act as a different company (claims map to one
      `CompanyUser`→one `Company`).
- [ ] A `ServiceUserSession.session_key` resolves to exactly one `CompanyServiceUser`→`Company`;
      expired/inactive sessions rejected (verify `expires_at`/`is_active` checks in
      `ServiceUserSessionAuthentication`).
- [ ] `IsServiceUser` (which trusts any authenticated company_user) is never the **only** guard on a
      tenant-scoped resource — must be paired with company scoping.

### F. Provisioning-secret isolation
- [ ] Per-company `service_password` of A is never accepted for B.
- [ ] Service-credentials files are per-company, restrictive-permission, gitignored, and rotated.
- [ ] One-time passwords are returned once, over HTTPS, and not written to shared logs.

## Attack scenarios to run (negative tests)

| # | Scenario | Pass criteria |
|---|----------|---------------|
| 1 | Company A JWT → `GET /api/auth/company/service-users/` | only A's users |
| 2 | Company A JWT → `DELETE …/service-users/<B_id>/` | 404, B's user intact |
| 3 | Company A JWT → create service user with `{"company_id": B}` | created under A, not B |
| 4 | Service user A → `GET /api/finance/...` for B's records (id enumeration) | 403/404, no data |
| 5 | Pending company → any `/api/<service>/` | 403 |
| 6 | Expired `session_key` → any service endpoint | 401 |
| 7 | Company user → `companies/<id>/approve/` | 403 |
| 8 | Service user role=`user` → admin-only action | 403 |
| 9 | Reused JWT/session across tenants | rejected |

## Gaps to close (from code review)

- 🔴 **Per-app scoping not audited here** — `authentication` is correct, but tenant safety depends on
  **every** `finance/hr/inventory/crm` view repeating the company filter. Run scenario #4 across all
  business apps; per AGENTS.md, add backend tests for scope enforcement.
- 🔴 **`session_key` in query string** weakens session confidentiality (see PERMISSION_LEAK_CHECKLIST).
- 🟠 **Unvalidated `role`** lets a tenant admin mint `admin` service users (privilege within tenant).
- 🟠 **Duplicate view definitions** make it hard to be sure which scoping logic is live (bug #1).
