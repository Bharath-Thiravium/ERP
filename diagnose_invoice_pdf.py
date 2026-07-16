#!/usr/bin/env python3
"""
Diagnostic script to test invoice PDF generation
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Invoice
from finance.pdf_generators import generate_invoice_pdf_response
from django.test import RequestFactory

def test_pdf_generation():
    print("=" * 60)
    print("Invoice PDF Diagnostic Tool")
    print("=" * 60)
    
    # Check WeasyPrint
    try:
        from weasyprint import HTML
        print("✓ WeasyPrint is installed")
    except ImportError as e:
        print(f"✗ WeasyPrint import failed: {e}")
        return False
    
    # Check templates
    template_dir = '/var/www/SAP-Python/backend/finance/templates/invoice_templates'
    if os.path.exists(template_dir):
        print(f"✓ Template directory exists: {template_dir}")
        templates = ['AS', 'BKGE', 'TC']
        for t in templates:
            path = os.path.join(template_dir, t, 'invoice.html')
            if os.path.exists(path):
                print(f"  ✓ {t} template found")
            else:
                print(f"  ✗ {t} template missing")
    else:
        print(f"✗ Template directory not found: {template_dir}")
    
    # Check invoices
    invoices = Invoice.objects.all()[:5]
    print(f"\n✓ Found {Invoice.objects.count()} invoices in database")
    
    if invoices.exists():
        invoice = invoices.first()
        print(f"\nTesting PDF generation for: {invoice.invoice_number}")
        
        try:
            # Test PDF generation
            from finance.invoice_pdf_service import invoice_pdf_service
            pdf_bytes = invoice_pdf_service.generate_invoice_pdf(invoice, template_code='BKGE')
            
            if pdf_bytes and len(pdf_bytes) > 0:
                print(f"✓ PDF generated successfully ({len(pdf_bytes)} bytes)")
                
                # Save test file
                test_file = f'/tmp/test_invoice_{invoice.invoice_number}.pdf'
                with open(test_file, 'wb') as f:
                    f.write(pdf_bytes)
                print(f"✓ Test PDF saved to: {test_file}")
                return True
            else:
                print("✗ PDF generation returned empty bytes")
                return False
                
        except Exception as e:
            print(f"✗ PDF generation failed: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    else:
        print("⚠ No invoices found to test")
        return True
    
    return True

if __name__ == '__main__':
    success = test_pdf_generation()
    sys.exit(0 if success else 1)
