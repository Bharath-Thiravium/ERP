# INVENTORY_OPTIMIZATION_REPORT.md

**Scope:** `backend/inventory/` · **Mode:** READ-ONLY.
**Focus:** performance, data integrity, code quality, design gaps.
**Severity:** 🔴 High (correctness/crash) · 🟠 Medium (performance/data) · 🟡 Low (quality).

---

## O1 — 🔴 Dashboard and all reports iterate ALL products in Python — N DB queries per product

**File/Line:** `views.py:87–99`; `views.py:953–969`; `views.py:1003–1021`; `views.py:1200–1219`; `aging_analyzer.py:28–63`

**Proof:**
```python
# views.py:86-99  InventoryDashboardViewSet.list()
products = Product.objects.filter(company=company, is_active=True)   # 1 query
total_stock_value = sum(product.stock_value for product in products) # N queries

# Product.stock_value property (models.py:466-474)
def stock_value(self):
    current_stock = self.current_stock  # ← aggregate query per product
    return float(current_stock) * float(cost_price)

# Product.current_stock property (models.py:453-463)
def current_stock(self):
    return self.stock_levels.aggregate(total=models.Sum('quantity_available'))['total']
    # ← 1 SELECT...SUM per call
```

For a company with N products:
- Dashboard: 1 (product list) + N (current_stock aggregate) + N (is_low_stock via current_stock) = **2N + 1 queries**
- `low_stock_report`: same N queries
- `stock_valuation_report`: same N queries
- `abc_analysis_report`: same N queries
- `aging_analyzer`: 1 (products) + N (last movement) = **N + 1 queries**

For 500 products: dashboard alone makes ~1,001 DB queries per page load.

**Remediation:** Use DB-level aggregation:
```python
from django.db.models import Sum, F, ExpressionWrapper, DecimalField

# Stock value in one query
stock_data = StockLevel.objects.filter(
    product__company=company
).values('product').annotate(
    total_qty=Sum('quantity_available')
).annotate(
    stock_value=ExpressionWrapper(
        F('total_qty') * F('product__cost_price'),
        output_field=DecimalField()
    )
)
```

---

## O2 — 🟠 `validate_numeric_field` returns `float` instead of `Decimal` — called on every save

**File/Line:** `security_validators.py:92–98`; `models.py:401–411` (Product.clean); `models.py:148–151` (Supplier.clean)

**Proof:**
```python
# security_validators.py:92-98
def validate_numeric_field(value, field_name="field"):
    try:
        float_value = float(value)   # ← converts Decimal to float
        if float_value < 0:
            raise ValidationError(...)
        return float_value           # ← float returned, stored in DecimalField
```

`Product.save()` → `Product.clean()` → `validate_numeric_field(self.cost_price, ...)` → `float(Decimal('99.99'))` → `99.99000000000001` (floating-point representation) → stored back in `cost_price`.

This runs on **every product save** including `product.save(update_fields=['is_active'])`, corrupting all 12 decimal fields.

**Remediation:** Change return type to `Decimal`:
```python
from decimal import Decimal, InvalidOperation
float_value = Decimal(str(value))
if float_value < 0:
    raise ValidationError(...)
return float_value
```

---

## O3 — 🟠 `StockLevel.quantity_reserved` is permanently zero — reservation logic absent

**File/Line:** `models.py:624` (field definition); entire codebase

**Proof:** `quantity_reserved` is defined in `StockLevel` (models.py:624) and used in `StockLevel.available_stock` property (models.py:647-649):
```python
def available_stock(self):
    return self.quantity_available - self.quantity_reserved
```

A full text search of the codebase shows no code that:
- Increments `quantity_reserved` (when a sale order reserves stock)
- Decrements `quantity_reserved` (when stock is actually dispatched or reservation released)

`available_stock` is exposed via `StockLevelSerializer` (serializers.py:137). Its value equals `quantity_available` for all records because `quantity_reserved` is always 0.

