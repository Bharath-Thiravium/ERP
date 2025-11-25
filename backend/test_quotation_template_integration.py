#!/usr/bin/env python3
"""
Test script to verify quotation template integration
"""

import os
import sys
import django
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from authentication.models import Company, CompanyUser
from company_dashboard.quotation_template_models import CompanyQuotationTemplateSettings
from finance.models import Quotation, Customer, Product, QuotationItem
from finance.quotation_pdf_service import quotation_pdf_service
import json

def test_quotation_template_system():
    """Test the complete quotation template system"""
    
    print("🧪 Testing Quotation Template System")
    print("=" * 50)
    
    # Test 1: Model functionality
    print("\n1. Testing Model Functionality...")
    try:
        company = Company.objects.first()
        if not company:
            print("❌ No companies found in database")
            return False
            
        settings, created = CompanyQuotationTemplateSettings.objects.get_or_create(
            company=company,
            defaults={'selected_template': 'AS'}
        )
        
        print(f"✅ Company: {company.name}")
        print(f"✅ Template settings {'created' if created else 'found'}: {settings.selected_template}")
        print(f"✅ Available templates: {[choice[0] for choice in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES]}")
        
    except Exception as e:
        print(f"❌ Model test failed: {e}")
        return False
    
    # Test 2: API endpoints
    print("\n2. Testing API Endpoints...")
    client = Client()
    
    try:
        # Test template info endpoint (no auth required)
        response = client.get('/api/company-dashboard/quotation-templates/info/')
        print(f"✅ Template info endpoint: {response.status_code}")
        if response.status_code == 200:
            data = json.loads(response.content)
            print(f"   - Success: {data.get('success')}")
            print(f"   - Templates count: {len(data.get('data', {}).get('templates', []))}")
        
        # Test template settings endpoint (requires auth)
        response = client.get('/api/company-dashboard/quotation-templates/')
        print(f"✅ Template settings endpoint: {response.status_code} (401 expected without auth)")
        
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False
    
    # Test 3: PDF generation with templates
    print("\n3. Testing PDF Generation...")
    try:
        # Check if quotations exist
        quotation = Quotation.objects.filter(company=company).first()
        if quotation:
            print(f"✅ Found quotation: {quotation.quotation_number}")
            
            # Test PDF generation for each template
            for template_code, template_name in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES:
                try:
                    # Update company template setting
                    settings.selected_template = template_code
                    settings.save()
                    
                    # Generate PDF
                    pdf_content = quotation_pdf_service.generate_quotation_pdf(quotation)
                    
                    if pdf_content and len(pdf_content) > 0:
                        print(f"✅ {template_code} template PDF: {len(pdf_content)} bytes")
                    else:
                        print(f"❌ {template_code} template PDF: Empty or failed")
                        
                except Exception as e:
                    print(f"❌ {template_code} template PDF failed: {e}")
        else:
            print("⚠️  No quotations found - PDF generation test skipped")
            
    except Exception as e:
        print(f"❌ PDF generation test failed: {e}")
        return False
    
    # Test 4: Template file existence
    print("\n4. Testing Template Files...")
    try:
        template_base_path = backend_dir / 'finance' / 'templates' / 'quotation_templates'
        
        for template_code, template_name in CompanyQuotationTemplateSettings.TEMPLATE_CHOICES:
            template_file = template_base_path / template_code / 'quotation.html'
            if template_file.exists():
                print(f"✅ {template_code} template file exists: {template_file}")
            else:
                print(f"❌ {template_code} template file missing: {template_file}")
                
    except Exception as e:
        print(f"❌ Template file test failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 Quotation Template System Test Complete!")
    return True

if __name__ == "__main__":
    success = test_quotation_template_system()
    sys.exit(0 if success else 1)