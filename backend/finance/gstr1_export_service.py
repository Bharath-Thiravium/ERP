"""
Gstr1ExportService — orchestrates data retrieval and classification.
Produces row dicts for each sheet; does NOT write Excel.
"""
from decimal import Decimal, ROUND_HALF_UP
from collections import defaultdict
from .gstr1_repository import Gstr1DataRepository
from .gstr1_classification import Gstr1ClassificationService
from .gstr1_constants import (
    B2CS_TYPE_OE, DOC_NATURE_OUTWARD, DOC_NATURE_CREDIT, DOC_NATURE_DEBIT,
)


def _d2(val):
    """Round Decimal to 2 places."""
    return Decimal(str(val or 0)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class Gstr1ExportService:

    def __init__(self, company, from_date, to_date, include_cancelled=False):
        self.company = company
        self.from_date = from_date
        self.to_date = to_date
        self.include_cancelled = include_cancelled
        self.company_gstin = (getattr(company, 'gst_number', '') or '').strip()
        self.company_state_code = self.company_gstin[:2] if len(self.company_gstin) >= 2 else ''

    def build_all_sheets(self):
        invoices = list(
            Gstr1DataRepository.get_invoices(
                self.company, self.from_date, self.to_date, self.include_cancelled
            )
        )
        b2b = self._build_b2b(invoices)
        b2cs = self._build_b2cs(invoices)
        cdnr = self._build_cdnr(invoices)
        cdnra = self._build_cdnra(invoices)
        hsn_b2b = self._build_hsn(invoices, b2b_only=True)
        hsn_b2c = self._build_hsn(invoices, b2b_only=False)
        docs = self._build_docs()
        return b2b, b2cs, cdnr, cdnra, hsn_b2b, hsn_b2c, docs

    # ── B2B ──────────────────────────────────────────────────────────────────

    def _build_b2b(self, invoices):
        clf = Gstr1ClassificationService
        # Group: (gstin, inv_number, inv_date, pos, inv_type) → per-rate rows
        groups = defaultdict(lambda: defaultdict(lambda: {'taxable': Decimal(0), 'cess': Decimal(0)}))
        meta = {}

        for inv in invoices:
            if not clf.is_b2b(inv):
                continue
            gstin = inv.customer_gstin.strip()
            try:
                pos = clf.resolve_pos(inv, self.company_state_code)
            except ValueError:
                continue
            inv_type = clf.get_invoice_type(inv, self.company_state_code)
            key = (gstin, inv.invoice_number, str(inv.invoice_date), pos, inv_type)
            meta[key] = {
                'receiver_name': inv.customer.name,
                'invoice_value': _d2(inv.total_amount),
                'reverse_charge': clf.get_reverse_charge(inv),
                'ecommerce_gstin': (getattr(inv, 'ecommerce_gstin', '') or '').strip(),
            }
            for item in inv.invoice_items.all():
                rate = _d2(item.gst_rate)
                groups[key][rate]['taxable'] += _d2(item.line_total)
                groups[key][rate]['cess'] += _d2(getattr(item, 'cess_amount', 0) or 0)

        rows = []
        for key, rate_map in groups.items():
            gstin, inv_num, inv_date, pos, inv_type = key
            m = meta[key]
            first = True
            for rate, amounts in sorted(rate_map.items()):
                rows.append({
                    'gstin': gstin,
                    'receiver_name': m['receiver_name'],
                    'invoice_number': inv_num,
                    'invoice_date': inv_date,
                    'invoice_value': m['invoice_value'],
                    'place_of_supply': pos,
                    'reverse_charge': m['reverse_charge'],
                    'diff_percent': '',
                    'invoice_type': inv_type,
                    'ecommerce_gstin': m['ecommerce_gstin'],
                    'rate': float(rate),
                    'taxable_value': float(amounts['taxable']),
                    'cess_amount': float(amounts['cess']),
                    '_is_first_rate_row': first,
                })
                first = False
        return rows

    # ── B2CS ─────────────────────────────────────────────────────────────────

    def _build_b2cs(self, invoices):
        clf = Gstr1ClassificationService
        # Group: (type, pos, diff_pct, rate, ecom_gstin)
        groups = defaultdict(lambda: {'taxable': Decimal(0), 'cess': Decimal(0)})

        for inv in invoices:
            if not clf.is_b2cs(inv):
                continue
            try:
                pos = clf.resolve_pos(inv, self.company_state_code)
            except ValueError:
                continue
            ecom = (getattr(inv, 'ecommerce_gstin', '') or '').strip()
            for item in inv.invoice_items.all():
                rate = _d2(item.gst_rate)
                key = (B2CS_TYPE_OE, pos, '', float(rate), ecom)
                groups[key]['taxable'] += _d2(item.line_total)
                groups[key]['cess'] += _d2(getattr(item, 'cess_amount', 0) or 0)

        rows = []
        for (b2cs_type, pos, diff_pct, rate, ecom), amounts in groups.items():
            rows.append({
                'type': b2cs_type,
                'place_of_supply': pos,
                'diff_percent': diff_pct,
                'rate': rate,
                'taxable_value': float(amounts['taxable']),
                'cess_amount': float(amounts['cess']),
                'ecommerce_gstin': ecom,
            })
        return rows

    # ── CDNR ─────────────────────────────────────────────────────────────────

    def _build_cdnr(self, invoices):
        clf = Gstr1ClassificationService
        groups = defaultdict(lambda: defaultdict(lambda: {'taxable': Decimal(0), 'cess': Decimal(0)}))
        meta = {}

        for inv in invoices:
            if not clf.is_cdnr(inv) or clf.is_cdnra(inv):
                continue
            gstin = inv.customer_gstin.strip()
            try:
                pos = clf.resolve_pos(inv, self.company_state_code)
            except ValueError:
                continue
            note_type = clf.get_note_type(inv)
            key = (gstin, inv.invoice_number, str(inv.invoice_date), note_type)
            meta[key] = {
                'receiver_name': inv.customer.name,
                'note_value': _d2(inv.total_amount),
                'reverse_charge': clf.get_reverse_charge(inv),
                'place_of_supply': pos,
                'note_supply_type': clf.get_invoice_type(inv, self.company_state_code),
            }
            for item in inv.invoice_items.all():
                rate = _d2(item.gst_rate)
                groups[key][rate]['taxable'] += _d2(item.line_total)
                groups[key][rate]['cess'] += _d2(getattr(item, 'cess_amount', 0) or 0)

        rows = []
        for key, rate_map in groups.items():
            gstin, note_num, note_date, note_type = key
            m = meta[key]
            for rate, amounts in sorted(rate_map.items()):
                rows.append({
                    'gstin': gstin,
                    'receiver_name': m['receiver_name'],
                    'note_number': note_num,
                    'note_date': note_date,
                    'note_type': note_type,
                    'place_of_supply': m['place_of_supply'],
                    'reverse_charge': m['reverse_charge'],
                    'note_supply_type': m['note_supply_type'],
                    'note_value': float(m['note_value']),
                    'diff_percent': '',
                    'rate': float(rate),
                    'taxable_value': float(amounts['taxable']),
                    'cess_amount': float(amounts['cess']),
                })
        return rows

    # ── CDNRA ────────────────────────────────────────────────────────────────

    def _build_cdnra(self, invoices):
        clf = Gstr1ClassificationService
        groups = defaultdict(lambda: defaultdict(lambda: {'taxable': Decimal(0), 'cess': Decimal(0)}))
        meta = {}

        for inv in invoices:
            if not clf.is_cdnra(inv):
                continue
            gstin = inv.customer_gstin.strip()
            try:
                pos = clf.resolve_pos(inv, self.company_state_code)
            except ValueError:
                continue
            note_type = clf.get_note_type(inv)
            orig_num = (getattr(inv, 'original_document_number', '') or '').strip()
            orig_date = str(getattr(inv, 'original_document_date', '') or '')
            key = (gstin, orig_num, orig_date, inv.invoice_number, str(inv.invoice_date), note_type)
            meta[key] = {
                'receiver_name': inv.customer.name,
                'note_value': _d2(inv.total_amount),
                'reverse_charge': clf.get_reverse_charge(inv),
                'place_of_supply': pos,
                'note_supply_type': clf.get_invoice_type(inv, self.company_state_code),
            }
            for item in inv.invoice_items.all():
                rate = _d2(item.gst_rate)
                groups[key][rate]['taxable'] += _d2(item.line_total)
                groups[key][rate]['cess'] += _d2(getattr(item, 'cess_amount', 0) or 0)

        rows = []
        for key, rate_map in groups.items():
            gstin, orig_num, orig_date, rev_num, rev_date, note_type = key
            m = meta[key]
            for rate, amounts in sorted(rate_map.items()):
                rows.append({
                    'gstin': gstin,
                    'receiver_name': m['receiver_name'],
                    'original_note_number': orig_num,
                    'original_note_date': orig_date,
                    'revised_note_number': rev_num,
                    'revised_note_date': rev_date,
                    'note_type': note_type,
                    'place_of_supply': m['place_of_supply'],
                    'reverse_charge': m['reverse_charge'],
                    'note_supply_type': m['note_supply_type'],
                    'note_value': float(m['note_value']),
                    'diff_percent': '',
                    'rate': float(rate),
                    'taxable_value': float(amounts['taxable']),
                    'cess_amount': float(amounts['cess']),
                })
        return rows

    # ── HSN ──────────────────────────────────────────────────────────────────

    def _build_hsn(self, invoices, b2b_only: bool):
        clf = Gstr1ClassificationService
        # Group: (hsn, description, uqc, rate)
        groups = defaultdict(lambda: {
            'qty': Decimal(0), 'total_value': Decimal(0),
            'taxable': Decimal(0), 'igst': Decimal(0),
            'cgst': Decimal(0), 'sgst': Decimal(0), 'cess': Decimal(0),
        })

        for inv in invoices:
            is_b2b = clf.is_b2b(inv)
            if b2b_only and not is_b2b:
                continue
            if not b2b_only and is_b2b:
                continue
            if inv.invoice_type not in ('tax_invoice', 'credit_note', 'debit_note'):
                continue

            igst_rate = Decimal(str(inv.igst_amount or 0))
            cgst_rate = Decimal(str(inv.cgst_amount or 0))
            sgst_rate = Decimal(str(inv.sgst_amount or 0))
            subtotal = Decimal(str(inv.subtotal or 0))

            for item in inv.invoice_items.all():
                hsn = (item.hsn_sac_code or '').strip()
                desc = (item.description or item.product_name or '').strip()
                try:
                    uqc_full = clf.map_uqc(item.unit or '')
                except ValueError:
                    uqc_full = 'OTH-OTHERS'

                rate = _d2(item.gst_rate)
                key = (hsn, desc[:100], uqc_full, float(rate))
                g = groups[key]
                g['qty'] += _d2(item.quantity)
                line = _d2(item.line_total)
                g['taxable'] += line

                # Compute tax from posted invoice totals proportionally
                if subtotal > 0:
                    proportion = line / subtotal
                else:
                    proportion = Decimal(0)

                g['igst'] += (igst_rate * proportion).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                g['cgst'] += (cgst_rate * proportion).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                g['sgst'] += (sgst_rate * proportion).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                g['cess'] += _d2(getattr(item, 'cess_amount', 0) or 0)

                item_tax = g['igst'] + g['cgst'] + g['sgst'] + g['cess']
                g['total_value'] = g['taxable'] + item_tax

        rows = []
        for (hsn, desc, uqc, rate), g in groups.items():
            rows.append({
                'hsn': hsn,
                'description': desc,
                'uqc': uqc,
                'total_quantity': float(g['qty']),
                'total_value': float(g['total_value']),
                'rate': rate,
                'taxable_value': float(g['taxable']),
                'igst': float(g['igst']),
                'cgst': float(g['cgst']),
                'sgst': float(g['sgst']),
                'cess': float(g['cess']),
            })
        return rows

    # ── Docs ─────────────────────────────────────────────────────────────────

    def _build_docs(self):
        series_data = Gstr1DataRepository.get_invoice_series_summary(
            self.company, self.from_date, self.to_date
        )
        clf = Gstr1ClassificationService
        rows = []
        for row in series_data:
            nature = clf.get_doc_nature(row['invoice_type'])
            rows.append({
                'nature': nature,
                'sr_from': row['first_num'] or '',
                'sr_to': row['last_num'] or '',
                'total_number': row['total'],
                'cancelled': row['cancelled'],
            })
        return rows
