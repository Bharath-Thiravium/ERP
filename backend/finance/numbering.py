from django.db import transaction
from django.utils import timezone

from .models import NumberingRule, NumberingCounter


def _scope_key(reset_scope: str, dt) -> str:
    if reset_scope == 'yearly':
        return dt.strftime('%Y')
    if reset_scope == 'monthly':
        return dt.strftime('%Y-%m')
    return ''


def _get_highest_sequence_number(company, module: str, rule, scope_key: str) -> int:
    """
    Get the highest sequence number from existing documents.
    Extracts sequence numbers from document numbers matching the current template pattern.
    """
    from django.db import connection
    
    # Map module to model table and field
    module_mapping = {
        'quotation': ('finance_quotations', 'quotation_number'),
        'purchase_order': ('finance_purchase_orders', 'internal_po_number'),
        'proforma_invoice': ('finance_proforma_invoices', 'proforma_number'),
        'invoice': ('finance_invoices', 'invoice_number'),
        'customer_payment': ('finance_payments', 'payment_number'),
        'purchase_request': ('finance_purchase_requests', 'request_number'),
        'purchase_payment': ('finance_purchase_payments', 'payment_number'),
        'vendor_invoice': ('finance_vendor_invoices', 'our_reference_number'),
    }
    
    if module not in module_mapping:
        return 0
    
    table_name, field_name = module_mapping[module]
    
    # Build pattern for new format: TC-INV-2025-26-001
    company_code = 'TC'
    fy = '2025-26'
    prefix_pattern = f"{company_code}-{rule.prefix}-{fy}-%"
    
    try:
        with connection.cursor() as cursor:
            # Get all matching document numbers
            cursor.execute(
                f"SELECT {field_name} FROM {table_name} WHERE company_id = %s AND {field_name} LIKE %s",
                [company.id, prefix_pattern]
            )
            
            max_seq = 0
            for row in cursor.fetchall():
                doc_number = row[0]
                if doc_number:
                    # Extract sequence number (last part after last dash)
                    parts = doc_number.split('-')
                    if len(parts) >= 4:  # TC-INV-2025-26-001
                        try:
                            seq = int(parts[-1])  # Get the last part (001)
                            max_seq = max(max_seq, seq)
                        except (ValueError, IndexError):
                            continue
            
            return max_seq
    except Exception:
        return 0


def generate_number(company, module: str, dt=None) -> str:
    """
    Generate the next document number for a company/module using the configured rule.
    Auto-detects highest existing number and continues from there.
    Enforces atomic increment via select_for_update on the counter row.
    """
    dt = dt or timezone.now()

    try:
        rule = NumberingRule.objects.get(company=company, module=module)
    except NumberingRule.DoesNotExist:
        raise ValueError(f"No numbering rule configured for company={company.id} module={module}")

    scope_key = _scope_key(rule.reset_scope, dt)

    with transaction.atomic():
        counter, created = NumberingCounter.objects.select_for_update().get_or_create(
            company=company,
            module=module,
            scope_key=scope_key,
            defaults={'next_value': rule.start_from},
        )
        
        # Get highest existing sequence number
        highest_seq = _get_highest_sequence_number(company, module, rule, scope_key)
        
        # Use max of counter, start_from, and highest existing number
        seq = max(counter.next_value, 1, highest_seq + 1)
        
        counter.next_value = seq + 1
        counter.save(update_fields=['next_value'])

    tokens = {
        'PREFIX': rule.prefix or '',
        'SEP': rule.separator or '',
        'YY': dt.strftime('%y'),
        'YYYY': dt.strftime('%Y'),
        'MM': dt.strftime('%m'),
        'SEQ': str(seq).zfill(rule.padding),
        # Additional tokens for your configuration
        'COMPANY': 'TC',  # Fixed company code
        'FY': '2025-26',  # Fixed financial year
        'NUMBER': str(seq).zfill(3),  # 3-digit number format
    }

    try:
        return rule.template.format(**tokens)
    except KeyError as exc:  # Missing token in template
        raise ValueError(f"Invalid template token: {exc}") from exc
