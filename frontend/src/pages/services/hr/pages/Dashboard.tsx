import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  Clock,
  CreditCard,
  Calendar,
  TrendingUp,
  Shield,
  FileText,
  Settings,
  Search,
  Filter,
  PlusCircle,
  Sun,
  Moon,
  LogOut,
  ChevronRight,
  Building,
  MapPin,
  UserCheck,
  UserX,
  DollarSign,
  Award,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  BarChart3,
  PieChart,
  RefreshCw,
  Download,
  Mail,
  Phone,
  User
} from 'lucide-react'
import { useAuthStore } from '../../../../store/authStore'
import { useThemeStore } from '../../../../store/themeStore'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent } from '../../../../components/ui/Card'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import api, { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'
import Employees from './Employees'
import Departments from './Departments'
import Attendance from './Attendance'
import Leave from './Leave'
import Payroll from './Payroll'
import Compliance from './Compliance'
import Reports from './Reports'

const HRDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { serviceUser, sessionKey, changePassword } = useServiceUserStore()

  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [companyData, setCompanyData] = useState<any>(null)
  
  // Settings state - moved to component level
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // HR Statistics State
  const [hrStats, setHrStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    onLeave: 0,
    pendingApprovals: 0,
    monthlyPayroll: 0,
    newJoinees: 0,
    attendanceRate: 0,
    activeRecruitments: 0,
    recentActivity: [] as any[]
  })

  // Sidebar menu items for HR
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'departments', label: 'Departments', icon: Building },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'leave', label: 'Leave Management', icon: Calendar },
    { id: 'payroll', label: 'Payroll', icon: CreditCard },
    { id: 'compliance', label: 'Compliance', icon: Shield },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  // Fetch company data including logo
  const fetchCompanyData = async () => {
    try {
      const currentSessionKey = useServiceUserStore.getState().sessionKey
      
      if (serviceUser?.company_id && currentSessionKey) {
        const response = await api.get(`/api/auth/service-user/company/${serviceUser.company_id}/`, {
          headers: {
            'Authorization': `Bearer ${currentSessionKey}`
          },
          params: {
            session_key: currentSessionKey
          }
        })
        setCompanyData(response.data)
      }
    } catch (error: any) {
      console.error('Error fetching company logo:', error)
      // Keep the existing company data (name) but without logo
    }
  }

  useEffect(() => {
    // Set company data from service user
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

    // Fetch HR statistics
    if (sessionKey) {
      fetchHRStats()
    } else {
      setIsLoading(false)
    }
  }, [serviceUser?.company_id, sessionKey])

  const fetchHRStats = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.getHRStats({ session_key: sessionKey })
      const stats = response.data
      
      setHrStats({
        totalEmployees: stats.total_employees || 0,
        presentToday: stats.present_today || 0,
        onLeave: stats.on_leave || 0,
        pendingApprovals: stats.pending_leave_approvals || 0,
        monthlyPayroll: stats.monthly_payroll || 0,
        newJoinees: stats.new_joinees || 0,
        attendanceRate: stats.attendance_rate || 0,
        activeRecruitments: stats.active_recruitments || 0,
        recentActivity: stats.recent_activity || []
      })
    } catch (error) {
      console.error('Failed to fetch HR stats:', error)
      toast.error('Failed to load HR statistics')
      // Keep existing stats on error
    } finally {
      setIsLoading(false)
    }
  }

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Employees */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total Count</div>
                <div className="text-2xl font-bold">{hrStats.totalEmployees}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">Total Employees</span>
              <span className="ml-2 opacity-70">• {hrStats.newJoinees} new this month</span>
            </div>
          </div>
        </div>

        {/* Present Today */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl shadow-green-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <UserCheck className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Present</div>
                <div className="text-2xl font-bold">{hrStats.presentToday}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">Present Today</span>
              <span className="ml-2 opacity-70">• {hrStats.attendanceRate}% rate</span>
            </div>
          </div>
        </div>

        {/* On Leave */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl shadow-orange-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <UserX className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">On Leave</div>
                <div className="text-2xl font-bold">{hrStats.onLeave}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">Employees on Leave</span>
              <span className="ml-2 opacity-70">• {hrStats.pendingApprovals} pending</span>
            </div>
          </div>
        </div>

        {/* Monthly Payroll */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl shadow-purple-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">This Month</div>
                <div className="text-2xl font-bold">₹{(hrStats.monthlyPayroll / 100000).toFixed(1)}L</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">Monthly Payroll</span>
              <span className="ml-2 opacity-70">• {hrStats.totalEmployees} employees</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Analytics */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Analytics</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily attendance trends for the last 30 days</p>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Attendance chart will be implemented</p>
            </div>
          </div>
        </div>

        {/* Department Distribution */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Department Distribution</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Employee distribution across departments</p>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
            <div className="text-center">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Department chart will be implemented</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent HR Activities</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest updates and activities</p>
          </div>
          <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
        <div className="space-y-3">
          {hrStats.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${
                  activity.type === 'join' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' :
                  activity.type === 'leave' ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' :
                  activity.type === 'attendance' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' :
                  activity.type === 'payroll' ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white' :
                  'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                }`}>
                  {activity.type === 'join' ? <UserCheck className="h-5 w-5" /> :
                   activity.type === 'leave' ? <Calendar className="h-5 w-5" /> :
                   activity.type === 'attendance' ? <Clock className="h-5 w-5" /> :
                   activity.type === 'payroll' ? <CreditCard className="h-5 w-5" /> :
                   <FileText className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{activity.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activity.time}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Eye className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault()
      
      if (passwordData.new_password !== passwordData.confirm_password) {
        toast.error('New passwords do not match')
        return
      }

      if (passwordData.new_password.length < 8) {
        toast.error('Password must be at least 8 characters long')
        return
      }

      setIsChangingPassword(true)
      const success = await changePassword(passwordData)
      
      if (success) {
        setShowPasswordChange(false)
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      }
      setIsChangingPassword(false)
    }

  const renderSettings = () => (
    <div className="space-y-6">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            HR Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Configure your HR service preferences and account settings
          </p>
        </div>

        {/* Account Settings */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Account Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Change Password</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Update your HR service password</p>
                </div>
                <Button 
                  onClick={() => setShowPasswordChange(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  Change Password
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Service Information</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    User: {serviceUser?.username} | Role: {serviceUser?.role}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HR Configuration */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">HR Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Leave Policies</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Configure leave types and policies</p>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Attendance Rules</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Set working hours and attendance rules</p>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Payroll Settings</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Configure salary components and deductions</p>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notifications</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Manage email and system notifications</p>
                <Button variant="outline" size="sm">Configure</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Modal */}
        {showPasswordChange && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Change Password</h3>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, current_password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, new_password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    minLength={8}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirm_password: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    minLength={8}
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPasswordChange(false)
                      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    {isChangingPassword ? 'Changing...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'employees':
        return <Employees />
      case 'departments':
        return <Departments />
      case 'attendance':
        return <Attendance />
      case 'leave':
        return <Leave />
      case 'payroll':
        return <Payroll />
      case 'compliance':
        return <Compliance />
      case 'reports':
        return <Reports />
      case 'settings':
        return renderSettings()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50">
        {/* Sidebar Header */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
              {companyData?.logo ? (
                <img src={companyData.logo} alt={`${companyData.name} logo`} className="h-full w-full object-cover" />
              ) : (
                <Building className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">HR Management</h2>
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
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">HR Manager</p>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="h-8 w-8 p-0">
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  HR Dashboard
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
                <Button size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Quick Action
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-9 w-9 p-0">
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