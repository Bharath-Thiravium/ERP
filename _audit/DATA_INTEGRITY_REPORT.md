# DATA_INTEGRITY_REPORT.md
## Data Integrity Audit — Global Cross-Module ERP
**Project:** SAP-Python Multi-Tenant ERP  
**Date:** 2026-06-26

---

## 1. Dual Product Model — Finance vs. Inventory

### Finding
Two completely separate `Product` models exist in two separate database tables with no linkage:

| | Finance Product | Inventory Product |
|--|----------------|-----------------|
| Model | `finance.models.Product` (finance/models.py:136) | `inventory.models.Product` (inventory/models.py:280) |
| Table | `finance_products` | `inventory_product` (Django default) |
| Stock tracking | ❌ None | ✅ Full (StockMovement, StockLevel) |
| Used in finance docs | ✅ Quotations, Invoices, POs, Proformas | ❌ Not referenced |
| Used in inventory | ❌ Not referenced | ✅ Warehouses, Audits, Bundles |
| HSN/SAC codes | ✅ Yes | Partial |
| Cross-reference FK | ❌ Does not exist | ❌ Does not exist |

### Consequence
- A Finance user adds "Steel Pipe" as a finance product. It appears in Quotations and Invoices.
- An Inventory user adds "Steel Pipe" as an inventory product. It has stock level tracking.
- These two records are completely independent.
- When a Finance Invoice is created for 100 units of "Steel Pipe", the inventory stock level is NOT reduced.
- When the Inventory team conducts a stock audit, it does not reconcile with Finance sales.

**Business impact:** Inventory levels in the Inventory module are meaningless for Finance operations. Double data entry is required. Financial reporting and inventory reporting can diverge over time.

### Scope of Affected Workflows
| Workflow | Impact |
|---------|--------|
| Quotation creation | Finance product only — no stock check |
| PO creation | Finance product only — no inventory reservation |
| Invoice creation | Finance product only — no stock deduction |
| Proforma invoice | Finance product only — no commitment tracking |
| Inventory cycle count | Inventory product only — no Finance revenue linkage |
| Stock movement | Inventory product only — not reflected in Finance |
| Inventory audit | Inventory product only |

---

## 2. CRM Model `created_by` / `owner` FK Inconsistency

### Finding
CRM models reference Django's built-in `User` model for ownership/audit fields, while all other modules reference `CompanyServiceUser`.

**CRM models with Django `User` FK** (crm/models.py):
- `Lead.created_by = ForeignKey(User, on_delete=CASCADE)` (line 60)
- `Lead.assigned_to = ForeignKey(User, on_delete=SET_NULL)` (line 62)
- `Contact.created_by = ForeignKey(User, on_delete=CASCADE)` (line 130)
- `Account.created_by = ForeignKey(User, on_delete=CASCADE)` (line 208)
- `Opportunity.owner = ForeignKey(User, on_delete=CASCADE)` (line 278)
- `Opportunity.created_by = ForeignKey(User, on_delete=CASCADE)` (line 281)
- `Deal.created_by = ForeignKey(User, on_delete=CASCADE)` (line 363)
- `Activity.created_by = ForeignKey(User, on_delete=CASCADE)` (line 414)
- `Note.created_by = ForeignKey(User, on_delete=CASCADE)` (line 468)
- `Note.updated_by = ForeignKey(User, on_delete=SET_NULL)` (line 478)
- `Pipeline.created_by = ForeignKey(User, on_delete=CASCADE)` (line 585)

**All other modules** use `CompanyServiceUser` for the same purpose:
- `finance.Customer.created_by = ForeignKey(CompanyServiceUser, on_delete=SET_NULL)` (finance/models.py:~68)
- `hr.Employee.created_by = ForeignKey(CompanyServiceUser, on_delete=SET_NULL)` (hr/models.py:~45)
- `inventory.Product.created_by = ForeignKey(CompanyServiceUser, on_delete=SET_NULL)` (inventory/models.py:~290)

### Data Consistency Risk
- CRM `on_delete=CASCADE` for `created_by` means: if the Django `User` is deleted, ALL CRM leads, contacts, opportunities, deals, activities, notes, and pipelines created by that user are **cascade-deleted**
- Other modules use `on_delete=SET_NULL`, which only NULLs the audit reference while preserving the record
- CRM records are more fragile to user deletion than Finance/HR/Inventory records

