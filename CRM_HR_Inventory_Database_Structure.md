# CRM, HR, Inventory Database Structure

Generated from the Django app registry on 2026-07-15.

Scope:
- CRM app: `backend/crm`
- HR app: `backend/hr`
- Inventory app: `backend/inventory`

Legend:
- `PK` = primary key
- `UQ` = unique
- `FK` = foreign key
- `O2O` = one-to-one
- `M2M` = many-to-many
- All three modules are multi-tenant. Most business tables are scoped by `company`.

## Shared Design Notes

- Tenant isolation is mainly through `company -> Company`.
- Service-user created records commonly reference `CompanyServiceUser`.
- CRM customer sharing uses `MasterCustomer` links on CRM `Account` and `Contact`.
- Inventory product sharing uses `MasterProduct` link on `Product`.
- HR employee data is company-specific and not shared through master tables.
- Document numbers are stored in each module table, for example `quote_number`, `employee_id`, `attendance_number`, `po_number`, `audit_number`, `count_number`.

## CRM Tables

### Core Sales

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| Lead | `crm_lead` | Raw sales lead before conversion | `company`, `lead_id`, name/email/phone, `status`, `priority`, `source`, `estimated_value`, `expected_close_date`, `assigned_to -> User`, `created_by -> User`, converted links to `Contact`, `Account`, `Opportunity`, `tags` | `(company, lead_id)` |
| Contact | `crm_contact` | Person/contact record | `company`, `master_customer -> MasterCustomer`, `contact_id`, name/email/phone/mobile, address fields, `created_by`, `is_active`, `tags` | `(company, contact_id)` |
| Account | `crm_account` | Customer/company account | `company`, `master_customer -> MasterCustomer`, `account_id`, `name`, `account_type`, `industry`, billing/shipping address, `primary_contact -> Contact`, `account_manager -> User`, `created_by`, `is_active`, `tags` | `(company, account_id)` |
| Opportunity | `crm_opportunity` | Sales opportunity linked to account/contact | `company`, `opportunity_id`, `name`, `account -> Account`, `contact -> Contact`, `stage`, `amount`, `probability`, `expected_close_date`, `owner`, `created_by`, `closed_date`, `tags` | `(company, opportunity_id)` |
| Activity | `crm_activity` | CRM activity/task/call/meeting | `company`, `activity_id`, `subject`, `activity_type`, `status`, optional links to `Lead`, `Contact`, `Account`, `Opportunity`, `due_date`, `assigned_to`, `created_by`, `completed_at`, `outcome` | `(company, activity_id)` |
| SalesTarget | `crm_salestarget` | User sales target | `company`, `user`, `period`, `year`, optional `month`, optional `quarter`, target/achieved amount, `created_by` | `(company, user, period, year, month, quarter)` |

### Pipeline

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| PipelineStage | `crm_pipelinestage` | Kanban/pipeline stage setup | `company`, `name`, `order`, `probability`, `color`, `is_active` | `(company, order)` |
| Deal | `crm_deal` | Pipeline deal card | `company`, `deal_id`, `name`, `account -> Account`, `contact -> Contact`, `opportunity -> Opportunity` O2O optional, `current_stage -> PipelineStage`, `status`, `value`, `probability`, `expected_close_date`, `actual_close_date`, `owner`, `created_by`, `tags` | `(company, deal_id)` |
| DealStageHistory | `crm_dealstagehistory` | Deal movement history | `deal -> Deal`, `stage -> PipelineStage`, `changed_by -> User`, `changed_at`, `notes`, `duration_days` | - |
| SalesQuota | `crm_salesquota` | Sales quota setup | `company`, `user`, `period`, `year`, optional `month`, optional `quarter`, quota/achieved amount, deal target/achieved, `created_by` | `(company, user, period, year, month, quarter)` |

