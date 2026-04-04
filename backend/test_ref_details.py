#!/usr/bin/env python3
"""
Diagnostic: find why reference_details is empty in PDF output.
Run from backend dir with the venv active.
"""
import os, sys, traceback

# Patch settings DEBUG issue
import decouple
_orig = decouple.config.__call__
def _patched(self, key, default=decouple.undefined, cast=None):
    if key == 'DEBUG':
        return False
    return _orig(self, key, default=default, cast=cast)
decouple.Config.__call__ = _patched

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
import django
django.setup()

from finance.models import Invoice
from finance.invoice_service import InvoicePDFService

PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
INFO = "\033[94mℹ\033[0m"

print("\n=== Finding invoices with PO or Quotation links ===")

# Find invoices that have a PO or quotation
inv_with_po = Invoice.objects.filter(
    purchase_order__isnull=False, is_rejected=False
).select_related('purchase_order', 'quotation', 'customer', 'company').first()

inv_with_qt = Invoice.objects.filter(
    quotation__isnull=False, purchase_order__isnull=True, is_rejected=False
).select_related('purchase_order', 'quotation', 'customer', 'company').first()

inv_direct = Invoice.objects.filter(
    purchase_order__isnull=True, quotation__isnull=True, is_rejected=False
).select_related('customer', 'company').first()

def test_invoice(inv, label):
    if not inv:
        print(f"\n  {INFO} No {label} invoice found — skipping")
        return
    print(f"\n--- {label}: {inv.invoice_number} ---")
    print(f"  purchase_order_id: {inv.purchase_order_id}")
    print(f"  quotation_id:      {inv.quotation_id}")
    print(f"  reference:         {inv.reference}")

    # Test accessing purchase_order
    try:
        po = inv.purchase_order
        if po:
            print(f"  {PASS} purchase_order accessible: {po.po_number} / {po.internal_po_number}")
        else:
            print(f"  {INFO} purchase_order is None")
    except Exception as e:
        print(f"  {FAIL} purchase_order access ERROR: {e}")

    # Test accessing quotation
    try:
        qt = inv.quotation
        if qt:
            print(f"  {PASS} quotation accessible: {qt.quotation_number}")
        else:
            print(f"  {INFO} quotation is None")
    except Exception as e:
        print(f"  {FAIL} quotation access ERROR: {e}")

    # Test _get_reference_details
    svc = InvoicePDFService()
    try:
        rd = svc._get_reference_details(inv)
        print(f"  {PASS} _get_reference_details returned:")
        print(f"       manual_reference: {rd['manual_reference']!r}")
        print(f"       quotation:        {rd['quotation']}")
        print(f"       purchase_order:   {rd['purchase_order']}")
        print(f"       previous_invoices count: {len(rd['previous_invoices'])}")
    except Exception as e:
        print(f"  {FAIL} _get_reference_details ERROR: {e}")
        traceback.print_exc()

    # Test prepare_invoice_context
    try:
        ctx = svc.prepare_invoice_context(inv)
        rd2 = ctx.get('reference_details', 'MISSING')
        if rd2 == 'MISSING':
            print(f"  {FAIL} reference_details NOT in context!")
        else:
            print(f"  {PASS} reference_details in context: quot={rd2['quotation'] is not None}, po={rd2['purchase_order'] is not None}")
    except Exception as e:
        print(f"  {FAIL} prepare_invoice_context ERROR: {e}")
        traceback.print_exc()

test_invoice(inv_with_po, "Invoice with PO")
test_invoice(inv_with_qt, "Invoice with Quotation")
test_invoice(inv_direct, "Direct Invoice")

print("\n=== Testing invoice_pdf_service._prepare_context ===")
from finance.invoice_pdf_service import InvoicePDFService as OuterPDFService
outer = OuterPDFService()

for inv, label in [(inv_with_po, "PO invoice"), (inv_with_qt, "Quotation invoice"), (inv_direct, "Direct invoice")]:
    if not inv:
        continue
    print(f"\n  {label}: {inv.invoice_number}")
    try:
        ctx = outer._prepare_context(inv)
        rd = ctx.get('reference_details', 'MISSING')
        if rd == 'MISSING':
            print(f"    {FAIL} reference_details MISSING from _prepare_context output!")
        else:
            print(f"    {PASS} reference_details present: quot={rd['quotation'] is not None}, po={rd['purchase_order'] is not None}, prev={len(rd['previous_invoices'])}")
    except Exception as e:
        print(f"    {FAIL} _prepare_context ERROR: {e}")
        traceback.print_exc()

print()
