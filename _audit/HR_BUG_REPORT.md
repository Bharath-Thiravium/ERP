# HR_BUG_REPORT.md

**Scope:** `backend/hr/` · **Mode:** READ-ONLY. Actual defects only.
**Severity:** 🔴 High · 🟠 Medium · 🟡 Low.

---

## B1 — 🔴 `calculate_pf()` indentation bug: returns `None` for all employees with EPS ≤ ₹1,250

**File/Line:** `statutory_calculations.py:68–96`

**Proof:**
```python
def calculate_pf(self, employee, basic_salary, present_days, working_days):
    try:
        ...
        pf_wages = SafeCalculator.safe_multiply(basic_salary, attendance_ratio)
                                               # ← try block ends here (line 67)
    # Apply PF ceiling                         ← OUTSIDE try (8-space indent)
    ceiling_applied = False
    if pf_wages > self.settings.pf_ceiling:
        ...
    employee_pf = ...
    employer_pf = ...
    eps_contribution = ...
    if eps_contribution > Decimal('1250'):
            return {                           ← 12-space indent: INSIDE the if-block
                'employee_pf': employee_pf,
                ...
            }
    except ComplianceError:
        raise
    except Exception as e:
        ...
```

The `return {}` at line 84 has 12-space indentation, placing it **inside** `if eps_contribution > Decimal('1250'):`. When EPS ≤ ₹1,250 (all employees with basic salary ≤ ₹15,000, since EPS cap is 8.33% × ₹15,000 = ₹1,249.50), the function falls through to the `except` handler and **returns `None`**.

**Reproduction:**
1. Create a payroll cycle and trigger `calculate_payroll`.
2. Any employee with `base_salary ≤ ₹15,000` (after attendance ratio) will trigger this path.
3. `calculate_enhanced_payslip` calls `pf_calc = calculator.calculate_pf(...)`.
4. `pf_calc` is `None`.
5. `pf_calc['employee_pf']` at `statutory_calculations.py:444` raises `TypeError: 'NoneType' object is not subscriptable` → **HTTP 500**.

**Business Impact:** Payroll calculation fails for all employees earning ≤ ₹15,000/month. Most factory/labour workers fall in this bracket. Entire payroll run blocked by an indentation error.

---

## B2 — 🔴 Leave balance update is never saved to DB

**File/Line:** `leave_views.py:386–388`

**Proof:**
```python
if not created:
    balance.used += days          # updates in-memory object only
    balance.calculate_balance()   # sets closing_balance in-memory only
                                  # ← NO balance.save() call
return Response({'message': 'Leave approved successfully'})
```

`LeaveBalance.calculate_balance()` defined in `leave_models.py:55-56`:
```python
def calculate_balance(self):
    self.closing_balance = self.opening_balance + self.credited - self.used
    # ← no self.save()
```

**Reproduction:**
1. Employee applies for 2 days leave. HR approves via `POST /api/hr/leave-applications/{id}/approve/`.
2. Response: `"Leave approved successfully"`.
3. Query `LeaveBalance` for that employee — `used` still = 0, `closing_balance` unchanged.
4. Approve another leave. Same result — balance never decremented.

**Business Impact:** Leave balance never decreases after approvals. Employees effectively have unlimited leave. Leave reports are inaccurate. Year-end compliance reporting will show zero leave utilized.

---

## B3 — 🟠 Leave approve has no `transaction.atomic()` — partial failures leave data inconsistent

**File/Line:** `leave_views.py:370–390`

**Proof:**
```python
application.status = 'approved'
application.approved_date = timezone.now()
application.save()                          # ← committed here

days = Decimal(str(application.total_days))
balance, created = LeaveBalance.objects.get_or_create(...)  # ← could fail here
if not created:
    balance.used += days
    balance.calculate_balance()
    # Missing balance.save() AND missing transaction
```

If `get_or_create` fails (DB error, integrity error), the `application` is already committed as 'approved' but the balance update is never attempted. The leave application shows approved but the balance reflects the wrong state.

**Business Impact:** Data inconsistency if any error occurs mid-approval. Leave status says approved, balance says otherwise.

---

## B4 — 🔴 `mobile_attendance` looks up employee across ALL companies — no company filter

**File/Line:** `attendance_views.py:300`

**Proof:**
```python
employee = Employee.objects.get(employee_id=data['employee_id'])
#                              ^^^^^^^^^^^ NO company= filter
```

