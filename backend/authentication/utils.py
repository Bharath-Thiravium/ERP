"""
Utility functions for authentication and auto-code generation
"""
import os
import re
from pathlib import Path
from django.db import transaction
from django.conf import settings
from datetime import datetime
from .models import Company, CompanyAutoCodeSettings


def generate_auto_code(company_id, code_type):
    """
    Generate auto code for a company and code type with company isolation
    
    Args:
        company_id: ID of the company
        code_type: Type of code to generate (employee, product, invoice, etc.)
    
    Returns:
        Generated code string (e.g., ACMEEMP001, TECHINV001)
    """
    # First try the new document numbering system
    try:
        from company_dashboard.document_numbering_models import DocumentNumberingConfig, ServiceDocumentTypes
        from authentication.models import Service
        
        # Check if company has document numbering enabled
        company = Company.objects.get(id=company_id)
        if not company.use_document_numbering:
            raise Exception("Document numbering not enabled")
        

        
        # Get current financial year
        today = datetime.now().date()
        if today.month >= 4:  # April to December
            start_year = today.year
            end_year = today.year + 1
        else:  # January to March
            start_year = today.year - 1
            end_year = today.year
        
        financial_year = f"{start_year}-{str(end_year)[-2:]}"
        
        # Get service for this document type
        service_type = ServiceDocumentTypes.get_service_for_document_type(code_type)
        
        try:
            service = Service.objects.get(service_type=service_type)
        except Service.DoesNotExist:
            raise Exception(f"Service not found for document type: {code_type}")
        
        # Company-isolated configuration lookup and creation
        with transaction.atomic():
            config = DocumentNumberingConfig.objects.select_for_update().filter(
                company=company,  # Ensure company isolation
                service=service,
                document_type=code_type,
                financial_year=financial_year,
                is_active=True
            ).first()
            
            if config:
                # Use existing company-specific configuration

                return config.get_next_number()
            else:
                # Auto-create company-specific configuration
                config = DocumentNumberingConfig.objects.create(
                    company=company,
                    service=service,
                    document_type=code_type,
                    financial_year=financial_year,
                    prefix=ServiceDocumentTypes.get_default_prefix(code_type),
                    starting_number=1,
                    current_counter=0,
                    number_padding=3,
                    include_company_prefix=True,  # Default to True for auto-created configs
                    is_active=True
                )

                return config.get_next_number()
    except Exception:
        # Fall through to old system
        pass
    
    # Fallback to original system
    try:
        company = Company.objects.get(id=company_id)
        
        # Ensure company has a prefix
        if not hasattr(company, 'company_prefix') or not company.company_prefix:
            raise ValueError(f"Company {company.name} does not have a prefix set")
        
        # Get or create auto code settings for this company and type
        settings, created = CompanyAutoCodeSettings.objects.get_or_create(
            company=company,
            code_type=code_type,
            defaults={
                'current_number': 0,
                'number_length': 3,
                'is_active': True
            }
        )
        
        if not settings.is_active:
            raise ValueError(f"Auto code generation is disabled for {code_type}")
        
        # Generate next code atomically
        with transaction.atomic():
            settings.refresh_from_db()
            return settings.get_next_code()
            
    except Company.DoesNotExist:
        raise ValueError(f"Company with ID {company_id} does not exist")
    except Exception as e:
        print(f"Auto-code generation error: {str(e)}")
        raise ValueError(f"Error generating auto code: {str(e)}")


def get_next_document_number(service_id, company_id, document_type, manual_override=None):
    """
    Get next document number with optional manual override
    NEW FUNCTION for enhanced document numbering
    """
    try:
        from company_dashboard.document_numbering_models import DocumentNumberingConfig
        
        # Get current financial year
        today = datetime.now().date()
        if today.month >= 4:
            start_year = today.year
            end_year = today.year + 1
        else:
            start_year = today.year - 1
            end_year = today.year
        
        financial_year = f"{start_year}-{str(end_year)[-2:]}"
        
        with transaction.atomic():
            config = DocumentNumberingConfig.objects.select_for_update().get(
                service_id=service_id,
                company_id=company_id,
                document_type=document_type,
                financial_year=financial_year,
                is_active=True
            )
            
            if manual_override and config.allow_manual_override:
                # Validate manual override format and uniqueness
                # This would need additional validation logic
                return manual_override['document_number']
            else:
                return config.get_next_number()
                
    except Exception as e:
        raise Exception(f"Document numbering not configured for {document_type}: {str(e)}")


