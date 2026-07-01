# GLOBAL_ARCHITECTURE_REPORT.md
## Global Cross-Module ERP Architecture Audit
**Project:** SAP-Python Multi-Tenant ERP  
**Scope:** All 20 cross-module audit areas  
**Auditor:** Static code analysis — source code as truth  
**Date:** 2026-06-26

---

## 1. Application Module Map

| Module | App Directory | Auth Pattern | Primary Model Owner |
|--------|--------------|-------------|---------------------|
| Authentication | `authentication/` | Django JWT + custom session | `Company`, `CompanyServiceUser`, `MasterAdmin` |
| Finance | `finance/` | Manual session key (AllowAny) | Finance-specific `Product`, `Customer`, `Invoice`, `Payment` |
| HR | `hr/` | `ServiceUserSessionAuthentication` | `Employee`, `Department`, `PayrollCycle` |
| Inventory | `inventory/` | `ServiceUserSessionAuthentication` | Inventory-specific `Product`, `Warehouse`, `StockMovement` |
| CRM | `crm/` | `ServiceUserSessionAuthentication` | `Lead`, `Contact`, `Account`, `Deal` |
| Company Dashboard | `company_dashboard/` | Mix (JWT + session) | `DocumentNumberingConfig`, `CompanyUserSession` |
| Analytics | `analytics/` | `IsAuthenticated` (JWT) | `SystemMetrics`, `ServiceHealth` |
| Reports | `reports/` | Manual session key | Cross-module read views |
| Orchestrator | `orchestrator/` | Applied as middleware | `ErrorPattern`, `WorkflowExecution` |
| Notifications | `notifications/` | `IsAuthenticated` | `Notification` |

---

## 2. Cross-Module Dependency Graph

```
authentication (Company, CompanyServiceUser, Service)
      │
      ├──► finance (imports: authentication.Company, CompanyServiceUser)
      │         │
      │         └──► company_dashboard (imports: finance.Invoice, PurchaseOrder, ProformaInvoice)
      │         └──► analytics (imports: finance.Invoice, Payment)
      │         └──► reports (imports: finance.Quotation, PurchaseOrder, ProformaInvoice, Invoice)
      │
      ├──► hr (imports: authentication.Company, CompanyServiceUser)
      │         │
      │         └──► analytics (imports: hr.Employee, Attendance)
      │         └──► inventory (references: hr.Employee via string FK 'hr.Employee')
      │
      ├──► inventory (imports: authentication.Company, CompanyServiceUser)
      │         │
      │         └──► analytics (imports: inventory.Product, StockMovement)
      │
      ├──► crm (imports: authentication.Company, CompanyServiceUser)
      │
      └──► orchestrator (middleware: applied to ALL requests)
```

**One-way dependencies (no circular loops detected at import level):**
- `inventory` → `hr` (string FK reference only; not direct import)
- `analytics` → `finance`, `hr`, `inventory` (direct imports)
- `reports` → `finance` (direct imports)
- `company_dashboard` → `finance`, `authentication` (direct imports)

---

## 3. Authentication Pattern Comparison

| Module | Auth Classes | Permission Classes | Session Key Source |
|--------|-------------|-------------------|-------------------|
| HR | `ServiceUserSessionAuthentication` | `IsServiceUserAuthenticated` | Authorization header only |
| Inventory | `ServiceUserSessionAuthentication` | `IsServiceUserAuthenticated` | Authorization header only |
| CRM | `ServiceUserSessionAuthentication` | `IsServiceUserAuthenticated` | Header + query param + body |
| Finance | `[]` (disabled) | `AllowAny` | Header + query param + body (25+ times) |
| Reports | `ServiceUserSessionAuthentication` | `IsServiceUserAuthenticated` | Header + query param |
| Analytics | JWT (`IsAuthenticated`) | `IsAuthenticated` | Bearer JWT |
| Company Dashboard | Mix (JWT and session) | Mix | Both |

**Critical inconsistency:** Finance module alone uses the legacy `AllowAny` + manual session extraction pattern, while all other service modules use the standardized `ServiceUserSessionAuthentication` + `IsServiceUserAuthenticated` pair. This creates:
- 25+ duplicate session validation paths in `finance/views.py`
- Session key accepted from request body (POST data) — unique to Finance
- No centralized session expiry or company isolation enforcement for Finance

