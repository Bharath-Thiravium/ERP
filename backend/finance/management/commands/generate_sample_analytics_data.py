"""
Django management command to generate sample analytics data for testing
Usage: python manage.py generate_sample_analytics_data
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
import random
from ...models import Customer, Invoice, Payment
from authentication.models import Company

class Command(BaseCommand):
    help = 'Generate sample analytics data for testing Phase 4 features'

    def add_arguments(self, parser):
        parser.add_argument(
            '--company-id',
            type=int,
            help='Company ID to generate data for'
        )
        parser.add_argument(
            '--months',
            type=int,
            default=6,
            help='Number of months of data to generate'
        )

    def handle(self, *args, **options):
        company_id = options.get('company_id')
        months = options['months']
        
        if not company_id:
            self.stdout.write(
                self.style.ERROR('Please provide --company-id parameter')
            )
            return
        
        try:
            company = Company.objects.get(id=company_id)
        except Company.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Company with ID {company_id} not found')
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'Generating {months} months of sample data for {company.name}...')
        )
        
        # Generate sample customers
        customers = self.create_sample_customers(company)
        self.stdout.write(f'Created {len(customers)} sample customers')
        
        # Generate sample invoices and payments
        total_invoices = 0
        total_payments = 0
        
        for month_offset in range(months):
            month_date = timezone.now().date() - timedelta(days=30 * month_offset)
            invoices_created = self.create_monthly_invoices(company, customers, month_date)
            payments_created = self.create_monthly_payments(invoices_created)
            
            total_invoices += len(invoices_created)
            total_payments += len(payments_created)
            
            self.stdout.write(f'Month {month_offset + 1}: {len(invoices_created)} invoices, {len(payments_created)} payments')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Sample data generation completed!\n'
                f'Total: {total_invoices} invoices, {total_payments} payments'
            )
        )

    def create_sample_customers(self, company):
        """Create sample customers with varied GST registration status"""
        customers_data = [
            {
                'name': 'Tech Solutions Pvt Ltd',
                'email': 'contact@techsolutions.com',
                'phone': '9876543210',
                'address': '123 Tech Park, Bangalore',
                'city': 'Bangalore',
                'state': 'Karnataka',
                'state_code': '29',
                'pincode': '560001',
                'is_gst_registered': True,
                'gstin': '29AAAAA0000A1Z5',
                'pan': 'AAAAA0000A'
            },
            {
                'name': 'Digital Marketing Agency',
                'email': 'hello@digitalagency.com',
                'phone': '9876543211',
                'address': '456 Business District, Mumbai',
                'city': 'Mumbai',
                'state': 'Maharashtra',
                'state_code': '27',
                'pincode': '400001',
                'is_gst_registered': True,
                'gstin': '27BBBBB1111B2Z6',
                'pan': 'BBBBB1111B'
            },
            {
                'name': 'Consulting Services',
                'email': 'info@consulting.com',
                'phone': '9876543212',
                'address': '789 Corporate Hub, Delhi',
                'city': 'Delhi',
                'state': 'Delhi',
                'state_code': '07',
                'pincode': '110001',
                'is_gst_registered': True,
                'gstin': '07CCCCC2222C3Z7',
                'pan': 'CCCCC2222C'
            },
            {
                'name': 'Small Business Owner',
                'email': 'owner@smallbiz.com',
                'phone': '9876543213',
                'address': '321 Local Market, Pune',
                'city': 'Pune',
                'state': 'Maharashtra',
                'state_code': '27',
                'pincode': '411001',
                'is_gst_registered': False,
                'gstin': '',
                'pan': 'DDDDD3333D'
            },
            {
                'name': 'Freelance Designer',
                'email': 'designer@freelance.com',
                'phone': '9876543214',
                'address': '654 Creative Space, Chennai',
                'city': 'Chennai',
                'state': 'Tamil Nadu',
                'state_code': '33',
                'pincode': '600001',
                'is_gst_registered': False,
                'gstin': '',
                'pan': 'EEEEE4444E'
            }
        ]
        
        customers = []
        for data in customers_data:
            customer, created = Customer.objects.get_or_create(
                company=company,
                email=data['email'],
                defaults=data
            )
            customers.append(customer)
        
        return customers

    def create_monthly_invoices(self, company, customers, base_date):
        """Create sample invoices for a month"""
        invoices = []
        
        # Generate 15-25 invoices per month
        num_invoices = random.randint(15, 25)
        
        for i in range(num_invoices):
            customer = random.choice(customers)
            
            # Random date within the month
            day_offset = random.randint(1, 28)
            invoice_date = base_date.replace(day=day_offset)
            
            # Random invoice amounts
            subtotal = Decimal(str(random.randint(10000, 500000)))  # 10K to 5L
            
            # GST calculation based on customer type and amount
            if customer.is_gst_registered:
                # B2B - can have different GST rates
                gst_rates = [5, 12, 18, 28]
                gst_rate = random.choice(gst_rates)
                
                # Determine if inter-state or intra-state
                company_state = getattr(company, 'state_code', '27')  # Default to Maharashtra
                is_inter_state = customer.state_code != company_state
                
                if is_inter_state:
                    # IGST
                    igst_amount = subtotal * Decimal(str(gst_rate)) / 100
                    cgst_amount = Decimal('0')
                    sgst_amount = Decimal('0')
                else:
                    # CGST + SGST
                    igst_amount = Decimal('0')
                    cgst_amount = subtotal * Decimal(str(gst_rate)) / 200  # Half of GST rate
                    sgst_amount = subtotal * Decimal(str(gst_rate)) / 200  # Half of GST rate
            else:
                # B2C - usually 18% GST
                gst_rate = 18
                igst_amount = Decimal('0')
                cgst_amount = subtotal * Decimal('9') / 100  # 9% CGST
                sgst_amount = subtotal * Decimal('9') / 100  # 9% SGST
            
            total_amount = subtotal + igst_amount + cgst_amount + sgst_amount
            
            invoice = Invoice.objects.create(
                company=company,
                customer=customer,
                invoice_number=f'INV-{invoice_date.strftime("%Y%m")}-{i+1:03d}',
                subtotal=subtotal,
                gst_rate=gst_rate,
                igst_amount=igst_amount,
                cgst_amount=cgst_amount,
                sgst_amount=sgst_amount,
                total_amount=total_amount,
                place_of_supply=customer.state_code,
                reverse_charge_applicable=False,
                created_at=timezone.make_aware(datetime.combine(invoice_date, datetime.min.time()))
            )
            
            invoices.append(invoice)
        
        return invoices

    def create_monthly_payments(self, invoices):
        """Create sample payments for invoices"""
        payments = []
        
        # Create payments for 70-90% of invoices
        num_payments = int(len(invoices) * random.uniform(0.7, 0.9))
        selected_invoices = random.sample(invoices, num_payments)
        
        tds_sections = ['194C', '194J', '194I', '194H']
        tds_rates = [1, 2, 10, 5]  # Corresponding rates for sections
        
        for invoice in selected_invoices:
            # Payment date 5-30 days after invoice
            payment_date = invoice.created_at.date() + timedelta(days=random.randint(5, 30))
            
            # Determine if TDS should be deducted (for higher amounts)
            should_deduct_tds = invoice.total_amount > 30000 and random.choice([True, False])
            
            if should_deduct_tds:
                tds_section = random.choice(tds_sections)
                tds_rate = tds_rates[tds_sections.index(tds_section)]
                tds_amount = invoice.subtotal * Decimal(str(tds_rate)) / 100
                payment_amount = invoice.total_amount - tds_amount
            else:
                tds_section = None
                tds_rate = 0
                tds_amount = Decimal('0')
                payment_amount = invoice.total_amount
            
            payment = Payment.objects.create(
                company=company,
                invoice=invoice,
                amount=payment_amount,
                payment_method=random.choice(['bank_transfer', 'cheque', 'cash', 'online']),
                payment_reference=f'PAY-{payment_date.strftime("%Y%m%d")}-{random.randint(1000, 9999)}',
                tds_amount=tds_amount,
                tds_section_code=tds_section,
                tds_rate_applied=tds_rate,
                tds_certificate_issued=random.choice([True, False]) if tds_amount > 0 else False,
                created_at=timezone.make_aware(datetime.combine(payment_date, datetime.min.time()))
            )
            
            payments.append(payment)
        
        return payments