# HR_SECURITY_REPORT.md

**Scope:** `backend/hr/` · **Mode:** READ-ONLY.
**Severity:** 🔴 High · 🟠 Medium · 🟡 Low.
**Focus:** authentication gaps, cross-tenant data access, PII exposure, payroll integrity.

---

## Baseline (verified secure)

- `EmployeeListCreateView`, `EmployeeDetailView`, `DepartmentListCreateView/Detail`,
  `DesignationListCreateView/Detail`, `JobPostingListCreateView/Detail`,
  `JobApplicationListCreateView/Detail`, `HRDashboardViewSet` — all use Pattern A
  (`ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated`). Reads and writes
  are company-scoped via `company=session.service_user.company`.
- `manual_entry` (attendance) uses `Employee.objects.get(id=employee_id, company=session.service_user.company)` — correctly scoped.

---

## 🔴 S1 — `biometric_sync` endpoint is completely unauthenticated

**Severity:** 🔴 High
**File/Line:** `attendance_views.py:654–709`

**Proof:**
```python
@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def biometric_sync(request):
    device_id = request.data.get('device_id')
    attendance_logs = request.data.get('logs', [])

    try:
        device = AttendanceDevice.objects.get(device_id=device_id)
        for log_data in attendance_logs:
            employee_id = log_data.get('employee_id')
            ...
            employee = Employee.objects.get(employee_id=employee_id, company=device.company)
            AttendanceLog.objects.create(...)
            attendance, created = Attendance.objects.get_or_create(...)
```

There is NO session key check, NO authentication class, and NO secret on the device. Anyone who knows (or guesses) a `device_id` can inject arbitrary attendance records for any employee in that device's company.

**Reproduction:**
```bash
# device_id values follow predictable patterns (e.g., BIO-001, DEVICE-001)
curl -X POST http://localhost:8005/api/hr/attendance/biometric-sync/ \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "BIO-001",
    "logs": [
      {"employee_id": "EMP-000001", "timestamp": "2026-06-24T09:00:00", "type": "in"},
      {"employee_id": "EMP-000001", "timestamp": "2026-06-24T18:00:00", "type": "out"}
    ]
  }'
# No session key required — records created or updated
```

**Business Impact:**
- Inject fake attendance records → inflate payroll payout for any employee.
- Mark any employee as present/absent on any date → corrupt leave-attendance clash logic.
- Payroll for the month calculated against falsified data.
- No audit trace that the injection came from outside.

**Remediation:** Add device-level API key authentication (a shared secret stored on the device and validated server-side) AND validate that `device.company` matches a real session before accepting logs. Remove `AllowAny`.

---

## 🔴 S2 — `mobile_attendance` accepts any cross-company employee_id

**Severity:** 🔴 High
**File/Line:** `attendance_views.py:279–412` (function `mobile_attendance`), specifically `:300`

**Proof:**
```python
@api_view(['POST'])
@authentication_classes([])
@permission_classes([permissions.AllowAny])
def mobile_attendance(request):
    ...
    employee = Employee.objects.get(employee_id=data['employee_id'])
    #                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    #                              NO company filter — any company's employee
```

The endpoint accepts any `employee_id` value. Since `employee_id` is globally unique across all companies (models.py:148), an attacker can target employees from any tenant.

**Reproduction:**
```bash
# No session key needed
curl -X POST http://localhost:8005/api/hr/attendance/mobile/ \
  -F "employee_id=COMP-B-EMP-000001" \
  -F "action=checkin" \
  -F "latitude=12.9716" \
  -F "longitude=77.5946"
# Records check-in for another company's employee without any authentication
```

**Business Impact:** Any internet user can mark any employee present/absent across all companies. Payroll for all tenants is at risk.

**Remediation:** Require a valid mobile session token (issued at `employee_mobile_login`). The `session_key` returned from login should be sent with attendance requests and verified. Add `employee.company` filter to the lookup.

---

## 🔴 S3 — `AllowAny` on payroll/leave/statutory viewsets — entire HR finance surface bypasses DRF auth

**Severity:** 🔴 High
**File/Line:** `payroll_views.py:30-31, 278-279, 429-430`; `leave_views.py:50-51, 151-152, 330-331, 615-616`; `statutory_views.py:43-44, 88-89, 116-117, 190-191`; `advanced_views.py:16-17, 152-153, 321-322, 541-542`; `performance_views.py:14-15`; `analytics_views.py:15`

**Proof (representative):**
```python
# payroll_views.py:29-31
class PayrollViewSet(viewsets.ModelViewSet):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
```

