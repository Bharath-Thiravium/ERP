#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import ServiceUserSession, CompanyServiceUser
from django.utils import timezone
from datetime import timedelta

# Find active service users
service_users = CompanyServiceUser.objects.filter(is_active=True)
print(f"Found {service_users.count()} active service users")

for su in service_users[:5]:
    print(f"\nService User: {su.username}")
    print(f"Company: {su.company.name}")
    print(f"Service: {su.service.name}")
    
    # Check sessions
    sessions = ServiceUserSession.objects.filter(service_user=su, is_active=True)
    print(f"Active sessions: {sessions.count()}")
    for s in sessions:
        print(f"  - Session key: {s.session_key}")
        print(f"    Expires: {s.expires_at}")

# Create a test session for the first active user
if service_users.exists():
    test_user = service_users.first()
    import secrets
    import string
    session_key = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(40))
    
    session = ServiceUserSession.objects.create(
        service_user=test_user,
        session_key=session_key,
        ip_address='127.0.0.1',
        user_agent='Test',
        expires_at=timezone.now() + timedelta(days=1)
    )
    
    print(f"\n✅ Created test session:")
    print(f"Session key: {session_key}")
    print(f"User: {test_user.username}")
    print(f"Company ID: {test_user.company.id}")
    print(f"Company: {test_user.company.name}")
