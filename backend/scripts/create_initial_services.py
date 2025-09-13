#!/usr/bin/env python3
"""
Create initial services for AthenaSAP system
"""

import os
import sys
import django

# Add Django project to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from authentication.models import Service

def create_initial_services():
    """Create initial services for the SAP system"""
    
    services_data = [
        {
            'name': 'Finance Management',
            'service_type': 'finance',
            'description': 'Complete financial management including accounting, budgeting, and financial reporting.',
            'base_price': 299.00,
            'features': [
                'General Ledger',
                'Accounts Payable/Receivable',
                'Financial Reporting',
                'Budget Management',
                'Cost Center Accounting',
                'Asset Management'
            ]
        },
        {
            'name': 'Human Resources',
            'service_type': 'hr',
            'description': 'Comprehensive HR management including employee records, payroll, and performance tracking.',
            'base_price': 199.00,
            'features': [
                'Employee Management',
                'Payroll Processing',
                'Time & Attendance',
                'Performance Management',
                'Recruitment',
                'Training Management'
            ]
        },
        {
            'name': 'Inventory Management',
            'service_type': 'inventory',
            'description': 'Advanced inventory control with real-time tracking and automated reordering.',
            'base_price': 249.00,
            'features': [
                'Stock Management',
                'Warehouse Management',
                'Barcode Scanning',
                'Automated Reordering',
                'Inventory Valuation',
                'Multi-location Support'
            ]
        },
        {
            'name': 'Order Management',
            'service_type': 'orders',
            'description': 'End-to-end order processing from quote to delivery.',
            'base_price': 179.00,
            'features': [
                'Order Processing',
                'Quote Management',
                'Delivery Tracking',
                'Customer Portal',
                'Order Analytics',
                'Integration with Inventory'
            ]
        },
        {
            'name': 'Analytics & Reporting',
            'service_type': 'analytics',
            'description': 'Business intelligence and advanced analytics with customizable dashboards.',
            'base_price': 349.00,
            'features': [
                'Real-time Dashboards',
                'Custom Reports',
                'Data Visualization',
                'Predictive Analytics',
                'KPI Monitoring',
                'Export Capabilities'
            ]
        },
        {
            'name': 'Customer Relationship Management',
            'service_type': 'crm',
            'description': 'Complete CRM solution for managing customer relationships and sales processes.',
            'base_price': 229.00,
            'features': [
                'Contact Management',
                'Sales Pipeline',
                'Lead Management',
                'Customer Support',
                'Marketing Automation',
                'Sales Analytics'
            ]
        },
        {
            'name': 'Procurement',
            'service_type': 'procurement',
            'description': 'Streamlined procurement processes with vendor management and purchase optimization.',
            'base_price': 199.00,
            'features': [
                'Purchase Requisitions',
                'Vendor Management',
                'Contract Management',
                'Approval Workflows',
                'Spend Analytics',
                'Supplier Portal'
            ]
        },
        {
            'name': 'Manufacturing',
            'service_type': 'manufacturing',
            'description': 'Production planning and manufacturing execution with quality control.',
            'base_price': 399.00,
            'features': [
                'Production Planning',
                'Work Order Management',
                'Bill of Materials',
                'Capacity Planning',
                'Shop Floor Control',
                'Quality Management'
            ]
        },
        {
            'name': 'Quality Management',
            'service_type': 'quality',
            'description': 'Quality assurance and control with compliance tracking and audit management.',
            'base_price': 149.00,
            'features': [
                'Quality Control',
                'Audit Management',
                'Compliance Tracking',
                'Document Control',
                'Corrective Actions',
                'Quality Metrics'
            ]
        },
        {
            'name': 'Maintenance',
            'service_type': 'maintenance',
            'description': 'Asset maintenance and facility management with preventive maintenance scheduling.',
            'base_price': 179.00,
            'features': [
                'Asset Management',
                'Preventive Maintenance',
                'Work Order Management',
                'Maintenance Scheduling',
                'Equipment History',
                'Maintenance Analytics'
            ]
        }
    ]
    
    created_count = 0
    updated_count = 0
    
    for service_data in services_data:
        service, created = Service.objects.get_or_create(
            service_type=service_data['service_type'],
            defaults=service_data
        )
        
        if created:
            created_count += 1
            print(f"✅ Created service: {service.name}")
        else:
            # Update existing service
            for key, value in service_data.items():
                setattr(service, key, value)
            service.save()
            updated_count += 1
            print(f"🔄 Updated service: {service.name}")
    
    print(f"\n📊 Summary:")
    print(f"   Created: {created_count} services")
    print(f"   Updated: {updated_count} services")
    print(f"   Total: {Service.objects.count()} services available")

if __name__ == "__main__":
    print("Creating initial services for AthenaSAP...")
    create_initial_services()
    print("✅ Initial services setup complete!")
