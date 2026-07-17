# HR Module User Manual - Complete Tanglish Testing Guide

Indha manual HR module-ai fresh company-la setup pannuradhilirundhu employee payroll complete pannuradhu varaikkum end-to-end test panna use pannalam. Oru tester indha order-ai follow panna HR web dashboard, employee mobile app, attendance, leave, payroll, recruitment, statutory and compliance workflow ellam verify panna mudiyum.

## 1. Test-ku Munnaadi Ready Panna Vendiyadhu

Required:

- Approved company account.
- Company-ku HR service assigned and active-a irukkanum.
- HR service user login credentials.
- Company Dashboard-la company logo and basic details configured-a irukkanum.
- Backend and frontend running-a irukkanum.
- Browser DevTools `Network` and backend terminal open-a vachukkonga.
- Mobile app test-na employee-ku Mobile Access enable pannirukkanum.

Local URLs:

- Web frontend: `http://localhost:8004`
- Local backend: `http://127.0.0.1:8005`

Final check rules:

- Browser console-la unexpected error vara koodadhu.
- Network-la unexpected `400`, `404` or `500` vara koodadhu.
- Oru company data innoru company login-la vara koodadhu.
- Form success message vandha data refresh-ku appuramum persist aaganum.

## 2. Recommended Complete Test Order

Indha sequence-la test pannunga:

1. Settings
2. Employees
3. Attendance Settings
4. Leave Management
5. Attendance Entry and Records
6. Payroll
7. Recruitment
8. Performance
9. Statutory
10. Compliance
11. Government Portal
12. Analytics
13. System Status
14. Employee Mobile App

## 3. HR Overview

Menu: `HR -> Overview`

Check:

- Company name/logo correct-a varudha.
- Total employees, active employees, attendance and payroll summary correct-a varudha.
- Recent activity actual company records-ai mattum kattudha.
- Fresh company-na clean empty state or zero count varanum.
- Page automatic refresh aagumbodhu full page blink aaga koodadhu.

## 4. Settings - Organization Master Setup

Menu: `HR -> Settings`

Employee or job posting create panna munnaadi organization masters configure pannunga.

### 4.1 Department

1. Department name and code enter pannunga.
2. Required additional details fill pannunga.
3. Save pannunga.
4. List-la department varudha check pannunga.
5. Edit panni refresh-ku appuram updated value persist aagudha check pannunga.

### 4.2 Designation

1. Correct department select pannunga.
2. Designation name enter pannunga.
3. Minimum and maximum salary enter pannunga.
4. Save pannunga.

Expected:

- Designation selected department-kulla mattum irukkanum.
- Recruitment Job Posting-la designation select pannumbodhu configured min/max salary default-a fill aaganum.
- Employee form-la department select pannina adhu related designation mattum varanum.

Production note:

- Employee/job linked department or designation-ai hard delete panna koodadhu. Inactive/block validation varanum.

## 5. Employees

Menu: `HR -> Employees`

Tabs:

- Overview
- Employee List
- Mobile Access

### 5.1 Employee Create

`Add Employee` click panni sections-ai complete pannunga:

- Profile picture
- Personal information
- Address, state, district/city
- Department and designation
- Employment type, joining date and work mode
- Salary details
- PAN, Aadhaar, UAN, PF and ESI details where applicable
- Bank name, account number and IFSC
- Emergency contact

Validation check:

- Required field empty-na save aaga koodadhu.
- Email format valid-a irukkanum.
- Phone number valid length-la irukkanum.
- Joining date valid-a irukkanum.
- Same company-la duplicate employee email reject aaganum.
- Department-ku unrelated designation select panna mudiyak koodadhu.
- Bank/IFSC field validation meaningful-a irukkanum.

Expected after save:

- Company document numbering format-la employee ID generate aaganum.
- Employee list-la name, ID, department, email and phone varanum.
- Uploaded profile picture round avatar-la varanum.
- Avatar hover/view-la image clear-a varanum.
- Edit form open pannumbodhu existing profile picture and details preload aaganum.
- View modal-la complete details varanum.

### 5.2 Employee Edit and Delete

1. Employee edit icon click pannunga.
2. Oru non-critical field update panni save pannunga.
3. Refresh panni updated value check pannunga.

Delete test-ai production data-la panna vendam. Test employee use pannunga.

Expected delete behavior:

