# HR Module — Complete Blueprint
**Project:** SAP-Python  
**Base URL:** `https://sap.athenas.co.in/api/hr/`  
**Authentication:** All endpoints require `session_key` — pass as `Authorization: Bearer <key>` header or `?session_key=<key>` query param.

---

## Architecture Overview

```
hr/
├── models.py                  — Core HR models (Employee, Department, Designation, JobPosting, JobApplication)
├── leave_models.py            — Leave management (LeaveType, LeaveBalance, LeaveApplication, Holiday)
├── interview_models.py        — Interview pipeline (Interview, InterviewFeedback)
├── offer_models.py            — Offer management (JobOffer, OfferTemplate)
├── workflow_models.py         — Employee onboarding workflow
├── statutory_models.py        — Statutory compliance (PF, ESI, PT, TDS)
├── banking_models.py          — Employee banking details
├── esi_medical_models.py      — ESI medical claim models
├── form_automation_models.py  — Compliance form automation
├── share_analytics_models.py  — Job share analytics
├── views.py                   — Employee, Department, Designation, JobPosting, JobApplication views
├── leave_views.py             — Leave management views
├── payroll_views.py           — Payroll processing views
├── attendance_views.py        — Attendance tracking views
├── performance_views.py       — Performance review views
├── interview_views.py         — Interview management views
├── offer_views.py             — Job offer views
├── workflow_views.py          — Employee workflow views
├── statutory_views.py         — Statutory compliance views
├── analytics_views.py         — HR analytics views
├── advanced_views.py          — Compliance & advanced features
├── form_automation_views.py   — Automated compliance form generation
├── government_views.py        — Government portal integration
├── security_utils.py          — Input validation & sanitization
└── urls.py                    — URL routing
```

### Tenant Isolation
Every model has a `company` FK (directly or via `Employee.company`). Session key is extracted from `Authorization: Bearer` header or `?session_key` query param. All queries are filtered by `session.service_user.company`.

---

## Data Models

### Employee
| Field | Type | Notes |
|---|---|---|
| employee_id | CharField | Auto-generated |
| first_name, last_name | CharField(100) | Required |
| email | EmailField | Required, unique per company |
| phone | CharField(20) | Optional |
| date_of_birth | DateField | Optional |
| gender | CharField | male / female / other |
| address | TextField | Optional |
| department | FK → Department | Optional |
| designation | FK → Designation | Optional |
| date_of_joining | DateField | Required |
| employment_type | CharField | full_time / part_time / contract / intern |
| status | CharField | active / inactive / terminated |
| salary | DecimalField(12,2) | Optional |
| bank_account | CharField | Optional |
| pan_number | CharField | Optional |
| aadhar_number | CharField | Optional (encrypted) |
| pf_number | CharField | Optional |
| esi_number | CharField | Optional |
| skills | JSONField | Default: [] |
| termination_date | DateField | Optional |

**Computed:** `full_name` = first_name + last_name

### Department
| Field | Type | Notes |
|---|---|---|
| name | CharField(100) | Required |
| code | CharField(20) | Auto-generated |
| description | TextField | Optional |
| parent | FK → Department | Optional (hierarchy) |
| head | FK → Employee | Optional |

### Designation
| Field | Type | Notes |
|---|---|---|
| name | CharField(100) | Required |
| code | CharField(20) | Auto-generated |
| department | FK → Department | Optional |
| level | IntegerField | Seniority level |
| description | TextField | Optional |

### JobPosting
| Field | Type | Notes |
|---|---|---|
| title | CharField(200) | Required |
| department | FK → Department | Optional |
| designation | FK → Designation | Optional |
| description | TextField | Required |
| requirements | TextField | Optional |
| employment_type | CharField | full_time / part_time / contract / intern |
| location | CharField | Optional |
| salary_min, salary_max | DecimalField | Optional |
| openings | IntegerField | Default: 1 |
| status | CharField | draft / published / closed / on_hold |
| application_deadline | DateField | Optional |
| is_public | BooleanField | Default: True (visible on public portal) |

### JobApplication
| Field | Type | Notes |
|---|---|---|
| job_posting | FK → JobPosting | Required |
| first_name, last_name | CharField | Required |
| email | EmailField | Required |
| phone | CharField | Optional |
| resume | FileField | Optional |
| cover_letter | TextField | Optional |
| status | CharField | applied / screening / interview / offer / hired / rejected |
| source | CharField | website / referral / linkedin / naukri / other |
| certifications | JSONField | Default: [] |
| skills | JSONField | Default: [] |
| interviewer | FK → Employee | Optional |

---

## Leave Management Models

