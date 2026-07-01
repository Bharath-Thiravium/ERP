# HR_OPTIMIZATION_REPORT.md

**Scope:** `backend/hr/` · **Mode:** READ-ONLY.
**Focus:** performance, correctness, data integrity, code quality.
**Severity:** 🔴 High (correctness/crash) · 🟠 Medium (performance/data) · 🟡 Low (quality).

---

## O1 — 🔴 Monetary values cast to `float()` in payroll analytics — Decimal precision lost

**File/Line:** `analytics_views.py:76–78`; `payroll_views.py:513`

**Proof:**
```python
# analytics_views.py:76-78
'total_gross': float(cycle.total_gross or 0),
'total_net': float(cycle.total_net or 0),
'total_deductions': float(cycle.total_deductions or 0),

# payroll_views.py:513
total_payroll = sum(float(p.net_salary or 0) for p in payslips)
```

`total_gross`, `total_net`, `total_deductions`, `net_salary` are `DecimalField` columns. Converting them to `float` introduces floating-point rounding errors. Python's `float` only has 53 bits of mantissa (about 15-16 significant digits). For payroll amounts ≥ ₹1 crore (7 digits), the rounding can cause ₹0.01–₹1 discrepancies per payslip which accumulate in summaries.

**Business Impact:** Payroll dashboard totals do not match actual payslip Decimal sums. CFO-level reports have numeric drift.

**Remediation:** Return Decimal as string: `str(cycle.total_gross)`. JSON serialization of `Decimal` to string is handled by `DecimalField` serializers automatically. Or use `DjangoJSONEncoder`.

---

## O2 — 🟠 Attendance analytics runs 30 sequential DB queries in a Python loop

**File/Line:** `analytics_views.py:49–61`

**Proof:**
```python
for i in range(30):
    date = end_date - timedelta(days=i)
    count = Attendance.objects.filter(
        employee__company=company,
        date=date,
        is_present=True
    ).count()             # ← 1 query per day = 30 queries total
    attendance_trend.append({'date': str(date), 'count': count})
```

**Reproduction:** Call `GET /api/hr/analytics/dashboard/` with Django debug logging enabled — 30+ queries logged for the attendance_trend section alone.

**Impact:** 30 round-trips to the DB on every dashboard load. Under concurrent users this can spike DB connection pool usage and increase page load time significantly.

**Remediation:**
```python
# Replace the loop with a single aggregation
from django.db.models import Count
attendance_qs = Attendance.objects.filter(
    employee__company=company,
    date__gte=start_date,
    date__lte=end_date,
    is_present=True
).values('date').annotate(count=Count('id'))
# build dict from queryset result
```
One query replaces 30.

---

## O3 — 🟠 Leave approval has a race condition — no `select_for_update()` on `LeaveBalance`

**File/Line:** `leave_views.py:373–388`

**Proof:**
```python
balance, created = LeaveBalance.objects.get_or_create(...)  # ← read
if not created:
    balance.used += days      # ← in-memory increment
    balance.calculate_balance()
    # balance.save() missing anyway, but even if fixed:
    # two concurrent requests both read balance.used=5, both set it to 7 → lost update
```

Two simultaneous `approve()` calls for the same employee/leave type will both read `balance.used = 5`, both increment to 7, and one update overwrites the other. Net result: `balance.used = 7` instead of `balance.used = 9`.

**Remediation:**
```python
with transaction.atomic():
    balance = LeaveBalance.objects.select_for_update().get(...)
    balance.used += days
    balance.calculate_balance()
    balance.save()
```

---

## O4 — 🟠 `PORTAL_ENCRYPTION_KEY` is ephemeral — government portal credentials destroyed on restart

**File/Line:** `encryption_utils.py:14–22`

**Proof:**
```python
def get_encryption_key():
    key = os.environ.get('PORTAL_ENCRYPTION_KEY')
    if not key:
        key = Fernet.generate_key().decode()  # ← generates a NEW key on every call
        print(f"WARNING: Using auto-generated encryption key: {key}")
        # ← no persistence — key is only in memory for this process lifetime
    return key.encode()
```

Every restart (or every call if `PORTAL_ENCRYPTION_KEY` is unset) generates a new key. Previously encrypted government portal credentials stored in `GovernmentReturn` or `StatutorySettings` cannot be decrypted with the new key.

**Business Impact:** After any server restart, all saved government portal passwords become permanently unreadable. Automated PF/ESI/TDS filing via the government portal integration will fail with decryption errors. Requires manual re-entry of all portal credentials after every restart.

**Remediation:** Require `PORTAL_ENCRYPTION_KEY` to be set in environment; raise `ImproperlyConfigured` if absent rather than generating a throwaway key.

---

## O5 — 🟠 `Employee.save()` auto-generates `employee_id` with a race condition

**File/Line:** `models.py:289–297`

**Proof:**
```python
def save(self, *args, **kwargs):
    if not self.employee_id:
        last = Employee.objects.filter(
            company=self.company
        ).order_by('-id').first()   # ← reads max without lock
        if last and last.employee_id:
            num = int(last.employee_id.split('-')[-1]) + 1
        else:
            num = 1
        self.employee_id = f"{prefix}-{num:06d}"   # ← not atomic
        super().save(...)
```

Two concurrent employee creates for the same company will both read the same `last` employee and generate the same `employee_id`, causing a `unique constraint` `IntegrityError`.

**Remediation:** Use a `SEQUENCE` (PostgreSQL) or a `select_for_update()` on a company-level counter, not a `filter().order_by().first()` read.

---

## O6 — 🟠 `Payslip.save()` runs heavy validation on EVERY save including `update_fields` saves

