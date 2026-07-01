# Phase 1.5 — Database Analysis

**Engine:** PostgreSQL — database `modernsap`. **Tenancy model:** row-level isolation — every
business record carries a `company` FK to `authentication.Company`. **Identity:** Django built-in
`auth_user`; tenant/role data layered in the `authentication` app.

> Table names below are the default Django convention `<app>_<model>` (lowercased). ~100+ tables total.

## Core identity / tenancy ER (text)

```
auth_user (Django built-in)
   │ 1─1                 │ 1─1                    │ 1─1
   ▼                     ▼                        ▼
MasterAdmin          CompanyUser ───────────► Company ◄──────── created_by/approved_by (auth_user)
                         │ FK company             │ 1─*
                         │                        ├──► CompanyService ──► Service
                         │                        ├──► CompanyAutoCodeSettings
                         │                        ├──► CompanyServiceUser ──► Service
                         │                        │        │ 1─*
                         │                        │        ▼
                         │                        │    ServiceUserSession
                         │                        └──► (all business records: finance/hr/inv/crm)
SecurityLog ──► auth_user (nullable)
```

- **`MasterAdmin`** 1–1 `auth_user` — platform operator.
- **`Company`** — the tenant. `company_prefix` (unique) drives auto-codes; `approval_status`
  (pending/approved/...); detailed profile fields (bank, logo, GST, etc.); `created_by` /
  `approved_by` → `auth_user`.
- **`CompanyUser`** 1–1 `auth_user`, FK `Company` — tenant administrator; has `profile_status`
  lifecycle + `profile_approved_by`.
- **`Service`** — catalog of services (finance, hr, inventory, crm, ...), `service_type` unique.
- **`CompanyService`** — M2M join: which services a company has enabled (`unique_together`
  company+service).
- **`CompanyServiceUser`** — operational users created by a company admin **per service**, with
  `role` ∈ {admin, manager, user}; `unique_together` (company, service, username); generates a
  unique `service_id` from company prefix + username. **This is the FK used as `created_by` /
  `revised_by` / `rejected_by` across all finance records.**
- **`ServiceUserSession`** — active sessions (session key) for a `CompanyServiceUser` (custom auth).
- **`SecurityLog`** — audit of security events, nullable user FK.

## Finance ER (the document lifecycle — core business)

```
Company
  ├─► Customer ─► CustomerShippingAddress
  │      ▲  ▲  ▲  ▲
  │      │  │  │  └──────────────────────────────┐
  │      │  │  │                                  │
  ├─► Quotation ──(1─*)─► QuotationItem           │
  │      │  (optional)                            │
  │      ▼                                        │
  ├─► PurchaseOrder ──(1─*)─► PurchaseOrderItem   │  (PO may reference Quotation; or be direct)
  │      │      ▲                                 │
  │      ▼      │                                 │
  ├─► ProformaInvoice ──(1─*)─► ProformaInvoiceItem   (from PO or Quotation)
  │      │
  │      ▼
  ├─► Invoice ──(1─*)─► InvoiceItem ──(optional)─► PurchaseOrderItem
  │      │  (Invoice may reference PO, ProformaInvoice, and/or Quotation)
  │      ▼
  ├─► Payment ──► (Invoice | ProformaInvoice | PurchaseOrder)   (also "direct" payments)
  │
  ├─► Vendor ─► PurchaseRequest ─► PurchaseRequestItem
  │              └─► VendorInvoice ─► VendorInvoiceItem ─► PurchasePayment
  ├─► TDSDeposit
  ├─► Product (finance's own product table)
  └─► NumberingRule / NumberingCounter  (per-company document numbering)

Shared lookups: HSNCode, SACCode (GST tax classification — global, seeded from HSN.csv/SAC.csv)
```

**Key relationships & notes:**
- Sales document chain: **Quotation → PurchaseOrder → ProformaInvoice → Invoice → Payment**,
  each step optionally linkable to earlier ones (flexible — supports "direct" POs/invoices/payments).
- `created_by` / `revised_by` / `rejected_by` on Quotation/PO/Proforma/Invoice all FK
  `CompanyServiceUser` — supports an internal revise/reject approval workflow.
- Procurement chain (vendor side): **PurchaseRequest → VendorInvoice → PurchasePayment**,
  plus `TDSDeposit` for Indian tax-deducted-at-source.
- **Auto-numbering:** `NumberingRule` + `NumberingCounter` (per company) generate sequential
  document numbers with DB locking — a historically fragile area (many root `*NUMBERING*` notes).

## HR ER (text)

```
Company
  ├─► Department ─► Designation
  ├─► Employee ─► (Department, Designation)
  │      ├─► Attendance ◄─ AttendanceSystem / AttendanceDevice / AttendanceLog
  │      ├─► PerformanceReview
  │      └─► Payslip ◄─ PayrollCycle ◄─ PayrollSettings / SalaryComponent ─► PayrollReport
  └─► JobPosting ─► JobApplication   (public recruitment portal)
```

## Inventory ER (text)

```
Company
  ├─► Category, Supplier, Warehouse
  ├─► Product ─► ProductVariant / ProductBundle ─► ProductBundleItem
  │      └─► StockLevel (per Warehouse) ─► StockMovement ─► StockAlert
  ├─► InventoryAudit ─► InventoryAuditItem
  ├─► CycleCount ─► CycleCountItem
  └─► PurchaseOrder ─► PurchaseOrderItem   (inventory's OWN PO table, distinct from finance)
```

> ⚠️ **Naming collision:** `Product` and `PurchaseOrder` exist in **both** `finance` and
> `inventory` as separate tables (`finance_product`/`inventory_product`,
> `finance_purchaseorder`/`inventory_purchaseorder`). When debugging, always confirm which app's
> model you're looking at.

## CRM ER (text)

```
Company
  ├─► Lead ─► LeadScore ◄─ ScoringCriteria
  ├─► Contact, Account
  ├─► Opportunity / Deal ─► PipelineStage, DealStageHistory; SalesQuota, SalesTarget, SalesAnalytics
  ├─► Campaign ─► CampaignMember
  ├─► Ticket ◄─ TicketCategory, SLA;  KnowledgeBase
  ├─► CustomerInteraction; CustomerHealthScore
  ├─► CustomerSegment ─► CustomerSegmentMembership
  └─► EmailIntegration / CalendarIntegration ─► EmailActivity
```

## Critical business entities (priority for any change)

| Entity | App | Why critical |
|--------|-----|--------------|
| `Company` | authentication | Tenant root; every record scopes to it. Mis-scoping = data leak across tenants. |
| `CompanyServiceUser` + `ServiceUserSession` | authentication | Operational auth; broken session logic locks users out. |
| `Invoice`, `Payment`, `PurchaseOrder` | finance | Money + legal documents; numbering & totals must be exact. |
| `NumberingRule` / `NumberingCounter` | finance | Duplicate/gap document numbers are compliance failures. |
| `Payslip` / `PayrollCycle` | hr | Salary correctness + statutory compliance (ECR/ESI). |
| `StockLevel` / `StockMovement` | inventory | Inventory accuracy; double-counting risk. |
| `HSNCode` / `SACCode` | finance | GST tax rates; seeded from `HSN.csv` / `SAC.csv`. |

## Seed / reference data

- `HSN.csv` (1.3 MB) and `SAC.csv` (47 KB) at repo root — GST HSN/SAC tax classification data.
- Numerous root `add_*_units.sql` / `fix_*.sql` scripts — unit-of-measure and data fixes.
- `modernsap_backup.sql` (4.1 MB) — **a full DB dump committed to git** (see security report).