The `mobile_attendance` endpoint (`POST /api/hr/attendance/mobile/`) is `@authentication_classes([])` + `@permission_classes([AllowAny])`. It authenticates by employee_id alone — any employee from any company.

**Reproduction:**
1. Obtain employee_id from any company (IDs follow predictable prefix patterns).
2. POST to `/api/hr/attendance/mobile/` with `{"employee_id": "OTHER_COMPANY_EMP_ID", "action": "checkin", ...}`.
3. Response: check-in recorded for another company's employee.
4. That company's payroll calculation will use the injected attendance.

**Business Impact:** Cross-tenant attendance injection. Attacker can alter any employee's attendance records across all companies, corrupting payroll calculations and leave-attendance conflicts.

---

## B5 — 🟠 `validate_location` picks any company's geo-fence

**File/Line:** `attendance_views.py:617`

**Proof:**
```python
attendance_systems = AttendanceSystem.objects.filter(
    enable_geo_fencing=True,
    office_latitude__isnull=False,
    office_longitude__isnull=False
).first()           # ← returns first matching company in DB, not the caller's company
```

**Reproduction:**
1. Company A has no geo-fence configured.
2. Company B has a geo-fence around Mumbai.
3. Employee from Company A calls `POST /api/hr/attendance/validate-location/`.
4. The endpoint returns Mumbai geo-fence validation — wrong company's office.

**Business Impact:** Wrong geo-fence applied to location validation. Employees either falsely allowed or rejected based on another company's office location.

---

## B6 — 🟠 Leave application `create()` does not validate employee belongs to session's company

**File/Line:** `leave_views.py:599–611`

**Proof:**
```python
def create(self, request, *args, **kwargs):
    ...
    serializer = self.get_serializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save()       # ← no company= injection, no employee ownership check
```

`LeaveApplicationSerializer` uses `fields = '__all__'` (leave_views.py:38), so the client controls the `employee` FK field. No validation that `employee` belongs to the session's company.

**Reproduction:**
1. Obtain an employee `id` from another company (any integer enumeration of `/api/hr/employees/` for that company).
2. POST `{"employee": <CROSS_COMPANY_EMP_ID>, "leave_type": <any_id>, "from_date": "...", ...}` to `/api/hr/leave-applications/`.
3. Leave application created for the foreign employee.

**Business Impact:** Cross-company leave manipulation. HR of Company A can approve/create leave for Company B employees.

---

## B7 — 🔴 `Payslip.save()` raises `ValidationError` for any pay_date after the 10th

**File/Line:** `models.py:865–879`

**Proof:**
```python
def validate_payment_date(self):
    from django.core.exceptions import ValidationError
    if self.payroll_cycle.pay_date.day > 10:
        raise ValidationError("Salary must be paid by 10th of month...")

def save(self, *args, **kwargs):
    self.validate_payment_date()    # ← called on EVERY save including update_fields
    self.validate_deductions()
    super().save(*args, **kwargs)
```

Every call to `payslip.save()` — including `payslip.save(update_fields=['skills'])` — calls `validate_payment_date()`. The `validate_deductions()` method similarly raises if `total_deductions > gross_salary * 0.5`.

**Reproduction:**
1. Create a `PayrollCycle` with `pay_date = 2026-06-15` (day=15 > 10).
2. Trigger `calculate_payroll`.
3. Inside `calculate_enhanced_payslip`, `payslip.save()` raises `ValidationError` → entire payroll calculation fails with 500.

**Business Impact:** Payroll processing is impossible for any company whose salary date is after the 10th of the month. Many Indian companies pay on the 25th or last day of the month.

---

## B8 — 🟠 TDS calculation uses FY 2023-24 slabs with no new-regime option

**File/Line:** `statutory_calculations.py:231, 255–279`

**Proof:**
```python
# Standard deduction (₹50,000 for FY 2023-24)
standard_deduction = Decimal('50000')
...
# Calculate tax as per current slabs (FY 2023-24)
```

The slabs coded are the old-regime FY 2023-24 slabs:
- 5% for ₹2.5L–₹5L
- 20% for ₹5L–₹10L
- 30% above ₹10L

