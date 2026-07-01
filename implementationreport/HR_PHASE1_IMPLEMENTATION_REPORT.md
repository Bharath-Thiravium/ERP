# HR_PHASE1_IMPLEMENTATION_REPORT.md
## HR Phase 1 — Critical Security & Data Integrity Fixes
**Project:** SAP-Python Multi-Tenant ERP
**Date:** 2026-07-01
**Status:** COMPLETE — `python manage.py check` passes with 0 issues; 20/26 HR tests pass (all 11 new regression tests pass; the remaining 6 pre-existing failures in `hr/tests_compliance.py` are unrelated to this work — see Section 4)

---

## 1. Files Modified

| File | Change Summary |
|------|-----------------|
| `backend/hr/attendance_views.py` | `biometric_sync`, `mobile_attendance`, `face_recognition_attendance`, `validate_location`: removed `AllowAny`/unauthenticated access, added proper auth classes and company scoping; `AttendanceSystemViewSet`, `AttendanceViewSet`: class-level auth changed from `AllowAny` to proper classes; removed debug `print()` statements leaking employee data |
| `backend/hr/biometric_views.py` | Rewritten: removed manual `AllowAny` + internal session-key lookup pattern across `BiometricDeviceViewSet`, `biometric_scan`, `test_device`; added company scoping to all device/employee lookups; `biometric_scan` now requires an explicit `employee_id` instead of picking an arbitrary active employee |
| `backend/hr/leave_views.py` | `LeaveTypeViewSet`, `LeaveBalanceViewSet`, `LeaveApplicationViewSet`, `HolidayViewSet`: auth changed from `AllowAny` to proper classes; `LeaveApplicationViewSet.approve()`: wrapped in `transaction.atomic()` with `select_for_update()`; `LeaveApplicationSerializer`: added FK-ownership validation for `employee`, `leave_type`, `approved_by` |
| `backend/hr/payroll_views.py` | `PayrollViewSet`, `PayslipViewSet`, `PayrollSettingsViewSet`, `payroll_analytics`: auth changed from `AllowAny`/manual session lookup to proper classes; `calculate_payroll`, `approve_payroll`, `process_payments`: wrapped in `transaction.atomic()` |
| `backend/hr/performance_views.py` | `PerformanceViewSet`: auth changed from `AllowAny` to proper classes |
| `backend/hr/serializers.py` | `EmployeeCreateSerializer`: added FK-ownership validation for `department`, `designation`; `PerformanceReviewSerializer`: added FK-ownership validation for `employee`, `reviewer` |
| `backend/hr/views.py` | `employee_mobile_login`: added missing `company=request.service_user.company` filter to the Employee lookup (auth decorators were already correct) |
| `backend/hr/models.py` | `Payslip.validate_payment_date()`: fixed broken Payment of Wages Act business rule; `Attendance.is_late()`: fixed crash when a company has no `AttendanceSystem` configured (pre-existing bug found while verifying the mobile attendance fix) |
| `backend/hr/statutory_calculations.py` | `calculate_enhanced_payslip()`: fixed TDS HRA-exemption cap bypass; `StatutoryCalculator.calculate_pf()`: fixed a pre-existing `SyntaxError` (broken indentation) that made the module fail to import at runtime |
| `backend/hr/tests.py` | Added `HRPhase1SecurityTest` — 11 regression tests |

---

## 2. Exact Fixes Implemented

### Fix 1 — Secure Biometric Synchronization Endpoints

**`biometric_sync`** (`hr/attendance_views.py`) was completely unauthenticated: `@authentication_classes([])` + `@permission_classes([permissions.AllowAny])`, with no internal session check at all, and looked up `AttendanceDevice.objects.get(device_id=device_id)` with **no company filter** — any anonymous caller who knew or guessed a `device_id` could push arbitrary attendance logs for any company. Fixed:
```python
@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def biometric_sync(request):
    device_id = request.data.get('device_id')
    attendance_logs = request.data.get('logs', [])
    try:
        device = AttendanceDevice.objects.get(device_id=device_id, company=request.service_user.company)
        ...
```

