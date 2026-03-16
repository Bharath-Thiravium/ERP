# Athens Masters Routes Parity Documentation

## Overview
This document maps Athens Masters routes to SAP Company menu implementation.

## Athens Masters Original Routes (from docs)
Based on the requirements, Athens Masters uses these routes:

### Authentication & Landing
- `/login` - Athens login page
- `/dashboard` - Masters land here after login (main dashboard)

### Project Management (Masters Core Functionality)
- `/projects` - Projects list page (ProjectsList.tsx)
- `/projects/create` - Project creation modal behavior
- `/projects/edit/:id` - Project edit modal behavior  
- `/projects/view/:id` - Project view modal behavior

### Admin Management (Masters Only)
- `/superadmin/masters` - Masters management by Superadmin
- Admin creation/assignment flows
- Approvals pages that Masters use

## SAP Company Menu Mapping

### New Company Sidebar Section: "Athens Sustainability"
Under the Company user sidebar, add new section with these menu items:

#### 1. Dashboard
- **SAP Route**: `/company/athens-sustainability/dashboard`
- **Athens Equivalent**: `/dashboard`
- **Purpose**: Masters main landing page with overview data

#### 2. Projects
- **SAP Route**: `/company/athens-sustainability/projects`
- **Athens Equivalent**: `/projects`
- **Purpose**: Projects list/create/edit/view functionality

#### 3. Admin Management
- **SAP Route**: `/company/athens-sustainability/admin-management`
- **Athens Equivalent**: Admin creation/assignment flows
- **Purpose**: Create project admins and manage assignments

#### 4. Pending Approvals
- **SAP Route**: `/company/athens-sustainability/approvals`
- **Athens Equivalent**: Approvals pages from workflows
- **Purpose**: Handle pending admin/project approvals

#### 5. Company Settings
- **SAP Route**: `/company/athens-sustainability/settings`
- **Athens Equivalent**: Company-level Athens configuration
- **Purpose**: Athens-specific company settings

## Route Behavior Requirements

### Modal Behaviors (Keep Same as Athens)
- Project create: Modal overlay on projects list
- Project edit: Modal overlay with project data
- Project view: Read-only modal overlay

### Navigation Flow
1. Company user login → Company dashboard
2. Click "Athens Sustainability" menu → Athens dashboard
3. Navigate within Athens section (no global project selector)
4. All routes scoped to company context

### Access Control
- Routes only accessible if Athens Sustainability service enabled
- Redirect to company dashboard with error if service disabled
- All data filtered by company scope (no cross-company access)

## Implementation Notes
- Use SAP existing components/CSS (no new frameworks)
- Maintain Athens route behaviors but mount under Company menu
- Masters operate at TENANT scope (projectId = null in Athens context)
- Keep same API call sequences as Athens docs specify