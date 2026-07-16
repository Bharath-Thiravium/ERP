#!/usr/bin/env python3
"""
Comprehensive Template Testing Script
Tests PDF generation for all document types and all templates
"""

import os
import sys
import django

sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Invoice, Quotation, PurchaseOrder, ProformaInvoice

def test_template(document, doc_type, template_code, service):
    """Test a single document template"""
    try:
        if doc_type == 'Invoice':
            pdf_bytes = service.generate_invoice_pdf(document, template_code=template_code)
        elif doc_type == 'Quotation':
            pdf_bytes = service.generate_quotation_pdf(document, template=template_code)
        elif doc_type == 'PO':
            pdf_bytes = service.generate_po_pdf(document)  # PO service doesn't take template param
        elif doc_type == 'Proforma':
            pdf_bytes = service.generate_proforma_pdf(document, template_code=template_code)
        
        if pdf_bytes and len(pdf_bytes) > 0:
            size_kb = len(pdf_bytes) / 1024
            print(f"    ✓ {template_code:5} - Generated ({size_kb:.1f} KB)")
            return True
        else:
            print(f"    ✗ {template_code:5} - Empty PDF")
            return False
    except Exception as e:
        print(f"    ✗ {template_code:5} - Error: {str(e)[:50]}")
        return False

def main():
    print("=" * 70)
    print("  COMPREHENSIVE DOCUMENT TEMPLATE TEST")
    print("=" * 70)
    print()
    
    templates = ['AS', 'BKGE', 'TC']
    results = {}
    
    # Test Invoices
    print("📄 INVOICE TEMPLATES")
    print("-" * 70)
    invoices = Invoice.objects.all()[:1]
    if invoices.exists():
        invoice = invoices.first()
        print(f"Testing with: {invoice.invoice_number}")
        from finance.invoice_pdf_service import invoice_pdf_service
        results['Invoice'] = {}
        for tmpl in templates:
            results['Invoice'][tmpl] = test_template(invoice, 'Invoice', tmpl, invoice_pdf_service)
    else:
        print("⚠ No invoices found to test")
    print()
    
    # Test Quotations
    print("📝 QUOTATION TEMPLATES")
    print("-" * 70)
    quotations = Quotation.objects.all()[:1]
    if quotations.exists():
        quotation = quotations.first()
        print(f"Testing with: {quotation.quotation_number}")
        from finance.quotation_pdf_service import quotation_pdf_service
        results['Quotation'] = {}
        for tmpl in templates:
            results['Quotation'][tmpl] = test_template(quotation, 'Quotation', tmpl, quotation_pdf_service)
    else:
        print("⚠ No quotations found to test")
    print()
    
    # Test Purchase Orders
    print("🛒 PURCHASE ORDER TEMPLATES")
    print("-" * 70)
    pos = PurchaseOrder.objects.all()[:1]
    if pos.exists():
        po = pos.first()
        print(f"Testing with: {po.internal_po_number}")
        from finance.po_pdf_service import po_pdf_service
        results['PO'] = {}
        for tmpl in templates:
            results['PO'][tmpl] = test_template(po, 'PO', tmpl, po_pdf_service)
    else:
        print("⚠ No purchase orders found to test")
    print()
    
    # Test Proforma Invoices
    print("📋 PROFORMA INVOICE TEMPLATES")
    print("-" * 70)
    proformas = ProformaInvoice.objects.all()[:1]
    if proformas.exists():
        proforma = proformas.first()
        print(f"Testing with: {proforma.proforma_number}")
        from finance.proforma_pdf_service import proforma_pdf_service
        results['Proforma'] = {}
        for tmpl in templates:
            results['Proforma'][tmpl] = test_template(proforma, 'Proforma', tmpl, proforma_pdf_service)
    else:
        print("⚠ No proforma invoices found to test")
    print()
    
    # Summary
    print("=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    
    total_tests = 0
    passed_tests = 0
    
    for doc_type, templates_dict in results.items():
        for tmpl, success in templates_dict.items():
            total_tests += 1
            if success:
                passed_tests += 1
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print()
    
    if passed_tests == total_tests:
        print("🎉 ALL TEMPLATES WORKING PERFECTLY!")
        return 0
    else:
        print(f"⚠ {total_tests - passed_tests} templates need attention")
        return 1

if __name__ == '__main__':
    sys.exit(main())
