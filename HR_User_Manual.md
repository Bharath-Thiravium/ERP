# HR User Manual - End to End Testing Workflow

Indha manual HR module demo/test panna step by step guide. Fresh company/service user login pannitu indha order-la test pannunga.

## 1. Start Point

Login:
- Company Dashboard -> Services -> HR service open pannunga.
- HR service user login pannunga.
- First page: `Overview`.

Expected:
- Company logo/name show aaganum.
- Total Employees, New Hires, Onboarding, Departments count backend data-la irundhu varanum.
- Empty company-na 0 counts correct.

## 2. Settings / Organization Setup

Menu:
- `Settings` -> `Organization`

Create first:
- Department
- Designation

Check:
- Department code auto generate aaganum.
- Designation department-ku link aaganum.
- Edit work aaganum.
- Delete panna, employees linked irundha careful-a verify pannunga.

Note:
- General settings section-la HR email/contact UI irukku, but persistent save workflow innum build panna vendiyadhu.

## 3. Employees

Menu:
- `Employees`

Test:
- Add Employee.
- Required fields fill pannunga: name, email, phone, department, designation, joining date, salary.
- Statutory fields optional-a fill pannunga: PAN, Aadhaar, PF, UAN, ESI, bank details.
- Save.

Check:
- Employee list-la show aaganum.
- View modal-la full details varanum.
- Edit panna update aaganum.
- Employee code document numbering format-la varanum.
- Same email same company-la duplicate allow aaga koodadhu.
- Same email different company-la allow aaganum.

Mobile Access:
- Employee row/action-la mobile access enable pannunga.
- Password set pannunga.
- Credentials download check pannunga.

## 4. Attendance

Menu:
- `Attendance`

Test order:
- Attendance system config save.
- Manual Attendance Entry create.
- Attendance Records list check.
- Mobile/Face attendance demo check.
- Biometric device add pannunga if needed.

Check:
- Records page-la attendance show aaganum.
- Manual entry duplicate same employee/date reject aaganum.
- Approved leave date-la attendance mark panna block aaganum.
- Dashboard stats update aaganum.

## 5. Leave Management

Menu:
- `Leave Management`

Test order:
- Leave Types create: Annual Leave, Sick Leave.
- Leave Balances initialize/recalculate.
- Leave Application create.
- Approve / Reject / Cancel actions check.
- Leave Calendar-la holiday create.
- Reports tab-la filter/download view check.

Check:
- Approved leave attendance-la conflict avoid pannaum.
- Balance correct-a reduce aaganum.

## 6. Payroll

Menu:
- `Payroll`

Test order:
- Payroll Settings check.
- New Payroll Cycle create.
- Calculate Payroll.
- Payslips list check.
- Payslip PDF download check.
- Approve / Process Payment flow check if buttons available.

Check:
- Active employees include aaganum.
- Salary values correct-a calculate aaganum.
- PDF open aaganum.

## 7. Performance

Menu:
- `Performance`

Test:
- New Review create.
- Employee select pannunga.
- Ratings/comments fill pannunga.
- Save.
- Dashboard, Reviews, Analytics tabs check.

Check:
- Average rating update aaganum.
- Employee stats-la high performer/at risk count correct-a update aaganum.

## 8. Recruitment

Menu:
- `Recruitment`

Test order:
- Job Posting create.
- Job list-la show aaganum.
- View/Edit/Delete check.
- Public application flow test if exposed.
- Applications tab-la candidate status change.
- Interview schedule create.
- Offer create.
- Candidate pipeline update.
- Share analytics optional-a check.

Check:
- Job delete 500 error vara koodadhu.
- Applications count job-wise update aaganum.
- Interview and offer endpoints work aaganum.

## 9. Compliance

Menu:
- `Compliance`

Test order:
- Dashboard load.
- Run compliance checks.
- Monthly Forms -> Setup/Create common templates.
- Generate monthly forms.
- Employee form entries view.
- Approve form.
- PDF export.
- Advanced Reports tabs check.
- Automation and Integration tabs check.

Check:
- `form-templates`, `monthly-forms`, `employee-form-entries` endpoints 404 vara koodadhu.
- Generated PDF download aaganum.

## 10. Statutory

Menu:
- `Statutory`

Test:
- Statutory settings create/update.
- Dashboard check.
- Generate PF ECR.
- Generate ESI return.
- Generate PT return.
- Generate TDS 24Q.
- Government returns list/view/submit check.

Check:
- Frontend alias endpoints work aaganum:
  - `/api/hr/statutory/pf-ecr/`
  - `/api/hr/statutory/esi-return/`
  - `/api/hr/statutory/pt-return/`
  - `/api/hr/statutory/tds-24q/`

## 11. Government Portal

Menu:
- `Government Portal`

Test:
- Submission history load.
- Challans load.
- Generate challan.
- Submit/check status flow.

Check:
- Government API credentials configured illana proper error message varanum.
- Page crash/404 vara koodadhu.

## 12. Analytics

Menu:
- `Analytics`

Test:
- Overview, Attendance, Payroll, Performance tabs check.
- Charts render aaganum.
- Empty data-na blank/0 state clean-a irukkanum.

## 13. System Status

Menu:
- `System Status`

Use:
- Final checklist page-a use pannunga.
- Ithu "100% complete" claim panna koodadhu; workflow testing status-a mattum show pannum.

## Finish Point

Final confirmation:
- Employee create -> attendance -> leave -> payroll -> performance -> recruitment -> compliance/statutory -> analytics flow crash illama complete aaganum.
- Browser console/network-la 404/500 irukka check pannunga.
- Backend terminal-la unhandled error irukka check pannunga.

## Known Pending / Next Build Items

- HR General Settings email/contact/timezone save workflow persistent API innum full-a connect panna vendiyadhu.
- Some compliance/government APIs depend on real credential setup; credentials illa na meaningful error varanum.
- Department/designation delete policy employee linked irundha soft-delete/block flow decide panna vendiyadhu.
