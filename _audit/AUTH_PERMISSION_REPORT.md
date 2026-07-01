# AUTH_PERMISSION_REPORT.md
## Authentication Permission & Access Control Audit
**Project:** SAP-Python Multi-Tenant ERP  
**Scope:** Permission classes, RBAC, cross-tenant access, privilege escalation  
**Date:** 2026-06-26

---

## 1. Permission Class Inventory

### 1.1 Defined Permission Classes

**File:** `backend/authentication/permissions.py`

#### `IsMasterAdmin` (line 56)
```python
def has_permission(self, request, view):
    return (
        request.user.is_authenticated and 
        hasattr(request.user, 'master_admin')
    )
```
- Checks Django `is_authenticated` flag (True for JWT users) AND presence of `master_admin` reverse relation
- **Correct implementation** — no known bypass

#### `IsCompanyUser` (line 68)
```python
def has_permission(self, request, view):
    return (
        request.user.is_authenticated and 
        hasattr(request.user, 'company_user')
    )
```
- Same pattern as `IsMasterAdmin`
- **Correct implementation** — no known bypass

#### `IsServiceUserAuthenticated` (line 34)
```python
def has_permission(self, request, view):
    if not hasattr(request, 'service_user') or not request.service_user:
        raise NotAuthenticated(...)
    if not request.service_user.is_active:
        raise PermissionDenied(...)
    company = request.service_user.company
    if hasattr(company, 'approval_status') and company.approval_status != 'approved':
        raise PermissionDenied(...)
    return True
```
- Relies on `request.service_user` set by `ServiceUserSessionAuthentication`
- Checks service user `is_active` and company `approval_status`
- **Design gap:** Does not check `request.service_user.service` membership — a service user authenticated for Service A could access resources for Service B if the view uses this permission class without further service-scoping

#### `IsServiceUser` (line 5) — Legacy
```python
def has_permission(self, request, view):
    # Company user fallback
    if hasattr(request.user, 'company_user') and request.user.is_authenticated:
        return True
    
    # Manual session re-query
    session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = request.GET.get('session_key')
    if session_key:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        request.service_user = session.service_user
        return True
```
- **Design flaw:** Also accepts `company_user` credentials — company users can pass `IsServiceUser` checks
- **Performance flaw:** Re-queries `ServiceUserSession` even though `ServiceUserSessionAuthentication` already validated it
- **Security flaw:** Accepts session key from `request.GET` (URL parameter)

---

## 2. Permission Enforcement Map

### 2.1 Authentication App Endpoints

| Endpoint | Permission Class | Issue |
|----------|-----------------|-------|
| `POST /api/auth/master-admin/login/` | `AllowAny` | Normal — public endpoint |
| `POST /api/auth/master-admin/simple-login/` | `AllowAny` | **CRITICAL** — bypasses security controls |
| `POST /api/auth/master-admin/test-login/` | `AllowAny` | **CRITICAL** — test endpoint in production |
| `GET /api/auth/test-no-auth/` | `AllowAny` | **CRITICAL** — no-auth endpoint in production |
| `POST /api/auth/company/login/` | `AllowAny` | Normal — public endpoint |
| `POST /api/auth/service-user/login/` | `AllowAny` | Normal — public endpoint |
| `POST /api/auth/service-user/logout/` | `AllowAny` + `authentication_classes=[]` | **HIGH** — unauthenticated, allows forced-logout |
| `POST /api/auth/service-user/change-password/` | `IsAuthenticated` | **HIGH** — blocks service users (wrong class) |
| `GET /api/auth/service-user/company/<id>/` | `AllowAny` + `authentication_classes=[]` | Manual session validation, URL param fallback |
| `GET /api/auth/security-logs/` | `IsAuthenticated` | **LOW** — should be `IsMasterAdmin` explicitly |
| `GET /api/auth/validate-token/` | `IsAuthenticated` | Correct |
| `GET/POST /api/auth/master-admin/security-settings/` | `IsAuthenticated + IsMasterAdmin` | Correct |
| `GET /api/auth/companies/` | `IsAuthenticated` (checked in view body) | Manually enforced in `get_queryset` |

### 2.2 Cross-Tier Permission Risk

