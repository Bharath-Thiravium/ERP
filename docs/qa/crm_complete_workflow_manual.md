# CRM Complete Workflow Manual

Date: 2026-07-08

Use this file to manually test the CRM module end to end before demo or production push.

## 1. Pre-Check

1. Backend run:
   ```bash
   cd backend
   python manage.py migrate
   python manage.py runserver 8005
   ```
2. Frontend run:
   ```bash
   cd frontend
   pnpm run dev
   ```
3. Login as company service user.
4. Open CRM module.
5. Confirm sidebar menus visible:
   - Overview
   - Leads
   - Opportunities
   - Sales Pipeline
   - Quotes
   - AI Lead Scoring
   - Accounts
   - Contacts
   - Customer Analytics
   - Customer Support
   - Campaigns
   - Marketing Automation
   - Activities
   - Advanced Reporting
   - Integrations
   - Security & Compliance
   - Settings

Expected: Page should load without blank screen, console error, or 400/500 API error.

## 2. Recommended Testing Order

Follow this order. CRM data flows from lead to account/contact/opportunity, then to pipeline, quotes, activities, campaign, and reporting.

1. Leads
2. Accounts
3. Contacts
4. Opportunities
5. Sales Pipeline
6. Quotes
7. Activities
8. Customer Analytics
9. AI Lead Scoring
10. Campaigns
11. Marketing Automation
12. Advanced Reporting
13. Customer Support
14. Integrations
15. Security & Compliance
16. Settings
17. Overview dashboard final check

## 3. Leads Workflow

### Create Lead

1. Go to CRM -> Leads.
2. Click Add Lead.
3. Fill:
   - First Name
   - Last Name
   - Email
   - Phone
   - Company Name
   - Job Title
   - Status: New
   - Priority
   - Source
   - Estimated Value
   - Expected Close Date
4. Save.

Expected:
- Lead card should show created date.
- Lead status should show New.
- View button should open proper modal, not browser alert.
- Edit should update lead.

### Convert Lead

1. Click Convert on a lead.
2. Confirm conversion.

Expected:
- Lead becomes Converted.
- Converted lead should not be editable as normal active lead.
- Account should be created.
- Contact should be created.
- Opportunity should be created.
- Sales Pipeline should show linked deal/opportunity.

Important:
- Lead status and Opportunity stage are not the same.
- Lead status = lead lifecycle.
- Opportunity stage = sales deal pipeline stage.

## 4. Accounts Workflow

1. Go to CRM -> Accounts.
2. Confirm converted lead account is visible.
3. Create one manual account.
4. View account.
5. Edit account.
6. Search account.

Expected:
- Account list should load.
- Converted lead account should not duplicate if same conversion is repeated.
- Account name, type, email/phone should display correctly.

## 5. Contacts Workflow

1. Go to CRM -> Contacts.
2. Confirm converted lead contact is visible.
3. Create one manual contact.
4. View contact.
5. Edit contact.
6. Search contact.

Expected:
- Contact list should load.
- Contact should show full name, email, phone.
- Contact should be usable in opportunity/quote forms.

## 6. Opportunities Workflow

1. Go to CRM -> Opportunities.
2. Confirm converted lead opportunity is visible.
3. Create one manual opportunity.
4. Fill:
   - Name
   - Account
   - Contact
   - Amount
   - Stage
   - Probability
   - Expected Close Date
5. Save.
6. Open View modal.
7. Edit stage.

Expected:
- Opportunity view modal should open.
- Stage changes should sync to Sales Pipeline.
- Closed Won / Closed Lost should set closed date.

## 7. Sales Pipeline Workflow

### Pipeline from Lead Conversion

1. Go to CRM -> Sales Pipeline.
2. Check converted lead opportunity.

Expected:
- Deal should appear in correct stage.
- Stage totals and pipeline value should update.

### Direct Deal

1. Click New Deal.
2. Add deal details.
3. Save.

Expected:
- Direct deal should also create/link opportunity.
- Deal should appear in Opportunity list.
- Moving deal stage should sync opportunity stage.

### Quota

1. Click Set Quota.
2. Add quota.
3. Save.