### LeaveType
| Field | Type | Notes |
|---|---|---|
| name | CharField(100) | Required |
| code | CharField(20) | Required — unique per company |
| category | CharField | earned / casual / sick / maternity / paternity / compensatory / unpaid |
| days_per_year | DecimalField(5,2) | Required |
| carry_forward | BooleanField | Default: False |
| max_carry_forward | DecimalField(5,2) | Default: 0 |
| is_paid | BooleanField | Default: True |
| requires_approval | BooleanField | Default: True |
| min_days_notice | IntegerField | Default: 0 |
| is_active | BooleanField | Default: True |

**Constraint:** `unique_together = ['company', 'code']`

### LeaveBalance
| Field | Type | Notes |
|---|---|---|
| employee | FK → Employee | Required |
| leave_type | FK → LeaveType | Required |
| year | IntegerField | Required |
| opening_balance | DecimalField(5,2) | Default: 0 |
| credited | DecimalField(5,2) | Default: 0 |
| used | DecimalField(5,2) | Default: 0 |
| closing_balance | DecimalField(5,2) | Computed: opening + credited - used |

**Constraint:** `unique_together = ['employee', 'leave_type', 'year']`

### LeaveApplication
| Field | Type | Notes |
|---|---|---|
| employee | FK → Employee | Required |
| leave_type | FK → LeaveType | Required |
| from_date | DateField | Required |
| to_date | DateField | Required |
| total_days | DecimalField(5,2) | Required |
| reason | TextField | Required |
| status | CharField | pending / approved / rejected / cancelled |
| approved_by | FK → Employee | Optional |
| approved_date | DateTimeField | Optional |
| rejection_reason | TextField | Optional |

### Holiday
| Field | Type | Notes |
|---|---|---|
| name | CharField(200) | Required |
| date | DateField | Required |
| holiday_type | CharField | national / regional / optional / company |
| is_mandatory | BooleanField | Default: True |
| description | TextField | Optional |
| applicable_states | JSONField | Default: [] |

**Constraint:** `unique_together = ['company', 'date', 'name']`

---

## Payroll Models

### PayrollSettings
| Field | Type | Notes |
|---|---|---|
| pay_cycle | CharField | monthly / bi_weekly / weekly |
| pay_day | IntegerField | Day of month for payment |
| pf_enabled | BooleanField | Provident Fund |
| esi_enabled | BooleanField | Employee State Insurance |
| pt_enabled | BooleanField | Professional Tax |
| tds_enabled | BooleanField | Tax Deducted at Source |
| pf_employee_rate | DecimalField | Default: 12% |
| pf_employer_rate | DecimalField | Default: 12% |
| esi_employee_rate | DecimalField | Default: 0.75% |
| esi_employer_rate | DecimalField | Default: 3.25% |

### Payroll (Payslip)
| Field | Type | Notes |
|---|---|---|
| employee | FK → Employee | Required |
| month, year | IntegerField | Required |
| basic_salary | DecimalField | Required |
| hra | DecimalField | House Rent Allowance |
| special_allowance | DecimalField | |
| other_allowances | DecimalField | |
| gross_salary | DecimalField | Computed |
| pf_deduction | DecimalField | |
| esi_deduction | DecimalField | |
| pt_deduction | DecimalField | |
| tds_deduction | DecimalField | |
| other_deductions | DecimalField | |
| total_deductions | DecimalField | Computed |
| net_salary | DecimalField | gross - deductions |
| status | CharField | draft / processed / paid |
| payment_date | DateField | Optional |

---

## Attendance Models

### AttendanceRecord
| Field | Type | Notes |
|---|---|---|
| employee | FK → Employee | Required |
| date | DateField | Required |
| check_in | DateTimeField | Optional |
| check_out | DateTimeField | Optional |
| check_in_location | JSONField | GPS coordinates |
| check_out_location | JSONField | GPS coordinates |
| check_in_face_image | ImageField | Optional (biometric) |
| status | CharField | present / absent / half_day / late / on_leave / holiday |
| working_hours | DecimalField | Computed |
| overtime_hours | DecimalField | Computed |
| notes | TextField | Optional |

**Constraint:** `unique_together = ['employee', 'date']`

---

## Statutory Compliance Models

### StatutorySettings
Per-company configuration for PF, ESI, PT, TDS rates and applicability.

### PFRecord
Monthly PF contribution records per employee.

### ESIRecord
Monthly ESI contribution records per employee.

### PTRecord
Monthly Professional Tax records per employee.

### TDSRecord
Annual TDS computation and quarterly filing records.

---

## API Endpoints

### Employee Management