### Tenant Isolation Risk
- Django `User` has no `company` FK
- A `User` from Company A could theoretically be assigned as `Lead.assigned_to` in Company B
- No model-level constraint prevents cross-company user assignment in CRM
- Finance/HR/Inventory avoid this because `CompanyServiceUser` always has a company FK

---

## 3. Quotation-to-PO Status Flag Race Condition

### Finding
`finance/views.py:1450–1465` (PO creation from Quotation) performs three sequential DB writes WITHOUT wrapping in `transaction.atomic()`:

1. `purchase_order = serializer.save(...)` — creates PO
2. `quotation.po_created = True; quotation.save()` — marks quotation as "PO created"
3. `purchase_order.status = 'active'; purchase_order.save(...)` — marks PO as active

### Race Condition (Concurrent Requests)

```
Time    | User A                         | User B
--------|-------------------------------|-------------------------------
T+0     | Reads: quotation.po_created=False | Reads: quotation.po_created=False
T+1     | Creates PO #1001              | Creates PO #1002
T+2     | Sets quotation.po_created=True |                               
T+3     |                               | Sets quotation.po_created=True
```

Result: Two POs exist for the same Quotation. Quotation shows `po_created=True` but which PO is "the one" is undefined.

### Data Inconsistency (Partial Failure)

```
Step 1: PO #1001 created (DB write succeeds)
Step 2: quotation.save() fails (DB timeout, connection drop, etc.)
Result: PO exists, Quotation shows po_created=False
        → Quotation.is_editable() returns True
        → Another PO can be created from same Quotation
```

The `Quotation.is_editable()` method (finance/models.py:1087) that prevents duplicate PO creation reads from `self.po_created` — a boolean flag that is only reliable when set atomically with the PO creation.

### Similar Issues Found
- `finance/views.py:1672` — Proforma Invoice creation sets `quotation.proforma_created = True` and `quotation.invoice_created = True` in the same non-atomic block
- `finance/views.py:1932` — Invoice creation sets `quotation.invoice_created = True` outside atomic block

---

## 4. ServiceUser Session Without Expiry

### Finding
`ServiceUserLoginView.create()` (authentication/views.py:1420–1465) creates a `ServiceUserSession` record without setting `expires_at`:

```python
session = ServiceUserSession.objects.create(
    service_user=service_user,
    session_key=session_key,
    ip_address=ip_address,
    device_info=device_info
    # expires_at NOT SET
)
```

The `ServiceUserSession` model has an `expires_at` field (authentication/models.py:~312) but it is never populated. `ServiceUserSessionAuthentication.authenticate()` checks:
```python
if session.expires_at and session.expires_at < timezone.now():
    return None
```

With `expires_at = None`, the condition `if session.expires_at` is `False`, so expiry is NEVER checked. Sessions are effectively permanent until manually deactivated (`is_active = False`).

### Data Integrity Impact
- Ex-employee's service user session remains valid indefinitely after they leave the company
- A stolen session key grants permanent access with no time-bounded remediation
- If the company's approval is revoked but session records are not deactivated, access continues
- Audit logs that rely on session records to track user activity will show "never expired" sessions for all users

---

## 5. Company Deletion — No Soft-Delete, No Archiving

### Finding
`CompanyDetailView.perform_destroy()` (authentication/views.py:332–414) performs a hard-delete of ALL company data using a single `transaction.atomic()` block:

1. Uses `apps.get_models()` to iterate ALL Django models
2. For each model with a FK to `CompanyServiceUser`, sets `created_by`, `approved_by`, etc. to NULL
3. Additionally uses raw SQL for `athens_project*` tables (outside Django ORM)
4. Calls `company.delete()` which triggers Django CASCADE:
   - Deletes all `CompanyService`, `CompanyUser`, `ServiceUserSession`, `CompanyServiceUser` records
   - Django FK CASCADE from Company then deletes all Finance, HR, Inventory, CRM records in one shot

**No soft-delete:** Once confirmed, all data is permanently lost. There is no `is_deleted` flag, no audit table, no archiving step.

**No pre-deletion count:** The code does not check how many records will be affected before proceeding.

**No async/background deletion:** The deletion is synchronous, inside a web request. For a company with 5 years of transactions (10k invoices, 50k line items, 1k employees, 5k leads), this can take minutes and will timeout in production.

