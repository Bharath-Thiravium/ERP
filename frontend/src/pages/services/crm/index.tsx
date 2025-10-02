import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  Target,
  Building,
  Phone,
  Calendar,
  Megaphone,
  Settings,
  LogOut,
  Sun,
  Moon,
  Shield,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  User,
  BarChart3,
  PlusCircle
} from 'lucide-react'
// import { useAuthStore } from '../../../store/authStore'
import { useThemeStore } from '../../../store/themeStore'
import api, { apiClient } from '../../../lib/api'
import { useServiceUserStore } from '../../../store/serviceUserStore'
import { Button } from '../../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/Card'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { CRMDashboard } from './components/CRMDashboard'

const CRMRoutes: React.FC = () => {
  const navigate = useNavigate()
  // const { logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { serviceUser, sessionKey, logout: serviceUserLogout } = useServiceUserStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [companyData, setCompanyData] = useState<any>(null)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Fetch company data including logo
  const fetchCompanyData = async () => {
    try {
      const currentSessionKey = useServiceUserStore.getState().sessionKey
      console.log('🔍 DEBUG: fetchCompanyData called')
      console.log('🔍 DEBUG: serviceUser?.company_id:', serviceUser?.company_id)
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

  // CRM sidebar menu items
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'opportunities', label: 'Opportunities', icon: Target },
    { id: 'accounts', label: 'Accounts', icon: Building },
    { id: 'contacts', label: 'Contacts', icon: Phone },
    { id: 'activities', label: 'Activities', icon: Calendar },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    if (serviceUser?.company_name) {
      setCompanyData({
        id: serviceUser.company_id,
        name: serviceUser.company_name,
        logo: null
      })

      if (sessionKey) {
        fetchCompanyData()
      } else {
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

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setIsChangingPassword(true)
    try {
      if (!sessionKey) {
        toast.error('Session expired. Please login again.')
        return
      }

      await apiClient.changeServiceUserPassword({
        session_key: sessionKey,
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword
      })

      toast.success('Password changed successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Render Settings Page
  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          CRM Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your CRM service preferences and security settings
        </p>
      </div>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Change Password</span>
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                minLength={8}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isChangingPassword}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {isChangingPassword ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-green-500" />
            <span>Account Information</span>
          </CardTitle>
          <CardDescription>
            Your service user account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {serviceUser?.username || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {companyData?.name || serviceUser?.company_name || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                CRM Management
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                CRM User
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <CRMDashboard />
      case 'leads':
        const LeadsPage = React.lazy(() => import('./pages/LeadsPage').then(m => ({ default: m.LeadsPage })))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <LeadsPage />
          </React.Suspense>
        )
      case 'opportunities':
        const OpportunitiesPage = React.lazy(() => import('./pages/OpportunitiesPage').then(m => ({ default: m.OpportunitiesPage })))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <OpportunitiesPage />
          </React.Suspense>
        )
      case 'accounts':
        const AccountsPage = React.lazy(() => import('./pages/AccountsPage').then(m => ({ default: m.AccountsPage })))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <AccountsPage />
          </React.Suspense>
        )
      case 'contacts':
        const ContactsPage = React.lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <ContactsPage />
          </React.Suspense>
        )
      case 'activities':
        const ActivitiesPage = React.lazy(() => import('./pages/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <ActivitiesPage />
          </React.Suspense>
        )
      case 'campaigns':
        const CampaignsPage = React.lazy(() => import('./pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
        return (
          <React.Suspense fallback={<LoadingSpinner size="lg" />}>
            <CampaignsPage />
          </React.Suspense>
        )
      case 'settings':
        return renderSettings()
      default:
        return <CRMDashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50">
        {/* Sidebar Header with Company Logo */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
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
                CRM Management
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
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg shadow-orange-500/25'
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
                {serviceUser?.role || 'CRM User'}
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
      </div>

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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  CRM Dashboard
                </h1>
              </div>

              <div className="flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Period
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
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

export default CRMRoutes