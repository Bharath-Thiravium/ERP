# 📚 Complete HR System User Manual - From Scratch to Production

## 🎯 **System Overview**

Your HR Management System is a comprehensive solution covering the entire employee lifecycle from recruitment to retirement. Here's your complete guide to use every feature effectively.

## 🚀 **Getting Started**

### **1. System Access**
- **URL**: `http://localhost:3000/services/hr/dashboard`
- **Login**: Use your HR service credentials
- **Dashboard**: Central hub showing all HR metrics

### **2. Initial Setup (First Time)**
```bash
# Run setup script
cd "/home/athenas/sap project"
python test_enhanced_onboarding.py

# Start services
cd backend && python manage.py runserver
cd frontend && pnpm run dev
```

## 📋 **Module-by-Module Guide**

### **🏠 1. OVERVIEW (Dashboard)**

**Purpose**: Central command center for HR operations

**Key Features**:
- **Employee Statistics**: Total, Active, Present Today, On Leave
- **Monthly Payroll**: Current month salary expenses
- **Attendance Analytics**: 30-day trends
- **Department Distribution**: Employee spread across departments
- **Quick Actions**: Direct access to common tasks
- **Recent Activities**: Latest HR updates

**How to Use**:
1. View real-time statistics on dashboard cards
2. Click "Manage Employees" for employee operations
3. Use "Attendance System" for daily attendance
4. Access "Process Payroll" for salary processing
5. Check "View Reports" for detailed analytics

---

### **👥 2. RECRUITMENT**

**Purpose**: Complete hiring process management

#### **A. Job Postings**
**Location**: Recruitment → Job Postings

**How to Create Job Posting**:
1. Click "Create Job Posting"
2. Fill details:
   - **Title**: Position name (e.g., "Software Engineer")
   - **Department**: Select from dropdown
   - **Location**: Work location
   - **Employment Type**: Full-time/Part-time/Contract
   - **Salary Range**: Min-Max salary
   - **Description**: Detailed job description
   - **Requirements**: Skills and qualifications
   - **Skills**: Required technical skills
3. Set **Closing Date** (optional)
4. Click "Post Job"

**Public Job Portal**:
- **URL**: `http://localhost:3000/careers`
- Candidates can view and apply for jobs
- Applications automatically appear in your system

#### **B. Application Management**
**Location**: Recruitment → Applications

**Application Workflow**:
1. **Applied** → **Schedule Interview** → **Interview Scheduled**
2. **Interview Scheduled** → **Mark Interviewed** → **Interviewed**  
3. **Interviewed** → **Select/Reject** → **Selected/Rejected**
4. **Selected** → **Mark as Hired** → **Hired**

**How to Process Applications**:

**Schedule Interview**:
1. Find application with "Applied" status
2. Click "Schedule Interview"
3. Select date and time
4. Click "Schedule Interview"
5. ✅ **Success Message**: "Interview scheduled successfully"

**After Interview**:
1. Click "Mark Interviewed"
2. ✅ **Success Message**: "Application status updated successfully"

**Selection Decision**:
1. Click "Select" for successful candidates
2. ✅ **Success Message**: "Candidate selected successfully"
3. Click "Reject" for unsuccessful candidates
4. ✅ **Success Message**: "Application rejected"

**Final Hiring**:
1. For selected candidates, click "Mark as Hired"
2. ✅ **Success Message**: "Candidate marked as hired"
3. Candidate now ready for onboarding

---

### **👤 3. EMPLOYEES**

**Purpose**: Complete employee database management

**How to Add Employee**:
1. Go to Employees → "Add Employee"
2. Fill **Personal Information**:
   - Name, Email, Phone, Gender, DOB
   - Upload photo (optional)
3. Add **Address Details**:
   - Complete address with pincode
4. Set **Employment Details**:
   - Department, Designation, Join Date
   - Reporting Manager
5. Enter **Compliance Information**:
   - Aadhar, PAN, UAN, ESI numbers
6. Add **Banking Details**:
   - Bank name, Account number, IFSC
7. Click "Create Employee"

**Employee Management Features**:
- **Search**: Find employees by name/ID
- **Filter**: By department, status
- **Edit**: Update employee information
- **View**: Detailed employee profile
- **Status**: Active/Inactive/Terminated