- Employee related attendance, leave, payroll, recruitment/interviewer references safe-a handle aaganum.
- Completed payroll audit history accidental cascade delete aaga koodadhu.
- Protected history irundha delete block/archive policy varanum.
- Delete success sonna employee list-la record disappear aaganum; server `500` vara koodadhu.

### 5.3 Mobile Access

1. `Employees -> Mobile Access` open pannunga.
2. Employee-ku mobile access enable pannunga.
3. Secure password set pannunga.
4. Credentials download pannunga.
5. Download file-la Employee ID correct-a irukka check pannunga.
6. Password reset flow test pannunga.

Security:

- Password plain text-a database/log-la store aaga koodadhu.
- Reset pannina old password work aaga koodadhu.
- Disabled employee mobile login panna mudiyak koodadhu.

## 6. Attendance System Settings

Menu: `HR -> Attendance -> Settings`

Oru company-ku exactly one primary attendance system select pannunga:

1. Manual Entry
2. Mobile App Location Based
3. Biometric Device

Save pannina selected system refresh and tab navigation-ku appuramum persist aaganum. `Change System` use pannina mattum vera method select panna mudiyanum.

### 6.1 Common Work Policy

Configure:

- Work start time
- Work end time
- Grace period
- Weekly off days
- Full-day minimum hours
- Half-day minimum hours
- Overtime starts after hours
- Paid holiday payable
- Paid leave payable
- Unpaid leave deductible
- Exclude weekly off from leave
- Exclude holidays from leave
- Lock attendance after payroll

Save panni page refresh pannunga. Ella values persist aaganum.

### 6.2 Manual Entry System

Expected:

- `Manual Entry` tab visible-a irukkanum.
- HR employee, date, check-in, check-out and status select panni attendance save pannalam.
- Mobile app attendance marking buttons hide/disable aaganum if company policy strictly manual-only.

### 6.3 Mobile App Location Based

Configure:

- Require office location
- Office latitude
- Office longitude
- Allowed radius in meters
- Require face photo if company needs it

Expected:

- Radius-kulla employee check-in/check-out panna mudiyanum.
- Radius veliya attendance reject aaganum.
- Face photo required-na photo illama mark panna mudiyak koodadhu.

### 6.4 Biometric Device

Configure registered device details and integration settings.

Expected:

- Attendance biometric import/device integration moolama varanum.
- Mobile app attendance button thevai illai; profile, leave and payslip access mattum irukkalam.

## 7. Leave Management

Menu: `HR -> Leave Management`

Correct order:

1. Leave Settings
2. Leave Balances
3. Leave Applications
4. Leave Calendar
5. Reports

### 7.1 Leave Settings

Create leave types such as:

- Casual Leave
- Sick Leave
- Earned Leave
- Loss of Pay

For each type configure:

- Name and unique code
- Category
- Days per year
- Carry forward allowed/not allowed
- Maximum carry forward
- Paid leave
- Requires approval
- Active status

Expected:

- Duplicate code same company-la reject aaganum.
- Inactive leave type new application-la varak koodadhu.

### 7.2 Initialize Leave Balances

1. Year select pannunga.
2. `Initialize Balances` click pannunga.
3. Employee-wise leave allocation varudha check pannunga.
4. Policy change pannina `Recalculate` use pannunga.

Expected:

- Employee and leave type-wise opening, used, pending and available balance correct-a irukkanum.
- Approved leave mattum used balance-ai reduce pannanum.
- Rejected/cancelled leave available balance-ai reduce panna koodadhu.

### 7.3 Leave Application

1. `New Application` click pannunga or mobile app-la apply pannunga.
2. Employee, leave type, from/to date and reason fill pannunga.
3. Submit pannunga.
4. HR dashboard notification varudha check pannunga.
5. Approve or reject pannunga.

Expected:

- Available balance vida adhigama apply panna block aaganum.
- Weekly off and holiday exclusion configured policy-padi days calculate aaganum.
- Overlapping application reject aaganum.
- Approved leave mobile app-la status update aaganum.
- Approved leave date-la attendance mark panna block aaganum.

### 7.4 Leave Calendar and Working Override

1. Holiday add pannunga.
2. Weekly off days calendar-la auto show aagudha check pannunga.
3. Company special-a work pannura Sunday/weekly-off-ku `Work` override select pannunga.

Expected:

- Normal weekly off/holiday-la attendance mark panna mudiyak koodadhu.
- Working override date-la mattum attendance allow aaganum.
- Holiday-ai weekly-off override-nu confuse panna koodadhu.
- Approved employee leave calendar-la show aaganum.

### 7.5 Leave Reports

- Employee, date, department, leave type and status filters check pannunga.
- Totals and CSV/export actual list-oda match aagudha verify pannunga.

## 8. Attendance Entry and Records

Menu: `HR -> Attendance`

### 8.1 Manual Entry Test

1. Attendance system `Manual Entry`-a irukka confirm pannunga.
2. Employee select pannunga.
3. Valid working date select pannunga.
4. Present/Late/Half Day/Absent/On Leave status test pannunga.
5. Required status-ku correct check-in/check-out enter pannunga.
6. Save pannunga.

Expected:

- Employee joining date-ku munnaadi attendance allow aaga koodadhu.
- Same employee + same date duplicate attendance allow aaga koodadhu.
- Already marked employee selected date dropdown-la hidden/disabled aagalam.
- Approved leave, holiday or weekly off date-la correct message varanum.
- Working override irundha attendance allow aaganum.
- Backend error-na single meaningful toast mattum varanum.

### 8.2 Records

- Start/end date filter test pannunga.
- Employee, department and status filter test pannunga.
- Check-in, check-out, hours, method and location correct-a varudha check pannunga.
- CSV export row count screen result-oda match aaganum.

### 8.3 Live Tracker

- Mobile attendance employees latest status varudha check pannunga.
- Company data mattum varanum.
- Stale/offline state meaningful-a show aaganum.

### 8.4 Payroll Lock

Payroll approved/completed aana period-la:

- Attendance create/edit/delete block aaganum.
- Clear message-la payroll cycle name show aaganum.
- Authorized correction venumna payroll reopen/reversal audit workflow use pannanum; direct database edit panna koodadhu.

## 9. Payroll

Menu: `HR -> Payroll`

Payroll-ku munnaadi confirm:

- Employee salary structure complete.
- Attendance period complete.
- Leave approvals complete.
- Weekly off/holiday policy correct.
- PF/ESI/PT/TDS settings required-na configured.

### 9.1 Create Payroll Cycle

1. `New Payroll Cycle` or `Create Cycle` click pannunga.
2. Cycle name, start date, end date and pay date enter pannunga.
3. Save pannunga.

Expected:

- Same company-la overlapping payroll cycle reject aaganum.
- Innoru company cycle inga vara koodadhu.

### 9.2 Calculate Payroll

1. Draft cycle-la `Calculate Payroll` click pannunga.
2. Employee count check pannunga.
3. `View Details` and `View Payslips` open pannunga.

Verify employee-wise:

- Working days
- Present/paid days
- Absent/unpaid days
- Paid leave
- Overtime
- Basic salary
- HRA and allowances
- PF
- ESI
- Professional Tax
- TDS
- Other deductions
- Gross and net salary

Formula check:

- Gross salary = earnings total.
- Net salary = gross salary - deductions.
- Paid days attendance, holiday, weekly off and approved leave policy-oda match aaganum.

### 9.3 Payslip

- View modal values calculation-oda match aaganum.
- PDF-la company logo/name, employee ID, period, earnings, deductions and net salary clear-a irukkanum.
- Currency and decimal formatting consistent-a irukkanum.
- PDF print-friendly-a single page or clean page breaks-oda irukkanum.

### 9.4 Approve and Process Payment

Correct lifecycle:

`Draft -> Calculated -> Approved -> Completed`

1. Calculation verify pannitu `Approve Payroll` click pannunga.
2. Approval-ku appuram attendance lock test pannunga.
3. Payment actually initiated/verified aana appuram `Process Payment` click pannunga.

Expected:

- Completed cycle final-a irukkanum.
- Completed payslip mobile app-la employee-ku varanum.
- Approval/payment action audit log-la user and time save aaganum.

## 10. Recruitment

Menu: `HR -> Recruitment`

Tabs:

- Overview
- Job Postings
- Applications
- Pipeline
- Interviews
- Analytics

### 10.1 Job Posting

1. `Post New Job` click pannunga.
2. Department and designation select pannunga.
3. Designation min/max salary auto-fill aagudha check pannunga.
4. Description, responsibilities, qualification, skills, employment type and closing date fill pannunga.
5. Active-a save pannunga.

Expected:

- Job card-la correct salary range and status varanum.
- View/edit work aaganum.
- Public share link correct active job-ai open pannanum.
- Public job page login illama open aaganum.
- Closed/inactive/deleted job apply allow panna koodadhu.

### 10.2 Candidate Public Application

1. Incognito browser-la shared job link open pannunga.
2. Candidate details fill pannunga.
3. Resume upload pannunga.
4. Submit pannunga.

Expected:

- Application HR `Applications` tab-la varanum.
- Job card application count update aaganum.
- Same job-ku same normalized email or phone duplicate application reject aaganum.
- Resume view/download correct candidate file-ai open pannanum.
- AI score irundha resume/job match data base panni varanum.

### 10.3 Application and Interview Workflow

Recommended pipeline:

`New Application -> Screening -> Shortlisted -> Interview Scheduled -> Interviewed -> Offer Sent -> Offer Accepted/Rejected`

1. Candidate review pannunga.
2. Shortlist/green action use pannunga.
3. Interview schedule pannunga.
4. Interviewer field-la same company active employee select pannunga.
5. Date, time, mode/location/link enter pannunga.
6. Interview feedback and rating save pannunga.

Expected:

- Pipeline stage immediately update aaganum.
- Interviewer-ku unrelated company employee vara koodadhu.
- Email configured-na candidate/interviewer notification poganum.
- Email service unavailable-na interview save aagalam; UI success + clear email warning show pannanum.

### 10.4 Offer and Candidate Onboarding

1. Interviewed candidate-ku offer create pannunga.
2. Salary, joining date, validity, benefits and terms fill pannunga.
3. Offer send pannunga.
4. Public offer link-la candidate accept/reject test pannunga.

Expected:

- Accepted candidate `Offer Accepted` pipeline-la varanum.
- Rejected candidate `Offer Rejected` pipeline-la varanum.
- Offer accepted notification HR/company admin-ku varanum.
- Notification click pannina candidate onboarding/employee creation flow open aaganum.
- `Create Employee Profile` click pannina candidate name, email, phone, department, designation, joining date and offered salary prefill aaganum.
- HR remaining statutory, bank and personal fields verify pannitu save pannanum.
- Employee created appuram same candidate-ku duplicate employee create panna koodadhu.

## 11. Performance

Menu: `HR -> Performance`

1. New review create pannunga.
2. Employee and review period select pannunga.
3. Ratings, goals, strengths, improvement and comments fill pannunga.
4. Draft/save/complete lifecycle test pannunga.

Expected:

- Completed review accidental-a editable aaga koodadhu or controlled reopen venum.
- Employee average score update aaganum.
- Department performance and trends correct-a aggregate aaganum.
- Innoru company employee/review inga vara koodadhu.

## 12. Statutory

Menu: `HR -> Statutory`

Tabs normally include dashboard, settings and government returns.

### 12.1 Statutory Settings

Only company registered schemes-ai enable pannunga.

PF enabled-na:

- PF establishment code required.
- Employee and employer rate configure pannunga.
- PF ceiling configure pannunga.

ESI enabled-na:

- ESI employer code required.
- Employee/employer rates and ceiling configure pannunga.

Professional Tax enabled-na:

- PT registration number required.
- Correct state select pannunga.
- Non-overlapping monthly salary slabs add pannunga.

TDS enabled-na:

- TAN number required.
- TDS related settings configure pannunga.

Important:

- Checkbox enable pannitu required registration field empty-a save panna validation varradhu correct behavior.
- Production-la dummy registration numbers use panna koodadhu.
- Disabled scheme payroll deduction zero-a irukkanum.
- Enabled and eligible employee-ku configured ceiling/rate base panni deduction varanum.

### 12.2 Payroll Integration Retest

Statutory setting change panna:

1. New draft payroll cycle use pannunga.
2. Payroll recalculate pannunga.
3. PF/ESI/PT/TDS payslip values compare pannunga.
4. Old approved/completed payslip historical values change aaga koodadhu.

### 12.3 Government Returns

Approved payroll base panni PF ECR, ESI, PT and TDS return generate pannunga.

Expected:

- Correct company and payroll period data mattum include aaganum.
- Duplicate period return policy enforce aaganum.
- Generated/submitted status audit trail maintain aaganum.

## 13. Compliance

Menu: `HR -> Compliance`