### Campaign And Marketing

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| Campaign | `crm_campaign` | CRM campaign and audience container | `company`, `campaign_id`, `name`, `campaign_type`, `status`, `start_date`, `end_date`, `budget`, `target_audience`, `leads_generated`, `opportunities_created`, `revenue_generated`, `created_by`, `tags` | `(company, campaign_id)` |
| CampaignMember | `crm_campaignmember` | Campaign audience member | `campaign -> Campaign`, optional `lead -> Lead`, optional `contact -> Contact`, `status`, sent/response dates | `(campaign, lead)`, `(campaign, contact)` |
| EmailTemplate | `crm_emailtemplate` | Email template | `company`, `name`, `template_type`, `subject`, `html_content`, `text_content`, `is_active`, `created_by` | - |
| MarketingCampaign | `crm_marketingcampaign` | Email run linked to campaign | `company`, `campaign_id`, `crm_campaign -> Campaign`, `name`, `campaign_type`, `status`, `start_date`, `end_date`, `email_template -> EmailTemplate`, send/open/click/bounce counters, `created_by` | `(company, campaign_id)` |
| EmailSend | `crm_emailsend` | Individual email send record | `campaign -> MarketingCampaign`, `email_address`, `status`, sent/delivered/opened/clicked/bounced/unsubscribed dates, open/click counts | - |
| AutomationWorkflow | `crm_automationworkflow` | Marketing automation workflow | `company`, `name`, `trigger_type`, `trigger_conditions`, `actions`, `status`, totals, `created_by` | - |

### Customer Analytics And Support

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| CustomerInteraction | `crm_customerinteraction` | Interaction log | `company`, `interaction_id`, optional `contact`, optional `account`, optional `deal`, `interaction_type`, `subject`, `description`, `outcome`, `interaction_date`, `duration_minutes`, `created_by`, `metadata` | `(company, interaction_id)` |
| CustomerHealthScore | `crm_customerhealthscore` | Account health score | `account -> Account` O2O, engagement/satisfaction/usage/financial/overall scores, `health_status`, `churn_risk`, `upsell_opportunity`, risk factors, recommendations | `account` O2O |
| CustomerSegment | `crm_customersegment` | Customer segment | `company`, `name`, `description`, `criteria`, `color`, `is_active`, `created_by` | - |
| CustomerSegmentMembership | `crm_customersegmentmembership` | Account membership in segment | `segment -> CustomerSegment`, `account -> Account`, `added_by` | `(segment, account)` |
| TicketCategory | `crm_ticketcategory` | Support category | `company`, `name`, `description`, `color`, `is_active` | - |
| SLA | `crm_sla` | SLA by priority | `company`, `name`, `priority`, response/resolution hours, `is_active` | `(company, priority)` |
| Ticket | `crm_ticket` | Support ticket | `company`, `ticket_id`, `subject`, `description`, `status`, `priority`, `source`, `category`, `contact`, `account`, `assigned_to`, `sla`, due/resolved dates, satisfaction fields, `created_by` | `(company, ticket_id)` |
| KnowledgeBase | `crm_knowledgebase` | Help article | `company`, `title`, `content`, `category`, `tags`, publish flag, view/helpful count, `created_by` | - |

