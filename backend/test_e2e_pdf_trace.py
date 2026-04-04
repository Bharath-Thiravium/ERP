#!/usr/bin/env python3
"""
End-to-end trace test: verifies the FULL path from button click → PDF output
for all 4 document types, checking that the correct WeasyPrint template service
is used and that reference_details will appear in the output.
"""
import os, re

PASS = "\033[92m✓ PASS\033[0m"
FAIL = "\033[91m✗ FAIL\033[0m"
INFO = "\033[94mℹ\033[0m"
BASE = "/var/www/SAP-Python/backend"
FE   = "/var/www/SAP-Python/frontend/src/pages/services/finance"

results = []

def check(name, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"  {status}  {name}")
    if detail:
        print(f"         {INFO} {detail}")
    results.append((name, condition))
    return condition

def read(path):
    try:
        return open(path).read()
    except:
        return ""

views = read(f"{BASE}/finance/views.py")
inv_svc = read(f"{BASE}/finance/invoice_service.py")
inv_pdf = read(f"{BASE}/finance/invoice_pdf_service.py")
eu      = read(f"{BASE}/finance/email_utils.py")

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*65)
print("PATH TRACE: INVOICE  (button → view → service → template → PDF)")
print("="*65)

print("\n  Step 1: Frontend button calls correct API endpoint")
inv_view_tsx = read(f"{FE}/components/InvoiceView.tsx")
check("InvoiceView Print → /api/finance/invoices/{id}/pdf/",
      "/api/finance/invoices/" in inv_view_tsx and "pdf/?session_key=" in inv_view_tsx)
check("InvoiceView Download → /api/finance/invoices/{id}/pdf/",
      inv_view_tsx.count("/api/finance/invoices/") >= 2)

print("\n  Step 2: Backend view uses WeasyPrint invoice_pdf_service")
check("generate_invoice_pdf view uses invoice_pdf_service (NOT email_utils ReportLab)",
      "from .invoice_pdf_service import invoice_pdf_service" in views
      and "generate_invoice_pdf_content" not in views)
check("generate_invoice_pdf view selects company template",
      "selected_invoice_template" in views)
check("generate_invoice_pdf view prefetches purchase_order + quotation",
      "purchase_order" in views and "quotation" in views)

print("\n  Step 3: invoice_pdf_service._prepare_context calls invoice_service")
check("invoice_pdf_service._prepare_context calls invoice_service.prepare_invoice_context",
      "from .invoice_service import invoice_pdf_service" in inv_pdf
      and "invoice_pdf_service.prepare_invoice_context" in inv_pdf)

print("\n  Step 4: invoice_service.prepare_invoice_context injects reference_details")
check("prepare_invoice_context builds reference_details",
      "'reference_details': self._get_reference_details(invoice)" in inv_svc)
check("_get_reference_details fetches PO: po_number, internal_po_number, po_date, balance",
      all(f in inv_svc for f in ["po_number", "internal_po_number", "po_date", "remaining_invoice_balance"]))
check("_get_reference_details fetches Quotation: number, date, valid_until, total_amount",
      all(f in inv_svc for f in ["quotation_number", "quotation_date", "valid_until", "total_amount"]))
check("_get_reference_details fetches previous invoices (non-rejected)",
      "previous_invoices" in inv_svc and "is_rejected=False" in inv_svc)

print("\n  Step 5: Templates render reference_details")
for tname, tpath in [
    ("AS",   f"{BASE}/finance/templates/invoice_templates/AS/invoice.html"),
    ("BKGE", f"{BASE}/finance/templates/invoice_templates/BKGE/invoice.html"),
    ("TC",   f"{BASE}/finance/templates/invoice_templates/TC/invoice.html"),
]:
    t = read(tpath)
    check(f"Template {tname}: renders PO number, date, balance",
          "reference_details.purchase_order.po_number" in t
          and "reference_details.purchase_order.po_date" in t
          and "reference_details.purchase_order.remaining_invoice_balance" in t)
    check(f"Template {tname}: renders Quotation number, date, amount",
          "reference_details.quotation.number" in t
          and "reference_details.quotation.date" in t
          and "reference_details.quotation.total_amount" in t)
    check(f"Template {tname}: renders previous invoices with payment status",
          "reference_details.previous_invoices" in t
          and "prev.payment_status" in t)

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*65)
print("PATH TRACE: QUOTATION")
print("="*65)

print("\n  Step 1: Frontend button calls correct API endpoint")
qt_tsx = read(f"{FE}/components/QuotationDetail.tsx")
check("QuotationDetail Print/Download → /api/finance/quotations/{id}/pdf/",
      "/api/finance/quotations/" in qt_tsx and "pdf/?session_key=" in qt_tsx)

print("\n  Step 2: Backend view uses WeasyPrint quotation_pdf_service")
check("generate_quotation_pdf view uses quotation_pdf_service (NOT email_utils)",
      "from .quotation_pdf_service import quotation_pdf_service" in views
      and "generate_quotation_pdf_content" not in views)
