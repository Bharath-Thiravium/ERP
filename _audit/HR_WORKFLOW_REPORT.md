# HR_WORKFLOW_REPORT.md

**Scope:** `backend/hr/` · **Mode:** READ-ONLY.
**Key:** ✅ correct · ⚠️ risk · ❌ defect/absent
**Cross-references:** B# = bug report · S# = security report.

---

## 1. Employee Management

| Dimension | Status | Note |
|-----------|:---:|------|
| Tenant isolation (reads) | ✅ | `EmployeeListCreateView` / `EmployeeDetailView` filter by `company=session.service_user.company` (views.py:128, 263) |
| Tenant isolation (writes) | ✅ | `create()` injects `company=service_user.company` (views.py:214) |
| Permissions | ✅ | Pattern A: `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated` |
| Department/Designation FK scope | ⚠️ | `EmployeeCreateSerializer` accepts any `department`/`designation` FK without validating they belong to the same company — cross-company FK injection possible |
| Employee `employee_id` uniqueness | ❌ | `unique=True` **globally** (models.py:148) — not per company. Any two companies cannot share a prefix format. Enables cross-tenant enumeration. → S3 |
| Employee `email` uniqueness | ❌ | `unique=True` **globally** (models.py:151) — same problem. → S3 |
| PII in list endpoint | ❌ | `EmployeeListSerializer` includes `aadhar_number`, `pan_number`, `bank_account_number`, `uan_number`, `esi_number` in the LIST response (serializers.py:43-44) → S6 |
| Biometric encoding exposure | ❌ | `EmployeeDetailSerializer` includes `face_encoding` (serializers.py:90) → S5 |
| Debug `print()` in production | ❌ | `views.py:191`: `print(f"DEBUG: Skills value: ...")` in create path → DP4 |
| Audit trail | ✅ | `created_by` FK stored on Employee |
| Soft delete | ❌ | Destroy is a hard delete (views.py:475). No soft-delete or audit log. |

---

## 2. Attendance Management

| Dimension | Status | Note |
|-----------|:---:|------|
| Tenant isolation (reads) | ✅ | `AttendanceViewSet.get_queryset()` filters `employee__company=session.service_user.company` (attendance_views.py:93-95) |
| Mobile check-in company scope | ❌ | `mobile_attendance` looks up employee by `employee_id` WITHOUT company filter (attendance_views.py:300) — any employee from any company can be targeted → S2, B4 |
| Biometric sync authentication | ❌ | `biometric_sync` uses `@authentication_classes([])` + `@permission_classes([AllowAny])` with NO session key check — completely unauthenticated (attendance_views.py:654-709) → S1 |
| `validate_location` geo-fence scoping | ❌ | Picks `AttendanceSystem.objects.filter(...).first()` — any company's geo-fence (attendance_views.py:617) → B5 |
| Face recognition fallback | ⚠️ | If `face_recognition` library not installed, check-in is allowed without face validation (attendance_views.py:476-480) — acceptable for dev but documented here |
| Debug `print()` in mobile check-in | ❌ | `attendance_views.py:284-291` — four `print()` statements log employee ID and file keys to stdout → DP4 |
| Manual entry company scope | ✅ | `manual_entry` uses `Employee.objects.get(id=employee_id, company=session.service_user.company)` (attendance_views.py:195) |
| Attendance method | ✅ | Records `check_in_method`/`check_out_method`; geo-fencing with Haversine |
| Unique constraint | ✅ | `unique_together = ['employee', 'date']` (models.py:546) |

---

## 3. Leave Management

