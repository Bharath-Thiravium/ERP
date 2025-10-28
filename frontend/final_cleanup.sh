#!/bin/bash

# Remove unused variables by commenting them out or using underscore prefix
sed -i 's/const isLeaveDay = /const _isLeaveDay = /' src/pages/services/hr/components/leave/LeaveCalendar.tsx
sed -i 's/const isHoliday = /const _isHoliday = /' src/pages/services/hr/components/leave/LeaveCalendar.tsx
sed -i 's/const \[currentTime\]/const [_currentTime]/' src/pages/services/hr/components/recruitment/InterviewsList.tsx
sed -i 's/const \[selectedTemplate\]/const [_selectedTemplate]/' src/pages/services/hr/components/recruitment/JobShareModal.tsx
sed -i 's/const \[selectedContacts\]/const [_selectedContacts]/' src/pages/services/hr/components/recruitment/JobShareModal.tsx
sed -i 's/const \[selectedJob\]/const [_selectedJob]/' src/pages/services/hr/components/recruitment/ShareAnalyticsDashboard.tsx
sed -i 's/const \[isChangingPassword\]/const [_isChangingPassword]/' src/pages/services/hr/pages/Dashboard.tsx
sed -i 's/const handlePasswordChange = /const _handlePasswordChange = /' src/pages/services/hr/pages/Dashboard.tsx

echo "Final cleanup completed"
