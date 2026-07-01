# Phase 1.6 — Business Workflow Analysis

Workflows reconstructed from routing (`frontend/src/lib/router.tsx`), auth stores, models, and
the "Athens" access-gating design in `AGENTS.md` / `ATHENS_*` docs.

## 1. Master Admin login flow

```
/login (userType='master')
  → POST credentials → backend (JWT)
  → [if 2FA enabled] → /2fa (TOTP via pyotp) → verify
  → access+refresh tokens stored (tokenManager + authStore)
  → user.is_master_admin = true
  → redirect /master-admin (EnhancedDashboard)
```
Master admin can manage services, approve companies, view platform analytics, and access
`UltraSecureSettings` (`/master-admin/settings`) incl. DB backup/restore (`configuration` app).

## 2. Company registration & onboarding flow (lifecycle gating)

This is the central "Athens" workflow — a company user is progressively unblocked:

```
1. Company created (by master admin or self-registration) → Company.approval_status = 'pending'
2. CompanyUser logs in (/login, userType='company')
3. firstLoginRequired?  → forced to /company/detailed-info (DetailedInfoForm)
      → fills company profile (GST, bank, address, logo...) → submits
      → CompanyUser.profile_status → submitted/pending approval
4. approvalPending?     → /company/waiting-approval (WaitingApproval) — read-only holding screen
5. Master admin approves → Company.approval_status='approved', approved_by set
6. requireApproved met  → /company (Dashboard) + /company/services (ServiceSelection)
7. Company admin enables Services (CompanyService) and creates Service Users
      (CompanyServiceUser, role admin/manager/user)
```

Password lifecycle overlays this: if `mustChangePassword` or `forcePasswordReset` is set, a
**blocking** `PasswordChangeModal` appears globally until a new password is set.

> Per `AGENTS.md`, this gating must be enforced by a **central backend access-state endpoint**
> consumed by frontend guards — not by UI redirects alone.

## 3. Service User login flow (operational users)

```
/service-login (ServiceUserLogin)
  → POST username+password (scoped to company+service)
  → backend validates CompanyServiceUser, creates ServiceUserSession
  → returns session key → stored as 'service_session_key' (sessionStorage + localStorage)
  → ServiceUserSessionAuthentication authenticates subsequent /api/* calls (Bearer session key)
  → redirect to the relevant service dashboard (/services/finance|hr|inventory|crm/...)
```
Separate from JWT; managed by `serviceUserStore`. `ProtectedRoute requireServiceUser` restores
the key from localStorage if missing.

## 4. Dashboard flow

- **Master admin dashboard** (`/master-admin`): platform-wide metrics, company/service mgmt,
  system health (`analytics` app: SystemMetrics/ServiceHealth/APIMetrics/SystemAlert).
- **Company dashboard** (`/company`): tenant overview — service utilization, activity logs,
  notifications (`company_dashboard` app).
- **Service dashboards** (`/services/<area>/dashboard`): domain KPIs pulled via React Query
  from the matching `/api/<area>/` endpoints.

## 5. CRUD flows (generic pattern)

All business modules follow the same shape:

```
List page (React Query useQuery → GET /api/<area>/<resource>/?page=&search=&filters)
  → Create/Edit via form (react-hook-form + zod) → POST/PUT /api/<area>/<resource>/
  → DRF ViewSet validates + scopes to caller's Company + records created_by (CompanyServiceUser)
  → signals fire side effects (numbering, stock, notifications)
  → React Query invalidates cache → list refreshes
```
Example heavy forms: `PurchaseOrderForm.tsx`, `CustomerForm.tsx`, `EmployeeForm.tsx`,
`ProductForm.tsx` (each 1,000–1,550 lines).

## 6. Sales document / approval flow (Finance — the core money workflow)

```
Quotation (draft) ──► [revise/reject by service user] ──► approved
   │
   ▼ convert
Purchase Order ──► (optional) Proforma Invoice ──► Tax Invoice
   │                                                   │
   │                                                   ▼
   └──────────────────────────────────────────► Payment (full / partial / direct / TDS-only)
```
- Each document gets an auto-generated number via `NumberingRule`/`NumberingCounter` (per company).
- Revise/reject tracked via `revised_by`/`rejected_by` + status fields.
- Payments can be applied to Invoice, ProformaInvoice, or PO; "direct payment" and "TDS-only
  payment" are special modes (heavily documented in root `DIRECT_PAYMENT_*` / `TDS_*` notes).
- PDFs generated server-side (WeasyPrint/ReportLab) per company template
  (`finance/templates`, `finance/templatetags`).

## 7. Procurement flow (vendor side)

```
Purchase Request ──► Vendor Invoice ──► Purchase Payment
                                   └──► TDS Deposit (Indian tax compliance)
```

## 8. HR / payroll / compliance flow

```
Employee onboarding (Department/Designation) 
  → Attendance capture (web, devices, or mobile app face/geo)  → AttendanceLog
  → Payroll: PayrollSettings + SalaryComponent → PayrollCycle → Payslip → PayrollReport
  → Celery Beat statutory automation: monthly ECR/ESI, govt return submission,
     compliance checks (daily), reminders (weekly), rate updates (monthly)
```

## 9. Recruitment flow (public)

```
JobPosting (HR creates) → public portal /jobs → /jobs/:id → /jobs/:id/apply
  → JobApplication submitted (no auth) → HR reviews internally
```

## 10. Notification flow

```
Domain event (signal / task) → Notification created (notifications app)
  → delivered via /api/notifications/ + realtime (Django Channels over Redis)
  → company_dashboard.CompanyNotification for tenant-scoped alerts
Email side: transactional via global SMTP; business email (invoices/quotations) via
  per-company encrypted SMTP (CompanyEmailSettings, Fernet-encrypted creds);
  scheduled email automation via Celery + python-crontab.
```

## 11. Orchestrator / self-healing flow (internal)

```
Request → OrchestratorMiddleware → on error: match ErrorPattern → apply FixMethod
  → record WorkflowExecution / WorkflowError / AmazonQHistory
```
An experimental AI-ops subsystem. Understand it before debugging unexpected request/response
mutations — it sits in the middleware chain and can alter behavior globally.