| Dimension | Status | Note |
|-----------|:---:|------|
| Tenant isolation (reads) | ✅ | `LeaveApplicationViewSet.get_queryset()` filters `employee__company=session.service_user.company` (leave_views.py:342) |
| Leave application create — company scope | ❌ | `LeaveApplicationViewSet.create()` calls `serializer.save()` with NO company injection (leave_views.py:607-608). `LeaveApplicationSerializer` uses `fields = '__all__'` — attacker can POST `employee` id from another company → B6 |
| Leave approve — balance persistence | ❌ | `approve()` calls `balance.calculate_balance()` but **never calls `balance.save()`** (leave_views.py:386-388). Balance update is permanently lost → B2 |
| Leave approve — transaction safety | ❌ | `application.save()` and balance update NOT wrapped in `transaction.atomic()` (leave_views.py:370-388). Partial update leaves application approved with stale balance → B3 |
| Leave approve — race condition | ⚠️ | No `select_for_update()` on `LeaveBalance` before `balance.used += days` — two concurrent approvals for same employee/leave type will produce lost update → O3 |
| Leave balance initialization | ✅ | `initialize_balances` correctly scopes to `company` (leave_views.py:249-250) |
| Leave type company scope | ✅ | `LeaveTypeViewSet.get_queryset()` filters by company (leave_views.py:61) |
| Carry-forward logic | ⚠️ | `LeaveType.carry_forward` and `max_carry_forward` fields exist (migration 0010) but no code enforces them at year-end; no year-end carry-forward job found |

---

## 4. Payroll Processing

| Dimension | Status | Note |
|-----------|:---:|------|
| Tenant isolation | ✅ | `PayrollViewSet.get_queryset()` filters `company=session.service_user.company` (payroll_views.py:41) |
| `calculate_payroll` ownership check | ✅ | `self.get_object()` is called which uses the scoped `get_queryset()` — cross-company payroll manipulation blocked (payroll_views.py:137) |
| `approve_payroll` ownership check | ✅ | Same `get_object()` pattern (payroll_views.py:224) |
| Same-user calculate-then-approve | ⚠️ | No segregation of duties: the same service user can calculate and self-approve a payroll cycle without a second reviewer |
| `Payslip.save()` validation timing | ❌ | `validate_payment_date()` raises `django.core.exceptions.ValidationError` in `save()` if `pay_date.day > 10` (models.py:865-869). This will prevent ALL payslip saves for companies whose pay date is after the 10th → B7 |
| Payslip tenant scoping | ✅ | `PayslipViewSet.get_queryset()` filters `employee__company=session.service_user.company` (payroll_views.py:289-291) |
| Payroll analytics money as float | ⚠️ | `payroll_views.py:513`, `analytics_views.py:76-78`: `float(cycle.total_gross)` — rounding risk for dashboard display → O1 |
| Payment processing (mark paid) | ⚠️ | `process_payments` marks all payslips paid with `payment_reference=f'BATCH_{id}_...'` — no actual bank API call; real disbursement is a separate step not tracked |

---

## 5. Salary Calculations

| Dimension | Status | Note |
|-----------|:---:|------|
| PF calculation (ceiling/EPS) | ❌ | **Indentation bug in `calculate_pf()`**: `return {}` is nested inside `if eps_contribution > Decimal('1250'):` (statutory_calculations.py:84). Function returns `None` when EPS ≤ ₹1,250 → B1 |
| ESI calculation | ✅ | Correct ceiling check; attendance-ratio applied |
| Professional Tax — multi-state | ✅ | Maharashtra, Karnataka, West Bengal, Gujarat, Tamil Nadu, Assam supported |
| PT state source | ⚠️ | PT state read from `StatutorySettings.pt_state` (default: Maharashtra) — employee's actual state not considered |
| TDS calculation — regime | ❌ | Uses **old regime slabs** (5%/20%/30%) for FY 2023-24 (statutory_calculations.py:255-279). No new regime option; FY 2024-25 rates not updated → B8 |
| TDS — HRA assumption | ❌ | HRA assumed 25% of gross, basic assumed 50% of gross for TDS calculation (statutory_calculations.py:237-238). Actual payslip values not used → B9 |
| Payslip gross composition | ⚠️ | `calculate_enhanced_payslip` hardcodes conveyance=₹1,600 and medical=₹1,250 regardless of company configuration (statutory_calculations.py:393-394) |

---

## 6. Employee Documents

| Dimension | Status | Note |
|-----------|:---:|------|
| Document model | ⚠️ | `ComplianceFormTemplate`, `MonthlyComplianceForm`, `EmployeeFormEntry` handle govt forms. No general `EmployeeDocument` model for personal docs (offer letter, ID proofs, etc.) |
| Government form generation | ✅ | Form XIII (Register of Workmen) auto-generated from employee data |
| Template parsing | ⚠️ | `template_parser.py` uses `try: import pandas` inside a lazy import — Excel parsing fails silently if pandas unavailable |
| File type validation | ✅ | `ComplianceFormTemplateCreateSerializer.validate_template_file` checks MIME type and size (serializers.py:251-265) |