#### Employees
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/employees/` | List all employees (company-scoped) |
| POST | `/api/hr/employees/` | Create employee |
| GET | `/api/hr/employees/{id}/` | Retrieve employee |
| PUT/PATCH | `/api/hr/employees/{id}/` | Update employee |
| DELETE | `/api/hr/employees/{id}/` | Delete employee |

**Filters:** `status`, `department`, `designation`, `employment_type`  
**Search:** `first_name`, `last_name`, `email`, `employee_id`

**Create payload:**
```json
{
  "first_name": "Ravi",
  "last_name": "Kumar",
  "email": "ravi@company.com",
  "phone": "+919876543210",
  "department": 1,
  "designation": 2,
  "date_of_joining": "2026-01-01",
  "employment_type": "full_time",
  "salary": "45000.00"
}
```

#### Departments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/departments/` | List departments |
| POST | `/api/hr/departments/` | Create department |
| GET/PUT/PATCH/DELETE | `/api/hr/departments/{id}/` | CRUD |
| GET | `/api/hr/dropdown/departments/` | Lightweight list for dropdowns |

#### Designations
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/designations/` | List designations |
| POST | `/api/hr/designations/` | Create designation |
| GET/PUT/PATCH/DELETE | `/api/hr/designations/{id}/` | CRUD |
| GET | `/api/hr/dropdown/designations/` | Lightweight list for dropdowns |

---

### Leave Management

#### Leave Types — `/api/hr/leave-types/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/leave-types/` | List leave types |
| POST | `/api/hr/leave-types/` | Create leave type |
| GET/PUT/PATCH/DELETE | `/api/hr/leave-types/{id}/` | CRUD |
| POST | `/api/hr/leave-types/{id}/toggle_active/` | Toggle active/inactive status |

**Create payload:**
```json
{
  "name": "Casual Leave",
  "code": "CL",
  "category": "casual",
  "days_per_year": 12,
  "carry_forward": false,
  "is_paid": true,
  "requires_approval": true,
  "min_days_notice": 1
}
```

**Duplicate protection:** Returns `{"error": "Leave type with code \"CL\" already exists."}` (HTTP 400) instead of 500.

**Toggle active response:**
```json
{"id": 3, "is_active": false}
```

#### Leave Balances — `/api/hr/leave-balances/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/leave-balances/` | List balances |
| GET | `/api/hr/leave-balances/?year=2026` | Filter by year |
| GET | `/api/hr/leave-balances/?employee=5` | Filter by employee |
| GET | `/api/hr/leave-balances/?export=csv` | Export as CSV |
| POST | `/api/hr/leave-balances/initialize/` | Initialize balances for all active employees |
| POST | `/api/hr/leave-balances/recalculate/` | Recalculate balances from approved leaves |

**Initialize payload:**
```json
{"year": 2026}
```
**Response:** `{"message": "Initialized 42 leave balance records", "year": 2026}`

**Recalculate payload:**
```json
{"year": 2026}
```
**Response:** `{"message": "Recalculated 18 leave balance records", "year": 2026}`

#### Leave Applications — `/api/hr/leave-applications/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/leave-applications/` | List applications |
| POST | `/api/hr/leave-applications/` | Submit leave application |
| GET/PUT/PATCH/DELETE | `/api/hr/leave-applications/{id}/` | CRUD |
| POST | `/api/hr/leave-applications/{id}/approve/` | Approve leave + update balance |
| POST | `/api/hr/leave-applications/{id}/reject/` | Reject leave `{"reason": "..."}` |
| GET | `/api/hr/leave-applications/?stats=1` | Statistics summary |
| GET | `/api/hr/leave-applications/?year=2026&month=3` | Calendar view (span-aware) |
| GET | `/api/hr/leave-applications/?export=csv` | Export CSV |
| GET | `/api/hr/leave-applications/?export=excel` | Export Excel (.xlsx) |
| GET | `/api/hr/leave-applications/?export=pdf` | Export PDF |

**Query parameters:**
| Param | Values | Description |
|---|---|---|
| year | YYYY | Filter by year |
| month | 1-12 | Filter by month (includes leaves spanning into month) |
| status | pending / approved / rejected / cancelled | Filter by status |
| employee | integer ID | Filter by employee |
| export | csv / excel / pdf | Download report |
| stats | 1 | Return statistics instead of list |

**Calendar month query** (`?year=2026&month=3`):  
Returns all leaves where `from_date <= 2026-03-31 AND to_date >= 2026-03-01` — correctly includes multi-month leaves.

**Statistics response:**
```json
{
  "total_applications": 45,
  "approved_applications": 30,
  "pending_applications": 10,
  "rejected_applications": 5,
  "total_leave_days": 87.5,
  "most_used_leave_type": "Casual Leave",
  "department_wise_stats": [...],
  "monthly_trends": [...]
}
```

**Approve response:**
```json
{"message": "Leave approved successfully"}
```
Approval atomically updates `LeaveBalance.used` and recalculates `closing_balance`. Uses `get_or_create` to handle missing balance records.

**Export formats:**
- CSV: `text/csv`, columns: Employee, Leave Type, From Date, To Date, Days, Status, Reason
- Excel: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (openpyxl)
- PDF: `application/pdf`, landscape A4 with styled table (reportlab)

#### Holidays — `/api/hr/holidays/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/holidays/` | List holidays |
| POST | `/api/hr/holidays/` | Create holiday |
| GET/PUT/PATCH/DELETE | `/api/hr/holidays/{id}/` | CRUD |
| GET | `/api/hr/holidays/?year=2026` | Filter by year |

---

### Payroll

#### Payroll — `/api/hr/payroll/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/payroll/` | List payroll records |
| POST | `/api/hr/payroll/` | Generate payroll |
| GET/PUT/PATCH/DELETE | `/api/hr/payroll/{id}/` | CRUD |
| POST | `/api/hr/payroll/{id}/process/` | Process payroll |
| POST | `/api/hr/payroll/{id}/mark_paid/` | Mark as paid |
| GET | `/api/hr/payroll/analytics/` | Payroll analytics |
| GET | `/api/hr/payroll/analytics/` | Detailed payroll analytics (alternate path) |

#### Payslips — `/api/hr/payslips/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/payslips/` | List payslips |
| GET | `/api/hr/payslips/{id}/` | Retrieve payslip |
| GET | `/api/hr/payslips/{id}/download/` | Download PDF payslip |

#### Payroll Settings — `/api/hr/payroll-settings/`
Standard CRUD for company payroll configuration.

---

### Attendance

#### Attendance — `/api/hr/attendance/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/attendance/` | List attendance records |
| POST | `/api/hr/attendance/` | Create attendance record |
| GET/PUT/PATCH/DELETE | `/api/hr/attendance/{id}/` | CRUD |
| GET | `/api/hr/attendance/dashboard_stats/` | Attendance dashboard stats |
| GET | `/api/hr/attendance-dashboard-stats/` | Alias for dashboard stats |

#### Special Attendance Endpoints
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/hr/attendance/mobile/` | Mobile check-in/check-out with GPS |
| POST | `/api/hr/attendance/biometric-sync/` | Sync biometric device data |
| POST | `/api/hr/attendance/validate-location/` | Validate GPS location for check-in |

