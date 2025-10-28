#!/bin/bash

# Fix LeadsPage.tsx - remove unused response variable
sed -i '/const response = await crmApi.convertLeadToOpportunity/s/const response = //' src/pages/services/crm/pages/LeadsPage.tsx

# Fix SalesPipeline.tsx - remove setOwnerFilter
sed -i 's/const \[ownerFilter, setOwnerFilter\]/const [ownerFilter]/' src/pages/services/crm/pages/SalesPipeline.tsx

# Fix InterviewsList.tsx - remove currentTime and setCurrentTime
sed -i 's/const \[currentTime, setCurrentTime\]/const [currentTime]/' src/pages/services/hr/components/recruitment/InterviewsList.tsx

# Fix JobShareModal.tsx - remove unused variables
sed -i 's/const \[selectedTemplate, setSelectedTemplate\]/const [selectedTemplate]/' src/pages/services/hr/components/recruitment/JobShareModal.tsx
sed -i 's/const \[selectedContacts, setSelectedContacts\]/const [selectedContacts]/' src/pages/services/hr/components/recruitment/JobShareModal.tsx

# Fix ShareAnalyticsDashboard.tsx - remove selectedJob and setSelectedJob
sed -i 's/const \[selectedJob, setSelectedJob\]/const [selectedJob]/' src/pages/services/hr/components/recruitment/ShareAnalyticsDashboard.tsx

# Fix LeaveCalendar.tsx - remove unused functions
sed -i '/const isLeaveDay = /,/}/d' src/pages/services/hr/components/leave/LeaveCalendar.tsx
sed -i '/const isHoliday = /,/}/d' src/pages/services/hr/components/leave/LeaveCalendar.tsx

# Fix Dashboard.tsx - remove unused variables
sed -i 's/const \[isChangingPassword, setIsChangingPassword\]/const [isChangingPassword]/' src/pages/services/hr/pages/Dashboard.tsx

# Fix Performance.tsx - remove unused function
sed -i '/const handleEditReview = /,/}/d' src/pages/services/hr/pages/Performance.tsx

echo "Fixed all variable errors"
