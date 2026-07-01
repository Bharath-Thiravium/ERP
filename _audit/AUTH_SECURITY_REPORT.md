# AUTH_SECURITY_REPORT.md
## Authentication & Authorization Security Findings
**Project:** SAP-Python Multi-Tenant ERP  
**Scope:** All 20 audit areas  
**Severity legend:** CRITICAL / HIGH / MEDIUM / LOW  
**Date:** 2026-06-26

---

## CRITICAL FINDINGS

---

### AUTH-C01 — Production Test/Debug Login Endpoints Active
**Severity:** CRITICAL  
**Area:** Master Admin Authentication, Account Lockout / Brute Force Protection  
**Files:**  
- `backend/authentication/test_login.py` (entire file)  
- `backend/authentication/simple_login.py` (entire file)  
- `backend/authentication/views.py:31–33`  
- `backend/authentication/urls.py:25–26`

**Description:**  
Three unprotected endpoints exist in production code, all registered in `urls.py`:

**1. `/api/auth/master-admin/test-login/` (`test_login.py:10–43`)**  
- Accepts any Django `User` credentials — not restricted to MasterAdmin accounts.
- Returns a valid JWT access+refresh token pair for **any user** whose email and password match.
- Returns `is_superuser` field in the response, disclosing superuser status.
- User enumeration vulnerability: returns HTTP 404 `"User not found"` for missing email versus HTTP 401 `"Invalid password"` for wrong password — two distinct responses that confirm email existence.
- Zero security controls: no rate limiting, no account lockout check, no 2FA, no password expiry, no security event logging.

**2. `/api/auth/master-admin/simple-login/` (`simple_login.py:14–63`)**  
- Alternate master admin login that skips all security features of the main login view.
- No `is_locked` check, no `login_attempts` tracking, no 2FA enforcement, no password expiry check.
- No `SecurityLog` event recorded on successful or failed login.

**3. `/api/auth/test-no-auth/` (`views.py:31–33`)**  
- `@permission_classes([AllowAny])` — returns HTTP 200 with no credentials required.
- Confirms the API is reachable, aids reconnaissance.

**Reproduction Steps:**
```bash
# Get tokens for any user (not just MasterAdmin)
curl -X POST /api/auth/master-admin/test-login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "any_user@example.com", "password": "password"}'
# Returns: {"access": "...", "refresh": "...", "user": {"is_superuser": true/false}}

# User enumeration
curl -X POST /api/auth/master-admin/test-login/ \
  -d '{"email": "exists@example.com", "password": "wrong"}'
# Returns 401 "Invalid password" → email confirmed to exist

curl -X POST /api/auth/master-admin/test-login/ \
  -d '{"email": "notexist@example.com", "password": "wrong"}'  
# Returns 404 "User not found" → email confirmed absent
```

**Business Impact:**  
An external attacker can obtain valid JWT tokens for any user in the system — including superusers — without triggering lockout, rate limiting, or audit logs. This is a complete authentication bypass.

**Remediation:**  
Remove `test_login.py`, `simple_login.py`, and the `test_no_auth` function and their URL registrations entirely. These must not exist in any environment accessible from a network.

---

### AUTH-C02 — Per-Account Brute Force Protection Disabled (Commented Out)
**Severity:** CRITICAL  
**Area:** Account Lockout / Brute Force Protection  
**Files:**  
- `backend/authentication/optimized_serializers.py:27–31` (MasterAdmin)  
- `backend/authentication/optimized_serializers.py:109–114` (CompanyUser)

**Description:**  
Both `FastMasterAdminLoginSerializer` and `FastCompanyUserLoginSerializer` (which are the active serializers used by the main login views) have their per-account brute force protection commented out with the note:

```python
# Disable cache check temporarily to fix double login issue
# cache_key = f"login_attempts:{email}"
# failed_attempts = cache.get(cache_key, 0)
# 
# if failed_attempts >= 10:
#     raise serializers.ValidationError('Too many failed attempts. Try again later.')
```

This means:
- Per-account failed attempt counting at the serializer level is disabled.
- The DB-level lockout in `CompanyUserLoginView` (views.py:801–810) still works, but only for company users, and only after passwords have been checked (after successful user lookup).
- MasterAdmin has no active per-account attempt tracking in any login path.
- The IP-level middleware limit is 50 requests per 5 minutes — far too lenient for brute-forcing a known email address.

