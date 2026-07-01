# AUTH_FIX_PLAN.md
## Authentication Security — Remediation Plan
**Project:** SAP-Python Multi-Tenant ERP  
**Scope:** All findings from AUTH_SECURITY_REPORT.md and AUTH_BUG_REPORT.md  
**Priority order:** CRITICAL first, then HIGH, MEDIUM, LOW  
**Date:** 2026-06-26

> **Note:** This is a remediation plan only. No code has been modified.

---

## PHASE 1 — IMMEDIATE ACTIONS (Day 1, pre-deploy block)

These issues represent active auth bypasses or production crashes. Do not deploy until resolved.

---

### FIX-01: Remove Test/Debug Login Endpoints
**Addresses:** AUTH-C01, BUG-006  
**Risk if deferred:** Complete authentication bypass; any user can obtain admin tokens

**Actions:**
1. Delete `backend/authentication/test_login.py`
2. Delete `backend/authentication/simple_login.py`
3. In `backend/authentication/urls.py`: remove lines 25–26 (`simple-login` and `test-login` paths)
4. In `backend/authentication/urls.py`: remove line 104 (`test-no-auth` path)
5. In `backend/authentication/views.py`: remove the `test_no_auth` function (both instances at lines 31 and 2332)
6. Remove the import of `simple_master_admin_login` and `test_login` from `urls.py` (lines 14–15)

**Verification:** `curl /api/auth/master-admin/test-login/` returns 404.

---

### FIX-02: Fix NameError Crash in `optimized_serializers.py`
**Addresses:** AUTH-C03, BUG-001, BUG-009  
**Risk if deferred:** Every login attempt with wrong credentials or wrong 2FA code returns HTTP 500

**Actions:**
In `backend/authentication/optimized_serializers.py`:

Option A (minimal fix — remove orphaned lines): Remove lines 61, 66, and 91 from `FastMasterAdminLoginSerializer.validate()` and lines 147 and 157 from `FastCompanyUserLoginSerializer.validate()`.

Option B (restore brute force tracking — preferred): Uncomment lines 27–31 and 109–114 and restore `cache_key` / `failed_attempts` definitions. See FIX-08 for the full brute force tracking restoration.

---

### FIX-03: Enforce MasterAdmin Lockout on Main Login View
**Addresses:** AUTH-C07  
**Risk if deferred:** Unlimited password guessing against MasterAdmin

**Actions:**
In `backend/authentication/views.py`, `MasterAdminLoginView.post()` (lines 86–128):

1. After retrieving `master_admin = user.master_admin`, add check:
   ```python
   if master_admin.is_locked and master_admin.locked_until and master_admin.locked_until > timezone.now():
       log_security_event(user, 'LOGIN_FAILED', request, 'Account locked')
       return Response({'error': 'Account is temporarily locked.'}, status=HTTP_403_FORBIDDEN)
   ```
2. In the failure path, add:
   ```python
   master_admin.login_attempts += 1
   if master_admin.login_attempts >= 5:
       master_admin.is_locked = True
       master_admin.locked_until = timezone.now() + timedelta(minutes=30)
   master_admin.save(update_fields=['login_attempts', 'is_locked', 'locked_until'])
   log_security_event(None, 'LOGIN_FAILED', request, f'Failed login for {email}')
   ```
3. On success, reset: `master_admin.login_attempts = 0; master_admin.is_locked = False`

---

### FIX-04: Add Session Expiry to Service User Login
**Addresses:** AUTH-C04  
**Risk if deferred:** Service user sessions never expire — compromised keys provide permanent access

**Actions:**
In `backend/authentication/views.py`, `ServiceUserLoginView.post()` (line 1440):

Change:
```python
ServiceUserSession.objects.create(
    service_user=service_user,
    session_key=session_key,
    ip_address=get_client_ip(request),
    user_agent=request.META.get('HTTP_USER_AGENT', '')
)
```
To:
```python
ServiceUserSession.objects.create(
    service_user=service_user,
    session_key=session_key,
    ip_address=get_client_ip(request),
    user_agent=request.META.get('HTTP_USER_AGENT', ''),
    expires_at=timezone.now() + timedelta(hours=8)   # configurable
)
```

