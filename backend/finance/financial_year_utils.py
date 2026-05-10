"""
Financial Year Utilities for Finance Module
Provides consistent FY filtering across all finance documents
"""
from datetime import date, datetime
from dateutil.relativedelta import relativedelta


def get_financial_year_from_date(dt):
    """
    Get financial year string from a date.
    Indian FY runs from April 1 to March 31.
    
    Args:
        dt: date or datetime object
    
    Returns:
        str: Financial year in format "2026-27" or "2627"
    """
    if isinstance(dt, datetime):
        dt = dt.date()
    
    year = dt.year
    if dt.month < 4:  # Jan-Mar belongs to previous FY
        return f"{year-1}-{str(year)[2:]}"
    return f"{year}-{str(year+1)[2:]}"


def get_financial_year_short(dt):
    """Get short FY format like '2627' for FY 2026-27"""
    fy = get_financial_year_from_date(dt)
    return fy.replace('-', '')


def get_current_financial_year():
    """Get current financial year string"""
    return get_financial_year_from_date(date.today())


def get_financial_year_dates(financial_year_str):
    """
    Get start and end dates for a financial year.
    
    Args:
        financial_year_str: FY string like "2026-27" or "2627"
    
    Returns:
        tuple: (start_date, end_date) for the FY
    """
    # Handle both formats: "2026-27" and "2627"
    if '-' in financial_year_str:
        start_year = int(financial_year_str.split('-')[0])
    elif len(financial_year_str) == 4:
        start_year = int('20' + financial_year_str[:2])
    else:
        raise ValueError(f"Invalid financial year format: {financial_year_str}")
    
    start_date = date(start_year, 4, 1)
    end_date = date(start_year + 1, 3, 31)
    
    return start_date, end_date


def get_available_financial_years(start_year=2020, future_years=2):
    """
    Get list of available financial years for dropdown.
    
    Args:
        start_year: Starting year (default 2020)
        future_years: Number of future years to include (default 2)
    
    Returns:
        list: List of dicts with 'value' and 'label' for FY options
    """
    current_date = date.today()
    current_fy_start = current_date.year if current_date.month >= 4 else current_date.year - 1
    
    years = []
    for year in range(start_year, current_fy_start + future_years + 1):
        fy_str = f"{year}-{str(year+1)[2:]}"
        fy_short = f"{str(year)[2:]}{str(year+1)[2:]}"
        years.append({
            'value': fy_str,
            'short': fy_short,
            'label': f"FY {fy_str}",
            'start_date': date(year, 4, 1).isoformat(),
            'end_date': date(year + 1, 3, 31).isoformat()
        })
    
    return sorted(years, key=lambda x: x['value'], reverse=True)


def apply_financial_year_filter(queryset, date_field, financial_year_str):
    """
    Apply financial year filter to a queryset.
    
    Args:
        queryset: Django queryset to filter
        date_field: Name of the date field to filter on
        financial_year_str: FY string like "2026-27" or "2627"
    
    Returns:
        Filtered queryset
    """
    if not financial_year_str:
        return queryset
    
    try:
        start_date, end_date = get_financial_year_dates(financial_year_str)
        filter_kwargs = {
            f'{date_field}__gte': start_date,
            f'{date_field}__lte': end_date
        }
        return queryset.filter(**filter_kwargs)
    except (ValueError, AttributeError):
        return queryset


def get_quarter_dates(quarter, financial_year_str):
    """
    Get start and end dates for a quarter in a financial year.
    
    Args:
        quarter: Quarter string like "Q1", "Q2", "Q3", "Q4"
        financial_year_str: FY string like "2026-27"
    
    Returns:
        tuple: (start_date, end_date) for the quarter
    """
    fy_start, _ = get_financial_year_dates(financial_year_str)
    
    quarter_offsets = {
        'Q1': (0, 3),   # Apr-Jun
        'Q2': (3, 6),   # Jul-Sep
        'Q3': (6, 9),   # Oct-Dec
        'Q4': (9, 12),  # Jan-Mar
    }
    
    if quarter not in quarter_offsets:
        raise ValueError(f"Invalid quarter: {quarter}")
    
    start_offset, end_offset = quarter_offsets[quarter]
    start_date = fy_start + relativedelta(months=start_offset)
    end_date = fy_start + relativedelta(months=end_offset) - relativedelta(days=1)
    
    return start_date, end_date


def get_financial_year_summary(queryset, date_field, amount_field='total_amount'):
    """
    Get FY-wise summary of amounts from a queryset.
    
    Args:
        queryset: Django queryset
        date_field: Name of the date field
        amount_field: Name of the amount field to sum
    
    Returns:
        dict: FY-wise summary with totals
    """
    from django.db.models import Sum, Count
    from django.db.models.functions import ExtractYear, ExtractMonth
    
    # Annotate with FY
    summary = {}
    for obj in queryset:
        obj_date = getattr(obj, date_field)
        if obj_date:
            fy = get_financial_year_from_date(obj_date)
            if fy not in summary:
                summary[fy] = {'count': 0, 'total': 0}
            summary[fy]['count'] += 1
            amount = getattr(obj, amount_field, 0) or 0
            summary[fy]['total'] += float(amount)
    
    return summary
