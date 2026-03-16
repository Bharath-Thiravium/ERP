# SAP API Map

## API Endpoint Structure

Based on `backend/sap_backend/urls.py`, the API follows a service-based routing pattern:

### Base API Structure
- **Root URL**: `/`
- **Admin Interface**: `/admin/`
- **API Documentation**: 
  - Schema: `/api/schema/`
  - Swagger UI: `/api/docs/`
  - ReDoc: `/api/redoc/`

## Authentication Endpoints

### JWT Token Management
- **Token Refresh**: `POST /api/token/refresh/`
  - Refresh JWT access token
  - Requires valid refresh token

### Authentication Service (`/api/auth/`)
**File**: `authentication/urls.py`

**Master Admin Endpoints**:
- `POST /api/auth/master-admin/login/` - Master admin login
- `POST /api/auth/master-admin/logout/` - Master admin logout
- `GET /api/auth/master-admin/profile/` - Get master admin profile
- `PUT /api/auth/master-admin/profile/` - Update master admin profile

**Company Management**:
- `GET /api/auth/companies/` - List companies
- `POST /api/auth/companies/` - Create company
- `GET /api/auth/companies/{id}/` - Get company details
- `PUT /api/auth/companies/{id}/` - Update company
- `DELETE /api/auth/companies/{id}/` - Delete company

**Service Management**:
- `GET /api/auth/services/` - List available services
- `POST /api/auth/company-services/` - Assign service to company
- `GET /api/auth/company-services/` - List company services
- `DELETE /api/auth/company-services/{id}/` - Remove service from company

**Company User Management**:
- `POST /api/auth/company/login/` - Company user login
- `POST /api/auth/company/logout/` - Company user logout
- `GET /api/auth/company/profile/` - Get company user profile

**Service User Management**:
- `GET /api/auth/service-users/` - List service users
- `POST /api/auth/service-users/` - Create service user
- `PUT /api/auth/service-users/{id}/` - Update service user
- `DELETE /api/auth/service-users/{id}/` - Delete service user

## Business Service Endpoints

### Finance Service (`/api/finance/`)
**File**: `finance/urls.py`

**Master Data Management**:
- `GET /api/finance/products/` - List products/services
- `POST /api/finance/products/` - Create product/service
- `GET /api/finance/products/{id}/` - Get product details
- `PUT /api/finance/products/{id}/` - Update product
- `DELETE /api/finance/products/{id}/` - Delete product

- `GET /api/finance/customers/` - List customers
- `POST /api/finance/customers/` - Create customer
- `GET /api/finance/customers/{id}/` - Get customer details
- `PUT /api/finance/customers/{id}/` - Update customer
- `DELETE /api/finance/customers/{id}/` - Delete customer

- `GET /api/finance/vendors/` - List vendors
- `POST /api/finance/vendors/` - Create vendor
- `GET /api/finance/vendors/{id}/` - Get vendor details
- `PUT /api/finance/vendors/{id}/` - Update vendor

**Sales Process**:
- `GET /api/finance/quotations/` - List quotations
- `POST /api/finance/quotations/` - Create quotation
- `GET /api/finance/quotations/{id}/` - Get quotation details
- `PUT /api/finance/quotations/{id}/` - Update quotation
- `POST /api/finance/quotations/{id}/convert-to-po/` - Convert to PO

- `GET /api/finance/purchase-orders/` - List purchase orders
- `POST /api/finance/purchase-orders/` - Create purchase order
- `GET /api/finance/purchase-orders/{id}/` - Get PO details
- `PUT /api/finance/purchase-orders/{id}/` - Update PO

**Invoicing**:
- `GET /api/finance/proforma-invoices/` - List proforma invoices
- `POST /api/finance/proforma-invoices/` - Create proforma invoice
- `GET /api/finance/proforma-invoices/{id}/` - Get proforma details
- `PUT /api/finance/proforma-invoices/{id}/` - Update proforma

- `GET /api/finance/invoices/` - List tax invoices
- `POST /api/finance/invoices/` - Create tax invoice
- `GET /api/finance/invoices/{id}/` - Get invoice details
- `PUT /api/finance/invoices/{id}/` - Update invoice

**Payment Management**:
- `GET /api/finance/payments/` - List payments
- `POST /api/finance/payments/` - Record payment
- `GET /api/finance/payments/{id}/` - Get payment details
- `PUT /api/finance/payments/{id}/` - Update payment

**Purchase Management**:
- `GET /api/finance/purchase-requests/` - List purchase requests
- `POST /api/finance/purchase-requests/` - Create purchase request
- `GET /api/finance/vendor-invoices/` - List vendor invoices
- `POST /api/finance/vendor-invoices/` - Create vendor invoice
- `GET /api/finance/purchase-payments/` - List purchase payments
- `POST /api/finance/purchase-payments/` - Record purchase payment

### HR Service (`/api/hr/`)
**File**: `hr/urls.py`

**Organization Structure**:
- `GET /api/hr/departments/` - List departments
- `POST /api/hr/departments/` - Create department
- `GET /api/hr/departments/{id}/` - Get department details
- `PUT /api/hr/departments/{id}/` - Update department

- `GET /api/hr/designations/` - List designations
- `POST /api/hr/designations/` - Create designation
- `GET /api/hr/designations/{id}/` - Get designation details
- `PUT /api/hr/designations/{id}/` - Update designation

**Employee Management**:
- `GET /api/hr/employees/` - List employees
- `POST /api/hr/employees/` - Create employee
- `GET /api/hr/employees/{id}/` - Get employee details
- `PUT /api/hr/employees/{id}/` - Update employee
- `DELETE /api/hr/employees/{id}/` - Delete employee

