# PERMISSION_LEAK_CHECKLIST.md

Focus: places in the Master Admin → Service User workflow where **authorization can be bypassed**
or **privileges/secrets can leak**. Derived from `authentication/{views,serializers,permissions,
authentication}.py`. **READ-ONLY — no code changed.** Severity: 🔴 High · 🟠 Medium · 🟡 Low.

## Confirmed leak vectors (with evidence)

### L1 — 🔴 Session key accepted in URL query parameter
- **Evidence:** `ServiceUserSessionAuthentication.authenticate` → `elif 'session_key' in request.GET`;
  `IsServiceUser.has_permission` → `request.GET.get('session_key')`.
- **Leak:** `?session_key=...` is captured by web-server access logs, proxy logs, browser history,
  and forwarded in the `Referer` header to third parties — full session hijack material.
- **Check:** Grep for `session_key` query usage; attempt `GET /api/.../?session_key=<valid>` → if it
  authenticates, the vector is live.
- **Expected fix direction:** Accept session keys only via `Authorization: Bearer`.

### L2 — 🔴 Privilege escalation via unvalidated `role`
- **Evidence:** `CompanyServiceUserCreateSerializer` exposes `role` with no `validate_role`.
- **Leak:** Tenant admin (or any company user able to hit the endpoint) creates `role='admin'`
  service users → elevates privilege within the tenant; breaks "admin cannot create admins."
- **Check:** `POST /api/auth/company/service-users/` `{"role":"admin"}` → 201 = leak.

### L3 — 🟠 `IsServiceUser` over-grants to company users
- **Evidence:** `permissions.py`: returns `True` for any authenticated `company_user` **before** any
  company/object scoping.
- **Leak:** If a view relies on `IsServiceUser` alone (no `get_queryset` company filter), a company
  user reaches another tenant's data or service-user-only actions.
- **Check:** Find views using `IsServiceUser` without company-scoped querysets.

### L4 — 🟠 Object-level access depends on `get_queryset`, not object permissions
- **Evidence:** `CompanyServiceUserDetailView`/`CompanyDetailView` rely on `get_queryset` scoping;
  no `has_object_permission`.
- **Leak:** Any alternate retrieval path (custom action, `get_object_or_404(Model, pk=...)` without
  the scoped queryset — e.g. `CompanyApprovalView` uses `get_object_or_404(Company, id=company_id)`)
  bypasses tenant scoping. `CompanyApprovalView` is master-admin-gated so it's OK, but the **pattern**
  is fragile — audit every `get_object_or_404(<Model>, ...)` that isn't scoped.
- **Check:** `grep -n "get_object_or_404(" authentication/views.py` and confirm each is role/tenant gated.

### L5 — 🟠 In-method role checks (easy to forget)
- **Evidence:** `permission_classes=[IsAuthenticated]` + manual `hasattr(request.user,'master_admin')`.
- **Leak:** A new method or branch missing the manual check is fully open to any authenticated user.
- **Check:** For each view, confirm **every** method (GET/POST/PUT/PATCH/DELETE) repeats the guard.

### L6 — 🟠 Debug/alternate auth endpoints
- **Evidence:** `master-admin/simple-login/`, `master-admin/test-login/`, `test-no-auth/`.
- **Leak:** "simple"/"test"/"no-auth" auth endpoints commonly skip 2FA/rate-limit/full validation.
- **Check:** Call each unauthenticated and as a low-priv user; confirm no token/role is granted.

### L7 — 🟠 Secret disclosure surfaces
- **Evidence:** plaintext passwords in create responses; `_save_service_credentials_file` writes
  credentials to disk.
- **Leak:** Secrets exposed via response logging, on-disk files, or backups.
- **Check:** Ensure no request/response body logging; verify file perms (0600) + gitignore + rotation.

### L8 — 🟡 Forced-reset / lifecycle enforced only as flags
- **Evidence:** login returns `first_login_required`/`approval_pending`; SPA enforces via
  `ProtectedRoute`.
- **Leak:** If business APIs don't independently enforce these, a crafted client skips the gate.
- **Check:** With a `pending`/`must-reset` principal, call business endpoints directly → must 403.

## Privilege-boundary matrix (who may do what)

| Action | Master Admin | Company User | Service User | Leak test |
|--------|:---:|:---:|:---:|-----------|
| Create/list companies | ✅ | ❌ | ❌ | company/service token → 403/none |
| Approve/reject company | ✅ | ❌ | ❌ | company token → 403 |
| Assign services to company | ✅ | ❌ | ❌ | company token → 403 |
| Reset company password | ✅ | ❌ | ❌ | company token → 403 |
| Create service users | ❌ | ✅ (own company) | ❌ | other-company id ignored |
| Assign `role=admin` to service user | — | ❓ **should be restricted** | ❌ | L2 |
| Access a service | ❌ | ✅ (approved+assigned) | ✅ (session) | pending → 403 |
| Read another tenant's data | ❌ | ❌ | ❌ | id enumeration → 404 |

## Leak-hunting commands (read-only)
```bash
cd backend
grep -n "session_key" authentication/authentication.py authentication/permissions.py   # L1
grep -n "role" authentication/serializers.py | grep -i serializ -n; grep -n "validate_role" authentication/serializers.py  # L2 (expect no validate_role)
grep -n "IsServiceUser\b" -r authentication | grep -v IsServiceUserAuthenticated         # L3 usage
grep -n "get_object_or_404(" authentication/views.py                                     # L4
grep -n "permission_classes" authentication/views.py | sort | uniq -c                    # L5 (mostly IsAuthenticated)
grep -n "simple-login\|test-login\|test-no-auth" authentication/urls.py                  # L6
```

## Sign-off criteria (all must hold)
- [ ] No endpoint authenticates via `session_key` query param (L1).
- [ ] Service-user `role` is server-validated against an allow-list + creator capability (L2).
- [ ] No tenant-scoped view relies on `IsServiceUser` alone (L3).
- [ ] Every `get_object_or_404`/custom retrieval is role- and tenant-scoped (L4).
- [ ] Every method of every master-admin view repeats the role guard, or uses `IsMasterAdmin` (L5).
- [ ] `simple/test/no-auth` endpoints grant nothing without full auth, or are removed from prod (L6).
- [ ] Secrets never logged; credential files 0600 + gitignored + rotated (L7).
- [ ] Lifecycle/forced-reset enforced by business APIs, not just the SPA (L8).
