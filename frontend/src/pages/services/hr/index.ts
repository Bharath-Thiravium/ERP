// Main Dashboard
export { default as HRDashboard } from './pages/Dashboard'

// Individual Pages
export { default as Employees } from './pages/Employees'
export { default as Recruitment } from './pages/Recruitment'
export { default as Payroll } from './pages/Payroll'
export { default as Performance } from './pages/Performance'
export { default as Attendance } from './pages/Attendance'
export { default as Analytics } from './pages/Analytics'

// Components
export { default as EmployeeList } from './components/employees/EmployeeList'
export { default as EmployeeForm } from './components/employees/EmployeeForm'
export { default as JobPostingList } from './components/recruitment/JobPostingList'
export { default as PayrollDashboard } from './components/payroll/PayrollDashboard'
export { default as PerformanceOverview } from './components/performance/PerformanceOverview'
export { default as AttendanceTracker } from './components/attendance/AttendanceTracker'
export { default as HRAnalytics } from './components/analytics/HRAnalytics'

// Types
export * from './types/hrTypes'