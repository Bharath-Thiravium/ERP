"""
Quick fix script to enable company prefix for existing document numbering configurations
"""
from django.core.management.base import BaseCommand
from company_dashboard.document_numbering_models import DocumentNumberingConfig
from authentication.models import Company

def fix_company_prefix_for_company(company_prefix):
    """Fix company prefix for a specific company"""
    try:
        company = Company.objects.get(company_prefix=company_prefix)
        
        # Get all document numbering configs for this company
        configs = DocumentNumberingConfig.objects.filter(company=company)
        
        updated_count = 0
        for config in configs:
            if not config.include_company_prefix:
                config.include_company_prefix = True
                config.save(update_fields=['include_company_prefix'])
                updated_count += 1
                print(f"Updated {config.document_type} config to include company prefix")
        
        print(f"Updated {updated_count} configurations for company {company.name}")
        return updated_count
        
    except Company.DoesNotExist:
        print(f"Company with prefix {company_prefix} not found")
        return 0

if __name__ == "__main__":
    # Fix for EXMTS company
    fix_company_prefix_for_company("EXMTS")