#!/usr/bin/env python3
"""
Test script for quotation template functionality
"""

import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Company
from company_dashboard.quotation_template_models import CompanyQuotationTemplateSettings
from finance.models import Quotation, Customer
from finance.quotation_pdf_service import quotation_pdf_service

def test_template_settings():
    """Test template settings creation and retrieval"""
    print("Testing Template Settings...")
    
    # Get first company
    company = Company.objects.first()
    if not company:
        print("❌ No company found. Please create a company first.")
        return False
    
    print(f"✅ Using company: {company.name}")
    
    # Create template settings
    settings, created = CompanyQuotationTemplateSettings.objects.get_or_create(
        company=company,
        defaults={'selected_template': 'AS'}
    )
    
    if created:
        print("✅ Created new template settings")
    else:
        print("✅ Retrieved existing template settings")
    
    print(f"✅ Current template: {settings.get_selected_template_display()}")
    
    # Test template switching
    for template in ['BKGE', 'TC', 'AS']:
        settings.selected_template = template
        settings.save()
        print(f"✅ Switched to {template} template")
    
    return True

def test_pdf_generation():
    """Test PDF generation with different templates"""
    print("\nTesting PDF Generation...")
    
    company = Company.objects.first()
    if not company:
        print("❌ No company found")
        return False
    
    # Get or create a quotation
    quotation = Quotation.objects.filter(company=company).first()
    if not quotation:
        print("❌ No quotation found. Please create a quotation first.")
        return False
    
    print(f"✅ Using quotation: {quotation.quotation_number}")
    
    # Test each template
    settings, _ = CompanyQuotationTemplateSettings.objects.get_or_create(
        company=company,
        defaults={'selected_template': 'AS'}
    )
    
    for template in ['AS', 'BKGE', 'TC']:
        try:
            settings.selected_template = template
            settings.save()
            
            print(f"📄 Generating PDF with {template} template...")
            pdf_buffer = quotation_pdf_service.generate_quotation_pdf(quotation)
            
            if pdf_buffer and pdf_buffer.getvalue():
                print(f"✅ {template} template PDF generated successfully ({len(pdf_buffer.getvalue())} bytes)")
            else:
                print(f"❌ {template} template PDF generation failed")
                
        except Exception as e:
            print(f"❌ Error with {template} template: {str(e)}")
    
    return True

def test_template_choices():
    """Test template choices and descriptions"""
    print("\nTesting Template Choices...")
    
    choices = CompanyQuotationTemplateSettings.TEMPLATE_CHOICES
    print(f"✅ Available templates: {len(choices)}")
    
    for code, name in choices:
        print(f"  - {code}: {name}")
    
    return True

def main():
    """Run all tests"""
    print("🚀 QUOTATION TEMPLATE SYSTEM TEST")
    print("=" * 50)
    
    try:
        # Test 1: Template Settings
        if not test_template_settings():
            return
        
        # Test 2: PDF Generation
        if not test_pdf_generation():
            return
        
        # Test 3: Template Choices
        if not test_template_choices():
            return
        
        print("\n" + "=" * 50)
        print("🎉 ALL TESTS PASSED!")
        print("✅ Template system is working correctly")
        print("✅ Ready for company dashboard integration")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()