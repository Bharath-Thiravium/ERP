# INVENTORY_ARCHITECTURE_REPORT.md

**Scope:** `backend/inventory/` · **Mode:** READ-ONLY (no code modified).

---

## Module Size

| File | Lines | Purpose |
|------|------:|---------|
| `views.py` | 1,739 | ListCreateAPIView, FBV endpoints, dashboard |
| `models.py` | ~1,135 | All inventory models |
| `viewsets.py` | 469 | CompanyScopedModelViewSet subclasses |
| `serializers.py` | 329 | DRF serializers + validation |
| `security_validators.py` | 197 | Input sanitization + format validators |
| `aging_analyzer.py` | 143 | Aging / dead-stock analysis |
| `file_handlers.py` | 131 | Image upload with PIL validation |
| `utils.py` | ~60 | Misc helpers |
| `admin.py` | 61 | Django admin config |
| **Total** | **~4,200** | |

---

## Authentication Architecture

The inventory module uses a **single auth pattern** throughout — all views declare:

```python
authentication_classes = [ServiceUserSessionAuthentication]
permission_classes = [IsServiceUserAuthenticated]
```

There is no Pattern B (`AllowAny` with manual session check) found in this module. This is a significant improvement over the HR module.

However, auth is implemented in two distinct styles:

| Style | Used In | How Company Is Sourced |
|-------|---------|----------------------|
| **CompanyScopedModelViewSet** | `viewsets.py` (CategoryViewSet, SupplierViewSet, WarehouseViewSet, ProductViewSet, StockMovementViewSet, StockAlertViewSet, PurchaseOrderViewSet, InventoryAuditViewSet) | `super().get_queryset()` → `common/viewsets.py:25` adds `company=self.get_company()` filter |
| **Manual session check in method body** | `views.py` (all GenericAPIViews and FBVs) | Session extracted from header/query/body in every method independently |

The manual session check is copy-pasted ~20+ times in `views.py`. The `viewsets.py` implementations are DRY and centralized.

---

## URL Routing

```
/api/inventory/
  dashboard/          → InventoryDashboardViewSet (ViewSet, not ModelViewSet)
  categories/         → CategoryViewSet         (CompanyScopedModelViewSet)
  suppliers/          → SupplierViewSet          (CompanyScopedModelViewSet)
  warehouses/         → WarehouseViewSet         (CompanyScopedModelViewSet)
  products/           → ProductViewSet           (CompanyScopedModelViewSet)
  stock-movements/    → StockMovementViewSet     (CompanyScopedModelViewSet)
  stock-alerts/       → StockAlertViewSet        (CompanyScopedModelViewSet)
  purchase-orders/    → PurchaseOrderViewSet     (CompanyScopedModelViewSet)
  audits/             → InventoryAuditViewSet    (CompanyScopedModelViewSet)

  bundles/            → ProductBundleListCreateView  (ListCreateAPIView, manual session)
  bundles/<pk>/       → ProductBundleDetailView      (RUDV, manual session)
  cycle-counts/       → CycleCountListCreateView     (ListCreateAPIView, manual session)
  cycle-counts/<id>/start/  → start_cycle_count      (FBV, manual session)
  cycle-counts/<id>/pause/  → pause_cycle_count      (FBV, manual session)

  api/categories/     → get_categories          (FBV dropdown, manual session)
  api/suppliers/      → get_suppliers            (FBV dropdown, manual session)
  api/warehouses/     → get_warehouses           (FBV dropdown, manual session)

  reports/low-stock/         → low_stock_report           (FBV)
  reports/stock-valuation/   → stock_valuation_report     (FBV)
  reports/abc-analysis/      → abc_analysis_report        (FBV)
  reports/aging-analysis/    → inventory_aging_report     (FBV)
  reports/dead-stock/        → dead_stock_report          (FBV)

  products/<id>/upload-image/ → upload_product_image      (FBV)
  alerts/<id>/resolve/        → resolve_stock_alert       (FBV)
```

---

## Data Models

### Core Models

| Model | Company Scope | Key Unique Fields | Notes |
|-------|:---:|---|---|
| `Category` | `ForeignKey(Company)` | `code unique=True` (GLOBAL) + `unique_together = ['company', 'code']` | Both constraints present — global takes precedence |
| `Supplier` | `ForeignKey(Company)` | `supplier_code unique=True` (GLOBAL) + `unique_together` | Same double-unique pattern |
| `Warehouse` | `ForeignKey(Company)` | `code unique=True` (GLOBAL) + `unique_together` | Same |
| `Product` | `ForeignKey(Company)` | `product_code unique=True` (GLOBAL) + `unique_together`; `sku unique=True` (GLOBAL); `barcode unique=True` (GLOBAL) | Three globally unique fields |
| `ProductVariant` | via `product` FK | `variant_code unique=True` (GLOBAL); `sku unique=True` (GLOBAL) | No direct company FK |
| `ProductBundle` | `ForeignKey(Company)` | `bundle_code unique=True` (GLOBAL) + `unique_together` | Same double-unique |
| `StockLevel` | via `product__company` | `unique_together = ['product', 'warehouse']` | No direct company FK |
| `StockMovement` | via `product__company` | None | No direct company FK |
| `StockAlert` | `ForeignKey(Company)` | None | Direct company FK |
| `InventoryAudit` | `ForeignKey(Company)` | `audit_number unique=True` (GLOBAL) + ... | |
| `PurchaseOrder` | `ForeignKey(Company)` | `po_number unique=True` (GLOBAL) | |
| `CycleCount` | `ForeignKey(Company)` | `count_number unique=True` (GLOBAL) | |