**Business Impact:**  
An attacker who knows a valid email address can attempt 50 password guesses per 5 minutes per IP address from unlimited IPs, against both MasterAdmin and CompanyUser accounts, with no per-account throttling.

**Remediation:**  
Restore the commented-out cache check and re-implement it correctly. Fix the root cause of the "double login issue" by checking and clearing the counter atomically, or use the `LoginCache.increment_failed_attempts()` helper already implemented in `login_cache.py:51–60`.

---

### AUTH-C03 — NameError Crash on 2FA Failure (HTTP 500 in Production)
**Severity:** CRITICAL  
**Area:** JWT Token Generation, Company User Authentication  
**Files:**  
- `backend/authentication/optimized_serializers.py:61, 66, 91, 147, 157`

**Description:**  
When the brute force cache block was commented out, `cache_key` and `failed_attempts` variables that are referenced AFTER the comment block were left in place but their definitions were removed. Any code path that reaches these lines will raise a `NameError`.

Affected lines:
```python
# FastMasterAdminLoginSerializer.validate()
cache.set(cache_key, failed_attempts + 1, 900)   # line 61 — 2FA code failure
cache.set(cache_key, failed_attempts + 1, 900)   # line 66 — recovery code failure
cache.set(cache_key, failed_attempts + 1, 900)   # line 91 — wrong credentials

# FastCompanyUserLoginSerializer.validate()
cache.set(cache_key, failed_attempts + 1, 900)   # line 147 — 2FA code failure
cache.set(cache_key, failed_attempts + 1, 900)   # line 157 — recovery code failure
```

In each case, `cache_key` and `failed_attempts` are undefined at those points because they were only defined in the now-commented-out block above.

**Reproduction Steps:**
```bash
# Trigger via wrong 2FA code submission (when 2FA is enabled for MasterAdmin)
curl -X POST /api/auth/master-admin/login/ \
  -d '{"email": "admin@example.com", "password": "correctpassword", "totp_code": "000000"}'
# Returns: HTTP 500 Internal Server Error (NameError crash)
```

**Business Impact:**  
Any 2FA validation failure returns HTTP 500 rather than HTTP 400. This makes 2FA effectively broken, causes uncaught exceptions in logs, and can interfere with monitoring/alerting systems.

**Remediation:**  
Remove lines 61, 66, 91, 147, 157 (the orphaned `cache.set()` calls) or restore the full `cache_key`/`failed_attempts` variable definitions.

---

### AUTH-C04 — Service User Sessions Never Expire
**Severity:** CRITICAL  
**Area:** Session Storage, Session Expiry  
**Files:**  
- `backend/authentication/views.py:1440–1445`  
- `backend/authentication/authentication.py:45–46`

**Description:**  
`ServiceUserLoginView` creates sessions without setting an expiry:

```python
# views.py:1440–1445
ServiceUserSession.objects.create(
    service_user=service_user,
    session_key=session_key,
    ip_address=get_client_ip(request),
    user_agent=request.META.get('HTTP_USER_AGENT', '')
    # expires_at NOT SET → defaults to NULL
)
```

`ServiceUserSessionAuthentication` then checks expiry with:
```python
# authentication.py:45–46
expires_at = getattr(session, 'expires_at', None)
if expires_at and timezone.now() > expires_at:   # None → condition False → skipped
```

Because `expires_at = None`, the expiry check is always skipped. A service user session created today will still be valid years later unless explicitly logged out. There is no background job or garbage collection for old sessions.

**Business Impact:**  
A stolen session key provides permanent access. An employee who is terminated retains API access indefinitely if logout is not forced. Compliance requirements (PCI-DSS, ISO 27001) mandate session timeouts for all authenticated sessions.

**Remediation:**  
Set `expires_at=timezone.now() + timedelta(hours=8)` (or a configured value) in `ServiceUserLoginView`. Add a periodic Celery task to deactivate expired sessions.

---

### AUTH-C05 — Session Key Exposed via URL Query Parameter
**Severity:** CRITICAL  
**Area:** Token Leakage Risks, URL Parameter Authentication Risks  
**Files:**  
- `backend/authentication/authentication.py:28–29`  
- `backend/authentication/permissions.py:18`  
- `backend/authentication/views.py:1679`