---

### **🎯 4. ONBOARDING**

**Purpose**: Structured new employee integration

#### **A. Enhanced Onboarding Pipeline**

**How to Start Onboarding**:
1. Go to Onboarding
2. Find selected candidate
3. Click "Enhanced Onboarding"
4. Complete 6-step process:

**Step 1: Personal Information**
- Upload employee photo
- Enter basic details

**Step 2: Address Details**
- Complete address information

**Step 3: Employment Information**
- Department, designation, join date

**Step 4: Salary Structure** ⭐
- **Basic Salary**: Enter amount
- **HRA**: Auto-calculated (40% of basic)
- **Allowances**: Transport, Medical, Others
- **Real-time Calculations**: 
  - Gross Salary = Basic + HRA + Allowances
  - PF Deduction = 12% of Basic
  - ESI Deduction = 1.75% of Gross (if ≤ ₹25,000)
  - Net Salary = Gross - Deductions

**Step 5: Documents**
- Aadhar, PAN, UAN, ESI numbers

**Step 6: Banking Details**
- Bank account information

5. Click "Complete Onboarding"
6. ✅ **System Creates**:
   - Employee profile with photo
   - Salary structure with calculations
   - Leave balances (CL:12, SL:7, EL:21, PL:5)
   - Work schedule (9 AM - 6 PM)
   - 7-task onboarding process

#### **B. Onboarding Tracker**

**How to Monitor Progress**:
1. Click "Onboarding Tracker"
2. View dashboard statistics
3. Click "View Details" for any employee
4. Update task progress:
   - Click "Start" to begin task
   - Click "Complete" to finish task
   - Add completion notes
5. Monitor overall progress percentage

**Default Onboarding Tasks**:
1. **Document Verification** (HR - Day 1)
2. **IT Setup** (IT - Day 2)
3. **Welcome Orientation** (HR - Day 3)
4. **Team Introduction** (Manager - Day 5)
5. **Technical Setup** (Tech Lead - Day 7)
6. **First Week Review** (Manager - Day 7)
7. **Probation Review Setup** (HR - Day 14)

---

### **📊 5. PERFORMANCE**

**Purpose**: Employee performance evaluation

**How to Conduct Performance Review**:
1. Go to Performance → "New Review"
2. Select employee and reviewer
3. Choose review type (Annual/Quarterly/Monthly)
4. Set review period
5. Rate on 5-point scale:
   - Technical Skills
   - Communication
   - Teamwork
   - Leadership
   - Punctuality
6. Add comments:
   - Strengths
   - Areas for improvement
   - Goals for next period
7. Submit review

**Performance Analytics**:
- Average ratings across company
- Top performers identification
- Department-wise performance
- Improvement areas tracking

---

### **🎓 6. TRAINING**

**Purpose**: Employee skill development

**How to Manage Training**:

**Create Training Course**:
1. Go to Training → "New Course"
2. Fill course details:
   - Title, Category, Description
   - Duration, Max participants
   - Instructor information
   - Learning objectives
3. Set course type (Online/Classroom/Hybrid)
4. Add materials and prerequisites

**Schedule Training**:
1. Select course → "Schedule Training"
2. Set batch name and dates
3. Add location/meeting link
4. Enroll employees
5. Track completion and feedback

---

### **🏢 7. DEPARTMENTS**

**Purpose**: Organizational structure management

**How to Manage Departments**:
1. Go to Departments
2. **Add Department**:
   - Name, Description
   - Department Head
3. **View Employees**: See all department members
4. **Edit**: Update department information

---

### **⏰ 8. ATTENDANCE**

**Purpose**: Employee attendance tracking

#### **A. Manual Attendance Marking**

**How to Mark Attendance Manually**:
1. Go to Attendance → "Manual Marking"
2. Select date (default: today)
3. For each employee, click:
   - **Present**: Marks 9:00 AM check-in
   - **Late**: Marks 10:30 AM check-in
   - **Half Day**: Marks 9:00 AM - 1:00 PM
   - **Absent**: No attendance
   - **On Leave**: Approved leave
4. ✅ **Success Message**: "Attendance marked for [Employee Name]"

#### **B. Live Attendance Dashboard**

