#!/bin/bash

# Fix ActivityModal.tsx - remove unused variables
sed -i '/const \[accounts, setAccounts\]/d' src/pages/services/crm/components/ActivityModal.tsx
sed -i '/const \[opportunities, setOpportunities\]/d' src/pages/services/crm/components/ActivityModal.tsx

# Fix LeaveCalendar.tsx - remove unused functions
sed -i '/const isLeaveDay = /,/}/d' src/pages/services/hr/components/leave/LeaveCalendar.tsx
sed -i '/const isHoliday = /,/}/d' src/pages/services/hr/components/leave/LeaveCalendar.tsx

# Fix InterviewsList.tsx - remove unused variable
sed -i 's/const \[currentTime, setCurrentTime\]/const [currentTime]/' src/pages/services/hr/components/recruitment/InterviewsList.tsx
sed -i '/setCurrentTime/d' src/pages/services/hr/components/recruitment/InterviewsList.tsx

# Fix JobShareModal.tsx - remove unused variables
sed -i 's/const \[selectedTemplate, setSelectedTemplate\]/const [selectedTemplate]/' src/pages/services/hr/components/recruitment/JobShareModal.tsx
sed -i 's/const \[selectedContacts, setSelectedContacts\]/const [selectedContacts]/' src/pages/services/hr/components/recruitment/JobShareModal.tsx
sed -i '/setSelectedTemplate/d' src/pages/services/hr/components/recruitment/JobShareModal.tsx

# Fix ShareAnalyticsDashboard.tsx - remove unused variable
sed -i 's/const \[selectedJob, setSelectedJob\]/const [selectedJob]/' src/pages/services/hr/components/recruitment/ShareAnalyticsDashboard.tsx
sed -i '/setSelectedJob/d' src/pages/services/hr/components/recruitment/ShareAnalyticsDashboard.tsx

# Fix Dashboard.tsx - remove unused variables
sed -i 's/const \[isChangingPassword, setIsChangingPassword\]/const [isChangingPassword]/' src/pages/services/hr/pages/Dashboard.tsx
sed -i '/const handlePasswordChange = /,/}/d' src/pages/services/hr/pages/Dashboard.tsx
sed -i '/setIsChangingPassword/d' src/pages/services/hr/pages/Dashboard.tsx

echo "Fixed all remaining errors"