Also add a periodic Celery task or management command to deactivate expired sessions:
```python
# Run daily
ServiceUserSession.objects.filter(
    is_active=True,
    expires_at__lt=timezone.now()
).update(is_active=False)
```

---

### FIX-05: Remove Session Key from URL Query Parameter
**Addresses:** AUTH-C05, BUG-008  
**Risk if deferred:** Session keys logged in server access logs permanently

**Actions:**

1. In `backend/authentication/authentication.py` (lines 28–29): Remove the `elif 'session_key' in request.GET:` block entirely.

2. In `backend/authentication/permissions.py` (line 18): Remove `session_key = request.GET.get('session_key')` fallback.

3. In `backend/authentication/views.py`, `ServiceUserCompanyView.get()` (line 1679): Remove `session_key = request.GET.get('session_key')` fallback. Migrate this view to use `ServiceUserSessionAuthentication` and `IsServiceUserAuthenticated` instead of manual session extraction.

**Verification:** `GET /api/service/?session_key=abc` should return 401, not 200.

---

### FIX-06: Remove Plaintext Password File Writing
**Addresses:** AUTH-C06  
**Risk if deferred:** Plaintext passwords accumulate on disk indefinitely

**Actions:**
In `backend/authentication/views.py`:

1. Remove the `_save_service_credentials_file()` method (lines 1366–1416) from `CompanyServiceCredentialsView`
2. Remove the call to `self._save_service_credentials_file(company, service_credentials)` (line 1338)
3. The plaintext password in the `service_credentials` key of the POST response (line 1333) is acceptable for a single-response display (it is the only time the plaintext is available), but should be clearly documented as one-time visible
4. Delete any existing `backend/scripts/service_credentials_*.txt` files from the server

If credential delivery to non-admin recipients is required, send via encrypted email using the existing `MasterAdminEmailSettings` infrastructure.

---

## PHASE 2 — THIS SPRINT (within 5 business days)

---

### FIX-07: Fix X-Forwarded-For IP Spoofing
**Addresses:** AUTH-C08  
**Risk if deferred:** All IP-based rate limiting and audit logging can be bypassed

**Actions:**
In `backend/authentication/utils.py` and `backend/authentication/ultra_security.py`, update `get_client_ip()`:

Option A (if behind a trusted reverse proxy at known IPs):
```python
TRUSTED_PROXIES = getattr(settings, 'TRUSTED_PROXY_IPS', ['127.0.0.1'])

def get_client_ip(request):
    remote_addr = request.META.get('REMOTE_ADDR')
    if remote_addr in TRUSTED_PROXIES:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if x_forwarded_for:
            # Take the rightmost non-trusted IP (the true client)
            ips = [ip.strip() for ip in x_forwarded_for.split(',')]
            for ip in reversed(ips):
                if ip not in TRUSTED_PROXIES:
                    return ip
    return remote_addr
```

