#!/usr/bin/env python
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Quotation
from company_dashboard.models import Company, CompanyQuotationTemplateSettings
from finance.quotation_pdf_service import QuotationPDFService

def test_quotation_templates():
    print("🚀 QUOTATION PDF GENERATION TEST")
    print("=" * 50)
    
    # Get company and quotation
    company = Company.objects.get(name='ExampleTech Solutions')
    quotation = Quotation.objects.filter(company=company).first()
    
    if not quotation:
        print("❌ No quotation found")
        return
    
    print(f"✅ Testing with quotation: {quotation.quotation_number}")
    print(f"✅ Customer: {quotation.customer.name}")
    
    # Test each template
    templates = ['AS', 'BKGE', 'TC']
    
    for template in templates:
        print(f"\n📄 Testing {template} template...")
        
        # Set template
        settings, created = CompanyQuotationTemplateSettings.objects.get_or_create(
            company=company,
            defaults={'selected_template': template}
        )
        if not created:
            settings.selected_template = template
            settings.save()
        
        # Generate PDF
        try:
            pdf_service = QuotationPDFService()
            pdf_content = pdf_service.generate_quotation_pdf(quotation)
            
            # Save to file
            filename = f"test_quotation_{template.lower()}.pdf"
            with open(filename, 'wb') as f:
                f.write(pdf_content)
            
            print(f"✅ {template} template PDF generated: {filename}")
            print(f"   File size: {len(pdf_content)} bytes")
            
        except Exception as e:
            print(f"❌ Error generating {template} template: {str(e)}")
    
    print(f"\n🎉 Test completed! Check the generated PDF files.")

if __name__ == "__main__":
    test_quotation_templates()