### AI, Reporting, Security, Integrations

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| LeadScore | `crm_leadscore` | Lead AI score | `lead -> Lead` O2O, behavioral/demographic/engagement/predictive/total scores, grade, conversion probability, recommended actions, score factors | `lead` O2O |
| ScoringCriteria | `crm_scoringcriteria` | Lead score criteria | `company`, `name`, `criteria_type`, `weight`, `max_points`, `is_active` | - |
| SalesAnalytics | `crm_salesanalytics` | Aggregated sales metrics | `company`, `metric_type`, `period`, `date`, year/month/week/quarter, value/count, `metadata` | `(company, metric_type, period, date)` |
| ReportTemplate | `crm_reporttemplate` | Advanced report config | `company`, `name`, `report_type`, `chart_type`, `data_source`, `filters`, `grouping`, `metrics`, `chart_config`, `created_by` | - |
| Dashboard | `crm_dashboard` | Custom dashboard config | `company`, `name`, `layout`, `widgets`, `is_public`, `created_by`, `shared_with -> User` M2M | - |
| BusinessIntelligence | `crm_businessintelligence` | Generated insights | `company`, `insight_type`, `title`, `description`, `data`, `priority`, recommended actions, acknowledged fields | - |
| ThirdPartyIntegration | `crm_thirdpartyintegration` | External integration settings | `company`, `name`, `integration_type`, `provider`, endpoint/webhook/config, encrypted key, status, sync fields, `created_by` | - |
| IntegrationLog | `crm_integrationlog` | Integration logs | `integration`, `log_type`, `level`, `message`, `details` | - |
| EmailIntegration | `crm_emailintegration` | Email provider credentials | `company`, `provider`, encrypted `credentials`, `is_active`, `last_sync` | `(company, provider)` |
| CalendarIntegration | `crm_calendarintegration` | Calendar provider credentials | `company`, `provider`, encrypted credentials, `calendar_id`, active/sync fields | `(company, provider)` |
| EmailActivity | `crm_emailactivity` | Tracked email activity | `company`, `activity_type`, `email_address`, `subject`, `tracking_id`, optional `lead`, `contact`, `opportunity`, `metadata` | - |
| DataAuditLog | `crm_dataauditlog` | Audit trail | `company`, `user`, `action`, `model_name`, `object_id`, `object_repr`, `changes`, IP/user agent/session | - |
| ComplianceRule | `crm_compliancerule` | CRM compliance rules | `company`, `name`, `rule_type`, `conditions`, `actions`, `status`, `created_by` | - |
| ComplianceViolation | `crm_complianceviolation` | Compliance issue | `company`, `rule`, `title`, `severity`, `status`, affected records/data, resolution fields | - |
| DataRetentionPolicy | `crm_dataretentionpolicy` | Retention setup | `company`, retention type/period/data types/conditions, archive/notify settings, status, last executed | - |
| SecurityAlert | `crm_securityalert` | Security alert | `company`, `alert_type`, `title`, `severity`, `status`, `alert_data`, `response_actions`, `assigned_to`, `affected_users -> User` M2M | - |
| APIUsageLog | `crm_apiusagelog` | API usage log | `company`, `user`, endpoint, method, status, response time, request data, response size, IP/user agent | - |
| MobileDevice | `crm_mobiledevice` | CRM mobile device | `user`, `company`, `device_id`, device info, push token, status, last active, IP | `device_id` |
| MobileSync | `crm_mobilesync` | Mobile sync run | `device`, `sync_type`, `status`, data types, records synced, errors, started/completed/duration | - |

### CRM Quotes

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| QuoteTemplate | `crm_quotetemplate` | Quote PDF template | `company`, `name`, header/footer/terms, colors, logo URL, default/active, `created_by` | - |
| Quote | `crm_quote` | CRM quotation | `company`, `quote_number`, `account`, `contact`, `opportunity`, `template`, title/description/status, quote/valid/sent/viewed/accepted dates, subtotal/tax/discount/total, notes/terms, public UUID, `created_by` | `(company, quote_number)` |
| QuoteItem | `crm_quoteitem` | Quote line item | `quote`, name/description, quantity, unit price, total, product code, line number | `(quote, line_number)` |
| QuoteActivity | `crm_quoteactivity` | Quote activity trail | `quote`, `activity_type`, `description`, IP/user agent | - |
| QuoteSignature | `crm_quotesignature` | Accepted quote signature | `quote` O2O, signer details, signature data, IP/user agent | `quote` O2O |

## HR Tables

### Employee Master

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| Department | `hr_department` | Department master | `company`, `name`, `code`, `description`, `manager -> Employee`, `is_active` | `(company, code)` |
| Designation | `hr_designation` | Designation master | `company`, `title`, `code`, `department`, `level`, min/max salary, `is_active` | `(company, code)` |
| Employee | `hr_employee` | Employee master | `company`, `employee_id`, name/contact, DOB/gender, department/designation, employment/work mode, joining/leaving/status, reporting manager, salary, permanent/local/current address, Aadhar/PAN/PF/UAN/ESI, bank details, emergency contact, skills, scores, profile/face images, mobile app password/enabled/device, `created_by` | `(company, employee_id)`, unique email per company |
| EmployeeMobileSession | `hr_employeemobilesession` | Mobile app session | `employee`, `session_key`, device/IP/user agent, active/expires/last seen/revoked | `session_key` |
| EmployeeWorkflowStatus | `hr_employeeworkflowstatus` | Employee onboarding workflow | `employee` O2O, current stage, access level, profile/induction timestamps, approval/rejection fields | `employee` O2O |
| EmployeeProfileCompletion | `hr_employeeprofilecompletion` | Employee profile completion | `employee` O2O, profile sections, document files, completion percentage, submitted flags | `employee` O2O |
| EmployeeAccessLog | `hr_employeeaccesslog` | Access history | `employee`, module, access granted, workflow/access level snapshot, IP/user agent | - |

