#!/usr/bin/env python3
"""
Fix numbering system for all finance modules
Ensures company dashboard numbering system is properly configured and used
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, '/var/www/SAP-Python/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from django.db import transaction
from datetime import datetime
from authentication.models import Company, Service
from company_dashboard.document_numbering_models import DocumentNumberingConfig, ServiceDocumentTypes
from finance.models import NumberingRule

def get_current_fy():
    """Get current financial year"""
    today = datetime.now().date()
    if today.month >= 4:
        start_year = today.year
        end_year = today.year + 1
    else:
        start_year = today.year - 1
        end_year = today.year
    return f"{start_year}-{str(end_year)[-2:]}"

def fix_company_numbering(company):
    """Fix numbering configuration for a company"""
    print(f"\n{'='*60}")
    print(f"Fixing numbering for: {company.name} ({company.company_prefix})")
    print(f"{'='*60}")
    
    # Get finance service
    try:
        finance_service = Service.objects.get(service_type='finance')
    except Service.DoesNotExist:
        print("❌ Finance service not found!")
        return
    
    current_fy = get_current_fy()
    print(f"Current Financial Year: {current_fy}")
    
    # Finance document types
    finance_doc_types = [
        'quotation', 'purchase_order', 'invoice', 'proforma_invoice',
        'payment', 'customer', 'vendor', 'product', 'purchase_request',
        'vendor_invoice'
    ]
    
    for doc_type in finance_doc_types:
        print(f"\n📄 Processing {doc_type}...")
        
        # Get or create company dashboard config
        config, created = DocumentNumberingConfig.objects.get_or_create(
            company=company,
            service=finance_service,
            document_type=doc_type,
            financial_year=current_fy,
            defaults={
                'prefix': ServiceDocumentTypes.get_default_prefix(doc_type),
                'starting_number': 1,
                'current_counter': 0,
                'number_padding': 3,
                'custom_pattern': '{COMPANY}-{PREFIX}-{FY_SHORT}-{NUMBER}',
                'include_company_prefix': True,
                'year_format': 'FY_SHORT',
                'separator': '-',
                'is_active': True,
                'allow_manual_override': False
            }
        )
        
        if created:
            print(f"  ✅ Created new config: {config.get_next_number_preview()}")
        else:
            # Update existing config to ensure proper pattern
            if not config.custom_pattern:
                config.custom_pattern = '{COMPANY}-{PREFIX}-{FY_SHORT}-{NUMBER}'
                config.include_company_prefix = True
                config.year_format = 'FY_SHORT'
                config.save()
                print(f"  ✅ Updated config pattern: {config.get_next_number_preview()}")
            else:
                print(f"  ℹ️  Existing config: {config.get_next_number_preview()}")
        
        # Update or create finance numbering rule to match
        rule, rule_created = NumberingRule.objects.get_or_create(
            company=company,
            module=doc_type,
            defaults={
                'template': '{COMPANY}-{PREFIX}-{FY_SHORT}-{NUMBER}',
                'prefix': ServiceDocumentTypes.get_default_prefix(doc_type),
                'separator': '-',
                'padding': 3,
                'reset_scope': 'yearly',
                'start_from': 1,
                'allow_manual_override': False
            }
        )
        
        if not rule_created:
            # Update existing rule
            rule.template = '{COMPANY}-{PREFIX}-{FY}-{NUMBER}'
            rule.prefix = ServiceDocumentTypes.get_default_prefix(doc_type)
            rule.padding = 3
            rule.save()
            print(f"  ✅ Updated finance rule")

def main():
    print("\n" + "="*60)
    print("FINANCE NUMBERING SYSTEM FIX")
    print("="*60)
    
    # Get all companies
    companies = Company.objects.all()
    
    print(f"\nFound {companies.count()} companies")
    
    for company in companies:
        try:
            with transaction.atomic():
                fix_company_numbering(company)
        except Exception as e:
            print(f"\n❌ Error fixing {company.name}: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*60)
    print("✅ NUMBERING SYSTEM FIX COMPLETED")
    print("="*60)
    
    # Show summary
    print("\n📊 SUMMARY:")
    for company in companies:
        print(f"\n{company.name} ({company.company_prefix}):")
        try:
            finance_service = Service.objects.get(service_type='finance')
            current_fy = get_current_fy()
            
            # Show quotation config as example
            config = DocumentNumberingConfig.objects.get(
                company=company,
                service=finance_service,
                document_type='quotation',
                financial_year=current_fy
            )
            print(f"  Quotation: {config.get_next_number_preview()}")
            print(f"  Pattern: {config.custom_pattern}")
            print(f"  Counter: {config.current_counter}")
        except Exception as e:
            print(f"  ❌ Error: {str(e)}")

if __name__ == '__main__':
    main()