**Description:**  
The `ServiceUserSessionAuthentication` class and `IsServiceUser` permission class both accept the session key as a URL query parameter:

```python
# authentication.py:28–29
elif 'session_key' in request.GET:
    session_key = request.GET.get('session_key')

# permissions.py:18
session_key = request.GET.get('session_key')

# views.py:1679
session_key = request.GET.get('session_key')
```

Query parameters are routinely recorded in:
- Web server access logs (`/var/log/nginx/access.log`)
- Reverse proxy logs (nginx, Apache)
- CDN/WAF access logs (Cloudflare, AWS ALB)
- Browser history
- `Referer` HTTP header sent to third-party resources
- Server-Side Request Forgery intermediaries

**Reproduction:**
```
GET /api/service/data/?session_key=AbCdEfGh1234...  → session key in nginx log
```

**Business Impact:**  
Anyone with access to server logs can impersonate any service user. Log management systems (ELK, Splunk, Datadog) that receive access logs are storing active authentication credentials.

**Remediation:**  
Remove query parameter fallback entirely. Require `Authorization: Bearer <session_key>` header only.

---

### AUTH-C06 — Plaintext Service Passwords Written to Disk and Returned in API Response
**Severity:** CRITICAL  
**Area:** Token Leakage Risks  
**Files:**  
- `backend/authentication/views.py:1388–1416` (`_save_service_credentials_file`)  
- `backend/authentication/views.py:1348–1357` (API response body)

**Description:**  
When service passwords are reset via `CompanyServiceCredentialsView.post()`, two leakage vectors are created simultaneously:

**Vector 1 — Plaintext file on server disk:**
```python
# views.py:1401–1404
for cred in service_credentials:
    content += f"""Service: {cred['service_name']}
Password: {cred['password']}   ← PLAINTEXT password in file
```
File saved to `backend/scripts/service_credentials_{company_name}.txt`. Any server process or user with read access to this directory can retrieve all service passwords.

**Vector 2 — Plaintext in API JSON response:**
```python
# views.py:1329–1335
service_credentials.append({
    'service_id': cs.service.id,
    'service_name': cs.service.name,
    'password': new_password,   ← PLAINTEXT in response
    ...
})
```
The password is returned in the JSON body, which may be:
- Stored in browser developer tools
- Captured in API gateway logs
- Cached in HTTP intermediaries

**Business Impact:**  
Compromise of server access or log access yields all service passwords in plaintext. Since the credentials file is persistent, it survives across password rotations (old files remain).

**Remediation:**  
Remove `_save_service_credentials_file()`. Deliver credentials to authorized recipients via encrypted email (using the existing email settings). If file delivery is required, encrypt the file with a per-company key and delete after first download.

---

### AUTH-C07 — MasterAdmin Account Lockout Never Enforced on Main Login View
**Severity:** CRITICAL  
**Area:** Master Admin Authentication, Account Lockout / Brute Force Protection  
**Files:**  
- `backend/authentication/views.py:86–128`

**Description:**  
`MasterAdminLoginView.post()` performs authentication directly using `django.contrib.auth.authenticate()` and never consults the serializer that contains lockout logic:

```python
# views.py:86–128 — actual main login view
def post(self, request):
    email = request.data.get('email')
    password = request.data.get('password')
    user = authenticate(username=email, password=password)
    if user:
        # → Directly generates tokens. NO is_locked check.
        # → NO login_attempts increment on failure path.
```

The `MasterAdminLoginSerializer` (serializers.py:43–44) does check `master_admin.is_locked`, but this serializer is NOT used by `MasterAdminLoginView`. The `FastMasterAdminLoginSerializer` (optimized_serializers.py:46) also checks lockout but has brute force tracking disabled (AUTH-C02).

Result: `MasterAdmin.is_locked`, `MasterAdmin.login_attempts`, and `MasterAdmin.locked_until` fields exist in the model but are never updated by any active login flow, making the lockout mechanism entirely non-functional for MasterAdmin.

**Business Impact:**  
Unlimited password attempts against MasterAdmin accounts from any IP, with no lockout. Combined with the permissive 50-attempts/5-min IP rate limit, this allows 864,000 guesses per day per IP.

---

