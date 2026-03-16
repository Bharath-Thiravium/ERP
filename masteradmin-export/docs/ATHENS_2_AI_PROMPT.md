# Athens 2.0 SuperAdmin Module - AI Implementation Prompt

## Context

You are implementing the SuperAdmin module for Athens 2.0 based on the SAP-Python MasterAdmin export. This is a complete, production-ready admin panel for managing system users, roles, security, and configuration.

## Source Materials

- **Migration Guide**: `ATHENS_2_MIGRATION_GUIDE.md` (read this first)
- **Source Code**: `/var/www/SAP-Python/masteradmin-export/`
  - Frontend: `frontend/` (71 TypeScript files)
  - Backend: `backend/` (131 Python files)

## Target Structure

```
Athens-2.0/
└── apps/
    └── superadmin/
        ├── frontend/
        │   ├── pages/
        │   ├── components/
        │   ├── hooks/
        │   ├── services/
        │   └── lib/
        └── backend/
            ├── api/
            ├── models/
            ├── services/
            └── tests/
```

## Implementation Instructions

### Phase 1: Setup & Foundation

**Step 1: Create Module Structure**
```bash
# Create directories
mkdir -p apps/superadmin/frontend/{pages,components,hooks,services,lib}
mkdir -p apps/superadmin/backend/{api,models,services,tests}
```

**Step 2: Backend Models**

Create `apps/superadmin/backend/models/user.py`:
```python
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

class SuperAdminUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    role = models.ForeignKey('Role', on_delete=models.PROTECT)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    last_login = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    password_changed_at = models.DateTimeField(null=True)
    force_password_change = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
```

Create `apps/superadmin/backend/models/role.py`:
```python
class Role(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField('Permission')
    is_system_role = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class Permission(models.Model):
    codename = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    module = models.CharField(max_length=50)
    action = models.CharField(max_length=50)
```

Create `apps/superadmin/backend/models/audit.py`:
```python
class AuditLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('SuperAdminUser', null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=100)
    module = models.CharField(max_length=50)
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    request_data = models.JSONField(default=dict)
    response_data = models.JSONField(default=dict)
    status = models.CharField(max_length=20)
```

**Step 3: API Endpoints**

Create `apps/superadmin/backend/api/users/views.py`:
```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from ..models import SuperAdminUser
from ..serializers import SuperAdminUserSerializer
from ..permissions import HasPermission

class SuperAdminUserViewSet(viewsets.ModelViewSet):
    queryset = SuperAdminUser.objects.all()
    serializer_class = SuperAdminUserSerializer
    permission_classes = [IsAuthenticated, HasPermission('superadmin.users')]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Apply filters
        role = self.request.query_params.get('role')
        status = self.request.query_params.get('status')
        search = self.request.query_params.get('search')
        
        if role:
            queryset = queryset.filter(role_id=role)
        if status:
            queryset = queryset.filter(is_active=(status == 'active'))
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) | 
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        # Generate temporary password
        temp_password = generate_temp_password()
        user.set_password(temp_password)
        user.force_password_change = True
        user.save()
        # Send email
        send_password_reset_email(user, temp_password)
        return Response({'status': 'password_reset_sent'})
    
    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        user = self.get_object()
        sessions = UserSession.objects.filter(user=user, is_active=True)
        serializer = UserSessionSerializer(sessions, many=True)
        return Response(serializer.data)
```

**Step 4: Frontend API Client**

