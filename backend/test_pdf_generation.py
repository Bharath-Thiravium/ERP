#!/usr/bin/env python
import os
import sys
import django

sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Quotation
from finance.quotation_pdf_service import QuotationPDFService

# Get the quotation
q = Quotation.objects.filter(quotation_number='SE-QT-2627-005').first()

if q:
    print(f"Quotation: {q.quotation_number}")
    print(f"Shipping charges: {q.shipping_charges}")
    print(f"Other charges: {q.other_charges}")
    print(f"Total: {q.total_amount}")
    print()
    
    # Generate HTML
    service = QuotationPDFService()
    html = service.generate_quotation_html(q)
    
    # Check if shipping_charges appears in HTML
    if 'shipping_charges' in html.lower() or 'freight' in html.lower():
        print("✅ Shipping charges found in HTML!")
        # Find the line
        for line in html.split('\n'):
            if 'shipping' in line.lower() or 'freight' in line.lower():
                print(f"  {line.strip()}")
    else:
        print("❌ Shipping charges NOT found in HTML")
    
    # Save HTML for inspection
    with open('/tmp/test_quotation.html', 'w') as f:
        f.write(html)
    print("\nHTML saved to /tmp/test_quotation.html")
    
    # Generate PDF
    pdf_bytes = service.generate_quotation_pdf(q)
    with open('/tmp/test_quotation.pdf', 'wb') as f:
        f.write(pdf_bytes)
    print("PDF saved to /tmp/test_quotation.pdf")
else:
    print("Quotation not found")
