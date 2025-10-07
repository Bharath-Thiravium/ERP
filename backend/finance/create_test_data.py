"""
Create test data for document generation
"""
from django.core.management.base import BaseCommand
from authentication.models import Company, CompanyServiceUser, ServiceUserSession
from finance.models import Customer, Product, Quotation, QuotationItem, Invoice, InvoiceItem, ProformaInvoice, ProformaInvoiceItem, Payment
from decimal import Decimal
from datetime import date, timedelta
import uuid

def create_test_data_for_company(company_id, session_key):
    """Create test data for a specific company"""
    try:
        # Get session and company
        session = ServiceUserSession.objects.get(session_key=session_key, is_active=True)
        company = session.service_user.company
        service_user = session.service_user
        
        print(f"Creating test data for company: {company.name}")
        
        # Create test customers
        customers = []
        customer_data = [
            {'name': 'ABC Corporation', 'email': 'contact@abc.com', 'phone': '9876543210'},
            {'name': 'XYZ Limited', 'email': 'info@xyz.com', 'phone': '9876543211'},
            {'name': 'DEF Industries', 'email': 'sales@def.com', 'phone': '9876543212'},
        ]
        
        for data in customer_data:
            customer, created = Customer.objects.get_or_create(
                company=company,
                name=data['name'],
                defaults={
                    'email': data['email'],
                    'phone': data['phone'],
                    'customer_type': 'business',
                    'billing_city': 'Mumbai',
                    'billing_state': 'Maharashtra',
                    'billing_country': 'India',
                    'created_by': service_user
                }
            )
            customers.append(customer)
            if created:
                print(f"Created customer: {customer.name}")
        
        # Create test products
        products = []
        product_data = [
            {'name': 'Software Development', 'price': Decimal('50000.00'), 'type': 'service'},
            {'name': 'Web Design', 'price': Decimal('25000.00'), 'type': 'service'},
            {'name': 'Consulting', 'price': Decimal('15000.00'), 'type': 'service'},
        ]
        
        for data in product_data:
            product, created = Product.objects.get_or_create(
                company=company,
                name=data['name'],
                defaults={
                    'product_type': data['type'],
                    'selling_price': data['price'],
                    'gst_rate': Decimal('18.00'),
                    'unit': 'HOUR',
                    'created_by': service_user
                }
            )
            products.append(product)
            if created:
                print(f"Created product: {product.name}")
        
        # Create test quotations
        for i, customer in enumerate(customers):
            quotation, created = Quotation.objects.get_or_create(
                company=company,
                customer=customer,
                quotation_date=date.today() - timedelta(days=i*5),
                defaults={
                    'valid_until': date.today() + timedelta(days=30),
                    'status': 'sent',
                    'created_by': service_user
                }
            )
            
            if created:
                # Add quotation items
                for j, product in enumerate(products[:2]):  # Add 2 products per quotation
                    QuotationItem.objects.create(
                        quotation=quotation,
                        product=product,
                        quantity=Decimal('10.00'),
                        unit_price=product.selling_price,
                        line_number=j+1
                    )
                
                quotation.calculate_totals()
                print(f"Created quotation: {quotation.quotation_number}")
        
        # Create test invoices
        for i, customer in enumerate(customers):
            invoice, created = Invoice.objects.get_or_create(
                company=company,
                customer=customer,
                invoice_date=date.today() - timedelta(days=i*3),
                defaults={
                    'due_date': date.today() + timedelta(days=30),
                    'status': 'sent',
                    'created_by': service_user
                }
            )
            
            if created:
                # Add invoice items
                for j, product in enumerate(products[:2]):  # Add 2 products per invoice
                    InvoiceItem.objects.create(
                        invoice=invoice,
                        product=product,
                        quantity=Decimal('8.00'),
                        unit_price=product.selling_price,
                        line_number=j+1
                    )
                
                invoice.calculate_totals()
                print(f"Created invoice: {invoice.invoice_number}")
        
        # Create test proforma invoices
        for i, customer in enumerate(customers):
            proforma, created = ProformaInvoice.objects.get_or_create(
                company=company,
                customer=customer,
                proforma_date=date.today() - timedelta(days=i*2),
                defaults={
                    'due_date': date.today() + timedelta(days=15),
                    'status': 'sent',
                    'created_by': service_user
                }
            )
            
            if created:
                # Add proforma items
                for j, product in enumerate(products[:1]):  # Add 1 product per proforma
                    ProformaInvoiceItem.objects.create(
                        proforma_invoice=proforma,
                        product=product,
                        quantity=Decimal('5.00'),
                        unit_price=product.selling_price,
                        line_number=j+1
                    )
                
                proforma.calculate_totals()
                print(f"Created proforma: {proforma.proforma_number}")
        
        # Create test payments
        for i, customer in enumerate(customers):
            payment, created = Payment.objects.get_or_create(
                company=company,
                customer=customer,
                payment_date=date.today() - timedelta(days=i),
                defaults={
                    'amount': Decimal('25000.00'),
                    'payment_method': 'bank_transfer',
                    'status': 'completed',
                    'created_by': service_user
                }
            )
            
            if created:
                print(f"Created payment: {payment.payment_number}")
        
        print("Test data creation completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error creating test data: {str(e)}")
        return False

if __name__ == "__main__":
    # This can be called from Django shell or management command
    pass