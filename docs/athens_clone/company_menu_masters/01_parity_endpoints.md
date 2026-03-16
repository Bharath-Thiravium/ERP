# Athens Masters API Endpoints Parity Documentation

## Overview
This document maps Athens Masters API endpoints to SAP backend implementation.

## Athens Masters API Endpoints (from docs)
Based on the requirements, Athens Masters use these endpoints:

### Authentication
- `POST /authentication/login/` - Login endpoint (already exists in SAP)

### Project Management (Masters Core)
- `GET /authentication/project/list/` - List all projects for master
- `POST /authentication/master-admin/projects/create/` - Create new project
- `PUT /authentication/project/update/<id>/` - Update project
- `DELETE /authentication/project/delete/<id>/` - Delete project (with dependency check)
- `GET /authentication/project/delete/<id>/` - Check delete dependencies

### Admin Management (Masters Only)
- `POST /authentication/master-admin/projects/create-admins/` - Create project admins
- `POST /authentication/master-admin/reset-admin-password/` - Reset admin password

### Approval Workflows (Masters)
- `GET /authentication/admin/pending-details/` - Get pending admin details
- `POST /authentication/admin/detail/approve/<user_id>/` - Approve admin details
- `GET /authentication/userdetail/pending/` - Get pending user details
- `POST /authentication/userdetail/approve/<pk>/` - Approve user details

## SAP Backend Endpoint Mapping

### Base URL Pattern
SAP Athens endpoints: `/api/athens-sust/`

### Authentication (Existing)
- `POST /api/auth/login/` - SAP login (ensure supports Athens claims)

### Project Management
- `GET /api/athens-sust/projects/` → Athens: `GET /authentication/project/list/`
- `POST /api/athens-sust/projects/` → Athens: `POST /authentication/master-admin/projects/create/`
- `PUT /api/athens-sust/projects/<id>/` → Athens: `PUT /authentication/project/update/<id>/`
- `DELETE /api/athens-sust/projects/<id>/` → Athens: `DELETE /authentication/project/delete/<id>/`
- `GET /api/athens-sust/projects/<id>/delete-check/` → Athens: `GET /authentication/project/delete/<id>/`

### Project Members (Admin Management)
- `POST /api/athens-sust/members/` → Athens: `POST /authentication/master-admin/projects/create-admins/`
- `POST /api/athens-sust/members/<id>/reset-password/` → Athens: `POST /authentication/master-admin/reset-admin-password/`

### Approval Workflows
- `GET /api/athens-sust/approvals/admin-details/` → Athens: `GET /authentication/admin/pending-details/`
- `POST /api/athens-sust/approvals/admin-details/<user_id>/approve/` → Athens: `POST /authentication/admin/detail/approve/<user_id>/`
- `GET /api/athens-sust/approvals/user-details/` → Athens: `GET /authentication/userdetail/pending/`
- `POST /api/athens-sust/approvals/user-details/<pk>/approve/` → Athens: `POST /authentication/userdetail/approve/<pk>/`

### Dashboard (Additional)
- `GET /api/athens-sust/dashboard/overview/` - Dashboard data for masters
- `POST /api/athens-sust/dashboard/select_project/` - Project selection (context)
- `GET /api/athens-sust/dashboard/current_project/` - Get current project context

## Endpoint Requirements

### Company Scoping
All endpoints must:
- Filter data by `company` field (SAP equivalent of Athens `tenant`)
- Use `CompanyScopedModelViewSet` base class
- Apply `IsAthensSustainabilityEnabled` permission

### Permission Classes
Each endpoint must have:
1. `IsAuthenticated` - User must be logged in
2. `IsAthensSustainabilityEnabled` - Service must be enabled for company
3. `IsAthensSustProjectMember` - For project-specific operations (where applicable)

### Request/Response Format
- Maintain same JSON structure as Athens where possible
- Company field automatically injected (not in request body)
- Error responses follow SAP standard format

### Authentication
- Use SAP JWT tokens (Bearer authorization)
- Token must contain company context
- Masters identified by user role/permissions within company

## Data Model Mapping

### Athens Project → SAP AthensSustProject
- `athens_tenant_id` → `company` (ForeignKey to Company)
- All other fields maintain same names/types
- Add SAP audit fields (created_by, created_at, updated_at)

### Athens Admin → SAP AthensSustProjectMember
- Project admin assignments
- Role-based access within projects
- Company-scoped through project relationship

## Implementation Notes
- All endpoints must be company-isolated
- No cross-company data access allowed
- Masters see ALL projects in their company (no project filtering)
- Maintain Athens API semantics but with SAP security model