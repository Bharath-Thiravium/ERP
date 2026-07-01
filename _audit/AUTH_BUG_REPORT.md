# AUTH_BUG_REPORT.md
## Authentication Module — Bug Report
**Project:** SAP-Python Multi-Tenant ERP  
**Scope:** Functional defects in authentication/authorization code  
**Date:** 2026-06-26

---

## BUG-001 — NameError Crash When 2FA Code Fails (HTTP 500)
**Severity:** CRITICAL  
**Type:** Runtime Error — Unresolved Variable  
**File:** `backend/authentication/optimized_serializers.py`  
**Lines:** 61, 66, 91, 147, 157

**Description:**  
The brute-force tracking cache block was commented out (lines 27–31 and 109–114), but five `cache.set()` calls that reference variables from that block were left active. When any of these lines execute, Python raises `NameError: name 'cache_key' is not defined`.

**Broken code:**
```python
# Line 27–31 — COMMENTED OUT (cache_key and failed_attempts now undefined):
# cache_key = f"login_attempts:{email}"
# failed_attempts = cache.get(cache_key, 0)

# ...later in the same function (line 91 — STILL ACTIVE):
cache.set(cache_key, failed_attempts + 1, 900)   # NameError here
```

**Trigger conditions:**
- `FastMasterAdminLoginSerializer.validate()`: triggered when credentials are wrong (line 91), or when 2FA code is wrong (line 61), or when recovery code is wrong (line 66)
- `FastCompanyUserLoginSerializer.validate()`: triggered when 2FA code is wrong (line 147) or recovery code is wrong (line 157)

**Effect:** Any login attempt with wrong credentials or wrong 2FA code returns HTTP 500 instead of HTTP 400/401. Django's exception handler logs an unhandled exception.

**Reproduction:**
```bash
# With wrong password (no 2FA needed)
POST /api/auth/master-admin/login/ {"email": "admin@example.com", "password": "wrongpass"}
# → HTTP 500: NameError: name 'cache_key' is not defined

# With correct password but wrong 2FA code (when 2FA enabled)
POST /api/auth/master-admin/login/ {"email": "admin@example.com", "password": "correct", "totp_code": "000000"}
# → HTTP 500: NameError
```

**Root Cause:** Partial commenting-out of security code left orphaned variable references.

---

## BUG-002 — Service User Password Change Endpoint Always Returns 403
**Severity:** HIGH  
**Type:** Logic Error — Wrong Permission Class  
**File:** `backend/authentication/views.py:1625–1667`

**Description:**  
`ServiceUserPasswordChangeView` uses `permissions.IsAuthenticated`, which evaluates `request.user.is_authenticated`. For service user requests, `ServiceUserSessionAuthentication.authenticate()` returns `(AnonymousUser(), session)`, so `request.user = AnonymousUser()` and `AnonymousUser().is_authenticated = False`. DRF rejects the request with HTTP 403 before the view handler executes.

```python
class ServiceUserPasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]  # BUG: blocks service users

    def post(self, request):
        # Never reached for service users
        session_key = request.data.get('session_key')
        ...
```

The view body also redundantly reads the session key from `request.data` manually, suggesting this endpoint was designed for service users but the permission class was incorrectly set.

**Effect:** Service users cannot change their own passwords. The `must_change_password` flag cannot be cleared via this endpoint.

**Reproduction:**
```bash
curl -X POST /api/auth/service-user/change-password/ \
  -H "Authorization: Bearer <valid_session_key>" \
  -d '{"session_key": "<key>", "current_password": "old", "new_password": "new", "confirm_password": "new"}'
# → HTTP 403 Forbidden (even with valid session)
```

---

## BUG-003 — Login Attempt Counter Reset Before Geolocation Check (Lockout Bypass)
**Severity:** HIGH  
**Type:** Logic Error — Incorrect Operation Order  
**File:** `backend/authentication/views.py:651–727`

**Description:**  
`CompanyUserLoginView.post()` resets `login_attempts = 0` on line 654 before the geolocation check runs on line 717. A user from a geo-blocked country who has correct credentials can:
1. Submit correct credentials → login_attempts reset to 0 (line 654)
2. Geolocation check fires → returns 403
3. Repeat: each valid-credential attempt resets the counter

This can be used to continuously reset a legitimate user's lockout counter from a geo-blocked attacker IP.

```python
# views.py:651–655 — happens BEFORE geo check
company_user.login_attempts = 0   # ← reset happens here
company_user.save()

# views.py:717–727 — geo check happens LATER
geo_result = check_geolocation_access(...)
if not geo_result['allowed']:
    return Response({'error': 'Access denied from location.'}, status=403)
    # login_attempts was already reset above — cannot be undone
```

---

## BUG-004 — `CompanyUserSession` Created for Geo-Blocked Logins (Orphaned Records)
**Severity:** MEDIUM  
**Type:** Logic Error — Incorrect Operation Order  
**File:** `backend/authentication/views.py:671–681, 717–728`

**Description:**  
A `CompanyUserSession` database record is created at line 671, before the geolocation check at line 717. If the geo check rejects the login, the orphaned session record is never deleted. Over time, the `CompanyUserSession` table accumulates ghost session records for every geo-blocked attempt.

