#!/usr/bin/env python
"""
Test monthly forms generation
Run with: python manage.py shell < test_monthly_forms.py
"""

import os
import django
from datetime import datetime

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Company
from hr.form_automation_service import FormAutomationService
from hr.form_automation_models import ComplianceFormTemplate, MonthlyComplianceForm, EmployeeFormEntry

def test_monthly_forms():
    print("🧪 Testing Monthly Forms Generation...")
    
    # Get first company
    company = Company.objects.first()
    if not company:
        print("❌ No company found")
        return
    
    print(f"📊 Testing with company: {company.name}")
    
    # 1. Setup templates
    print("\n1️⃣ Setting up templates...")
    templates = FormAutomationService.setup_default_templates(company)
    print(f"✅ Created {len(templates)} new templates")
    
    # Check all templates
    all_templates = ComplianceFormTemplate.objects.filter(company=company)
    print(f"📋 Total templates: {all_templates.count()}")
    for template in all_templates:
        print(f"   - {template.template_name} ({template.form_type})")
    
    # 2. Generate forms
    print("\n2️⃣ Generating monthly forms...")
    current_month = datetime.now().date().replace(day=1)
    generated_forms = FormAutomationService.generate_monthly_forms(company.id, current_month)
    print(f"✅ Generated {len(generated_forms)} forms")
    
    # 3. Check results
    print("\n3️⃣ Checking results...")
    all_forms = MonthlyComplianceForm.objects.filter(company=company)
    print(f"📊 Total forms in database: {all_forms.count()}")
    
    for form in all_forms:
        entries = EmployeeFormEntry.objects.filter(monthly_form=form)
        print(f"   - {form.template.template_name}: {entries.count()} employee entries")
        
        # Show first few entries
        for entry in entries[:3]:
            if form.template.form_type == 'register_of_fines':
                print(f"     • {entry.employee.full_name}: Fine ₹{entry.fine_amount}")
            else:
                print(f"     • {entry.employee.full_name}: {entry.designation} - ₹{entry.basic_wage}")
    
    print("\n🎉 Test completed!")
    print(f"\n📈 Summary:")
    print(f"   Templates: {all_templates.count()}")
    print(f"   Forms: {all_forms.count()}")
    print(f"   Employee Entries: {EmployeeFormEntry.objects.filter(monthly_form__company=company).count()}")

if __name__ == "__main__":
    test_monthly_forms()