Create `apps/superadmin/frontend/services/superadminApi.ts`:
```typescript
import { apiClient } from '@/lib/api';

export interface SuperAdminUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: number;
  role_name: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export const superadminApi = {
  users: {
    list: (params?: {
      role?: number;
      status?: 'active' | 'inactive';
      search?: string;
      page?: number;
    }) => apiClient.get<{ results: SuperAdminUser[]; count: number }>('/api/superadmin/users/', { params }),
    
    create: (data: Partial<SuperAdminUser>) => 
      apiClient.post<SuperAdminUser>('/api/superadmin/users/', data),
    
    update: (id: number, data: Partial<SuperAdminUser>) => 
      apiClient.put<SuperAdminUser>(`/api/superadmin/users/${id}/`, data),
    
    delete: (id: number) => 
      apiClient.delete(`/api/superadmin/users/${id}/`),
    
    resetPassword: (id: number) => 
      apiClient.post(`/api/superadmin/users/${id}/reset-password/`),
    
    getSessions: (id: number) => 
      apiClient.get(`/api/superadmin/users/${id}/sessions/`),
  },
  
  roles: {
    list: () => apiClient.get('/api/superadmin/roles/'),
    create: (data: any) => apiClient.post('/api/superadmin/roles/', data),
    update: (id: number, data: any) => apiClient.put(`/api/superadmin/roles/${id}/`, data),
    delete: (id: number) => apiClient.delete(`/api/superadmin/roles/${id}/`),
  },
  
  security: {
    getPasswordPolicy: () => apiClient.get('/api/superadmin/security/password-policy/'),
    updatePasswordPolicy: (data: any) => apiClient.put('/api/superadmin/security/password-policy/', data),
    get2FASettings: () => apiClient.get('/api/superadmin/security/2fa-settings/'),
    update2FASettings: (data: any) => apiClient.put('/api/superadmin/security/2fa-settings/', data),
    getIPRestrictions: () => apiClient.get('/api/superadmin/security/ip-restrictions/'),
    addIPRestriction: (data: any) => apiClient.post('/api/superadmin/security/ip-restrictions/', data),
    deleteIPRestriction: (id: number) => apiClient.delete(`/api/superadmin/security/ip-restrictions/${id}/`),
  },
  
  audit: {
    list: (params?: any) => apiClient.get('/api/superadmin/audit/logs/', { params }),
    detail: (id: number) => apiClient.get(`/api/superadmin/audit/logs/${id}/`),
    export: (params?: any) => apiClient.get('/api/superadmin/audit/logs/export/', { params }),
  },
  
  dashboard: {
    getStats: () => apiClient.get('/api/superadmin/dashboard/stats/'),
    getActivity: () => apiClient.get('/api/superadmin/dashboard/activity/'),
    getHealth: () => apiClient.get('/api/superadmin/dashboard/health/'),
  },
};
```

**Step 5: Frontend Pages**

Create `apps/superadmin/frontend/pages/Users/UsersList.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { superadminApi } from '@/services/superadminApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { UserForm } from './UserForm';

export function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', role: '', status: '' });
  const [showForm, setShowForm] = useState(false);
  
  useEffect(() => {
    loadUsers();
  }, [filters]);
  
  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await superadminApi.users.list(filters);
      setUsers(response.data.results);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await superadminApi.users.delete(id);
      loadUsers();
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">System Users</h1>
        <Button onClick={() => setShowForm(true)}>Create User</Button>
      </div>
      
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search users..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        {/* Add role and status filters */}
      </div>
      
      <Table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last Login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.first_name} {user.last_name}</td>
              <td>{user.role_name}</td>
              <td>{user.is_active ? 'Active' : 'Inactive'}</td>
              <td>{user.last_login}</td>
              <td>
                <Button size="sm" onClick={() => handleDelete(user.id)}>Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      {showForm && <UserForm onClose={() => setShowForm(false)} onSuccess={loadUsers} />}
    </div>
  );
}
```

### Phase 2: Core Features

**Implement these modules in order:**

1. **Users Management** (Priority: HIGH)
   - List with filters
   - Create/Edit form
   - Delete with confirmation
   - Password reset
   - Session management

2. **Roles & Permissions** (Priority: HIGH)
   - Role CRUD
   - Permission matrix
   - Assign permissions to roles
   - Assign roles to users

3. **Security Center** (Priority: HIGH)
   - Password policy settings
   - 2FA configuration
   - IP restrictions
   - Session management

4. **Audit Logs** (Priority: MEDIUM)
   - List with filters
   - Detail view
   - Export functionality

5. **Dashboard** (Priority: MEDIUM)
   - KPI cards
   - Activity feed
   - Charts

6. **Notifications** (Priority: LOW)
   - Create announcements
   - Delivery tracking
   - WebSocket integration

7. **Settings** (Priority: LOW)
   - General settings
   - Email configuration
   - Database backup
   - Maintenance mode

8. **Analytics** (Priority: LOW)
   - User growth
   - Login activity
   - Security metrics

### Phase 3: Testing

