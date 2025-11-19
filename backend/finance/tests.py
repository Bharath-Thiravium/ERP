from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APITestCase
from authentication.models import Company
from .models import Customer, Product, Invoice, HSNCode
from decimal import Decimal

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
        customer = Customer.objects.create(
            company=self.company,
            name="Test Customer",
            email="customer@test.com",
            customer_type="business"
        )
        self.assertEqual(customer.name, "Test Customer")
        self.assertTrue(len(customer.customer_code) > 0)  # Auto-generated code exists

    def test_customer_full_address_property(self):
        customer = Customer.objects.create(
            company=self.company,
            name="Test Customer",
            billing_address_line1="123 Main St",
            billing_city="Test City",
            billing_state="Test State",
            billing_pincode="12345"
        )
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
        self.customer = Customer.objects.create(
            company=self.company,
            name="Test Customer",
            email="customer@test.com"
        )

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