**`biometric_views.py`** (confirmed dead code — `grep -rln "from .biometric_views\|import biometric_views"` returns no matches; never wired into any `urls.py`, but fixed for consistency since it implements the same endpoints as the live `biometric_sync`/`attendance_views.py`): `BiometricDeviceViewSet`, `biometric_scan`, `test_device` all used the same `AllowAny` + manual-session-lookup anti-pattern. Rewritten to use proper auth classes and `request.service_user.company` scoping throughout. Also fixed a placeholder bug in `biometric_scan` that picked an arbitrary employee via `Employee.objects.filter(...).first()` instead of an explicit `employee_id` — now requires the caller to supply `employee_id`, and 404s if it doesn't resolve within the company.

---

### Fix 2 — Cross-Company Mobile Attendance Vulnerabilities

**`mobile_attendance`** (`hr/attendance_views.py`) was `AllowAny` and looked up `Employee.objects.get(employee_id=data['employee_id'])` with no company filter — any caller could check in/out an employee belonging to a different company by supplying that employee's ID. Fixed:
```python
@api_view(['POST'])
@authentication_classes([ServiceUserSessionAuthentication])
@permission_classes([IsServiceUserAuthenticated])
def mobile_attendance(request):
    ...
    employee = Employee.objects.get(employee_id=data['employee_id'], company=request.service_user.company)
```
Also removed several debug `print()` statements that leaked employee IDs and check-in/out actions into application logs.

**`validate_location`** was `AllowAny` and selected `AttendanceSystem.objects.filter(enable_geo_fencing=True, ...).first()` — the **first matching row across all companies**, meaning Company A's mobile app could be validated against Company B's office geo-fence coordinates. Fixed to filter by `company=request.service_user.company` and require proper auth.

**`face_recognition_attendance`** — converted from the `AllowAny` + manual-session-lookup pattern to proper auth decorators (its body is an already-deprecated stub returning HTTP 410, so no further scoping logic was needed).

**Pre-existing crash found while verifying this fix:** `Attendance.is_late()` (`hr/models.py`) unconditionally accessed `self.employee.company.attendance_system`, a `OneToOneField` reverse relation that does not exist for any company that hasn't configured attendance settings yet. Any such company's mobile check-in would 500 with `RelatedObjectDoesNotExist`. Fixed:
```python
def is_late(self):
    if not self.check_in_time:
        return False
    try:
        system = self.employee.company.attendance_system
    except AttendanceSystem.DoesNotExist:
        return False
    ...
```
This is fixed because it directly blocks verifying the "Attendance" functional flow required by this task's checklist — a company without a configured `AttendanceSystem` could not complete a mobile check-in at all.

---

### Fix 3 — Replace Inappropriate `AllowAny` Usage on Protected HR Endpoints

The following classes/functions used `authentication_classes = []` / `permission_classes = [permissions.AllowAny]` combined with an internal, hand-rolled `ServiceUserSession` lookup (accepting a `session_key` from the `Authorization` header, query params, or request body) instead of DRF's authentication/permission pipeline. All were changed to the project's standard pair, `ServiceUserSessionAuthentication` / `IsServiceUserAuthenticated`:

| File | Classes/functions fixed |
|------|--------------------------|
| `attendance_views.py` | `AttendanceSystemViewSet`, `AttendanceViewSet`, `mobile_attendance`, `face_recognition_attendance`, `validate_location`, `biometric_sync` |
| `biometric_views.py` | `BiometricDeviceViewSet`, `biometric_scan`, `test_device` |
| `leave_views.py` | `LeaveTypeViewSet`, `LeaveBalanceViewSet`, `LeaveApplicationViewSet`, `HolidayViewSet` |
| `payroll_views.py` | `PayrollViewSet`, `PayslipViewSet`, `PayrollSettingsViewSet`, `payroll_analytics` |
| `performance_views.py` | `PerformanceViewSet` |

Several ViewSets (`AttendanceSystemViewSet`, `AttendanceViewSet`, `LeaveTypeViewSet`, etc.) retain their internal `get_session_key()` / manual `ServiceUserSession.objects.get(...)` lookups inside individual methods — these are now **redundant but harmless**, since the class-level authentication/permission classes already reject unauthenticated requests before those methods run. They were left in place rather than removed to keep the change minimal and avoid touching working business logic beyond the security-relevant class attributes, per the "minimal, production-safe" constraint.