**Problems:**
1. FY 2024-25 old regime: different rebate u/s 87A (₹25,000 rebate for income ≤ ₹7L).
2. New regime (FY 2024-25 default): slabs at 5%/10%/15%/20%/25%/30%; standard deduction ₹75,000; ₹60,000 rebate for income ≤ ₹12L.
3. No mechanism to select old vs new regime per employee.

**Business Impact:** Incorrect TDS deducted. Under new regime, employees with income ≤ ₹12L should pay zero tax (rebate). Wrong TDS = wrong Form 16 = employee tax filing issues = company compliance notices.

---

## B9 — 🟠 TDS HRA exemption calculated from hardcoded assumptions, not actual payslip values

**File/Line:** `statutory_calculations.py:237–246`

**Proof:**
```python
# Calculate HRA exemption (simplified)
annual_basic = annual_gross * Decimal('0.5')  # Assumes 50% of gross is basic
annual_hra = annual_gross * Decimal('0.25')   # Assumes 25% of gross is HRA
metro_exemption = annual_basic * Decimal('0.5')
hra_exemption = min(annual_hra, metro_exemption)
```

The actual `payslip.basic_salary` and `payslip.hra` are already calculated by `calculate_enhanced_payslip()`. Instead of using them, the TDS calculator re-derives them from gross with fixed percentages.

**Business Impact:** HRA exemption is wrong for any employee whose actual HRA/basic ratio differs from 50%/25%. Overstated exemption = underpaid TDS = tax demand + penalties. Understated exemption = excess TDS deducted from employees.

---

## B10 — 🟡 `employee_id` and `email` are globally unique, not per-company

**File/Line:** `models.py:148, 151`

**Proof:**
```python
employee_id = models.CharField(max_length=20, unique=True)  # :148
email = models.EmailField(validators=[EmailValidator()], unique=True)  # :151
```

`unique_together = ['company', 'employee_id']` exists (models.py:264) for the combination, but the field-level `unique=True` on `employee_id` is a stricter, global constraint. Two different companies cannot have employees with the same `employee_id` or `email`.

**Business Impact:**
- Companies cannot reuse standard employee ID formats (EMP-000001 appears in all companies through auto-generate fallback).
- A second company's employee cannot have the same email as a first company's employee — legitimate business scenario (freelancer working at two companies).
- The fallback `employee_id` generator always starts at `EMP-000001` which will immediately fail for the second company.

---

## B11 — 🟡 Debug `print()` statements in production request paths

**File/Line:** `attendance_views.py:284–291`; `views.py:191`

**Proof:**
```python
# attendance_views.py:284-291
print(f"🔍 Mobile attendance request data keys: {list(request.data.keys())}")
print(f"🔍 Request FILES keys: {list(request.FILES.keys())}")
print(f"🔍 Employee ID: {request.data.get('employee_id')}")
print(f"🔍 Action: {request.data.get('action')}")
...
print(f"❌ Serializer errors: {serializer.errors}")

# views.py:191
print(f"DEBUG: Skills value: '{skills_value}', type: {type(skills_value)}")
```

**Business Impact:** Employee IDs and action types logged to stdout/access logs on every mobile attendance call. PII in application logs.

---

## Severity Roll-Up

| Severity | Items |
|----------|-------|
| 🔴 High | B1 (PF calc returns None → 500), B2 (leave balance never saved), B4 (cross-company mobile attendance), B7 (Payslip.save blocks payroll) |
| 🟠 Medium | B3 (leave approve not atomic), B5 (wrong geo-fence), B6 (leave create unscoped), B8 (wrong TDS slabs), B9 (wrong HRA for TDS) |
| 🟡 Low | B10 (global unique employee_id/email), B11 (print() in production) |

## Audit Commands

```bash
cd backend/hr

# B1 — PF calculation indentation bug
grep -n "return {" statutory_calculations.py | head -5

# B2 — Missing balance.save()
grep -n "balance.save\|calculate_balance" leave_views.py

# B4 — Unscoped employee lookup
grep -n "Employee.objects.get(employee_id" attendance_views.py

# B6 — Leave create no company injection
grep -n "serializer.save()" leave_views.py

# B7 — Payslip.save() validation
grep -n "validate_payment_date\|pay_date.day" models.py

# B8/B9 — TDS hardcoding
grep -n "FY 20\|annual_basic.*0.5\|annual_hra.*0.25" statutory_calculations.py

# B10 — Global unique
grep -n "unique=True" models.py | head -5
```
