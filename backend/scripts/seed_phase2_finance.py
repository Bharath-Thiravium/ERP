"""
Phase 2: Finance Seed Data for Royal Enfield (company_id=40)
Customers, Vendors, Products, Quotations, Invoices, Payments, Purchase Orders
"""
import os, sys, random
sys.path.insert(0, '/home/athenaerp/athenaerp/ERP/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
import django; django.setup()

from datetime import date, timedelta
from decimal import Decimal
from authentication.models import Company, CompanyServiceUser
from finance.models import (
    Customer, Vendor, Product, Unit,
    Quotation, QuotationItem,
    Invoice, InvoiceItem,
    Payment, PurchaseOrder, PurchaseOrderItem,
    VendorInvoice, VendorInvoiceItem, PurchasePayment
)

COMPANY_ID = 40
company = Company.objects.get(id=COMPANY_ID)
service_user = CompanyServiceUser.objects.filter(company=company, service__service_type='finance').first()
today = date.today()

# Use existing unit
unit_nos = Unit.objects.filter(name='Numbers').first() or Unit.objects.filter(company=company).first()
unit_pcs = Unit.objects.filter(name='Pieces').first() or unit_nos

print("=== Phase 2: Finance Seed Data ===")

# ── Customers ─────────────────────────────────────────────────────────────────
customers_data = [
    ('Bajaj Auto Ltd',        'bajaj.auto@bajaj.com',       '9800001001', 'Mumbai',    'Maharashtra', '27AABCB1234A1Z5', 'business'),
    ('Hero MotoCorp Ltd',     'hero.moto@hero.com',         '9800001002', 'New Delhi',  'Delhi',       '07AABCH5678B1Z3', 'business'),
    ('TVS Motor Company',     'tvs.motor@tvs.com',          '9800001003', 'Chennai',   'Tamil Nadu',  '33AABCT9012C1Z1', 'business'),
    ('Yamaha Motor India',    'yamaha.india@yamaha.com',    '9800001004', 'Surajpur',  'Uttar Pradesh','09AABCY3456D1Z9','business'),
    ('Suzuki Motorcycle',     'suzuki.moto@suzuki.com',     '9800001005', 'Gurugram',  'Haryana',     '06AABCS7890E1Z7', 'business'),
    ('Moto Accessories Hub',  'moto.acc@motohub.com',       '9800001006', 'Pune',      'Maharashtra', '27AABCM2345F1Z5', 'business'),
    ('Rider Gear Store',      'rider.gear@ridergear.com',   '9800001007', 'Bengaluru', 'Karnataka',   '29AABCR6789G1Z3', 'business'),
    ('Speed Parts Depot',     'speed.parts@speedparts.com', '9800001008', 'Hyderabad', 'Telangana',   '36AABCS1234H1Z1', 'business'),
    ('Classic Moto Works',    'classic.moto@classicmoto.com','9800001009','Jaipur',    'Rajasthan',   '08AABCC5678I1Z9', 'business'),
    ('Enfield Enthusiasts',   'enfield.ent@efenthusiast.com','9800001010','Kochi',     'Kerala',      '32AABCE9012J1Z7', 'individual'),
]
customers = []
for i, (name, email, phone, city, state, gstin, ctype) in enumerate(customers_data):
    c, created = Customer.objects.get_or_create(
        company=company, email=email,
        defaults={
            'customer_code': f'CUST{1000+i:04d}',
            'name': name, 'display_name': name,
            'phone': phone, 'customer_type': ctype,
            'billing_address_line1': '123 Business Park',
            'billing_city': city, 'billing_state': state,
            'billing_country': 'India', 'billing_pincode': '600001',
            'gstin': gstin, 'is_gst_registered': True,
            'state_code': gstin[:2], 'currency': 'INR',
            'payment_terms': 30, 'is_active': True,
        }
    )
    customers.append(c)
    if created: print(f"  + Customer: {name}")
print(f"  Customers ready: {len(customers)}")

# ── Vendors ───────────────────────────────────────────────────────────────────
vendors_data = [
    ('Steel Authority of India', 'sail@sail.com',         '9700001001', 'New Delhi',  'Delhi',       '07AABCS1111A1Z1', 'manufacturer'),
    ('Bosch India Ltd',          'bosch@bosch.in',        '9700001002', 'Bengaluru',  'Karnataka',   '29AABCB2222B1Z9', 'manufacturer'),
    ('Minda Industries',         'minda@minda.com',       '9700001003', 'Gurugram',   'Haryana',     '06AABCM3333C1Z7', 'manufacturer'),
    ('Lumax Industries',         'lumax@lumax.com',       '9700001004', 'New Delhi',  'Delhi',       '07AABCL4444D1Z5', 'manufacturer'),
    ('Endurance Technologies',   'endurance@endurance.in','9700001005', 'Aurangabad', 'Maharashtra', '27AABCE5555E1Z3', 'manufacturer'),
    ('Castrol India',            'castrol@castrol.in',    '9700001006', 'Mumbai',     'Maharashtra', '27AABCC6666F1Z1', 'distributor'),
    ('MRF Tyres',                'mrf@mrf.com',           '9700001007', 'Chennai',    'Tamil Nadu',  '33AABCM7777G1Z9', 'manufacturer'),
    ('Exide Industries',         'exide@exide.in',        '9700001008', 'Kolkata',    'West Bengal', '19AABCE8888H1Z7', 'manufacturer'),
]
vendors = []
for i, (name, email, phone, city, state, gstin, vtype) in enumerate(vendors_data):
    v, created = Vendor.objects.get_or_create(
        company=company, email=email,
        defaults={
            'vendor_code': f'VEND{1000+i:04d}',
            'name': name, 'vendor_type': vtype,
            'contact_person': 'Accounts Manager',
            'phone': phone, 'city': city, 'state': state,
            'country': 'India', 'pincode': '110001',
            'gstin': gstin, 'payment_terms': 45,
            'is_active': True,
        }
    )
    vendors.append(v)
    if created: print(f"  + Vendor: {name}")
print(f"  Vendors ready: {len(vendors)}")

# ── Products ──────────────────────────────────────────────────────────────────
products_data = [
    ('Classic 350 Engine Assembly',  'RE-ENG-350',  'goods', 18, 45000, 38000, '87089900'),
    ('Meteor 350 Fuel Tank',         'RE-FT-350',   'goods', 18, 8500,  7000,  '87089900'),
    ('Himalayan Exhaust System',     'RE-EXH-HIM',  'goods', 18, 12000, 9500,  '87089900'),
    ('Thunderbird Seat Assembly',    'RE-SEAT-TB',  'goods', 18, 4500,  3500,  '94012000'),
    ('Classic Chrome Handlebar',     'RE-HB-CHR',   'goods', 18, 3200,  2500,  '87089900'),
    ('RE Genuine Engine Oil 1L',     'RE-OIL-1L',   'goods', 18, 450,   320,   '27101990'),
    ('Bullet 350 Brake Pad Set',     'RE-BP-350',   'goods', 18, 850,   620,   '87083000'),
    ('RE Air Filter Element',        'RE-AF-001',   'goods', 18, 650,   480,   '84213990'),
    ('Classic 500 Piston Kit',       'RE-PK-500',   'goods', 18, 2800,  2100,  '84099990'),
    ('RE Spark Plug NGK',            'RE-SP-NGK',   'goods', 18, 280,   190,   '85111000'),
    ('Himalayan Windscreen',         'RE-WS-HIM',   'goods', 18, 3500,  2700,  '70091000'),
    ('RE Riding Jacket - L',         'RE-RJ-L',     'goods', 12, 5500,  4200,  '61013000'),
    ('RE Helmet Full Face',          'RE-HLM-FF',   'goods', 18, 4800,  3600,  '65061000'),
    ('Annual Maintenance Contract',  'RE-AMC-001',  'service', 18, 8000, 6000, '998714'),
    ('Extended Warranty - 2yr',      'RE-EW-2Y',    'service', 18, 6500, 5000, '998714'),
]
products = []
for i, (name, code, ptype, gst, sell, buy, hsn) in enumerate(products_data):
    p, created = Product.objects.get_or_create(
        company=company, product_code=code,
        defaults={
            'name': name, 'product_type': ptype,
            'gst_rate': Decimal(str(gst)),
            'selling_price': Decimal(str(sell)),
            'purchase_price': Decimal(str(buy)),
            'unit': unit_nos.name if unit_nos else 'Nos',
            'is_active': True, 'track_inventory': ptype == 'goods',
            'current_stock': random.randint(20, 200) if ptype == 'goods' else 0,
            'minimum_stock': 10,
        }
    )
    products.append(p)
    if created: print(f"  + Product: {name}")
print(f"  Products ready: {len(products)}")

# ── Helper ────────────────────────────────────────────────────────────────────
def calc_gst(amount, gst_rate, gst_type='intrastate'):
    tax = amount * gst_rate / 100
    if gst_type == 'intrastate':
        return round(tax/2, 2), round(tax/2, 2), Decimal('0')
    return Decimal('0'), Decimal('0'), round(tax, 2)

# ── Quotations (last 6 months) ────────────────────────────────────────────────
quot_statuses = ['draft', 'sent', 'accepted', 'accepted', 'accepted', 'rejected']
quotations = []
q_num = 1
for i in range(18):
    cust = customers[i % len(customers)]
    days_ago = random.randint(5, 180)
    q_date = today - timedelta(days=days_ago)
    valid_until = q_date + timedelta(days=30)
    gst_type = 'intrastate' if cust.billing_state == 'Tamil Nadu' else 'interstate'
    status = quot_statuses[i % len(quot_statuses)]

    # pick 2-4 products
    chosen = random.sample(products[:12], random.randint(2, 4))
    subtotal = Decimal('0')
    items_data = []
    for prod in chosen:
        qty = random.randint(1, 10)
        price = prod.selling_price
        line = round(qty * price, 2)
        subtotal += line
        items_data.append((prod, qty, price, line))

    total_tax = round(subtotal * Decimal('0.18'), 2)
    total = subtotal + total_tax
    cgst, sgst, igst = calc_gst(subtotal, 18, gst_type)

    q = Quotation.objects.create(
        company=company, customer=cust,
        quotation_number=f'QT{today.year}{q_num:04d}',
        quotation_date=q_date, valid_until=valid_until,
        gst_type=gst_type,
        company_gstin='33AABCR1234A1Z5',
        customer_gstin=cust.gstin or '',
        subtotal=subtotal, total_tax=total_tax, total_amount=total,
        cgst_amount=cgst, sgst_amount=sgst, igst_amount=igst,
        status=status,
        notes='Thank you for your business.',
        terms_and_conditions='Payment due within 30 days.',
        created_by=service_user,
    )
    for ln, (prod, qty, price, line) in enumerate(items_data, 1):
        QuotationItem.objects.create(
            quotation=q, product=prod, line_number=ln,
            product_name=prod.name, product_code=prod.product_code,
            hsn_sac_code='87089900', quantity=qty,
            unit=unit_nos.name if unit_nos else 'Nos',
            unit_price=price, line_total=line,
            gst_rate=Decimal('18'),
        )
    quotations.append(q)
    q_num += 1
print(f"  Quotations created: {len(quotations)}")

# ── Invoices (last 6 months) ──────────────────────────────────────────────────
inv_statuses = ['paid', 'paid', 'paid', 'partial', 'unpaid', 'overdue']
invoices = []
inv_num = 1
for i in range(24):
    cust = customers[i % len(customers)]
    days_ago = random.randint(5, 180)
    inv_date = today - timedelta(days=days_ago)
    due_date = inv_date + timedelta(days=30)
    gst_type = 'intrastate' if cust.billing_state == 'Tamil Nadu' else 'interstate'
    pay_status = inv_statuses[i % len(inv_statuses)]

    chosen = random.sample(products[:12], random.randint(2, 5))
    subtotal = Decimal('0')
    items_data = []
    for prod in chosen:
        qty = random.randint(1, 15)
        price = prod.selling_price
        line = round(qty * price, 2)
        subtotal += line
        items_data.append((prod, qty, price, line))

    total_tax = round(subtotal * Decimal('0.18'), 2)
    total = subtotal + total_tax
    cgst, sgst, igst = calc_gst(subtotal, 18, gst_type)

    if pay_status == 'paid':
        paid_amt = total
    elif pay_status == 'partial':
        paid_amt = round(total * Decimal('0.5'), 2)
    else:
        paid_amt = Decimal('0')
    outstanding = total - paid_amt

    inv = Invoice.objects.create(
        company=company, customer=cust,
        invoice_number=f'INV{today.year}{inv_num:04d}',
        invoice_date=inv_date, due_date=due_date,
        gst_type=gst_type,
        company_gstin='33AABCR1234A1Z5',
        customer_gstin=cust.gstin or '',
        subtotal=subtotal, total_tax=total_tax, total_amount=total,
        cgst_amount=cgst, sgst_amount=sgst, igst_amount=igst,
        payment_status=pay_status,
        paid_amount=paid_amt, outstanding_amount=outstanding,
        last_payment_date=inv_date + timedelta(days=5) if paid_amt > 0 else None,
        invoice_type='tax_invoice',
        place_of_supply=cust.billing_state[:2] if cust.billing_state else '33',
        notes='Thank you for your business.',
        created_by=service_user,
    )
    for ln, (prod, qty, price, line) in enumerate(items_data, 1):
        InvoiceItem.objects.create(
            invoice=inv, product=prod, line_number=ln,
            product_name=prod.name, product_code=prod.product_code,
            hsn_sac_code='87089900', quantity=qty,
            unit=unit_nos.name if unit_nos else 'Nos',
            unit_price=price, line_total=line,
            gst_rate=Decimal('18'),
        )
    invoices.append(inv)
    inv_num += 1
print(f"  Invoices created: {len(invoices)}")

# ── Payments ──────────────────────────────────────────────────────────────────
pay_methods = ['bank_transfer', 'cheque', 'upi', 'cash']
pay_count = 0
for inv in invoices:
    if inv.paid_amount > 0:
        Payment.objects.create(
            company=company, invoice=inv, customer=inv.customer,
            payment_number=f'PAY{today.year}{pay_count+1:04d}',
            payment_date=inv.last_payment_date or inv.invoice_date + timedelta(days=5),
            amount=inv.paid_amount,
            gross_payment_amount=inv.paid_amount,
            net_amount_received=inv.paid_amount,
            payment_method=random.choice(pay_methods),
            payment_type='receipt',
            payment_purpose='invoice_payment',
            status='completed',
            created_by=service_user,
        )
        pay_count += 1
print(f"  Payments created: {pay_count}")

# ── Purchase Orders (skip - not in this model) ────────────────────────────────────────────────
print("  Purchase Orders: skipped (model not available)")

# ── Vendor Invoices ───────────────────────────────────────────────────────────
vi_count = 0
for i in range(10):
    vend = vendors[i % len(vendors)]
    days_ago = random.randint(5, 90)
    vi_date = today - timedelta(days=days_ago)
    due_date = vi_date + timedelta(days=45)
    subtotal = Decimal(str(random.randint(50000, 500000)))
    total_tax = round(subtotal * Decimal('0.18'), 2)
    total = subtotal + total_tax
    pay_status = random.choice(['paid', 'paid', 'unpaid', 'partial'])
    paid = total if pay_status == 'paid' else (round(total*Decimal('0.5'),2) if pay_status == 'partial' else Decimal('0'))

    vi = VendorInvoice.objects.create(
        company=company, vendor=vend,
        vendor_invoice_number=f'VI{today.year}{vi_count+1:04d}',
        vendor_invoice_date=vi_date, due_date=due_date,
        gst_type='intrastate',
        subtotal=subtotal, total_tax=total_tax, total_amount=total,
        cgst_amount=round(total_tax/2, 2), sgst_amount=round(total_tax/2, 2),
        paid_amount=paid, outstanding_amount=total-paid,
        payment_status=pay_status, status='approved',
        created_by=service_user,
    )
    chosen = random.sample(products[:10], 2)
    for ln, prod in enumerate(chosen, 1):
        qty = random.randint(10, 50)
        price = prod.purchase_price
        VendorInvoiceItem.objects.create(
            vendor_invoice=vi, product=prod, line_number=ln,
            product_name=prod.name, product_code=prod.product_code,
            hsn_sac_code='87089900', quantity=qty,
            unit=unit_nos.name if unit_nos else 'Nos',
            unit_price=price, line_total=round(qty*price, 2),
            gst_rate=Decimal('18'),
        )
    if paid > 0:
        PurchasePayment.objects.create(
            company=company, vendor_invoice=vi, vendor=vend,
            payment_number=f'PP{today.year}{vi_count+1:04d}',
            payment_date=vi_date + timedelta(days=5),
            amount=paid, net_amount_paid=paid,
            payment_method=random.choice(pay_methods),
            status='completed',
        )
    vi_count += 1
print(f"  Vendor Invoices created: {vi_count}")

print("\n✅ Phase 2 Finance complete.")
