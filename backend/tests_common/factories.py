"""
Canonical test factories for SAP-Python tenant enforcement.
Use these factories in all tests to ensure proper FK relationships and avoid hardcoded IDs.
"""
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import secrets

from authentication.models import Company, Service, CompanyService, CompanyServiceUser, ServiceUserSession


def create_user(username=None, email=None, **kwargs):
    """Create a Django auth User with unique username/email."""
    if username is None:
        username = f"testuser{secrets.randbelow(999999):06d}"
    if email is None:
        email = f"{username}@test.com"
    
    defaults = {
        'username': username,
        'email': email,
        'is_active': True,
    }
    defaults.update(kwargs)
    return User.objects.create(**defaults)


def create_company(created_by=None, approval_status="approved", **kwargs):
    """Create a Company with proper FK relationships."""
    if created_by is None:
        created_by = create_user()
    
    defaults = {
        'name': f"Test Company {secrets.randbelow(9999):04d}",
        'company_prefix': f"TEST{secrets.randbelow(999):03d}",
        'email': f"company{secrets.randbelow(9999):04d}@test.com",
        'created_by': created_by,
        'approval_status': approval_status,
    }
    defaults.update(kwargs)
    return Company.objects.create(**defaults)


def create_service(service_type="finance", **kwargs):
    """Create a Service."""
    defaults = {
        'name': f"Test Service {service_type.title()}",
        'service_type': service_type,
        'description': f'Test {service_type} service',
        'is_active': True,
    }
    defaults.update(kwargs)
    
    # Try to get existing service first to avoid unique constraint violation
    service, created = Service.objects.get_or_create(
        service_type=service_type,
        defaults=defaults
    )
    return service


def create_company_service_user(company=None, service=None, user=None, **kwargs):
    """Create a CompanyServiceUser with all required relationships."""
    if company is None:
        company = create_company()
    if service is None:
        service = create_service()
    if user is None:
        user = create_user()
    
    # Create CompanyService if it doesn't exist
    company_service, _ = CompanyService.objects.get_or_create(
        company=company,
        service=service,
        defaults={
            'is_active': True,
            'assigned_by': company.created_by,
            'service_password': 'hashed_password',
            'password_expires_at': timezone.now() + timedelta(days=90),
        }
    )
    
    defaults = {
        'company': company,
        'service': service,
        'username': f"testuser{secrets.randbelow(9999):04d}",
        'email': f"serviceuser{secrets.randbelow(9999):04d}@test.com",
        'full_name': 'Test Service User',
        'password': 'hashed_password',
        'unique_service_id': f"SU{secrets.randbelow(999999):06d}",
        'is_active': True,
        'created_by': company.created_by,
        'password_expires_at': timezone.now() + timedelta(days=90),
    }
    defaults.update(kwargs)
    return CompanyServiceUser.objects.create(**defaults)


def create_service_user_session(service_user=None, session_key=None, **kwargs):
    """Create a ServiceUserSession."""
    if service_user is None:
        service_user = create_company_service_user()
    if session_key is None:
        session_key = secrets.token_hex(20)  # 40 char hex string
    
    defaults = {
        'service_user': service_user,
        'session_key': session_key,
        'ip_address': '127.0.0.1',
        'user_agent': 'Test Client',
        'is_active': True,
        'expires_at': timezone.now() + timedelta(days=7),
    }
    defaults.update(kwargs)
    return ServiceUserSession.objects.create(**defaults)


def auth_headers(session_key):
    """Return HTTP authorization headers for API client."""
    return {"HTTP_AUTHORIZATION": f"Bearer {session_key}"}


def create_auth_chain(company_name=None, **kwargs):
    """
    Create complete authentication chain: Company -> Service -> User -> ServiceUser -> Session
    Returns dict with all created objects and auth headers.
    """
    if company_name is None:
        company_name = f"Test Company {secrets.randbelow(9999):04d}"
    
    company = create_company(name=company_name)
    service = create_service()
    user = create_user()
    service_user = create_company_service_user(company=company, service=service, user=user)
    session = create_service_user_session(service_user=service_user, **kwargs)
    
    return {
        'company': company,
        'service': service,
        'user': user,
        'service_user': service_user,
        'session': session,
        'auth_headers': auth_headers(session.session_key),
    }