Expected:
- Quota should save.
- Performance tab should reflect quota data if available.

## 8. Quotes Workflow

1. Go to CRM -> Quotes.
2. Click Add Quote.
3. Select Account and Contact.
4. Add title.
5. Add item, quantity, unit price.
6. Check GST/tax fields.
7. Save.
8. Download PDF.

Expected:
- Quote number should follow CRM numbering setup.
- PDF should show company name/logo where configured.
- PDF layout should be modern and printable.
- GST/tax totals should be correct.
- Quote should show in list.

## 9. Activities Workflow

1. Go to CRM -> Activities.
2. Add activity linked to lead/contact/account/opportunity.
3. Create Planned activity.
4. Move to In Progress.
5. Complete activity.
6. Try editing completed activity.

Expected:
- Activity should be created with date.
- Completed activity should not be casually changed back.
- Duplicate activity ID error should not happen.
- Activity page should not show JSX/blank page errors.

## 10. Customer Analytics Workflow

1. Go to CRM -> Customer Analytics.
2. Click Calculate Scores.
3. Check health score cards.
4. Click Log Interaction.
5. Add interaction for account/contact.
6. Create New Segment.
7. Add account to segment.
8. View segment details.

Expected:
- Account count should be correct.
- Health score should update.
- Recent interaction should show.
- Segment details should show account names, not only count.

## 11. AI Lead Scoring Workflow

1. Go to CRM -> AI Lead Scoring.
2. Check dashboard scores.
3. Run/calculate score if button available.
4. Open lead score detail.

Expected:
- Lead scoring page should load.
- Scores should map to actual leads.
- No empty broken charts.

## 12. Campaigns Workflow

Campaign means marketing plan and audience tracking.

Example:
`July Billing Software Promotion`

### Create Campaign

1. Go to CRM -> Campaigns.
2. Click Add Campaign.
3. Fill:
   - Campaign Name
   - Campaign Type
   - Status
   - Budget
   - Start Date
   - End Date
   - Target Audience
   - Description
4. Save.

Expected:
- Campaign card should appear.
- Card should show budget/date/status.
- Audience count initially can be 0.

### Add Audience

1. Click Add Audience icon.
2. Select Leads and Contacts.
3. Save.

Expected:
- Audience count updates.
- Duplicate audience should not be added twice.
- View modal should show lead/contact names and emails.

Important:
- Audience count = target recipients.
- Leads Generated = new leads generated from the campaign. It can stay 0 until tracking is connected.

## 13. Marketing Automation Workflow

Marketing Automation executes email runs using Campaigns menu audience.

### Create Template

1. Go to CRM -> Marketing Automation.
2. Click New Template.
3. Fill:
   - Template Name
   - Template Type
   - Subject
   - HTML Content
   - Text Content
4. Save.

Expected:
- Template appears in Templates tab.
- Preview should open.

### Create Email Run

1. Click Create Email Run.
2. Select Campaign created in Campaigns menu.
3. Select Email Template.
4. Select Email Run Type.
5. Keep Status as Draft.
6. Save.

Expected:
- Email Run card appears.
- Card should show source campaign code.
- Audience count should match Campaign audience count.

### Launch Email Run

1. Click Launch on email run.

Expected:
- Status becomes Running.
- Emails Sent count updates.
- Sent count should use unique email addresses only.
- If 2 audience members have same email, Sent can be 1. This is correct duplicate prevention.

Important:
- Current system creates email send records and metrics.
- Real SMTP/email provider sending is not enabled unless configured later.
- Demo explanation: "System prepares and tracks campaign email run recipients."

## 14. Advanced Reporting Workflow

1. Go to CRM -> Advanced Reporting.
2. Create new report.
3. Select one of these chart types:
   - Modern Bar
   - Trend Line
   - Area Trend
   - Donut Share
   - Sales Funnel
4. Save.
5. Click Generate.
6. Click Generate Insights.

Expected:
- Generated report should open in modal.
- Chart should look modern.
- Generate Insights should not throw Decimal JSON serialization error.

## 15. Customer Support Workflow

1. Go to CRM -> Customer Support.
2. Create ticket category if needed.
3. Create ticket.
4. Assign priority/status.
5. Update ticket status.

