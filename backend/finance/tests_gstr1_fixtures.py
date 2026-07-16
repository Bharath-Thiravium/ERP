"""
Shared fixtures and factory helpers for all GSTR-1 tests.
Import this module in every GSTR-1 test file.
"""
from decimal import Decimal
from datetime import date
from unittest.mock import MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase

from authentication.models import Company, CompanyServiceUser
from finance.models import Customer, Invoice, InvoiceItem, HSNCode, Product

User = get_user_model()

# ── Constants used across tests ───────────────────────────────────────────────
COMPANY_GSTIN   = '27AABCU9603R1ZX'   # Maharashtra (27)
CUSTOMER_GSTIN  = '29AABCU9603R1ZX'   # Karnataka  (29) — inter-state
INTRA_GSTIN     = '27AABCU9603R1ZY'   # Maharashtra (27) — intra-state
FROM_DATE       = date(2024, 4, 1)
TO_DATE         = date(2024, 6, 30)


# ── Base TestCase with company + user ─────────────────────────────────────────
class Gstr1BaseTestCase(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username='gstr1_tester',
            email='gstr1@test.com',
            password='pass1234',
        )
        self.company = Company.objects.create(
            name='Test Co',
            company_prefix='TSTCO',
            email='test@testco.com',
            gst_number=COMPANY_GSTIN,
            created_by=self.user,
        )
        self.service_user = CompanyServiceUser.objects.create(
            company=self.company,
            user=self.user,
            role='admin',
            username='gstr1_admin',
            email='gstr1@test.com',
        )
        self.hsn = HSNCode.objects.create(
            code='8471',
            description='Computers',
            gst_rate=Decimal('18.00'),
        )
        self.product = _make_product(self.company, self.hsn)
        self.customer_b2b = _make_customer(
            self.company, 'B2B Customer', CUSTOMER_GSTIN, '29'
        )
        self.customer_b2cs = _make_customer(
            self.company, 'B2C Customer', '', ''
        )


# ── Factory helpers ───────────────────────────────────────────────────────────

def _make_product(company, hsn):
    return Product.objects.create(
        company=company,
        name='Laptop',
        product_type='product',
        hsn_code=hsn,
        gst_rate=Decimal('18.00'),
        unit='PCS',
        selling_price=Decimal('50000.00'),
    )


def _make_customer(company, name, gstin, state_code):
    return Customer.objects.create(
        company=company,
        customer_type='business',
        name=name,
        display_name=name,
        billing_address_line1='123 Main St',
        billing_city='Mumbai',
        billing_state='Maharashtra',
        billing_pincode='400001',
        billing_country='India',
        gstin=gstin or None,
        state_code=state_code or None,
    )


def make_invoice(company, customer, invoice_number, invoice_type='tax_invoice',
                 gst_type='igst', place_of_supply='29',
                 subtotal=Decimal('50000'), igst=Decimal('9000'),
                 cgst=Decimal('0'), sgst=Decimal('0'),
                 total=Decimal('59000'), inv_date=None,
                 is_rejected=False, **extra):
    """Create a minimal Invoice without triggering auto-number generation."""
    inv = Invoice(
        company=company,
        customer=customer,
        invoice_number=invoice_number,
        invoice_date=inv_date or date(2024, 4, 15),
        invoice_type=invoice_type,
        gst_type=gst_type,
        customer_gstin=(customer.gstin or '').strip(),
        company_gstin=company.gst_number,
        place_of_supply=place_of_supply,
        subtotal=subtotal,
        igst_amount=igst,
        cgst_amount=cgst,
        sgst_amount=sgst,
        total_amount=total,
        is_rejected=is_rejected,
        **extra,
    )
    # Bypass auto-number + outstanding recalc
    Invoice.save.__wrapped__ = None  # not needed; use update_fields trick
    from django.db import connection
    inv.outstanding_amount = total
    # Use super().save() path via direct DB insert
    super(Invoice, inv).save()
    return inv


def make_invoice_item(invoice, product, hsn_code, unit='PCS',
                      quantity=Decimal('1'), unit_price=Decimal('50000'),
                      gst_rate=Decimal('18'), line_number=1):
    item = InvoiceItem(
        invoice=invoice,
        product=product,
        product_name=product.name,
        product_code=product.product_code,
        hsn_sac_code=hsn_code,
        quantity=quantity,
        unit=unit,
        unit_price=unit_price,
        line_total=(quantity * unit_price).quantize(Decimal('0.01')),
        gst_rate=gst_rate,
        line_number=line_number,
    )
    super(InvoiceItem, item).save()
    return item


def make_mock_invoice(invoice_number='INV-001', invoice_type='tax_invoice',
                      customer_gstin=CUSTOMER_GSTIN, gst_type='igst',
                      place_of_supply='29', subtotal=50000,
                      igst=9000, cgst=0, sgst=0, total=59000,
                      is_rejected=False, is_amendment=False,
                      original_document_number='', gst_supply_type='',
                      reverse_charge=False, items=None):
    """
    Build a fully mocked Invoice object — no DB required.
    Used for pure-unit tests of classification / validation / export service.
    """
    inv = MagicMock()
    inv.invoice_number = invoice_number
    inv.invoice_type = invoice_type
    inv.invoice_date = date(2024, 4, 15)
    inv.customer_gstin = customer_gstin
    inv.gst_type = gst_type
    inv.place_of_supply = place_of_supply
    inv.subtotal = Decimal(str(subtotal))
    inv.igst_amount = Decimal(str(igst))
    inv.cgst_amount = Decimal(str(cgst))
    inv.sgst_amount = Decimal(str(sgst))
    inv.total_amount = Decimal(str(total))
    inv.is_rejected = is_rejected
    inv.is_amendment = is_amendment
    inv.original_document_number = original_document_number
    inv.gst_supply_type = gst_supply_type
    inv.reverse_charge_applicable = reverse_charge
    inv.cess_amount = Decimal('0')
    inv.ecommerce_gstin = ''
    inv.gstr1_excluded = False

    cust = MagicMock()
    cust.name = 'Test Customer'
    cust.state_code = place_of_supply
    cust.billing_state = ''
    inv.customer = cust

    if items is None:
        item = _make_mock_item()
        inv.invoice_items.all.return_value = [item]
    else:
        inv.invoice_items.all.return_value = items

    return inv


def _make_mock_item(hsn='8471', unit='PCS', gst_rate=18,
                    quantity=1, line_total=50000, line_number=1):
    item = MagicMock()
    item.hsn_sac_code = hsn
    item.unit = unit
    item.gst_rate = Decimal(str(gst_rate))
    item.quantity = Decimal(str(quantity))
    item.line_total = Decimal(str(line_total))
    item.cess_amount = Decimal('0')
    item.description = 'Laptop'
    item.product_name = 'Laptop'
    item.line_number = line_number
    return item
