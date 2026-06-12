#!/usr/bin/env python3
"""Hard delete Proforma Invoices by proforma_number and update related balances.

Target proforma numbers:
- TC-PRO-2627-000001
- TC-PRO-2627-000002

This script will:
1) Find the ProformaInvoice records.
2) Collect related PO(s) and Quotation(s).
3) Delete in a transaction:
   - ProformaInvoiceItem rows
   - Any Payment rows linked to the proforma (if model uses proforma_invoice FK)
   - The ProformaInvoice rows
4) Recalculate/update balance tracking on affected PO(s) and Quotation(s).

Run:
  cd /var/www/SAP-Python/backend
  source venv/bin/activate
  python ../delete_proforma_invoices_2627.py
"""

import os
import sys
from decimal import Decimal

import django
from django.db import transaction

sys.path.append('/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')

django.setup()

from finance.models import ProformaInvoice, ProformaInvoiceItem, Payment, PurchaseOrder, Quotation


TARGET_PROFORMA_NUMBERS = [
    'TC-PRO-2627-000001',
    'TC-PRO-2627-000002',
]


def recalc_po_and_quotation(po: PurchaseOrder | None, quotation: Quotation | None):
    if po is not None:
        po.update_balance_tracking()
    if quotation is not None:
        quotation.update_balance_tracking()


def main():
    affected_pos = set()
    affected_quotations = set()

    proformas = list(ProformaInvoice.objects.select_related('purchase_order', 'quotation').filter(
        proforma_number__in=TARGET_PROFORMA_NUMBERS
    ))

    found_numbers = {p.proforma_number for p in proformas}
    missing = [n for n in TARGET_PROFORMA_NUMBERS if n not in found_numbers]

    print('=' * 80)
    print('Hard deleting proforma invoices:')
    for n in TARGET_PROFORMA_NUMBERS:
        print(' -', n, '(FOUND)' if n in found_numbers else '(MISSING)')
    print('=' * 80)

    if not proformas:
        print('No matching proforma invoices found. Exiting.')
        if missing:
            print('Missing:', ', '.join(missing))
        return 1

    for p in proformas:
        affected_pos.add(p.purchase_order_id)
        affected_quotations.add(p.quotation_id)

    with transaction.atomic():
        # Delete proforma items first (if FK not cascading/hard delete order matters)
        item_qs = ProformaInvoiceItem.objects.filter(
            proforma_invoice_id__in=[p.id for p in proformas]
        )
        print(f'Deleting {item_qs.count()} proforma invoice items...')
        item_qs.delete()

        # Delete payments linked to these proformas (if any)
        payments_qs = Payment.objects.filter(
            proforma_invoice_id__in=[p.id for p in proformas]
        )
        print(f'Deleting {payments_qs.count()} proforma-linked payments...')
        payments_qs.delete()

        print(f'Deleting {len(proformas)} proforma invoice records...')
        ProformaInvoice.objects.filter(id__in=[p.id for p in proformas]).delete()

    # Recalculate balances
    print('Recalculating balance tracking on affected PO(s) and Quotation(s)...')

    for po_id in affected_pos:
        if po_id is None:
            continue
        po = PurchaseOrder.objects.filter(id=po_id).first()
        if po:
            po.update_balance_tracking()

    for q_id in affected_quotations:
        if q_id is None:
            continue
        q = Quotation.objects.filter(id=q_id).first()
        if q:
            q.update_balance_tracking()

    print('Done.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

