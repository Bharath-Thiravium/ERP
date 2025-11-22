#!/usr/bin/env python
"""
Test script for form automation system
Run with: python manage.py shell < test_form_automation.py
"""

import os
import django
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Company
from hr.form_automation_service import FormAutomationService
from hr.form_automation_models import ComplianceFormTemplate, MonthlyComplianceForm

def test_form_automation():
    print("🚀 Testing Form Automation System...")
    
    # Get first company
    company = Company.objects.first()
    if not company:
        print("❌ No company found. Please create a company first.")
        return
    
    print(f"📊 Testing with company: {company.name}")
    
    # 1. Setup default templates
    print("\n1️⃣ Setting up default templates...")
    templates = FormAutomationService.setup_default_templates(company)
    print(f"✅ Created {len(templates)} templates")
    
    for template in templates:
        print(f"   - {template.template_name} ({template.form_type})")
    
    # 2. Generate monthly forms
    print("\n2️⃣ Generating monthly forms...")
    current_month = datetime.now().date().replace(day=1)
    generated_forms = FormAutomationService.generate_monthly_forms(company.id, current_month)
    print(f"✅ Generated {len(generated_forms)} forms")
    
    for form in generated_forms:
        print(f"   - {form.template.template_name}: {form.total_employees} employees")
    
    # 3. Check database
    print("\n3️⃣ Checking database...")
    total_templates = ComplianceFormTemplate.objects.filter(company=company).count()
    total_forms = MonthlyComplianceForm.objects.filter(company=company).count()
    
    print(f"✅ Total templates in DB: {total_templates}")
    print(f"✅ Total forms in DB: {total_forms}")
    
    # 4. Test API endpoints (simulation)
    print("\n4️⃣ API endpoints available:")
    print("   - GET /api/hr/form-templates/")
    print("   - GET /api/hr/monthly-forms/")
    print("   - POST /api/hr/monthly-forms/generate_monthly_forms/")
    print("   - POST /api/hr/monthly-forms/setup_templates/")
    
    print("\n🎉 Form Automation System test completed successfully!")
    print("\n📋 Next steps:")
    print("   1. Access HR Compliance → Monthly Forms tab")
    print("   2. Generate forms for current month")
    print("   3. Review and approve generated forms")
    print("   4. Export forms as PDF")

if __name__ == "__main__":
    test_form_automation()