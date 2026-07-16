"""
Phase 3: Inventory Seed Data for Royal Enfield (company_id=40)
Categories, Suppliers, Warehouses, Products, Stock Movements, Stock Alerts
"""
import os, sys, random
sys.path.insert(0, '/home/athenaerp/athenaerp/ERP/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sap_backend.settings')
import django; django.setup()

from datetime import date, timedelta
from decimal import Decimal
from authentication.models import Company, CompanyServiceUser
from inventory.models import Category, Supplier, Warehouse, Product, StockMovement, StockAlert

COMPANY_ID = 40
company = Company.objects.get(id=COMPANY_ID)
service_user = CompanyServiceUser.objects.filter(company=company, service__service_type='inventory').first()
today = date.today()

print("=== Phase 3: Inventory Seed Data ===")

# ── Categories ────────────────────────────────────────────────────────────────
categories_data = [
    ('Engine Parts', 'Components for engine assembly'),
    ('Body & Paint', 'Body panels and paint supplies'),
    ('Electrical', 'Wiring, lights, electronics'),
    ('Brakes & Suspension', 'Brake pads, discs, shocks'),
    ('Fuel System', 'Fuel tanks, filters, injectors'),
    ('Exhaust', 'Mufflers, pipes, silencers'),
    ('Wheels & Tires', 'Rims, tires, tubes'),
    ('Tools & Accessories', 'Maintenance tools and accessories'),
]
categories = []
for name, desc in categories_data:
    c, created = Category.objects.get_or_create(
        company=company, name=name,
        defaults={'description': desc, 'is_active': True}
    )
    categories.append(c)
    if created: print(f"  + Category: {name}")
print(f"  Categories ready: {len(categories)}")

# ── Suppliers ─────────────────────────────────────────────────────────────────
suppliers_data = [
    ('Engine Components Ltd', 'engine@enginecomponents.com', '9700002001', '123 Industrial Area, Chennai'),
    ('Body Works India', 'body@bodyworks.in', '9700002002', '456 Business Park, Mumbai'),
    ('Electro Parts Pvt Ltd', 'electro@electroparts.com', '9700002003', '789 Tech City, Bengaluru'),
    ('Brake Systems India', 'brake@brakesystems.in', '9700002004', '321 Auto Zone, Gurugram'),
    ('Fuel Tech Solutions', 'fuel@fueltech.com', '9700002005', '654 Fuel Hub, Hyderabad'),
    ('Exhaust Systems Ltd', 'exhaust@exhaustsystems.com', '9700002006', '987 Muffler Lane, Pune'),
    ('Wheel Masters', 'wheels@wheelmasters.com', '9700002007', '147 Tire Road, Ahmedabad'),
    ('Accessories Hub', 'acc@accessorieshub.com', '9700002008', '258 Accessory St, Kochi'),
]
suppliers = []
for i, (name, email, phone, addr) in enumerate(suppliers_data):
    s, created = Supplier.objects.get_or_create(
        company=company, email=email,
        defaults={
            'supplier_code': f'SUP{1000+i:04d}',
            'name': name,
            'phone': phone, 'address': addr,
            'is_active': True,
        }
    )
    suppliers.append(s)
    if created: print(f"  + Supplier: {name}")
print(f"  Suppliers ready: {len(suppliers)}")

# ── Warehouses ────────────────────────────────────────────────────────────────
warehouses_data = [
    ('Main Warehouse', 'WH-001', '123 Industrial Area, Chennai', 'Chennai', 'Tamil Nadu', '600001'),
    ('Engine Bay', 'WH-002', '456 Engine Zone, Chennai', 'Chennai', 'Tamil Nadu', '600001'),
    ('Body Shop', 'WH-003', '789 Body Shop Road, Chennai', 'Chennai', 'Tamil Nadu', '600001'),
    ('Electrical Hub', 'WH-004', '321 Electrical Park, Chennai', 'Chennai', 'Tamil Nadu', '600001'),
    ('Spares Rack', 'WH-005', '654 Spares Lane, Chennai', 'Chennai', 'Tamil Nadu', '600001'),
]
warehouses = []
for i, (name, code, addr, city, state, pin) in enumerate(warehouses_data):
    w, created = Warehouse.objects.get_or_create(
        company=company, name=name,
        defaults={
            'code': code, 'address': addr,
            'city': city, 'state': state, 'pincode': pin,
            'is_active': True,
            'total_capacity': random.randint(5000, 20000),
            'used_capacity': random.randint(1000, 8000),
        }
    )
    warehouses.append(w)
    if created: print(f"  + Warehouse: {name}")
print(f"  Warehouses ready: {len(warehouses)}")