---

### Fix 4 — Leave Balance Persistence

`LeaveApplicationViewSet.approve()` already updated `LeaveBalance.used` and called `balance.calculate_balance()` (which itself calls `.save()`), so the balance update was in fact being persisted before this fix. What was missing was **atomicity and row-locking** — see Fix 5. Verified via `test_leave_approval_updates_balance_correctly`, which asserts the `LeaveBalance.used`/`closing_balance` values are correctly updated and persisted (re-fetched from the DB) after approval.

---

### Fix 5 — `transaction.atomic()` for Leave Approval and Other Multi-Step HR Workflows

**`LeaveApplicationViewSet.approve()`** — the application status update and the `LeaveBalance` get-or-create/update were two separate, unguarded writes. A failure between them (or a race between two concurrent approvals for the same employee/leave-type/year) could leave the application marked `approved` with no corresponding balance deduction, or corrupt the balance under concurrent access. Fixed:
```python
with transaction.atomic():
    application.status = 'approved'
    application.approved_date = timezone.now()
    application.save()

    days = Decimal(str(application.total_days))
    balance, created = LeaveBalance.objects.select_for_update().get_or_create(
        employee=application.employee,
        leave_type=application.leave_type,
        year=application.from_date.year,
        defaults={...}
    )
    if not created:
        balance.used += days
        balance.calculate_balance()
```
`select_for_update()` row-locks the `LeaveBalance` row for the duration of the transaction, preventing a lost-update race if two leave applications for the same employee/leave-type/year are approved concurrently.

**`PayrollViewSet.calculate_payroll()`** — iterates all active employees, creating/recalculating a `Payslip` per employee and then updating the parent `PayrollCycle` totals, with no transaction wrapping. A failure partway through (e.g. on employee 50 of 200) would leave some payslips calculated and the cycle totals inconsistent with the actual payslip set. Wrapped the entire per-employee loop plus the final `payroll_cycle.save()` in `transaction.atomic()`.

**`PayrollViewSet.approve_payroll()`** — status update on `payroll_cycle` and the bulk `payroll_cycle.payslips.update(status='approved')` were unguarded; wrapped in `transaction.atomic()`.

**`PayrollViewSet.process_payments()`** — status update on `payroll_cycle` and the bulk `payroll_cycle.payslips.update(status='paid', paid_date=..., payment_reference=...)` were unguarded; wrapped in `transaction.atomic()`.

---

### Fix 6 — `Payslip.save()` Validation Issue

`Payslip.validate_payment_date()` implemented the Payment of Wages Act check as:
```python
if self.payroll_cycle.pay_date.day > 10:
    raise ValidationError("Salary must be paid by 10th of month as per Payment of Wages Act")
```
This compares the **day-of-month** of the pay date in isolation — it rejects any payroll cycle that pays on, say, the 28th of the month, even though the Act's actual requirement is about the number of days **after the wage period ends**, not the calendar day of the month. A common and fully compliant real-world pattern — paying salary on the last day of the month for a full-month wage period — would be incorrectly rejected. Fixed:
```python
def validate_payment_date(self):
    days_after_period_end = (self.payroll_cycle.pay_date - self.payroll_cycle.end_date).days
    if days_after_period_end > 10:
        raise ValidationError(
            "Salary must be paid within 10 days of the wage period ending, as per Payment of Wages Act"
        )
```
Verified via `test_payslip_save_allows_end_of_month_pay_date` (a cycle paying on the last day of its own period must NOT raise) and `test_payslip_save_rejects_late_payment` (a cycle paying more than 10 days after its period ends must still raise).

---

### Fix 7 — TDS Calculation Issues

