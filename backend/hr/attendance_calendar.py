from datetime import timedelta
from decimal import Decimal

from .leave_models import Holiday
from .models import AttendanceDayOverride, AttendancePolicy


def get_attendance_policy(company):
    policy, _ = AttendancePolicy.objects.get_or_create(
        company=company,
        defaults={'weekly_off_days': [6]},
    )
    return policy


def get_day_status(company, target_date):
    policy = get_attendance_policy(company)
    override = AttendanceDayOverride.objects.filter(company=company, date=target_date).first()
    holiday = Holiday.objects.filter(company=company, date=target_date).first()
    is_weekly_off = target_date.weekday() in (policy.weekly_off_days or [])

    if override:
        return {
            'date': target_date,
            'is_working_day': override.is_working_day,
            'source': 'override',
            'label': override.title or ('Working Day' if override.is_working_day else 'Special Off'),
            'is_weekly_off': is_weekly_off,
            'holiday': holiday,
            'override': override,
        }

    if holiday:
        return {
            'date': target_date,
            'is_working_day': False,
            'source': 'holiday',
            'label': holiday.name,
            'is_weekly_off': is_weekly_off,
            'holiday': holiday,
            'override': None,
        }

    if is_weekly_off:
        return {
            'date': target_date,
            'is_working_day': False,
            'source': 'weekly_off',
            'label': 'Weekly Off',
            'is_weekly_off': True,
            'holiday': None,
            'override': None,
        }

    return {
        'date': target_date,
        'is_working_day': True,
        'source': 'regular',
        'label': 'Working Day',
        'is_weekly_off': False,
        'holiday': None,
        'override': None,
    }


def is_company_working_day(company, target_date):
    return get_day_status(company, target_date)['is_working_day']


def calculate_leave_days(company, from_date, to_date):
    policy = get_attendance_policy(company)
    total = Decimal('0.00')
    current = from_date

    while current <= to_date:
        override = AttendanceDayOverride.objects.filter(company=company, date=current).first()
        holiday = Holiday.objects.filter(company=company, date=current).first()
        is_weekly_off = current.weekday() in (policy.weekly_off_days or [])

        if override:
            if override.is_working_day:
                total += Decimal('1.00')
            current += timedelta(days=1)
            continue

        if holiday and policy.exclude_holidays_from_leave:
            current += timedelta(days=1)
            continue

        if is_weekly_off and policy.exclude_weekoffs_from_leave:
            current += timedelta(days=1)
            continue

        total += Decimal('1.00')
        current += timedelta(days=1)

    return total