### AUTH-C08 — IP Address Spoofing via X-Forwarded-For Header
**Severity:** CRITICAL  
**Area:** Authentication Middleware, Session Hijacking Risks  
**Files:**  
- `backend/authentication/utils.py:279–292`  
- `backend/authentication/ultra_security.py:414–429`

**Description:**  
Both implementations of `get_client_ip()` trust the `X-Forwarded-For` header unconditionally:

```python
# utils.py:281–285
x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
if x_forwarded_for:
    ip = x_forwarded_for.split(',')[0].strip()   # Trusts client-supplied header
    return ip
```

No validation is performed:
- No check that the IP is a valid public address
- No trusted proxy list / CIDR range validation
- No `REMOTE_ADDR` cross-validation

This header is set by clients, not by trusted proxies, unless the Django application is behind a proxy that strips and re-adds it.

**Reproduction:**
```bash
curl -H "X-Forwarded-For: 127.0.0.1" -X POST /api/auth/master-admin/login/ \
  -d '{"email": "admin@example.com", "password": "wrong"}'
# Rate limit counter incremented for 127.0.0.1, not attacker's real IP
# After 49 more requests from different spoofed IPs, no lockout for attacker's real IP
```

**Business Impact:**  
Rate limiting, IP-based access controls (`IPRestriction` model), and security audit logs can all be bypassed or polluted by spoofing the `X-Forwarded-For` header.

---

### AUTH-C09 — JWT Tokens Generated Before Geolocation Check
**Severity:** CRITICAL (Design / Logic Flaw)  
**Area:** JWT Token Generation, Authorization Logic  
**Files:**  
- `backend/authentication/views.py:648–727`

**Description:**  
In `CompanyUserLoginView.post()`, JWT tokens are generated and the session record is created **before** the geolocation check executes:

```python
# views.py:648–655 — Tokens generated and login_attempts RESET
refresh = RefreshToken.for_user(user)
access_token = refresh.access_token
company_user.login_attempts = 0
company_user.save()

# views.py:671–681 — Session created
CompanyUserSession.objects.create(...)

# views.py:717–735 — Geolocation check AFTER tokens already generated
geo_result = check_geolocation_access(...)
if not geo_result['allowed']:
    return Response({'error': 'Access denied from location.'}, status=403)
```

Side effects that occur even for ultimately rejected (geo-blocked) logins:
1. `login_attempts` is reset to 0 (line 654) — lockout counter cleared for geo-blocked attempt
2. A `CompanyUserSession` DB record is created and never cleaned up (line 671)
3. JWT tokens are in memory (not returned, but objects are created)

**Business Impact:**  
An attacker from a geo-blocked region who has valid credentials can repeatedly reset their lockout counter by triggering geo-blocked logins. Phantom session records accumulate in the `CompanyUserSession` table.

---

## HIGH SEVERITY FINDINGS

---

### AUTH-H01 — Rate Limiter Fails Open on Cache Failure
**Severity:** HIGH  
**Area:** Authentication Middleware  
**File:** `backend/authentication/ultra_security.py:49–52`

```python
except Exception as e:
    print(f"Rate limit check failed: {e}")
    return True   # Allows all requests when cache is unavailable
```

If the cache backend (Redis, Memcached) becomes unavailable, all rate limiting is silently disabled and all requests are allowed through. No alert or fallback enforcement exists.

---

### AUTH-H02 — `invalidate_all_user_sessions()` is a No-Op
**Severity:** HIGH  
**Area:** Session Expiry, Privilege Escalation  
**File:** `backend/authentication/ultra_security.py:339–348`

```python
@staticmethod
def invalidate_all_user_sessions(user_id):
    # Implementation depends on cache backend
    pass   ← Complete no-op
```

Called when a user changes their password or requires forced logout. Has no effect. Sessions remain active after password changes.

---

### AUTH-H03 — Service User Password Change Endpoint Broken
**Severity:** HIGH  
**Area:** Service User Authentication  
**File:** `backend/authentication/views.py:1625–1667`

```python
class ServiceUserPasswordChangeView(APIView):
    permission_classes = [permissions.IsAuthenticated]   # Requires request.user.is_authenticated
```

`ServiceUserSessionAuthentication` returns `(AnonymousUser(), session)`. `AnonymousUser().is_authenticated` is `False`. DRF's `IsAuthenticated` check fails, returning HTTP 403. Service users cannot change their own passwords via this endpoint.

