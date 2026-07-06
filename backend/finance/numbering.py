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


def _dashboard_document_type(module: str) -> str:
    return {
        'customer_payment': 'payment',
    }.get(module, module)


def _generate_from_dashboard_numbering(company, module: str, dt):
    if not getattr(company, 'use_document_numbering', False):
        return None

    from authentication.models import Service
    from company_dashboard.document_numbering_models import DocumentNumberingConfig

    try:
        service = Service.objects.get(service_type='finance')
    except Service.DoesNotExist:
        return None

    document_type = _dashboard_document_type(module)
    financial_year = _financial_year(dt)
    configs = DocumentNumberingConfig.objects.filter(
        company=company,
        service=service,
        document_type=document_type,
        financial_year=financial_year,
    )
    config = configs.filter(is_active=True).first()
    if not config:
        if configs.exists():
            raise ValueError(f"Document numbering is inactive for company={company.id} module={module}")
        raise ValueError(
            f"Document numbering is not configured for Finance {document_type}. "
            "Set it up in Company > Document Numbering before creating records."
        )
    return config.get_next_number()


def _get_highest_sequence_number(company, module: str, rule, scope_key: str, dt=None) -> int:
    """
    Scan existing document numbers for this company/module/scope and return
    the highest sequence number found, so the counter never goes backwards.

    Handles both the current FY_SHORT format (e.g. "2627") and legacy long-form
    FY format (e.g. "2026-27") so old invoices are correctly included in the scan.
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
        'customer': ('finance_customers', 'customer_code'),
        'vendor': ('finance_vendors', 'vendor_code'),
        'product': ('finance_products', 'product_code'),
    }

    if module not in module_mapping:
        return 0

    table_name, field_name = module_mapping[module]

    reset_scope = rule.reset_scope
    template = rule.template
    separator = rule.separator or '-'

    # Determine FY strings for scope matching (works with or without a dt)
    if dt is not None:
        _fy_short = _financial_year_short(dt)
        _fy_long = _financial_year(dt)
    elif scope_key and len(scope_key) == 4 and scope_key.isdigit():
        # Reconstruct from scope_key e.g. "2627" → short="2627", long="2026-27"
        _fy_short = scope_key
        _fy_long = f"20{scope_key[:2]}-{scope_key[2:]}"
    else:
        _fy_short = _fy_long = scope_key

    def _matches_scope(doc_number: str) -> bool:
        normalized = doc_number.replace('/', separator)

        if reset_scope == 'never':
            return True

        has_date_token = False

        # Accept either FY_SHORT ("2627") or long FY ("2026-27") for the same fiscal year
        # so legacy invoices with the old format are not silently excluded.
        if '{FY_SHORT}' in template or '{FY}' in template:
            has_date_token = True
            if _fy_short not in normalized and _fy_long not in normalized:
                return False

        if '{YYYY}' in template:
            has_date_token = True
            if dt is not None and dt.strftime('%Y') not in normalized:
                return False
        if '{YY}' in template:
            has_date_token = True
            if dt is not None and dt.strftime('%y') not in normalized:
                return False
        if reset_scope == 'monthly' and '{MM}' in template:
            has_date_token = True
            if dt is not None and dt.strftime('%m') not in normalized:
                return False

        return True

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                f"SELECT {field_name} FROM {table_name} WHERE company_id = %s",
                [company.id]
            )
            max_seq = 0

            # Find the position of {SEQ} or {NUMBER} in the template
            seq_position = None
            template_parts = template.replace('/', separator).split(separator)
            expected_part_count = len(template_parts)
            for i, part in enumerate(template_parts):
                if '{SEQ}' in part or '{NUMBER}' in part:
                    seq_position = i
                    break

            if seq_position is None:
                seq_position = -1

            for (doc_number,) in cursor.fetchall():
                if doc_number and _matches_scope(doc_number):
                    parts = doc_number.replace('/', separator).split(separator)

                    try:
                        if seq_position == -1:
                            seq_str = parts[-1]
                        else:
                            # Old-format invoices may have more parts than the current template
                            # because their FY ("2026-27") splits into two dash-separated segments
                            # while the new FY_SHORT ("2627") is a single segment.
                            extra = len(parts) - expected_part_count
                            adjusted_pos = seq_position + extra
                            if 0 <= adjusted_pos < len(parts):
                                seq_str = parts[adjusted_pos]
                            elif seq_position < len(parts):
                                seq_str = parts[seq_position]
                            else:
                                continue

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

    dashboard_number = _generate_from_dashboard_numbering(company, module, dt)
    if dashboard_number:
        return dashboard_number

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

        highest_seq = _get_highest_sequence_number(company, module, rule, scope_key, dt)
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