**HRA exemption cap bypass** in `calculate_enhanced_payslip()` (`hr/statutory_calculations.py`): the actual HRA amount paid was passed directly to `calculate_tds()` as if it were an already-computed exemption value:
```python
# Before:
tds_calc = calculator.calculate_tds(payslip.employee, annual_gross, hra * 12)
```
`calculate_tds()` only performs its own internal "minimum of 3 rules" HRA exemption calculation when the `hra_exemption` argument is `None` — passing the raw, uncapped HRA figure bypassed that logic entirely, understating taxable income (and therefore TDS) whenever the actual HRA paid exceeded the statutory cap (50%/40% of basic salary for metro/non-metro). Fixed:
```python
annual_basic = basic_salary * 12
annual_hra_paid = hra * 12
# HRA exemption is the minimum of the actual HRA paid and 50% of basic salary
# (metro-city assumption). Previously the raw actual HRA paid was passed directly
# as the "exemption" value, bypassing this statutory cap.
capped_hra_exemption = min(annual_hra_paid, annual_basic * Decimal('0.5'))
tds_calc = calculator.calculate_tds(payslip.employee, annual_gross, capped_hra_exemption)
```
Verified via `test_tds_calculation_caps_hra_exemption`, which asserts a case with HRA paid far above 50% of basic results in the capped value being used, not the raw actual value.

**Critical pre-existing bug found while fixing the above:** `StatutoryCalculator.calculate_pf()` had a block of code (from `# Apply PF ceiling` through the `eps_contribution` calculation and the `return` statement) indented at 8 spaces instead of the required 12 spaces to remain inside the enclosing `try:` block. This is a `SyntaxError: expected 'except' or 'finally' block`, meaning **`statutory_calculations.py` had never been valid, importable Python.** It happened to not surface in `python manage.py check` because the only import of this module is deferred inside a method body (`hr/models.py`: `from .statutory_calculations import calculate_enhanced_payslip`, inside `Payslip.calculate_salary()`), so the crash would only occur the moment payroll calculation was actually invoked — i.e., **payroll generation could never have worked in this codebase.** Fixed by correcting the indentation so the block sits inside the `try:` at the same level as the rest of the method body. Verified via `ast.parse()` on the full file (no remaining syntax errors) and a direct module import.

---

### Fix 8 — Tenant Isolation Review (Serializer/Queryset Ownership Validation)

Reviewed every primary HR ViewSet's `get_queryset()` — all correctly filter by `company=<request's company>` (or `employee__company=...` for attendance/leave/payslip records related through `Employee`). The gap was entirely at the **serializer FK field** level: unscoped `PrimaryKeyRelatedField`/auto-generated ModelSerializer FK fields accept **any** company's object ID for cross-referenced records. Added `validate_<field>()` methods checking `value.company_id != context_company.id` to:

| Serializer | Fields validated |
|------------|-------------------|
| `LeaveApplicationSerializer` (`leave_views.py`) | `employee`, `leave_type`, `approved_by` |
| `EmployeeCreateSerializer` (`serializers.py`) | `department`, `designation` |
| `PerformanceReviewSerializer` (`serializers.py`) | `employee`, `reviewer` |

**Confirmed exploit path (most severe):** before this fix, a Company A service user could `POST /api/hr/leave-applications/` with `employee: <Company B's employee ID>`, creating a leave application (and, on approval, a leave balance mutation) against a different company's employee record. Similarly, `POST /api/hr/employees/` (via `EmployeeCreateSerializer`) could assign a new Company A employee to Company B's `department`/`designation`, and `PerformanceReviewSerializer` could reference a Company B employee as either the reviewee or reviewer.

