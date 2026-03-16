# SAP RBAC and Menu System

## Role-Based Access Control (RBAC) Model

### User Hierarchy & Roles

The SAP system implements a three-tier user hierarchy with role-based access control:

```
Master Admin (System Level)
    │
    ├── Company User (Company Level)
    │   │
    │   └── Service Users (Service Level)
    │       ├── Service Admin
    │       ├── Service Manager  
    │       ├── Service User
    │       └── Service Viewer
```

### User Types & Permissions

#### 1. Master Admin (`authentication.models.MasterAdmin`)

**Scope**: System-wide access across all companies
**Authentication**: JWT with master admin context
**Permissions**:
- Create, read, update, delete companies
- Assign/revoke services to companies
- View system-wide analytics
- Manage system configuration
- Access security logs and audit trails
- Reset company credentials
- System maintenance operations

**Enforcement Points**:
- `authentication.views` - Master admin endpoints
- Custom permission classes checking `user.master_admin`
- Middleware validation for system-level operations

#### 2. Company User (`authentication.models.CompanyUser`)

**Scope**: Single company access with administrative privileges
**Authentication**: JWT with company context
**Permissions**:
- Manage company profile and settings
- Create/manage service users within company
- Access company dashboard and analytics
- Configure company-specific settings (email, numbering, templates)
- View company activity logs
- Manage company services (within assigned services)

**Enforcement Points**:
- Company-scoped queries: `queryset.filter(company=user.company_user.company)`
- `authentication.permissions` - Company-level permissions
- Dashboard views restricted to company context

#### 3. Service Users (`authentication.models.CompanyServiceUser`)

**Scope**: Single service within single company
**Authentication**: JWT with company + service context
**Role Hierarchy**:

**Service Admin**:
- Full CRUD access within assigned service
- Manage service-specific settings
- Create/manage other service users (lower roles)
- Access service analytics and reports
- Configure service workflows

**Service Manager**:
- CRUD access to service data
- Limited user management (user/viewer roles only)
- Access service reports
- Approve/reject workflows

**Service User**:
- CRUD access to service data
- Cannot manage users
- Limited reporting access
- Execute standard workflows

**Service Viewer**:
- Read-only access to service data
- View reports only
- No modification permissions

### Permission Enforcement Architecture

#### Backend Enforcement

**Model-Level Enforcement**:
```python
# All business models include company scoping
class Customer(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    # Automatic filtering: Customer.objects.filter(company=request.user.company)
```

**View-Level Enforcement**:
```python
# Custom permission classes
class IsCompanyUser(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'company_user')

class IsServiceUser(BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'company_service_user')
```

**Queryset Filtering**:
```python
# Automatic company scoping in views
def get_queryset(self):
    return Customer.objects.filter(company=self.request.user.company_user.company)
```

#### API Authentication Classes

**Primary Authentication**: `rest_framework_simplejwt.authentication.JWTAuthentication`

**Permission Classes**:
- `rest_framework.permissions.IsAuthenticated` (base requirement)
- Custom company-scoped permissions
- Service-specific permissions

**JWT Token Structure**:
```json
{
  "user_id": 123,
  "user_type": "service_user",
  "company_id": 456,
  "service_id": 789,
  "role": "admin",
  "exp": 1640995200
}
```

### Service-Specific Permissions

#### Finance Service Permissions
- **View Financial Data**: Read access to invoices, payments, customers
- **Create Transactions**: Create quotations, invoices, payments
- **Manage Master Data**: CRUD on customers, products, vendors
- **Financial Reports**: Access to financial analytics and reports
- **Payment Processing**: Record and manage payments

#### HR Service Permissions
- **Employee Management**: CRUD on employee records
- **Payroll Processing**: Calculate and process payroll
- **Attendance Management**: Record and manage attendance
- **Recruitment**: Manage job postings and applications
- **Performance Reviews**: Conduct and manage reviews
- **Statutory Compliance**: Access compliance features

#### Inventory Service Permissions
- **Stock Management**: Manage inventory levels
- **Warehouse Operations**: Transfer and adjust stock
- **Purchase Management**: Create purchase orders
- **Supplier Management**: Manage supplier relationships

#### CRM Service Permissions
- **Lead Management**: Manage leads and opportunities
- **Customer Interaction**: Track customer communications
- **Sales Pipeline**: Manage sales processes
- **Campaign Management**: Create and manage marketing campaigns

## Frontend Menu System

### Menu Architecture

The frontend uses a **dynamic, role-based menu system** that adapts based on user permissions and assigned services.

#### Menu Structure Pattern
```typescript
interface MenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  path?: string;
  children?: MenuItem[];
  permissions?: string[];
  serviceRequired?: string;
}
```

