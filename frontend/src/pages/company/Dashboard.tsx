import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Settings,
  Users,
  BarChart3,
  Shield,
  ArrowRight,
  Clock,
  CheckCircle,
  Plus,
  Key,
  Eye,
  EyeOff,
  Copy,
  UserPlus,
  Trash2,
  Edit,
  LogOut,
  Sun,
  Moon,
  Bell,
  Server,
  Activity,
  TrendingUp,
  Zap,
  Globe,
  Star,
  ExternalLink,
  UserCheck,
  AlertCircle,
  Info,
  X,
  Upload,
  Image,
  Camera,
  Download,
  FileText,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  PieChart,
  MoreVertical,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { useThemeStore } from '../../store/themeStore'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

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
  const [showCredentials, setShowCredentials] = useState<{[key: string]: boolean}>({})
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

  // Fetch company services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['company-assigned-services-v2'],
    queryFn: () => apiClient.getCompanyAssignedServices(),
  })

  // Fetch service users
  const { data: serviceUsers, isLoading: usersLoading } = useQuery({
    queryKey: ['company-service-users'],
    queryFn: () => apiClient.getCompanyServiceUsers(),
  })

  // Handle paginated response from ListAPIView (axios wraps response in .data)
  const servicesData = services?.data?.results || services?.results || services?.data || []
  const serviceUsersData = serviceUsers?.data?.results || serviceUsers?.results || serviceUsers?.data || []

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

    // Navigate to service user login with service type
    navigate(`/service-login?service=${service.service_type.toLowerCase()}`)
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

Username: ${credentials.username}
Password: ${credentials.password}

═══════════════════════════════════════════════════════════════
                      IMPORTANT NOTES
═══════════════════════════════════════════════════════════════

