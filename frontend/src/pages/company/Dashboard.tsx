import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Settings,
  Users,
  BarChart3,
  Shield,
  CheckCircle,
  Key,
  Eye,
  EyeOff,
  UserPlus,
  LogOut,
  Sun,
  Moon,
  Bell,
  Server,
  Activity,
  TrendingUp,
  Zap,
  UserCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Upload,
  Image,
  Camera,
  Download,
  RefreshCw,
  Lock,
  Smartphone,
  Code,
  Globe,
  Monitor,
  FileText,
  Hash,
  ChevronDown,
  Home,
  Briefcase,
  Cog
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { useThemeStore } from '../../store/themeStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'

import { sanitizeUserInput } from '../../lib/sanitizer'
import toast from 'react-hot-toast'
import ServiceManagement from '../../components/company/ServiceManagement'
import ServiceUserManagement from '../../components/company/ServiceUserManagement'
import CompanyAnalytics from '../../components/company/CompanyAnalytics'
import ActivityMonitor from '../../components/company/ActivityMonitor'
import NotificationCenter from '../../components/company/NotificationCenter'
import EmailSettings from '../../components/company/EmailSettings'
import DomainSettings from '../../components/company/DomainSettings'
import EmailInput from '../../components/company/EmailInput'
import SecurityOverview from '../../components/company/security/SecurityOverview'
import TwoFactorAuth from '../../components/company/security/TwoFactorAuth'
import RecoveryCodes from '../../components/company/security/RecoveryCodes'
import ApiKeysManagement from '../../components/company/security/ApiKeysManagement'
import IpAccessControl from '../../components/company/security/IpAccessControl'
import SessionManagement from '../../components/company/security/SessionManagement'
import SecurityAuditLogs from '../../components/company/security/SecurityAuditLogs'
import AdvancedSecurity from '../../components/company/security/AdvancedSecurity'
import GovernmentAPICredentials from '../../components/company/government/GovernmentAPICredentials'
import DocumentNumbering from '../../components/company/DocumentNumbering'
import QuotationTemplateSettings from '../../components/company/QuotationTemplateSettings'
import POTemplateSettings from '../../components/company/POTemplateSettings'
import ProformaTemplateSettings from '../../components/company/ProformaTemplateSettings'
import InvoiceTemplateSettings from '../../components/company/InvoiceTemplateSettings'
import CompanyDetailsPage from './CompanyDetailsPage'


const CompanyDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout, updateUser } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)



  // State for modals and UI
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [selectedService, setSelectedService] = useState<any>(null)

  
  // New state for enhanced features
  const [dashboardOverview, setDashboardOverview] = useState<any>(null)
  const [serviceUtilization, setServiceUtilization] = useState<any[]>([])
  const [userActivities, setUserActivities] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    full_name: '',
    role: 'user'
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  const isFullyAuthenticated = !!user && !useAuthStore.getState().approvalPending && !useAuthStore.getState().firstLoginRequired

  // Fetch company services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['company-assigned-services-v2'],
    queryFn: () => apiClient.getCompanyAssignedServices(),
    enabled: isFullyAuthenticated,
    retry: false,
  })

  // Fetch service users
  const { data: serviceUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['company-service-users'],
    queryFn: () => apiClient.getCompanyServiceUsers(),
    enabled: isFullyAuthenticated,
    retry: false,
  })

  // Handle paginated response from ListAPIView (axios wraps response in .data)
  const servicesData = services?.data?.results || services?.data || []
  const serviceUsersData = serviceUsers?.data?.results || serviceUsers?.data || []
  
  // Get total counts from pagination info or fallback to array length
  const totalServices = services?.data?.count || servicesData.length
  const totalServiceUsers = serviceUsers?.data?.count || serviceUsersData.length
  
  // Fetch enhanced dashboard data
  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['company-dashboard-overview'],
    queryFn: () => apiClient.get('/api/company-dashboard/overview/'),
  })
  
  const { data: utilizationData, isLoading: utilizationLoading } = useQuery({
    queryKey: ['service-utilization'],
    queryFn: () => apiClient.get('/api/company-dashboard/service-utilization/'),
  })
  
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['user-activities'],
    queryFn: () => apiClient.get('/api/company-dashboard/user-activities/'),
  })
  
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => apiClient.get('/api/company-dashboard/activity-logs/'),
  })
  
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['company-notifications'],
    queryFn: () => apiClient.get('/api/company-dashboard/notifications/'),
  })
  
  // Process enhanced data
  React.useEffect(() => {
    if (overviewData?.data) {
      setDashboardOverview(overviewData.data)
    }
    if (utilizationData?.data) {
      setServiceUtilization(utilizationData.data)
    }
    if (activitiesData?.data) {
      setUserActivities(activitiesData.data)
    }
    if (logsData?.data) {
      setActivityLogs(logsData.data)
    }
    if (notificationsData?.data) {
      setNotifications(notificationsData.data.results || notificationsData.data)
    }
  }, [overviewData, utilizationData, activitiesData, logsData, notificationsData])

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'finance': return '💰'
      case 'hr': return '👥'
      case 'inventory': return '📦'
      case 'orders': return '🛒'
      case 'analytics': return '📊'
      case 'crm': return '🤝'
      case 'procurement': return '🛍️'
      case 'manufacturing': return '🏭'
      case 'quality': return '✅'
      case 'maintenance': return '🔧'
      default: return '⚙️'
    }
  }

  const handleServiceAccess = (service: any) => {
    // Check if user has service users for this service
    const serviceUsers = serviceUsersData.filter((user: any) => user.service_type === service.service_type);

    if (serviceUsers.length === 0) {
      toast.error('No service users created for this service. Please create a service user first.')
      setActiveTab('users')
      return
    }

    // Navigate to service login page with pre-selected service (replace history to prevent back button issues)
    navigate(`/service-login?service=${service.service_type.toLowerCase()}`, { replace: true })
  }

  // Create service user mutation
  const createServiceUserMutation = useMutation({
    mutationFn: (data: any) => apiClient.createServiceUser(data),
    onSuccess: (response) => {
      toast.success('Service user created successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-service-users'] })
      setShowCreateUserModal(false)
      setNewUserForm({ username: '', email: '', full_name: '', role: 'user' })

      // Download credentials as TXT file
      if (response.data.credentials) {
        downloadCredentials(response.data.credentials, selectedService)
        toast.success('Service user created! Credentials downloaded as TXT file.', {
          duration: 5000
        })
      } else {
        toast.error('Service user created but credentials not available for download')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create service user')
    }
  })

  // Delete service user mutation
  const deleteServiceUserMutation = useMutation({
    mutationFn: (userId: number) => apiClient.deleteServiceUser(userId),
    onSuccess: () => {
      toast.success('Service user deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-service-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete service user')
    }
  })

  // Download credentials as TXT file
  const downloadCredentials = (credentials: any, service: any) => {
    const currentDate = new Date().toLocaleString()
    const companyName = user?.company_name || 'Company'

    const credentialsText = `
═══════════════════════════════════════════════════════════════
                    SERVICE USER CREDENTIALS
═══════════════════════════════════════════════════════════════

Company: ${companyName}
Service: ${service.name}
Service Type: ${service.service_type}
Created: ${currentDate}

═══════════════════════════════════════════════════════════════
                        LOGIN DETAILS
═══════════════════════════════════════════════════════════════

Unique Service ID: ${credentials.unique_service_id}
Password: ${credentials.password}

═══════════════════════════════════════════════════════════════
                      IMPORTANT NOTES
═══════════════════════════════════════════════════════════════

1. Keep these credentials secure and confidential
2. Share only with authorized personnel
3. Use the Unique Service ID for login (not username)
4. Password expires in 90 days from creation
5. Contact your company administrator for any issues

═══════════════════════════════════════════════════════════════
                    ATHENA'S SAP SYSTEM
═══════════════════════════════════════════════════════════════

Generated by: ${user?.email}
System: AthenaSAP Enterprise Management System
Website: https://athenas.co.in

═══════════════════════════════════════════════════════════════
`.trim()

    // Create and download the file
    const blob = new Blob([credentialsText], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${service.service_type}_credentials_${credentials.username}_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleCreateServiceUser = () => {
    if (!selectedService) {
      toast.error('Please select a service first')
      return
    }

    if (!newUserForm.username || !newUserForm.email || !newUserForm.full_name) {
      toast.error('Please fill all required fields')
      return
    }

    createServiceUserMutation.mutate({
      service_id: selectedService.id,
      ...newUserForm
    })
  }



  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard!')
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success('Copied to clipboard!')
    }
  }

  // Navigation tabs
  // Logo upload handlers
  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Logo file size must be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }
      setLogoFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoUpload = async () => {
    if (!logoFile || !user?.company_id) {
      toast.error('Missing required data for upload')
      return
    }

    // Starting logo upload

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', logoFile)

      const response = await apiClient.uploadCompanyLogo(formData)
      // Logo upload successful

      // Update user data with new logo
      if (response.data.user) {
        // Updating user with new logo
        updateUser(response.data.user)
      }

      toast.success('Logo uploaded successfully!')
      setLogoFile(null)
      setLogoPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      queryClient.invalidateQueries({ queryKey: ['company-profile'] })
    } catch (error: any) {
      // Error uploading logo - details logged securely

      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to upload logo'
      toast.error(errorMessage)
    } finally {
      setIsUploadingLogo(false)
    }
  }


  // Categorized navigation menu
  const navigationCategories = [
    {
      id: 'main',
      label: 'Dashboard',
      icon: Home,
      items: [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'activity', label: 'Activity', icon: Activity },
        { id: 'notifications', label: 'Notifications', icon: Bell }
      ]
    },
    {
      id: 'services',
      label: 'Services',
      icon: Briefcase,
      items: [
        { id: 'services', label: 'Manage Services', icon: Settings },
        { id: 'users', label: 'Service Users', icon: Users },

      ]
    },
    {
      id: 'company',
      label: 'Company',
      icon: Building2,
      items: [
        { id: 'company-details', label: 'Company Details', icon: Building2 },
        { id: 'document-numbering', label: 'Document Numbering', icon: Hash },
        { id: 'government-api', label: 'Government API', icon: Globe }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Cog,
      items: [
        { id: 'settings', label: 'Settings', icon: Shield }
      ]
    }
  ]

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const settingsTabs = [
    { id: 'general', label: 'General', icon: Shield },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'email', label: 'Email Settings', icon: Bell },
    { id: 'quotation-templates', label: 'Quotation Templates', icon: FileText },
    { id: 'po-templates', label: 'PO Templates', icon: FileText },
    { id: 'proforma-templates', label: 'Proforma Templates', icon: FileText },
    { id: 'invoice-templates', label: 'Invoice Templates', icon: FileText },
    { id: 'logo', label: 'Company Logo', icon: Image },
    { id: 'password', label: 'Password', icon: Key }
  ]

  const [activeSettingsTab, setActiveSettingsTab] = useState('general')
  const [activeSecurityTab, setActiveSecurityTab] = useState('overview')

  // Security sub-tabs
  const securityTabs = [
    { id: 'overview', label: 'Security Overview', icon: Shield },
    { id: '2fa', label: 'Two-Factor Auth', icon: Smartphone },
    { id: 'recovery', label: 'Recovery Codes', icon: Key },
    { id: 'api-keys', label: 'API Keys', icon: Code },
    { id: 'ip-access', label: 'IP Restrictions', icon: Globe },
    { id: 'sessions', label: 'Active Sessions', icon: Monitor },
    { id: 'audit', label: 'Security Logs', icon: FileText },
    { id: 'advanced', label: 'Advanced Security', icon: AlertTriangle }
  ]

  return (
    <div 
      className="flex flex-col flex-1 min-h-full bg-gray-50 dark:bg-gray-900"
      onClick={() => setOpenDropdown(null)}
    >
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Company Logo and Name */}
            <div className="flex items-center">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mr-4 overflow-hidden ${!user?.company_logo ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : ''}`}>
                {user?.company_logo ? (
                  <img
                    src={user.company_logo}
                    alt={`${user.company_name} logo`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.company_name ? sanitizeUserInput(user.company_name) : 'Your Company'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Business Management Portal
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800"></span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </button>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Company User
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Categorized Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-6">
            {navigationCategories.filter((category) => category.items.length > 0).map((category) => {
              const CategoryIcon = category.icon
              const isOpen = openDropdown === category.id
              const hasActiveItem = category.items.some(item => item.id === activeTab)
              
              return (
                <div key={category.id} className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (category.items.length === 1) {
                        setActiveTab(category.items[0].id)
                        setOpenDropdown(null)
                      } else {
                        setOpenDropdown(isOpen ? null : category.id)
                      }
                    }}
                    className={`flex items-center space-x-2 py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
                      hasActiveItem
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                  >
                    <CategoryIcon className="h-5 w-5" />
                    <span>{category.label}</span>
                    {category.items.length > 1 && (
                      <ChevronDown className={`h-4 w-4 transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`} />
                    )}
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isOpen && category.items.length > 1 && (
                    <div 
                      className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-[var(--z-dropdown)]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="py-2">
                        {category.items.map((item) => {
                          const ItemIcon = item.icon
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveTab(item.id)
                                setOpenDropdown(null)
                              }}
                              className={`w-full flex items-center space-x-3 px-4 py-2 text-sm transition-colors ${
                                activeTab === item.id
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                              }`}
                            >
                              <ItemIcon className="h-4 w-4" />
                              <span>{item.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Welcome to Your ᗩTᕼᙓᑎᗩ'𝔖 Dashboard
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400">
                Manage your services, create service users, and access your business operations efficiently.
              </p>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Available Services Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-6 text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Server className="h-6 w-6" />
                    </div>
                    <TrendingUp className="h-5 w-5 text-white/70" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">Available Services</p>
                    <p className="text-3xl font-bold">{totalServices}</p>
                    <p className="text-white/70 text-xs mt-2">Ready to use</p>
                  </div>
                </div>
              </div>

              {/* Service Users Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 text-white shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/40 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Users className="h-6 w-6" />
                    </div>
                    <UserCheck className="h-5 w-5 text-white/70" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">Service Users</p>
                    <p className="text-3xl font-bold">{dashboardOverview?.total_service_users || totalServiceUsers}</p>
                    <p className="text-white/70 text-xs mt-2">Active accounts</p>
                  </div>
                </div>
              </div>

              {/* Service Utilization Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 p-6 text-white shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Activity className="h-6 w-6" />
                    </div>
                    <Zap className="h-5 w-5 text-white/70" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">Service Utilization</p>
                    <p className="text-3xl font-bold">{dashboardOverview?.service_utilization_rate || 0}%</p>
                    <p className="text-white/70 text-xs mt-2">Overall adoption</p>
                  </div>
                </div>
              </div>

              {/* System Health Card */}
              <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-6 text-white shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-1">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <CheckCircle className="h-5 w-5 text-white/70" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm font-medium mb-1">System Health</p>
                    <p className="text-2xl font-bold capitalize">{dashboardOverview?.system_health || 'Good'}</p>
                    <p className="text-white/70 text-xs mt-2">All systems operational</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-20 flex-col space-y-2"
                      onClick={() => setActiveTab('services')}
                    >
                      <Settings className="h-6 w-6" />
                      <span>Manage Services</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex-col space-y-2"
                      onClick={() => setActiveTab('users')}
                    >
                      <Users className="h-6 w-6" />
                      <span>Service Users</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex-col space-y-2"
                      disabled
                    >
                      <BarChart3 className="h-6 w-6" />
                      <span>Reports</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-20 flex-col space-y-2"
                      onClick={() => setActiveTab('settings')}
                    >
                      <Shield className="h-6 w-6" />
                      <span>Settings</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Company approved and activated
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {totalServices} services assigned
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Dashboard access granted
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <ServiceManagement
            servicesData={servicesData}
            serviceUsersData={serviceUsersData}
            servicesLoading={servicesLoading}
            onServiceAccess={handleServiceAccess}
            getServiceIcon={getServiceIcon}
          />
        )}

        {activeTab === 'users' && (
          <ServiceUserManagement
            serviceUsersData={serviceUsersData}
            usersLoading={usersLoading}
            onCreateUser={() => setShowCreateUserModal(true)}
            onCopyToClipboard={copyToClipboard}
            onDeleteUser={(userId) => deleteServiceUserMutation.mutate(userId)}
          />
        )}

        {activeTab === 'company-details' && (
          <CompanyDetailsPage />
        )}

        {activeTab === 'analytics' && (
          <CompanyAnalytics
            analyticsData={dashboardOverview}
            serviceUtilization={serviceUtilization}
            isLoading={overviewLoading || utilizationLoading}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityMonitor
            userActivities={userActivities}
            activityLogs={activityLogs}
            isLoading={activitiesLoading || logsLoading}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationCenter
            notifications={notifications}
            isLoading={notificationsLoading}
            onMarkAsRead={async (notificationId) => {
              try {
                await apiClient.post(`/api/company-dashboard/notifications/${notificationId}/read/`)
                queryClient.invalidateQueries({ queryKey: ['company-notifications'] })
                toast.success('Notification marked as read')
              } catch (error) {
                toast.error('Failed to mark notification as read')
              }
            }}
          />
        )}

        {activeTab === 'document-numbering' && (
          <DocumentNumbering onNavigateToTab={setActiveTab} />
        )}

        {activeTab === 'government-api' && (
          <GovernmentAPICredentials />
        )}




        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Company Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your company settings and preferences
              </p>
            </div>

            {/* Settings Sub-Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex space-x-8">
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSettingsTab(tab.id)}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                        activeSettingsTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Settings Content */}
            {activeSettingsTab === 'email' && (
              <EmailSettings onSettingsUpdate={() => {
                // Refresh any necessary data
                queryClient.invalidateQueries({ queryKey: ['company-notifications'] })
              }} />
            )}

            {activeSettingsTab === 'quotation-templates' && (
              <QuotationTemplateSettings />
            )}

            {activeSettingsTab === 'po-templates' && (
              <POTemplateSettings />
            )}

            {activeSettingsTab === 'proforma-templates' && (
              <ProformaTemplateSettings />
            )}

            {activeSettingsTab === 'invoice-templates' && (
              <InvoiceTemplateSettings />
            )}

            {activeSettingsTab === 'general' && (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Company Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Company Name
                        </label>
                        <p className="text-gray-900 dark:text-white">{user?.company_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Email
                        </label>
                        <p className="text-gray-900 dark:text-white">{user?.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Domain Settings</CardTitle>
                    <CardDescription>
                      Set your company domain to automatically format service user emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <DomainSettings />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSettingsTab === 'logo' && (

              <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Image className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <span>Company Logo</span>
                </CardTitle>
                <CardDescription>
                  Upload your company logo to personalize your dashboard
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Current Logo Display */}
                  <div className="flex items-center space-x-6">
                    <div className={`h-20 w-20 rounded-xl overflow-hidden flex items-center justify-center ${!user?.company_logo ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : ''}`}>
                      {user?.company_logo ? (
                        <img
                          src={user.company_logo}
                          alt={`${user.company_name} logo`}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-10 w-10 text-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        Current Logo
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {user?.company_logo ? 'Logo uploaded' : 'No logo uploaded'}
                      </p>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6">
                    <div className="text-center">
                      {logoPreview ? (
                        <div className="space-y-4">
                          <div className="h-32 w-32 mx-auto rounded-xl overflow-hidden">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex justify-center space-x-3">
                            <Button
                              onClick={handleLogoUpload}
                              disabled={isUploadingLogo}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isUploadingLogo ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  Upload Logo
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setLogoFile(null)
                                setLogoPreview(null)
                                if (fileInputRef.current) {
                                  fileInputRef.current.value = ''
                                }
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                              Upload Company Logo
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              PNG, JPG, GIF up to 5MB
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="mx-auto"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoSelect}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
              </Card>
            )}

            {activeSettingsTab === 'password' && (
              <div className="space-y-6">
                {/* Password Security Warning */}
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <p className="font-medium mb-1">Enhanced Security Required</p>
                      <p>Password changes require additional verification for company accounts. All active sessions will be terminated after password change.</p>
                    </div>
                  </div>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Key className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <span>Change Password</span>
                    </CardTitle>
                    <CardDescription>
                      Update your password with enterprise-grade security requirements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={async (e) => {
                      e.preventDefault()
                      // Enhanced password validation
                      if (passwordForm.new_password !== passwordForm.confirm_password) {
                        toast.error('New passwords do not match')
                        return
                      }
                      if (passwordForm.new_password.length < 12) {
                        toast.error('Password must be at least 12 characters long')
                        return
                      }
                      // Check password complexity
                      const hasUpper = /[A-Z]/.test(passwordForm.new_password)
                      const hasLower = /[a-z]/.test(passwordForm.new_password)
                      const hasNumber = /\d/.test(passwordForm.new_password)
                      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.new_password)
                      
                      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
                        toast.error('Password must contain uppercase, lowercase, number, and special character')
                        return
                      }

                      try {
                        await apiClient.changeCompanyUserPassword({
                          ...passwordForm,
                          force_logout_all: true // Force logout from all devices
                        })
                        toast.success('Password changed successfully! You will be logged out from all devices.')
                        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                        // Auto logout after 3 seconds
                        setTimeout(() => {
                          logout()
                        }, 3000)
                      } catch (error: any) {
                        const message = error.response?.data?.error || error.response?.data?.message || 'Failed to change password'
                        toast.error(message)
                      }
                    }} className="space-y-6">
                      {/* Password Requirements */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Password Requirements:</h4>
                        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                          <li>• Minimum 12 characters</li>
                          <li>• At least one uppercase letter</li>
                          <li>• At least one lowercase letter</li>
                          <li>• At least one number</li>
                          <li>• At least one special character</li>
                          <li>• Cannot be same as previous 5 passwords</li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Current Password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Current Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.current ? 'text' : 'password'}
                              value={passwordForm.current_password}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                              className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Enter current password"
                              required
                            />
                            <Key className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>

                        {/* New Password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            New Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              value={passwordForm.new_password}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                              className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Enter new password"
                              required
                              minLength={12}
                            />
                            <Key className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          {/* Password Strength Indicator */}
                          {passwordForm.new_password && (
                            <div className="mt-2">
                              <div className="flex items-center space-x-2 text-xs">
                                <div className={`w-2 h-2 rounded-full ${
                                  passwordForm.new_password.length >= 12 ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span>Length (12+ chars)</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs">
                                <div className={`w-2 h-2 rounded-full ${
                                  /[A-Z]/.test(passwordForm.new_password) && /[a-z]/.test(passwordForm.new_password) ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span>Upper & lowercase</span>
                              </div>
                              <div className="flex items-center space-x-2 text-xs">
                                <div className={`w-2 h-2 rounded-full ${
                                  /\d/.test(passwordForm.new_password) && /[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.new_password) ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                                <span>Number & special char</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={passwordForm.confirm_password}
                              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                              className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Confirm new password"
                              required
                              minLength={12}
                            />
                            <Key className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                              className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                          {passwordForm.confirm_password && (
                            <div className="mt-2 text-xs">
                              {passwordForm.new_password === passwordForm.confirm_password ? (
                                <div className="flex items-center space-x-2 text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Passwords match</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2 text-red-600">
                                  <X className="h-3 w-3" />
                                  <span>Passwords do not match</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Security Options */}
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                          <div className="text-sm text-yellow-700 dark:text-yellow-300">
                            <p className="font-medium mb-1">Security Actions:</p>
                            <ul className="space-y-1">
                              <li>• All active sessions will be terminated</li>
                              <li>• You will be logged out immediately</li>
                              <li>• Email notification will be sent</li>
                              <li>• Security log entry will be created</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">
                          <Key className="h-4 w-4 mr-2" />
                          Change Password & Logout All
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeSettingsTab === 'security' && (
              <div className="space-y-6">
                {/* Security Sub-Navigation */}
                <div className="border-b border-gray-200 dark:border-gray-700">
                  <nav className="flex space-x-8">
                    {securityTabs.map((tab) => {
                      const Icon = tab.icon
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveSecurityTab(tab.id)}
                          className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeSecurityTab === tab.id
                              ? 'border-red-500 text-red-600 dark:text-red-400'
                              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </button>
                      )
                    })}
                  </nav>
                </div>

                {/* Security Content */}
                {activeSecurityTab === 'overview' && (
                  <SecurityOverview onNavigateToTab={setActiveSecurityTab} />
                )}

                {activeSecurityTab === '2fa' && (
                  <TwoFactorAuth onNavigateToTab={setActiveSecurityTab} />
                )}

                {activeSecurityTab === 'recovery' && (
                  <RecoveryCodes />
                )}

                {activeSecurityTab === 'api-keys' && (
                  <ApiKeysManagement />
                )}

                {activeSecurityTab === 'ip-access' && (
                  <IpAccessControl />
                )}

                {activeSecurityTab === 'sessions' && (
                  <SessionManagement />
                )}

                {activeSecurityTab === 'audit' && (
                  <SecurityAuditLogs />
                )}

                {activeSecurityTab === 'advanced' && (
                  <AdvancedSecurity onNavigateToTab={setActiveSecurityTab} />
                )}
              </div>
            )}

            {activeSettingsTab === 'general' && (
              <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => setActiveTab('services')}
                  >
                    <Settings className="h-6 w-6" />
                    <span>Service Settings</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => setActiveTab('users')}
                  >
                    <Users className="h-6 w-6" />
                    <span>User Management</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    disabled
                  >
                    <BarChart3 className="h-6 w-6" />
                    <span>Reports</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-20 flex-col space-y-2"
                    onClick={() => setActiveSettingsTab('security')}
                  >
                    <Shield className="h-6 w-6" />
                    <span>Security</span>
                  </Button>
                </div>
              </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>

      {/* Enhanced Create Service User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[var(--z-modal)] p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Create Service User
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add a new user to access your services
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateUserModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Service *
                </label>
                <div className="relative">
                  <select
                    value={selectedService?.id || ''}
                    onChange={(e) => {
                      const service = servicesData.find((s: any) => s.id === parseInt(e.target.value))
                      setSelectedService(service)
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Choose a service...</option>
                    {servicesData.map((service: any) => (
                      <option key={service.id} value={service.id}>
                        {getServiceIcon(service.service_type)} {service.name}
                      </option>
                    ))}
                  </select>
                  <Server className="absolute right-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
                {selectedService && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <Info className="inline h-4 w-4 mr-1" />
                      Creating user for: <strong>{selectedService.name}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Download Information */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Download className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-green-800 dark:text-green-200">
                      Automatic Credentials Download
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      After creating the user, credentials will be automatically downloaded as a secure TXT file.
                      Share this file securely with the service user.
                    </p>
                  </div>
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newUserForm.username}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter username"
                  />
                  <Users className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <EmailInput 
                  value={newUserForm.email}
                  username={newUserForm.username}
                  onChange={(email) => setNewUserForm(prev => ({ ...prev, email }))}
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newUserForm.full_name}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, full_name: e.target.value }))}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="John Doe"
                  />
                  <UserCheck className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User Role
                </label>
                <div className="relative">
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="user">👤 User - Basic access</option>
                    <option value="manager">👨‍💼 Manager - Advanced access</option>
                    <option value="admin">🔧 Admin - Full control</option>
                    <option value="viewer">👁️ Viewer - Read-only access</option>
                  </select>
                  <Shield className="absolute right-3 top-3.5 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-medium mb-1">Important:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• A secure password will be automatically generated</li>
                      <li>• Credentials will be shown once after creation</li>
                      <li>• User can change password after first login</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowCreateUserModal(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateServiceUser}
                disabled={createServiceUserMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                {createServiceUserMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create & Download
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CompanyDashboard
