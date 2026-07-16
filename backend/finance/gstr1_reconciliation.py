"""
Gstr1ReconciliationService — builds the reconciliation summary shown before download.
"""
from decimal import Decimal
from collections import defaultdict


class Gstr1ReconciliationService:

    def build(self, b2b_rows, b2cs_rows, cdnr_rows, cdnra_rows,
              hsn_b2b_rows, hsn_b2c_rows, docs_rows) -> dict:

        def _sum(rows, key):
            return sum(Decimal(str(r.get(key, 0) or 0)) for r in rows)

        b2b_taxable = _sum(b2b_rows, 'taxable_value')
        b2b_invoice_val = sum(
            Decimal(str(r.get('invoice_value', 0) or 0))
            for r in b2b_rows
            if r.get('_is_first_rate_row', True)
        )
        b2cs_taxable = _sum(b2cs_rows, 'taxable_value')
        cdnr_val = _sum(cdnr_rows, 'note_value')
        cdnra_val = _sum(cdnra_rows, 'note_value')
        hsn_b2b_taxable = _sum(hsn_b2b_rows, 'taxable_value')
        hsn_b2c_taxable = _sum(hsn_b2c_rows, 'taxable_value')

        total_igst = _sum(hsn_b2b_rows, 'igst') + _sum(hsn_b2c_rows, 'igst')
        total_cgst = _sum(hsn_b2b_rows, 'cgst') + _sum(hsn_b2c_rows, 'cgst')
        total_sgst = _sum(hsn_b2b_rows, 'sgst') + _sum(hsn_b2c_rows, 'sgst')
        total_cess = _sum(hsn_b2b_rows, 'cess') + _sum(hsn_b2c_rows, 'cess')

        total_docs = sum(r.get('total_number', 0) for r in docs_rows)
        total_cancelled = sum(r.get('cancelled', 0) for r in docs_rows)

        b2b_hsn_diff = b2b_taxable - hsn_b2b_taxable
        b2c_hsn_diff = b2cs_taxable - hsn_b2c_taxable

        return {
            'b2b_invoice_count': len({r['invoice_number'] for r in b2b_rows}),
            'b2b_invoice_value': float(b2b_invoice_val),
            'b2b_taxable_value': float(b2b_taxable),
            'b2cs_taxable_value': float(b2cs_taxable),
            'cdnr_count': len({r['note_number'] for r in cdnr_rows}),
            'cdnr_value': float(cdnr_val),
            'cdnra_count': len({r['revised_note_number'] for r in cdnra_rows}),
            'cdnra_value': float(cdnra_val),
            'hsn_b2b_taxable': float(hsn_b2b_taxable),
            'hsn_b2c_taxable': float(hsn_b2c_taxable),
            'total_igst': float(total_igst),
            'total_cgst': float(total_cgst),
            'total_sgst_utgst': float(total_sgst),
            'total_cess': float(total_cess),
            'total_docs_issued': total_docs,
            'total_docs_cancelled': total_cancelled,
            'reconciliation': {
                'b2b_vs_hsn_b2b_diff': float(b2b_hsn_diff),
                'b2c_vs_hsn_b2c_diff': float(b2c_hsn_diff),
                'b2b_hsn_match': abs(b2b_hsn_diff) <= Decimal('1.00'),
                'b2c_hsn_match': abs(b2c_hsn_diff) <= Decimal('1.00'),
            },
        }
