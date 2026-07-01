# INVENTORY_WORKFLOW_REPORT.md

**Scope:** `backend/inventory/` · **Mode:** READ-ONLY.
**Key:** ✅ correct · ⚠️ risk · ❌ defect/absent.

---

## 1. Product Management

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Tenant isolation (reads) | ✅ | `viewsets.py:96` | `ProductViewSet` extends `CompanyScopedModelViewSet` — `company=session.company` injected by base |
| Tenant isolation (writes) | ✅ | `views.py:597-600` | `serializer.save(company=service_user.company, created_by=service_user)` |
| `category` FK company scope | ❌ | `viewsets.py:111-117` | Filter by `category_id` from query params without verifying category belongs to session's company — cross-company category assignment possible |
| `primary_supplier` FK company scope | ❌ | `serializers.py:205-217` | `ProductCreateSerializer` includes `primary_supplier` but no queryset filter on it; supplier from another company can be linked |
| `low_stock` filter crashes | ❌ | `viewsets.py:128-130` | `queryset = [p for p in queryset if p.is_low_stock()]` converts to list; `queryset.order_by(...)` on line 130 raises `AttributeError` → HTTP 500 |
| Product code global uniqueness | ❌ | `models.py:302` | `product_code = unique=True` globally; two companies cannot share "PRD-000001" prefix — registration fails for 2nd company |
| SKU global uniqueness | ❌ | `models.py:303` | Same problem |
| Barcode global uniqueness | ❌ | `models.py:349` | Same problem |
| Code auto-generation race | ⚠️ | `models.py:419-440` | No `select_for_update()` — concurrent product creates may collide |
| Numeric validation converts to float | ❌ | `security_validators.py:92` | `validate_numeric_field` returns `float(value)` — stored in DecimalField causing precision loss |
| Hard delete | ❌ | `viewsets.py` (destroy inherited) | `CompanyScopedModelViewSet.destroy()` is a hard delete — no soft delete, no audit log |

---

## 2. Categories

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Tenant isolation | ✅ | `viewsets.py:28-40` | Filtered by `is_active=True` and scoped via `CompanyScopedModelViewSet` |
| Circular parent_category reference | ❌ | `models.py:18` | `parent_category = ForeignKey('self')` — no validation prevents a category being its own ancestor (infinite loop possible in tree traversal) |
| Category code global uniqueness | ❌ | `models.py:16` | `code = unique=True` globally; `unique_together = ['company', 'code']` is redundant/stricter |

---

## 3. Units of Measure

| Dimension | Status | Note |
|-----------|:---:|---|
| Unit of Measure model | ❌ | **No UOM model exists** in `models.py`. The audit scope includes UOM but no implementation was found. Stock quantities are dimensionless `DecimalField` values — no unit assignment. |

---

## 4. Warehouses

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Tenant isolation | ✅ | `viewsets.py:64-81` | Filtered by company |
| `manager` FK company scope | ❌ | `serializers.py:99-107` | `manager` is FK to `hr.Employee` without queryset scope filter — any company's employee can be assigned as warehouse manager |
| Warehouse code global uniqueness | ❌ | `models.py:186` | `code = unique=True` globally — cross-company collision possible |
| `capacity_utilization` uses float | ⚠️ | `models.py:268-269` | `float(self.total_capacity) / float(self.used_capacity)` — float for display OK; not used in financial calculation |

---

## 5. Stock Management (StockLevel)

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Tenant isolation (reads) | ✅ | via `product__company` | `StockLevel` has no direct company FK but is scoped via `product__company` |
| StockLevel updated in transaction | ✅ | `viewsets.py:229` / `views.py:701` | `with transaction.atomic()` wraps both movement create and stock level update |
| `select_for_update()` | ❌ | `viewsets.py:237-241` | `StockLevel.objects.get_or_create(...)` with no lock — concurrent movements can corrupt stock balance |
| `quantity_reserved` ever updated | ❌ | Entire codebase | `quantity_reserved` field exists but is NEVER incremented or decremented by any code path. Stock reservation logic is absent. |
| Negative stock prevented | ❌ | `viewsets.py:251-252` | `stock_level.quantity_available -= quantity` — no check for `quantity > available`. Negative stock allowed. |

---

