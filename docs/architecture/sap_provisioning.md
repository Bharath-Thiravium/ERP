# SAP Provisioning and Onboarding System

## Company Provisioning Pipeline

The SAP system implements a comprehensive multi-stage provisioning process that sets up new companies with all necessary services, users, and configurations.

### Provisioning Stages Overview

```
Master Admin Creates Company
    ↓
Company Approval Process
    ↓
Service Assignment
    ↓
Auto-Code Configuration
    ↓
Company User Creation
    ↓
Service User Provisioning
    ↓
Default Data Seeding
    ↓
Company Dashboard Setup
    ↓
Ready for Business Operations
```

## Stage 1: Company Creation

### Master Admin Company Creation

**Endpoint**: `POST /api/auth/companies/`
**File**: `backend/authentication/views.py`
**Model**: `authentication.models.Company`

**Required Information**:
```python
# Basic company information
name = "Company Name"
company_prefix = "COMP"  # Unique 2-10 char prefix
email = "admin@company.com"
phone = "+1234567890"
address = "Company Address"
```

**Automatic Fields Set**:
```python
created_by = request.user  # Master Admin
created_at = timezone.now()
approval_status = 'pending'  # Default status
detailed_info_submitted = False
```

**Company Prefix Validation**:
- Must be unique across all companies
- 2-10 characters, alphanumeric
- Used for document numbering and user IDs

### Company Model Fields

**Basic Information** (Set by Master Admin):
- `name`, `company_prefix`, `email`, `phone`, `address`
- `created_by`, `created_at`, `approval_status`

**Detailed Information** (Filled later by Company User):
- `business_type`, `industry`, `employee_count`, `annual_revenue`
- `website`, `tax_id`, `pan_number`, `gst_number`
- `contact_person_name`, `contact_person_title`
- `description`, `special_requirements`
- `logo`, `domain_name`

## Stage 2: Company Approval Process

### Approval Workflow

**Status Transitions**:
```python
APPROVAL_STATUS_CHOICES = [
    ('pending', 'Pending'),      # Initial status
    ('approved', 'Approved'),    # Ready for service assignment
    ('rejected', 'Rejected'),    # Rejected with reason
    ('suspended', 'Suspended'),  # Temporarily disabled
]
```

**Approval Process**:
1. Master Admin reviews company application
2. Sets `approval_status = 'approved'`
3. Sets `approved_by` and `approved_at` fields
4. Triggers automatic service assignment

**File Location**: `backend/authentication/models.py` - Company model

## Stage 3: Service Assignment

### Available Services

**Service Types** (`authentication.models.Service`):
```python
SERVICE_TYPES = [
    ('finance', 'Finance Management'),
    ('hr', 'Human Resources'),
    ('inventory', 'Inventory Management'),
    ('orders', 'Order Management'),
    ('analytics', 'Analytics & Reporting'),
    ('crm', 'Customer Relationship Management'),
    ('procurement', 'Procurement'),
    ('manufacturing', 'Manufacturing'),
    ('quality', 'Quality Management'),
    ('maintenance', 'Maintenance'),
]
```

### Service Assignment Process

**Model**: `authentication.models.CompanyService`
**Endpoint**: `POST /api/auth/company-services/`

**Assignment Fields**:
```python
company = models.ForeignKey(Company)
service = models.ForeignKey(Service)
assigned_by = models.ForeignKey(User)  # Master Admin
assigned_at = models.DateTimeField(auto_now_add=True)
is_active = models.BooleanField(default=True)

# Service-specific credentials
service_password = models.CharField(max_length=128)  # Hashed
password_changed_at = models.DateTimeField(auto_now_add=True)
password_expires_at = models.DateTimeField()
```

**Automatic Service Setup**:
- Generate service-specific password
- Set password expiration (90 days default)
- Create service configuration entries
- Initialize service-specific settings

## Stage 4: Auto-Code Configuration Setup

### Company Auto-Code Settings Creation

**File**: `backend/authentication/models.py` - `CompanyAutoCodeSettings`
**Trigger**: Automatic on company approval