**Raw SQL for unmanaged tables** (lines 347–375): The `athens_project*` tables are targeted via raw SQL but are not in `INSTALLED_APPS`. If these tables do not exist in the production database, the raw SQL raises `django.db.utils.ProgrammingError` inside the `transaction.atomic()` block, which rolls back the entire deletion — the company cannot be deleted.

---

## 6. Cross-Module Orphan Record Risks

### 6.1 Inventory → HR Employee Orphans

When an HR employee is deleted:
- `Warehouse.manager` is set to NULL (`on_delete=SET_NULL`) — silent data loss
- `InventoryAudit.supervisor` is set to NULL — audit record loses its supervisor reference
- `CycleCountItem.counted_by` is set to NULL — count verification loses its auditor reference
- `InventoryAuditItem.audited_by` is set to NULL — audit line loses its auditor reference

There is no notification, no warning, and no revalidation triggered when an HR employee deletion causes NULL-outs in Inventory.

### 6.2 Finance Service User Orphans

Finance records reference `CompanyServiceUser` for `created_by` and `revised_by` with `on_delete=SET_NULL`. When a service user is deleted (e.g., staff resignation):
- `Invoice.created_by` is set to NULL
- `Quotation.created_by` is set to NULL
- `Payment.created_by` is set to NULL

These NULLed fields mean the invoice audit trail (who created/approved this invoice) is permanently lost. No compensating record is created in a history or event log table.

### 6.3 CRM User Orphans (Cascade Risk)

CRM records reference Django `User` with `on_delete=CASCADE`. When a Django user is deleted:
- ALL `Lead` records created by that user are **hard-deleted** (cascade)
- ALL `Contact` records are **hard-deleted** (cascade)
- ALL `Opportunity` records are **hard-deleted** (cascade)
- ALL `Deal`, `Activity`, `Note` records are **hard-deleted** (cascade)

This is a silent, irreversible data destruction risk. A Django admin accidentally deleting a user account could wipe out years of CRM pipeline records.

---

## 7. Analytics Data Source — No Tenant Scope

### Finding
The Analytics module reads cross-tenant data without any company filter:

**revenue_analytics.py:**
- `Payment.objects.filter(status='completed').aggregate(...)` — ALL companies
- `Invoice.objects.count()` — ALL companies

**service_analytics.py:**
- `Employee.objects.count()` — ALL companies
- `Product.objects.count()` — ALL companies (Inventory products only)
- `StockMovement.objects.count()` — ALL companies

### Impact on Data Integrity Reporting
Analytics dashboards show aggregate numbers that mix data from all tenants. If a company admin views "total revenue" in the analytics dashboard, they see the sum of ALL companies' revenue, not their own company's revenue. This makes the analytics module functionally incorrect for its intended use case (per-company insights).

---

## 8. JWT Token Blacklisting — Stub Implementation

### Finding
`authentication/utils.py:invalidate_all_user_sessions()` is:
```python
def invalidate_all_user_sessions(user):
    pass  # stub — does nothing
```

`rest_framework_simplejwt.token_blacklist` IS in `INSTALLED_APPS` (settings.py:108), so the infrastructure exists. But the function that should add tokens to the blacklist is a `pass` stub.

### Data Integrity Impact
- When a user's password is changed, active JWT tokens are NOT invalidated
- When a user account is deactivated, active JWT tokens remain valid until expiry (60 minutes default, 24 hours for refresh)
- A compromised account that has its password changed can continue using the stolen token for up to 60 minutes

---

## 9. Summary: Data Integrity Risk Register

| Risk | Severity | Modules Affected | Type |
|------|----------|-----------------|------|
| Dual Product model (Finance ≠ Inventory) | CRITICAL | Finance, Inventory | Design gap |
| CRM `created_by` cascade on User delete | CRITICAL | CRM | Model inconsistency |
| Quotation→PO no atomic transaction | CRITICAL | Finance | Race condition |
| Sessions never expire (no `expires_at`) | HIGH | All modules | Missing implementation |
| Company delete sync mega-transaction | HIGH | All modules | Operational risk |
| Athens project raw SQL tables missing | HIGH | Authentication | ORM gap |
| Analytics returns cross-tenant data | HIGH | Analytics | Missing filter |
| Inventory→HR orphan NULLs on employee delete | MEDIUM | Inventory, HR | Silent data loss |
| Finance service user orphans (NULLed audits) | MEDIUM | Finance | Silent data loss |
| JWT invalidation is a stub | HIGH | Authentication | Missing implementation |