---

### AUTH-H04 — CSRF Disabled on All Login Endpoints
**Severity:** HIGH  
**Area:** Session Hijacking Risks  
**Files:**  
- `backend/authentication/views.py:74` (`@method_decorator(csrf_exempt, name='dispatch')` on `MasterAdminLoginView`)  
- `backend/authentication/views.py:615` (same on `CompanyUserLoginView`)

While REST APIs commonly omit CSRF protection, these endpoints issue long-lived JWT tokens that provide persistent access. A CSRF attack on a login endpoint can force-log a victim into an attacker-controlled account ("login CSRF"), enabling session fixation attacks.

---

### AUTH-H05 — Session Hijacking Detection Implemented But Never Invoked
**Severity:** HIGH  
**Area:** Session Hijacking Risks  
**File:** `backend/authentication/ultra_security.py:296–326`

`SessionSecurityManager.validate_session()` correctly checks IP address and user agent changes as hijacking indicators. However, `ServiceUserSessionAuthentication.authenticate()` never calls this function. The stored `ip_address` and `user_agent` in `ServiceUserSession` are recorded at creation but never validated on subsequent requests.

---

### AUTH-H06 — Triple Database Lookup Per Service User Request
**Severity:** HIGH (Performance + Security)  
**Area:** Permission Classes  
**Files:**  
- `backend/authentication/authentication.py:35–40`  
- `backend/authentication/permissions.py:20–28`

`IsServiceUser.has_permission()` manually re-queries `ServiceUserSession` from the database even though `ServiceUserSessionAuthentication.authenticate()` already fetched and validated it. Some views perform a third lookup. This is both inefficient and a consistency risk (session state can change between lookups).

---

### AUTH-H07 — Login Failure Discloses Remaining Attempt Count
**Severity:** HIGH  
**Area:** Account Lockout / Brute Force Protection  
**File:** `backend/authentication/views.py:804`

```python
remaining_attempts = max_attempts - company_user.login_attempts
# returned to client in error response
```

Returns `remaining_attempts` to the attacker, confirming: (1) the account exists, (2) how many more guesses remain before lockout.

---

## MEDIUM SEVERITY FINDINGS

---

### AUTH-M01 — Production Debug Print Statements
**Severity:** MEDIUM  
**Area:** Token Leakage Risks, Audit Logging  
**Files:**  
- `views.py:711, 738, 776, 780, 783, 785–789`: Print with user emails, company status, JWT-bearing `response_data`  
- `views.py:1439, 1446`: Partial session key and username in print  
- `views.py:1576, 1622`: Service user deletion debug prints  
- `serializers.py:121, 123`: User email in print  
- `optimized_serializers.py:77, 183`: Login email printed on success

`print()` output goes to stdout/process logs that may be captured by supervisord, systemd journal, or container log drivers and stored unencrypted.

---

### AUTH-M02 — `SessionSecurityManager.create_secure_session()` Never Called
**Severity:** MEDIUM  
**Area:** Session Storage  
**File:** `backend/authentication/ultra_security.py:268–293`

A properly implemented secure session factory exists (`create_secure_session()`), using `secrets.token_urlsafe(32)`, IP+UA binding, and 24-hour expiry. None of the login views call it. Service users use hand-rolled session creation without these guarantees.

---

### AUTH-M03 — TOTP Recovery Codes Stored in Plaintext
**Severity:** MEDIUM  
**Area:** Master Admin Authentication  
**File:** `backend/authentication/models.py:14`

```python
recovery_codes = models.TextField()   # JSON array of plaintext recovery codes
```

Recovery codes are stored as a JSON array of plaintext strings. If the database is compromised, all 2FA recovery codes are exposed, allowing 2FA bypass.

---

### AUTH-M04 — TOTP Secret Stored in Plaintext
**Severity:** MEDIUM  
**Area:** Master Admin Authentication  
**File:** `backend/authentication/models.py:23`

```python
two_factor_secret = models.CharField(max_length=32, blank=True)
```

The raw TOTP secret is stored in the database. Any read-access to the `authentication_masteradmin` table yields secrets that can be used to generate valid TOTP codes, bypassing 2FA entirely.

---