**File/Line:** `models.py:877–882`

**Proof:**
```python
def save(self, *args, **kwargs):
    self.validate_payment_date()   # queries payroll_cycle every time
    self.validate_deductions()     # checks deduction ratio
    super().save(*args, **kwargs)
```

`validate_payment_date()` does `self.payroll_cycle.pay_date.day` — if `payroll_cycle` is not pre-fetched, this triggers a DB query on every `payslip.save(update_fields=['status'])`. During `calculate_payroll` which calls `payslip.save()` for every employee, this results in N extra queries.

**Remediation:** Move `clean()` validation to Django's `full_clean()` / `clean()` method (called before `save()` only in form and serializer paths), not in `save()`. Or gate on `if not update_fields or 'pay_date' in ...`.

---

## O7 — 🟠 `calculate_enhanced_payslip` hardcodes allowances regardless of company config

**File/Line:** `statutory_calculations.py:393–394`

**Proof:**
```python
payslip_data['conveyance_allowance'] = Decimal('1600')  # hardcoded
payslip_data['medical_allowance'] = Decimal('1250')     # hardcoded
```

These amounts are the pre-2018 tax-exempt limits. The `PayrollSettings` model has `salary_components` configured per company, but `calculate_enhanced_payslip` ignores them and hardcodes ₹1,600 and ₹1,250 for all companies.

**Business Impact:** Companies with different conveyance or medical allowance structures produce incorrect payslips.

---

## O8 — 🟡 `AllowAny` session check copy-pasted 30+ times — maintenance burden

**File/Line:** `payroll_views.py`, `attendance_views.py`, `leave_views.py`, `statutory_views.py`, `advanced_views.py`, `performance_views.py`, `analytics_views.py` — all ~30+ `get_session_key()` call sites

**Proof:**
```python
# Identical 8-line block in every ViewSet.list(), .retrieve(), .create(), etc.:
session_key = self.get_session_key()
if not session_key:
    return Response({'error': '...'}, status=401)
try:
    session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
    company = session.service_user.company
except ServiceUserSession.DoesNotExist:
    return Response({'error': '...'}, status=401)
```

Any change to authentication logic (e.g., adding session expiry check, rotating keys) must be applied to 30+ places.

**Business Impact:** High maintenance cost. A single omission in a new method creates a security hole (S3 in the security report).

---

## O9 — 🟡 PT (Professional Tax) uses company `pt_state` setting, not employee's residential state

**File/Line:** `statutory_calculations.py:290–310` (PT calculation); `statutory_models.py:15`

**Proof:**
The PT state for all employees is derived from `StatutorySettings.pt_state` (a single company-wide value). An employee who resides in West Bengal but works for a Maharashtra-registered company will have Maharashtra PT deducted.

**Business Impact:** Wrong PT deducted. Under Income Tax, PT is a state-specific deduction. Incorrect deduction = incorrect Form 16.

---

## O10 — 🟡 `recalculate_balances` in `leave_views.py` also skips `balance.save()`

**File/Line:** `leave_views.py:277`

**Proof:**
```python
for balance in balances:
    balance.calculate_balance()   # ← in-memory only
    # NO balance.save() here either
```

This function (`recalculate_balances`) has the same bug as the `approve()` path. A `POST /api/hr/leave-balances/recalculate/` call appears to succeed but saves nothing.

---

## O11 — 🟡 `employee_mobile_login` generates a session key but never stores it

**File/Line:** `views.py:922`

**Proof:**
```python
session_key = secrets.token_urlsafe(32)
# ... no ServiceUserSession.objects.create(...) call
return Response({'session_key': session_key, 'employee': ...})
```

The key is returned to the mobile app but never stored in `ServiceUserSession`. Any subsequent mobile API call that passes this `session_key` will fail with `ServiceUserSession.DoesNotExist` — every mobile attendance call using the returned key will return 401.

**Business Impact:** Mobile attendance feature is completely broken. Employee logs in, gets a `session_key`, but every subsequent mobile attendance check-in fails authentication.

---

## O12 — 🟡 `AttendanceDevice.device_id` is globally unique (not company-scoped)

**File/Line:** `models.py:583` (or satellite model)

**Business Impact:** Two companies cannot have a device with the same device_id (e.g., "DEVICE-001"). Minor but creates onboarding friction.

---

## Summary Table

| ID | Severity | Area | Description |
|----|----------|------|-------------|
| O1 | 🔴 High | Payroll Analytics | `float()` cast on Decimal salary amounts → precision loss |
| O2 | 🟠 Medium | Attendance Analytics | 30 queries in a loop; needs single aggregation |
| O3 | 🟠 Medium | Leave Approve | No `select_for_update()` → concurrent approval race |
| O4 | 🟠 Medium | Government Integration | Ephemeral encryption key; portal credentials unreadable on restart |
| O5 | 🟠 Medium | Employee Create | Race condition in `employee_id` auto-generation |
| O6 | 🟠 Medium | Payroll Calculation | `Payslip.save()` runs validation on every save — N extra queries |
| O7 | 🟠 Medium | Payroll Calculation | Conveyance and medical allowance hardcoded; ignores company config |
| O8 | 🟡 Low | Auth Pattern | Session check copy-pasted 30+ times; no DRY mechanism |
| O9 | 🟡 Low | Statutory | PT calculated from company state, not employee state |
| O10 | 🟡 Low | Leave | `recalculate_balances` also skips `balance.save()` |
| O11 | 🟡 Low | Mobile Auth | `employee_mobile_login` returns a session key that is never saved |
| O12 | 🟡 Low | Attendance | `device_id` globally unique instead of per-company |
