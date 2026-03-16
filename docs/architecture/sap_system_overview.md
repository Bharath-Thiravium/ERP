# SAP System Architecture Overview

## Runtime Topology

### Service Architecture Diagram
```
┌─────────────────────────────────────────────────────────────────┐
│                        SAP-Python System                        │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite)                                       │
│  Port: 3000                                                     │
│  - React 19.1.1 with TypeScript                               │
│  - Ant Design UI Components                                    │
│  - TanStack Query for state management                        │
│  - WebSocket connections for real-time updates                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend Services (Django 5.2.6)                              │
│  Port: 8000                                                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   HTTP/REST     │  │   WebSocket     │  │   Background    │ │
│  │   Django        │  │   Channels      │  │   Celery        │ │
│  │   (WSGI/ASGI)   │  │   (ASGI)        │  │   Workers       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Data Layer                                                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   PostgreSQL    │  │     Redis       │  │   File System   │ │
│  │   (Primary DB)  │  │   (Cache/Queue) │  │   (Media/Static) │ │
│  │   Port: 5432    │  │   Port: 6379    │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Structure
- **Backend Root**: `/var/www/SAP-Python/backend/`
- **Frontend Root**: `/var/www/SAP-Python/frontend/`
- **Environment Files**: 
  - Backend: `/var/www/SAP-Python/backend/.env`
  - Frontend: `/var/www/SAP-Python/frontend/.env`
- **Deployment Scripts**:
  - Main setup: `/var/www/SAP-Python/setup_and_run.sh`
  - Database import: `/var/www/SAP-Python/import_database.sh`
  - Service control: `/var/www/SAP-Python/stop_services.sh`

### Services & Daemons

#### Core Services
1. **Django Application Server** (Port 8000)
   - WSGI/ASGI application via `sap_backend.wsgi` and `sap_backend.asgi`
   - REST API endpoints
   - WebSocket support via Django Channels

2. **Celery Worker**
   - Background task processing
   - Configuration: `sap_backend.celery`
   - Tasks: HR compliance, email automation, data processing

3. **Celery Beat Scheduler**
   - Periodic task scheduling
   - Daily compliance checks, monthly reports
   - Configuration in `celery_app.py`

4. **Redis Server** (Port 6379)
   - Celery message broker
   - Django Channels layer
   - Session storage and caching

5. **PostgreSQL Database** (Port 5432)
   - Primary data storage
   - Database name: `modernsap`

#### Frontend Service
- **React Development Server** (Port 3000)
  - Vite build tool
  - Hot module replacement
  - TypeScript compilation

## Tenancy/Isolation Model

### Multi-Tenant Architecture: Shared Database with Company Isolation

The SAP system uses a **shared database, shared schema** multi-tenancy model with strict company-level isolation:

#### Tenant Context Contract

**Primary Tenant Field**: `company` (Foreign Key to `authentication.Company`)

**Tenant Context Sources**:
1. **Authentication Layer**: `authentication.models.CompanyUser.company`
2. **Service User Context**: `authentication.models.CompanyServiceUser.company`
3. **Request Context**: Set via middleware and authentication

**Tenant Scoping Rules**:
- **ALL** business data models include `company = models.ForeignKey(Company, on_delete=models.CASCADE)`
- **Database-level isolation**: All queries automatically filtered by company
- **API-level enforcement**: All endpoints require company context
- **Service-level isolation**: Each service user belongs to exactly one company

#### Tenant Context Enforcement Points

**Middleware**: `authentication.middleware.RateLimitMiddleware`
- Rate limiting per IP address
- Company context validation

**Authentication Classes**:
- `rest_framework_simplejwt.authentication.JWTAuthentication`
- Company context extracted from JWT token user

**Permission Classes**:
- `rest_framework.permissions.IsAuthenticated`
- Custom company-scoped permissions

#### Tenant Data Isolation Examples

**Finance Module**:
```python
# All finance models scoped to company
class Customer(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='finance_customers')
    # ... other fields

class Invoice(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    # ... other fields
```

**HR Module**:
```python
# All HR models scoped to company
class Employee(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='employees')
    # ... other fields

class Department(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='departments')
    # ... other fields
```

### Company Hierarchy

```
Master Admin (System Level)
    │
    ├── Company A
    │   ├── Company User (Admin)
    │   ├── Service Users (Finance, HR, etc.)
    │   └── Company Data (Customers, Employees, etc.)
    │
    ├── Company B
    │   ├── Company User (Admin)
    │   ├── Service Users (Finance, HR, etc.)
    │   └── Company Data (Customers, Employees, etc.)
    │
    └── Company N...
```

## Core Contracts

### Authentication Contract

**User Types**:
1. **Master Admin**: System-level admin (`authentication.models.MasterAdmin`)
2. **Company User**: Company admin (`authentication.models.CompanyUser`)
3. **Service User**: Service-specific user (`authentication.models.CompanyServiceUser`)

**Authentication Flow**:
1. JWT token-based authentication
2. Token contains user type and company context
3. All API requests validated against company scope
4. Service users can only access assigned services

### Service Assignment Contract

**Service Model**: `authentication.models.Service`
- Available services: finance, hr, inventory, orders, analytics, crm

**Company Service Assignment**: `authentication.models.CompanyService`
- Links companies to available services
- Service-specific credentials and settings
- Activation/deactivation control

**Service User Management**: `authentication.models.CompanyServiceUser`
- Service-specific user accounts
- Role-based access within services
- Unique service ID format: `{COMPANY_PREFIX}_{username}_{001}`

### Data Scoping Contract

**Mandatory Fields**:
- `company`: Foreign key to Company model
- `created_by`: Foreign key to CompanyServiceUser (where applicable)
- `created_at`/`updated_at`: Audit timestamps

**Unique Constraints**:
- Most business entities: `unique_together = ['company', 'code']`
- Ensures company-level uniqueness while allowing cross-company duplicates

**Soft Delete Pattern**:
- `is_active` boolean field for logical deletion
- Maintains referential integrity
- Allows data recovery

### API Contract

**Base URL Structure**: `/api/{service}/`
- `/api/auth/` - Authentication endpoints
- `/api/finance/` - Finance service endpoints
- `/api/hr/` - HR service endpoints
- `/api/inventory/` - Inventory service endpoints
- `/api/crm/` - CRM service endpoints

**Authentication Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

**Response Format**:
```json
{
  "success": true,
  "data": {...},
  "message": "Success message",
  "errors": null
}
```

**Error Response Format**:
```json
{
  "success": false,
  "data": null,
  "message": "Error message",
  "errors": {
    "field": ["Error details"]
  }
}
```

This architecture ensures complete tenant isolation while maintaining a single codebase and database, making it suitable for SaaS deployment with the ability to add new services like Athens without breaking existing functionality.