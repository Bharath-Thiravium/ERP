#!/usr/bin/env python
import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Service

def create_services():
    services = [
        {'name': 'Finance Management', 'service_type': 'finance', 'description': 'Complete financial management system'},
        {'name': 'Human Resources', 'service_type': 'hr', 'description': 'Employee and HR management'},
        {'name': 'Inventory Management', 'service_type': 'inventory', 'description': 'Stock and inventory tracking'},
        {'name': 'Customer Relations', 'service_type': 'crm', 'description': 'Customer relationship management'},
        {'name': 'Procurement', 'service_type': 'procurement', 'description': 'Purchase and procurement management'},
        {'name': 'Analytics', 'service_type': 'analytics', 'description': 'Business intelligence and analytics'}
    ]
    
    for service_data in services:
        service, created = Service.objects.get_or_create(
            service_type=service_data['service_type'],
            defaults=service_data
        )
        if created:
            print(f"Created service: {service.name}")
        else:
            print(f"Service already exists: {service.name}")

if __name__ == '__main__':
    create_services()
    print("Services setup completed!")