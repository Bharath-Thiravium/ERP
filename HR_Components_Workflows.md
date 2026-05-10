# HR Module — Components & Workflows
**Project:** SAP-Python  
**Base URL:** `https://sap.athenas.co.in/api/hr/`  

## Architecture Overview

```
hr/
├── models.py                  — Core models (Employee, Department, etc.)
├── leave_models.py            — Leave management
├── payroll_views.py           — Payroll processing
├── attendance_views.py        — Attendance tracking
├── statutory_views.py         — Compliance (PF, ESI, TDS)
├── form_automation_views.py   — Monthly form generation
└── urls.py                    — API routing
```

## Core Components

### 1. Employee Management
| Sub-Component | Models | Key Features |
|---------------|--------|--------------|
| Org Structure | Department, Designation | Hierarchy, auto-code (DEPT001) |
| Employee Master | Employee | Statutory details (PAN, PF, ESI), skills JSON |
| Onboarding | Workflow models | Profile completion, document upload |

### 2. Leave Management
| Sub-Component | Models | Key Features |
|---------------|--------|--------------|
| Configuration | LeaveType | Carry-forward, approval rules |
| Balances | LeaveBalance | Auto-init/recalc, year-wise |
| Applications | LeaveApplication, Holiday | Calendar view (month-spanning), exports |

### 3. Attendance Management
| Sub-Component | Models | Key Features |
|---------------|--------|--------------|
| Records | AttendanceRecord | GPS/biometric, overtime calc |
| Devices | AttendanceDevice, Log | Sync support |

### 4. Payroll & Compliance
| Sub-Component | Models | Key Features |
|---------------|--------|--------------|
| Payroll | Payroll, Payslip | HRA/PF/ESI/TDS auto-calc |
| Statutory | PFRecord, ESIRecord | ECR/return generation |

### 5. Recruitment
| Sub-Component | Models | Key Features |
|---------------|--------|--------------|
| Jobs | JobPosting, Application | Public portal, AI screening |

## Detailed Workflows

### Employee Onboarding Workflow
```mermaid
flowchart TD
    A[Project Admin Creates Employee] --> B[Download Credential Slip]
    B --> C[Employee Login + Password Reset]
    C --> D[Profile Completion + Documents]
    D --> E[Induction Page Only]
    E --> F[Induction Complete]
    F --> G[Full HR Access]
```

### Leave Approval Workflow
```mermaid
sequenceDiagram
    participant E as Employee
    participant LA as LeaveApplication
    participant LB as LeaveBalance
    participant M as Manager
    E->>LA: Submit Application
    M->>LA: POST /approve/
    LA->>LB: get_or_create + used += days
    LB->>LB: Recalc closing_balance
    LA->>E: Approved
```

### Payroll Processing Workflow
```mermaid
flowchart LR
    A[Payroll Cycle Start] --> B[Calc Components<br>Basic + HRA + Allowances]
    B --> C[Deductions<br>PF/12% + ESI/0.75% + TDS]
    C --> D[Generate Payslip PDF]
    D --> E[Mark Paid]
    E --> F[Update Bank/Compliance]
```

### Monthly Compliance Forms
```mermaid
graph LR
    A[1st of Month Trigger<br>Celery Beat] --> B[Generate Forms:<br>Register of Fines/Workmen]
    B --> C[Auto-Populate:<br>Payroll/Employee Data]
    C --> D[HR Review/Approve]
    D --> E[PDF Generation + Audit]
```

## API Endpoints Summary

| Category | Key Endpoints |
|----------|---------------|
| Employee | GET/POST/PUT/DEL /employees/ |
| Leave | POST /leave-applications/{id}/approve/ |
| Payroll | POST /payroll/{id}/process/ |
| Attendance | POST /attendance/mobile/ (GPS) |
| Compliance | POST /statutory/generate-pf-ecr/ |

**Full blueprint**: See HR_Blueprint.md

## Integration Notes
- **Finance**: Payroll payments link to Payments.
- **Celery**: Monthly forms, ECR filing.
- **Security**: SQL/XSS validation on all inputs.

