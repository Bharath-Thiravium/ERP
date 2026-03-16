import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  Settings,
  LogOut,
  Sun,
  Moon,
  Shield,
  
  
  Calendar,
  
  ChevronRight,
  Building,
  
  BarChart3,
  UserPlus,
  Clock,
  CheckCircle,
  FileText,
  Briefcase
} from 'lucide-react'
// import { useAuthStore } from '../../../../store/authStore'
import { useThemeStore } from '../../../../store/themeStore'
import api from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Button } from '../../../../components/ui/Button'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useSessionValidation } from '../../../../hooks/useSessionValidation'
// toast import removed as it's not used

const HRDashboard: React.FC = () => {
  const navigate = useNavigate()
  // const { logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { serviceUser, sessionKey, logout: serviceUserLogout } = useServiceUserStore()
  
  // Add session validation
  useSessionValidation()

  const [activeTab, setActiveTab] = useState('overview')
  
  // Ensure overview is highlighted by default
  useEffect(() => {
    if (!activeTab) {
      setActiveTab('overview')
    }
  }, [])
  const [isLoading, setIsLoading] = useState(true)
  const [companyData, setCompanyData] = useState<any>(null)
  // Password data state removed as it's not used
  // Removed unused isChangingPassword state

  // HR Data state
  const [hrData] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    newHires: 0,
    pendingOnboarding: 0,
    completedOnboarding: 0,
    totalDepartments: 0,
    recentActivity: [] as any[]
  })

  // Fetch company data including logo
  const fetchCompanyData = async () => {
    try {
      const currentSessionKey = useServiceUserStore.getState().sessionKey
      console.log('🔍 DEBUG: fetchCompanyData called')
      console.log('🔍 DEBUG: serviceUser?.company_id:', serviceUser?.company_id)
      console.log('🔍 DEBUG: sessionKey from props:', !!sessionKey)
      console.log('🔍 DEBUG: sessionKey from store:', !!currentSessionKey)

      if (serviceUser?.company_id && currentSessionKey) {
        console.log('🔍 DEBUG: Making API call with sessionKey:', currentSessionKey.substring(0, 10) + '...')

        const response = await api.get(`/api/auth/service-user/company/${serviceUser.company_id}/`, {
          headers: {
            'Authorization': `Bearer ${currentSessionKey}`
          },
          params: {
            session_key: currentSessionKey
          }
        })
        console.log('🔍 DEBUG: API call successful, logo data:', response.data)
        setCompanyData(response.data)
      } else {
        console.log('🔍 DEBUG: Missing required data for API call')
      }
    } catch (error: any) {
      console.error('🔍 DEBUG: Error fetching company logo:', error)
      console.error('🔍 DEBUG: Error response:', error.response?.data)
    }
  }

  // Comprehensive HR sidebar menu items
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'recruitment', label: 'Recruitment', icon: Briefcase },
    { id: 'payroll', label: 'Payroll', icon: FileText },
    { id: 'performance', label: 'Performance', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leave', label: 'Leave Management', icon: Calendar },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'statutory', label: 'Statutory', icon: FileText },
    { id: 'government-portal', label: 'Government Portal', icon: Shield },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'system-status', label: 'System Status', icon: CheckCircle },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  // Fetch HR data from backend APIs
  const fetchHRData = async () => {
    if (!sessionKey) return

    try {
      // Real API calls will be implemented here when backend is ready
      // For now, keep default empty state
      console.log('HR data fetch - backend APIs not implemented yet')
    } catch (error) {
      console.error('Error fetching HR data:', error)
    }
  }

  useEffect(() => {
    // Validate session on component mount
    const sessionKey = sessionStorage.getItem('service_session_key')
    if (!sessionKey) {
      window.location.replace('/service-login')
      return
    }

    // Check if service user is authenticated and set company data
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    // Set company data immediately from service user data
    if (serviceUser?.company_name) {
      setCompanyData({
        id: serviceUser.company_id,
        name: serviceUser.company_name,
        logo: null // Will be updated by fetchCompanyData if successful
      })

      // Try to fetch logo after a short delay to ensure sessionKey is available
      if (sessionKey) {
        fetchCompanyData()
      } else {
        // Retry after a short delay for sessionKey to be loaded from persistence
        setTimeout(() => {
          const currentSessionKey = useServiceUserStore.getState().sessionKey
          if (currentSessionKey) {
            fetchCompanyData()
          }
        }, 1000)
      }
    }

    return () => clearTimeout(timer)
  }, [serviceUser?.company_id, sessionKey])

  // Fetch HR data when sessionKey is available
  useEffect(() => {
    if (sessionKey) {
      fetchHRData()
    }
  }, [sessionKey])

  // Render Overview Dashboard
  const renderOverview = () => (
    <div className="space-y-8">
      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total</div>
                <div className="text-2xl font-bold">{hrData.totalEmployees}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">Employees</span>
              <span className="ml-2 opacity-70">• {hrData.activeEmployees} active</span>
            </div>
          </div>
        </div>

        {/* New Hires Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl shadow-green-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <UserPlus className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">This Month</div>
                <div className="text-2xl font-bold">{hrData.newHires}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">New Hires</span>
              <span className="ml-2 opacity-70">• {hrData.pendingOnboarding} pending</span>
            </div>
          </div>
        </div>

        {/* Onboarding Progress Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl shadow-purple-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">In Progress</div>
                <div className="text-2xl font-bold">{hrData.pendingOnboarding}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">Onboarding</span>
              <span className="ml-2 opacity-70">• {hrData.completedOnboarding} completed</span>
            </div>
          </div>
        </div>

        {/* Departments Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl shadow-orange-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Building className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total</div>
                <div className="text-2xl font-bold">{hrData.totalDepartments}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">Departments</span>
              <span className="ml-2 opacity-70">• Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent HR Activities */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent HR Activities</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest employee and HR activities</p>
          </div>
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            onClick={() => setActiveTab('employees')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
        <div className="space-y-3">
          {hrData.recentActivity.map((activity: any) => (
            <div key={activity.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${
                  activity.type === 'hire'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                }`}>
                  {activity.type === 'hire' ? (
                    <UserPlus className="h-5 w-5" />
                  ) : (
                    <Clock className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{activity.description}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{activity.date}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      activity.status === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // Password change functionality removed as it's not used in the current implementation

  // Render Settings Page
  const renderSettings = () => {
    const HRSettings = React.lazy(() => import('../components/settings/HRSettings'))
    return (
      <React.Suspense fallback={<LoadingSpinner size="lg" />}>
        <HRSettings />
      </React.Suspense>
    )
  }

  // Unused render function - commented out
  // const renderEmployees = () => (
  //   <div className="space-y-6">
  //     ...
  //   </div>
  // )

  // Unused render function - commented out
  // const renderRecruitment = () => (
  //   <div className="space-y-6">
  //     ...
  //   </div>
  // )

  // Render Payroll Management
  const renderPayroll = () => {
    const PayrollPage = React.lazy(() => import('./Payroll'))
    return (
      <React.Suspense fallback={<LoadingSpinner size="lg" />}>
        <PayrollPage />
      </React.Suspense>
    )
  }

  // Render Performance Management
  const renderPerformance = () => {
    const PerformancePage = React.lazy(() => import('./Performance'))
    return (
      <React.Suspense fallback={<LoadingSpinner size="lg" />}>
        <PerformancePage />
      </React.Suspense>
    )
  }

  // Unused render function - commented out
  // const renderAttendance = () => (
  //   <div className="space-y-6">
  //     ...
  //   </div>
  // )

  // Render Analytics Dashboard
  const renderAnalytics = () => {
    const AnalyticsPage = React.lazy(() => import('./Analytics'))
    return (
      <React.Suspense fallback={<LoadingSpinner size="lg" />}>
        <AnalyticsPage />
      </React.Suspense>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'employees':
        const Employees = React.lazy(() => import('./Employees'))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <Employees />
          </React.Suspense>
        )
      case 'recruitment':
        const Recruitment = React.lazy(() => import('./Recruitment'))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <Recruitment />
          </React.Suspense>
        )
      case 'payroll':
        return renderPayroll()
      case 'performance':
        return renderPerformance()
      case 'attendance':
        const AttendancePage = React.lazy(() => import('./Attendance'))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <AttendancePage />
          </React.Suspense>
        )
      case 'leave':
        const LeaveManagementPage = React.lazy(() => import('./LeaveManagement'))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <LeaveManagementPage />
          </React.Suspense>
        )
      case 'compliance':
        const CompliancePage = React.lazy(() => import('./Compliance'))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <CompliancePage />
          </React.Suspense>
        )
      case 'statutory':
        const StatutoryPage = React.lazy(() => import('./Statutory'))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <StatutoryPage />
          </React.Suspense>
        )
      case 'government-portal':
        const GovernmentPortalPage = React.lazy(() => import('./GovernmentPortal'))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <GovernmentPortalPage />
          </React.Suspense>
        )
      case 'analytics':
        return renderAnalytics()
      case 'system-status':
        const SystemStatus = React.lazy(() => import('../components/system/SystemStatus'))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <SystemStatus />
          </React.Suspense>
        )
      case 'settings':
        return renderSettings()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern Sidebar */}
      <aside id="sidebar" className="fixed inset-y-0 left-0 z-[var(--z-sidebar)] w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50">
        {/* Sidebar Header with Company Logo */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            {/* Company Logo */}
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              {companyData?.logo ? (
                <img
                  src={companyData.logo}
                  alt={`${companyData.name} logo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Building className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                HR Management
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {companyData?.name || serviceUser?.company_name || 'Company'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  {item.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </button>
              )
            })}
          </div>
        </nav>

        {/* User Info at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-xs font-medium text-white">
                {serviceUser?.full_name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {serviceUser?.full_name || 'User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {serviceUser?.role || 'HR User'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={serviceUserLogout}
              className="h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64">
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/company/services')}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Services
                </Button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  HR Module
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="h-9 w-9 p-0"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            renderContent()
          )}
        </main>
      </div>
    </div>
  )
}

export default HRDashboard
