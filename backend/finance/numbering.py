from django.db import transaction
from django.utils import timezone
import datetime

from .models import NumberingRule, NumberingCounter


def _scope_key(reset_scope: str, dt) -> str:
    if reset_scope == 'yearly':
        # Use financial year short format for yearly scope (e.g., '2627' for FY 2026-27)
        return _financial_year_short(dt)
    if reset_scope == 'monthly':
        return dt.strftime('%Y-%m')
    return 'global'


def _financial_year(dt) -> str:
    """Return FY string like '2025-26' based on Indian FY (Apr-Mar)."""
    year = dt.year
    if dt.month < 4:
        return f"{year - 1}-{str(year)[2:]}"
    return f"{year}-{str(year + 1)[2:]}"


def _financial_year_short(dt) -> str:
    """Return FY short string like '2526' based on Indian FY (Apr-Mar)."""
    year = dt.year
    if dt.month < 4:
        return f"{str(year - 1)[2:]}{str(year)[2:]}"
    return f"{str(year)[2:]}{str(year + 1)[2:]}"


def _get_highest_sequence_number(company, module: str, rule, scope_key: str) -> int:
    """
    Scan existing document numbers for this company/module/scope and return
    the highest sequence number found, so the counter never goes backwards.
    
    IMPORTANT: This function must correctly identify the {SEQ} or {NUMBER} token position
    in the template to avoid extracting FY_SHORT or other tokens as the sequence.
    """
    from django.db import connection

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

    def _matches_scope(doc_number: str) -> bool:
        normalized = doc_number.replace('/', separator)

        if reset_scope == 'never':
            return True

        scope_fragments = []
        if '{FY_SHORT}' in template:
            scope_fragments.append(_financial_year_short(dt))
        if '{FY}' in template:
            scope_fragments.append(_financial_year(dt))
        if '{YYYY}' in template:
            scope_fragments.append(dt.strftime('%Y'))
        if '{YY}' in template:
            scope_fragments.append(dt.strftime('%y'))
        if reset_scope == 'monthly' and '{MM}' in template:
            scope_fragments.append(dt.strftime('%m'))

        # If no date tokens are present, fall back to all documents for this module.
        if not scope_fragments:
            return True

        return all(fragment in normalized for fragment in scope_fragments)

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT {field_name} FROM {table_name} WHERE company_id = %s",
                [company.id]
            )
            max_seq = 0
            
            # Determine which position in the template contains {SEQ} or {NUMBER}
            template = rule.template
            separator = rule.separator or '-'
            
            # Find the position of {SEQ} or {NUMBER} in the template
            seq_position = None
            template_parts = template.replace('/', separator).split(separator)
            for i, part in enumerate(template_parts):
                if '{SEQ}' in part or '{NUMBER}' in part:
                    seq_position = i
                    break
            
            # If we can't determine position, fall back to last segment (old behavior)
            if seq_position is None:
                seq_position = -1
            
            for (doc_number,) in cursor.fetchall():
                if doc_number and _matches_scope(doc_number):
                    # Split by both / and - to handle different separators
                    parts = doc_number.replace('/', separator).split(separator)
                    
                    # Extract the sequence from the correct position
                    try:
                        if seq_position == -1:
                            # Last segment (old behavior)
                            seq_str = parts[-1]
                        elif seq_position < len(parts):
                            # Specific position
                            seq_str = parts[seq_position]
                        else:
                            continue
                        
                        # Remove leading zeros and convert to int
                        seq = int(seq_str.lstrip('0') or '0')
                        max_seq = max(max_seq, seq)
                    except (ValueError, IndexError):
                        continue
            return max_seq
    except Exception:
        return 0


def generate_number(company, module: str, dt=None) -> str:
    """
    Generate the next document number for a company/module.
    `dt` should be the document date (e.g. invoice_date) so that {YY}/{YYYY}/{FY}
    tokens reflect the actual document date, not today.
    """
    dt = dt or timezone.now()
    # Accept date objects too
    if isinstance(dt, datetime.date) and not isinstance(dt, datetime.datetime):
        dt = datetime.datetime(dt.year, dt.month, dt.day)

    try:
        rule = NumberingRule.objects.get(company=company, module=module)
    except NumberingRule.DoesNotExist:
        raise ValueError(f"No numbering rule configured for company={company.id} module={module}")

    scope_key = _scope_key(rule.reset_scope, dt)

    with transaction.atomic():
        counter, _ = NumberingCounter.objects.select_for_update().get_or_create(
            company=company,
            module=module,
            scope_key=scope_key,
            defaults={'next_value': rule.start_from},
        )

        highest_seq = _get_highest_sequence_number(company, module, rule, scope_key)
        seq = max(counter.next_value, 1, highest_seq + 1)

        counter.next_value = seq + 1
        counter.save(update_fields=['next_value'])

    company_prefix = getattr(company, 'company_prefix', None) or 'TC'

    tokens = {
        'PREFIX': rule.prefix or '',
        'SEP': rule.separator or '-',
        'YY': dt.strftime('%y'),
        'YYYY': dt.strftime('%Y'),
        'MM': dt.strftime('%m'),
        'SEQ': str(seq).zfill(rule.padding),
        'NUMBER': str(seq).zfill(rule.padding),
        'COMPANY': company_prefix,
        'FY': _financial_year(dt),
        'FY_SHORT': _financial_year_short(dt),
    }

    try:
        return rule.template.format(**tokens)
    except KeyError as exc:
        raise ValueError(f"Invalid template token: {exc}") from exc