#### Attendance System — `/api/hr/attendance-system/`
Configuration for attendance rules (shift timings, grace period, overtime rules).

---

### Performance Management

#### Performance — `/api/hr/performance/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/performance/` | List performance reviews |
| POST | `/api/hr/performance/` | Create review |
| GET/PUT/PATCH/DELETE | `/api/hr/performance/{id}/` | CRUD |
| POST | `/api/hr/performance/{id}/submit/` | Submit review |
| POST | `/api/hr/performance/{id}/approve/` | Approve review |

---

### Recruitment

#### Job Postings — `/api/hr/job-postings/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/job-postings/` | List job postings |
| POST | `/api/hr/job-postings/` | Create posting |
| GET/PUT/PATCH/DELETE | `/api/hr/job-postings/{id}/` | CRUD |

#### Job Applications — `/api/hr/job-applications/`
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/job-applications/` | List applications |
| POST | `/api/hr/job-applications/` | Submit application |
| GET/PUT/PATCH/DELETE | `/api/hr/job-applications/{id}/` | CRUD |

#### Public Job Portal (No Auth Required)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/public/jobs/` | List published jobs |
| GET | `/api/hr/public/jobs/{id}/` | Job detail |
| POST | `/api/hr/public/jobs/{job_id}/apply/` | Submit application |

---

### Employee Workflow

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/hr/workflow/create-employee/` | Create employee with full onboarding workflow |
| POST | `/api/hr/workflow/reset-password/` | Reset employee mobile app password |
| GET | `/api/hr/workflow/status/` | Get employee workflow status |

---

### Mobile App Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/hr/employee-login/` | Employee mobile app login |
| POST | `/api/hr/set-mobile-password/` | Set/change mobile password |
| GET | `/api/hr/download-mobile-credentials/` | Download credential sheet |

---

### Statutory Compliance

#### Statutory Settings — `/api/hr/statutory-settings/`
Standard CRUD for PF/ESI/PT/TDS configuration.

