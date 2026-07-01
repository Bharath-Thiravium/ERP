# INVENTORY_PHASE1_IMPLEMENTATION_REPORT.md
## Inventory Phase 1 — Critical Security & Data Integrity Fixes
**Project:** SAP-Python Multi-Tenant ERP
**Date:** 2026-07-01
**Status:** COMPLETE — `python manage.py check` passes with 0 issues; 12/12 new Inventory regression tests pass

---

## 1. Files Modified

| File | Change Summary |
|------|-----------------|
| `backend/inventory/viewsets.py` | `StockMovementViewSet.create()`: negative-stock guard, proper `transfer` handling, `select_for_update()` row locking; `ProductViewSet.get_queryset()`: fixed the `low_stock=true` crash; `PurchaseOrderViewSet.create()`: added product company-ownership validation on line items |
| `backend/inventory/views.py` | Mirrored the same fixes into the dead-code duplicates (`StockMovementListCreateView`, `ProductListCreateView`, `PurchaseOrderListCreateView`, `PurchaseOrderDetailView`) for consistency; fixed the **live**, routed `ProductBundleListCreateView.create()` to validate bundle-item product ownership |
| `backend/inventory/models.py` | `Product.stock_value`/`is_low_stock()`/`needs_reorder()` and `Warehouse.capacity_utilization`: removed lossy `float()` arithmetic, switched to exact `Decimal` arithmetic; `Attendance`-style guard added to `is_late`-equivalent not needed here (n/a) |
| `backend/inventory/security_validators.py` | `InventorySecurityValidator.validate_numeric_field()`: fixed the root-cause float round-trip that corrupted Decimal precision on nearly every numeric field across the module on every model save |
| `backend/inventory/serializers.py` | Added a shared `get_context_company()`/`validate_same_company()` helper; added `validate_<field>()` FK-ownership checks across 11 serializers (Category, Product, StockMovement, StockAlert, PurchaseOrder, PurchaseOrderItem, ProductBundleItem, InventoryAuditItem, InventoryAudit, CycleCountItem, CycleCount, Warehouse) |
| `backend/inventory/tests.py` | Added `InventoryPhase1SecurityTest` — 12 regression tests (file previously contained only boilerplate) |

---

## 2. Exact Fixes Implemented

### Fix 1 — Prevent Negative Stock

**Root cause (`StockMovementViewSet.create()`, `inventory/viewsets.py`):** for `movement_type in ['out', 'sale', 'damage']` and `'adjustment'`, the code unconditionally did `stock_level.quantity_available -= quantity` (or `+= quantity` for adjustments, which can be negative) with **no check** that the result stays ≥ 0, and no row locking, so concurrent movements could race past each other. Fixed:
```python
elif movement_type in ['out', 'sale', 'damage']:
    if stock_level.quantity_available < quantity:
        raise ValidationError(
            f'Insufficient stock. Available: {stock_level.quantity_available}, requested: {quantity}'
        )
    stock_level.quantity_available -= quantity
elif movement_type == 'adjustment':
    if stock_level.quantity_available + quantity < 0:
        raise ValidationError(
            f'Adjustment would result in negative stock. Available: {stock_level.quantity_available}'
        )
    stock_level.quantity_available += quantity
```
The `StockLevel` row is now fetched with `StockLevel.objects.select_for_update().get_or_create(...)` inside the existing `transaction.atomic()` block, so the negative-stock check and the write happen under a row lock — two concurrent sale movements against the same product/warehouse can no longer both read the same "available" quantity and both succeed.

Validation failures now `raise rest_framework.exceptions.ValidationError(...)` instead of `return Response(...)`, which is important: this method already runs inside `with transaction.atomic():`, and Django's `atomic()` only rolls back on a **propagating exception** — an early `return` would have silently committed the just-locked/just-created `StockLevel` row (and, in the transfer case, any writes already made) despite reporting a 400. Raising ensures the whole block rolls back cleanly, and DRF's configured exception handler still turns it into a proper 400 response.

Confirmed via `test_negative_stock_prevented_on_sale` and `test_negative_stock_prevented_on_adjustment`.

---

### Fix 2 — Fix Stock Transfer Workflow