1. Compliance Review dashboard open pannunga.
2. `Run Compliance Check` click pannunga.
3. Employee statutory evidence, payroll and pending returns check pannunga.
4. Advanced reports open pannunga.
5. Monthly forms/templates applicable-na generate, review, approve and export pannunga.

Expected:

- Missing PF/ESI/PAN/UAN or overdue return clear alert-a varanum.
- Resolved evidence-ku alert status update aaganum.
- Compliance report company-scoped-a irukkanum.

## 14. Government Portal

Menu: `HR -> Government Portal`

1. Overview open pannunga.
2. Portal Integration open pannunga.
3. Generated return select pannunga.
4. Challan/submission/status workflow test pannunga.

Expected:

- Real portal/API credentials illana clear configuration error varanum.
- UI fake success show panna koodadhu.
- Submission reference, date, status and response audit-a save aaganum.
- Production submit panna munnaadi generated file manual verification mandatory.

## 15. Analytics

Menu: `HR -> Analytics`

Test tabs:

- Workforce
- Attendance
- Payroll
- Performance

Check:

- Date and department filters work aaganum.
- Chart totals source list/report totals-oda match aaganum.
- Empty data clean-a show aaganum.
- Different company data mix aaga koodadhu.

## 16. System Status

Menu: `HR -> System Status`

Use this as operational checklist only.

- Backend health
- Required configuration
- Employee/mobile readiness
- Attendance configuration
- Leave and payroll readiness
- Statutory/compliance readiness

`Complete` badge irukkaradhu mattum production certification illa. Manual workflow and security test pass aaganum.

## 17. Employee Mobile App Test

App folder: `EmployeeAttendanceApp`

Tabs:

- Home
- Attendance
- Leave
- Payslip
- Profile

### 17.1 Local USB Test

```bash
cd EmployeeAttendanceApp
adb devices
adb -s 10BD7J0NKT000P5 reverse tcp:8005 tcp:8005
adb -s 10BD7J0NKT000P5 reverse tcp:8081 tcp:8081
npm start
```

Another terminal:

```bash
cd EmployeeAttendanceApp
npm run android -- --device 10BD7J0NKT000P5
```

Current local API URL in `src/services/ApiService.ts` is:

```ts
const BASE_URL = 'http://127.0.0.1:8005/api';
```

Idhu USB `adb reverse` testing-ku mattum correct.

### 17.2 Mobile Workflow

1. Employee ID and HR set/reset panna password use panni login pannunga.
2. Home-la name, today status, leave balance and recent summary check pannunga.
3. Attendance company configured method-padi varudha check pannunga.
4. Location method-na GPS permission and radius validation check pannunga.
5. Face required-na camera permission/photo check pannunga.
6. Leave tab-la type/balance check panni application submit pannunga.
7. Web HR notification-la approve/reject pannunga.
8. Mobile refresh panni updated leave status and balance check pannunga.
9. Completed payroll payslip list/PDF check pannunga.
10. Profile details web employee record-oda match aagudha check pannunga.
11. Logout panni protected screens access block aagudha check pannunga.

## 18. Server Deploy Pannina App-ku APK Eppadi Build Pannuradhu

Important: APK-ai server-la run panna maattom. Django backend/Nginx server-la run aagum; APK phone-la install/distribute pannuvom.

### 18.1 Production Backend Ready Pannunga

Server-la:

- Git pull and dependencies install.
- `python manage.py migrate` run.
- Static/media and Nginx routes verify.
- Backend service restart.
- HTTPS domain ready pannunga, example: `https://erp.example.com`.
- Django `ALLOWED_HOSTS`-la domain add pannunga.
- Required CORS/CSRF trusted origins configure pannunga.
- `https://erp.example.com/api/hr/public/jobs/` reachable-a irukka smoke test pannunga.

### 18.2 Mobile API URL Change

Release build-ku munnaadi `EmployeeAttendanceApp/src/services/ApiService.ts`-la:

```ts
const BASE_URL = 'https://erp.example.com/api';
```

Rules:

- `localhost` or `127.0.0.1` production APK-la use panna koodadhu.
- Server public HTTPS domain use pannanum.
- Domain end-la duplicate `/api/api` vara koodadhu.
- Plain HTTP avoid pannunga; Android cleartext policy and security problem varum.

### 18.3 Current Signing Warning

Current `android/app/build.gradle` release build `debug.keystore` use pannudhu. Idhu internal test-ku okay; customer production release-ku okay illa. Production upload/release key configure pannitu dhaan final APK distribute pannanum.