1. Keep these credentials secure and confidential
2. Share only with authorized personnel
3. Change password after first login if required
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

  const toggleCredentialVisibility = (userId: string) => {
    setShowCredentials(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
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
      console.error('Missing logoFile or company_id:', { logoFile: !!logoFile, company_id: user?.company_id })
      return
    }

    console.log('🔍 Starting logo upload for:', logoFile.name)

    setIsUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('logo', logoFile)

      const response = await apiClient.uploadCompanyLogo(formData)
      console.log('🔍 Logo upload successful')

      // Update user data with new logo
      if (response.data.user) {
        console.log('🔍 Updating user with new logo:', response.data.user.company_logo)
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
      console.error('🔍 Error uploading logo:', error)
      console.error('🔍 Error response:', error.response?.data)
      console.error('🔍 Error status:', error.response?.status)

      const errorMessage = error.response?.data?.error ||
                          error.response?.data?.message ||
                          error.message ||
                          'Failed to upload logo'
      toast.error(errorMessage)
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const navigationTabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'services', label: 'Services', icon: Settings },
    { id: 'users', label: 'Service Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Shield }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Company Logo and Name */}
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center mr-4 overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600">
                {user?.company_logo ? (
                  <img
                    src={user.company_logo}
                    alt={`${user.company_name} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-white" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {user?.company_name || 'Your Company'}
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

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {navigationTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.label}</span>
                </button>
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
                    <p className="text-3xl font-bold">{servicesData.length}</p>
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
                    <p className="text-3xl font-bold">{serviceUsersData.length}</p>
                    <p className="text-white/70 text-xs mt-2">Active accounts</p>
                  </div>
                </div>
              </div>

              {/* Active Services Card */}
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
                    <p className="text-white/80 text-sm font-medium mb-1">Active Services</p>
                    <p className="text-3xl font-bold">{servicesData.filter((s: any) => s.is_active).length}</p>
                    <p className="text-white/70 text-xs mt-2">Currently running</p>
                  </div>
                </div>
              </div>

              {/* Company Status Card */}
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
                    <p className="text-white/80 text-sm font-medium mb-1">Company Status</p>
                    <p className="text-2xl font-bold">Active</p>
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
                        {servicesData.length} services assigned
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
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Service Management
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Access and manage your assigned services
                </p>
              </div>
            </div>

            {/* Services Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <span>Your ᗩTᕼᙓᑎᗩ'𝔖 Services</span>
                </CardTitle>
                <CardDescription>
                  Click on any service to access its dashboard and features
                </CardDescription>
              </CardHeader>
            
            <CardContent>
              {servicesLoading ? (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="lg" text="Loading your services..." />
                </div>
              ) : !Array.isArray(servicesData) || servicesData.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Services Assigned
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    No services have been assigned to your company yet. You can request access to available services.
                  </p>
                  <Button
                    onClick={() => navigate('/company/services')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Request Service Access
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.isArray(servicesData) && servicesData.map((service: any) => {
                    const serviceUsers = serviceUsersData.filter((user: any) => user.service_type === service.service_type);
                    return (
                      <div
                        key={service.id}
                        className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                        onClick={() => handleServiceAccess(service)}
                      >
                        {/* Service Header */}
                        <div className="p-6 pb-4">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="text-3xl">{getServiceIcon(service.service_type)}</div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {service.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                                  {service.service_type.replace('_', ' ')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                service.is_active
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                              }`}>
                                {service.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            </div>
                          </div>

                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                            {service.description}
                          </p>
                        </div>

                        {/* Service Stats */}
                        <div className="px-6 pb-4">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">
                                {serviceUsers.length} user{serviceUsers.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Activity className="h-4 w-4 text-green-500" />
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                Ready
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Service Features */}
                        {service.features && service.features.length > 0 && (
                          <div className="px-6 pb-6">
                            <div className="flex flex-wrap gap-1">
                              {service.features.slice(0, 3).map((feature: string, index: number) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                >
                                  {feature}
                                </span>
                              ))}
                              {service.features.length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400">
                                  +{service.features.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Hover Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Service Users Management
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Create and manage users for your services
                </p>
              </div>
              <Button
                onClick={() => setShowCreateUserModal(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Service User
              </Button>
            </div>

            {/* Service Users Grid */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  <span>Service Users</span>
                </CardTitle>
                <CardDescription>
                  Users created for accessing specific services
                </CardDescription>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" text="Loading service users..." />
                  </div>
                ) : serviceUsersData.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No Service Users Created
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Create service users to give them access to specific services
                    </p>
                    <Button
                      onClick={() => setShowCreateUserModal(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create First User
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {serviceUsersData.map((user: any) => (
                      <Card key={user.id} className="border-2 border-gray-200 dark:border-gray-700">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                  {user.full_name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.username}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteServiceUserMutation.mutate(user.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Email:</strong> {user.email}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Service:</strong> {user.service_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <strong>Role:</strong> {user.role}
                            </p>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.is_active
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              }`}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </span>

                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleCredentialVisibility(user.id)}
                                >
                                  {showCredentials[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                {user.password && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(user.password)}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {showCredentials[user.id] && user.password && (
                              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                                <strong>Password:</strong> {user.password}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
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

            {/* Company Logo Section */}
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
                    <div className="h-20 w-20 rounded-xl overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-600 flex items-center justify-center">
                      {user?.company_logo ? (
                        <img
                          src={user.company_logo}
                          alt={`${user.company_name} logo`}
                          className="h-full w-full object-cover"
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

            {/* Password Change Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span>Change Password</span>
                </CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  // Handle password change
                  if (passwordForm.new_password !== passwordForm.confirm_password) {
                    toast.error('New passwords do not match')
                    return
                  }
                  if (passwordForm.new_password.length < 8) {
                    toast.error('Password must be at least 8 characters long')
                    return
                  }

                  try {
                    await apiClient.changeCompanyUserPassword(passwordForm)
                    toast.success('Password changed successfully!')
                    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
                  } catch (error: any) {
                    const message = error.response?.data?.error || error.response?.data?.message || 'Failed to change password'
                    toast.error(message)
                  }
                }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Current Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, current_password: e.target.value }))}
                          className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, new_password: e.target.value }))}
                          className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter new password"
                          required
                          minLength={8}
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
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm_password: e.target.value }))}
                          className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirm new password"
                          required
                          minLength={8}
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
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Key className="h-4 w-4 mr-2" />
                      Change Password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

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
                    disabled
                  >
                    <Shield className="h-6 w-6" />
                    <span>Security</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Enhanced Create Service User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
                <div className="relative">
                  <input
                    type="email"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="user@company.com"
                  />
                  <Bell className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                </div>
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