Expected:
- Ticket should save.
- Status/priority should update.
- Related customer/contact should show if selected.

## 16. Integrations Workflow

1. Go to CRM -> Integrations.
2. Check integrations list.
3. Open integration logs.

Expected:
- Page should load without errors.
- Logs should not expose secrets.
- Integration credentials should not show raw sensitive values.

## 17. Security & Compliance Workflow

1. Go to CRM -> Security & Compliance.
2. Check audit logs.
3. Check alerts/violations if available.

Expected:
- Tenant data should only show current company records.
- No cross-company CRM data should appear.

## 18. Settings Workflow

1. Go to CRM -> Settings.
2. Check configurable items.
3. Save a harmless setting if available.

Expected:
- Settings should save.
- No unrelated company/service data should change.

## 19. Overview Dashboard Final Check

1. Go to CRM -> Overview.
2. Check summary cards.
3. Confirm numbers after all test data:
   - Leads
   - Opportunities
   - Accounts
   - Contacts
   - Pipeline value
   - Activities

Expected:
- Dashboard numbers should be consistent with data created.
- No blank widgets.
- No console errors.

## 20. Data Sharing Check

If company has CRM + Finance enabled:

1. Create CRM account/contact.
2. Check Finance customers.

Expected:
- Shared customer should appear based on Data Sharing settings.

If company has Finance customer created:

1. Create customer in Finance.
2. Check CRM accounts/contacts.

Expected:
- Finance customer should appear in CRM Account/Contact as configured.

## 21. Document Numbering Check

1. Configure numbering from Company -> Document Numbering.
2. Select CRM service only.
3. Set prefix/year/padding/start number.
4. Create CRM records:
   - Lead
   - Account
   - Contact
   - Opportunity
   - Activity
   - Campaign
   - Quote

Expected:
- CRM records should follow selected numbering format.
- Delete should not reset numbering.
- New record should continue from next number.

## 22. Delete / Approval Check

Where delete is enabled:

1. Try deleting important CRM data.
2. Confirm delete reason prompt appears if configured.
3. Check company dashboard approval/notification if delete approval flow applies.

Expected:
- Important linked data should not silently disappear.
- Admin approval flow should control shared/important delete actions.

## 23. Demo Script

Use this short script for customer demo:

1. "First we create a lead."
2. "Then we convert the lead into Account, Contact, Opportunity."
3. "Opportunity automatically appears in Sales Pipeline."
4. "We can move deal stages and track pipeline value."
5. "We create quote and download branded PDF."
6. "Activities track calls, meetings, and follow-ups."
7. "Customer Analytics gives health score and interactions."
8. "Campaigns define marketing plan and target audience."
9. "Marketing Automation selects that campaign audience and template to launch an email run."
10. "Reports generate charts and insights."

## 24. Known Notes

1. Marketing Automation email launch currently creates send records and metrics. Real SMTP/provider sending needs separate mail integration.
2. Campaign Leads Generated is not the same as Audience count.
3. Audience count can be 2 while Sent count is 1 if duplicate email addresses exist.
4. Workflow automation trigger engine should be tested separately before selling as fully automatic.

## 25. Final Pass Checklist

- [ ] Login works.
- [ ] CRM sidebar opens.
- [ ] Lead create works.
- [ ] Lead convert works.
- [ ] Account appears.
- [ ] Contact appears.
- [ ] Opportunity appears.
- [ ] Sales Pipeline sync works.
- [ ] Quote create works.
- [ ] Quote PDF downloads.
- [ ] Activity create/complete works.
- [ ] Customer Analytics works.
- [ ] AI Lead Scoring loads.
- [ ] Campaign create works.
- [ ] Campaign audience add works.
- [ ] Marketing template create works.
- [ ] Email run creates from campaign.
- [ ] Launch updates sent count.
- [ ] Advanced report generates.
- [ ] Customer support loads.
- [ ] Integrations load.
- [ ] Security & Compliance loads.
- [ ] Overview dashboard numbers look correct.
- [ ] Browser console has no critical errors.
- [ ] Backend terminal has no 400/500 errors during test.