### Recruitment

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| JobPosting | `hr_jobposting` | Job opening | `company`, title, department/designation, description, requirements, responsibilities, employment/work mode, salary range, required skills, AI screening flag, status, posted/deadline, `created_by` | - |
| JobApplication | `hr_jobapplication` | Candidate application | `job_posting`, application number, candidate details, experience/salary/location, links, education/skills/certifications/languages JSON, resume, cover letter, source/share id, AI score/match/notes, status, interview fields | - |

### Attendance

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| AttendanceSystem | `hr_attendancesystem` | Company attendance method config | `company` O2O, `system_type`, enable biometric/face/mobile/manual flags, geo fencing location/radius, work start/end, grace period, face threshold, face required flags | `company` O2O |
| AttendancePolicy | `hr_attendancepolicy` | Attendance policy for payroll/leave | `company` O2O, weekly off days, full/half day minimum hours, overtime after hours, paid holiday/leave flags, unpaid leave deduction, exclude weekoff/holiday from leave, payroll lock flag | `company` O2O |
| AttendanceDayOverride | `hr_attendancedayoverride` | One-day working/off override | `company`, `date`, `is_working_day`, title/reason | `(company, date)` |
| Attendance | `hr_attendance` | Daily employee attendance | `employee`, `attendance_number`, `date`, check-in/out time/method/location/lat/lng/face, biometric IDs, work mode, total/break/overtime hours, status, validation flags, notes, `approved_by` | `(employee, date)` |
| AttendanceDevice | `hr_attendancedevice` | Biometric/device master | `company`, `device_id`, name/type/location/IP, active, last sync | `device_id` |
| AttendanceLog | `hr_attendancelog` | Raw device log | `device`, `employee`, timestamp, log type, raw data, processed | - |

### Leave

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| LeaveType | `hr_leavetype` | Leave type setup | `company`, name/code/category, days per year, carry forward, max carry forward, paid flag, approval flag, notice days, active | `(company, code)` |
| LeaveBalance | `hr_leavebalance` | Employee leave balance | `employee`, `leave_type`, year, opening, credited, used, closing | `(employee, leave_type, year)` |
| LeaveApplication | `hr_leaveapplication` | Leave request | `employee`, application number, `leave_type`, from/to dates, total days, reason, status, approved by/date, rejection reason | - |
| Holiday | `hr_holiday` | Company holiday | `company`, name, date, holiday type, mandatory flag, description, applicable states | `(company, date, name)` |

### Payroll And Statutory

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| SalaryComponent | `hr_salarycomponent` | Salary component setup | `company`, name/code, component type, value, statutory/active flags | `(company, code)` |
| PayrollSettings | `hr_payrollsettings` | Payroll settings | `company` O2O, PF/ESI/PT/TDS/overtime flags and rates/ceilings | `company` O2O |
| PayrollCycle | `hr_payrollcycle` | Payroll month/cycle | `company`, payroll number, name, period type, start/end/pay date, status, totals, calculated/approved/processed by and timestamps | `(company, name)` |
| Payslip | `hr_payslip` | Employee payslip | `payroll_cycle`, `employee`, employee snapshot, working/present/absent days, earnings, deductions, employer contributions, net salary, CTC, payment status/reference/date | `(payroll_cycle, employee)` |
| PayrollReport | `hr_payrollreport` | Payroll generated report | `company`, `payroll_cycle`, report type, file path, generated by | - |
| StatutorySettings | `hr_statutorysettings` | PF/ESI/PT/TDS company config | `company` O2O, establishment codes, rates, ceilings, state/TAN settings, working hours/days, overtime multiplier | `company` O2O |
| EmployeeStatutoryDetails | `hr_employeestatutorydetails` | Employee statutory details | `employee` O2O, UAN/PF/ESI/KYC/bank/wage category | `employee` O2O |
| PayslipStatutoryDetails | `hr_payslipstatutorydetails` | Statutory split per payslip | `payslip` O2O, PF/ESI wages/contributions, tax/PT fields, working days/overtime | `payslip` O2O |
| SalaryPayment | `hr_salarypayment` | Salary payment transaction | `payroll_cycle`, `employee`, amount, method/status, bank details, references, payment date/error | - |
| GovernmentReturn | `hr_governmentreturn` | Statutory return | `company`, return type, month/year, generated/filed/due date, status, return data/file path, totals, created by | `(company, return_type, period_month, period_year)` |
| ComplianceAlert | `hr_compliancealert` | Compliance alert | `company`, alert type, title/message, due date, priority, resolved fields | - |
| MinimumWageRate | `hr_minimumwagerate` | Minimum wage master | state, category, daily/monthly rate, effective dates, active | `(state, category, effective_from)` |
| LaborLawCompliance | `hr_laborlawcompliance` | Labor license/compliance | `company`, license numbers/expiry dates, compliance flags, audit dates | - |

