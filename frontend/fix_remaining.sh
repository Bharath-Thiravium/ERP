#!/bin/bash

# Fix LeaveCalendar.tsx - remove unused index parameter
sed -i 's/{dayLeaves.slice(0, 2).map((leave, index) =>/{dayLeaves.slice(0, 2).map((leave) =>/' src/pages/services/hr/components/leave/LeaveCalendar.tsx

# Fix ShareAnalyticsDashboard.tsx - remove unused index parameters
sed -i 's/{dashboardData.platform_stats.map((platform: any, index: number) =>/{dashboardData.platform_stats.map((platform: any) =>/' src/pages/services/hr/components/recruitment/ShareAnalyticsDashboard.tsx
sed -i 's/{dashboardData.top_jobs.map((job: any, index: number) =>/{dashboardData.top_jobs.map((job: any) =>/' src/pages/services/hr/components/recruitment/ShareAnalyticsDashboard.tsx

# Fix Dashboard.tsx - remove unused imports and variables
sed -i 's/Search,//' src/pages/services/hr/pages/Dashboard.tsx
sed -i 's/Filter,//' src/pages/services/hr/pages/Dashboard.tsx
sed -i 's/RefreshCw,//' src/pages/services/hr/pages/Dashboard.tsx
sed -i 's/User,//' src/pages/services/hr/pages/Dashboard.tsx

# Remove unused Card imports from Dashboard.tsx
sed -i '/import { Card, CardContent, CardDescription, CardHeader, CardTitle }/d' src/pages/services/hr/pages/Dashboard.tsx

# Fix Dashboard.tsx - remove unused function
sed -i '/const handlePasswordChange = /,/}/d' src/pages/services/hr/pages/Dashboard.tsx

# Fix GovernmentPortal.tsx - remove unused imports
sed -i 's/, FileText//' src/pages/services/hr/pages/GovernmentPortal.tsx
sed -i 's/, Settings//' src/pages/services/hr/pages/GovernmentPortal.tsx

# Fix LeaveManagement.tsx - remove unused import
sed -i 's/, Clock//' src/pages/services/hr/pages/LeaveManagement.tsx

# Fix inventory Dashboard.tsx - remove unused imports
sed -i 's/Plus,//' src/pages/services/inventory/pages/Dashboard.tsx
sed -i 's/Search,//' src/pages/services/inventory/pages/Dashboard.tsx
sed -i 's/Filter,//' src/pages/services/inventory/pages/Dashboard.tsx
sed -i 's/Calendar,//' src/pages/services/inventory/pages/Dashboard.tsx

echo "Fixed remaining errors"