**Business Impact:** The inventory system cannot prevent overselling. Multiple orders for the same SKU can all succeed even when combined demand exceeds available stock.

---

## O4 — 🟠 `transfer` movement has `destination_warehouse` field but no code uses it

**File/Line:** `models.py:703`; `viewsets.py:249–254` (see Bug B2)

Beyond being a bug (no stock update), the architectural design stores `destination_warehouse` on `StockMovement` but no code ever reads it to update the destination warehouse's `StockLevel`. The field is dead.

---

## O5 — 🟠 Code auto-generation race condition across all models

**File/Line:** `models.py:57-81` (Category), `153-179` (Supplier), `236-262` (Warehouse), `419-450` (Product), `526-544` (ProductBundle), `816-842` (InventoryAudit), `892-911` (CycleCount), `1053-1079` (PurchaseOrder)

**Proof (representative, Category):**
```python
def save(self, *args, **kwargs):
    if not self.code:
        try:
            self.code = generate_auto_code(self.company.id, 'category')
        except Exception:
            last_category = Category.objects.filter(
                company=self.company,
                code__startswith='CAT-'
            ).order_by('-id').first()  # ← no lock, not atomic
            ...
            self.code = f"CAT-{last_number + 1:06d}"
```

Two concurrent creates for the same company read the same `last_category` and generate `CAT-000002` twice → `IntegrityError` on the second save (due to `unique=True`). Users see a 500 error.

This same pattern is repeated 8 times across the module.

**Remediation:** Use a database sequence (PostgreSQL `CREATE SEQUENCE`) or Django's `F()` with `select_for_update()` on a counter model.

---

## O6 — 🟠 `aging_analyzer.py` makes 1 DB query per product for aging analysis

**File/Line:** `aging_analyzer.py:28–63`

**Proof:**
```python
for product in products:                          # 1 query for all products
    last_movement = StockMovement.objects.filter(  # ← 1 query per product
        product=product,
        movement_type__in=['in', 'purchase', 'production']
    ).order_by('-created_at').first()
```

N products → N queries for the aging report. For 1,000 products: 1,001 queries.

**Remediation:** Use `annotate()` to get last movement date in a single query:
```python
from django.db.models import Max, Subquery, OuterRef

last_move = StockMovement.objects.filter(
    product=OuterRef('pk'),
    movement_type__in=['in', 'purchase', 'production']
).order_by('-created_at').values('created_at')[:1]

products = products.annotate(last_movement_date=Subquery(last_move))
```

---

## O7 — 🟠 `Product.current_stock` is computed on every call — no caching

**File/Line:** `models.py:453–463`

**Proof:**
```python
@property
def current_stock(self):
    result = self.stock_levels.aggregate(
        total=models.Sum('quantity_available')
    )['total']
    return result or 0
```

This property is called from:
- `Product.stock_value` — called from dashboard, all 5 reports
- `Product.is_low_stock()` — called from dashboard, low_stock filter
- `Product.needs_reorder()` — called from reports
- `views.py:744` — WAC calculation during stock movements
- `viewsets.py:270-271` — alert generation during stock movements

Each call is an independent `SELECT SUM(...)` query. A single dashboard load with 100 products triggers 300–500 `current_stock` aggregate queries.

**Remediation:** Store `current_stock` as a denormalized field on `Product` and update it within `transaction.atomic()` during stock movements (or use `StockLevel` annotations via `prefetch_related`).

---

## O8 — 🟠 `ProductBundleItem` product not scoped — cross-company risk and no validation

**File/Line:** `views.py:1533–1539` (see Security S3)

Beyond the security implication, any bundle total_cost or profit_margin calculation will silently produce incorrect results if a cross-company product ends up in a bundle item.

---

## O9 — 🟡 FIFO / LIFO tracking methods are defined but not implemented

**File/Line:** `models.py:291–298`

