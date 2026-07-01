# INVENTORY_SECURITY_REPORT.md

**Scope:** `backend/inventory/` · **Mode:** READ-ONLY.
**Severity:** 🔴 High · 🟠 Medium · 🟡 Low.

---

## Baseline (verified secure)

The inventory module is significantly better than the HR module from a security standpoint:
- All endpoints declare `authentication_classes = [ServiceUserSessionAuthentication]` and `permission_classes = [IsServiceUserAuthenticated]` — no `AllowAny` found anywhere.
- `CompanyScopedModelViewSet` is used consistently for all 9 ViewSets in `viewsets.py`.
- No unauthenticated endpoints.
- `InventorySecurityValidator` provides active input sanitization (XSS-safe via `strip_tags` + `escape`, format validation for GST/PAN/HSN/barcode, path traversal prevention).
- File upload validates content type, size, and uses `Pillow` image verification.

---

## 🔴 S1 — Cross-company FK injection via `PurchaseOrderItem.product`

**Severity:** 🔴 High
**File/Line:** `viewsets.py:401–408`; `views.py:1370–1377`

**Proof:**
```python
for item_data in items_data:
    PurchaseOrderItem.objects.create(
        purchase_order=purchase_order,   # belongs to Company A
        product_id=item_data['product'], # ← can be any company's product
        quantity_ordered=item_data['quantity_ordered'],
        unit_price=item_data['unit_price'],
        notes=item_data.get('notes', '')
    )
```

`PurchaseOrderItem.product` is a raw `ForeignKey(Product)`. The create path does not validate that `Product.objects.get(id=item_data['product']).company == purchase_order.company`. A service user from Company A can include `product_id` values from Company B's product catalog.

**Reproduction:**
```bash
# Company A session, but with Company B's product ID
curl -X POST http://localhost:8005/api/inventory/purchase-orders/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "supplier": <COMPANY_A_SUPPLIER_ID>,
    "warehouse": <COMPANY_A_WAREHOUSE_ID>,
    "order_date": "2026-06-24",
    "items": [{"product": <COMPANY_B_PRODUCT_ID>, "quantity_ordered": 10, "unit_price": 100}]
  }'
# PurchaseOrderItem created with Company B's product in Company A's PO
```

**Business Impact:** Cross-company product data is linked to another company's financial records. Company A's PO reports show Company B's product details. Supplier payment calculations include foreign catalog items. Data integrity across companies is compromised.

---

## 🔴 S2 — Cross-company FK injection via `StockMovement` — product/warehouse mismatch

**Severity:** 🔴 High
**File/Line:** `viewsets.py:234–258`; `serializers.py:261–276`

**Proof:**
`StockMovementSerializer` does not scope either `product` or `warehouse` to the caller's company. `StockMovementViewSet` sets `company_field_name = "product__company"` for *reads* only — writes do not enforce that `product.company == warehouse.company`.

```bash
# Company A session, Company B warehouse
curl -X POST http://localhost:8005/api/inventory/stock-movements/ \
  -H "Authorization: Bearer SESSION_A" \
  -H "Content-Type: application/json" \
  -d '{
    "product": <COMPANY_A_PRODUCT_ID>,
    "warehouse": <COMPANY_B_WAREHOUSE_ID>,
    "movement_type": "in",
    "quantity": 100
  }'
# Creates StockLevel for Company A product in Company B warehouse
```

**Business Impact:** Company A's stock records are linked to Company B's warehouse. Company B's warehouse appears to hold Company A's inventory in all reports and dashboard views.

---

## 🟠 S3 — `ProductBundleItem.product` not validated against bundle's company

**Severity:** 🟠 Medium
**File/Line:** `views.py:1533–1539`

**Proof:**
```python
for item_data in items_data:
    ProductBundleItem.objects.create(
        bundle=bundle,
        product_id=item_data['product'],  # ← any product from any company
        ...
    )
```

Bundle is saved with `company=service_user.company`, but bundle items can reference products from any company.

**Business Impact:** Cross-company product data in bundle definitions. Bundle pricing calculations include foreign product costs.

---

## 🟠 S4 — `InventoryAudit.supervisor` and `audit_team` accept cross-company HR employees

**Severity:** 🟠 Medium
**File/Line:** `serializers.py:319–327`; `models.py:794-795`

**Proof:**
```python
class InventoryAudit(models.Model):
    supervisor = models.ForeignKey('hr.Employee', ..., null=True)
    audit_team = models.ManyToManyField('hr.Employee', ...)
```

`InventoryAuditSerializer` (serializers.py:312-327) does not filter `supervisor` or `audit_team` to the session's company. Any `hr.Employee` ID can be referenced.

