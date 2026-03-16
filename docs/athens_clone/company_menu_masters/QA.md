# Athens Sustainability Company Menu - QA Checklist

## Overview
This document provides a comprehensive QA checklist for the Athens Sustainability implementation as a separate Company menu section in SAP-Python.

## Backend QA Checklist

### Service Gating
- [ ] Athens Sustainability service exists in database (service_type='athens_sustainability')
- [ ] `IsAthensSustainabilityEnabled` permission blocks access when service disabled
- [ ] All Athens endpoints return 403 when service not enabled for company
- [ ] Service enabled companies can access all Athens endpoints

### Company Scoping & Data Isolation
- [ ] All Athens projects filtered by company (no cross-company access)
- [ ] Project creation automatically assigns current user's company
- [ ] Project updates only work for projects in same company
- [ ] Project deletion only works for projects in same company
- [ ] Cross-company project ID access returns 404 (not 403 to avoid revealing existence)

### API Endpoints Functionality
- [ ] `GET /api/athens-sust/projects/` - Lists company projects
- [ ] `POST /api/athens-sust/projects/` - Creates project with company scoping
- [ ] `PUT /api/athens-sust/projects/<id>/` - Updates company project
- [ ] `DELETE /api/athens-sust/projects/<id>/` - Archives company project
- [ ] `GET /api/athens-sust/dashboard/overview/` - Returns company dashboard data
- [ ] `POST /api/athens-sust/dashboard/select_project/` - Sets project context
- [ ] `GET /api/athens-sust/dashboard/current_project/` - Gets current project
- [ ] `GET /api/athens-sust/members/` - Lists project members for company
- [ ] `POST /api/athens-sust/members/` - Creates project member assignments

### Data Validation
- [ ] Project deadline must be after commencement date
- [ ] Required fields validation (name, category, location, dates)
- [ ] Project categories match Athens specification
- [ ] Emergency contact fields accept optional data
- [ ] Latitude/longitude fields accept numeric values

### Permission Classes
- [ ] `IsAuthenticated` applied to all endpoints
- [ ] `IsAthensSustainabilityEnabled` applied to all Athens endpoints
- [ ] `CompanyScopedModelViewSet` enforces company filtering
- [ ] Masters can access all projects in their company (no project-level filtering)

## Frontend QA Checklist

### Menu Integration
- [ ] "Athens Sustainability" section appears in Company sidebar
- [ ] Menu section only visible when service enabled
- [ ] Menu items: Dashboard, Projects, Admin Management, Pending Approvals, Company Settings
- [ ] Menu section hidden when service disabled
- [ ] Direct route access redirects to company dashboard when service disabled

### Athens Dashboard
- [ ] Dashboard loads when service enabled
- [ ] Overview stats display correctly (total projects, active projects, members, deadlines)
- [ ] Project categories chart shows distribution
- [ ] Recent activities list displays latest project updates
- [ ] Upcoming deadlines show projects due in next 30 days
- [ ] Quick action buttons navigate to correct tabs
- [ ] Error state shows when service not enabled

### Projects Management
- [ ] Projects list loads all company projects
- [ ] Create project modal opens and functions correctly
- [ ] All required fields validated before submission
- [ ] Project categories dropdown populated from Athens specification
- [ ] Date validation (deadline after commencement)
- [ ] Edit project modal pre-populates with existing data
- [ ] View project modal displays all project details in read-only format
- [ ] Archive project confirmation and execution
- [ ] Project cards show correct status (Active/Archived)
- [ ] Member count displays correctly
- [ ] Emergency contacts display when available

### State Management
- [ ] `useAthensSustainabilityEnabled` hook checks service status
- [ ] Auth storage maintains Athens-compatible format
- [ ] localStorage key uses exact name `auth-storage`
- [ ] User type normalized to 'masteradmin' for Athens context
- [ ] Project context remains null for Masters (no global project selector)
- [ ] Token interceptor adds Bearer authorization to requests

### Error Handling
- [ ] Service disabled shows appropriate error message
- [ ] Network errors handled gracefully
- [ ] Form validation errors displayed to user
- [ ] Loading states shown during API calls
- [ ] Success messages shown for completed actions

### UI/UX Compliance
- [ ] Uses existing SAP components (no new CSS frameworks)
- [ ] Modal behaviors match Athens specification (overlay on list)
- [ ] Responsive design works on mobile/tablet
- [ ] Dark mode support consistent with SAP theme
- [ ] Loading spinners and states consistent with SAP patterns
- [ ] Button styles and interactions match SAP design system

## Integration QA Checklist

### Authentication Flow
- [ ] Company user login works normally
- [ ] Athens menu appears after login when service enabled
- [ ] JWT tokens work with Athens endpoints
- [ ] Token refresh works seamlessly
- [ ] Logout clears Athens context

### Service Management
- [ ] Master admin can assign Athens Sustainability service to companies
- [ ] Service assignment immediately enables Athens menu
- [ ] Service removal immediately hides Athens menu
- [ ] Service users can be created for Athens Sustainability service

### Data Consistency
- [ ] Dashboard stats match actual project counts
- [ ] Project member counts accurate
- [ ] Recent activities reflect actual project changes
- [ ] Upcoming deadlines calculated correctly (next 30 days)
- [ ] Project categories aggregation correct

### Performance
- [ ] Dashboard loads within 2 seconds
- [ ] Projects list loads within 2 seconds
- [ ] Modal open/close animations smooth
- [ ] No memory leaks in React components
- [ ] API calls properly cached/invalidated

## Security QA Checklist

### Access Control
- [ ] Only company users with Athens service can access endpoints
- [ ] Cross-company data access blocked at model level
- [ ] SQL injection protection in all queries
- [ ] XSS protection in all user inputs
- [ ] CSRF protection on state-changing operations

### Data Privacy
- [ ] Company data isolation enforced
- [ ] No data leakage between companies
- [ ] Audit logs record Athens operations
- [ ] User permissions respected throughout

## Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Test Scenarios

### Happy Path
1. Company user logs in
2. Athens Sustainability service enabled for company
3. User navigates to Athens Sustainability menu
4. Dashboard loads with overview data
5. User creates new project
6. User edits existing project
7. User views project details
8. User archives project

### Error Scenarios
1. Service not enabled - menu hidden, direct access blocked
2. Network error during API call - graceful error handling
3. Invalid form data - validation errors shown
4. Cross-company access attempt - 404 response
5. Token expiry during operation - automatic refresh

### Edge Cases
1. Empty project list - appropriate empty state
2. No upcoming deadlines - empty state shown
3. Very long project names - UI handles gracefully
4. Special characters in project data - properly escaped
5. Date edge cases (leap years, timezone handling)

## Deployment Checklist
- [ ] Athens Sustainability service exists in production database
- [ ] Migration applied successfully
- [ ] Frontend build includes Athens components
- [ ] API endpoints accessible in production
- [ ] Service assignment works for test company
- [ ] End-to-end test passes in production environment

## Sign-off
- [ ] Backend functionality verified
- [ ] Frontend functionality verified
- [ ] Integration testing completed
- [ ] Security review passed
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Ready for production deployment