## 6. Stock Movements

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Tenant isolation (reads) | ✅ | `viewsets.py:197` | `company_field_name = "product__company"` — scoped via CompanyScopedModelViewSet |
| `in/purchase/return/production` | ✅ | `viewsets.py:249-250` | `stock_level.quantity_available += quantity` |
| `out/sale/damage` | ⚠️ | `viewsets.py:251-252` | Subtracts — but no negative check |
| `adjustment` | ✅ | `viewsets.py:253-254` | Signed add — supports both positive and negative adjustments |
| `transfer` movement type | ❌ | `viewsets.py:249-254` | **Transfer is in `MOVEMENT_TYPES` but NOT in any if/elif branch.** Source warehouse NOT decremented, destination warehouse NOT incremented. Transfers are ghost records. |
| `destination_warehouse` FK used | ❌ | `viewsets.py:237-318` | `destination_warehouse` is saved to `StockMovement` but never read in any stock update logic |
| Product/warehouse cross-company | ❌ | `viewsets.py:234-235` / `serializers.py:261-276` | `StockMovementSerializer` does NOT validate that `product.company == warehouse.company`. A movement can link Company A's product to Company B's warehouse. |
| Weighted average cost update | ✅ | `views.py:742-759` | Correct WAC calculation for incoming stock |
| WAC uses `product.current_stock` after update | ⚠️ | `views.py:744` | `product.current_stock` is re-fetched via aggregate after `stock_level.save()` — correct but extra query |

---

## 7. Stock Transfers

| Dimension | Status | Note |
|-----------|:---:|---|
| Transfer implementation | ❌ | As above — the `transfer` movement type records the event but performs no stock updates on either the source or destination warehouse |
| Expected behavior | N/A | Should: (1) decrement source warehouse `quantity_available`; (2) increment destination warehouse `quantity_available`; (3) create two stock movement records or one bi-directional record |

---

## 8. Purchase Receipts

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Purchase Order creation | ✅ | `viewsets.py:391-420` | Creates PO and line items in transaction |
| Tax calculation | ❌ | `viewsets.py:412` | `tax_amount = subtotal * Decimal('0.18')` — hardcoded 18% GST regardless of `product.tax_rate` |
| Receive goods endpoint | ❌ | Absent | No endpoint to receive goods against a PO (i.e., update `PurchaseOrderItem.quantity_received` and create a corresponding stock-in movement). PO stays in 'ordered' status indefinitely. |
| PO item product company scope | ❌ | `viewsets.py:401-408` | `PurchaseOrderItem.objects.create(purchase_order=..., product_id=item['product'])` — no check that `product.company == purchase_order.company` |
| Supplier company scope | ✅ | `PurchaseOrderViewSet.get_queryset()` | PO filtered by company; supplier is also filtered via `CompanyScopedModelViewSet` reads |

---

## 9. Stock Adjustments

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Adjustment movement | ✅ | `viewsets.py:253-254` | `quantity` added (can be negative for downward adjustment) |
| Adjustment reason required | ⚠️ | `models.py:685-692` | `adjustment_reason` field has choices but is `blank=True` — not required |
| Audit trail | ✅ | `StockMovement.created_by`, `quantity_before`, `quantity_after` | Before/after recorded |

---

## 10. Reorder Levels

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Reorder fields | ✅ | `models.py:325-328` | `min_stock_level`, `max_stock_level`, `reorder_point`, `reorder_quantity` |
| Alert generation | ✅ | `viewsets.py:272-286` | Stock alerts created automatically on stock movement |
| Reorder suggestion accuracy | ⚠️ | Alert uses `product.current_stock` | `current_stock` sums ALL warehouses; a product may be low in one warehouse but fully stocked in another — alert may be spurious |
| Auto-reorder (PO creation) | ❌ | Absent | No automated PO creation on hitting `reorder_point` |

---

## 11. Inventory Reports

| Report | Tenant Scoped? | Python Loop Issue? |
|--------|:---:|:---:|
| `low_stock_report` | ✅ | ❌ iterates all products; N aggregate queries |
| `stock_valuation_report` | ✅ | ❌ iterates all products; N aggregate queries |
| `abc_analysis_report` | ✅ | ❌ iterates all products; N aggregate queries |
| `inventory_aging_report` | ✅ | ❌ N products × 1 last-movement query each |
| `dead_stock_report` | ✅ | ❌ same as aging |

All reports correctly scope to session company. All have significant performance issues for large catalogues.

---

## 12. Inventory Dashboard

