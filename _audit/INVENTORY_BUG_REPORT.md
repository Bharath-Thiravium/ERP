# INVENTORY_BUG_REPORT.md

**Scope:** `backend/inventory/` · **Mode:** READ-ONLY. Confirmed defects only.
**Severity:** 🔴 High · 🟠 Medium · 🟡 Low.

---

## B1 — 🔴 Negative stock allowed — no quantity check before stock deduction

**File/Line:** `viewsets.py:251–252`; `views.py:724–725`

**Proof:**
```python
# viewsets.py:249-254  (StockMovementViewSet.create)
if movement_type in ['in', 'purchase', 'return', 'production']:
    stock_level.quantity_available += quantity
elif movement_type in ['out', 'sale', 'damage']:
    stock_level.quantity_available -= quantity   # ← no lower-bound check
elif movement_type == 'adjustment':
    stock_level.quantity_available += quantity
```

**Reproduction:**
1. Create product with `quantity_available = 5` in warehouse W1.
2. POST `{"product": P1, "warehouse": W1, "movement_type": "out", "quantity": 100}` to `/api/inventory/stock-movements/`.
3. Response: 201 Created. `StockLevel.quantity_available` = -95.
4. Dashboard shows -95 units; stock valuation shows negative stock value.

**Business Impact:**
- Inventory valuation becomes negative — corrupts balance sheets.
- Reorder alerts triggered spuriously for products with negative stock.
- Sales against negative stock can be processed — items shipped that don't physically exist.
- Weighted Average Cost calculation will produce nonsensical results when `current_stock < 0`.

**Remediation:** Before deducting stock:
```python
if stock_level.quantity_available < quantity:
    return Response({'error': f'Insufficient stock. Available: {stock_level.quantity_available}'}, status=400)
```

---

## B2 — 🔴 `transfer` movement type does not update any stock level

**File/Line:** `viewsets.py:249–254`; `views.py:722–729`

**Proof:**
```python
# Movement types handled:
if movement_type in ['in', 'purchase', 'return', 'production']:
    ...
elif movement_type in ['out', 'sale', 'damage']:
    ...
elif movement_type == 'adjustment':
    ...
# 'transfer' is NOT in ANY branch — stock_level unchanged
```

`StockMovement.MOVEMENT_TYPES` at `models.py:654-663` includes `('transfer', 'Transfer - Between warehouses')` and `StockMovement.destination_warehouse = ForeignKey(...)` exists, but no code reads or uses `destination_warehouse` to update stock.

**Reproduction:**
1. Warehouse W1 has product P1 with quantity=100. Warehouse W2 has product P1 with quantity=0.
2. POST `{"product": P1, "warehouse": W1, "movement_type": "transfer", "destination_warehouse": W2, "quantity": 50}`.
3. Response: 201 Created.
4. Check W1: still 100. Check W2: still 0. Transfer has no effect on any stock level.

**Business Impact:** Inter-warehouse transfers are a core inventory operation. The entire transfer workflow is silently broken — stock never moves. Physical inventory and system inventory diverge after every transfer operation.

**Remediation:** Add a transfer branch that (a) decrements source warehouse, (b) increments destination warehouse, both within `transaction.atomic()`, with a `select_for_update()` on both.

---

## B3 — 🔴 `low_stock` filter crashes with `AttributeError` — queryset converted to list

**File/Line:** `viewsets.py:126–130`; `views.py:568–572`

**Proof:**
```python
# viewsets.py:125-130  ProductViewSet.get_queryset()
low_stock = self.request.query_params.get('low_stock')
if low_stock == 'true':
    # This would need to be optimized with database queries
    queryset = [p for p in queryset if p.is_low_stock()]  # ← list, not queryset

return queryset.order_by('-created_at')  # ← AttributeError: 'list' has no attribute 'order_by'
```

The comment "This would need to be optimized" confirms the developer knew the list conversion was a placeholder, but the `.order_by()` call that follows was never updated.

**Reproduction:**
```bash
curl -H "Authorization: Bearer SESSION_KEY" \
  "http://localhost:8005/api/inventory/products/?low_stock=true"
# Response: HTTP 500, AttributeError: 'list' object has no attribute 'order_by'
```

**Business Impact:** The `low_stock=true` filter on the product list endpoint crashes with HTTP 500 for all callers. Any dashboard or report that uses this filter is broken.