---

## 4. Dual Product Model Problem

The application has **TWO SEPARATE product models in two separate database tables** with no linkage:

| Aspect | Finance Product | Inventory Product |
|--------|----------------|------------------|
| Model | `finance.models.Product` | `inventory.models.Product` |
| Table | `finance_products` | (no explicit `db_table` — defaults to `inventory_product`) |
| File | `finance/models.py:136` | `inventory/models.py:280` |
| Used by | Quotations, Invoices, POs, Proformas | Stock levels, Warehouses, Movements, Bundles |
| Stock tracking | None | Full stock level + movement tracking |
| HSN/SAC codes | Yes (FK to HSNCode, SACCode) | Partial |
| Company FK | Yes | Yes |

**Consequence:** A product sold via a Finance Invoice has zero connection to Inventory stock. Sales do not reduce inventory levels. Inventory audits do not reflect Finance sales. These two systems operate completely independently.

---

## 5. Cross-Module Foreign Key References

### 5.1 Inventory → HR

`inventory/models.py` references `hr.Employee` via string FKs:

| Model | Field | Reference | on_delete |
|-------|-------|-----------|-----------|
| `Warehouse` | `manager` | `'hr.Employee'` | `SET_NULL` |
| `InventoryAudit` | `audit_team` | `'hr.Employee'` (M2M) | — |
| `InventoryAudit` | `supervisor` | `'hr.Employee'` | `SET_NULL` |
| `CycleCountItem` | `counted_by` | `'hr.Employee'` | `SET_NULL` |
| `InventoryAuditItem` | `audited_by` | `'hr.Employee'` | `SET_NULL` |

**Risk:** If a company does not subscribe to the HR service, there are no Employee records, so all these FK fields are NULL by default. If an HR employee is deleted (e.g., termination), all associated Inventory records lose their references silently. No data integrity check verifies that Inventory and HR are subscribed together.

### 5.2 CRM → Django User (not CompanyServiceUser)

`crm/models.py` uses `ForeignKey(User, on_delete=models.CASCADE)` for audit fields (`created_by`, `assigned_to`, `owner`), while all other modules use `ForeignKey(CompanyServiceUser, on_delete=models.SET_NULL)`.

`CRMBaseViewSet` authenticates via `ServiceUserSessionAuthentication` which sets `request.user = AnonymousUser()`. When CRM creates records with `created_by = request.user`, it assigns `AnonymousUser` which is not a valid `User` FK target.

**Actual user assignment in CRM create (crm/views.py:63-80):**
The serializer save is called after session validation but the `request.user` is `AnonymousUser`. The `created_by` field requires a real Django `User` FK. If CRM code attempts `created_by=request.user`, it will fail at the DB constraint. If it passes `created_by=session.service_user.user`, it would need to traverse `service_user → User` — inconsistency with the model definition.

### 5.3 Analytics → Finance/HR/Inventory

`analytics/analytics_engine/` directly imports from `finance`, `hr`, and `inventory` models:
- `revenue_analytics.py:4`: `from finance.models import Invoice, Payment`
- `growth_analytics.py:5-6`: `from finance.models import Payment` + `from hr.models import Employee`
- `service_analytics.py:5-7`: `from finance.models import Invoice, Payment` + `from hr.models import Employee` + `from inventory.models import Product, StockMovement`

These analytics run **without any company scope filter**, aggregating data across all tenants.

---

## 6. Company Lifecycle

### 6.1 Company Creation

On company creation (authentication/serializers.py:143-190):
1. `Company` record created
2. `User` (Django auth) created
3. `CompanyUser` profile created (OneToOne with User)
4. `CompanyService` records created (one per selected service)
5. Auto-code settings initialized (via `initialize_company_auto_codes`)

**Gap:** No corresponding Finance/HR/Inventory/CRM initialization is performed. There is no "setup" step that creates default configurations in each service module.

### 6.2 Company Approval

On approval, `approval_status` changes to `'approved'`. `IsServiceUserAuthenticated` checks this field before granting access. `IsCompanyUser` views check `company.approval_status` in business logic.

