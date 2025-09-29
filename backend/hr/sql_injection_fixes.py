"""
SQL injection prevention utilities for HR module
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


def safe_filter_employees(queryset, filters):
    """Safely filter employees using Django ORM"""
    q_objects = Q()
    
    for field, value in filters.items():
        if field in ['first_name', 'last_name', 'email', 'employee_id']:
            q_objects &= Q(**{f"{field}__icontains": value})
    
    return queryset.filter(q_objects)


def validate_employee_id(employee_id):
    """Validate employee ID format"""
    import re
    if not employee_id:
        return False
    
    # Only allow alphanumeric characters and hyphens
    pattern = r'^[A-Za-z0-9-]+$'
    return bool(re.match(pattern, str(employee_id)))


def sanitize_search_term(search_term):
    """Sanitize search terms to prevent SQL injection"""
    if not search_term:
        return ""
    
    # Remove SQL injection patterns
    dangerous_patterns = [';', '--', '/*', '*/', 'xp_', 'sp_', 'DROP', 'DELETE', 'INSERT', 'UPDATE']
    
    sanitized = str(search_term)
    for pattern in dangerous_patterns:
        sanitized = sanitized.replace(pattern, '')
    
    return sanitized.strip()