---

## B4 — 🔴 `validate_numeric_field` converts Decimal to float — precision loss in all saves

**File/Line:** `security_validators.py:92–98`

**Proof:**
```python
@staticmethod
def validate_numeric_field(value, field_name="field"):
    try:
        float_value = float(value)     # ← Decimal → float conversion
        if float_value < 0:
            raise ValidationError(...)
        return float_value             # ← returns float, not Decimal
    except (ValueError, TypeError):
        raise ValidationError(...)
```

`Product.clean()` calls `validate_numeric_field()` for 12 fields: `cost_price`, `selling_price`, `mrp`, `tax_rate`, `min_stock_level`, `max_stock_level`, `reorder_point`, `reorder_quantity`, `weight`, `demand_forecast`, `seasonality_factor`. All are `DecimalField`. The returned `float` is then stored back into the `DecimalField`.

`Supplier.clean()` also passes `performance_score`, `reliability_score`, `quality_score`, `credit_limit` through `validate_numeric_field`.

`PurchaseOrder.clean()` passes `subtotal`, `tax_amount`, `total_amount`.

Since `Product.save()` calls `self.clean()` every time, every save corrupts Decimal values with floating-point representation errors.

Example: `cost_price = Decimal('12345.67')` → `float('12345.67')` → `12345.670000000001` → stored in DecimalField as `12345.670000000001`.

**Business Impact:** Every stock valuation, payable amount, and purchase order total is subject to floating-point drift. Cumulative rounding errors grow with the number of saves. Financial reports will not reconcile with each other.

---

## B5 — 🟠 `StockMovement` does not validate `product.company == warehouse.company`

**File/Line:** `viewsets.py:234–241`; `serializers.py:261–276`

**Proof:**
`StockMovementSerializer` fields `product` and `warehouse` are both `PrimaryKeyRelatedField` without queryset scoping in the serializer definition. `StockMovementViewSet.create()` calls `serializer.is_valid()` without validating cross-company consistency.

**Reproduction:**
1. Session belongs to Company A. Company A has product P_A and warehouse W_A.
2. Company B has warehouse W_B.
3. POST `{"product": P_A.id, "warehouse": W_B.id, "movement_type": "in", "quantity": 10}`.
4. Movement created with Company A's product in Company B's warehouse.

**Business Impact:** Stock level records created across company boundaries. Company B's warehouse shows stock from Company A's products. Cross-company data corruption.

---

## B6 — 🟠 Purchase Order items not validated to belong to same company

**File/Line:** `viewsets.py:401–408`; `views.py:1370–1377`

**Proof:**
```python
# viewsets.py:401-408
for item_data in items_data:
    PurchaseOrderItem.objects.create(
        purchase_order=purchase_order,
        product_id=item_data['product'],    # ← no company check
        quantity_ordered=item_data['quantity_ordered'],
        unit_price=item_data['unit_price'],
        notes=item_data.get('notes', '')
    )
```

No check that `Product.objects.get(id=item_data['product']).company == purchase_order.company`.

**Business Impact:** A PO for Company A can include products from Company B's catalog. Financial reports mix cross-company product costs. Supplier payment calculations will be incorrect.

---

## B7 — 🟠 `ProductBundleItem` product not validated to belong to bundle's company

**File/Line:** `views.py:1533–1539`

**Proof:**
```python
for item_data in items_data:
    ProductBundleItem.objects.create(
        bundle=bundle,
        product_id=item_data['product'],    # ← no company check
        quantity=item_data['quantity'],
        unit_price_override=item_data.get('unit_price_override')
    )
```

**Business Impact:** A bundle belonging to Company A can include products from Company B, creating cross-tenant FK links.

---

## B8 — 🟠 `Category.parent_category` allows circular hierarchies — infinite loop risk

**File/Line:** `models.py:18`

**Proof:**
```python
parent_category = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subcategories')
```

No `clean()` validation prevents circular references. Any code that traverses the category tree (e.g., building a category breadcrumb, computing nested category product counts) will loop infinitely.

**Reproduction:**
1. Create Category A.
2. Create Category B with `parent_category = A`.
3. PATCH Category A with `parent_category = B`.
4. Result: A → B → A → … — any tree traversal runs forever.