**Backend Tests**
```python
# apps/superadmin/backend/tests/test_users_api.py

from django.test import TestCase
from rest_framework.test import APIClient
from ..models import SuperAdminUser, Role

class UserAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_role = Role.objects.create(name='Admin')
        self.admin_user = SuperAdminUser.objects.create_user(
            email='admin@test.com',
            username='admin',
            password='test123',
            role=self.admin_role
        )
        self.client.force_authenticate(user=self.admin_user)
    
    def test_list_users(self):
        response = self.client.get('/api/superadmin/users/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
    
    def test_create_user(self):
        data = {
            'email': 'newuser@test.com',
            'username': 'newuser',
            'first_name': 'New',
            'last_name': 'User',
            'role': self.admin_role.id,
            'password': 'test123'
        }
        response = self.client.post('/api/superadmin/users/', data)
        self.assertEqual(response.status_code, 201)
    
    def test_reset_password(self):
        response = self.client.post(f'/api/superadmin/users/{self.admin_user.id}/reset-password/')
        self.assertEqual(response.status_code, 200)
```

**Frontend Tests**
```typescript
// apps/superadmin/frontend/__tests__/UsersList.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UsersList } from '../pages/Users/UsersList';
import { superadminApi } from '../services/superadminApi';

jest.mock('../services/superadminApi');

describe('UsersList', () => {
  beforeEach(() => {
    (superadminApi.users.list as jest.Mock).mockResolvedValue({
      data: {
        results: [
          { id: 1, email: 'test@test.com', first_name: 'Test', last_name: 'User', role_name: 'Admin', is_active: true }
        ],
        count: 1
      }
    });
  });
  
  it('renders user table', async () => {
    render(<UsersList />);
    await waitFor(() => {
      expect(screen.getByText('test@test.com')).toBeInTheDocument();
    });
  });
  
  it('filters users by search', async () => {
    render(<UsersList />);
    const searchInput = screen.getByPlaceholderText('Search users...');
    await userEvent.type(searchInput, 'test');
    await waitFor(() => {
      expect(superadminApi.users.list).toHaveBeenCalledWith({ search: 'test', role: '', status: '' });
    });
  });
});
```

## Critical Requirements

### Security
- All endpoints must require authentication
- Implement permission checks on every action
- Log all actions to audit trail
- Sanitize all user inputs
- Use CSRF protection
- Implement rate limiting

### Performance
- Paginate all list endpoints (default 20 items)
- Add database indexes on frequently queried fields
- Cache role/permission lookups
- Optimize N+1 queries

### Code Quality
- TypeScript strict mode
- Python type hints
- ESLint/Prettier
- Unit tests for critical paths
- Integration tests for API endpoints

## Files to Reference

**Backend:**
- `backend/apps/authentication/models.py` - User models
- `backend/apps/authentication/views.py` - Auth endpoints
- `backend/apps/authentication/enhanced_security_models.py` - Security features
- `backend/apps/authentication/permissions.py` - Permission system
- `backend/apps/notifications/` - Notification system
- `backend/apps/configuration/` - Settings & backup

**Frontend:**
- `frontend/pages/master-admin/EnhancedDashboard.tsx` - Dashboard
- `frontend/pages/master-admin/configuration/` - Settings pages
- `frontend/components/security/` - Security components
- `frontend/lib/api.ts` - API client
- `frontend/hooks/useAuth.ts` - Auth hook

## Files to EXCLUDE

DO NOT migrate these files:
- `backend/apps/authentication/service_views.py`
- `backend/apps/authentication/services_management.py`
- `frontend/pages/master-admin/ServicesManagement.tsx`
- `frontend/pages/master-admin/athens-sustainability/`
- Any file with "company" or "tenant" in the name

## Success Criteria

- [ ] All CRUD operations work
- [ ] Permission guards prevent unauthorized access
- [ ] Audit logs capture all actions
- [ ] 2FA works correctly
- [ ] IP restrictions block unauthorized IPs
- [ ] Session management allows force logout
- [ ] Database backups can be created & restored
- [ ] All tests pass
- [ ] No TypeScript/ESLint errors
- [ ] Mobile responsive
- [ ] API response time < 200ms

## Next Steps

1. Read the migration guide thoroughly
2. Review source code structure
3. Start with Phase 1 (Foundation)
4. Implement features in priority order
5. Write tests as you go
6. Document any deviations from the plan

## Questions?

If you encounter ambiguity:
1. Check the migration guide
2. Review source code
3. Follow Athens 2.0 conventions
4. Ask for clarification

---

**Ready to start? Begin with Phase 1, Step 1.**