```python
# Line 671 — session created
CompanyUserSession.objects.create(
    user=company_user,
    session_key=session_key,
    ...
)

# Line 717 — geo check fires AFTER session is created
if not geo_result['allowed']:
    return Response({'error': '...'}, status=403)
    # orphaned session record in DB — never cleaned up
```

---

## BUG-005 — `ServiceUserLogoutView` Does Not Verify Session Ownership
**Severity:** HIGH  
**Type:** Logic Error — Missing Authorization Check  
**File:** `backend/authentication/views.py:1468–1491`

**Description:**  
`ServiceUserLogoutView` accepts a `session_key` from `request.data` and deactivates the corresponding session with no verification that the caller owns that session:

```python
def post(self, request):
    session_key = request.data.get('session_key')
    if session_key:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        session.is_active = False
        session.save()
```

Authentication is explicitly disabled:
```python
authentication_classes = []   # Disable authentication for logout
permission_classes = [permissions.AllowAny]
```

Any unauthenticated caller who knows (or guesses) a session key can forcibly logout another user's session. Combined with AUTH-C05 (session keys in URL logs), this could be used for denial-of-service against specific service users.

**Reproduction:**
```bash
# Attacker knows victim's session key (from log files)
curl -X POST /api/auth/service-user/logout/ \
  -d '{"session_key": "victimSessionKey..."}'
# → "Logged out successfully" — victim forcibly logged out
```

---

## BUG-006 — Duplicate Function Definitions (`test_no_auth` and `mobile_logout`)
**Severity:** LOW  
**Type:** Code Defect — Dead Code  
**File:** `backend/authentication/views.py:31` and `2332`; `2302` and `4631`

**Description:**  
`grep` reveals that both `test_no_auth` and `mobile_logout` are defined twice in `views.py`. Python uses the last definition, silently shadowing the first. The first definitions are dead code that could cause confusion during maintenance.

```
views.py:31   — first definition of test_no_auth
views.py:2332 — second definition of test_no_auth (active)

views.py:2302 — first definition of mobile_logout  
views.py:4631 — second definition of mobile_logout (active)
```

---

## BUG-007 — `CompanyDetailView` Contains Unreachable `return` Statement
**Severity:** LOW  
**Type:** Dead Code  
**File:** `backend/authentication/views.py:437`

From the prior audit summary: the `CompanyDetailView` contains a duplicate `return Response(status=status.HTTP_204_NO_CONTENT)` statement that is unreachable (dead code after another return).

---

## BUG-008 — `ServiceUserCompanyView` Accepts Session Key from URL Parameter
**Severity:** CRITICAL (duplicates AUTH-C05 but is a separate implementation)  
**Type:** Security Defect — Session Key in URL  
**File:** `backend/authentication/views.py:1670–1699`

**Description:**  
`ServiceUserCompanyView` has its own manual session-key extraction that accepts from URL:

```python
class ServiceUserCompanyView(APIView):
    authentication_classes = []   # Disabled
    permission_classes = [permissions.AllowAny]   # No auth

    def get(self, request, company_id):
        session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not session_key:
            session_key = request.GET.get('session_key')  # ← URL parameter
```

This view independently implements session validation without using `ServiceUserSessionAuthentication`, creating a third code path for session validation that cannot benefit from any centralized improvements.

---

## BUG-009 — `FastMasterAdminLoginSerializer` 2FA Code Validation References `cache_key` Before Assignment
**Severity:** CRITICAL (subset of BUG-001 but affecting 2FA-specific path)  
**Type:** Runtime Error  
**File:** `backend/authentication/optimized_serializers.py:57–67`

**Description:**  
Even if a user with 2FA enabled submits the *correct* password but *wrong* TOTP code, the code reaches line 61:
```python
if not TwoFactorAuthManager.verify_totp_code(master_admin.two_factor_secret, totp_code):
    cache.set(cache_key, failed_attempts + 1, 900)  # line 61 — NameError
    raise serializers.ValidationError('Invalid 2FA code.')
```
This crashes before raising the validation error, returning HTTP 500. The user sees a server error rather than "Invalid 2FA code," making the 2FA step appear broken rather than giving corrective feedback.

---

## Bug Summary Table

| ID | Description | Severity | File | Lines |
|----|-------------|----------|------|-------|
| BUG-001 | NameError crash on any login failure | CRITICAL | optimized_serializers.py | 61, 66, 91, 147, 157 |
| BUG-002 | Password change endpoint returns 403 for service users | HIGH | views.py | 1625 |
| BUG-003 | Login counter reset before geo-block check | HIGH | views.py | 654, 717 |
| BUG-004 | Orphaned session records from geo-blocked logins | MEDIUM | views.py | 671, 717 |
| BUG-005 | Logout endpoint allows forced-logout of other users | HIGH | views.py | 1468–1491 |
| BUG-006 | Duplicate function definitions in views.py | LOW | views.py | 31/2332, 2302/4631 |
| BUG-007 | Unreachable return statement in CompanyDetailView | LOW | views.py | 437 |
| BUG-008 | ServiceUserCompanyView bypasses centralized auth | CRITICAL | views.py | 1670–1699 |
| BUG-009 | 2FA failure returns HTTP 500 instead of 400 | CRITICAL | optimized_serializers.py | 61 |
