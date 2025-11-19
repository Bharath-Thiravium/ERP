"""
SQL injection prevention utilities for Finance module
"""
from django.db import connection
from django.db.models import Q


def safe_raw_query(query, params=None):
    """Execute raw SQL query safely with parameterized queries"""
    if params is None:
        params = []
    
    with connection.cursor() as cursor:
        cursor.execute(query, params)
        return cursor.fetchall()


def safe_filter_customers(queryset, filters):
    """Safely filter customers using Django ORM"""
    q_objects = Q()
    
    for field, value in filters.items():
        if field in ['name', 'email', 'customer_code', 'gstin']:
            q_objects &= Q(**{f"{field}__icontains": value})
    
    return queryset.filter(q_objects)


def validate_customer_code(customer_code):
    """Validate customer code format"""
    import re
    if not customer_code:
        return False
    
    # Only allow alphanumeric characters and hyphens
    pattern = r'^[A-Za-z0-9-]+$'
    return bool(re.match(pattern, str(customer_code)))


def sanitize_financial_search(search_term):
    """Sanitize financial search terms to prevent SQL injection"""
    if not search_term:
        return ""
    
    # Remove SQL injection patterns
    dangerous_patterns = [';', '--', '/*', '*/', 'xp_', 'sp_', 'DROP', 'DELETE', 'INSERT', 'UPDATE']
    
    sanitized = str(search_term)
    for pattern in dangerous_patterns:
        sanitized = sanitized.replace(pattern, '')
    
    return sanitized.strip()