**Business Impact:** An inventory audit record can reference employees from another company as supervisor/team members. Cross-company HR employee exposure in inventory audit context.

---

## 🟠 S5 — All code fields globally unique — cross-company enumeration oracle

**Severity:** 🟠 Medium
**File/Line:** `models.py:16, 88, 186, 302, 303, 349, 504, 777, 1005`

**Proof:**
```python
class Category(models.Model):
    code = models.CharField(max_length=20, unique=True)  # :16 — GLOBAL
    ...
    class Meta:
        unique_together = ['company', 'code']  # redundant; field unique=True is stricter

class Product(models.Model):
    product_code = models.CharField(max_length=50, unique=True)  # :302
    sku = models.CharField(max_length=50, unique=True)           # :303
    barcode = models.CharField(max_length=50, blank=True, unique=True)  # :349
```

Models with global `unique=True` on codes:
- `Category.code` (line 16)
- `Supplier.supplier_code` (line 88)
- `Warehouse.code` (line 186)
- `Product.product_code` (line 302)
- `Product.sku` (line 303)
- `Product.barcode` (line 349)
- `ProductBundle.bundle_code` (line 504)
- `ProductVariant.variant_code` (line 591)
- `ProductVariant.sku` (line 601)
- `InventoryAudit.audit_number` (line 777)
- `PurchaseOrder.po_number` (line 1005)
- `CycleCount.count_number` (line 863)

An attacker can create a product with `product_code=COMPETITOR_PRD_001`. The 400 error "Product with this product_code already exists" confirms the code is in use in some company.

**Additional Impact:** Two companies cannot both have a product with the same barcode (which is a common scenario — many products from the same manufacturer have the same barcode). This prevents legitimate multi-tenant onboarding.

---

## 🟠 S6 — Session key accepted from query parameter in all views

**Severity:** 🟠 Medium (inherited risk)
**File/Line:** `views.py:57–58, 870–872, 943–944, 987–988, 1043–1046, 1124–1126, 1164–1166, 1189–1191` etc.

**Proof (representative):**
```python
# views.py:56-58  InventoryDashboardViewSet.list()
session_key = request.headers.get('Authorization', '').replace('Bearer ', '')
if not session_key:
    session_key = request.query_params.get('session_key')   # ← URL leak
```

This pattern is repeated in every manual-session view in `views.py`. Session keys in query parameters appear in server access logs, `Referer` headers, browser history, and reverse proxy logs.

**Business Impact:** Log-level attacker can replay inventory session keys to read product catalogs, purchase orders, and stock valuations.

---

## 🟡 S7 — `upload_product_image` exposes server-side file path in response

**Severity:** 🟡 Low
**File/Line:** `views.py:1105–1108`

**Proof:**
```python
return Response({
    'success': True,
    'file_path': file_path,     # ← e.g. 'inventory/products/5/12/product_img.jpg'
    'message': 'Image uploaded successfully'
})
```

`file_path` reveals the internal directory structure (`inventory/products/{company_id}/{product_id}/`). An attacker can infer company IDs and product IDs from this path.

**Business Impact:** Minor path disclosure. Company ID and product ID can be correlated if an attacker uploads images and observes the response paths.

**Remediation:** Return only a URL suitable for client display, not the raw storage path.

---

## 🟡 S8 — `dead_stock_report` accepts unconstrained `days` from query params

**Severity:** 🟡 Low (information disclosure + crash risk)
**File/Line:** `views.py:1175`

**Proof:**
```python
days_threshold = int(request.query_params.get('days', 365))  # no validation, no try/except
```

Non-integer input → `ValueError` → HTTP 500 (internal error exposed to caller). Negative value → all products shown as dead stock.

---

## Permission Matrix

| Endpoint | Auth Class | Any Open? |
|----------|-----------|:---------:|
| All `viewsets.py` ViewSets | `CompanyScopedModelViewSet` → `ServiceUserSessionAuthentication` | No |
| All `views.py` GenericAPIViews | `[ServiceUserSessionAuthentication]` | No |
| All FBV endpoints | `@authentication_classes([ServiceUserSessionAuthentication])` | No |
| Dashboard | `[ServiceUserSessionAuthentication]` | No |

**Inventory module has no unauthenticated endpoints.** All findings are data-integrity / cross-company FK injection issues rather than authentication bypasses.

---

## Priority

1. **S1 + S2** — Fix cross-company FK validation in stock movement and PO item creates.
2. **S3** — Validate bundle items' product company membership.
3. **S5** — Remove field-level `unique=True` from all code fields; rely only on `unique_together = ['company', 'code']`.
4. **S4** — Scope `supervisor` and `audit_team` FK querysets to session company.
5. **S6** — Stop accepting session keys from query parameters.
6. **S7/S8** — Low priority cleanup.