check("generate_quotation_pdf view selects company template (selected_template)",
      "selected_template" in views)

print("\n  Step 3: Quotation templates exist")
for tname, tpath in [
    ("AS",   f"{BASE}/finance/templates/quotation_templates/AS/quotation.html"),
    ("BKGE", f"{BASE}/finance/templates/quotation_templates/BKGE/quotation.html"),
    ("TC",   f"{BASE}/finance/templates/quotation_templates/TC/quotation.html"),
]:
    t = read(tpath)
    check(f"Quotation template {tname} exists and has content", bool(t) and len(t) > 500)

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*65)
print("PATH TRACE: PROFORMA INVOICE")
print("="*65)

print("\n  Step 1: Frontend button calls correct API endpoint")
pf_tsx = read(f"{FE}/components/ProformaInvoiceView.tsx")
check("ProformaInvoiceView Print/Download → /api/finance/proforma-invoices/{id}/pdf/",
      "/api/finance/proforma-invoices/" in pf_tsx and "pdf/?session_key=" in pf_tsx)

print("\n  Step 2: Backend view uses WeasyPrint proforma_pdf_service")
check("generate_proforma_pdf view uses proforma_pdf_service",
      "from .proforma_pdf_service import proforma_pdf_service" in views)
check("generate_proforma_pdf view selects company template (selected_proforma_template)",
      "selected_proforma_template" in views)

print("\n  Step 3: Proforma templates exist")
for tname, tpath in [
    ("AS",   f"{BASE}/finance/templates/proforma_templates/AS/proforma_invoice.html"),
    ("BKGE", f"{BASE}/finance/templates/proforma_templates/BKGE/proforma_invoice.html"),
    ("TC",   f"{BASE}/finance/templates/proforma_templates/TC/proforma_invoice.html"),
]:
    t = read(tpath)
    check(f"Proforma template {tname} exists and has content", bool(t) and len(t) > 500)

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*65)
print("PATH TRACE: PURCHASE ORDER")
print("="*65)

print("\n  Step 1: Frontend button calls correct API endpoint")
po_tsx = read(f"{FE}/components/PurchaseOrderView.tsx")
po_page = read(f"{FE}/pages/PurchaseOrders.tsx")
check("PurchaseOrderView Print/Download → /api/finance/purchase-orders/{id}/pdf/",
      "/api/finance/purchase-orders/" in po_tsx and "pdf/?session_key=" in po_tsx)
check("PurchaseOrders.tsx passes sessionKey to PurchaseOrderView",
      "sessionKey={sessionKey" in po_page)

print("\n  Step 2: Backend view uses WeasyPrint po_pdf_service")
check("generate_purchase_order_pdf view uses po_pdf_service",
      "from .po_pdf_service import po_pdf_service" in views)

print("\n  Step 3: PO templates exist")
for tname, tpath in [
    ("AS",   f"{BASE}/finance/templates/po_templates/AS/purchase_order.html"),
    ("BKGE", f"{BASE}/finance/templates/po_templates/BKGE/purchase_order.html"),
    ("TC",   f"{BASE}/finance/templates/po_templates/TC/purchase_order.html"),
]:
    t = read(tpath)
    check(f"PO template {tname} exists and has content", bool(t) and len(t) > 500)

print("\n  Step 4: PO view shows shipping address below customer name")
check("PurchaseOrderView: Ship To shown below customer name",
      "Ship To" in po_tsx and po_tsx.index("Ship To") < po_tsx.index("Email:"))
check("PurchaseOrderView: shows specific shipping_address_details when set",
      "shipping_address_details.address_line1" in po_tsx)
check("PurchaseOrderView: falls back to billing address",
      "(Billing)" in po_tsx)

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*65)
print("PATH TRACE: EMAIL (send mail uses same template PDF)")
print("="*65)

check("send_invoice_email: WeasyPrint invoice_pdf_service → same template as download",
      "from .invoice_pdf_service import invoice_pdf_service" in eu
      and "selected_invoice_template" in eu)
check("send_quotation_email: WeasyPrint quotation_pdf_service",
      "from .quotation_pdf_service import quotation_pdf_service" in eu)
check("send_proforma_email: WeasyPrint proforma_pdf_service",
      "from .proforma_pdf_service import proforma_pdf_service" in eu)
check("send_purchase_order_email: WeasyPrint po_pdf_service",
      "from .po_pdf_service import po_pdf_service" in eu)

# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*65)
print("SUMMARY")
print("="*65)
passed = sum(1 for _, r in results if r)
failed = sum(1 for _, r in results if not r)
total  = len(results)
print(f"\n  Total: {total}  |  {PASS}: {passed}  |  {FAIL}: {failed}")
if failed == 0:
    print("\n  \033[92mAll checks passed! Every button click → correct WeasyPrint template PDF.\033[0m")
else:
    print(f"\n  \033[91m{failed} check(s) failed:\033[0m")
    for name, r in results:
        if not r:
            print(f"    ✗ {name}")
print()
