#!/bin/bash

# Remove unused variables completely
sed -i '/const \[accounts, setAccounts\]/d' src/pages/services/crm/components/ActivityModal.tsx
sed -i '/const \[opportunities, setOpportunities\]/d' src/pages/services/crm/components/ActivityModal.tsx
sed -i '/const _isLeaveDay = /,/}/d' src/pages/services/hr/components/leave/LeaveCalendar.tsx
sed -i '/const _isHoliday = /,/}/d' src/pages/services/hr/components/leave/LeaveCalendar.tsx
sed -i '/const _handlePasswordChange = /,/}/d' src/pages/services/hr/pages/Dashboard.tsx

echo "Removed all unused variables"