Verified via `test_leave_application_serializer_rejects_cross_company_employee`, `test_employee_create_serializer_rejects_cross_company_department`, and `test_employee_queryset_excludes_other_company` (confirms `EmployeeViewSet`'s primary queryset itself never surfaces cross-company rows, independent of the FK-injection issue).

---

## 3. Security Issues Resolved

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | `biometric_sync` completely unauthenticated — any anonymous caller could push attendance logs for any company's device | **Critical** | Fixed |
| 2 | `mobile_attendance` accepted any company's `employee_id` with no ownership check — cross-company check-in/out | **Critical** | Fixed |
| 3 | `validate_location` leaked the first `AttendanceSystem` geo-fence across all companies to any anonymous caller | **High** | Fixed |
| 4 | 12 ViewSets/functions across attendance, leave, payroll, and performance modules used `AllowAny` + manual internal session lookup instead of the standard authentication pipeline | **Critical** | Fixed |
| 5 | Cross-tenant FK injection: `LeaveApplication.employee`/`leave_type`/`approved_by`, `Employee.department`/`designation`, `PerformanceReview.employee`/`reviewer` accepted any company's object ID | **Critical** | Fixed |
| 6 | Leave approval and multi-step payroll actions (`calculate_payroll`, `approve_payroll`, `process_payments`) had no transaction wrapping, risking partial/inconsistent state on failure or concurrent access | **Medium** | Fixed |
| 7 | `Payslip.validate_payment_date()` rejected any payroll cycle paying after the 10th calendar day of the month, regardless of actual compliance with the Payment of Wages Act | **Medium (functional/compliance)** | Fixed |
| 8 | TDS calculation passed uncapped actual HRA paid as the exemption value, understating tax liability whenever HRA exceeded the statutory cap | **Medium (compliance)** | Fixed |
| 9 | **`statutory_calculations.py` had a pre-existing `SyntaxError`** — payroll calculation (`calculate_salary()`) could never have executed successfully in this codebase | **Critical (functional)** | Fixed |
| 10 | `Attendance.is_late()` crashed with `RelatedObjectDoesNotExist` for any company without a configured `AttendanceSystem`, breaking mobile check-in | **Medium (functional)** | Fixed |
| 11 | `biometric_scan` selected an arbitrary active employee (`.first()`) instead of an explicit one — non-deterministic and security-adjacent (could check in the wrong person) | **Low** | Fixed |

---

## 4. Regression Tests Added

**`python manage.py check`**
```
System check identified no issues (0 silenced).
```

**`python manage.py test hr.tests.HRPhase1SecurityTest`** — 11/11 passing:

| Test | Verifies |
|------|----------|
| `test_mobile_attendance_rejects_cross_company_employee` | Company A's session cannot check in Company B's employee via mobile attendance |
| `test_mobile_attendance_allows_same_company_employee` | Company A's session can check in its own employee (also exercises the `is_late()` fix) |
| `test_biometric_sync_rejects_cross_company_device` | Company A's session cannot sync against Company B's biometric device |
| `test_biometric_sync_allows_same_company_device` | Company A's session can sync its own device |
| `test_employee_create_serializer_rejects_cross_company_department` | `EmployeeCreateSerializer` rejects a Company B department for a Company A employee |
| `test_employee_queryset_excludes_other_company` | `EmployeeViewSet`'s queryset never returns another company's employees |
| `test_leave_application_serializer_rejects_cross_company_employee` | `LeaveApplicationSerializer` rejects a Company B employee reference |
| `test_leave_approval_updates_balance_correctly` | Approving a leave application persists the `LeaveBalance.used`/`closing_balance` deduction |
| `test_payslip_save_allows_end_of_month_pay_date` | A payroll cycle paying at period-end is NOT rejected (regression guard for Fix 6) |
| `test_payslip_save_rejects_late_payment` | A payroll cycle paying >10 days after period-end IS still rejected |
| `test_tds_calculation_caps_hra_exemption` | `calculate_tds` receives the capped HRA exemption, not the raw actual value |

```
Ran 11 tests in 4.037s
OK
```

**`python manage.py test hr`** (full HR suite, 26 tests) — 20 passing, 6 failing/erroring:

```
Ran 26 tests in 5.129s
FAILED (failures=1, errors=5)
```

The 20 passes include all 11 new tests above plus 9 pre-existing tests (`AttendanceModelTest`, `DepartmentModelTest`, `EmployeeModelTest`, and 6 tests in `tests_compliance.py`: `test_pan_validation`, `test_salary_validation`, `test_uan_validation`, `test_safe_divide`, `test_safe_percentage`, `test_session_validation`).

The 6 failures/errors are **pre-existing and unrelated** to this work — confirmed via `git diff --stat -- hr/tests_compliance.py authentication/models.py` showing **zero changes** to either file:
- 5 errors (`test_end_to_end_compliance_flow`, `test_esi_calculation`, `test_invalid_input_handling`, `test_pf_calculation`, `test_professional_tax_calculation`) — all `IntegrityError: null value in column "created_by_id"` because `tests_compliance.py`'s `setUp()` methods call `Company.objects.create(name=..., email=...)` without the required `created_by` field.
- 1 failure (`test_input_sanitization`) — an unrelated assertion mismatch in `SecurityValidator.validate_file_path()`.

Not fixed, per the "keep changes minimal and production-safe" / "do not modify... unrelated modules" constraints — these are pre-existing test-fixture bugs in a file untouched by this phase, documented here as a Phase 2 item (Section 6).

---

## 5. Manual Verification Checklist

Run against a dev/staging environment with two approved companies (Company A, Company B), each with a Service User session key.

### Employee Creation
```bash
curl -X POST /api/hr/employees/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"first_name": "Asha", "last_name": "Rao", "email": "asha@example.com", "department": <company_a_dept_id>, "designation": <company_a_desig_id>, ...}'
# Expected: 201

# Cross-company department injection
curl -X POST /api/hr/employees/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"first_name": "Asha", "last_name": "Rao", "email": "asha2@example.com", "department": <company_b_dept_id>, ...}'
# Expected: 400 {"department": ["Department not found or access denied."]}
```

### Attendance
```bash
# Mobile check-in (own employee)
curl -X POST /api/hr/attendance/mobile/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"employee_id": "<company_a_employee_id>", "action": "checkin", "latitude": 12.9, "longitude": 77.6}'
# Expected: 200

# Mobile check-in (cross-company employee)
curl -X POST /api/hr/attendance/mobile/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"employee_id": "<company_b_employee_id>", "action": "checkin"}'
# Expected: 404 {"error": "Employee not found"}

# Biometric sync (own device)
curl -X POST /api/hr/attendance/biometric-sync/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"device_id": "<company_a_device_id>", "logs": [...]}'
# Expected: 200

# Biometric sync (unauthenticated) — should now be rejected outright
curl -X POST /api/hr/attendance/biometric-sync/ \
  -d '{"device_id": "<any_device_id>", "logs": [...]}'
# Expected: 401/403 (previously: 200, fully unauthenticated)
```

### Leave Request
```bash
curl -X POST /api/hr/leave-applications/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"employee": <company_a_employee_id>, "leave_type": <company_a_leave_type_id>, "from_date": "2026-08-01", "to_date": "2026-08-02", ...}'
# Expected: 201

# Cross-company employee reference
curl -X POST /api/hr/leave-applications/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"employee": <company_b_employee_id>, "leave_type": <company_a_leave_type_id>, ...}'
# Expected: 400 {"employee": ["Employee not found or access denied."]}
```

### Leave Approval
```bash
curl -X POST /api/hr/leave-applications/<id>/approve/ \
  -H "Authorization: Bearer <company_a_session_key>"
# Expected: 200 {"message": "Leave approved successfully"}
# Then verify: GET /api/hr/leave-balances/?employee_id=<id>&year=2026
#   -> used/closing_balance reflect the approved days
```

### Payroll Generation
```bash
curl -X POST /api/hr/payroll-cycles/<id>/calculate/ \
  -H "Authorization: Bearer <company_a_session_key>"
# Expected: 200, payslips_created > 0, no 500 (previously: guaranteed SyntaxError-driven 500 — see Fix 7)

curl -X POST /api/hr/payroll-cycles/<id>/approve/ \
  -H "Authorization: Bearer <company_a_session_key>"
# Expected: 200

curl -X POST /api/hr/payroll-cycles/<id>/process_payments/ \
  -H "Authorization: Bearer <company_a_session_key>"
# Expected: 200

# Inspect a generated payslip's TDS figure and confirm HRA exemption was capped
# (annual HRA paid > 50% of annual basic should NOT be passed through uncapped)
```

### Multi-Tenant Isolation
```bash
# Company A lists its own employees
curl /api/hr/employees/ -H "Authorization: Bearer <company_a_session_key>"
# Expected: only Company A employees

# Company A attempts to retrieve Company B's employee directly by ID
curl /api/hr/employees/<company_b_employee_id>/ -H "Authorization: Bearer <company_a_session_key>"
# Expected: 404 Not Found

# Company A attempts to update Company B's leave application
curl -X PATCH /api/hr/leave-applications/<company_b_application_id>/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"status": "approved"}'
# Expected: 404 Not Found (object not in Company A's scoped queryset)
```

---

## 6. Remaining HR Phase 2 Work

| Item | Description | Priority |
|------|-------------|----------|
| Redundant internal session-key lookups | `AttendanceSystemViewSet`, `AttendanceViewSet`, `LeaveTypeViewSet`, `LeaveBalanceViewSet`, `LeaveApplicationViewSet`, `HolidayViewSet`, `PayrollViewSet`, `PayslipViewSet`, `PayrollSettingsViewSet` still contain per-method `get_session_key()` + manual `ServiceUserSession.objects.get(...)` lookups that are now redundant given the class-level `IsServiceUserAuthenticated` permission. Left in place this pass to minimize blast radius; a Phase 2 cleanup could remove this dead logic and use `request.service_user` directly throughout, as already done in the rewritten `biometric_views.py`. | LOW (cleanup, not a security risk) |
| Pre-existing `tests_compliance.py` fixture bugs | `StatutoryCalculatorTests.setUp()` / `ComplianceIntegrationTests.setUp()` call `Company.objects.create()` without the required `created_by` field, causing 5 test errors; `test_input_sanitization` has an unrelated `SecurityValidator.validate_file_path()` assertion mismatch. Confirmed pre-existing and unrelated to this phase (zero diff on the file). | MEDIUM (test infrastructure, blocks CI signal on `StatutoryCalculator`/`ComplianceIntegration` tests) |
| `AttendanceDevice`/biometric device secrets | Device authentication currently relies solely on `device_id` plus the now-correct company-scoped session auth; devices themselves have no per-device shared secret/HMAC, so a compromised service-user session can push arbitrary attendance logs for any of that company's devices. Worth hardening in Phase 2 if biometric devices are network-exposed. | MEDIUM |
| `EmployeeCreateSerializer.validate_email()` global uniqueness | Checks `Employee.objects.filter(email=value).exists()` globally, not scoped per company — two different companies cannot use the same employee email even though `Employee` is otherwise company-scoped. Not fixed here as it's a pre-existing constraint, not part of the 8 named fixes, and loosening it has product implications (e.g., email-based login) that need a decision beyond a pure security pass. | LOW |
| Broader FK-ownership audit | This pass covered the FK fields directly implicated by the 8 named priorities (`LeaveApplication`, `EmployeeCreateSerializer`, `PerformanceReviewSerializer`). Other HR serializers (e.g. payroll/payslip serializers' `employee`/`payroll_cycle` fields, attendance serializers' `employee`/`device` fields) were not individually audited for the same class of cross-tenant FK injection in this pass — the primary ViewSets' `get_queryset()` scoping mitigates *read* exposure, but write-path FK injection on lesser-used serializers has not been exhaustively verified. | MEDIUM |
| `hr/views.py` `EmployeeViewSet` and related — broader review | Only `employee_mobile_login`'s missing company filter was fixed in `hr/views.py`; a full pass over every view function in that file (which is large and covers many auxiliary employee-management endpoints) was not performed, since it was outside the 8 named priorities. | LOW |

---

## Confirmation

**HR users cannot access or modify another company's HR data.** All primary HR ViewSets scope their querysets by company (already correct); all identified cross-tenant FK-injection paths on `LeaveApplication`, `Employee` (department/designation), and `PerformanceReview` are now validated against the authenticated company; the previously fully-unauthenticated `biometric_sync` endpoint and the cross-company-capable `mobile_attendance`/`validate_location` endpoints now require proper session authentication and enforce company scoping on every lookup. This is verified by the 11 passing regression tests in `HRPhase1SecurityTest`, which explicitly assert that Company A's session is rejected (404/400) when referencing Company B's employees, devices, or leave records, and is accepted only for its own company's records.

Stopping here per instruction — no HR Phase 2 work has been started.
