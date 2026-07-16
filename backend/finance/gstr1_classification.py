"""
Gstr1ClassificationService — pure classification logic, no DB access.
"""
from decimal import Decimal
from .gstr1_constants import (
    POS_MAP, UNIT_TO_UQC, UQC_FULL,
    INVOICE_TYPE_REGULAR, INVOICE_TYPE_SEZ_WPAY, INVOICE_TYPE_SEZ_WOPAY,
    INVOICE_TYPE_DEEMED_EXP, INVOICE_TYPE_INTRA_IGST,
    DOC_NATURE_OUTWARD, DOC_NATURE_CREDIT, DOC_NATURE_DEBIT,
)


class Gstr1ClassificationService:

    # ── Place of Supply ──────────────────────────────────────────────────────

    @staticmethod
    def resolve_pos(invoice, company_state_code: str) -> str:
        """
        Resolve 2-digit state code for place of supply.
        Priority: invoice.place_of_supply → customer GSTIN prefix → customer state_code → billing_state lookup
        Returns the full POS string like '33-Tamil Nadu' or raises ValueError.
        """
        code = (invoice.place_of_supply or '').strip()
        if not code and invoice.customer_gstin:
            code = invoice.customer_gstin[:2]
        if not code and invoice.customer.state_code:
            code = invoice.customer.state_code.strip()
        if not code:
            code = Gstr1ClassificationService._state_name_to_code(
                invoice.customer.billing_state or ''
            )
        if not code or code not in POS_MAP:
            raise ValueError(
                f"Cannot determine valid place of supply for invoice {invoice.invoice_number}. "
                f"Raw value: '{invoice.place_of_supply}'"
            )
        return POS_MAP[code]

    @staticmethod
    def _state_name_to_code(state_name: str) -> str:
        name = state_name.strip().lower()
        _lookup = {
            'jammu and kashmir': '01', 'jammu & kashmir': '01',
            'himachal pradesh': '02', 'punjab': '03', 'chandigarh': '04',
            'uttarakhand': '05', 'uttaranchal': '05', 'haryana': '06',
            'delhi': '07', 'new delhi': '07', 'rajasthan': '08',
            'uttar pradesh': '09', 'up': '09', 'bihar': '10', 'sikkim': '11',
            'arunachal pradesh': '12', 'nagaland': '13', 'manipur': '14',
            'mizoram': '15', 'tripura': '16', 'meghalaya': '17', 'assam': '18',
            'west bengal': '19', 'jharkhand': '20', 'odisha': '21', 'orissa': '21',
            'chhattisgarh': '22', 'madhya pradesh': '23', 'mp': '23',
            'gujarat': '24', 'daman and diu': '25', 'daman & diu': '25',
            'dadra and nagar haveli': '26', 'maharashtra': '27',
            'andhra pradesh': '28', 'karnataka': '29', 'goa': '30',
            'lakshadweep': '31', 'kerala': '32', 'tamil nadu': '33',
            'tamilnadu': '33', 'tn': '33', 'puducherry': '34', 'pondicherry': '34',
            'andaman and nicobar islands': '35', 'telangana': '36',
            'andhra pradesh (new)': '37', 'ladakh': '38',
        }
        return _lookup.get(name, '')

    # ── Invoice type (B2B sheet column I) ────────────────────────────────────

    @staticmethod
    def get_invoice_type(invoice, company_state_code: str) -> str:
        """Determine the GSTR-1 invoice type string."""
        supply_type = (getattr(invoice, 'gst_supply_type', '') or '').strip()
        if supply_type:
            return supply_type

        # Derive from gst_type and state codes
        customer_gstin = (invoice.customer_gstin or '').strip()
        if not customer_gstin:
            return INVOICE_TYPE_REGULAR  # fallback; B2CS handled separately

        customer_state = customer_gstin[:2] if len(customer_gstin) >= 2 else ''
        gst_type = invoice.gst_type or ''

        if gst_type == 'igst' and customer_state == company_state_code:
            return INVOICE_TYPE_INTRA_IGST
        return INVOICE_TYPE_REGULAR

    # ── B2B vs B2CS classification ────────────────────────────────────────────

    @staticmethod
    def is_b2b(invoice) -> bool:
        gstin = (invoice.customer_gstin or '').strip()
        return bool(gstin) and len(gstin) == 15 and invoice.invoice_type == 'tax_invoice'

    @staticmethod
    def is_b2cs(invoice) -> bool:
        gstin = (invoice.customer_gstin or '').strip()
        return (not gstin) and invoice.invoice_type == 'tax_invoice'

    @staticmethod
    def is_cdnr(invoice) -> bool:
        gstin = (invoice.customer_gstin or '').strip()
        return bool(gstin) and invoice.invoice_type in ('credit_note', 'debit_note')

    @staticmethod
    def is_cdnra(invoice) -> bool:
        return (
            getattr(invoice, 'is_amendment', False)
            and invoice.invoice_type in ('credit_note', 'debit_note')
            and bool((invoice.customer_gstin or '').strip())
            and bool((getattr(invoice, 'original_document_number', '') or '').strip())
        )

    # ── Note type ─────────────────────────────────────────────────────────────

    @staticmethod
    def get_note_type(invoice) -> str:
        return 'C' if invoice.invoice_type == 'credit_note' else 'D'

    # ── UQC mapping ───────────────────────────────────────────────────────────

    @staticmethod
    def map_uqc(unit_code: str) -> str:
        """
        Map system unit code to GST UQC.
        Returns the full UQC string like 'NOS-NUMBERS'.
        Raises ValueError if no mapping found.
        """
        key = (unit_code or '').strip().upper()
        uqc = UNIT_TO_UQC.get(key)
        if not uqc:
            raise ValueError(
                f"No UQC mapping for unit '{unit_code}'. "
                "Add it to UNIT_TO_UQC in gstr1_constants.py or set unit to 'OTH'."
            )
        return UQC_FULL[uqc]

    # ── Reverse charge ────────────────────────────────────────────────────────

    @staticmethod
    def get_reverse_charge(invoice) -> str:
        return 'Y' if getattr(invoice, 'reverse_charge_applicable', False) else 'N'

    # ── Nature of document ────────────────────────────────────────────────────

    @staticmethod
    def get_doc_nature(invoice_type: str) -> str:
        mapping = {
            'tax_invoice': DOC_NATURE_OUTWARD,
            'credit_note': DOC_NATURE_CREDIT,
            'debit_note': DOC_NATURE_DEBIT,
        }
        return mapping.get(invoice_type, DOC_NATURE_OUTWARD)
