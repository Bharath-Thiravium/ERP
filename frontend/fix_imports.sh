#!/bin/bash

# Fix CampaignViewModal.tsx
sed -i 's/, Users//' src/pages/services/crm/components/CampaignViewModal.tsx

# Fix AdvancedReporting.tsx
sed -i 's/Download,//' src/pages/services/crm/pages/AdvancedReporting.tsx

# Fix LeadsPage.tsx
sed -i 's/const response = //' src/pages/services/crm/pages/LeadsPage.tsx

# Fix SalesPipeline.tsx
sed -i 's/const \[ownerFilter, setOwnerFilter\]/const [ownerFilter]/' src/pages/services/crm/pages/SalesPipeline.tsx

# Fix AdvancedReports.tsx
sed -i 's/, Calendar//' src/pages/services/hr/components/compliance/AdvancedReports.tsx

# Fix AutomationCenter.tsx
sed -i 's/Pause, //' src/pages/services/hr/components/compliance/AutomationCenter.tsx

# Fix ComplianceDashboard.tsx
sed -i 's/Shield, //' src/pages/services/hr/components/compliance/ComplianceDashboard.tsx
sed -i 's/, BarChart3//' src/pages/services/hr/components/compliance/ComplianceDashboard.tsx

# Fix EmployeeForm.tsx
sed -i 's/, Plus//' src/pages/services/hr/components/employees/EmployeeForm.tsx

# Fix LeaveApplications.tsx
sed -i 's/Calendar, //' src/pages/services/hr/components/leave/LeaveApplications.tsx
sed -i 's/, Clock//' src/pages/services/hr/components/leave/LeaveApplications.tsx
sed -i 's/, Filter//' src/pages/services/hr/components/leave/LeaveApplications.tsx

# Fix LeaveBalances.tsx
sed -i 's/, TrendingUp//' src/pages/services/hr/components/leave/LeaveBalances.tsx

# Fix LeaveSettings.tsx
sed -i 's/Save, //' src/pages/services/hr/components/leave/LeaveSettings.tsx

# Fix JobShareModal.tsx
sed -i 's/, Copy//' src/pages/services/hr/components/recruitment/JobShareModal.tsx
sed -i 's/, Zap//' src/pages/services/hr/components/recruitment/JobShareModal.tsx

# Fix ShareAnalyticsDashboard.tsx
sed -i 's/, Users//' src/pages/services/hr/components/recruitment/ShareAnalyticsDashboard.tsx

# Fix HRSettings.tsx
sed -i 's/Clock,//' src/pages/services/hr/components/settings/HRSettings.tsx
sed -i 's/Calculator,//' src/pages/services/hr/components/settings/HRSettings.tsx
sed -i 's/Users,//' src/pages/services/hr/components/settings/HRSettings.tsx
sed -i 's/Calendar,//' src/pages/services/hr/components/settings/HRSettings.tsx

# Fix GovernmentReturns.tsx
sed -i 's/, CardHeader//' src/pages/services/hr/components/statutory/GovernmentReturns.tsx
sed -i 's/, CardTitle//' src/pages/services/hr/components/statutory/GovernmentReturns.tsx

# Fix StatutoryDashboard.tsx
sed -i 's/, Users//' src/pages/services/hr/components/statutory/StatutoryDashboard.tsx
sed -i 's/, BarChart3//' src/pages/services/hr/components/statutory/StatutoryDashboard.tsx

# Fix SystemStatus.tsx
sed -i 's/, Shield//' src/pages/services/hr/components/system/SystemStatus.tsx

echo "Fixed all import errors"
