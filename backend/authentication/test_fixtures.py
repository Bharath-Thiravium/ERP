"""
Canonical test fixtures for service-user authentication tests.
Use these helpers to create valid authentication chains across all app tests.
"""
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
import secrets

from authentication.models import Company, Service, CompanyService, CompanyServiceUser, ServiceUserSession
from django.db import connection

def _ensure_auth_user_sequence():
    """Ensure auth_user PK sequence is at least MAX(id) to avoid duplicate id=1."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT setval(
                pg_get_serial_sequence('auth_user','id'),
                COALESCE((SELECT MAX(id) FROM auth_user), 1),
                true
            );
            """
        )

def get_system_user():
    """Get or create system user for created_by/assigned_by fields in fixtures."""
    _ensure_auth_user_sequence()
    user, _ = User.objects.get_or_create(
        username="system_admin",
        defaults={
            "email": "system@local.test",
            "is_active": True,
            "is_staff": True,
            "is_superuser": True,
        },
    )
    return user



def create_test_company(name="Test Company", approval_status="approved", **kwargs):
    """Create a test company with approved status by default."""
    defaults = {
        'name': name,
        'approval_status': approval_status,
        'company_prefix': f"TEST{secrets.randbelow(999):03d}",
        'email': 'test@company.com',
        'created_by': get_system_user(),  # fixture system user
    }
    defaults.update(kwargs)
    return Company.objects.create(**defaults)


def create_test_service(name="Test Service", service_type="finance", **kwargs):
    """Create (or reuse) a test service. service_type is unique, so this must be idempotent."""
    defaults = {
        'name': name,
        'description': 'Test service description',
        'is_active': True,
    }
    defaults.update(kwargs)

    obj, created = Service.objects.get_or_create(
        service_type=service_type,
        defaults={**defaults, 'service_type': service_type},
    )
    if not created:
        for k, v in defaults.items():
            setattr(obj, k, v)
        obj.save(update_fields=list(defaults.keys()))
    return obj

def create_test_user(username=None, email=None, **kwargs):
    """Create a test Django user with unique username/email if not provided."""
    _ensure_auth_user_sequence()
    if username is None:
        username = f"testuser{secrets.randbelow(999999):06d}"
    if email is None:
        email = f"test{secrets.randbelow(999999):06d}@example.com"
    
    defaults = {
        'username': username,
        'email': email,
        'is_active': True,
    }
    defaults.update(kwargs)
    return User.objects.create(**defaults)


def create_test_service_user(company=None, service=None, user=None, **kwargs):
    """Create a test CompanyServiceUser with all required relationships."""
    if company is None:
        company = create_test_company()
    if service is None:
        service = create_test_service()
    if user is None:
        user = create_test_user()
    
    # Create CompanyService if it doesn't exist
    company_service, _ = CompanyService.objects.get_or_create(
        company=company,
        service=service,
        defaults={
            'is_active': True,
            'assigned_by': get_system_user(),  # fixture system user
            'service_password': User.objects.make_random_password(),
            'password_expires_at': timezone.now() + timedelta(days=90),
        }
    )
    
    defaults = {
        'company': company,
        'service': service,
        'username': f"testuser{secrets.randbelow(9999):04d}",
        'email': 'testuser@company.com',
        'full_name': 'Test User',
        'password': User.objects.make_random_password(),
        'unique_service_id': f"SU{secrets.randbelow(999999):06d}",
        'is_active': True,
        'created_by': get_system_user(),  # fixture system user
        'password_expires_at': timezone.now() + timedelta(days=90),
    }
    defaults.update(kwargs)
    return CompanyServiceUser.objects.create(**defaults)


def create_test_session(service_user=None, session_key=None, **kwargs):
    """Create a test ServiceUserSession."""
    if service_user is None:
        service_user = create_test_service_user()
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


def create_auth_chain(company_name="Test Company", service_type="finance", service_name=None, **kwargs):
    """
    Create complete authentication chain: Company -> Service -> User -> ServiceUser -> Session
    Returns dict with all created objects and auth headers.
    """
    company = create_test_company(name=company_name)
    service = create_test_service(
        name=service_name or f"{service_type.title()} Service",
        service_type=service_type,
    )
    user = create_test_user()
    service_user = create_test_service_user(company=company, service=service, user=user)
    session = create_test_session(service_user=service_user, **kwargs)
    
    return {
        'company': company,
        'service': service,
        'user': user,
        'service_user': service_user,
        'session': session,
        'auth_headers': auth_headers(session.session_key),
    }


def auth_headers(session_key):
    """Return HTTP authorization headers for API client."""
    return {"HTTP_AUTHORIZATION": f"Bearer {session_key}"}


# Common valid payloads for API tests
VALID_CUSTOMER_PAYLOAD = {
    "name": "Test Customer",
    "email": "test@example.com",
    "phone": "9000000000",
    "address": "Test Address",
}

VALID_EMPLOYEE_PAYLOAD = {
    "first_name": "Test",
    "last_name": "Employee",
    "email": "employee@example.com",
    "phone": "9000000001",
    "employee_id": "EMP001",
}

VALID_PRODUCT_PAYLOAD = {
    "name": "Test Product",
    "sku": "TEST001",
    "price": "100.00",
    "category": "Test Category",
}
