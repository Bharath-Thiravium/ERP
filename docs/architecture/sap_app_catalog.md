# SAP App Catalog

## Installed Django Apps

Based on `backend/sap_backend/settings.py`, the system includes the following apps:

### Core Django Apps
- `django.contrib.admin` - Django admin interface
- `django.contrib.auth` - Django authentication system
- `django.contrib.contenttypes` - Content types framework
- `django.contrib.sessions` - Session framework
- `django.contrib.messages` - Messaging framework
- `django.contrib.staticfiles` - Static files handling

### Third-Party Apps
- `rest_framework` - Django REST Framework for API
- `corsheaders` - CORS handling for frontend integration
- `channels` - WebSocket support
- `django_filters` - API filtering
- `rest_framework_simplejwt` - JWT authentication
- `rest_framework_simplejwt.token_blacklist` - JWT token blacklisting
- `django_celery_beat` - Celery periodic tasks
- `django_celery_results` - Celery result storage
- `drf_spectacular` - API documentation

### Business Logic Apps

## App Responsibilities & Models

### 1. Authentication App (`authentication/`)

**Purpose**: Multi-tenant authentication, user management, and service assignment

**Key Models**:
- `MasterAdmin` - System-level administrators
- `Company` - Tenant companies with business details
- `CompanyAutoCodeSettings` - Auto-code generation per company
- `Service` - Available system services
- `CompanyService` - Service assignments to companies
- `CompanyUser` - Company administrators
- `CompanyServiceUser` - Service-specific users
- `ServiceUserSession` - User session tracking
- `SecurityLog` - Security audit logging

**Tenancy Fields**: N/A (this is the tenant definition layer)

**Status Fields**: 
- `is_active`, `is_locked`, `approval_status`
- `password_expires_at`, `must_change_password`

**Soft Delete**: Uses `is_active` and `is_locked` flags

### 2. Finance App (`finance/`)

**Purpose**: Complete financial management including invoicing, payments, and purchase management

**Key Models**:

**Master Data**:
- `HSNCode` - HSN codes for goods with GST rates
- `SACCode` - SAC codes for services with GST rates
- `Product` - Products/services with pricing and tax info
- `Customer` - Customer master with comprehensive details
- `CustomerShippingAddress` - Multiple shipping addresses per customer
- `Vendor` - Vendor/supplier master data

**Document Models**:
- `Quotation` - Sales quotations with line items
- `QuotationItem` - Individual quotation line items
- `PurchaseOrder` - Purchase orders from quotations
- `PurchaseOrderItem` - PO line items
- `ProformaInvoice` - Advance billing without tax
- `ProformaInvoiceItem` - Proforma line items
- `Invoice` - Tax invoices with full compliance
- `InvoiceItem` - Invoice line items
- `Payment` - Customer payments with TDS support

**Purchase Management**:
- `PurchaseRequest` - Purchase requests to vendors
- `PurchaseRequestItem` - Purchase request line items
- `VendorInvoice` - Invoices received from vendors
- `VendorInvoiceItem` - Vendor invoice line items
- `PurchasePayment` - Payments made to vendors

**Numbering System**:
- `NumberingRule` - Per-company numbering configuration
- `NumberingCounter` - Atomic counters per company/module

**Tenancy Fields**: All models have `company` FK
**Status Fields**: `status`, `payment_status`, `is_active`
**Soft Delete**: `is_active` boolean field

### 3. HR App (`hr/`)

**Purpose**: Comprehensive human resource management with statutory compliance

**Key Models**:

**Organization Structure**:
- `Department` - Company departments
- `Designation` - Job positions within departments
- `Employee` - Complete employee records with statutory details

**Recruitment**:
- `JobPosting` - Job openings with AI screening
- `JobApplication` - Applications with AI scoring

**Attendance Management**:
- `AttendanceSystem` - Company attendance configuration
- `Attendance` - Daily attendance records with multiple methods
- `AttendanceDevice` - Biometric/face recognition devices
- `AttendanceLog` - Raw attendance logs from devices

**Performance & Reviews**:
- `PerformanceReview` - AI-enhanced performance reviews

**Payroll System**:
- `SalaryComponent` - Configurable salary components
- `PayrollSettings` - Company payroll configuration
- `PayrollCycle` - Payroll processing cycles
- `Payslip` - Comprehensive payslips with statutory compliance

**Reporting**:
- `PayrollReport` - Various payroll reports

**Tenancy Fields**: All models have `company` FK
**Status Fields**: `status`, `is_active`, `employment_type`
**Soft Delete**: `is_active` and `status` fields

### 4. Inventory App (`inventory/`)

