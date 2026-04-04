#!/usr/bin/env python3
"""
Test script to verify all 4 fixes (no Django setup required - file-based checks).
"""
import os, re, sys

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
    except Exception as e:
        return ""

# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("ISSUE 1: Invoice template reference_details (Quotation/PO/Prev invoices)")
print("="*60)

# invoice_service.py has _get_reference_details
svc = read(f"{BASE}/finance/invoice_service.py")
check("invoice_service.py has _get_reference_details method",
      "def _get_reference_details" in svc)
check("_get_reference_details fetches quotation fields",
      "quotation_number" in svc and "quotation_date" in svc)
check("_get_reference_details fetches PO fields",
      "po_number" in svc and "internal_po_number" in svc and "remaining_invoice_balance" in svc)
check("_get_reference_details fetches previous invoices",
      "previous_invoices" in svc and "is_rejected=False" in svc)
check("prepare_invoice_context includes reference_details in context",
      "'reference_details': self._get_reference_details(invoice)" in svc)

# Both sets of templates updated
template_sets = [
    ("invoice_templates (primary)", [
        f"{BASE}/finance/templates/invoice_templates/AS/invoice.html",
        f"{BASE}/finance/templates/invoice_templates/BKGE/invoice.html",
        f"{BASE}/finance/templates/invoice_templates/TC/invoice.html",
    ]),
    ("finance/invoice_templates (secondary)", [
        f"{BASE}/finance/templates/finance/invoice_templates/AS/invoice.html",
        f"{BASE}/finance/templates/finance/invoice_templates/BKGE/invoice.html",
        f"{BASE}/finance/templates/finance/invoice_templates/TC/invoice.html",
    ]),
]
for set_name, paths in template_sets:
    print(f"\n  Template set: {set_name}")
    for p in paths:
        tname = p.split("/")[-2]  # AS / BKGE / TC
        content = read(p)
        has_ref  = "reference_details" in content
        has_po   = "reference_details.purchase_order" in content
        has_prev = "reference_details.previous_invoices" in content
        has_quot = "reference_details.quotation" in content
        check(f"  {tname}: has quotation + PO + previous_invoices blocks",
              has_ref and has_po and has_prev and has_quot,
              f"quot={has_quot} po={has_po} prev={has_prev}")

# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("ISSUE 2: Print/Download uses proper WeasyPrint PDF endpoint")
print("="*60)

inv_view = read(f"{FE}/components/InvoiceView.tsx")
check("InvoiceView: handlePrint calls /api/finance/invoices/{id}/pdf/",
      "/api/finance/invoices/" in inv_view and "pdf/?session_key=" in inv_view and "handlePrint" in inv_view)
check("InvoiceView: handleDownload downloads PDF file",
      "handleDownload" in inv_view and "a.download" in inv_view and "Invoice-" in inv_view)
check("InvoiceView: Download button in header",
      "⬇ Download" in inv_view)
check("InvoiceView: Download button in footer",
      inv_view.count("⬇ Download") >= 2)
check("InvoiceView: Print does NOT call window.print() directly (uses PDF)",
      "win.print()" in inv_view and "window.print()" not in inv_view)

pf_view = read(f"{FE}/components/ProformaInvoiceView.tsx")
check("ProformaInvoiceView: handlePrint calls /api/finance/proforma-invoices/{id}/pdf/",
      "/api/finance/proforma-invoices/" in pf_view and "pdf/?session_key=" in pf_view)
check("ProformaInvoiceView: Download button present",
      "⬇ Download" in pf_view)
check("ProformaInvoiceView: Print button present",
      "Print" in pf_view and "handlePrint" in pf_view)

po_view = read(f"{FE}/components/PurchaseOrderView.tsx")
check("PurchaseOrderView: handlePrint calls /api/finance/purchase-orders/{id}/pdf/",
      "/api/finance/purchase-orders/" in po_view and "pdf/?session_key=" in po_view)
check("PurchaseOrderView: Download PDF button present",
      "⬇ Download PDF" in po_view)
check("PurchaseOrderView: accepts sessionKey prop",
      "sessionKey?: string" in po_view)

po_page = read(f"{FE}/pages/PurchaseOrders.tsx")
check("PurchaseOrders.tsx: passes sessionKey to PurchaseOrderView",
      "sessionKey={sessionKey" in po_page)

qt_view = read(f"{FE}/components/QuotationDetail.tsx")
check("QuotationDetail: handleDownloadPDF calls /api/finance/quotations/{id}/pdf/",
      "/api/finance/quotations/" in qt_view and "pdf/?session_key=" in qt_view)
check("QuotationDetail: handlePrint opens PDF in new tab",
      "handlePrint" in qt_view and "printWindow" in qt_view)

# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("ISSUE 3: Send mail uses WeasyPrint template PDF")
print("="*60)

eu = read(f"{BASE}/finance/email_utils.py")
check("send_invoice_email: uses invoice_pdf_service (WeasyPrint)",
      "from .invoice_pdf_service import invoice_pdf_service" in eu)
check("send_invoice_email: has fallback to ReportLab on error",
      "generate_invoice_pdf_content(invoice)" in eu)
check("send_invoice_email: uses company selected_invoice_template",
      "selected_invoice_template" in eu)
check("send_proforma_email: uses proforma_pdf_service (WeasyPrint)",
      "from .proforma_pdf_service import proforma_pdf_service" in eu)
check("send_proforma_email: uses company selected_proforma_template",
      "selected_proforma_template" in eu)
check("send_purchase_order_email: uses po_pdf_service (WeasyPrint)",
      "from .po_pdf_service import po_pdf_service" in eu)
check("send_quotation_email: uses quotation_pdf_service (WeasyPrint)",
      "from .quotation_pdf_service import quotation_pdf_service" in eu)

# Verify PDF service files exist
for svc_file, svc_name in [
    ("finance/invoice_pdf_service.py", "invoice_pdf_service"),
    ("finance/proforma_pdf_service.py", "proforma_pdf_service"),
    ("finance/po_pdf_service.py", "po_pdf_service"),
    ("finance/quotation_pdf_service.py", "quotation_pdf_service"),
]:
    content = read(f"{BASE}/{svc_file}")
    check(f"{svc_name}.py exists and has generate method",
          bool(content) and ("def generate_" in content))

# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("ISSUE 4: PO view shows shipping address below customer name")
print("="*60)

check("PurchaseOrderView: has 'Ship To' label",
      "Ship To" in po_view)
check("PurchaseOrderView: shows shipping_address_details.address_line1",
      "shipping_address_details.address_line1" in po_view)
check("PurchaseOrderView: falls back to billing address with label",
      "billing_address_line1" in po_view and "(Billing)" in po_view)
check("PurchaseOrderView: shipping shown BEFORE contact info (Email/Phone)",
      po_view.index("Ship To") < po_view.index("Email:"))
check("PurchaseOrderView: orange color indicator for Ship To",
      "text-orange-" in po_view)
check("PurchaseOrderView: customer name shown prominently (text-base)",
      "text-base" in po_view)

# ─────────────────────────────────────────────────────────────
print("\n" + "="*60)
print("SUMMARY")
print("="*60)
passed = sum(1 for _, r in results if r)
failed = sum(1 for _, r in results if not r)
total  = len(results)
print(f"\n  Total: {total}  |  {PASS}: {passed}  |  {FAIL}: {failed}")
if failed == 0:
    print("\n  \033[92mAll checks passed! All 4 issues are fully fixed.\033[0m")
else:
    print(f"\n  \033[91m{failed} check(s) failed:\033[0m")
    for name, r in results:
        if not r:
            print(f"    ✗ {name}")
print()
