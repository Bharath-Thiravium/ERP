# HR_ARCHITECTURE_REPORT.md

**Scope:** `backend/hr/` · **Mode:** READ-ONLY (no code modified).

---

## Module Size

| Layer | File | Lines |
|-------|------|------:|
| Main Views (GenericAPIView/function) | `views.py` | 1,072 |
| Models (core) | `models.py` | 952 |
| Attendance Views | `attendance_views.py` | 709 |
| Statutory Views | `statutory_views.py` | 700 |
| Leave Views | `leave_views.py` | 675 |
| Advanced Views | `advanced_views.py` | 664 |
| Payroll Views | `payroll_views.py` | 559 |
| Statutory Calculations | `statutory_calculations.py` | 505 |
| Analytics Views | `analytics_views.py` | 267 |
| Serializers | `serializers.py` | 325 |
| ViewSets (thin) | `viewsets.py` | 315 |
| Supporting modules | `encryption_utils`, `security_utils`, `compliance_engine`, `template_parser`, `form_generators`, `government_integration`, `ai_scoring`, `tasks`, `signals`, … | ~6k |
| **Total** | | **~16,500** |

---

## Architecture Layers

```
URLs (hr/urls.py, hr/public_urls.py)
  → GenericAPIViews / ViewSets (views.py, viewsets.py)       ← proper auth
      EmployeeListCreateView, EmployeeDetailView
      DepartmentListCreateView/Detail, DesignationListCreateView/Detail
      JobPostingListCreateView/Detail, JobApplicationListCreateView/Detail
      HRDashboardViewSet

  → Custom ViewSets (AllowAny + manual session check)         ← ⚠️ auth bypass risk
      PayrollViewSet, PayslipViewSet, PayrollSettingsViewSet  (payroll_views.py)
      AttendanceSystemViewSet, AttendanceViewSet              (attendance_views.py)
      LeaveTypeViewSet, LeaveBalanceViewSet,
      LeaveApplicationViewSet, HolidayViewSet                 (leave_views.py)
      StatutorySettingsViewSet, EmployeeStatutoryDetailsViewSet,
      GovernmentReturnViewSet, ComplianceAlertViewSet         (statutory_views.py)
      ComplianceViewSet, AdvancedAnalyticsViewSet             (advanced_views.py)
      PerformanceViewSet                                      (performance_views.py)

  → Function-based API views (AllowAny + manual session check)
      mobile_attendance, biometric_sync, validate_location    (attendance_views.py)
      hr_analytics_dashboard, attendance_analytics,
      payroll_analytics                                       (analytics_views.py)
      generate_pf_ecr, generate_esi_return, generate_tds_24q (statutory_views.py)

  → Serializers (serializers.py, payroll_serializers.py, statutory_serializers.py, …)
  → Models (models.py, leave_models.py, statutory_models.py, banking_models.py,
            esi_medical_models.py, workflow_models.py, form_automation_models.py,
            interview_models.py, offer_models.py, share_analytics_models.py)
  → Calculations (statutory_calculations.py)
  → External integrations (government_integration.py, real_government_integration.py)
  → Celery tasks (tasks.py)
```

---

## Authentication Architecture — Two Distinct Patterns (Critical Gap)

HR uses **two coexisting auth patterns**. They are NOT equivalent in security:

| Pattern | Files | How It Works | Risk |
|---------|-------|-------------|------|
| **Pattern A — Proper DRF auth** | `views.py`, `viewsets.py` | `authentication_classes=[ServiceUserSessionAuthentication]`, `permission_classes=[IsServiceUserAuthenticated]` | ✅ Centralized, enforced by DRF middleware |
| **Pattern B — Manual session check** | `payroll_views.py`, `attendance_views.py`, `leave_views.py`, `statutory_views.py`, `advanced_views.py`, `performance_views.py`, `analytics_views.py` | `authentication_classes=[]`, `permission_classes=[AllowAny]`; each method calls `get_session_key()` + `ServiceUserSession.objects.get(...)` | ⚠️ No DRF enforcement; if a method forgets to call `get_session_key()`, it is fully open |

Pattern B is applied to **all financial and compliance-sensitive endpoints**: payroll, leave, attendance, statutory returns, government forms. This is the highest-risk surface in the module.

---

## Data Models (all in `models.py` + satellite files)