#### Menu Configuration Source

**Static Route Definition**: Frontend defines base menu structure
**Dynamic Filtering**: Menu items filtered based on:
1. User type (master_admin, company_user, service_user)
2. Assigned services (from JWT token)
3. User role within service
4. Feature flags and permissions

#### Menu Hierarchy by User Type

**Master Admin Menu**:
```
Dashboard
├── System Overview
├── Company Management
│   ├── Companies List
│   ├── Service Assignments
│   └── System Analytics
├── Security
│   ├── Security Logs
│   ├── Audit Trail
│   └── System Settings
└── Reports
    ├── System Reports
    └── Usage Analytics
```

**Company User Menu**:
```
Dashboard
├── Company Overview
├── Service Management
│   ├── Service Users
│   ├── Service Settings
│   └── Activity Logs
├── Company Settings
│   ├── Profile
│   ├── Email Configuration
│   ├── Document Numbering
│   └── Templates
└── Analytics
    ├── Company Analytics
    └── Service Utilization
```

**Service User Menu** (Example: Finance Service):
```
Dashboard
├── Finance Overview
├── Sales
│   ├── Quotations
│   ├── Purchase Orders
│   ├── Proforma Invoices
│   └── Tax Invoices
├── Purchases
│   ├── Purchase Requests
│   ├── Vendor Invoices
│   └── Purchase Payments
├── Master Data
│   ├── Customers
│   ├── Products
│   └── Vendors
├── Payments
│   ├── Customer Payments
│   └── Payment Reports
└── Reports
    ├── Financial Reports
    └── Tax Reports
```

### Menu Enforcement Mechanisms

#### Frontend Route Protection
```typescript
// Route guard checking permissions
const ProtectedRoute = ({ children, requiredPermission, requiredService }) => {
  const { user, permissions, services } = useAuth();
  
  if (!permissions.includes(requiredPermission)) {
    return <Unauthorized />;
  }
  
  if (requiredService && !services.includes(requiredService)) {
    return <ServiceNotAssigned />;
  }
  
  return children;
};
```

#### Dynamic Menu Rendering
```typescript
// Menu filtering based on user context
const filterMenuItems = (menuItems: MenuItem[], user: User) => {
  return menuItems.filter(item => {
    // Check service requirement
    if (item.serviceRequired && !user.services.includes(item.serviceRequired)) {
      return false;
    }
    
    // Check permissions
    if (item.permissions && !item.permissions.some(p => user.permissions.includes(p))) {
      return false;
    }
    
    return true;
  });
};
```

#### Backend API Enforcement
Even if frontend menu is bypassed, backend APIs enforce permissions:

```python
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsServiceUser])
def finance_dashboard(request):
    # Verify user has finance service access
    if not request.user.company_service_user.service.service_type == 'finance':
        return Response({'error': 'Access denied'}, status=403)
    
    # Return company-scoped data only
    data = get_finance_dashboard_data(request.user.company_service_user.company)
    return Response(data)
```

### Menu State Management

#### Frontend State Management
- **Zustand Store**: Manages user authentication state
- **React Query**: Caches user permissions and service assignments
- **Local Storage**: Persists menu preferences and collapsed states

#### Menu Synchronization
1. **Login**: Fetch user permissions and services from JWT
2. **Menu Render**: Filter menu items based on user context
3. **Route Navigation**: Validate permissions before route access
4. **Real-time Updates**: WebSocket notifications for permission changes

### Permission Matrix

| User Type | System Admin | Company Mgmt | Service Access | Data Scope |
|-----------|-------------|--------------|----------------|------------|
| Master Admin | ✅ Full | ✅ All Companies | ✅ All Services | Global |
| Company User | ❌ None | ✅ Own Company | ✅ Assigned Services | Company |
| Service Admin | ❌ None | ❌ None | ✅ Own Service | Company + Service |
| Service Manager | ❌ None | ❌ None | ✅ Own Service (Limited) | Company + Service |
| Service User | ❌ None | ❌ None | ✅ Own Service (CRUD) | Company + Service |
| Service Viewer | ❌ None | ❌ None | ✅ Own Service (Read) | Company + Service |

### Security Features

#### Session Management
- JWT token expiration and refresh
- Automatic logout on token expiry
- Session invalidation on role changes

#### Permission Caching
- Permissions cached in JWT token
- Real-time updates via WebSocket
- Cache invalidation on permission changes

#### Audit Trail
- All permission checks logged
- User action tracking
- Security event monitoring

This RBAC system ensures complete access control while maintaining flexibility for different user types and service combinations, making it suitable for extending with new services like Athens.