**Recruitment**:
- `GET /api/hr/job-postings/` - List job postings
- `POST /api/hr/job-postings/` - Create job posting
- `GET /api/hr/job-applications/` - List job applications
- `POST /api/hr/job-applications/` - Submit job application

**Attendance Management**:
- `GET /api/hr/attendance/` - List attendance records
- `POST /api/hr/attendance/` - Record attendance
- `GET /api/hr/attendance/{id}/` - Get attendance details
- `PUT /api/hr/attendance/{id}/` - Update attendance

**Payroll Management**:
- `GET /api/hr/payroll-cycles/` - List payroll cycles
- `POST /api/hr/payroll-cycles/` - Create payroll cycle
- `GET /api/hr/payslips/` - List payslips
- `POST /api/hr/payslips/calculate/` - Calculate payroll
- `GET /api/hr/payslips/{id}/` - Get payslip details

### Public HR Endpoints (`/api/public/`)
**File**: `hr/public_urls.py`
- Public job application endpoints
- Career portal APIs

### Inventory Service (`/api/inventory/`)
**File**: `inventory/urls.py`
- Inventory management endpoints
- Stock tracking and management

### Orders Service (`/api/orders/`)
**File**: `orders/urls.py`
- Order processing endpoints
- Order lifecycle management

### Analytics Service (`/api/analytics/`)
**File**: `analytics/urls.py`
- Business analytics endpoints
- Dashboard data APIs
- Real-time analytics via WebSocket

### Reports Service (`/api/reports/`)
**File**: `reports/urls.py`
- Report generation endpoints
- Custom report builders

### Notifications Service (`/api/notifications/`)
**File**: `notifications/urls.py`
- Notification management
- Real-time notifications via WebSocket

### AI Assistant Service (`/api/ai/`)
**File**: `ai_assistant/urls.py`
- AI-powered assistance endpoints
- RAG (Retrieval-Augmented Generation) APIs

### Company Dashboard Service (`/api/company-dashboard/`)
**File**: `company_dashboard/urls.py`

**Dashboard Analytics**:
- `GET /api/company-dashboard/analytics/` - Company analytics
- `GET /api/company-dashboard/service-utilization/` - Service usage stats

**Email Configuration**:
- `GET /api/company-dashboard/email-settings/` - Get email settings
- `POST /api/company-dashboard/email-settings/` - Configure email settings
- `POST /api/company-dashboard/email-settings/test/` - Test email configuration

**Document Numbering**:
- `GET /api/company-dashboard/numbering-config/` - Get numbering configuration
- `POST /api/company-dashboard/numbering-config/` - Create numbering config
- `PUT /api/company-dashboard/numbering-config/{id}/` - Update numbering config

**Template Management**:
- `GET /api/company-dashboard/quotation-templates/` - Get quotation templates
- `POST /api/company-dashboard/quotation-templates/` - Create template
- `PUT /api/company-dashboard/quotation-templates/{id}/` - Update template

### Configuration Service (`/api/`)
**File**: `configuration/urls.py`
- System configuration endpoints
- Backup management APIs

### CRM Service (`/api/crm/`)
**File**: `crm/urls.py`
- Customer relationship management
- Lead and opportunity tracking
- Sales pipeline management

## WebSocket Endpoints

### Real-time Communication
The system supports WebSocket connections for real-time updates:

**Notifications WebSocket**:
- Path: `/ws/notifications/`
- Purpose: Real-time notification delivery
- Authentication: JWT token-based

**Analytics WebSocket**:
- Path: `/ws/analytics/`
- Purpose: Real-time dashboard updates
- Authentication: JWT token-based

## Authentication Flow

### JWT Token Authentication
1. **Login**: `POST /api/auth/{user-type}/login/`
   - Returns access token and refresh token
   - Access token expires in 60 minutes (configurable)
   - Refresh token expires in 24 hours (configurable)

2. **API Requests**: Include header `Authorization: Bearer {access_token}`

3. **Token Refresh**: `POST /api/token/refresh/`
   - Use refresh token to get new access token
   - Implements token rotation for security

4. **Logout**: `POST /api/auth/{user-type}/logout/`
   - Blacklists current tokens

### User Type Authentication Flows

**Master Admin Flow**:
1. Login via `/api/auth/master-admin/login/`
2. Access system-wide management functions
3. Can create/manage companies and services

**Company User Flow**:
1. Login via `/api/auth/company/login/`
2. Access company dashboard and management
3. Can create/manage service users

**Service User Flow**:
1. Login via service-specific endpoints
2. Access assigned service functionality only
3. Company-scoped data access

## API Response Patterns

### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Operation successful",
  "pagination": {
    "count": 100,
    "next": "http://localhost:8000/api/endpoint/?page=2",
    "previous": null,
    "results": [...]
  }
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": {
    "field_name": ["Error message"],
    "non_field_errors": ["General error"]
  }
}
```

### Pagination
- Uses Django REST Framework's `PageNumberPagination`
- Default page size: 20 items
- Configurable via `PAGE_SIZE` setting

## API Security Features

### Rate Limiting
- Implemented via `authentication.middleware.RateLimitMiddleware`
- Different limits for different endpoint types:
  - Login endpoints: 20 requests per 5 minutes
  - Auth endpoints: 200 requests per 5 minutes
  - General API: 300 requests per 5 minutes

### CORS Configuration
- Configured for frontend integration
- Development: Allows all origins
- Production: Restricted to configured origins

### Input Validation
- Django REST Framework serializers
- Custom validators for business logic
- SQL injection protection via ORM

This API structure provides comprehensive business functionality while maintaining security and multi-tenant isolation.