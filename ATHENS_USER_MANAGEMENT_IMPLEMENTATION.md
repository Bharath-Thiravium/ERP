# Athens User Management System Implementation

## Overview

This implementation provides a complete user management system for the Athens Sustainability platform according to the specifications in `/var/www/SAP-Python/docs/specs/user_management_logic_workflow_spec.md`.

## Key Features Implemented

### 1. User Hierarchy & Types
- **Master Admin**: Can create projects and Project Admins
- **Project Admin**: Can create Users (employees) within their project/company scope
- **Users (Employees)**: Standard end users with profile completion workflow

### 2. Permission System
- **Scope Enforcement**: Project Admins can only create/manage users within their project and company
- **Role Restrictions**: Project Admins CANNOT create other admin roles (enforced by `NoAdminCreationInProjectScope` permission)
- **Access Control**: Centralized access state calculation for frontend route guards

### 3. User Creation Workflow
- **Auto-generated passwords**: 16-character secure passwords
- **Credential download**: Automatic credential file generation
- **Grade suggestion**: Auto-suggest grade based on designation
- **Company inheritance**: Users inherit project and company from creator

### 4. Profile Management
- **Detailed profiles**: Complete user information including documents
- **Approval workflow**: Project Admins approve user profiles
- **Digital signatures**: Auto-generated signature templates
- **Validation**: Comprehensive field validation (age, PAN format, etc.)

## File Structure

### Backend Files
```
backend/athens_sustainability/
├── user_management_models.py          # Data models
├── user_management_serializers.py     # API serializers
├── user_management_permissions.py     # Permission classes
├── user_management_views.py           # API views
├── user_management_urls.py            # URL routing
├── test_user_management.py            # Test cases
└── migrations/
    └── 0004_athens_user_management_models.py
```

### Frontend Files
```
frontend/src/components/athens/
└── AthensUserManagement.tsx           # React component
```

## API Endpoints

### User Management
- `GET /api/athens/user-management/users/` - List users (scoped)
- `POST /api/athens/user-management/users/` - Create user
- `POST /api/athens/user-management/users/{id}/approve_profile/` - Approve profile
- `POST /api/athens/user-management/users/{id}/reset_password/` - Reset password

### Project Admin Management
- `GET /api/athens/user-management/project-admins/` - List project admins (Master Admin only)
- `POST /api/athens/user-management/project-admins/` - Create project admin (Master Admin only)

### Profile Management
- `GET /api/athens/user-management/profiles/me/` - Get own profile
- `PATCH /api/athens/user-management/profiles/me/` - Update own profile
- `POST /api/athens/user-management/profiles/submit_for_approval/` - Submit for approval

### Access State
- `GET /api/athens/user-management/access-state/current_state/` - Get access state

## Key Models

### AthensUserProfile
- Complete user profile with personal, official, and identity details
- Document attachments (photo, PAN, Aadhaar)
- Approval workflow fields

### AthensProjectAdmin
- Project Admin credentials and assignment
- Admin type (Client/EPC/Contractor)
- Password management flags

### AthensUserCreationLog
- Audit trail for all user management actions
- Tracks creator, target user, and action details

### AthensDigitalSignature
- Auto-generated signature templates
- Created upon profile approval

## Permission Classes

### IsProjectAdmin
- Validates user is a Project Admin

### CanCreateUsers
- Master Admin can create Project Admins
- Project Admin can create Users

### NoAdminCreationInProjectScope
- Prevents Project Admins from creating admin roles
- Enforces the "only Users (employees)" rule

### Scope Enforcement
- `assert_project_admin_scope()` utility function
- Validates project and company boundaries

## Frontend Component Features

### AthensUserManagement
- User listing with search and filters
- Create user modal with form validation
- Approval actions (approve/reject)
- Password reset functionality
- Credential download

### User Creation Flow
1. Project Admin fills form
2. System auto-fills username from email
3. System suggests grade based on designation
4. Secure password generated
5. User created with inherited scope
6. Credentials downloaded as text file

## Security Features

### Password Management
- 16-character auto-generated passwords
- Password expiration (90 days)
- Mandatory password reset on first login
- Secure password reset functionality

### Audit Logging
- All user management actions logged
- Creator, target user, and action details tracked
- Audit trail for compliance

### Scope Isolation
- Project-based data isolation
- Company-based access control
- Permission-based API access

## Access State Management

The system provides centralized access state calculation:

### Access Stages
- `MUST_RESET_PASSWORD`: Password reset required
- `MUST_COMPLETE_PROFILE`: Profile completion required
- `PENDING_APPROVAL`: Profile pending approval
- `APPROVED_INDUCTION_PENDING`: Induction completion required
- `FULL_ACCESS`: Full system access

### Frontend Integration
- Single endpoint for access state
- Route guards based on access stage
- Menu visibility control

## Testing

Comprehensive test suite covering:
- User creation workflows
- Permission enforcement
- Scope validation
- Access state calculation
- Audit logging
- Button visibility rules

## Installation & Setup

### 1. Run Migrations
```bash
cd /var/www/SAP-Python/backend
python manage.py makemigrations athens_sustainability
python manage.py migrate
```

### 2. Test Implementation
```bash
python manage.py test athens_sustainability.test_user_management
```

### 3. Frontend Integration
The React component can be integrated into your existing Athens dashboard routing.

## Compliance with Specification

✅ **User Hierarchy**: Master Admin → Project Admin → Users  
✅ **Role Restrictions**: Project Admin cannot create admin roles  
✅ **Scope Enforcement**: Project and company isolation  
✅ **Password Management**: Auto-generation and reset  
✅ **Profile Workflow**: Complete → Submit → Approve  
✅ **Access State**: Centralized calculation  
✅ **Audit Logging**: Complete action tracking  
✅ **Button Visibility**: Permission-based UI controls  

## Next Steps

1. **Database Migration**: Run the migration to create the new models
2. **Frontend Integration**: Add the component to your routing system
3. **Testing**: Run the test suite to verify functionality
4. **Configuration**: Update any project-specific settings
5. **Documentation**: Update API documentation if needed

The implementation follows the specification exactly and provides a robust, secure user management system with proper scope enforcement and audit trails.