```python
TRACKING_METHODS = [
    ('none', 'No Tracking'),
    ('serial', 'Serial Number'),
    ('batch', 'Batch/Lot'),
    ('expiry', 'Expiry Date'),
    ('fifo', 'FIFO'),          # ← choice exists
    ('lifo', 'LIFO')           # ← choice exists
]
```

No code path changes inventory valuation or stock deduction behavior based on `tracking_method='fifo'` or `'lifo'`. All stock movements use the same WAC calculation regardless of tracking method.

**Business Impact:** A product configured as FIFO behaves identically to no tracking. Companies expect FIFO to affect cost of goods sold calculation and expiry management.

---

## O10 — 🟡 Serial number tracking is data-only — no validation or enforcement

**File/Line:** `models.py:631` (`StockLevel.serial_numbers = JSONField`)

Serial numbers are stored as a free-form JSON list. No code:
- Validates format or uniqueness of serial numbers
- Removes a serial number from `StockLevel.serial_numbers` on stock-out
- Prevents the same serial number from appearing in two warehouses
- Links a serial number to a specific `StockMovement` record

**Business Impact:** Serial number tracking provides no actual tracking guarantee. The same serial number can exist in multiple locations simultaneously.

---

## O11 — 🟡 Cycle count hard-limited to 50 products with a demo comment

**File/Line:** `views.py:1612`

```python
for product in products[:50]:  # Limit to 50 items for demo
    CycleCountItem.objects.create(...)
```

The `# Limit to 50 items for demo` comment confirms this is an unfinished implementation. Production companies routinely cycle-count hundreds or thousands of SKUs.

---

## O12 — 🟡 ABC classification is a static field — not recalculated from movement data

**File/Line:** `models.py:337`

```python
abc_classification = models.CharField(max_length=1, choices=[('A', 'A'), ('B', 'B'), ('C', 'C')], default='C')
```

ABC classification is user-settable, not auto-calculated from actual sales velocity or stock value contribution. The `abc_analysis_report` simply groups products by this manually-set field, not by actual inventory value percentile.

**Business Impact:** ABC analysis report is accurate only if every product's ABC class has been manually and correctly assigned. No automatic recalculation from sales or movement data.

---

## O13 — 🟡 Purchase receipt workflow missing — POs never progress past 'ordered' status

**File/Line:** `urls.py` (no receive endpoint); `models.py:1088-1090` (`quantity_received` field exists)

`PurchaseOrderItem.quantity_received` field and `quantity_pending` / `is_fully_received` properties exist (models.py:1088-1131). The `PurchaseOrder.STATUS_CHOICES` has `'partial'` and `'received'` statuses. But no API endpoint exists to:
1. Receive goods against a PO (POST `quantity_received`)
2. Create the corresponding `StockMovement` of type `purchase`
3. Update `PurchaseOrder.status` from `ordered` to `partial`/`received`

The PO lifecycle is incomplete — orders are created but never received.

---

## Summary Table

| ID | Severity | Description |
|----|----------|-------------|
| O1 | 🔴 High | Dashboard/reports: N queries per product via Python loop |
| O2 | 🟠 Medium | `validate_numeric_field` returns float — Decimal precision lost on every save |
| O3 | 🟠 Medium | `quantity_reserved` always 0 — no reservation logic |
| O4 | 🟠 Medium | `destination_warehouse` field dead — transfer not implemented |
| O5 | 🟠 Medium | Code auto-generation race on all 8 models |
| O6 | 🟠 Medium | Aging analysis: 1 query per product |
| O7 | 🟠 Medium | `current_stock` aggregate called 3–5 times per product per request |
| O8 | 🟠 Medium | Bundle item products unscoped/unvalidated |
| O9 | 🟡 Low | FIFO/LIFO choices exist but not implemented |
| O10 | 🟡 Low | Serial number tracking has no enforcement |
| O11 | 🟡 Low | Cycle count limited to 50 items (demo stub) |
| O12 | 🟡 Low | ABC classification is static, not computed |
| O13 | 🟡 Low | PO receipt workflow missing — POs never completed |