def get_company_prefix(company_id):
    """Get company prefix by ID"""
    try:
        company = Company.objects.get(id=company_id)
        return company.company_prefix
    except Company.DoesNotExist:
        raise ValueError(f"Company with ID {company_id} does not exist")


def validate_company_prefix(prefix):
    """Validate company prefix format"""
    if not prefix:
        return False, "Prefix cannot be empty"
    
    if len(prefix) < 2 or len(prefix) > 10:
        return False, "Prefix must be 2-10 characters long"
    
    if not prefix.isalnum():
        return False, "Prefix must contain only letters and numbers"
    
    # Check if prefix already exists
    if Company.objects.filter(company_prefix=prefix).exists():
        return False, "Prefix already exists"
    
    return True, "Valid prefix"


def initialize_company_auto_codes(company_id):
    """Initialize default auto code settings for a new company"""
    try:
        company = Company.objects.get(id=company_id)
        
        # Get all document types from enhanced system
        try:
            from company_dashboard.document_numbering_models import ServiceDocumentTypes
            default_code_types = []
            for service_types in ServiceDocumentTypes.SERVICE_DOCUMENT_MAPPING.values():
                default_code_types.extend(service_types)
        except ImportError:
            # Fallback to original list
            default_code_types = [
                'employee', 'product', 'invoice', 'purchase_order', 'quotation',
                'customer', 'vendor', 'supplier', 'warehouse', 'category',
                'audit', 'asset', 'proforma_invoice', 'payment', 'department',
                'designation', 'lead', 'contact', 'account', 'opportunity',
                'activity', 'campaign'
            ]
        
        for code_type in default_code_types:
            CompanyAutoCodeSettings.objects.get_or_create(
                company=company,
                code_type=code_type,
                defaults={
                    'current_number': 0,
                    'number_length': 3,
                    'is_active': True
                }
            )
        
        return True
        
    except Company.DoesNotExist:
        raise ValueError(f"Company with ID {company_id} does not exist")
    except Exception as e:
        raise ValueError(f"Error initializing auto codes: {str(e)}")


def safe_join(base_path, *paths):
    """Safely join paths to prevent directory traversal attacks"""
    base = Path(base_path).resolve()
    joined = base
    
    for path in paths:
        # Remove any directory traversal attempts
        clean_path = str(path).replace('..', '').replace('/', '').replace('\\', '')
        joined = joined / clean_path
    
    # Ensure the final path is still within the base directory
    try:
        joined.resolve().relative_to(base)
        return str(joined)
    except ValueError:
        raise ValueError("Path traversal attempt detected")


def validate_filename(filename):
    """Validate and sanitize filename"""
    if not filename:
        raise ValueError("Filename cannot be empty")
    
    # Remove any path separators and dangerous characters
    clean_name = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Ensure it doesn't start with a dot (hidden file)
    if clean_name.startswith('.'):
        clean_name = 'file_' + clean_name[1:]
    
    # Limit length
    if len(clean_name) > 255:
        name, ext = os.path.splitext(clean_name)
        clean_name = name[:250] + ext
    
    return clean_name


def get_safe_scripts_path():
    """Get safe scripts directory path"""
    # Use the backend directory's scripts folder
    base_dir = getattr(settings, 'BASE_DIR', Path(__file__).resolve().parent.parent)
    scripts_dir = Path(base_dir) / 'scripts'
    
    # Create directory if it doesn't exist
    scripts_dir.mkdir(exist_ok=True)
    
    return str(scripts_dir)


def get_client_ip(request):
    """Get the real client IP address from request, handling nginx proxy"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Get the first IP in the chain (client IP)
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    
    x_real_ip = request.META.get('HTTP_X_REAL_IP')
    if x_real_ip:
        return x_real_ip
    
    # Fallback to REMOTE_ADDR
    return request.META.get('REMOTE_ADDR')