**Default Code Types Created**:
```python
DEFAULT_CODE_TYPES = [
    ('employee', 'Employee ID', 'EMP', 3),
    ('product', 'Product Code', 'PRD', 3),
    ('invoice', 'Invoice Number', 'INV', 6),
    ('quotation', 'Quotation Number', 'QUO', 6),
    ('customer', 'Customer ID', 'CUS', 6),
    ('vendor', 'Vendor ID', 'VEN', 6),
    ('payment', 'Payment Number', 'PAY', 6),
]
```

**Auto-Code Generation Logic**:
```python
def create_default_auto_codes(company):
    for code_type, display_name, prefix, length in DEFAULT_CODE_TYPES:
        CompanyAutoCodeSettings.objects.create(
            company=company,
            code_type=code_type,
            current_number=0,
            number_length=length,
            is_active=True
        )
```

### Advanced Document Numbering Setup

**File**: `backend/company_dashboard/document_numbering_models.py`
**Model**: `DocumentNumberingConfig`

**Service-Specific Numbering Setup**:
```python
def setup_service_numbering(company, service):
    document_types = ServiceDocumentTypes.get_service_document_types(service.service_type)
    current_fy = get_current_financial_year()
    
    for doc_type in document_types:
        DocumentNumberingConfig.objects.create(
            service=service,
            company=company,
            document_type=doc_type,
            financial_year=current_fy,
            prefix=ServiceDocumentTypes.get_default_prefix(doc_type),
            starting_number=1,
            current_counter=0,
            is_active=True
        )
```

## Stage 5: Company User Creation

### Company Admin User Setup

**Model**: `authentication.models.CompanyUser`
**Trigger**: Manual or automatic after company approval

**User Creation Process**:
```python
def create_company_user(company, user_data):
    # Create Django User
    user = User.objects.create_user(
        username=user_data['email'],
        email=user_data['email'],
        first_name=user_data['first_name'],
        last_name=user_data['last_name']
    )
    
    # Create Company User profile
    company_user = CompanyUser.objects.create(
        user=user,
        company=company,
        created_by=request.user,  # Master Admin
        password_expires_at=timezone.now() + timedelta(days=90),
        must_change_password=True
    )
    
    return company_user
```

**Default Permissions**:
- Access to company dashboard
- Manage company profile and settings
- Create and manage service users
- View company analytics

## Stage 6: Service User Provisioning

### Service User Creation

**Model**: `authentication.models.CompanyServiceUser`
**Created by**: Company User (after login)

**Service User Types**:
```python
ROLE_CHOICES = [
    ('admin', 'Service Admin'),
    ('manager', 'Service Manager'),
    ('user', 'Service User'),
    ('viewer', 'Service Viewer'),
]
```

**Unique Service ID Generation**:
```python
def generate_unique_service_id(company_prefix, username):
    base_id = f"{company_prefix}_{username}"
    existing_count = CompanyServiceUser.objects.filter(
        unique_service_id__startswith=base_id
    ).count()
    return f"{base_id}_{str(existing_count + 1).zfill(3)}"
```

**Example Service IDs**:
- `ACME_admin_001` - First admin user at ACME
- `TECH_finance_001` - First finance user at TECH
- `BKGE_hr_002` - Second HR user at BKGE

## Stage 7: Default Data Seeding

### Master Data Seeding

**HSN/SAC Codes** (Shared across companies):
**File**: `backend/finance/models.py`
**Source**: `HSN.csv`, `SAC.csv` files in project root

**Seeding Process**:
```python
# HSN codes loaded from CSV
def load_hsn_codes():
    with open('HSN.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            HSNCode.objects.get_or_create(
                code=row['code'],
                defaults={
                    'description': row['description'],
                    'gst_rate': row['gst_rate']
                }
            )
```

### Company-Specific Default Data

**Finance Service Defaults**:
- Default product categories
- Standard payment terms
- Basic tax configurations

**HR Service Defaults**:
- Standard departments (Admin, Finance, HR, IT)
- Common designations
- Default leave types
- Payroll components (Basic, HRA, PF, ESI)

**Seeding Scripts Location**:
- `backend/scripts/create_initial_services.py`
- `backend/scripts/setup_enhanced_inventory.py`
- `backend/scripts/generate_all_codes.py`

### Default Department & Designation Setup

**File**: `backend/hr/models.py`
**Trigger**: First HR service user creation