The `IsServiceUser` permission class explicitly allows company users to pass:
```python
# permissions.py:12–13
if hasattr(request.user, 'company_user') and request.user.is_authenticated:
    return True
```

Any view using `IsServiceUser` can be accessed by **both** CompanyUser (JWT) **and** ServiceUser (session key). If a view's business logic only handles service user operations but a company user can reach it, the view may expose company-wide data or perform actions outside the intended user tier.

---

## 3. RBAC Analysis

### 3.1 MasterAdmin RBAC

MasterAdmin is a flat single-user role. No sub-roles or delegated admin scopes exist. Any authenticated master admin can:
- Create/approve/reject companies
- Reset service passwords
- Read all security logs
- Access/modify all company service credentials
- Manage IP restrictions

**No privilege separation within MasterAdmin tier.**

### 3.2 CompanyUser RBAC

`CompanyUser` model does not define roles (it is a simple user tied to one company). No field for `role` or `permissions` was observed in the `CompanyUser` model. All company users have identical access within their company.

**No per-user RBAC within CompanyUser tier.**

### 3.3 ServiceUser RBAC

`CompanyServiceUser` defines 4 roles:
```python
ROLE_CHOICES = [
    ('admin', 'Service Admin'),
    ('manager', 'Service Manager'),
    ('user', 'Service User'),
    ('viewer', 'Service Viewer'),
]
```

**Critical gap:** No permission class enforces role boundaries. `IsServiceUserAuthenticated` and `IsServiceUser` both grant access based solely on having a valid session — the `role` field is not checked.

```python
# permissions.py:34–54 — IsServiceUserAuthenticated
# No role check anywhere in this class
def has_permission(self, request, view):
    if not hasattr(request, 'service_user') or not request.service_user:
        raise NotAuthenticated(...)
    if not request.service_user.is_active:
        raise PermissionDenied(...)
    ...
    return True   # Role not checked — all roles get same access
```

A `viewer` role service user has identical API access to an `admin` role service user.

---

## 4. Cross-Tenant Access Control

### 4.1 JWT Users (MasterAdmin / CompanyUser)

**Primary enforcement:** `CompanyScopedModelViewSet` (common/viewsets.py:25) filters querysets to `company = request.user.company_user.company`.

**MasterAdmin exception:** MasterAdmin requests return all objects (no tenant filter). This is by design — MasterAdmin is a super-tenant role.

**Tenant isolation assessment for JWT users:** Correct. No cross-tenant data access vectors found via this mechanism.

### 4.2 Service Users

**Tenant isolation for service users** depends on:
1. `session.service_user.company` — set at login, immutable
2. Views that read `request.service_user.company` for filtering

**Gap — Service-level isolation:**  
A service user authenticated for Service A (Finance) can call any view that uses `IsServiceUserAuthenticated`, including views for Service B (HR/CRM), if those views do not additionally check `request.service_user.service`. No permission class enforces service-level scoping.

**Gap — Company ID in URL parameter:**  
`ServiceUserCompanyView` (views.py:1693) checks `service_user.company.id != company_id` and returns 403. This is correct. However, similar URL-parameter company checks in other views were not universally verified.

### 4.3 Cross-Tenant Access Test Cases

| Scenario | Expected | Actual |
|----------|----------|--------|
| CompanyUser accesses data from Company A while authenticated as Company B | 403 / empty result | Correct (CompanyScopedModelViewSet) |
| ServiceUser for Company A's Finance accesses HR data from Company A | 403 | **Allowed if view uses `IsServiceUserAuthenticated` without service check** |
| ServiceUser for Company A accesses any data from Company B | 403 | Correct (company set at session creation) |
| MasterAdmin accesses Company A's data | Allowed (by design) | Correct |

---

## 5. Privilege Escalation Scenarios

### 5.1 Horizontal Escalation (same tier, different tenant)

| Vector | Risk | Status |
|--------|------|--------|
| CompanyUser A accesses CompanyUser B's data by manipulating URL IDs | LOW | Mitigated by `CompanyScopedModelViewSet` |
| ServiceUser changes `company_id` in URL to access other company | LOW | Checked in `ServiceUserCompanyView` |
| Attacker replays another user's JWT from different session | LOW | Mitigated by simplejwt expiry |

