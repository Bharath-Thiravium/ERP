"""Disabled document numbering reset utility."""


RESET_DISABLED_MESSAGE = (
    'Counter reset is disabled in production to prevent document number reuse. '
    'Create a new financial-year configuration for a new sequence.'
)


def reset_document_counter(company_id, document_type, service_id=None, financial_year=None):
    """Counter reset is intentionally blocked for sales-safe numbering."""
    raise ValueError(RESET_DISABLED_MESSAGE)


def reset_all_counters_for_company(company_id):
    """Counter reset is intentionally blocked for sales-safe numbering."""
    raise ValueError(RESET_DISABLED_MESSAGE)