**Root cause:** `StockMovement.movement_type` has a `'transfer'` choice and a `destination_warehouse` FK, but `StockMovementViewSet.create()`'s if/elif chain only handled `['in', 'purchase', 'return', 'production']`, `['out', 'sale', 'damage']`, and `'adjustment'` — **`'transfer'` matched none of the branches**, so a transfer movement silently modified *nothing*: `quantity_before == quantity_after` on the source warehouse, and the destination warehouse's `StockLevel` was never even looked up. Stock transfers were completely inert; a transfer "moved" 0 units in practice while still recording a movement row that looked like it happened.

**Fix:** added a real `elif movement_type == 'transfer':` branch:
```python
elif movement_type == 'transfer':
    destination_warehouse = serializer.validated_data.get('destination_warehouse')
    if not destination_warehouse:
        raise ValidationError('destination_warehouse is required for transfer movements')
    if destination_warehouse.id == warehouse_id:
        raise ValidationError('destination_warehouse must be different from the source warehouse')
    if stock_level.quantity_available < quantity:
        raise ValidationError(f'Insufficient stock to transfer. Available: {stock_level.quantity_available}, requested: {quantity}')
    stock_level.quantity_available -= quantity

    dest_stock_level, _ = StockLevel.objects.select_for_update().get_or_create(
        product_id=product_id, warehouse_id=destination_warehouse.id,
        defaults={'quantity_available': 0}
    )
    dest_stock_level.quantity_available += quantity
    dest_stock_level.updated_by = request.service_user
    dest_stock_level.save()
```
This decrements the source `StockLevel` (with the same negative-stock guard as Fix 1) and increments/creates the destination `StockLevel`, both under `select_for_update()` inside the same atomic transaction. `destination_warehouse` ownership is also validated against the authenticated company (Fix 5), and a same-warehouse transfer is rejected as a no-op error.

Confirmed via `test_stock_transfer_moves_quantity_between_warehouses` (100 units in, transfer 40 → source ends at 60, destination ends at 40) and `test_stock_transfer_rejects_insufficient_stock`.

---

### Fix 3 — Fix the `low_stock` Endpoint Crash

**Root cause (`ProductViewSet.get_queryset()`, `inventory/viewsets.py`):**
```python
low_stock = self.request.query_params.get('low_stock')
if low_stock == 'true':
    queryset = [p for p in queryset if p.is_low_stock()]
return queryset.order_by('-created_at')
```
When `?low_stock=true` is passed, `queryset` is reassigned to a **plain Python `list`** via the list comprehension — and the very next line unconditionally calls `.order_by()` on it. Reproduced directly:
```
GET /api/inventory/products/?low_stock=true
→ 500 AttributeError: 'list' object has no attribute 'order_by'
```
This was a **guaranteed, 100%-reproducible crash** on every single call to this filter, confirmed via a direct DRF request-cycle reproduction before the fix (and via a regression test after).