Option B (use Django's `SECURE_PROXY_SSL_HEADER` and Django REST framework `DEFAULT_AUTHENTICATION_CLASSES`): Configure `USE_X_FORWARDED_HOST = True` and `SECURE_PROXY_SSL_HEADER` in settings, and use Django's built-in trusted proxy support.

Configure `TRUSTED_PROXY_IPS` in `settings.py` with the actual nginx/load-balancer IPs.

---

### FIX-08: Restore Per-Account Brute Force Protection
**Addresses:** AUTH-C02  
**Risk if deferred:** Unlimited per-account password guessing

**Actions:**
In `backend/authentication/optimized_serializers.py`:

1. Restore `cache_key` and `failed_attempts` definitions for both serializers
2. Restore the `if failed_attempts >= 10:` gate at the top of `validate()`
3. Restore `cache.delete(cache_key)` on successful authentication
4. To fix the "double login issue" that caused the original commenting-out: use `cache.add()` for atomic increment instead of `cache.get()` + `cache.set()`:
   ```python
   from django.core.cache import cache
   cache_key = f"login_attempts:{email}"
   # Atomic check-and-increment using add()
   if not cache.add(cache_key, 1, 900):
       attempts = cache.incr(cache_key)
       if attempts > 10:
           raise serializers.ValidationError('Too many failed attempts.')
   ```

Also reduce the middleware rate limit from 50 to 10 requests per 5 minutes for login endpoints (`middleware.py:24`).

---

### FIX-09: Fix Service User Password Change Endpoint
**Addresses:** AUTH-H03, BUG-002  
**Risk if deferred:** Service users cannot change their own passwords

**Actions:**
In `backend/authentication/views.py`, `ServiceUserPasswordChangeView` (line 1625):

Change:
```python
permission_classes = [permissions.IsAuthenticated]
```
To:
```python
authentication_classes = [ServiceUserSessionAuthentication]
permission_classes = [IsServiceUserAuthenticated]
```

Then update the view to use `request.service_user` instead of manually re-querying the session:
```python
def post(self, request):
    service_user = request.service_user   # set by IsServiceUserAuthenticated
    # ... rest of password change logic
```

---

### FIX-10: Fix Logout Endpoint to Require Session Ownership Proof
**Addresses:** BUG-005  
**Risk if deferred:** Forced logout of other users' sessions (DoS)

**Actions:**
In `backend/authentication/views.py`, `ServiceUserLogoutView` (lines 1468–1491):

1. Add `authentication_classes = [ServiceUserSessionAuthentication]` and `permission_classes = [IsServiceUserAuthenticated]`
2. Instead of reading `session_key` from request body, deactivate `request.auth` (the session returned by the authentication class):
   ```python
   def post(self, request):
       session = request.auth
       session.is_active = False
       session.logout_time = timezone.now()
       session.save(update_fields=['is_active', 'logout_time'])
       return Response({'message': 'Logged out successfully'})
   ```

---

### FIX-11: Fix JWT Token Generation Order in CompanyUserLoginView
**Addresses:** AUTH-C09, BUG-003, BUG-004  
**Risk if deferred:** Lockout counter bypass via geo-blocked logins; orphaned session records

**Actions:**
In `backend/authentication/views.py`, `CompanyUserLoginView.post()` (lines 647–735):

Reorder operations:
1. Run geolocation check FIRST (before token generation)
2. Only after all security checks pass: generate JWT tokens and reset `login_attempts`
3. Only after tokens generated: create `CompanyUserSession` record

If the geo check fails, none of the above should execute.

---

### FIX-12: Implement Session Invalidation on Password Change
**Addresses:** AUTH-H02  
**Risk if deferred:** All active sessions remain valid after password change

**Actions:**
In `backend/authentication/ultra_security.py`, `SessionSecurityManager.invalidate_all_user_sessions()` (lines 339–348):

Implement actual session invalidation. For `ServiceUserSession` (DB-backed):
```python
@staticmethod
def invalidate_all_user_sessions(user_id):
    from authentication.models import ServiceUserSession, CompanyServiceUser
    ServiceUserSession.objects.filter(
        service_user_id=user_id,
        is_active=True
    ).update(is_active=False, revoked_at=timezone.now())
```

For JWT sessions (CompanyUser / MasterAdmin), add the `simplejwt` blacklist app:
- Add `'rest_framework_simplejwt.token_blacklist'` to `INSTALLED_APPS`
- Call `RefreshToken(token).blacklist()` in password change views

---

## PHASE 3 — NEXT SPRINT (within 2 weeks)

---

### FIX-13: Remove URL Session Key Parameter — Centralize Session Validation
**Addresses:** AUTH-H06, BUG-008 (full resolution)  

Migrate `ServiceUserCompanyView` and all views using `IsServiceUser` to use `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated`. Delete `IsServiceUser` after all usages are migrated.

---

### FIX-14: Enforce Service User Roles in Permission Classes
**Addresses:** AUTH-M05  

Create a new permission class:
```python
class IsServiceUserRole(BasePermission):
    required_roles = []
    
    def has_permission(self, request, view):
        if not hasattr(request, 'service_user'):
            return False
        return request.service_user.role in (getattr(view, 'required_roles', None) or self.required_roles)
```

Apply `required_roles = ['admin', 'manager']` to write/modify endpoints and `required_roles = ['viewer']` (or all) to read endpoints.

---

### FIX-15: Validate X-Forwarded-For Headers (Deepen FIX-07)
**Addresses:** AUTH-C08  

Add `settings.TRUSTED_PROXY_IPS` to Django settings and configure nginx to strip and re-set `X-Forwarded-For` before passing to Django. Validate that only private-range or trusted IPs appear in the header.

---

### FIX-16: Add Session Hijacking Detection
**Addresses:** AUTH-H05  

In `ServiceUserSessionAuthentication.authenticate()`, after retrieving the session, call `SessionSecurityManager.validate_session()` passing current IP and user agent. If validation fails, mark session inactive and raise `AuthenticationFailed`.

Note: IP validation should be optional/configurable for environments with mobile clients or NAT.

---

### FIX-17: Hash Recovery Codes and TOTP Secret at Rest
**Addresses:** AUTH-M03, AUTH-M04  

Recovery codes: hash each code with `bcrypt` before storing. On validation, `bcrypt.check()` against each stored hash.

TOTP secret: encrypt with Fernet using a dedicated key from settings (not derived from SECRET_KEY). Decrypt only when needed for TOTP verification.

---

### FIX-18: Remove Production Debug Print Statements
**Addresses:** AUTH-M01  

Replace all `print(f"🔍 DEBUG: ...")` and `print(f"⚠️ ...")` statements in:
- `views.py` (lines 711, 738, 776, 780, 783, 785–789, 1439, 1446, 1576, 1622)
- `serializers.py` (lines 121, 123)
- `optimized_serializers.py` (lines 77, 183)

Use `import logging; logger = logging.getLogger(__name__)` and `logger.debug()` / `logger.warning()` so output is controlled by Django's logging configuration and not sent to production stdout.

---

### FIX-19: Add Missing Security Audit Log Events
**Addresses:** AUTH-L03  

Add `log_security_event()` calls for:
1. `ServiceUserLoginView.post()` — success and failure
2. `ServiceUserSessionAuthentication.authenticate()` — session key from URL parameter (log as warning)
3. `CompanyUserPasswordChangeView` / `ServiceUserPasswordChangeView` — record `PASSWORD_CHANGED`
4. `ServiceUserLogoutView.post()` — record logout

---

### FIX-20: Use Dedicated Encryption Key
**Addresses:** AUTH-L02  

Replace `settings.SECRET_KEY[:32]` with a dedicated `settings.ENCRYPTION_KEY` value in `EncryptionManager`. Generate a 32-byte random key at deployment:
```bash
python -c "import secrets, base64; print(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode())"
```
Store in environment variables and set in Django settings.

---

## Fix Priority Summary

| Phase | Fix ID | Issue | Effort |
|-------|--------|-------|--------|
| 1 — Day 1 | FIX-01 | Remove test/debug endpoints | 30 min |
| 1 — Day 1 | FIX-02 | Fix NameError crash | 15 min |
| 1 — Day 1 | FIX-03 | Enforce MasterAdmin lockout | 1 hour |
| 1 — Day 1 | FIX-04 | Add session expiry | 30 min |
| 1 — Day 1 | FIX-05 | Remove session key from URL | 1 hour |
| 1 — Day 1 | FIX-06 | Remove plaintext password file | 30 min |
| 2 — Week 1 | FIX-07 | Fix X-Forwarded-For spoofing | 2 hours |
| 2 — Week 1 | FIX-08 | Restore brute force protection | 2 hours |
| 2 — Week 1 | FIX-09 | Fix service user password change | 1 hour |
| 2 — Week 1 | FIX-10 | Fix logout ownership check | 1 hour |
| 2 — Week 1 | FIX-11 | Fix token generation order | 1 hour |
| 2 — Week 1 | FIX-12 | Implement session invalidation | 3 hours |
| 3 — Week 2 | FIX-13 | Centralize session validation | 4 hours |
| 3 — Week 2 | FIX-14 | Enforce service user RBAC | 3 hours |
| 3 — Week 2 | FIX-15 | Validate X-Forwarded-For | 2 hours |
| 3 — Week 2 | FIX-16 | Enable hijacking detection | 2 hours |
| 3 — Week 2 | FIX-17 | Hash recovery codes/TOTP secret | 4 hours |
| 3 — Week 2 | FIX-18 | Remove debug print statements | 1 hour |
| 3 — Week 2 | FIX-19 | Add missing audit log events | 2 hours |
| 3 — Week 2 | FIX-20 | Dedicated encryption key | 1 hour |

**Total estimated effort:** Phase 1 ≈ 3.5 hours | Phase 2 ≈ 10 hours | Phase 3 ≈ 19 hours
