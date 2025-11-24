from django import template
from hr.weasyprint_pdf_export import get_field_value

register = template.Library()

@register.filter
def get_field_value_filter(entry, field_name):
    """Template filter to get field value from entry"""
    return get_field_value(entry, field_name)