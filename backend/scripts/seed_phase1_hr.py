"""
Phase 1: HR Seed Data for Royal Enfield (company_id=40)
Departments, Designations, Employees, Attendance, Leave, Payroll, Performance
"""
import os, sys, random
sys.path.insert(0, '/home/athenaerp/athenaerp/ERP/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
import django; django.setup()

from datetime import date, timedelta, datetime
from decimal import Decimal
from authentication.models import Company, CompanyServiceUser
from hr.models import (
    Department, Designation, Employee, LeaveType, LeaveBalance,
    Attendance, LeaveApplication, Payslip, PayrollCycle, PerformanceReview
)

COMPANY_ID = 40
company = Company.objects.get(id=COMPANY_ID)
service_user = CompanyServiceUser.objects.filter(company=company, service__service_type='hr').first()
today = date.today()

print("=== Phase 1: HR Seed Data ===")

# ── Departments ───────────────────────────────────────────────────────────────
dept_names = ['Sales & Marketing', 'Engineering', 'Manufacturing', 'Finance & Accounts',
              'Human Resources', 'Supply Chain', 'Quality Assurance', 'Customer Service']
depts = {}
for name in dept_names:
    d, created = Department.objects.get_or_create(company=company, name=name)
    depts[name] = d
    if created: print(f"  + Dept: {name}")
print(f"  Departments ready: {len(depts)}")

# ── Designations ──────────────────────────────────────────────────────────────
desig_data = [
    ('General Manager',  'L8', 150000, 250000, 'Sales & Marketing'),
    ('Senior Manager',   'L7', 100000, 150000, 'Finance & Accounts'),
    ('Manager',          'L6',  70000, 100000, 'Manufacturing'),
    ('Senior Engineer',  'L5',  55000,  80000, 'Engineering'),
    ('Engineer',         'L4',  35000,  55000, 'Engineering'),
    ('Sales Executive',  'L3',  25000,  40000, 'Sales & Marketing'),
    ('Technician',       'L3',  22000,  35000, 'Manufacturing'),
    ('Analyst',          'L4',  30000,  50000, 'Supply Chain'),
    ('Team Lead',        'L5',  50000,  75000, 'Quality Assurance'),
    ('Associate',        'L2',  18000,  28000, 'Customer Service'),
]
desigs = {}
for title, level, mn, mx, dept_name in desig_data:
    d, created = Designation.objects.get_or_create(
        company=company, title=title,
        defaults={'level': level, 'min_salary': mn, 'max_salary': mx,
                  'department': depts[dept_name]}
    )
    desigs[title] = d
    if created: print(f"  + Desig: {title}")
print(f"  Designations ready: {len(desigs)}")

# ── Leave Types ───────────────────────────────────────────────────────────────
leave_types_data = [
    ('Casual Leave',    12, True),
    ('Sick Leave',      12, True),
    ('Earned Leave',    15, True),
    ('Maternity Leave', 90, False),
    ('Paternity Leave', 15, False),
    ('Compensatory Off', 5, True),
]
leave_types = {}
for name, days, paid in leave_types_data:
    code = name.upper().replace(' ', '_')[:10]
    lt = LeaveType.objects.filter(company=company, name=name).first()
    if not lt:
        lt = LeaveType.objects.filter(company=company, code=code).first()
    if not lt:
        # generate unique code
        import uuid
        code = name[:3].upper() + str(uuid.uuid4().hex[:4]).upper()
        lt = LeaveType.objects.create(
            company=company, name=name, code=code,
            days_per_year=days, is_paid=paid, is_active=True,
            requires_approval=True, carry_forward=False, max_carry_forward=0
        )
        print(f"  + LeaveType: {name}")
    leave_types[name] = lt
print(f"  Leave types ready: {len(leave_types)}")

# ── Employees ─────────────────────────────────────────────────────────────────
employees_data = [
    ('Arjun',   'Sharma',   'arjun.sharma@royalenfield.com',   '9876543201', 'Sales & Marketing',  'General Manager',  180000, 'M', '2019-03-15'),
    ('Priya',   'Nair',     'priya.nair@royalenfield.com',     '9876543202', 'Engineering',         'Senior Engineer',   72000, 'F', '2020-06-01'),
    ('Karthik', 'Rajan',    'karthik.rajan@royalenfield.com',  '9876543203', 'Manufacturing',       'Manager',           85000, 'M', '2018-11-20'),
    ('Deepa',   'Menon',    'deepa.menon@royalenfield.com',    '9876543204', 'Finance & Accounts',  'Senior Manager',   110000, 'F', '2017-07-10'),
    ('Rahul',   'Verma',    'rahul.verma@royalenfield.com',    '9876543205', 'Sales & Marketing',   'Sales Executive',   32000, 'M', '2021-02-14'),
    ('Sneha',   'Pillai',   'sneha.pillai@royalenfield.com',   '9876543206', 'Human Resources',     'Manager',           78000, 'F', '2020-09-01'),
    ('Vijay',   'Kumar',    'vijay.kumar@royalenfield.com',    '9876543207', 'Engineering',         'Engineer',          48000, 'M', '2022-01-10'),
    ('Anitha',  'Reddy',    'anitha.reddy@royalenfield.com',   '9876543208', 'Quality Assurance',   'Team Lead',         62000, 'F', '2019-08-05'),
    ('Suresh',  'Babu',     'suresh.babu@royalenfield.com',    '9876543209', 'Supply Chain',        'Analyst',           42000, 'M', '2021-05-20'),
    ('Lakshmi', 'Iyer',     'lakshmi.iyer@royalenfield.com',   '9876543210', 'Customer Service',    'Associate',         24000, 'F', '2022-07-01'),
    ('Manoj',   'Singh',    'manoj.singh@royalenfield.com',    '9876543211', 'Manufacturing',       'Technician',        28000, 'M', '2020-03-15'),
    ('Kavitha', 'Sundaram', 'kavitha.sundaram@royalenfield.com','9876543212', 'Sales & Marketing',  'Sales Executive',   30000, 'F', '2021-11-01'),
    ('Ravi',    'Shankar',  'ravi.shankar@royalenfield.com',   '9876543213', 'Engineering',         'Senior Engineer',   68000, 'M', '2019-05-10'),
    ('Meena',   'Krishnan', 'meena.krishnan@royalenfield.com', '9876543214', 'Quality Assurance',   'Analyst',           38000, 'F', '2021-08-15'),
    ('Dinesh',  'Patel',    'dinesh.patel@royalenfield.com',   '9876543215', 'Supply Chain',        'Manager',           82000, 'M', '2018-04-01'),
]

employees = []
for i, (fn, ln, email, phone, dept_name, desig_name, salary, gender, doj) in enumerate(employees_data):
    emp_id = f'RE{1000 + i:04d}'
    emp, created = Employee.objects.get_or_create(
        company=company, email=email,
        defaults={
            'employee_id': emp_id,
            'first_name': fn, 'last_name': ln,
            'phone': phone, 'gender': gender,
            'department': depts[dept_name],
            'designation': desigs[desig_name],
            'base_salary': Decimal(str(salary)),
            'date_of_joining': date.fromisoformat(doj),
            'status': 'active',
            'employment_type': 'full_time',
            'city': 'Chennai', 'state': 'Tamil Nadu', 'country': 'India',
            'created_by': service_user,
        }
    )
    employees.append(emp)
    if created: print(f"  + Employee: {fn} {ln}")
print(f"  Employees ready: {len(employees)}")

# ── Leave Balances ────────────────────────────────────────────────────────────
for emp in employees:
    for lt in leave_types.values():
        LeaveBalance.objects.get_or_create(
            employee=emp, leave_type=lt, year=today.year,
            defaults={'opening_balance': lt.days_per_year,
                      'credited': lt.days_per_year, 'used': 0,
                      'closing_balance': lt.days_per_year}
        )
print("  Leave balances seeded")

# ── Attendance (last 90 calendar days) ───────────────────────────────────────
att_count = 0
for emp in employees:
    att_num = Attendance.objects.filter(employee=emp).count() + 1
    day = today - timedelta(days=90)
    while day <= today:
        if day.weekday() < 5:
            if not Attendance.objects.filter(employee=emp, date=day).exists():
                status = random.choices(
                    ['present', 'absent', 'half_day'],
                    weights=[88, 6, 6]
                )[0]
                ci = datetime.combine(day, datetime.strptime('09:00','%H:%M').time()) if status != 'absent' else None
                co = datetime.combine(day, datetime.strptime('18:30','%H:%M').time()) if status == 'present' else (
                     datetime.combine(day, datetime.strptime('13:30','%H:%M').time()) if status == 'half_day' else None)
                total_h = Decimal('9.5') if status == 'present' else (Decimal('4.5') if status == 'half_day' else Decimal('0'))
                Attendance.objects.create(
                    employee=emp,
                    attendance_number=f'ATT{emp.id:04d}{att_num:05d}',
                    date=day,
                    check_in_time=ci, check_out_time=co,
                    check_in_method='manual', check_out_method='manual',
                    work_mode='office',
                    total_hours=total_h,
                    break_hours=Decimal('1.0') if status != 'absent' else Decimal('0'),
                    overtime_hours=Decimal('0.5') if status == 'present' and random.random() > 0.7 else Decimal('0'),
                    status=status,
                )
                att_num += 1
                att_count += 1
        day += timedelta(days=1)
print(f"  Attendance records created: {att_count}")

# ── Leave Applications ────────────────────────────────────────────────────────
leave_apps = [
    (0, 'Casual Leave',    today-timedelta(days=30), today-timedelta(days=28), 3, 'Family function',    'approved'),
    (1, 'Sick Leave',      today-timedelta(days=20), today-timedelta(days=19), 2, 'Fever and cold',     'approved'),
    (2, 'Earned Leave',    today-timedelta(days=60), today-timedelta(days=55), 6, 'Annual vacation',    'approved'),
    (3, 'Casual Leave',    today+timedelta(days=5),  today+timedelta(days=6),  2, 'Personal work',      'pending'),
    (4, 'Sick Leave',      today-timedelta(days=10), today-timedelta(days=10), 1, 'Doctor appointment', 'approved'),
    (5, 'Earned Leave',    today+timedelta(days=15), today+timedelta(days=20), 6, 'Wedding ceremony',   'pending'),
    (6, 'Casual Leave',    today-timedelta(days=45), today-timedelta(days=44), 2, 'Personal errand',    'approved'),
    (7, 'Sick Leave',      today-timedelta(days=5),  today-timedelta(days=5),  1, 'Migraine',           'approved'),
    (8, 'Compensatory Off',today-timedelta(days=15), today-timedelta(days=15), 1, 'Worked on weekend',  'approved'),
    (9, 'Casual Leave',    today+timedelta(days=30), today+timedelta(days=31), 2, 'Festival holiday',   'pending'),
]
for idx, lt_name, fd, td, days, reason, status in leave_apps:
    if idx < len(employees):
        emp = employees[idx]
        lt = leave_types.get(lt_name)
        if lt and not LeaveApplication.objects.filter(employee=emp, from_date=fd).exists():
            LeaveApplication.objects.create(
                employee=emp, leave_type=lt,
                application_number=f'LA{emp.id:04d}{idx:03d}',
                from_date=fd, to_date=td, total_days=days,
                reason=reason, status=status,
                approved_by=employees[0] if status == 'approved' else None,
                approved_date=td if status == 'approved' else None,
            )
print("  Leave applications seeded")

# ── PayrollCycles + Payslips (last 6 months) ─────────────────────────────────
months = []
d = today.replace(day=1)
for _ in range(6):
    months.append(d)
    d = (d - timedelta(days=1)).replace(day=1)

payslip_count = 0
for month_date in months:
    yr, mo = month_date.year, month_date.month
    cycle_name = month_date.strftime('%B %Y')
    end_day = (month_date.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    cycle, _ = PayrollCycle.objects.get_or_create(
        company=company, name=cycle_name,
        defaults={
            'payroll_number': f'PC{yr}{mo:02d}',
            'period_type': 'monthly',
            'start_date': month_date,
            'end_date': end_day,
            'pay_date': end_day,
            'status': 'processed',
            'total_employees': len(employees),
        }
    )
    for emp in employees:
        if not Payslip.objects.filter(employee=emp, payroll_cycle=cycle).exists():
            basic  = float(emp.base_salary) * 0.5
            hra    = float(emp.base_salary) * 0.2
            conv   = 1600.0
            med    = 1250.0
            spec   = max(float(emp.base_salary) - basic - hra - conv - med, 0)
            gross  = float(emp.base_salary)
            pf_e   = min(basic * 0.12, 1800.0)
            esi_e  = gross * 0.0075 if gross <= 21000 else 0.0
            pt     = 200.0
            net    = gross - pf_e - esi_e - pt
            present = random.randint(22, 26)
            Payslip.objects.create(
                employee=emp, payroll_cycle=cycle,
                emp_id=emp.employee_id,
                emp_name=f'{emp.first_name} {emp.last_name}',
                emp_department=emp.department.name if emp.department else '',
                emp_designation=emp.designation.title if emp.designation else '',
                working_days=26, present_days=present, absent_days=26-present,
                basic_salary=Decimal(str(round(basic, 2))),
                hra=Decimal(str(round(hra, 2))),
                conveyance_allowance=Decimal(str(conv)),
                medical_allowance=Decimal(str(med)),
                special_allowance=Decimal(str(round(spec, 2))),
                gross_salary=Decimal(str(round(gross, 2))),
                pf_employee=Decimal(str(round(pf_e, 2))),
                esi_employee=Decimal(str(round(esi_e, 2))),
                professional_tax=Decimal(str(pt)),
                total_deductions=Decimal(str(round(pf_e + esi_e + pt, 2))),
                pf_employer=Decimal(str(round(pf_e, 2))),
                esi_employer=Decimal(str(round(gross * 0.0325 if gross <= 21000 else 0, 2))),
                net_salary=Decimal(str(round(net, 2))),
                ctc=Decimal(str(round(gross + pf_e, 2))),
                status='paid',
                payment_method='bank_transfer',
                paid_date=end_day,
            )
            payslip_count += 1
print(f"  Payslips created: {payslip_count}")

# ── Performance Reviews ───────────────────────────────────────────────────────
rev_count = 0
for emp in employees[:10]:
    if not PerformanceReview.objects.filter(employee=emp, review_period_start=date(today.year, 1, 1)).exists():
        s = [random.randint(70, 98) for _ in range(4)]
        PerformanceReview.objects.create(
            employee=emp, reviewer=employees[0],
            review_number=f'PR{emp.id:04d}',
            review_period_start=date(today.year, 1, 1),
            review_period_end=date(today.year, 6, 30),
            goals_achievement=Decimal(str(s[0])),
            quality_score=Decimal(str(s[1])),
            productivity_score=Decimal(str(s[2])),
            collaboration_score=Decimal(str(s[3])),
            overall_rating=Decimal(str(round(sum(s)/4, 1))),
            strengths='Strong technical skills, proactive, good team player',
            areas_for_improvement='Documentation, time management',
            goals_for_next_period='Complete certification, lead a sub-project',
            status='completed',
        )
        rev_count += 1
print(f"  Performance reviews created: {rev_count}")

print("\n✅ Phase 1 HR complete.")