All of the following ViewSets declare `authentication_classes = []` and `permission_classes = [AllowAny]`:
- `PayrollViewSet`, `PayslipViewSet`, `PayrollSettingsViewSet`
- `LeaveTypeViewSet`, `LeaveBalanceViewSet`, `LeaveApplicationViewSet`, `HolidayViewSet`
- `AttendanceSystemViewSet`, `AttendanceViewSet`
- `StatutorySettingsViewSet`, `EmployeeStatutoryDetailsViewSet`, `GovernmentReturnViewSet`, `ComplianceAlertViewSet`

They implement manual session validation **inside each method body**. This pattern is fragile:
- Any new `@action` method that omits the `get_session_key()` call is fully unauthenticated.
- DRF's `DEFAULT_AUTHENTICATION_CLASSES` / `DEFAULT_PERMISSION_CLASSES` are bypassed globally for these views.
- No centralized enforcement — the same 8-line session check is copy-pasted 30+ times.

**Business Impact:** A developer adding a new action to `PayrollViewSet` must remember to add the session check or the action is publicly accessible. Salary and leave data for all companies exposed to unauthenticated callers.

**Remediation:** Convert all these ViewSets to use `authentication_classes = [ServiceUserSessionAuthentication]` and `permission_classes = [IsServiceUserAuthenticated]`, then use `request.service_user.company` throughout — matching the pattern in `views.py`.

---

## 🟠 S4 — `PerformanceReviewSerializer.reviewer` FK unscoped — cross-company FK injection

**Severity:** 🟠 Medium
**File/Line:** `serializers.py:212`

**Proof:**
```python
class PerformanceReviewSerializer(serializers.ModelSerializer):
    reviewer = serializers.PrimaryKeyRelatedField(
        queryset=Employee.objects.all(),  # ← ALL companies
        required=False, allow_null=True
    )
```

A service user from Company A can POST a performance review with `reviewer` = an `Employee.id` from Company B. The review is linked to a reviewer from a different tenant, exposing Company B's employee data in Company A's performance records.

**Business Impact:** Cross-company employee data linkage. Company A can reference Company B's employees as reviewers, creating FK relationships across tenant boundaries.

**Remediation:** Scope the queryset: `queryset=Employee.objects.filter(company=self.context['request'].service_user.company)`.

---

## 🟠 S5 — `EmployeeDetailSerializer` exposes `face_encoding` biometric data

**Severity:** 🟠 Medium
**File/Line:** `serializers.py:90`

**Proof:**
```python
class EmployeeDetailSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [
            ...
            'face_photo', 'face_encoding',   # ← raw biometric encoding array
            ...
        ]
```

`face_encoding` is a `JSONField` that stores the raw facial embedding vector used for attendance biometric matching. This is biometric PII. Any authenticated HR service user can retrieve the face encoding for any employee via `GET /api/hr/employees/{id}/`.

**Business Impact:** Face encoding data exposed to all HR service users. If leaked, cannot be revoked (unlike a password). Enables spoofing of the face recognition attendance system by anyone who builds a compatible encoding.

**Remediation:** Remove `face_encoding` from serializer fields. It is an internal computation field, not a display field.

---

## 🟠 S6 — `EmployeeListSerializer` exposes full PII (Aadhar, PAN, bank account) in list endpoint

**Severity:** 🟠 Medium
**File/Line:** `serializers.py:43-44`

**Proof:**
```python
class EmployeeListSerializer(serializers.ModelSerializer):
    class Meta:
        fields = [
            ...
            'aadhar_number', 'pan_number',              # Government IDs
            'pf_number', 'uan_number', 'esi_number',    # Statutory IDs
            'bank_name', 'bank_account_number',          # Banking info
            'bank_ifsc_code', 'bank_branch',
            'emergency_contact_name', 'emergency_contact_relationship',
            'emergency_contact_phone', 'emergency_contact_address',
            ...
        ]
```

The LIST endpoint (`GET /api/hr/employees/`) returns all these PII fields for every employee returned in a paginated list (up to 100 employees per page per `max_page_size`).

**Business Impact:** A single API call returns Aadhar, PAN, and bank account numbers for 100 employees. Under DPDP Act 2023 and IT Act 2000, this is a data protection violation. If the session key is compromised, the entire employee roster's sensitive data is exposed in one call.

**Remediation:** `EmployeeListSerializer` should return only non-sensitive identifiers (`employee_id`, `full_name`, `email`, `department`, `designation`, `status`). Sensitive PII fields belong only in `EmployeeDetailSerializer` with explicit justification.

---

## 🟠 S7 — `LeaveApplicationViewSet.create()` does not bind employee to caller's company

**Severity:** 🟠 Medium
**File/Line:** `leave_views.py:599–611`

**Proof:**
```python
def create(self, request, *args, **kwargs):
    ...
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()   # ← no company injection; serializer uses fields='__all__'
```

The `LeaveApplicationSerializer` uses `fields = '__all__'` (leave_views.py:38), accepting the `employee` FK from the client without scoping it to the session's company. A Company A service user can create a leave application for a Company B employee by POSTing that employee's ID.