---

## 7. Employee Onboarding

| Dimension | Status | Note |
|-----------|:---:|------|
| Workflow models | ✅ | `EmployeeWorkflowStatus`, `EmployeeProfileCompletion`, `InductionTraining`, `EmployeeAccessLog` models present |
| Onboarding endpoint | ⚠️ | `workflow/create-employee/` endpoint exists (urls.py:87) but full create-with-workflow flow not audited in scope |
| Mobile app password set | ✅ | `set_mobile_password` hashes password with `make_password` (views.py:986) |
| Credential download — password exposure | ❌ | `download_mobile_credentials` writes `employee.mobile_app_password` (the bcrypt hash) to a plaintext file (views.py:1047) → S8 |

---

## 8. Employee Offboarding

| Dimension | Status | Note |
|-----------|:---:|------|
| Termination fields | ✅ | `termination_date`, `termination_reason`, `status` = 'terminated'/'resigned' fields present (models.py:164-165) |
| Offboarding workflow | ❌ | No dedicated offboarding endpoint or state machine. Setting status='terminated' is a plain field update — no access revocation, PF settlement trigger, or final payroll flag |
| Hard delete | ❌ | Employee delete is a hard `instance.delete()` (views.py:475) — no audit trail, no offboarding checklist trigger |

---

## 9. HR Reports / Dashboard

| Dimension | Status | Note |
|-----------|:---:|------|
| HR dashboard tenant scope | ✅ | `HRDashboardViewSet` (Pattern A auth) scopes all queries to company (views.py:44-68) |
| Analytics dashboard tenant scope | ✅ | `hr_analytics_dashboard` uses session to extract company (analytics_views.py:26-27) |
| 30-day attendance loop | ❌ | 30 individual DB queries in a loop (analytics_views.py:49-61) → O2 |
| Payroll analytics — float money | ⚠️ | `float()` cast on `total_gross`/`total_net` (analytics_views.py:76-78) → O1 |
| Statutory report generation | ✅ | PF ECR, ESI return, TDS 24Q generation functions exist with company scoping |

---

## 10. Government Form Generation

| Dimension | Status | Note |
|-----------|:---:|------|
| Form XIII (Workmen Register) | ✅ | Auto-generates from `Employee` + `EmployeeFormEntry` data |
| PF ECR | ✅ | `generate_pf_ecr` function exists in statutory_views.py |
| ESI return | ✅ | `generate_esi_return` exists |
| TDS 24Q | ✅ | `generate_tds_24q` exists |
| Government portal credentials encryption | ⚠️ | `PORTAL_ENCRYPTION_KEY` auto-generates if not set (encryption_utils.py:18-19) — key is ephemeral and changes on restart, making stored encrypted passwords unrecoverable |
| Portal credentials disk write | ⚠️ | `_save_service_credentials_file()` (referenced in government_integration.py) writes credentials to disk |

---

## Cross-Workflow Summary

| Theme | Verdict |
|-------|---------|
| Employee reads (list/retrieve) | ✅ properly scoped |
| Attendance reads | ✅ properly scoped |
| Mobile attendance writes | ❌ unscoped employee lookup |
| Biometric sync | ❌ completely unauthenticated |
| Leave balance updates | ❌ never saved to DB |
| Leave create — company scope | ❌ unvalidated employee FK |
| Payroll cycle CRUD | ✅ scoped via session |
| Payslip save validation | ❌ blocks companies with pay_date > 10 |
| PF calculation | ❌ indentation bug returns None for EPS ≤ ₹1,250 |
| TDS calculation | ❌ wrong fiscal year slabs; wrong HRA source |
| PII exposure (list endpoint) | ❌ Aadhar/PAN/bank in all list responses |
| Face encoding exposure | ❌ in detail serializer |
| Credential download | ❌ bcrypt hash in plaintext file |