**Gap:** `IsServiceUserAuthenticated` permission class (permissions.py:51) only checks `hasattr(company, 'approval_status')` — if the field doesn't exist (dynamic model change), the check is silently skipped.

### 6.3 Company Deletion

`CompanyDetailView.perform_destroy()` (authentication/views.py:332-414) uses a single `transaction.atomic()` block that:
1. Iterates all `apps.get_models()` to find FK references to `CompanyServiceUser`
2. Nullifies or deletes all such FK references
3. Calls `instance.delete()` which triggers Django CASCADE → deletes ALL company-related records across Finance, HR, Inventory, CRM simultaneously

**Risk:** No timeout guard, no row count check, no archiving, no soft-delete. Deleting a company with years of data can timeout, partially rollback, or deadlock.

---

## 7. Service Assignment Consistency

`CompanyService` model in `authentication/models.py` tracks which services a company subscribes to. However:

- **No enforcement in module views**: Finance, HR, Inventory, CRM views do NOT verify that the company's service_user belongs to a company that has the corresponding service subscribed. A service user with a valid session for Finance service can call HR endpoints.
- **Service detection in analytics**: `service_analytics.py` detects Finance/HR/Inventory companies by filtering `company_services__service__name='Finance'` — this depends on exact string matching of the service name, which is fragile.
- **Service deactivation gap**: When a service is deactivated for a company (`CompanyService.is_active = False`), existing `ServiceUserSession` records for that service remain active.

---

## 8. Transaction Boundary Analysis

| Operation | Atomic? | Risk |
|-----------|---------|------|
| Company creation (auth serializer) | Yes (wrapped in Django ORM) | Low |
| Company approval | Yes (`transaction.atomic()` at views.py:574) | Low |
| Company deletion (full cascade) | Yes but too broad | HIGH — timeout risk |
| Finance PO from Quotation (views.py:1450-1465) | No | CRITICAL — race condition |
| Finance Invoice creation | Not explicitly atomic | MEDIUM |
| Finance Payment (payment_views.py) | Partial | MEDIUM |
| HR Payroll cycle creation | Partial | MEDIUM |
| Inventory stock movement | Not found | Unknown |
| Auto-code generation (utils.py:57) | Yes (`select_for_update`) | Low |
| Document numbering (company_dashboard) | Yes (`select_for_update`) | Low |

---

## 9. Orchestrator Middleware Impact

`orchestrator.middleware.OrchestratorMiddleware` is listed in `MIDDLEWARE` (settings.py:142):
```python
'orchestrator.middleware.OrchestratorMiddleware',
```

On EVERY request, it:
1. Creates `OrchestratorAgent()` instance
2. Calls `start_workflow()` — potentially writing to `orchestrator_workflow_execution` table
3. On response, calls `complete_workflow('completed')` — another DB write

**Impact per request:** 2 DB writes minimum for every API call. For a busy production system with 1000 requests/second, this generates 2000 additional DB writes/second to the orchestrator tables.

---

## 10. Module Summary Risk Table

| Module | Tenant Isolation | Auth Consistency | Cross-Module Risk | Production Risk |
|--------|-----------------|-----------------|-------------------|----------------|
| Finance | ✅ Manual (per-view) | ❌ Inconsistent (AllowAny) | ✅ No outbound deps | MEDIUM |
| HR | ✅ Via `CompanyScopedModelViewSet` | ✅ Correct | MEDIUM (referenced by Inventory) | LOW |
| Inventory | ✅ Via `CompanyScopedModelViewSet` | ✅ Correct | ❌ HR FK without enforcement | MEDIUM |
| CRM | ✅ Via `CRMBaseViewSet` | ✅ Correct | ❌ Django User FK mismatch | MEDIUM |
| Analytics | ❌ Cross-tenant (all companies) | ⚠️ JWT only (no role check) | ❌ Reads Finance+HR+Inventory | CRITICAL |
| Reports | ✅ Manual | ✅ Session-based | ✅ Read-only | LOW |
| Orchestrator | N/A | N/A | ⚠️ Writes on every request | HIGH |
| Authentication | N/A (is the authority) | N/A | Source of company/service | CRITICAL |