### Model Relationships

```
Company ──< Category ──< Product ──< StockLevel ──> Warehouse ──< Company
                          │          │
                          │          └── StockMovement (no company FK)
                          │
                          ├──< ProductVariant (no company FK)
                          ├── ForeignKey(Category)   ← no company scope check on FK
                          └── ForeignKey(Supplier)   ← no company scope check on FK

Company ──< StockAlert ──> Product
                        └──> Warehouse

Company ──< PurchaseOrder ──> Supplier ──< Company
                           ──> Warehouse ──< Company
                           ──< PurchaseOrderItem ──> Product (no company scope check)

Company ──< ProductBundle ──< ProductBundleItem ──> Product (no company scope check)

Company ──< InventoryAudit ──> Warehouse
                            ──< InventoryAuditItem ──> Product (no scope check)
```

---

## Code Generation Pattern (Race Condition)

Every model uses the same fallback auto-code pattern (e.g., `Category.save()` lines 58-75):
```python
last_category = Category.objects.filter(
    company=self.company,
    code__startswith='CAT-'
).order_by('-id').first()
# Increment + assign — no lock, no transaction
```
This pattern is repeated for all 8+ models. All are subject to the same race condition as Finance B2 / HR O5: concurrent creates for the same company can generate duplicate codes.

---

## Inventory Valuation Method

The module uses **Weighted Average Cost (WAC)** for inventory valuation:
- `views.py:750-758`: When a new stock-in movement is received, the product's `cost_price` is recalculated as `(existing_stock × old_cost + new_quantity × new_unit_cost) / total_quantity`
- `Product.stock_value` property: `float(current_stock) * float(cost_price)` — Decimal precision loss via `float()`
- No FIFO/LIFO/Specific Identification support despite `Product.tracking_method` having `'fifo'` and `'lifo'` choices (these choices exist in the model but no calculation path implements them)

---

## Batch/Serial/Lot Tracking Architecture

- `StockLevel.batch_number = CharField`, `StockLevel.serial_numbers = JSONField` — fields exist
- `StockMovement.batch_number = CharField`, `StockMovement.expiry_date = DateField` — fields exist
- **No code enforces batch or serial uniqueness.** Batch numbers are free-form strings.
- **No code validates serial number uniqueness within or across warehouses.**
- `Product.tracking_method` choices: `['none', 'serial', 'batch', 'expiry', 'fifo', 'lifo']` — but no code path changes behavior based on this setting
- Conclusion: batch/serial tracking is implemented as data fields only; no business logic enforces or validates it

---

## Stock Reservation

- `StockLevel.quantity_reserved = DecimalField` field exists
- `StockLevel.available_stock` property: `quantity_available - quantity_reserved`
- **No code in stock movement creation, sale, or purchase path updates `quantity_reserved`.**
- Stock reservation is a placeholder field — no active reservation logic.

---

## Negative Stock Prevention

- **No negative stock check exists.** `views.py:724-725` and `viewsets.py:251-252`:
  ```python
  stock_level.quantity_available -= quantity
  ```
  No validation that `quantity <= stock_level.quantity_available`. Stock can freely go negative.

---

## Functional Coverage

| Feature | Implementation Status |
|---------|----------------------|
| Product CRUD | ✅ |
| Category CRUD | ✅ |
| Supplier CRUD | ✅ |
| Warehouse CRUD | ✅ |
| Stock Movements (in/out/purchase/sale) | ✅ |
| Stock Transfers (between warehouses) | ❌ — not implemented (movement type recorded but no stock update) |
| Stock Adjustments | ✅ (adjustment = signed add) |
| Negative Stock Prevention | ❌ — absent |
| Batch Tracking | ⚠️ — data fields only, no enforcement |
| Serial Tracking | ⚠️ — data fields only, no enforcement |
| Expiry Tracking | ⚠️ — data fields only, no enforcement |
| FIFO/LIFO Costing | ❌ — not implemented |
| Weighted Average Costing | ✅ (on stock-in) |
| Stock Alerts (low/out) | ✅ |
| Reorder Levels | ✅ (min_stock_level, reorder_point fields) |
| Purchase Orders | ✅ (hardcoded 18% tax) |
| Purchase Receipts | ⚠️ — no `receive_goods` endpoint to update `quantity_received` and trigger stock-in |
| Product Bundles | ✅ |
| ABC Analysis | ✅ (based on `abc_classification` field set on product) |
| Aging Analysis | ✅ |
| Dead Stock Report | ✅ |
| Inventory Audits (physical count) | ✅ |
| Cycle Counts | ✅ (hardcoded 50-item limit) |
| Stock Valuation Report | ✅ |
| Dashboard | ✅ |