**Fix:** filter by ID instead of converting to a list, so the result stays a real Django `QuerySet` all the way through (including DRF's global `DjangoFilterBackend`/`SearchFilter`/`OrderingFilter`, which could also have called `.filter()`/`.order_by()` on it):
```python
low_stock = self.request.query_params.get('low_stock')
if low_stock == 'true':
    matching_ids = [p.id for p in queryset if p.is_low_stock()]
    queryset = queryset.filter(id__in=matching_ids)
return queryset.order_by('-created_at')
```
Applied identically to the dead-code duplicate in `views.py`'s `ProductListCreateView.get_queryset()`.

Confirmed via `test_low_stock_query_param_does_not_crash`.

---

### Fix 4 — Replace Unsafe Float Conversions with Decimal-Safe Calculations

Two distinct bugs were found and fixed:

**4a — Model-level float arithmetic on financial/stock quantities.** `Product.stock_value`, `Product.is_low_stock()`, `Product.needs_reorder()`, and `Warehouse.capacity_utilization` all did `float(decimal_field) * float(decimal_field)` / `float(a) <= float(b)` instead of comparing/multiplying the Decimals directly. Beyond being unnecessary, this meant `sum(product.stock_value for product in products)` in the dashboard and stock-valuation reports accumulated **floating-point rounding error across every product**, rather than exact Decimal accumulation. Fixed to operate on `Decimal` throughout and return `Decimal`:
```python
@property
def stock_value(self):
    try:
        current_stock = Decimal(self.current_stock or 0)
        cost_price = Decimal(self.cost_price or 0)
        return current_stock * cost_price
    except (TypeError, AttributeError, ValueError) as e:
        ...
        return Decimal('0')
```
(same pattern for `is_low_stock()`, `needs_reorder()`, and `Warehouse.capacity_utilization`).

**4b — Root-cause bug: `InventorySecurityValidator.validate_numeric_field()`.** This function is called from `clean()` on **every** `DecimalField` across nearly every model in the app (`Product.cost_price/selling_price/mrp/tax_rate/min_stock_level/...`, `Supplier.performance_score/credit_limit/...`, `Warehouse.total_capacity/used_capacity`, `InventoryAuditItem` quantities, `PurchaseOrder` amounts, `PurchaseOrderItem` quantities/prices) on **every single `.save()`**. It did:
```python
float_value = float(value)
if float_value < 0:
    raise ValidationError(...)
return float_value  # reassigned onto the model's Decimal field!
```
This silently converts every Decimal field to a Python `float` in memory on every save, e.g. `Decimal('10.10')` round-trips through `float()` to become `10.099999999999998`-ish once re-read as a Decimal later in the same request/object lifecycle — a genuine, previously undetected precision bug affecting the entire module. Reproduced directly:
```python
product.cost_price = Decimal('10.10'); product.save()
product.stock_value  # -> Decimal('30.29999999999999893418589636') instead of Decimal('30.30')
```
**Fixed:**
```python
def validate_numeric_field(value, field_name="field"):
    if value is None:
        return value
    try:
        numeric_value = value if isinstance(value, Decimal) else Decimal(str(value))
        if numeric_value < 0:
            raise ValidationError(f"{field_name} cannot be negative")
        return numeric_value
    except (ValueError, TypeError, InvalidOperation):
        raise ValidationError(f"Invalid {field_name} value")
```
Decimal inputs now pass through unchanged; non-Decimal inputs are converted via `Decimal(str(value))` rather than `float(value)`, avoiding binary floating-point rounding entirely. The one other caller of this function (`inventory/utils.py`'s `sanitize_and_validate_data`) is dead code (confirmed via `grep`, never imported/called), so this fix has no other call sites to consider.

Confirmed via `test_stock_value_is_decimal_exact` (asserts `Decimal('30.30')` exactly, and that the return type is `Decimal`).

---

### Fix 5 — Cross-Company ForeignKey Injection

**Root cause:** every Inventory serializer uses either `fields = '__all__'` or an explicit field list including writable FK fields, none of which were scoped to the authenticated company — a Company A caller could submit a Company B object's ID for any of these fields and the serializer would accept it, regardless of the ViewSet's `get_queryset()` company filter (which has no effect on what a serializer field accepts on create/update).

Added shared helpers to `inventory/serializers.py`:
```python
def get_context_company(context):
    request = context.get('request')
    service_user = getattr(request, 'service_user', None) if request else None
    return service_user.company if service_user else None

def validate_same_company(value, context, label):
    if value is None:
        return value
    company = get_context_company(context)
    if company is not None and getattr(value, 'company_id', None) != company.id:
        raise serializers.ValidationError(f'{label} not found or access denied.')
    return value
```

Added `validate_<field>()` methods (single FK) and inline list-validation (M2M) to:

| Serializer | Fields validated |
|------------|-------------------|
| `CategorySerializer` | `parent_category` (self-referential) |
| `ProductCreateSerializer` | `category`, `primary_supplier` |
| `WarehouseSerializer` | `manager` (cross-app FK to `hr.Employee`) |
| `StockMovementSerializer` | `product`, `warehouse`, `destination_warehouse` |
| `StockAlertSerializer` | `product`, `warehouse` |
| `PurchaseOrderSerializer` | `supplier`, `warehouse` |
| `PurchaseOrderItemSerializer` | `product` |
| `ProductBundleItemSerializer` | `product` |
| `InventoryAuditItemSerializer` | `product` |
| `InventoryAuditSerializer` | `warehouse`, `supervisor` (cross-app FK to `hr.Employee`), `categories` (M2M), `products` (M2M), `audit_team` (M2M, cross-app FK to `hr.Employee`) |
| `CycleCountItemSerializer` | (covered defensively; no live endpoint currently accepts raw item input — see Section 6) |
| `CycleCountSerializer` | `warehouse`, `categories` (M2M) |

**Confirmed exploit path (most severe):** before this fix, a Company A service user could `POST /api/inventory/stock-movements/` with `product: <Company B's product ID>` and `warehouse: <Company A's own warehouse>` — the movement would be created and would mutate `StockLevel` rows keyed by Company B's product, corrupting another tenant's stock data. Similarly, `destination_warehouse` on a `transfer` movement could point at another company's warehouse, moving Company A's stock into Company B's warehouse.

Confirmed via `test_stock_movement_rejects_cross_company_product`, `test_stock_transfer_rejects_cross_company_destination_warehouse`, and `test_product_create_serializer_rejects_cross_company_category`.

---

### Fix 6 — `transaction.atomic()` for Multi-Step Operations

`StockMovementViewSet.create()` and `PurchaseOrderViewSet.create()` were **already** wrapped in `transaction.atomic()` — the actual gap was the mid-transaction `return Response(...)` pattern described in Fix 1, which doesn't trigger a rollback. That is now fixed by raising `ValidationError` instead (Fix 1/5).

**`PurchaseOrderViewSet.create()`** (`viewsets.py`) additionally had an **unvalidated FK injection inside its transaction**: PO line items were created directly from raw request data —
```python
PurchaseOrderItem.objects.create(purchase_order=purchase_order, product_id=item_data['product'], ...)
```
bypassing `PurchaseOrderItemSerializer` entirely (so the Fix 5 serializer-level validation never ran for these). Fixed to look up and validate the product against the authenticated company **before** creating each item, raising `ValidationError` (not returning) on failure so the whole PO — including the already-`perform_create()`-saved parent row and any earlier items in the loop — rolls back cleanly:
```python
for item_data in items_data:
    try:
        product = Product.objects.get(id=item_data['product'], company=company)
    except Product.DoesNotExist:
        raise ValidationError(f"Product {item_data.get('product')} not found or access denied.")
    PurchaseOrderItem.objects.create(purchase_order=purchase_order, product=product, ...)
```
The **live**, routed `ProductBundleListCreateView.create()` (`views.py`) had the identical pattern (`ProductBundleItem.objects.create(bundle=bundle, product_id=item_data['product'], ...)`) and received the same fix.

Confirmed via `test_purchase_order_rejects_cross_company_item_and_rolls_back`, which asserts a 400 response **and** that zero `PurchaseOrder` rows exist afterward (proving the atomic rollback, not just the validation, works), plus a direct manual verification of the equivalent `ProductBundleListCreateView` fix (bundle count before/after the rejected request is unchanged: 0/0).

---

### Fix 7 — Validate Warehouse/Product Ownership Within the Authenticated Company

Covered by Fix 5 (serializer-level FK validation) and Fix 6 (ViewSet-level item-creation validation for the two raw-dict item-creation code paths that bypass serializers). Additionally reviewed every direct `Model.objects.get(...)`/`.filter(...)` lookup by client-supplied ID across `viewsets.py` and `views.py` (product image upload, barcode generation, alert resolution, cycle-count auto-generation, dropdown APIs) — all were already correctly scoped by `company=` in their queryset filters; no further gaps found.

---

### Fix 8 — Tenant Scoping Review (Every ViewSet & Serializer)

**Reviewed:** all 8 ViewSets in `inventory/viewsets.py` (`CategoryViewSet`, `SupplierViewSet`, `WarehouseViewSet`, `ProductViewSet`, `StockMovementViewSet`, `StockAlertViewSet`, `PurchaseOrderViewSet`, `InventoryAuditViewSet`) — all extend `common.viewsets.CompanyScopedModelViewSet` (not modified — shared base class used by CRM/Finance/HR too) and correctly filter `get_queryset()` by company (`StockMovementViewSet` correctly overrides `company_field_name = "product__company"` for its nested relationship). All use the proper `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated` pair; **zero** `AllowAny` usages exist anywhere in the `inventory` app (confirmed via `grep -rn "AllowAny" inventory/*.py` — no matches, before or after this phase).

**Also reviewed:** every class-based view and `@api_view` function in `inventory/views.py` (28 endpoints total, including reports, dropdown APIs, file upload, and the `ProductBundle`/`CycleCount` list-create views actually routed via `urls.py`) — all use the correct authentication pair and filter their querysets by `company=`. No gaps found beyond the FK-injection issues already fixed in Sections 5–6.

**Dead code confirmed:** `inventory/urls.py` routes `viewsets.py`'s 8 ViewSets via the DRF router, plus a subset of `views.py`'s classes/functions (`InventoryDashboardViewSet`, `ProductBundleListCreateView`/`ProductBundleDetailView`, `CycleCountListCreateView`, dropdown APIs, reports, `upload_product_image`, `resolve_stock_alert`). Several other `views.py` classes are **never routed** (`ProductListCreateView`, `ProductDetailView`, `StockMovementListCreateView`, `PurchaseOrderListCreateView`, `PurchaseOrderDetailView`, `InventoryAuditListCreateView`) — confirmed via `grep` against `urls.py`. These were still fixed for consistency wherever they duplicated a bug also present in the live code (negative stock, transfer, low_stock crash, product-ownership on PO items), matching the precedent from prior phases (e.g. HR's `biometric_views.py`).

---

## 3. Security Issues Resolved

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Stock could go negative on sale/out/damage/adjustment movements — no floor check, no row locking | **Critical** | Fixed |
| 2 | Stock transfers between warehouses were completely inert — `movement_type == 'transfer'` matched no branch, so no stock ever moved despite a movement record being created | **Critical (functional)** | Fixed |
| 3 | `GET /products/?low_stock=true` crashed with a guaranteed 500 (`'list' object has no attribute 'order_by'`) | **High (functional)** | Fixed |
| 4a | Model properties (`stock_value`, `is_low_stock`, `needs_reorder`, `capacity_utilization`) used lossy `float()` arithmetic on Decimal financial/stock fields, compounding rounding error in aggregated reports | **Medium** | Fixed |
| 4b | **Root-cause bug:** `validate_numeric_field()` silently converted every Decimal field on every model to `float` and back on every `.save()`, corrupting in-memory Decimal precision module-wide | **Medium (data integrity)** | Fixed |
| 5 | Cross-tenant FK injection across 12 serializers (`StockMovement.product/warehouse/destination_warehouse`, `Product.category/primary_supplier`, `PurchaseOrder.supplier/warehouse`, item serializers' `product`, `Warehouse.manager`, `InventoryAudit.warehouse/supervisor/categories/products/audit_team`, `CycleCount.warehouse/categories`) | **Critical** | Fixed |
| 6 | `PurchaseOrderViewSet.create()` and `ProductBundleListCreateView.create()` created line items directly from raw request data, bypassing all serializer-level FK validation, and used `return Response(...)` mid-`transaction.atomic()` (no rollback on failure) | **Critical** | Fixed |
| 7 | No additional unscoped warehouse/product lookups found beyond Fix 5/6 | — | Reviewed, already correct |
| 8 | Tenant scoping review across all ViewSets/serializers — zero `AllowAny` usages found | — | Reviewed, already correct |

---

## 4. Regression Tests Added

**`python manage.py check`**
```
System check identified no issues (0 silenced).
```

**`python manage.py test inventory`** — 12/12 passing (file previously had no real tests):

| Test | Verifies |
|------|----------|
| `test_negative_stock_prevented_on_sale` | Selling more than available stock is rejected (400), not driven negative |
| `test_negative_stock_prevented_on_adjustment` | A negative adjustment larger than current stock is rejected; stock unchanged |
| `test_stock_transfer_moves_quantity_between_warehouses` | 100 in → transfer 40 → source=60, destination=40 |
| `test_stock_transfer_rejects_insufficient_stock` | Transfer of more than available stock is rejected |
| `test_stock_transfer_rejects_cross_company_destination_warehouse` | Company A cannot transfer into Company B's warehouse |
| `test_stock_movement_rejects_cross_company_product` | Company A cannot create a movement for Company B's product |
| `test_low_stock_query_param_does_not_crash` | `?low_stock=true` returns 200, not 500 |
| `test_product_create_serializer_rejects_cross_company_category` | `ProductCreateSerializer` rejects a Company B category |
| `test_purchase_order_rejects_cross_company_item_and_rolls_back` | PO with a cross-company item is rejected (400) **and** zero PO rows are left behind |
| `test_purchase_order_creation_succeeds_with_valid_items` | Valid same-company PO creation still works; subtotal computed correctly |
| `test_product_queryset_excludes_other_company` | `ProductViewSet` queryset never returns another company's products |
| `test_stock_value_is_decimal_exact` | `stock_value` returns an exact `Decimal`, not a float-corrupted approximation |

```
Ran 12 tests in 1.074s
OK
```

---

## 5. Manual Verification Checklist

Run against a dev/staging environment with two approved companies (Company A, Company B), each with a Service User session key.

### Product Creation
```bash
curl -X POST /api/inventory/products/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "Widget", "category": <company_a_category_id>, "cost_price": "10.10", "selling_price": "15.00"}'
# Expected: 201, product.company == Company A, cost_price stored as exact 10.10

# Cross-company category injection
curl -X POST /api/inventory/products/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "Widget2", "category": <company_b_category_id>}'
# Expected: 400 {"category": ["Category not found or access denied."]}
```

### Stock Adjustment
```bash
curl -X POST /api/inventory/stock-movements/ \
  -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"product": <id>, "warehouse": <id>, "movement_type": "adjustment", "quantity": "-1000", "unit_cost": "0"}'
# Expected (if current stock < 1000): 400 "Adjustment would result in negative stock..."
# Expected (if current stock >= 1000): 200, stock reduced by 1000
```

### Stock Transfer
```bash
# Stock in 100 units to Warehouse A
curl -X POST /api/inventory/stock-movements/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"product": <id>, "warehouse": <warehouse_a_id>, "movement_type": "in", "quantity": "100", "unit_cost": "5"}'

# Transfer 40 units from Warehouse A to Warehouse B (same company)
curl -X POST /api/inventory/stock-movements/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"product": <id>, "warehouse": <warehouse_a_id>, "destination_warehouse": <warehouse_b_id>, "movement_type": "transfer", "quantity": "40", "unit_cost": "0"}'
# Expected: 201. GET stock levels afterward: Warehouse A = 60, Warehouse B = 40

# Attempt transfer into Company B's warehouse
curl -X POST /api/inventory/stock-movements/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"product": <id>, "warehouse": <warehouse_a_id>, "destination_warehouse": <company_b_warehouse_id>, "movement_type": "transfer", "quantity": "5", "unit_cost": "0"}'
# Expected: 400 {"destination_warehouse": ["Destination warehouse not found or access denied."]}
```

### Purchase Order Receipt
```bash
curl -X POST /api/inventory/purchase-orders/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"supplier": <company_a_supplier_id>, "warehouse": <company_a_warehouse_id>, "order_date": "2026-07-01", "expected_delivery_date": "2026-07-10", "items": [{"product": <company_a_product_id>, "quantity_ordered": "10", "unit_price": "5"}]}'
# Expected: 201, subtotal/tax_amount/total_amount computed correctly

# Attempt to reference another company's product in an item
curl -X POST /api/inventory/purchase-orders/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"supplier": <company_a_supplier_id>, "warehouse": <company_a_warehouse_id>, "order_date": "2026-07-01", "expected_delivery_date": "2026-07-10", "items": [{"product": <company_b_product_id>, "quantity_ordered": "1", "unit_price": "1"}]}'
# Expected: 400 "Product <id> not found or access denied." AND no PurchaseOrder row created (verify via list endpoint)

# Receive against the PO by recording an "in"/"purchase" stock movement referencing the PO number
curl -X POST /api/inventory/stock-movements/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"product": <id>, "warehouse": <id>, "movement_type": "purchase", "quantity": "10", "unit_cost": "5", "reference_number": "<po_number>"}'
# Expected: 201, stock incremented
```

### Warehouse Movement
```bash
curl -X POST /api/inventory/warehouses/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "New Warehouse", "address": "...", "city": "...", "state": "...", "pincode": "000000"}'
# Expected: 201

# Cross-company manager assignment
curl -X POST /api/inventory/warehouses/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"name": "WH2", "address": "...", "city": "...", "state": "...", "pincode": "000000", "manager": <company_b_employee_id>}'
# Expected: 400 {"manager": ["Manager not found or access denied."]}
```

### Multi-Tenant Isolation
```bash
# Company A lists its own products
curl /api/inventory/products/ -H "Authorization: Bearer <company_a_session_key>"
# Expected: only Company A products

# Company A attempts to retrieve Company B's warehouse directly by ID
curl /api/inventory/warehouses/<company_b_warehouse_id>/ -H "Authorization: Bearer <company_a_session_key>"
# Expected: 404 Not Found

# Company A attempts a stock movement referencing Company B's product
curl -X POST /api/inventory/stock-movements/ -H "Authorization: Bearer <company_a_session_key>" \
  -d '{"product": <company_b_product_id>, "warehouse": <company_a_warehouse_id>, "movement_type": "in", "quantity": "1", "unit_cost": "1"}'
# Expected: 400 {"product": ["Product not found or access denied."]}
```

---

## 6. Remaining Inventory Phase 2 Work

| Item | Description | Priority |
|------|-------------|----------|
| Redundant internal session-key lookups | Several `views.py` classes still contain per-method `get_session_key()` + manual `ServiceUserSession.objects.get(...)` lookups that are redundant now that proper class-level auth is (and always was) in place. Left as-is to minimize blast radius, matching the precedent set in HR/CRM Phase 1. | LOW (cleanup) |
| Globally-unique identifier fields | `Product.product_code`/`sku`/`barcode`, `Category.code`, `Supplier.supplier_code`, `Warehouse.code`, `InventoryAudit.audit_number`, `CycleCount.count_number`, `ProductBundle.bundle_code`, and `PurchaseOrder.po_number` are all declared `unique=True` at the field level — globally unique across **all companies** — despite most having a `unique_together = ['company', '<field>']` in `Meta` (which the field-level `unique=True` overrides/duplicates). This is the same class of bug fixed as CRM Phase 1's Fix 4 (per-company unique identifiers); not fixed here because it wasn't in the 8 named priorities and touches migrations across 8 models. Confirmed live impact: two products in *different* companies cannot both have a blank `barcode` (`''`) — the second create fails with `UniqueViolation`, discovered incidentally while writing regression tests. | MEDIUM |
| Dead-code `views.py` endpoints never wired to `urls.py` | `ProductListCreateView`, `ProductDetailView`, `StockMovementListCreateView`, `PurchaseOrderListCreateView`, `PurchaseOrderDetailView`, `InventoryAuditListCreateView` are fully-implemented but unrouted. They received the same critical fixes as their live counterparts for consistency, but should either be wired up or removed in a cleanup pass — carrying dead, security-sensitive code invites future accidental re-exposure. | LOW |
| Missing weighted-average cost recalculation on incoming stock | The **dead-code** `views.py` `StockMovementListCreateView.create()` recalculates `Product.cost_price` as a weighted average on incoming stock (`in`/`purchase`/`return`/`production`); the **live** `viewsets.py` `StockMovementViewSet.create()` does **not** — this is a pre-existing functional inconsistency (not a security issue) discovered while comparing the two implementations. Left unfixed as it's a feature gap outside the 8 named priorities, not a security/data-integrity defect. | MEDIUM (functional) |
| `CRMBaseViewSet`-style `get_session_key` gaps | Not found in Inventory — this module's auth is consistently correct across every routed endpoint (see Section 2, Fix 8). No equivalent issue to flag. | — |
| Broader Decimal-precision audit | This pass fixed the root-cause `validate_numeric_field()` bug and the 4 model properties doing float arithmetic. A full audit of every report/aggregation function in `views.py` (ABC analysis, aging report, dead-stock report) for further compounding float usage was not performed exhaustively — those functions call `float()` primarily at the JSON-serialization boundary (acceptable) rather than mid-calculation, but a dedicated pass would provide stronger assurance. | LOW |
| Manager/supervisor/audit_team cross-app FK validation | `Warehouse.manager`, `InventoryAudit.supervisor`, and `InventoryAudit.audit_team` reference `hr.Employee`. Validation was added in this pass (Fix 5) without modifying any HR file, per the "do not modify HR" constraint — but if HR's `Employee` model's `company` field semantics ever change, this cross-app assumption should be re-verified. | LOW |

---

## Confirmation

**Inventory operations cannot affect another company's stock.** Every FK field that references a `Product`, `Warehouse`, `Supplier`, `Category`, or cross-app `hr.Employee` object across the Inventory module's serializers is now validated against the authenticated company, and the two code paths that bypassed serializer validation entirely (`PurchaseOrderViewSet.create()`'s and `ProductBundleListCreateView.create()`'s raw-dict item creation) now perform the same company check before writing. `StockMovementViewSet`'s negative-stock guard and row-locking (`select_for_update()`) prevent both accidental over-selling and race-condition corruption within a single company's own stock, while the FK-ownership checks prevent any cross-tenant stock mutation. This is verified by the 12 passing regression tests in `InventoryPhase1SecurityTest`, which explicitly assert that Company A's session is rejected (400) when referencing Company B's products or warehouses, and that a rejected multi-item request leaves zero partial records behind.

Stopping here per instruction — no Inventory Phase 2 work has been started. No other modules (Authentication, Analytics, Finance, CRM, HR) were touched.