**Business Impact:** Cross-company leave manipulation. Attacker can create/modify leave records for employees in any company.

---

## 🟡 S8 — `download_mobile_credentials` writes bcrypt hash in plaintext text file

**Severity:** 🟡 Low (credential confusion, not plaintext password exposure)
**File/Line:** `views.py:1047`

**Proof:**
```python
credentials_content = f"""...
Mobile App Login Credentials:
----------------------------
Employee ID: {employee.employee_id}
Password: {employee.mobile_app_password}   ← bcrypt hash e.g. "$2b$12$..."
...
"""
response = HttpResponse(credentials_content, content_type='text/plain')
```

The file sent to the HR user contains the bcrypt hash string, not the plaintext password. The HR user cannot log into the mobile app with a bcrypt hash. The endpoint is functionally broken and confusing. Additionally, distributing hash strings via plaintext file is unnecessary exposure of the hash for offline cracking attempts.

**Business Impact:** The feature is non-functional (HR cannot give employees their password). Distributing hashes in files increases attack surface.

**Remediation:** Either store a generated one-time plaintext password and hash it on set (never readable again), or implement a password reset link sent to the employee's email.

---

## 🟡 S9 — Session key accepted from query parameter throughout HR module

**Severity:** 🟡 Low (inherited risk, documented in project-wide audit)
**File/Line:** `attendance_views.py:42`; `payroll_views.py:47`; `leave_views.py:70-72`; etc.

**Proof (representative):**
```python
def get_session_key(self):
    session_key = self.request.headers.get('Authorization', '').replace('Bearer ', '')
    if not session_key:
        session_key = self.request.query_params.get('session_key')  # ← URL leak
    if not session_key and self.request.method in ['POST', 'PUT', 'PATCH']:
        session_key = self.request.data.get('session_key')          # ← body extraction
    return session_key
```

This pattern is repeated in every HR ViewSet that uses Pattern B. Session keys in query parameters appear in:
- Web server access logs
- Browser history
- `Referer` headers to third-party analytics
- Reverse proxy logs

**Business Impact:** Session key leaked via logs. Attacker with log access can replay session for payroll operations, leave approvals, statutory returns.

---

## 🟡 S10 — Global `employee_id` and `email` uniqueness enables cross-company enumeration

**Severity:** 🟡 Low
**File/Line:** `models.py:148, 151`

**Proof:**
```python
employee_id = models.CharField(max_length=20, unique=True)   # :148 — GLOBAL
email = models.EmailField(validators=[EmailValidator()], unique=True)  # :151 — GLOBAL
```

An attacker can POST an employee with email `target@company-b.com`. The 400 error ("Employee with this email already exists") confirms the email is in use somewhere in the system — **across any company**. The `validate_email` check in `EmployeeCreateSerializer:147` does not filter by company.

**Business Impact:** Oracle attack: attacker can confirm whether a given email/employee_id belongs to any company's workforce via error message enumeration. Combinable with S2 to target specific employees.

---

## Permission-Enforcement Matrix (HR module)

| Action | Endpoint | Auth Pattern | Tenant-Safe? |
|--------|----------|-------------|:---:|
| List/retrieve employees | `/api/hr/employees/` | Pattern A ✅ | ✅ |
| Create/update employees | `/api/hr/employees/` | Pattern A ✅ | ✅ |
| View payroll cycles | `/api/hr/payroll/` | Pattern B (manual) | ⚠️ |
| View payslips | `/api/hr/payslips/` | Pattern B (manual) | ⚠️ |
| Leave management | `/api/hr/leave-*` | Pattern B (manual) | ⚠️ |
| Attendance CRUD | `/api/hr/attendance/` | Pattern B (manual) | ⚠️ |
| Mobile check-in | `/api/hr/attendance/mobile/` | `AllowAny` + NO session check | ❌ |
| Biometric sync | `/api/hr/attendance/biometric-sync/` | `AllowAny` + NO auth at all | ❌ |
| Statutory returns | `/api/hr/statutory/*` | Pattern B (manual) | ⚠️ |
| Performance reviews | `/api/hr/performance/` | Pattern B (manual) | ⚠️ |
| HR analytics | `/api/hr/analytics/*` | Pattern B (manual) | ⚠️ |

## Priority

1. **S1 + S2** — Add proper device auth to `biometric_sync`; add session + company scope to `mobile_attendance`. Both are unauthenticated write endpoints affecting payroll.
2. **S3** — Migrate all Pattern B ViewSets to use `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated`.
3. **S6** — Remove PII from `EmployeeListSerializer`.
4. **S5** — Remove `face_encoding` from serializer.
5. **S4/S7** — Scope `reviewer` FK and leave `employee` FK to caller's company.
6. **S8** — Fix credential download to be functional.