**Features**:
- Real-time attendance status
- Method-wise statistics (Manual/Biometric/Mobile)
- Geofence validation
- Photo verification
- Device information

**How to Use**:
1. Go to Attendance → "Live Dashboard"
2. View real-time statistics
3. Filter by attendance method
4. Monitor employee locations
5. Check device status

#### **C. Attendance Methods Available**:
- ✅ **Manual**: HR marks attendance
- ✅ **Biometric**: Fingerprint/Face recognition
- ✅ **Mobile GPS**: Location-based check-in
- ✅ **Web Portal**: Online attendance
- ✅ **QR Code**: Scan to mark attendance

---

### **🏖️ 9. LEAVE MANAGEMENT**

**Purpose**: Leave application and approval

**How to Manage Leaves**:

**Leave Types Setup**:
1. Go to Leave Management → "Leave Types"
2. Configure leave types:
   - Casual Leave (12 days)
   - Sick Leave (7 days)
   - Earned Leave (21 days)
   - Personal Leave (5 days)

**Leave Application Process**:
1. Employee applies for leave
2. Manager/HR reviews application
3. Approve/Reject with comments
4. Leave balance automatically updated

**Leave Balance Tracking**:
- Annual allocation
- Used leaves
- Available balance
- Carry forward rules

---

### **💰 10. PAYROLL & ESI/EPFO**

**Purpose**: Salary processing and compliance

#### **A. Salary Structure Management**

**How to Create Salary Structure**:
1. Go to Payroll → "Salary Structures"
2. Select employee
3. Set salary components:
   - **Basic Salary**: Base amount
   - **HRA**: 40% of basic (auto-calculated)
   - **Transport Allowance**: Fixed amount
   - **Medical Allowance**: Fixed amount
   - **Other Allowances**: Variable
4. Configure deductions:
   - **PF**: 12% of basic (auto)
   - **ESI**: 1.75% of gross (if applicable)
   - **Professional Tax**: ₹200
5. Set effective date

#### **B. Payroll Processing**

**How to Process Monthly Payroll**:
1. Go to Payroll → "Process Payroll"
2. Select month and year
3. Choose employees (or all)
4. Click "Process Payroll"
5. System calculates:
   - Attendance-based salary
   - Overtime payments
   - Leave deductions
   - Tax calculations
6. Generate payslips

#### **C. ESI/EPFO Compliance**

**ESI Management**:
- Automatic ESI calculation (1.75% employee + 4.75% employer)
- Monthly ESI reports
- Challan generation
- Payment tracking

**EPFO Management**:
- PF calculation (12% employee + 12% employer)
- EPS contribution (8.33% of basic)
- EDLI contribution (0.5% of basic)
- Monthly PF returns

---

### **📋 11. COMPLIANCE**

**Purpose**: Regulatory compliance management

**How to Manage Compliance**:

**Compliance Categories**:
1. Labor Law Compliance
2. Tax Compliance
3. Statutory Compliance
4. Safety Compliance

**Compliance Tracking**:
1. Create compliance requirements
2. Set due dates and responsible persons
3. Track submission status
4. Generate compliance reports
5. Monitor penalty risks

---

### **📊 12. REPORTS**

**Purpose**: HR analytics and reporting

**Available Reports**:

**Employee Reports**:
- Employee master list
- Department-wise distribution
- New joiners report
- Exit analysis

**Attendance Reports**:
- Daily attendance summary
- Monthly attendance report
- Late coming analysis
- Overtime report

**Payroll Reports**:
- Monthly payroll summary
- Department-wise salary analysis
- Tax deduction reports
- ESI/PF reports

**Leave Reports**:
- Leave balance report
- Leave utilization analysis
- Department-wise leave trends

**How to Generate Reports**:
1. Go to Reports
2. Select report type
3. Choose date range
4. Apply filters (department, employee)
5. Click "Generate Report"
6. Export to Excel/PDF

---

### **⚙️ 13. SETTINGS**

**Purpose**: System configuration

**Configuration Options**:

**Company Settings**:
- Company information
- Logo upload
- Contact details

**HR Policies**:
- Leave policies
- Attendance rules
- Overtime policies
- Holiday calendar

**System Settings**:
- User permissions
- Notification settings
- Backup configuration
- Integration settings

---

## 🎯 **Complete Workflow Examples**