### AUTH-M05 — Service User Role Field Not Enforced
**Severity:** MEDIUM  
**Area:** RBAC  
**Files:**  
- `backend/authentication/models.py` (`CompanyServiceUser.role`)  
- `backend/authentication/permissions.py` (no role checks)

`CompanyServiceUser` has 4 roles (`admin`, `manager`, `user`, `viewer`) but no DRF permission class enforces role boundaries. All service users with any role have identical API access.

---

## LOW SEVERITY FINDINGS

---

### AUTH-L01 — MasterAdmin API Key Stored in Plaintext
**Severity:** LOW  
**Area:** Token Leakage Risks  
**File:** `backend/authentication/models.py:13`

`MasterAdmin.api_key` is a `CharField(max_length=64)` stored in plaintext. If leaked, the key cannot be invalidated without regeneration and cannot be detected as compromised (no hashed comparison).

---

### AUTH-L02 — Encryption Key Weakly Derived
**Severity:** LOW  
**Area:** Session Storage  
**File:** `backend/authentication/ultra_security.py:369–371`

`EncryptionManager.encrypt_sensitive_data()` uses only `settings.SECRET_KEY[:32]` (first 32 characters) as the Fernet key material, discarding the rest of the SECRET_KEY. Should use a dedicated, separately configured encryption key.

---

### AUTH-L03 — Security Log Missing Critical Events
**Severity:** LOW  
**Area:** Audit Logging of Security Events  
**Files:** `views.py`, `authentication.py`

Events not recorded in `SecurityLog`:
- Service user login (success or failure)
- Service user session creation
- Session key submitted via URL parameter
- JWT token refresh
- Service user password change
- CompanyUser logout

---

### AUTH-L04 — Geolocation Errors Silently Swallowed
**Severity:** LOW  
**Area:** Authorization Logic  
**File:** `backend/authentication/views.py:737–738`

```python
except Exception as e:
    print(f'🌍 GEOLOCATION ERROR: {str(e)}')
    # No return — continues with login
```

If the geolocation service raises an exception, the login proceeds without geo-validation. This is a fail-open behavior in a security check.

---

## Summary Table

| ID | Title | Severity | Area |
|----|-------|----------|------|
| AUTH-C01 | Test/debug login endpoints in production | CRITICAL | Auth bypass |
| AUTH-C02 | Per-account brute force protection disabled | CRITICAL | Brute force |
| AUTH-C03 | NameError crash on 2FA failure | CRITICAL | 2FA / stability |
| AUTH-C04 | Service user sessions never expire | CRITICAL | Session expiry |
| AUTH-C05 | Session key in URL query parameter | CRITICAL | Token leakage |
| AUTH-C06 | Plaintext passwords written to disk | CRITICAL | Credential exposure |
| AUTH-C07 | MasterAdmin lockout never enforced | CRITICAL | Brute force |
| AUTH-C08 | IP spoofing via X-Forwarded-For | CRITICAL | Rate limit bypass |
| AUTH-C09 | JWT tokens generated before security checks | CRITICAL | Logic flaw |
| AUTH-H01 | Rate limiter fails open on cache failure | HIGH | Rate limiting |
| AUTH-H02 | `invalidate_all_user_sessions()` is no-op | HIGH | Session management |
| AUTH-H03 | Service user password change broken | HIGH | Service user auth |
| AUTH-H04 | CSRF disabled on login endpoints | HIGH | CSRF |
| AUTH-H05 | Session hijacking detection not used | HIGH | Session hijacking |
| AUTH-H06 | Triple DB lookup per service request | HIGH | Performance / security |
| AUTH-H07 | Remaining attempts disclosed on failure | HIGH | Information disclosure |
| AUTH-M01 | Debug print statements in production | MEDIUM | Token leakage |
| AUTH-M02 | Secure session factory never called | MEDIUM | Session management |
| AUTH-M03 | Recovery codes stored in plaintext | MEDIUM | 2FA security |
| AUTH-M04 | TOTP secret stored in plaintext | MEDIUM | 2FA security |
| AUTH-M05 | Service user roles not enforced | MEDIUM | RBAC |
| AUTH-L01 | API key stored in plaintext | LOW | Credential storage |
| AUTH-L02 | Encryption key weakly derived | LOW | Encryption |
| AUTH-L03 | Security log missing critical events | LOW | Audit logging |
| AUTH-L04 | Geolocation errors silently swallowed | LOW | Fail-open |