# ── Products ──────────────────────────────────────────────────────────────────
products_data = [
    ('Engine Block Assembly', 'RE-ENG-BLK', 'goods', 18, 45000, 38000, '87089900', 'Engine Parts', 50, 10, 20),
    ('Cylinder Head', 'RE-CHD-350', 'goods', 18, 12000, 9500, '87089900', 'Engine Parts', 30, 5, 15),
    ('Piston Set', 'RE-PST-SET', 'goods', 18, 8500, 6800, '87089900', 'Engine Parts', 40, 8, 20),
    ('Camshaft', 'RE-CAM-350', 'goods', 18, 7200, 5600, '87089900', 'Engine Parts', 25, 5, 12),
    ('Carburetor', 'RE-CARB-350', 'goods', 18, 4800, 3600, '87089900', 'Fuel System', 35, 10, 20),
    ('Fuel Tank', 'RE-FT-350', 'goods', 18, 8500, 7000, '87089900', 'Fuel System', 20, 5, 10),
    ('Exhaust Pipe', 'RE-EXH-350', 'goods', 18, 3200, 2500, '87089900', 'Exhaust', 45, 10, 25),
    ('Muffler', 'RE-MFL-350', 'goods', 18, 2800, 2100, '87089900', 'Exhaust', 40, 8, 20),
    ('Brake Pads', 'RE-BP-FR', 'goods', 18, 850, 620, '87083000', 'Brakes & Suspension', 100, 20, 50),
    ('Brake Disc', 'RE-BD-FR', 'goods', 18, 1200, 900, '87083000', 'Brakes & Suspension', 60, 15, 30),
    ('Shock Absorber', 'RE-SHK-FR', 'goods', 18, 2200, 1600, '87083000', 'Brakes & Suspension', 50, 10, 25),
    ('Front Tire', 'RE-TR-FR', 'goods', 18, 3500, 2800, '40111000', 'Wheels & Tires', 30, 5, 15),
    ('Rear Tire', 'RE-TR-RE', 'goods', 18, 3800, 3000, '40111000', 'Wheels & Tires', 25, 5, 12),
    ('Headlight Assembly', 'RE-HL-350', 'goods', 18, 2500, 1800, '85122000', 'Electrical', 40, 8, 20),
    ('Tail Light', 'RE-TL-350', 'goods', 18, 1200, 850, '85122000', 'Electrical', 50, 10, 25),
    ('Wiring Harness', 'RE-WH-350', 'goods', 18, 1800, 1300, '85444200', 'Electrical', 35, 7, 18),
    ('Air Filter', 'RE-AF-350', 'goods', 18, 650, 480, '84213990', 'Engine Parts', 80, 15, 40),
    ('Oil Filter', 'RE-OF-350', 'goods', 18, 450, 320, '84213990', 'Engine Parts', 100, 20, 50),
    ('Spark Plug', 'RE-SP-NGK', 'goods', 18, 280, 190, '85111000', 'Electrical', 150, 30, 75),
    ('Chain Sprocket', 'RE-CH-350', 'goods', 18, 1500, 1100, '84834000', 'Engine Parts', 30, 5, 15),
]
products = []
for i, (name, code, ptype, tax, sell, cost, hsn, cat_name, stock, min_s, max_s) in enumerate(products_data):
    cat = next((c for c in categories if c.name == cat_name), categories[0])
    p, created = Product.objects.get_or_create(
        company=company, product_code=code,
        defaults={
            'name': name, 'product_type': ptype,
            'tax_rate': Decimal(str(tax)),
            'selling_price': Decimal(str(sell)),
            'cost_price': Decimal(str(cost)),
            'hsn_code': hsn,
            'is_active': True,
            'min_stock_level': min_s,
            'max_stock_level': max_s,
            'reorder_point': min_s,
            'reorder_quantity': max_s - min_s,
            'category': cat,
        }
    )
    products.append(p)
    if created: print(f"  + Product: {name}")
print(f"  Products ready: {len(products)}")

# ── Stock Levels + Movements (last 60 days) ──────────────────────────────────
from inventory.models import StockLevel

mov_count = 0
for prod in products:
    wh = warehouses[0]
    initial_qty = random.randint(20, 150)
    sl, _ = StockLevel.objects.get_or_create(
        product=prod, warehouse=wh,
        defaults={'quantity_available': initial_qty, 'quantity_reserved': 0}
    )
    day = today - timedelta(days=60)
    current_qty = sl.quantity_available
    while day <= today:
        if day.weekday() < 5 and random.random() > 0.6:
            mov_type = random.choices(['receipt', 'issue', 'transfer'], weights=[40, 40, 20])[0]
            qty = random.randint(5, 30)
            qty_before = current_qty
            qty_after = (qty_before + qty) if mov_type == 'receipt' else (max(0, qty_before - qty) if mov_type == 'issue' else qty_before)
            StockMovement.objects.create(
                product=prod, warehouse=wh,
                movement_type=mov_type,
                quantity=qty, unit_cost=prod.cost_price,
                quantity_before=qty_before, quantity_after=qty_after,
                reference_number=f'SM{mov_count+1:06d}',
                notes='Auto-generated movement',
                created_by=service_user,
            )
            current_qty = qty_after
            mov_count += 1
        day += timedelta(days=1)
    sl.quantity_available = current_qty
    sl.save(update_fields=['quantity_available'])

print(f"  Stock Movements created: {mov_count}")

# ── Stock Alerts ──────────────────────────────────────────────────────────────
from inventory.models import StockLevel
alert_count = 0
for prod in products:
    sl = StockLevel.objects.filter(product=prod).first()
    qty = sl.quantity_available if sl else 0
    if qty <= prod.min_stock_level:
        StockAlert.objects.create(
            product=prod, company=company,
            alert_type='low_stock',
            priority='high' if qty <= prod.min_stock_level // 2 else 'medium',
            message=f'Stock low for {prod.name}: {qty} units remaining',
            current_stock=qty,
            suggested_action='Reorder immediately',
            is_resolved=False,
        )
        alert_count += 1
print(f"  Stock Alerts created: {alert_count}")

print("\n✅ Phase 3 Inventory complete.")