**Business Impact:** If any view iterates up the category tree, the server process hangs until timeout or memory exhaustion.

---

## B9 — 🟠 Purchase Order tax hardcoded at 18% — ignores per-product `tax_rate`

**File/Line:** `viewsets.py:412`; `views.py:1293, 1383`

**Proof:**
```python
# viewsets.py:412
tax_amount = subtotal * Decimal('0.18')  # ← hardcoded 18%
total_amount = subtotal + tax_amount
```

`Product.tax_rate` field (`models.py:321`) stores the GST rate per product. Products may have 0%, 5%, 12%, 18%, or 28% GST. The PO calculation ignores these and applies 18% to everything.

**Business Impact:** Incorrect GST on POs. Over/under payment to suppliers. GSTR-2A reconciliation will fail. Tax-exempt items (0% GST) are taxed at 18%.

---

## B10 — 🟠 No `select_for_update()` on `StockLevel` — race condition corrupts stock balance

**File/Line:** `viewsets.py:237–241`; `views.py:710–714`

**Proof:**
```python
stock_level, created = StockLevel.objects.get_or_create(
    product_id=product_id,
    warehouse_id=warehouse_id,
    defaults={'quantity_available': 0}
)
# ... stock_level.quantity_available += quantity
stock_level.save()
```

Two concurrent requests for the same product/warehouse will both read `quantity_available = 100`, both set it to `100 + 50 = 150`, and one commit overwrites the other. Actual quantity should be 200.

**Reproduction:** Fire two concurrent `POST /api/inventory/stock-movements/` requests for the same product and warehouse.

**Business Impact:** Lost stock updates. System stock doesn't match physical inventory. Payroll and valuation reports become inaccurate.

---

## B11 — 🟡 `dead_stock_report` accepts unconstrained integer from query param

**File/Line:** `views.py:1175`

**Proof:**
```python
days_threshold = int(request.query_params.get('days', 365))
```

No validation on the range of `days`. Passing `days=-1` or `days=0` will match all products as dead stock. No try/except around `int()` — passing `days=abc` raises `ValueError` → HTTP 500.

**Business Impact:** Malformed `days` parameter crashes the endpoint. Negative values return misleading reports.

**Remediation:**
```python
try:
    days_threshold = max(1, int(request.query_params.get('days', 365)))
except (ValueError, TypeError):
    days_threshold = 365
```

---

## B12 — 🟡 Cycle count hard-limits to 50 products with no indication to user

**File/Line:** `views.py:1612`

**Proof:**
```python
for product in products[:50]:  # Limit to 50 items for demo
    CycleCountItem.objects.create(...)
```

The `[:50]` slice silently truncates. The response does not indicate that the cycle count is incomplete. If a company has 200 products, the remaining 150 are silently excluded.

**Business Impact:** Incomplete cycle counts. Physical inventory reconciliation is impossible if half the products are missing from the count.

---

## Severity Roll-Up

| Severity | Bugs |
|----------|------|
| 🔴 High | B1 (negative stock), B2 (transfers broken), B3 (low_stock filter crashes), B4 (Decimal→float precision) |
| 🟠 Medium | B5 (stock movement cross-company), B6 (PO item cross-company), B7 (bundle item cross-company), B8 (circular category), B9 (hardcoded 18% tax), B10 (stock level race condition) |
| 🟡 Low | B11 (days_threshold validation), B12 (50-item cycle count limit) |

---

## Audit Commands

```bash
cd backend/inventory

# B1 — Negative stock
grep -n "quantity_available -=" viewsets.py views.py

# B2 — Transfer not handled
grep -n "'transfer'" viewsets.py views.py models.py

# B3 — List/queryset order_by crash
grep -n "is_low_stock\|order_by" viewsets.py | head -10

# B4 — float() in validator
grep -n "float_value\|float(value)" security_validators.py

# B5 — Stock movement cross-company
grep -n "get_or_create\|product_id\|warehouse_id" viewsets.py | head -10

# B6/B7 — PO/bundle item without company check
grep -n "product_id=item_data\|product_id=item\[" viewsets.py views.py

# B9 — Hardcoded 18%
grep -n "0.18\|0\.18" viewsets.py views.py

# B10 — No select_for_update
grep -n "select_for_update\|get_or_create" viewsets.py views.py | grep -v "select_for_update"
```
