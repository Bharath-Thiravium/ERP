# Athens Masters Workflow Sequences Parity Documentation

## Overview
This document defines the exact workflow sequences that Athens Masters follow, which must be replicated in SAP Company menu implementation.

## Core Athens Masters Workflows (from docs)

### 1. Login → Dashboard Workflow
**Athens Sequence:**
1. User navigates to `/login`
2. Submits credentials to `POST /authentication/login/`
3. Backend validates and returns JWT tokens
4. Frontend stores tokens in `localStorage['auth-storage']`
5. User automatically redirected to `/dashboard` (Masters landing page)
6. Dashboard loads with Masters overview data

**SAP Implementation:**
1. Company user logs into SAP system
2. Navigates to "Athens Sustainability" menu section
3. System checks service enabled via `IsAthensSustainabilityEnabled`
4. If enabled, loads `/company/athens-sustainability/dashboard`
5. Dashboard calls `GET /api/athens-sust/dashboard/overview/`
6. Display Masters overview with company-scoped data

### 2. Dashboard → Projects List Workflow
**Athens Sequence:**
1. From `/dashboard`, user clicks "Projects" or navigates to `/projects`
2. Frontend calls `GET /authentication/project/list/`
3. Backend returns all projects for the tenant (Masters see all)
4. Display projects list with create/edit/view actions

**SAP Implementation:**
1. From Athens dashboard, user clicks "Projects" menu item
2. Navigate to `/company/athens-sustainability/projects`
3. Frontend calls `GET /api/athens-sust/projects/`
4. Backend returns all projects for the company (Masters see all)
5. Display projects list with same Athens UI patterns

### 3. Project Create Workflow
**Athens Sequence:**
1. From projects list, click "Create Project"
2. Open modal overlay (ProjectCreation modal behavior)
3. User fills project form (category, capacity, location, dates, emergency contacts)
4. Submit calls `POST /authentication/master-admin/projects/create/`
5. Backend creates project with tenant association
6. Modal closes, projects list refreshes
7. New project appears in list

**SAP Implementation:**
1. From projects list, click "Create Project"
2. Open modal overlay using SAP modal components
3. Form fields match Athens project model exactly
4. Submit calls `POST /api/athens-sust/projects/`
5. Backend creates project with company association
6. Modal closes, projects list refreshes
7. New project appears in list

### 4. Project Edit Workflow
**Athens Sequence:**
1. From projects list, click "Edit" on project row
2. Open modal overlay (ProjectEdit modal behavior)
3. Modal pre-populated with project data
4. User modifies fields
5. Submit calls `PUT /authentication/project/update/<id>/`
6. Backend updates project
7. Modal closes, projects list refreshes

**SAP Implementation:**
1. From projects list, click "Edit" on project row
2. Open modal overlay using SAP modal components
3. Modal pre-populated with project data
4. User modifies fields
5. Submit calls `PUT /api/athens-sust/projects/<id>/`
6. Backend updates project (company-scoped)
7. Modal closes, projects list refreshes

### 5. Project View Workflow
**Athens Sequence:**
1. From projects list, click "View" on project row
2. Open read-only modal overlay (ProjectView modal behavior)
3. Display all project details
4. Show project members/admins
5. Modal has close action only

**SAP Implementation:**
1. From projects list, click "View" on project row
2. Open read-only modal overlay using SAP modal components
3. Display all project details
4. Show project members via `GET /api/athens-sust/members/?project_id=<id>`
5. Modal has close action only

### 6. Create Project Admins Workflow
**Athens Sequence:**
1. From project view/edit, access admin management
2. Click "Create Admins" or similar action
3. Form to create/assign project administrators
4. Submit calls `POST /authentication/master-admin/projects/create-admins/`
5. Backend creates admin users and assigns to project
6. Admin receives credentials/invitation
7. Admin list refreshes

**SAP Implementation:**
1. From Admin Management menu or project context
2. Click "Create Project Admin"
3. Form to select company users and assign roles
4. Submit calls `POST /api/athens-sust/members/`
5. Backend creates project member assignments
6. Member receives notification (if configured)
7. Members list refreshes