**Purpose**: Stock and inventory management

**Key Models**:
- Basic inventory models (specific models need examination)

**Tenancy Fields**: `company` FK
**Status Fields**: `is_active`
**Soft Delete**: `is_active` boolean

### 5. Orders App (`orders/`)

**Purpose**: Order management and processing

**Key Models**:
- Order processing models (specific models need examination)

**Tenancy Fields**: `company` FK
**Status Fields**: `status`
**Soft Delete**: `is_active` boolean

### 6. Analytics App (`analytics/`)

**Purpose**: Business intelligence and reporting with WebSocket support

**Key Models**:
- Analytics and reporting models
- WebSocket consumers for real-time updates

**Tenancy Fields**: `company` FK
**Status Fields**: Various status fields
**Soft Delete**: `is_active` boolean

### 7. Reports App (`reports/`)

**Purpose**: Report generation and management

**Key Models**:
- Report definition and generation models

**Tenancy Fields**: `company` FK
**Status Fields**: `status`
**Soft Delete**: `is_active` boolean

### 8. Notifications App (`notifications/`)

**Purpose**: Real-time notifications with WebSocket support

**Key Models**:
- Notification models
- WebSocket consumers for real-time delivery

**Tenancy Fields**: `company` FK
**Status Fields**: `read`, `is_active`
**Soft Delete**: Expiration-based cleanup

### 9. AI Assistant App (`ai_assistant/`)

**Purpose**: AI-powered assistance and automation

**Key Models**:
- AI interaction models
- RAG (Retrieval-Augmented Generation) support

**Tenancy Fields**: `company` FK
**Status Fields**: `is_active`
**Soft Delete**: `is_active` boolean

### 10. Configuration App (`configuration/`)

**Purpose**: System configuration and settings

**Key Models**:
- System configuration models
- Backup management

**Tenancy Fields**: `company` FK
**Status Fields**: `is_active`
**Soft Delete**: `is_active` boolean

### 11. Company Dashboard App (`company_dashboard/`)

**Purpose**: Company-specific dashboard and management features

**Key Models**:

**Analytics & Monitoring**:
- `ServiceUtilization` - Service usage statistics
- `CompanyAnalytics` - Company-wide analytics
- `ServiceUserActivity` - User activity tracking
- `ActivityLog` - Detailed activity logging

**Notifications & Alerts**:
- `CompanyNotification` - Company-specific notifications

**Configuration**:
- `ServiceConfiguration` - Service settings per company
- `CompanyEmailSettings` - Email configuration with encryption

**Document Numbering**:
- `DocumentNumberingConfig` - Advanced numbering system
- `DocumentNumberingHistory` - Numbering audit trail
- `FinancialYearSettings` - Financial year management

**Template Management**:
- `CompanyQuotationTemplateSettings` - Quotation templates

**Tenancy Fields**: All models have `company` FK
**Status Fields**: `is_active`, `is_verified`, `status`
**Soft Delete**: `is_active` boolean

### 12. CRM App (`crm/`)

**Purpose**: Customer relationship management

**Key Models**:
- Lead management
- Customer interaction tracking
- Sales pipeline management

**Tenancy Fields**: `company` FK
**Status Fields**: `status`, `is_active`
**Soft Delete**: `is_active` boolean

## Model Catalog Summary

### Core Shared Tables (Cross-Company)
- `authentication_masteradmin`
- `authentication_company`
- `authentication_service`
- `finance_hsncode` (shared HSN/SAC codes)
- `finance_saccode`

### Company-Scoped Tables (Per-Tenant)
All other business models are company-scoped with the following pattern:
- Foreign key to `Company` model
- Unique constraints typically include company field
- Audit fields: `created_by`, `created_at`, `updated_at`
- Status management via `is_active` or specific status fields

### Common Patterns

**Numbering Pattern**:
- Auto-generated codes with company prefix
- Format: `{COMPANY_PREFIX}{TYPE_CODE}{NUMBER}`
- Example: `ACMEEMP001`, `TECHCUST000123`

**Status Enums**:
- `active/inactive/terminated` (HR)
- `draft/sent/approved/paid/cancelled` (Finance)
- `pending/approved/rejected` (General workflow)

**Audit Pattern**:
- `created_by` (FK to CompanyServiceUser)
- `created_at`/`updated_at` (timestamps)
- `is_active` (soft delete)

**Address Pattern** (Customer, Employee, Vendor):
- Separate billing and shipping addresses
- Full address breakdown with validation
- Country defaulting to 'India'

This architecture ensures complete data isolation between companies while maintaining referential integrity and providing comprehensive business functionality across all modules.