```python
def create_default_departments(company):
    default_departments = [
        ('Administration', 'ADMIN'),
        ('Finance', 'FIN'),
        ('Human Resources', 'HR'),
        ('Information Technology', 'IT'),
        ('Operations', 'OPS'),
    ]
    
    for name, code in default_departments:
        Department.objects.create(
            company=company,
            name=name,
            code=f"{company.company_prefix}-DEPT-{code}",
            is_active=True
        )
```

## Stage 8: Company Dashboard Setup

### Dashboard Configuration

**Models**: `backend/company_dashboard/models.py`

**Service Utilization Tracking**:
```python
def setup_service_utilization(company):
    for service in company.company_services.filter(is_active=True):
        ServiceUtilization.objects.create(
            company=company,
            service=service.service,
            total_users=0,
            active_users=0,
            usage_percentage=0.0,
            data_volume=0
        )
```

**Company Analytics Initialization**:
```python
CompanyAnalytics.objects.create(
    company=company,
    total_data_entries=0,
    most_used_service='',
    least_used_service='',
    monthly_growth=0.0,
    service_adoption_rate={},
    system_health='good'
)
```

### Email Settings Configuration

**Model**: `company_dashboard.models.CompanyEmailSettings`
**Setup**: Manual configuration by Company User

**Default Email Settings**:
```python
CompanyEmailSettings.objects.create(
    company=company,
    from_email=company.email,
    from_name=company.name,
    email_provider='gmail',
    is_active=False,  # Requires manual configuration
    daily_limit=500
)
```

## Provisioning Scripts & Fixtures

### Key Provisioning Scripts

**1. Initial Services Setup**:
**File**: `backend/scripts/create_initial_services.py`
- Creates default services in the system
- Sets up service configurations
- Initializes service features

**2. Generate All Codes**:
**File**: `backend/scripts/generate_all_codes.py`
- Generates auto-codes for existing companies
- Fixes missing numbering configurations
- Updates counter states

**3. Enhanced Inventory Setup**:
**File**: `backend/scripts/setup_enhanced_inventory.py`
- Sets up inventory-specific configurations
- Creates default categories and units
- Initializes warehouse settings

### Database Migrations

**Key Migration Files**:
- `authentication/migrations/` - User and company setup
- `finance/migrations/` - Finance module setup
- `hr/migrations/` - HR module setup
- `company_dashboard/migrations/` - Dashboard setup

**Migration Dependencies**:
```python
# Typical migration dependency chain
dependencies = [
    ('authentication', '0001_initial'),
    ('finance', '0001_initial'),
    ('hr', '0001_initial'),
]
```

### Fixtures and Seed Data

**HSN/SAC Code Loading**:
**Files**: `HSN.csv`, `SAC.csv` in project root
**Loading**: Via management commands or migration scripts

**Default Service Creation**:
```python
# In migrations or fixtures
Service.objects.get_or_create(
    service_type='finance',
    defaults={
        'name': 'Finance Management',
        'description': 'Complete financial management system',
        'is_active': True,
        'base_price': 0.00,
        'features': ['invoicing', 'payments', 'reports']
    }
)
```

## Provisioning Validation & Health Checks

### Company Setup Validation

**Validation Checklist**:
1. Company created with unique prefix
2. Services assigned and active
3. Auto-code settings configured
4. Company user created and activated
5. Default data seeded
6. Dashboard initialized
7. Email settings template created

**Health Check Endpoint**:
```python
def company_health_check(company_id):
    company = Company.objects.get(id=company_id)
    
    checks = {
        'company_approved': company.approval_status == 'approved',
        'services_assigned': company.company_services.filter(is_active=True).exists(),
        'auto_codes_configured': company.auto_code_settings.filter(is_active=True).exists(),
        'company_user_exists': hasattr(company, 'users') and company.users.exists(),
        'dashboard_initialized': hasattr(company, 'analytics'),
        'email_settings_created': hasattr(company, 'email_settings'),
    }
    
    return {
        'company': company.name,
        'health_score': sum(checks.values()) / len(checks) * 100,
        'checks': checks
    }
```

This comprehensive provisioning system ensures that new companies are fully set up with all necessary configurations, users, and default data, making them ready for immediate business operations while maintaining complete tenant isolation.