### HR Documents, Banking, Medical, Training, Forms

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| BankVerification | `hr_bankverification` | Bank verification result | `employee` O2O, status, method, reference, verified date, response JSON | `employee` O2O |
| DigitalSignature | `hr_digitalsignature` | Digital signature config | `company` O2O, certificate path/password, issuer, validity, active | `company` O2O |
| SignedDocument | `hr_signeddocument` | Signed HR document | `company`, document type/path, signed path, hash, signed date | - |
| ESIMedicalBenefit | `hr_esimedicalbenefit` | ESI medical claim | `employee`, claim/treatment dates, hospital, claim/approved amount, claim number, status, docs/remarks/rejection, submitted/approved/payment dates | - |
| PerformanceReview | `hr_performancereview` | Performance review | `employee`, review number, reviewer, period, score fields, AI prediction, suggestions, strengths, improvement, goals, status | - |
| InductionTraining | `hr_inductiontraining` | Training module | `company`, training number, title/content/video/document, mandatory/order/duration, quiz settings, active | - |
| EmployeeInductionProgress | `hr_employeeinductionprogress` | Employee training progress | `employee`, `training_module`, start/completion, time spent, quiz fields, status | `(employee, training_module)` |
| ComplianceFormTemplate | `hr_complianceformtemplate` | Compliance form template | UUID PK, `company`, form type/name/file/type/structure, monthly generation settings, active | - |
| MonthlyComplianceForm | `hr_monthlycomplianceform` | Generated monthly form | UUID PK, `company`, `template`, month, status, employee count, generated/approved fields | `(company, template, month)` |
| EmployeeFormEntry | `hr_employeeformentry` | Employee row in monthly form | UUID PK, `monthly_form`, `employee`, fine fields, designation/department/joining/basic wage/address/termination/dynamic data | `(monthly_form, employee)` |
| FormGenerationSchedule | `hr_formgenerationschedule` | Scheduled form generation | UUID PK, `company`, `template`, scheduled date, executed fields, error | - |
| PortalCredentials | `hr_portalcredentials` | Government portal credentials | `company` O2O, EPFO/ESIC/IT/PT credentials/API keys, active | `company` O2O |
| SubmissionLog | `hr_submissionlog` | Government submission log | `company`, `government_return`, portal, method, acknowledgment, status, response/error, submitted/processed/by | - |
| ChallanGeneration | `hr_challangeneration` | Government challan | `company`, `government_return`, challan number/type, amount, due date, bank details, paid fields, file path | `challan_number` |

## Inventory Tables

### Master Data

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| Category | `inventory_category` | Product category tree | `company`, `name`, `code`, `description`, `parent_category -> Category`, AI attributes, demand pattern, active | `(company, code)` |
| Supplier | `inventory_supplier` | Supplier master | `company`, name/code, contact/email/phone/address, GST/PAN, performance/reliability/quality score, payment terms, credit limit, active, `created_by` | `(company, supplier_code)` |
| Warehouse | `inventory_warehouse` | Warehouse master | `company`, name/code, address/city/state/pincode, lat/lng, capacity fields, `manager -> Employee`, active | `(company, code)` |
| Product | `inventory_product` | Product master | `company`, `master_product -> MasterProduct`, name/product code/SKU, `category`, product type, description, variants, cost/selling/MRP, HSN/tax, tracking method, stock thresholds, reorder settings, weight/dimensions, demand/ABC, primary supplier, images, barcode, QR, active/discontinued, `created_by`, alternative suppliers M2M | `(company, product_code)`, `(company, sku)`, `barcode` unique nullable |
| ProductVariant | `inventory_productvariant` | Product variant | `product`, variant name/code, attributes, cost/selling price, SKU, barcode, image, active | `variant_code`, `sku`, `barcode`, `(product, variant_code)` |

