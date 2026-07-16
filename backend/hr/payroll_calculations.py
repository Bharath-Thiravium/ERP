from datetime import timedelta
from decimal import Decimal

from django.db.models import Q

from .attendance_calendar import get_attendance_policy, get_day_status
from .leave_models import LeaveApplication
from .models import Attendance


ONE_DAY = Decimal('1.00')
HALF_DAY = Decimal('0.50')
ZERO_DAY = Decimal('0.00')


def _iter_dates(start_date, end_date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def _approved_leave_for_date(employee, target_date):
    return (
        LeaveApplication.objects
        .select_related('leave_type')
        .filter(
            employee=employee,
            status='approved',
            from_date__lte=target_date,
            to_date__gte=target_date,
        )
        .first()
    )


def _employee_payroll_dates(employee, start_date, end_date):
    effective_start = max(start_date, employee.date_of_joining)
    leaving_date = employee.date_of_leaving or employee.termination_date
    effective_end = min(end_date, leaving_date) if leaving_date else end_date

    if effective_start > effective_end:
        return []

    return list(_iter_dates(effective_start, effective_end))


def calculate_employee_payroll_attendance(employee, start_date, end_date):
    """Return payroll-ready attendance totals for one employee.

    The payroll engine needs payable days, not just raw attendance row counts.
    This function applies the company attendance policy, one-off calendar
    overrides, holidays, approved paid/unpaid leave, and half-day attendance.
    """
    company = employee.company
    policy = get_attendance_policy(company)
    payroll_dates = _employee_payroll_dates(employee, start_date, end_date)

    attendance_by_date = {
        record.date: record
        for record in Attendance.objects.filter(
            employee=employee,
            date__gte=start_date,
            date__lte=end_date,
        )
    }

    working_days = ZERO_DAY
    present_days = ZERO_DAY
    absent_days = ZERO_DAY
    paid_leave_days = ZERO_DAY
    unpaid_leave_days = ZERO_DAY
    holiday_paid_days = ZERO_DAY
    half_days = ZERO_DAY
    overtime_hours = ZERO_DAY

    daily_breakdown = []

    for target_date in payroll_dates:
        day_status = get_day_status(company, target_date)
        attendance = attendance_by_date.get(target_date)
        leave = _approved_leave_for_date(employee, target_date)
        source = day_status['source']
        is_working_day = day_status['is_working_day']

        day_working = ZERO_DAY
        day_present = ZERO_DAY
        day_absent = ZERO_DAY
        payable_reason = ''

        if is_working_day:
            day_working = ONE_DAY

            if leave:
                if leave.leave_type.is_paid and policy.paid_leave_payable:
                    day_present = ONE_DAY
                    paid_leave_days += ONE_DAY
                    payable_reason = 'paid_leave'
                else:
                    day_absent = ONE_DAY if policy.unpaid_leave_deductible else ZERO_DAY
                    unpaid_leave_days += ONE_DAY
                    payable_reason = 'unpaid_leave'
            elif attendance:
                if attendance.status in ['present', 'late', 'early_departure']:
                    day_present = ONE_DAY
                    payable_reason = attendance.status
                elif attendance.status == 'half_day':
                    day_present = HALF_DAY
                    day_absent = HALF_DAY
                    half_days += ONE_DAY
                    payable_reason = 'half_day'
                elif attendance.status == 'leave':
                    day_absent = ONE_DAY
                    payable_reason = 'attendance_leave'
                elif attendance.status == 'holiday':
                    day_present = ONE_DAY
                    payable_reason = 'attendance_holiday'
                else:
                    day_absent = ONE_DAY
                    payable_reason = attendance.status
            else:
                day_absent = ONE_DAY
                payable_reason = 'missing_attendance'

        elif source == 'holiday' and policy.paid_holiday_payable:
            day_working = ONE_DAY
            day_present = ONE_DAY
            holiday_paid_days += ONE_DAY
            payable_reason = 'paid_holiday'

        if attendance:
            overtime_hours += Decimal(attendance.overtime_hours or 0)

        working_days += day_working
        present_days += day_present
        absent_days += day_absent
        daily_breakdown.append({
            'date': target_date,
            'source': source,
            'label': day_status['label'],
            'working_day': day_working,
            'payable_day': day_present,
            'absent_day': day_absent,
            'reason': payable_reason,
        })

    return {
        'working_days': working_days,
        'present_days': present_days,
        'absent_days': absent_days,
        'paid_leave_days': paid_leave_days,
        'unpaid_leave_days': unpaid_leave_days,
        'holiday_paid_days': holiday_paid_days,
        'half_days': half_days,
        'overtime_hours': overtime_hours,
        'daily_breakdown': daily_breakdown,
    }