### Core HR
- **Employee** — 50+ fields; sensitive PII: `aadhar_number`, `pan_number`, `bank_account_number`, `uan_number`, `esi_number`, `face_encoding`, `mobile_app_password`
- **Department** — scoped to `Company`; `unique_together = ['company', 'code']`
- **Designation** — scoped to `Company`; `unique_together = ['company', 'code']`
- **AttendanceSystem** — `OneToOneField(Company)` (per-company config)
- **Attendance** — `unique_together = ['employee', 'date']`; stores GPS coords, face images, biometric IDs
- **AttendanceDevice** — `device_id = models.CharField(unique=True)` (global, not company-scoped)

### Payroll
- **PayrollSettings** — `OneToOneField(Company)` payroll config
- **PayrollCycle** — `unique_together = ['company', 'name']`; draft → calculating → review → approved → processing → completed
- **Payslip** — `unique_together = ['payroll_cycle', 'employee']`; 30+ salary fields; **calls `validate_payment_date()` and `validate_deductions()` in `save()`**
- **SalaryComponent** — `unique_together = ['company', 'code']`
- **PayrollReport** — links cycle to file path (file-path stored as CharField, not FileField)

### Leave
- **LeaveType** — scoped to Company
- **LeaveBalance** — `opening_balance + credited - used = closing_balance`; `calculate_balance()` computes but does **not call `save()`**
- **LeaveApplication** — status machine: pending → approved/rejected/cancelled
- **Holiday** — scoped to Company

### Statutory & Compliance
- `StatutorySettings`, `EmployeeStatutoryDetails`, `GovernmentReturn`, `ComplianceAlert`, `PayslipStatutoryDetails`, `MinimumWageRate`, `LaborLawCompliance` (in `statutory_models.py`)

### Supplementary
- Banking: `BankVerification`, `SalaryPayment`, `DigitalSignature`, `SignedDocument`
- ESI Medical: `ESIMedicalBenefit`
- Recruitment: `JobPosting`, `JobApplication` (with AI scoring), `Interview` models
- Workflow: `EmployeeWorkflowStatus`, `EmployeeProfileCompletion`, `InductionTraining`
- Government Form Automation: `ComplianceFormTemplate`, `MonthlyComplianceForm`, `EmployeeFormEntry`

---

## ⚠️ Critical Model-Level Constraints

| Constraint | Detail | Impact |
|-----------|--------|--------|
| `Employee.employee_id = unique=True` (global) | `models.py:148` — GLOBAL uniqueness, not per-company | Cross-company ID enumeration vector |
| `Employee.email = unique=True` (global) | `models.py:151` — GLOBAL | Cross-company email enumeration vector |
| `Payslip.save()` raises `ValidationError` | `models.py:877-879` — calls `validate_payment_date()` + `validate_deductions()` | All payslip saves fail for pay_date > 10th of month |
| `LeaveBalance.calculate_balance()` does NOT call `save()` | `leave_models.py:55-56` | Leave balance never updated when leave is approved |

---

## Celery Tasks (`tasks.py`)

- `run_ai_scoring_task(application_id)` — scores job applications; uses Python-based heuristics (no ML)
- `process_payroll_cycle(cycle_id)` — bulk payroll calculation
- `send_payslip_emails(cycle_id)` — email payslips
- `generate_monthly_compliance_forms(company_id)` — auto-generates govt forms

---

## Functional Coverage

| Workflow | Status |
|---------|--------|
| Employee Create/Read/Update/Delete | ✅ |
| Department / Designation Management | ✅ |
| Attendance (manual, mobile, biometric, face) | ✅ |
| Leave Management | ✅ (with bugs — see BUG report) |
| Payroll Processing | ✅ (with bugs — see BUG report) |
| Statutory Compliance (PF, ESI, PT, TDS) | ✅ |
| Government Returns (PF ECR, ESI, TDS 24Q) | ✅ |
| Recruitment / Job Postings | ✅ |
| AI Candidate Scoring | ✅ (Python heuristic; no ML at runtime) |
| Performance Reviews | ✅ |
| Employee Offboarding (termination_date/reason) | ✅ (fields only; no formal workflow) |
| Employee Onboarding (workflow models) | ⚠️ (models exist; no dedicated endpoint audit found) |
| HR Reports / Dashboard | ✅ |
| Government Form Generation (Form XIII, etc.) | ✅ |
| Face Recognition Attendance | ✅ (lazy import — disabled if library absent) |
