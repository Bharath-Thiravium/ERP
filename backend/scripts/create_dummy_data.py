#!/usr/bin/env python
import os
import sys
import django
from decimal import Decimal
from datetime import date, timedelta
import random

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
django.setup()

from finance.models import Company, Product, ProformaInvoice, ProformaInvoiceItem, HSNCode
from django.contrib.auth.models import User

def create_dummy_data():
    # Get or create a user for created_by field
    user, _ = User.objects.get_or_create(
        username='admin',
        defaults={'email': 'admin@example.com', 'is_staff': True}
    )
    # Create 10 dummy companies
    companies_data = [
        {'name': 'Tech Solutions Ltd', 'address': '123 Tech Park, Mumbai', 'phone': '9876543210', 'email': 'info@techsolutions.com', 'gst_number': '27ABCDE1234F1Z5'},
        {'name': 'Global Enterprises', 'address': '456 Business District, Delhi', 'phone': '9876543211', 'email': 'contact@global.com', 'gst_number': '07FGHIJ5678K2A6'},
        {'name': 'Innovation Corp', 'address': '789 Innovation Hub, Bangalore', 'phone': '9876543212', 'email': 'hello@innovation.com', 'gst_number': '29KLMNO9012L3B7'},
        {'name': 'Prime Industries', 'address': '321 Industrial Area, Chennai', 'phone': '9876543213', 'email': 'sales@prime.com', 'gst_number': '33PQRST3456M4C8'},
        {'name': 'Future Systems', 'address': '654 IT Corridor, Hyderabad', 'phone': '9876543214', 'email': 'info@future.com', 'gst_number': '36UVWXY7890N5D9'},
        {'name': 'Smart Solutions', 'address': '987 Smart City, Pune', 'phone': '9876543215', 'email': 'contact@smart.com', 'gst_number': '27ZABCD1234O6E0'},
        {'name': 'Digital Dynamics', 'address': '147 Digital Plaza, Kolkata', 'phone': '9876543216', 'email': 'info@digital.com', 'gst_number': '19EFGHI5678P7F1'},
        {'name': 'Quantum Technologies', 'address': '258 Quantum Complex, Ahmedabad', 'phone': '9876543217', 'email': 'sales@quantum.com', 'gst_number': '24JKLMN9012Q8G2'},
        {'name': 'Nexus Ventures', 'address': '369 Nexus Tower, Jaipur', 'phone': '9876543218', 'email': 'hello@nexus.com', 'gst_number': '08OPQRS3456R9H3'},
        {'name': 'Alpha Dynamics', 'address': '741 Alpha Center, Lucknow', 'phone': '9876543219', 'email': 'contact@alpha.com', 'gst_number': '09TUVWX7890S0I4'}
    ]
    
    companies = []
    for company_data in companies_data:
        company_data['created_by'] = user
        company, created = Company.objects.get_or_create(
            name=company_data['name'],
            defaults=company_data
        )
        companies.append(company)
        if created:
            print(f"Created company: {company.name}")
    
    # Create products
    # Create HSN codes first
    hsn_codes = {
        '84713000': HSNCode.objects.get_or_create(code='84713000', defaults={'description': 'Laptops and computers', 'gst_rate': Decimal('18.00')})[0],
        '84433210': HSNCode.objects.get_or_create(code='84433210', defaults={'description': 'Printers', 'gst_rate': Decimal('18.00')})[0],
        '94013000': HSNCode.objects.get_or_create(code='94013000', defaults={'description': 'Office chairs', 'gst_rate': Decimal('18.00')})[0],
        '94036000': HSNCode.objects.get_or_create(code='94036000', defaults={'description': 'Office furniture', 'gst_rate': Decimal('18.00')})[0],
        '85286200': HSNCode.objects.get_or_create(code='85286200', defaults={'description': 'Projectors', 'gst_rate': Decimal('18.00')})[0],
        '99830001': HSNCode.objects.get_or_create(code='99830001', defaults={'description': 'Software licenses', 'gst_rate': Decimal('18.00')})[0],
        '85176990': HSNCode.objects.get_or_create(code='85176990', defaults={'description': 'Network equipment', 'gst_rate': Decimal('18.00')})[0],
        '85044090': HSNCode.objects.get_or_create(code='85044090', defaults={'description': 'UPS systems', 'gst_rate': Decimal('18.00')})[0],
        '85258020': HSNCode.objects.get_or_create(code='85258020', defaults={'description': 'Security cameras', 'gst_rate': Decimal('18.00')})[0],
        '85171200': HSNCode.objects.get_or_create(code='85171200', defaults={'description': 'Mobile devices', 'gst_rate': Decimal('18.00')})[0],
        '94032090': HSNCode.objects.get_or_create(code='94032090', defaults={'description': 'Server racks', 'gst_rate': Decimal('18.00')})[0],
        '84151010': HSNCode.objects.get_or_create(code='84151010', defaults={'description': 'Air conditioners', 'gst_rate': Decimal('18.00')})[0],
        '85285200': HSNCode.objects.get_or_create(code='85285200', defaults={'description': 'LED monitors', 'gst_rate': Decimal('18.00')})[0],
    }
    
    products_data = [
        {'name': 'Laptop Dell Inspiron', 'description': 'High-performance laptop', 'selling_price': Decimal('45000.00'), 'company': companies[0], 'hsn_code': hsn_codes['84713000']},
        {'name': 'Desktop Computer', 'description': 'Business desktop PC', 'selling_price': Decimal('35000.00'), 'company': companies[1], 'hsn_code': hsn_codes['84713000']},
        {'name': 'Printer HP LaserJet', 'description': 'Laser printer for office', 'selling_price': Decimal('15000.00'), 'company': companies[2], 'hsn_code': hsn_codes['84433210']},
        {'name': 'Office Chair', 'description': 'Ergonomic office chair', 'selling_price': Decimal('8000.00'), 'company': companies[3], 'hsn_code': hsn_codes['94013000']},
        {'name': 'Conference Table', 'description': '10-seater conference table', 'selling_price': Decimal('25000.00'), 'company': companies[4], 'hsn_code': hsn_codes['94036000']},
        {'name': 'Projector Epson', 'description': 'HD projector for presentations', 'selling_price': Decimal('40000.00'), 'company': companies[5], 'hsn_code': hsn_codes['85286200']},
        {'name': 'Software License', 'description': 'Annual software license', 'selling_price': Decimal('12000.00'), 'company': companies[6], 'hsn_code': hsn_codes['99830001']},
        {'name': 'Network Switch', 'description': '24-port network switch', 'selling_price': Decimal('18000.00'), 'company': companies[7], 'hsn_code': hsn_codes['85176990']},
        {'name': 'UPS System', 'description': '2KVA UPS backup system', 'selling_price': Decimal('22000.00'), 'company': companies[8], 'hsn_code': hsn_codes['85044090']},
        {'name': 'Security Camera', 'description': 'IP security camera', 'selling_price': Decimal('5000.00'), 'company': companies[9], 'hsn_code': hsn_codes['85258020']},
        {'name': 'Mobile Phone', 'description': 'Business smartphone', 'selling_price': Decimal('20000.00'), 'company': companies[0], 'hsn_code': hsn_codes['85171200']},
        {'name': 'Tablet Device', 'description': '10-inch business tablet', 'selling_price': Decimal('30000.00'), 'company': companies[1], 'hsn_code': hsn_codes['85171200']},
        {'name': 'Server Rack', 'description': '42U server rack cabinet', 'selling_price': Decimal('50000.00'), 'company': companies[2], 'hsn_code': hsn_codes['94032090']},
        {'name': 'Air Conditioner', 'description': '2-ton split AC unit', 'selling_price': Decimal('35000.00'), 'company': companies[3], 'hsn_code': hsn_codes['84151010']},
        {'name': 'LED Monitor', 'description': '24-inch LED monitor', 'selling_price': Decimal('12000.00'), 'company': companies[4], 'hsn_code': hsn_codes['85285200']}
    ]
    
    products = []
    for product_data in products_data:
        product, created = Product.objects.get_or_create(
            name=product_data['name'],
            defaults=product_data
        )
        products.append(product)
        if created:
            print(f"Created product: {product.name}")
    
    # Create sample proforma invoices
    for i in range(5):
        company = random.choice(companies)
        proforma = ProformaInvoice.objects.create(
            company=company,
            proforma_number=f"PF{2024}{str(i+1).zfill(3)}",
            date=date.today() - timedelta(days=random.randint(1, 30)),
            valid_until=date.today() + timedelta(days=30),
            terms_conditions="Payment within 30 days. Prices inclusive of GST.",
            notes=f"Quotation for {company.name}"
        )
        
        # Add 2-4 items to each proforma
        selected_products = random.sample(products, random.randint(2, 4))
        for product in selected_products:
            quantity = random.randint(1, 10)
            ProformaInvoiceItem.objects.create(
                proforma_invoice=proforma,
                product=product,
                quantity=quantity,
                unit_price=product.selling_price,
                line_total=product.selling_price * quantity
            )
        
        proforma.calculate_totals()
        print(f"Created proforma invoice: {proforma.proforma_number} for {company.name}")

if __name__ == '__main__':
    create_dummy_data()
    print("Dummy data creation completed!")