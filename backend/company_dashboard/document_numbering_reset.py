"""
Document Numbering Reset Utility
Reset counters for specific company and document types
"""
from django.db import transaction
from .document_numbering_models import DocumentNumberingConfig
from authentication.models import CompanyAutoCodeSettings


def reset_document_counter(company_id, document_type, service_id=None, financial_year=None):
    """
    Reset document counter to start from 001 again
    
    Args:
        company_id: ID of the company
        document_type: Type of document (invoice, quotation, etc.)
        service_id: Service ID (optional, will find automatically)
        financial_year: Financial year (optional, will use current)
    """
    try:
        # Reset new document numbering system
        if service_id and financial_year:
            with transaction.atomic():
                config = DocumentNumberingConfig.objects.filter(
                    company_id=company_id,
                    service_id=service_id,
                    document_type=document_type,
                    financial_year=financial_year
                ).first()
                
                if config:
                    config.current_counter = 0
                    config.save(update_fields=['current_counter'])
                    return f"Reset {document_type} counter for company {company_id} to 0"
        
        # Reset old auto-code system
        with transaction.atomic():
            setting = CompanyAutoCodeSettings.objects.filter(
                company_id=company_id,
                code_type=document_type
            ).first()
            
            if setting:
                setting.current_number = 0
                setting.save(update_fields=['current_number'])
                return f"Reset {document_type} auto-code counter for company {company_id} to 0"
        
        return f"No configuration found for {document_type}"
        
    except Exception as e:
        return f"Error resetting counter: {str(e)}"


def reset_all_counters_for_company(company_id):
    """Reset all document counters for a company"""
    try:
        reset_count = 0
        
        # Reset new system
        with transaction.atomic():
            configs = DocumentNumberingConfig.objects.filter(company_id=company_id)
            for config in configs:
                config.current_counter = 0
                config.save(update_fields=['current_counter'])
                reset_count += 1
        
        # Reset old system
        with transaction.atomic():
            settings = CompanyAutoCodeSettings.objects.filter(company_id=company_id)
            for setting in settings:
                setting.current_number = 0
                setting.save(update_fields=['current_number'])
                reset_count += 1
        
        return f"Reset {reset_count} counters for company {company_id}"
        
    except Exception as e:
        return f"Error resetting all counters: {str(e)}"