### 7. Approvals Workflow
**Athens Sequence:**
1. Masters navigate to approvals section
2. Call `GET /authentication/admin/pending-details/` for pending admin approvals
3. Call `GET /authentication/userdetail/pending/` for pending user details
4. Display pending items in approval queue
5. Masters review and approve/reject
6. Submit `POST /authentication/admin/detail/approve/<user_id>/`
7. Submit `POST /authentication/userdetail/approve/<pk>/`
8. Approved items removed from queue

**SAP Implementation:**
1. Masters navigate to "Pending Approvals" menu
2. Call `GET /api/athens-sust/approvals/admin-details/`
3. Call `GET /api/athens-sust/approvals/user-details/`
4. Display pending items in approval queue
5. Masters review and approve/reject
6. Submit `POST /api/athens-sust/approvals/admin-details/<user_id>/approve/`
7. Submit `POST /api/athens-sust/approvals/user-details/<pk>/approve/`
8. Approved items removed from queue

## Context Chain Enforcement

### Athens Context Chain (from docs)
1. **Request** → Incoming HTTP request
2. **Auth** → JWT token validation
3. **Tenant Resolution** → Extract tenant from user context
4. **Master Validation** → Verify user is master admin
5. **Data Access** → Filter all data by tenant scope

### SAP Context Chain Implementation
1. **Request** → Incoming HTTP request
2. **Auth** → JWT token validation (SAP tokens)
3. **Company Resolution** → Extract company from CompanyUser
4. **Service Validation** → Verify Athens Sustainability enabled
5. **Master Validation** → Verify user has Athens access
6. **Data Access** → Filter all data by company scope

## Data Scoping Rules

### Athens Masters Scoping
- Masters operate at **TENANT** scope
- See ALL projects in their tenant
- No project-level filtering for Masters
- `projectId = null` in Masters context

### SAP Masters Scoping
- Masters operate at **COMPANY** scope
- See ALL projects in their company
- No project-level filtering for Masters
- `projectId = null` in Masters context
- Company isolation enforced at model level

## Error Handling Workflows

### Service Not Enabled
1. User tries to access Athens Sustainability menu
2. `useAthensSustainabilityEnabled()` hook checks service status
3. If not enabled, hide menu section
4. If user directly accesses route, redirect to company dashboard
5. Show error message: "Athens Sustainability service not enabled"

### Permission Denied
1. User tries to access Athens endpoint
2. `IsAthensSustainabilityEnabled` permission check fails
3. Return 403 Forbidden
4. Frontend shows appropriate error message
5. Redirect to company dashboard

### Cross-Company Access Attempt
1. User tries to access project from different company
2. `CompanyScopedModelViewSet` filters by company
3. Return 404 Not Found (don't reveal existence)
4. Frontend handles as normal "not found" error

## Implementation Sequence

### Phase 1: Backend Workflows
1. Implement all Athens API endpoints with company scoping
2. Add permission classes for service gating
3. Test all CRUD operations with company isolation
4. Verify approval workflows work correctly

### Phase 2: Frontend Workflows
1. Add Athens Sustainability menu section
2. Implement dashboard with overview data
3. Create projects list with modal behaviors
4. Add admin management and approvals pages
5. Test complete user workflows

### Phase 3: Integration Testing
1. Test login → dashboard → projects workflow
2. Test project create/edit/view workflows
3. Test admin creation and approval workflows
4. Test service enable/disable scenarios
5. Test cross-company isolation

## Workflow Validation Checklist
- [ ] Login redirects to Athens dashboard when service enabled
- [ ] Dashboard loads company-scoped overview data
- [ ] Projects list shows all company projects (Masters scope)
- [ ] Project create/edit/view modals work as Athens originals
- [ ] Admin creation assigns users to projects correctly
- [ ] Approval workflows process pending items
- [ ] Service disabled scenarios handled gracefully
- [ ] All data properly scoped to company (no cross-company access)
- [ ] Error handling matches Athens patterns
- [ ] Modal behaviors match Athens UI patterns