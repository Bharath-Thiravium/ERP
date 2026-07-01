# AUTH_ARCHITECTURE_REPORT.md
## Authentication & Authorization Architecture Audit
**Project:** SAP-Python Multi-Tenant ERP  
**Scope:** Full authentication & authorization surface  
**Auditor:** Static code analysis  
**Date:** 2026-06-26

---

## 1. System Overview

The system is a multi-tenant SaaS ERP with three distinct user hierarchies and two independent authentication mechanisms.

### 1.1 User Hierarchy

```
MasterAdmin
  └── Company (approved by MasterAdmin)
        └── CompanyUser (JWT auth)
              └── CompanyServiceUser (session-key auth)
                    └── ServiceUserSession (per-request session)
```

| Role | Model | Auth Mechanism | Token Type |
|------|-------|---------------|------------|
| MasterAdmin | `MasterAdmin` (OneToOne → User) | Django JWT | `rest_framework_simplejwt` RefreshToken |
| CompanyUser | `CompanyUser` (OneToOne → User) | Django JWT | `rest_framework_simplejwt` RefreshToken |
| CompanyServiceUser | `CompanyServiceUser` (standalone) | Session Key | `ServiceUserSession.session_key` (40-char string) |

---

## 2. Authentication Flows

### 2.1 MasterAdmin Login Flow

**Primary endpoint:** `POST /api/auth/master-admin/login/` → `views.MasterAdminLoginView`  
**Alternate endpoint:** `POST /api/auth/master-admin/simple-login/` → `simple_login.simple_master_admin_login`  
**Test endpoint (active in production):** `POST /api/auth/master-admin/test-login/` → `test_login.test_login`

**Primary flow (views.py:74–128):**
1. CSRF exempt (`@csrf_exempt`)
2. Reads `email` + `password` directly from `request.data`
3. Calls `django.contrib.auth.authenticate()`
4. If valid: checks `user.is_active`
5. Generates `RefreshToken.for_user(user)` + `access_token`
6. Returns `{access, refresh, user_data}`

**Security controls active on primary endpoint:**
- ✅ Password verified via Django's `authenticate()`
- ❌ `master_admin.is_locked` NOT checked (only in serializers not used by this view)
- ❌ `login_attempts` NOT incremented on failure
- ❌ No 2FA enforcement
- ❌ No password expiry enforcement
- ❌ No security event logging on primary view

### 2.2 CompanyUser Login Flow

**Endpoint:** `POST /api/auth/company/login/` → `views.CompanyUserLoginView`

**Flow (views.py:615–875):**
1. CSRF exempt
2. Delegates to `FastCompanyUserLoginSerializer.validate()`
3. Checks `company_user.is_locked` and `locked_until`
4. If 2FA enabled: checks TOTP/recovery code
5. Checks IP restrictions (`is_ip_allowed`)
6. **Generates JWT tokens (lines 648–649)**
7. Resets `login_attempts = 0` (line 654)
8. Creates `CompanyUserSession` record (line 671)
9. **Runs geolocation check AFTER tokens generated (line 717)**
10. Returns `{access, refresh, user_data}`

**On failure (lines 792–875):**
- Increments `login_attempts` (line 801)
- Returns `remaining_attempts` to client (line 804) ← information disclosure
- Locks account at 5 failures for 30 minutes (lines 806–808)

### 2.3 ServiceUser Login Flow

**Endpoint:** `POST /api/auth/service-user/login/` → `views.ServiceUserLoginView`

**Flow (views.py:1420–1465):**
1. No CSRF protection (`AllowAny`)
2. Delegates to `ServiceUserLoginSerializer`
3. If valid: generates 40-char session key from `string.ascii_letters + string.digits` (line 1438)
4. Creates `ServiceUserSession` WITHOUT `expires_at` (line 1440-1445)
5. Returns `{session_key, user_data}`

**Security controls:**
- ❌ No account lockout check
- ❌ No rate limiting specific to service users
- ❌ Sessions never expire (`expires_at = NULL`)
- ❌ Production debug `print()` statements active

### 2.4 Service User Session Authentication

**Authentication class:** `ServiceUserSessionAuthentication` (authentication.py)

**Per-request flow:**
1. Reads `Authorization: Bearer <key>` header (line 25–26)
2. Falls back to `?session_key=<key>` query parameter (line 28–29) ← insecure
3. Queries `ServiceUserSession` from DB (line 35–40)
4. Checks expiry: `if expires_at and timezone.now() > expires_at` (line 46) ← None bypasses
5. Updates `last_seen_at` every 300 seconds (line 55)
6. Sets `request.service_user = session.service_user`
7. **Returns `(AnonymousUser(), session)`** (line 60) ← `request.user` is always AnonymousUser

---

## 3. Authorization Architecture

### 3.1 Permission Classes

| Class | File | Checks | Used By |
|-------|------|--------|---------|
| `IsMasterAdmin` | permissions.py:56 | `request.user.is_authenticated AND hasattr(request.user, 'master_admin')` | Master admin endpoints |
| `IsCompanyUser` | permissions.py:68 | `request.user.is_authenticated AND hasattr(request.user, 'company_user')` | Company endpoints |
| `IsServiceUserAuthenticated` | permissions.py:34 | `hasattr(request, 'service_user') AND request.service_user.is_active AND company.approval_status == 'approved'` | Service user endpoints |
| `IsServiceUser` | permissions.py:5 | Manual session re-query + company user fallback | Legacy service endpoints |