| Dimension | Status | File/Line | Note |
|-----------|:---:|---|---|
| Tenant isolation | ✅ | `views.py:71-74` | `company = service_user.company` |
| `total_stock_value` calculation | ❌ | `views.py:87-90` | `sum(product.stock_value for product in products)` — N queries (each `product.stock_value` triggers an aggregate) |
| `low_stock_products` count | ❌ | `views.py:95-96` | Same N-query pattern |
| `total_stock_value` precision | ❌ | `views.py:87` / `models.py:470-471` | `Product.stock_value` uses `float(current_stock) * float(cost_price)` — Decimal → float precision loss |
| Hardcoded AI placeholders | ⚠️ | `views.py:170-173` | `'demand_trend': 'stable'`, `'inventory_turnover': 0`, `'optimization_score': 0` — not calculated |

---

## 13. Tenant Isolation

| Entity | Isolation Method | Verified |
|--------|-----------------|:---:|
| Category | `company` FK + `CompanyScopedModelViewSet` | ✅ |
| Supplier | `company` FK + `CompanyScopedModelViewSet` | ✅ |
| Warehouse | `company` FK + `CompanyScopedModelViewSet` | ✅ |
| Product | `company` FK + `CompanyScopedModelViewSet` | ✅ |
| StockLevel | `product__company` (nested) | ✅ |
| StockMovement | `product__company` (nested, `company_field_name = "product__company"`) | ✅ |
| StockAlert | `company` FK direct | ✅ |
| PurchaseOrder | `company` FK + `CompanyScopedModelViewSet` | ✅ |
| InventoryAudit | `company` FK + `CompanyScopedModelViewSet` | ✅ |
| ProductBundle | `company` FK + manual session check | ✅ |
| PurchaseOrderItem.product | NOT validated to match PO.company | ❌ |
| ProductBundleItem.product | NOT validated to match bundle.company | ❌ |
| Category FK on Product creation | NOT validated to match product.company | ❌ |
| Supplier FK on Product creation | NOT validated to match product.company | ❌ |
| StockMovement product+warehouse | NOT validated to both belong to same company | ❌ |

---

## 14. Permission Enforcement

All endpoints use `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated` — no `AllowAny` found in the inventory module. Permission enforcement is uniformly applied. See Security Report for session-key-in-URL issue.

---

## 15. Inventory Valuation

| Method | Status | Note |
|--------|:---:|---|
| Weighted Average Cost | ✅ | Implemented in `views.py:742-759` for stock-in movements |
| FIFO | ❌ | `tracking_method='fifo'` choice exists but no FIFO calculation path |
| LIFO | ❌ | Same — choice exists but not implemented |
| Specific Identification | ❌ | Not implemented |
| Cost precision | ❌ | `Product.stock_value` uses `float()` — Decimal precision lost |

---

## 16–17. Batch / Serial Number Tracking

**Batch tracking:**
- `StockLevel.batch_number = CharField(max_length=50, blank=True)` — free text, no uniqueness
- `StockMovement.batch_number = CharField(max_length=50, blank=True)` — audit trail only
- No code enforces that a batch belongs to a specific supplier, lot, or expiry date
- `StockLevel.expiry_date = DateField(null=True)` — field only; no expiry alert generated from this field (alerts come from `StockAlert.alert_type='expiry_warning'` but no code creates this alert type)

**Serial number tracking:**
- `StockLevel.serial_numbers = JSONField(default=list)` — stores a list of strings
- No uniqueness validation on serial numbers
- No code validates that a serial number is not already allocated
- No code removes serial numbers from `StockLevel.serial_numbers` when stock-out occurs

---

## 18. Stock Reservation Logic

`StockLevel.quantity_reserved` field exists. `StockLevel.available_stock` property returns `quantity_available - quantity_reserved`. **No code path ever modifies `quantity_reserved`.** The field is permanently zero for all records.

---

## 19. Negative Stock Prevention

No check exists anywhere in the codebase. `stock_level.quantity_available -= quantity` is executed unconditionally. Stock can go to `-∞`. See Bug Report B1.

---

## 20. Data Integrity

| Issue | Status |
|-------|:---:|
| `transaction.atomic()` on stock movements | ✅ |
| `transaction.atomic()` on PO creation | ✅ |
| `select_for_update()` on StockLevel | ❌ absent |
| Negative stock check | ❌ absent |
| Transfer logic (2-leg update) | ❌ absent |
| PO tax hardcoded | ❌ |
| `validate_numeric_field` returns float (not Decimal) | ❌ |
| Code auto-generation race condition | ❌ |
