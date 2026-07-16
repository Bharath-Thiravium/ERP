"""
Gstr1ValidationService — validates invoices before export.
Returns lists of blocking errors and warnings.
"""
import re
from decimal import Decimal
from dataclasses import dataclass, field
from typing import List
from .gstr1_constants import VALID_STATE_CODES, VALID_GST_RATES, ROUNDING_TOLERANCE, POS_MAP
from .gstr1_classification import Gstr1ClassificationService


@dataclass
class ValidationIssue:
    document_number: str
    document_date: str
    customer: str
    gstin: str
    validation_field: str
    current_value: str
    error_message: str
    suggested_action: str
    is_blocking: bool = True


@dataclass
class ValidationResult:
    blocking: List[ValidationIssue] = field(default_factory=list)
    warnings: List[ValidationIssue] = field(default_factory=list)

    @property
    def has_blocking(self):
        return bool(self.blocking)

    def add(self, issue: ValidationIssue):
        if issue.is_blocking:
            self.blocking.append(issue)
        else:
            self.warnings.append(issue)

    def to_dict(self):
        return {
            'has_blocking_errors': self.has_blocking,
            'blocking_count': len(self.blocking),
            'warning_count': len(self.warnings),
            'blocking': [vars(i) for i in self.blocking],
            'warnings': [vars(i) for i in self.warnings],
        }


GSTIN_RE = re.compile(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$')


class Gstr1ValidationService:

    def validate_all(self, invoices, company_gstin: str, company_state_code: str) -> ValidationResult:
        result = ValidationResult()
        seen_numbers = {}

        if not company_gstin or len(company_gstin) != 15:
            result.add(ValidationIssue(
                document_number='N/A', document_date='N/A', customer='Company',
                gstin=company_gstin or '', validation_field='Company GSTIN',
                current_value=company_gstin or '',
                error_message='Company GSTIN is missing or not 15 characters.',
                suggested_action='Update company profile with valid GSTIN.',
            ))

        for inv in invoices:
            self._validate_invoice(inv, result, seen_numbers, company_gstin, company_state_code)

        return result

    def _validate_invoice(self, inv, result, seen_numbers, company_gstin, company_state_code):
        num = inv.invoice_number or ''
        date_str = str(inv.invoice_date) if inv.invoice_date else ''
        cust = inv.customer.name if inv.customer else ''
        gstin = (inv.customer_gstin or '').strip()

        def issue(field, val, msg, action, blocking=True):
            result.add(ValidationIssue(
                document_number=num, document_date=date_str,
                customer=cust, gstin=gstin,
                validation_field=field, current_value=str(val),
                error_message=msg, suggested_action=action,
                is_blocking=blocking,
            ))

        # Invoice number
        if not num:
            issue('Invoice Number', '', 'Invoice number is missing.', 'Add invoice number.')
            return
        if len(num) > 16:
            issue('Invoice Number', num,
                  f'Invoice number exceeds 16 characters ({len(num)}).',
                  'Shorten invoice number to max 16 characters.')

        # Duplicate check
        key = (company_gstin, inv.invoice_type, num)
        if key in seen_numbers:
            issue('Duplicate Invoice', num,
                  f'Duplicate invoice number {num} found.',
                  'Remove duplicate invoice.')
        else:
            seen_numbers[key] = True

        # Invoice date
        if not inv.invoice_date:
            issue('Invoice Date', '', 'Invoice date is missing.', 'Set invoice date.')

        # Customer GSTIN for B2B
        if gstin:
            if len(gstin) != 15:
                issue('Customer GSTIN', gstin,
                      f'Customer GSTIN must be 15 characters, got {len(gstin)}.',
                      'Correct GSTIN in customer master.')
            elif not GSTIN_RE.match(gstin):
                issue('Customer GSTIN', gstin,
                      'Customer GSTIN format is invalid.',
                      'Correct GSTIN in customer master.')

        # Place of supply
        try:
            Gstr1ClassificationService.resolve_pos(inv, company_state_code)
        except ValueError as e:
            issue('Place of Supply', inv.place_of_supply or '',
                  str(e), 'Set place_of_supply on invoice or update customer state.')

        # Taxable value
        if inv.subtotal < 0:
            issue('Taxable Value', inv.subtotal, 'Taxable value is negative.', 'Correct invoice amounts.')

        # Invoice value
        if inv.total_amount < 0:
            issue('Invoice Value', inv.total_amount, 'Invoice total is negative.', 'Correct invoice amounts.')

        # Tax consistency
        igst = Decimal(str(inv.igst_amount or 0))
        cgst = Decimal(str(inv.cgst_amount or 0))
        sgst = Decimal(str(inv.sgst_amount or 0))
        gst_type = inv.gst_type or ''

        if gst_type == 'igst' and (cgst > 0 or sgst > 0):
            issue('Tax Combination', f'IGST={igst} CGST={cgst} SGST={sgst}',
                  'Inter-state invoice has CGST/SGST amounts.',
                  'Verify tax type and amounts.', blocking=False)
        if gst_type == 'cgst_sgst' and igst > 0:
            issue('Tax Combination', f'IGST={igst} CGST={cgst} SGST={sgst}',
                  'Intra-state invoice has IGST amount.',
                  'Verify tax type and amounts.', blocking=False)

        # Invoice total reconciliation
        cess = Decimal(str(getattr(inv, 'cess_amount', 0) or 0))
        calc_total = inv.subtotal + igst + cgst + sgst + cess
        diff = abs(Decimal(str(inv.total_amount)) - calc_total)
        if diff > Decimal(str(ROUNDING_TOLERANCE)):
            issue('Invoice Total Mismatch', f'DB={inv.total_amount} Calc={calc_total}',
                  f'Invoice total differs from sum of components by ₹{diff}.',
                  'Recalculate invoice totals.', blocking=False)

        # Line items
        for item in inv.invoice_items.all():
            self._validate_item(item, inv, result)

    def _validate_item(self, item, inv, result):
        num = inv.invoice_number
        date_str = str(inv.invoice_date)
        cust = inv.customer.name if inv.customer else ''
        gstin = (inv.customer_gstin or '').strip()

        def issue(field, val, msg, action, blocking=True):
            result.add(ValidationIssue(
                document_number=num, document_date=date_str,
                customer=cust, gstin=gstin,
                validation_field=field, current_value=str(val),
                error_message=msg, suggested_action=action,
                is_blocking=blocking,
            ))

        # HSN/SAC
        hsn = (item.hsn_sac_code or '').strip()
        if not hsn:
            issue('HSN/SAC', '', f'Line {item.line_number}: HSN/SAC code is missing.',
                  'Set HSN/SAC on product master.')

        # UQC
        try:
            Gstr1ClassificationService.map_uqc(item.unit or '')
        except ValueError as e:
            issue('UQC', item.unit or '', str(e),
                  'Map unit to a valid GST UQC in gstr1_constants.py.')

        # GST rate
        rate = float(item.gst_rate or 0)
        if rate not in VALID_GST_RATES and rate != 0:
            issue('GST Rate', rate,
                  f'Line {item.line_number}: GST rate {rate}% is not in the valid rate list.',
                  'Use a valid GST rate: 0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 7.5, 12, 18, 28, 40.',
                  blocking=False)

        # Taxable value
        if item.line_total < 0:
            issue('Line Taxable Value', item.line_total,
                  f'Line {item.line_number}: taxable value is negative.',
                  'Correct line item amount.')