### 3.2 Tenant Enforcement

Tenant isolation for JWT users is enforced by `CompanyScopedModelViewSet` (common/viewsets.py:25), which filters all querysets to `company = request.user.company_user.company`.

Service users are tenant-isolated by the session object: `session.service_user.company` is set at login and cannot be changed.

### 3.3 RBAC for Service Users

Service users have 4 roles defined in `CompanyServiceUser.ROLE_CHOICES`:
- `admin` → Service Admin
- `manager` → Service Manager
- `user` → Service User
- `viewer` → Service Viewer

**No RBAC enforcement found in permission classes or views.** The `role` field is stored but not enforced by any DRF permission class. All authenticated service users have the same access level regardless of role.

---

## 4. Session Management

### 4.1 JWT Sessions (MasterAdmin / CompanyUser)

- Standard `rest_framework_simplejwt` configuration
- No custom token rotation or blacklisting observed in the auth module
- No logout-all / invalidate-all mechanism for JWT tokens
- `SessionSecurityManager.invalidate_all_user_sessions()` (ultra_security.py:339) is a stub (`pass`)

### 4.2 Service User Sessions (ServiceUserSession model)

| Field | Type | Behavior |
|-------|------|---------|
| `session_key` | CharField(40) | Generated with `secrets.choice(ascii_letters + digits)` |
| `expires_at` | DateTimeField(null=True) | `NULL` when created by `ServiceUserLoginView` → never expires |
| `is_active` | BooleanField | Set to `False` on logout |
| `last_seen_at` | DateTimeField | Updated every 300 seconds |
| `ip_address` | GenericIPAddressField | Stored at creation, NOT re-validated on each request |

### 4.3 CompanyUser Sessions (CompanyUserSession model)

Created in `company_dashboard` app. Has `expires_at = timezone.now() + timedelta(hours=24)` set at creation.

---

## 5. Rate Limiting Architecture

All rate limiting uses `UltraSecurityManager.check_rate_limit()` which wraps Django's cache backend.

| Endpoint Pattern | Limit | Window | Class |
|-----------------|-------|--------|-------|
| `/api/auth/login`, master-admin/login, company/login | 50 requests | 300 seconds | IP-based |
| `/api/auth/master-admin/settings/` | 500 requests | 300 seconds | IP-based |
| `/api/auth/` (other) | 200 requests | 300 seconds | IP-based |
| `/api/finance/` | 2000 requests | 300 seconds | IP-based |
| `/api/` (general) | 1000 requests | 300 seconds | IP-based |

**Not rate-limited:**
- `/api/auth/master-admin/simple-login/`
- `/api/auth/master-admin/test-login/`

**Fail-open behavior:** On cache failure, `check_rate_limit()` returns `True` (allows request).

---

## 6. Audit Logging Architecture

**Model:** `SecurityLog` (models.py) with 14 event types:
`LOGIN_SUCCESS`, `LOGIN_FAILED`, `PASSWORD_CHANGED`, `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`, `SESSION_EXPIRED`, `SUSPICIOUS_ACTIVITY`, `API_KEY_GENERATED`, `API_KEY_REVOKED`, `SERVICE_ACCESS`, `SERVICE_ACCESS_FAILED`, `DATA_EXPORT`, `SETTINGS_CHANGED`, `TWO_FACTOR_ENABLED`

**Log function:** `log_security_event(user, event_type, request, details)` in views.py

**Coverage gaps:**
- Service user login success/failure: NOT logged in `SecurityLog`
- JWT token refresh: NOT logged
- Session key from URL: NOT logged
- Service user session creation: NOT logged

---

## 7. Key External Dependencies

| Library | Purpose | Security Notes |
|---------|---------|---------------|
| `rest_framework_simplejwt` | JWT tokens | Standard library; no blacklisting configured |
| `pyotp` | TOTP 2FA | Optional import; 2FA silently disabled if missing |
| `cryptography (Fernet)` | Sensitive data encryption | Optional import; silently falls back to plaintext if missing |
| `user_agents` | UA parsing for device fingerprinting | Used in `CompanyUserLoginView` |
| `geopy` / external geo API | Geolocation checking | Used for geo-blocking; errors are silently swallowed |

---

## 8. Architecture Risk Summary

| Area | Risk Level | Key Issue |
|------|-----------|-----------|
| Test/debug endpoints in production | **CRITICAL** | Complete auth bypass via `/test-login/` |
| Service user session expiry | **CRITICAL** | Sessions never expire |
| Per-account brute force protection | **CRITICAL** | Commented out |
| MasterAdmin lockout enforcement | **CRITICAL** | Not enforced on main login view |
| Session key in URL | **CRITICAL** | Session keys appear in logs |
| Plaintext credentials on disk | **CRITICAL** | Service passwords in `.txt` files |
| IP spoofing | **CRITICAL** | X-Forwarded-For trusted unconditionally |
| Rate limiter fail-open | **HIGH** | Cache failure disables all rate limiting |
| RBAC enforcement | **HIGH** | Role field stored but never enforced |
| Session hijacking detection | **HIGH** | Implemented but never invoked |