### Stock

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| StockLevel | `inventory_stocklevel` | Current stock by product/warehouse | `product`, `warehouse`, available/reserved/on-order quantities, bin, batch, serial numbers, expiry date, updated by | `(product, warehouse)` |
| StockMovement | `inventory_stockmovement` | Stock in/out/adjustment/transfer history | `product`, `warehouse`, movement type, quantity, unit cost, reference, before/after qty, notes, batch/expiry, adjustment/damage reason, destination warehouse, `created_by` | - |
| StockAlert | `inventory_stockalert` | Low/expiry/AI stock alert | `company`, `product`, optional `warehouse`, alert type, priority, message, current stock, suggested action, resolved fields, AI flag/confidence | - |

### Purchase Orders

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| PurchaseOrder | `inventory_purchaseorder` | Supplier PO | `company`, `po_number`, `supplier`, `warehouse`, order/expected/actual delivery dates, status, subtotal/tax/total, notes, terms, created/approved by | `(company, po_number)` |
| PurchaseOrderItem | `inventory_purchaseorderitem` | PO line item | `purchase_order`, `product`, ordered/received qty, unit price, total price, notes | - |

### Bundle, Audit, Count

| Model | Table | Purpose | Main Fields / Relations | Unique Rules |
|---|---|---|---|---|
| ProductBundle | `inventory_productbundle` | Sellable kit/bundle | `company`, bundle name/code, description, bundle price, discount, image, active, `created_by` | `(company, bundle_code)` |
| ProductBundleItem | `inventory_productbundleitem` | Bundle line item | `bundle`, `product`, quantity, unit price override | `(bundle, product)` |
| InventoryAudit | `inventory_inventoryaudit` | Physical stock audit | `company`, audit name/number, `warehouse`, audit date, status, totals/discrepancies/value difference, `supervisor`, `created_by`, completed date, M2M categories/products/audit team | `(company, audit_number)` |
| InventoryAuditItem | `inventory_inventoryaudititem` | Product row in audit | `audit`, `product`, expected/actual/difference, unit/value difference, notes/reason, audited by/date | - |
| CycleCount | `inventory_cyclecount` | Scheduled partial stock count | `company`, count name/number, `warehouse`, frequency, next/last count date, ABC classes, status, counted/discrepancy/accuracy, categories M2M, `created_by`, completed date | `(company, count_number)` |
| CycleCountItem | `inventory_cyclecountitem` | Product row in cycle count | `cycle_count`, `product`, expected/counted/variance, counted flag, notes, counted by/date | - |

## Cross-Module Relationship Summary

- CRM `Account` and `Contact` can link to `common.MasterCustomer`.
- Inventory `Product` can link to `common.MasterProduct`.
- HR `Employee` is used inside Inventory for `Warehouse.manager`, `InventoryAudit.supervisor`, audit/count operators.
- CRM and Inventory use `CompanyServiceUser` for service-user-created records in newer flows.
- HR Attendance -> Payroll dependency:
  - `AttendancePolicy` defines payable rules.
  - `Attendance` rows feed `Payslip.working_days`, `present_days`, `absent_days`, `overtime_hours`.
  - Payroll approval can lock attendance changes when `lock_attendance_after_payroll` is enabled.
- HR Leave -> Attendance dependency:
  - Approved `LeaveApplication` blocks manual/mobile attendance for the same employee/date.
  - `Holiday`, `AttendancePolicy.weekly_off_days`, and `AttendanceDayOverride` decide whether a date is working or blocked.

## High-Risk Tables To Protect Before Sales Demo

- `hr_attendance`: unique `(employee, date)` must stay enforced.
- `hr_attendancepolicy`: payroll and leave calculation depends on this.
- `hr_payrollcycle` and `hr_payslip`: payroll status flow and attendance locks depend on these.
- `inventory_stocklevel` and `inventory_stockmovement`: stock accuracy depends on both being updated together.
- `crm_account`, `crm_contact`, `crm_opportunity`, `crm_deal`: lead conversion and pipeline consistency depend on these.
- `crm_marketingcampaign`, `crm_campaignmember`, `crm_emailsend`: campaign/audience/email run relationship depends on these.

