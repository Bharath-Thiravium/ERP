from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from authentication.models import Company
from .models import Customer, CustomerShippingAddress, PurchaseOrder, ProformaInvoice, Product, Invoice, HSNCode
from decimal import Decimal
from datetime import date
from tests_common.payloads import VALID_CUSTOMER_PAYLOAD

class CustomerModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )

    def test_customer_creation(self):
        customer_data = VALID_CUSTOMER_PAYLOAD.copy()
        customer_data.update({
            'company': self.company,
            'name': 'Test Customer',
            'email': 'customer@test.com'
        })
        customer = Customer.objects.create(**customer_data)
        self.assertEqual(customer.name, "Test Customer")
        self.assertTrue(len(customer.customer_code) > 0)  # Auto-generated code exists

    def test_customer_full_address_property(self):
        customer_data = VALID_CUSTOMER_PAYLOAD.copy()
        customer_data.update({
            'company': self.company,
            'name': 'Test Customer',
            'billing_address_line1': '123 Main St',
            'billing_city': 'Test City',
            'billing_state': 'Test State',
            'billing_pincode': '12345'
        })
        customer = Customer.objects.create(**customer_data)
        address = customer.full_billing_address
        self.assertIn("123 Main St", address)
        self.assertIn("Test City", address)

class ProductModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )
        self.hsn_code = HSNCode.objects.create(
            code="1234",
            description="Test HSN",
            gst_rate=Decimal('18.00')
        )

    def test_product_creation(self):
        product = Product.objects.create(
            company=self.company,
            name="Test Product",
            product_type="product",
            hsn_code=self.hsn_code,
            selling_price=Decimal('100.00')
        )
        self.assertEqual(product.name, "Test Product")
        self.assertTrue(len(product.product_code) > 0)  # Auto-generated code exists
        self.assertEqual(product.gst_rate, Decimal('18.00'))

class InvoiceModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.company = Company.objects.create(
            name="Test Company",
            company_prefix="TEST",
            email="test@company.com",
            created_by=self.user
        )
        customer_data = VALID_CUSTOMER_PAYLOAD.copy()
        customer_data.update({
            'company': self.company,
            'name': 'Test Customer',
            'email': 'customer@test.com'
        })
        self.customer = Customer.objects.create(**customer_data)

    def test_invoice_creation(self):
        from django.utils import timezone
        invoice = Invoice.objects.create(
            company=self.company,
            customer=self.customer,
            invoice_date=timezone.now().date(),
            due_date=timezone.now().date(),
            total_amount=Decimal('1000.00')
        )
        self.assertEqual(invoice.customer, self.customer)
        self.assertTrue(len(invoice.invoice_number) > 0)  # Auto-generated invoice number exists
        self.assertEqual(invoice.outstanding_amount, Decimal('1000.00'))


class ProformaPDFShippingFallbackTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123'
        )
        self.company = Company.objects.create(
            name='Test Company 2',
            company_prefix='TEST2',
            email='test2@company.com',
            created_by=self.user
        )
        self.customer = Customer.objects.create(
            company=self.company,
            name='Test Customer 2',
            display_name='Test Customer 2',
            customer_type='business',
            billing_address_line1='123 Billing St',
            billing_city='Billing City',
            billing_state='Billing State',
            billing_pincode='12345',
            billing_country='India'
        )
        self.shipping_address = CustomerShippingAddress.objects.create(
            customer=self.customer,
            label='Warehouse',
            address_line1='456 Shipping Ave',
            address_line2='Suite 9',
            city='Shipping City',
            state='Shipping State',
            pincode='54321',
            country='India',
            is_default=True
        )
        self.purchase_order = PurchaseOrder.objects.create(
            company=self.company,
            customer=self.customer,
            po_number='PO-123',
            po_date=date.today(),
            internal_po_number='INT-PO-123',
            quotation_date=date.today(),
            valid_until=date.today(),
            gst_type='igst',
            customer_gstin='',
            company_gstin='',
            shipping_address=self.shipping_address
        )

    def test_proforma_pdf_uses_po_shipping_address_when_proforma_shipping_is_missing(self):
        proforma = ProformaInvoice.objects.create(
            company=self.company,
            customer=self.customer,
            purchase_order=self.purchase_order,
            proforma_number='PF-123',
            proforma_date=date.today(),
            due_date=date.today(),
            customer_gstin='',
            company_gstin='',
            gst_type='igst'
        )

        from finance.proforma_pdf_service import ProformaInvoicePDFService
        service = ProformaInvoicePDFService()
        context = service._prepare_context(proforma)

        self.assertEqual(context['shipping_info']['address'], self.shipping_address.full_address)
        self.assertEqual(context['shipping_info']['label'], self.shipping_address.label)
        self.assertEqual(proforma.shipping_address, self.shipping_address)