#### Statutory Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/statutory/dashboard/` | Compliance status overview |
| POST | `/api/hr/statutory/generate-pf-ecr/` | Generate PF ECR file |
| POST | `/api/hr/statutory/generate-esi-return/` | Generate ESI return |
| POST | `/api/hr/statutory/generate-pt-return/` | Generate PT return |
| POST | `/api/hr/statutory/generate-tds-24q/` | Generate TDS 24Q |
| POST | `/api/hr/statutory/validate-compliance/` | Validate all compliance |

---

### HR Analytics

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/hr/analytics/dashboard/` | HR analytics dashboard |
| GET | `/api/hr/analytics/attendance/` | Attendance analytics |
| GET | `/api/hr/analytics/payroll/` | Payroll analytics |

---

### Compliance & Advanced Features

#### Compliance — `/api/hr/compliance/`
Standard CRUD for compliance records and tracking.

#### Form Automation
Automated generation of statutory compliance forms (Form 16, Form 12BB, etc.) based on schedules.

#### Government Portal Integration
Integration with EPFO, ESIC, and other government portals for direct filing.

---

## Security Layer

All inputs pass through `SecurityValidator` in `security_utils.py`:

| Validator | Description |
|---|---|
| `validate_sql_injection(value)` | Blocks SQL keywords and comment sequences |
| `validate_xss(value)` | Blocks script tags and event handlers |
| `validate_email_format(email)` | Django email validator |
| `validate_phone_number(phone)` | 10-15 digit format |
| `validate_year_param(year)` | Must be 2000-2100 |
| `validate_month_param(month)` | Must be 1-12 |
| `sanitize_filename(name)` | Strips path traversal characters |

---

## Known Issues Fixed (as of 2026-03-23)

| Issue | Root Cause | Fix |
|---|---|---|
| Duplicate leave type → 500 | `serializer.is_valid(raise_exception=True)` let `unique_together` DB constraint bubble up unhandled | Pre-check for duplicate code, return 400 with clear message |
| No Active/Inactive toggle | Missing `toggle_active` action | Added `POST /api/hr/leave-types/{id}/toggle_active/` |
| `POST /initialize/` → 405 | Action named `initialize_balances` so router generated URL `/initialize_balances/` | Added `url_path='initialize'` to `@action` decorator |
| `POST /recalculate/` → 405 | Same as above — action named `recalculate_balances` | Added `url_path='recalculate'` to `@action` decorator |
| Approve → 500 `UnboundLocalError` | `from decimal import Decimal` inside `try` block, used in `except` handler — Python scoping made it unbound | Moved `from decimal import Decimal` to module top-level; replaced try/except with `get_or_create` |
| Calendar month-spanning leaves empty | Filter `from_date__month=month` only returned leaves starting in that month | Changed to `from_date__lte=month_end, to_date__gte=month_start` to catch all overlapping leaves |
| Export PDF/Excel → "not supported" | `export_data()` only handled `csv` | Added full `openpyxl` Excel and `reportlab` PDF implementations |

---

## Data Flow: Leave Approval

```
POST /api/hr/leave-applications/{id}/approve/
        │
        ▼
1. Validate session key
2. Check if already approved (idempotent)
3. Set status = 'approved', approved_date = now()
4. Save application
5. Decimal(total_days) computed at module level (no scoping issue)
6. LeaveBalance.get_or_create(employee, leave_type, year)
   ├── If created: set credited = days_per_year, used = total_days
   └── If exists:  balance.used += total_days → calculate_balance()
7. calculate_balance(): closing = opening + credited - used → save()
8. Return {"message": "Leave approved successfully"}
```

## Data Flow: Leave Calendar

```
GET /api/hr/leave-applications/?year=2026&month=3
        │
        ▼
1. Validate session key
2. Compute month_start = 2026-03-01, month_end = 2026-03-31
3. Query: from_date <= 2026-03-31 AND to_date >= 2026-03-01
   (catches: leaves starting in Feb ending in March,
             leaves starting in March ending in April,
             leaves spanning the entire month)
4. Apply status/employee filters if provided
5. Return serialized results
```

## Data Flow: Leave Balance Initialization

```
POST /api/hr/leave-balances/initialize/  {"year": 2026}
        │
        ▼
1. Validate session key
2. Get all active employees for company
3. Get all active leave types for company
4. For each employee × leave_type combination:
   LeaveBalance.get_or_create(
     employee, leave_type, year=2026,
     defaults={opening_balance: 0, credited: days_per_year, used: 0, closing_balance: days_per_year}
   )
5. Count only newly created records
6. Return {"message": "Initialized N leave balance records", "year": 2026}
```