### 18.4 One-time Production Keystore Create

Project outside or secure backup location-la run pannunga:

```bash
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore employee-attendance-upload-key.keystore \
  -alias employee-attendance \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Keystore and passwords:

- Git-la commit panna koodadhu.
- Password manager and encrypted backup-la save pannunga.
- Indha key lose aana same app-ku trusted update publish panna problem varum.

`~/.gradle/gradle.properties`-la secrets add pannunga:

```properties
EMPLOYEE_UPLOAD_STORE_FILE=/secure/path/employee-attendance-upload-key.keystore
EMPLOYEE_UPLOAD_KEY_ALIAS=employee-attendance
EMPLOYEE_UPLOAD_STORE_PASSWORD=your-store-password
EMPLOYEE_UPLOAD_KEY_PASSWORD=your-key-password
```

`EmployeeAttendanceApp/android/app/build.gradle`-la production signing config use pannunga:

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        storeFile file(EMPLOYEE_UPLOAD_STORE_FILE)
        storePassword EMPLOYEE_UPLOAD_STORE_PASSWORD
        keyAlias EMPLOYEE_UPLOAD_KEY_ALIAS
        keyPassword EMPLOYEE_UPLOAD_KEY_PASSWORD
    }
}

buildTypes {
    debug {
        signingConfig signingConfigs.debug
    }
    release {
        signingConfig signingConfigs.release
        minifyEnabled enableProguardInReleaseBuilds
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    }
}
```

### 18.5 Version Update

Every customer release/update-ku `android/app/build.gradle`-la increase pannunga:

```gradle
versionCode 2
versionName "1.1.0"
```

- `versionCode` every release-la strictly increase aaganum.
- `versionName` customer-visible version.

### 18.6 Signed APK Build

```bash
cd EmployeeAttendanceApp/android
./gradlew clean
./gradlew assembleRelease
```

APK output:

```text
EmployeeAttendanceApp/android/app/build/outputs/apk/release/app-release.apk
```

Direct phone install test:

```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

Release APK run panna Metro/npm server thevai illa.

### 18.7 Play Store AAB Build

Google Play publish panna APK badhila AAB use pannunga:

```bash
cd EmployeeAttendanceApp/android
./gradlew bundleRelease
```

Output:

```text
EmployeeAttendanceApp/android/app/build/outputs/bundle/release/app-release.aab
```

### 18.8 Final Release Checklist

- Production HTTPS API URL use aagudha.
- Debug key replace panni production signing key use aagudha.
- App version increase panniyacha.
- Fresh install and update install rendu test panniyacha.
- Login, attendance, leave, payslip and profile test pass aagudha.
- Location/camera permissions deny and allow states test panniyacha.
- Mobile data and Wi-Fi rendu network-la test panniyacha.
- Server unavailable-na app crash aagama clear retry message kattudha.
- APK/AAB checksum and release notes store panniyacha.
- Keystore secure backup irukka.

## 19. Multi-tenant Isolation Test

Sales-ku pogura project-na indha test mandatory:

1. Company A and Company B create pannunga.
2. Rendu company-kum HR service and separate HR users create pannunga.
3. Same email/name test employee optional-a rendu company-la create pannunga.
4. Company A login-la Company B employee, attendance, leave, payroll, candidate, statutory data varak koodadhu.
5. API URL-la innoru company record ID manually use pannalum `404/403` varanum.
6. Mobile employee Company A credentials Company B context/data access panna koodadhu.

## 20. Final End-to-End Sign-off

Indha single workflow full-a pass aana HR core flow ready:

```text
Settings
-> Department/Designation
-> Employee
-> Mobile Access
-> Attendance Policy
-> Leave Types/Balances
-> Attendance + Leave Approval
-> Payroll Calculate
-> Payslip Verify
-> Payroll Approve/Complete
-> Recruitment Public Apply
-> Interview/Offer
-> Offer Accept
-> Prefilled Employee Onboarding
-> Performance
-> Statutory Returns
-> Compliance/Government Portal
-> Analytics/System Status
-> Mobile App Final Test
```

Sign-off evidence save pannunga:

- Test company and tester name
- Test date
- Passed/failed step list
- Screenshot or screen recording
- Failed API request/response
- Backend error log
- APK version and server commit ID

Manual test complete aana appuram dhaan production deploy and customer demo sign-off pannunga.