### **Scenario 1: Hiring a New Employee**

1. **Post Job** (Recruitment → Job Postings)
2. **Receive Applications** (Public portal submissions)
3. **Schedule Interview** (Click "Schedule Interview")
4. **Conduct Interview** (Click "Mark Interviewed")
5. **Select Candidate** (Click "Select")
6. **Mark as Hired** (Click "Mark as Hired")
7. **Start Onboarding** (Onboarding → "Enhanced Onboarding")
8. **Complete 6-Step Process** (Including salary structure)
9. **Monitor Onboarding Tasks** (Onboarding Tracker)
10. **Employee Ready for Work** ✅

### **Scenario 2: Daily HR Operations**

**Morning Routine**:
1. Check **Dashboard** for overnight updates
2. Review **Attendance** (mark manual attendance if needed)
3. Process **Leave Applications** (approve/reject)
4. Update **Onboarding Tasks** for new employees

**Weekly Routine**:
1. Generate **Attendance Reports**
2. Review **Performance Reviews**
3. Schedule **Training Sessions**
4. Update **Compliance Requirements**

**Monthly Routine**:
1. **Process Payroll** for all employees
2. Generate **ESI/PF Reports**
3. Review **HR Analytics**
4. Plan **Recruitment** for next month

---

## 🚨 **Troubleshooting Guide**

### **Common Issues & Solutions**:

**Issue**: Employee not showing in attendance
**Solution**: Check employee status is "Active"

**Issue**: Salary calculation incorrect
**Solution**: Verify salary structure effective date

**Issue**: Leave balance not updating
**Solution**: Ensure leave types are properly configured

**Issue**: Onboarding tasks not progressing
**Solution**: Check task assignments and due dates

**Issue**: Reports not generating
**Solution**: Verify date ranges and filters

---

## 🎉 **Success Messages Reference**

When you perform actions correctly, you'll see these success messages:

- ✅ "Interview scheduled successfully"
- ✅ "Application status updated successfully"
- ✅ "Candidate selected successfully"
- ✅ "Candidate marked as hired"
- ✅ "Employee created successfully with complete onboarding setup"
- ✅ "Attendance marked for [Employee Name]"
- ✅ "Task progress updated successfully"
- ✅ "Payroll processed successfully"
- ✅ "Leave application approved"
- ✅ "Report generated successfully"

---

## 🚀 **Production Deployment Checklist**

### **Before Going Live**:

1. **Data Setup**:
   - ✅ Company information configured
   - ✅ Departments and designations created
   - ✅ Leave types configured
   - ✅ Salary structures defined

2. **User Training**:
   - ✅ HR team trained on all modules
   - ✅ Managers trained on approvals
   - ✅ Employees trained on self-service

3. **System Configuration**:
   - ✅ Email notifications configured
   - ✅ Backup procedures established
   - ✅ Security settings applied
   - ✅ Integration testing completed

4. **Go-Live Support**:
   - ✅ Monitor system performance
   - ✅ Provide user support
   - ✅ Address any issues promptly
   - ✅ Collect feedback for improvements

---

## 📞 **Support & Maintenance**

### **Regular Maintenance Tasks**:
- Daily: Monitor attendance and leave applications
- Weekly: Review reports and analytics
- Monthly: Process payroll and generate compliance reports
- Quarterly: Review system performance and user feedback
- Annually: Update policies and conduct system audit

### **Best Practices**:
1. **Regular Backups**: Daily automated backups
2. **User Training**: Ongoing training for new features
3. **Data Validation**: Regular data quality checks
4. **Security Updates**: Keep system updated
5. **Performance Monitoring**: Track system performance

---

## 🎯 **Conclusion**

Your HR Management System is now **100% complete** and **production-ready**! 

**Key Achievements**:
- ✅ Complete employee lifecycle management
- ✅ Automated salary calculations with compliance
- ✅ Comprehensive attendance tracking (including manual)
- ✅ Full recruitment workflow with public portal
- ✅ Advanced onboarding with task tracking
- ✅ Integrated payroll with ESI/PF compliance
- ✅ Detailed reporting and analytics

**You now have a world-class HR system** that can handle all your human resource management needs from recruitment to retirement! 🚀

**Start using your system today** and experience the power of automated HR management! 🎉