### 5.2 Vertical Escalation (gain higher tier privileges)

| Vector | Risk | Status |
|--------|------|--------|
| ServiceUser calls `IsAuthenticated`-only endpoints | MEDIUM | Some `IsAuthenticated` views allow this because `request.user` is `AnonymousUser` — they reject on that basis, but also see BUG-002 |
| Company user calls `IsServiceUser`-protected view | MEDIUM | **ALLOWED** — `IsServiceUser` explicitly grants access to company users |
| Anyone uses `/test-login/` to get JWT for any user | **CRITICAL** | **EXPLOITABLE** — see AUTH-C01 |
| MasterAdmin password bruteforce via `/simple-login/` | **CRITICAL** | **EXPLOITABLE** — no lockout |

### 5.3 Service-Level Escalation

A service user authenticated for Service A (e.g., Finance) accessing Service B (e.g., HR):
- Authentication succeeds (session is valid)
- `IsServiceUserAuthenticated` passes (service_user is active, company is approved)
- **No service-level check in any permission class**
- Access granted to HR endpoints if they use `IsServiceUserAuthenticated`

---

## 6. Session Authentication Architecture Issues

### 6.1 `request.user = AnonymousUser()` Design Pattern

`ServiceUserSessionAuthentication.authenticate()` returns `(AnonymousUser(), session)`. This means:
- `request.user.is_authenticated` = `False` for all service user requests
- Any view using `permissions.IsAuthenticated` rejects service users
- Django's standard auth infrastructure (signals, logging, middleware) treats service users as unauthenticated
- Third-party packages that rely on `request.user` cannot function for service user contexts

This is a non-standard design that creates invisible integration failure modes.

### 6.2 Multiple Session Validation Code Paths

Three independent session validation code paths exist:

| Location | File | Method |
|----------|------|--------|
| Authentication class | `authentication.py:35–40` | `ServiceUserSession.objects.select_related(...).get(session_key=..., is_active=True)` |
| `IsServiceUser` permission | `permissions.py:20–28` | `ServiceUserSession.objects.get(session_key=..., is_active=True)` |
| `ServiceUserCompanyView` view | `views.py:1686–1690` | `ServiceUserSession.objects.get(session_key=..., is_active=True)` |

Each path independently validates the session, making 2–3 database queries per service user request. Each path also independently handles session-key URL parameter fallback, providing multiple vectors for the URL-parameter leakage vulnerability.

---

## 7. Audit Logging Coverage

| Event | Logged | Location |
|-------|--------|----------|
| MasterAdmin login success | Partial (only in some views) | `SecurityLog` |
| MasterAdmin login failure | No | Not implemented in main view |
| CompanyUser login success | Yes | `CompanySecurityLog` + `SecurityLog` |
| CompanyUser login failure | Partial | Only if user found |
| ServiceUser login success | **No** | Not logged anywhere |
| ServiceUser login failure | **No** | Not logged anywhere |
| Session key from URL parameter | **No** | Not logged |
| JWT token refresh | **No** | Not logged |
| Password change (any user) | Yes (when successful) | `SecurityLog` |
| Account lockout | Partial | Only CompanyUser |
| Service password reset | Yes | `SecurityLog` |
| Security log access | **No** | Not logged |

---

## 8. Permission Architecture Recommendations (Analysis Only)

| Issue | Recommended Control |
|-------|-------------------|
| No RBAC enforcement for service user roles | Add `IsServiceUserRole` permission class checking `request.service_user.role` |
| `IsServiceUser` allows company users | Separate permission classes for each user tier; remove cross-tier fallback |
| No service-level scoping in service user permissions | Add `request.service_user.service` check to permission class or mixin |
| Session validation split across 3 code paths | Centralize in `ServiceUserSessionAuthentication`; remove manual validation in views/permissions |
| `request.user = AnonymousUser()` for service users | Consider setting `request.user` to a service-user-aware adapter or proxy class |
| Missing security event logging | Add `log_security_event` calls in `ServiceUserLoginView` and `ServiceUserSessionAuthentication` |
