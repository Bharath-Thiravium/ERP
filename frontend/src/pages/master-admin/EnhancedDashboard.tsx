import React, { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Building2,
  Users,
  Bell,
  Settings,
  Plus,
  Search,
  Filter,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  Star,
  ArrowUpRight,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Server,
  Sparkles,
  Rocket,
  Eye,
  Edit,
  Trash2,
  Moon,
  Sun
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { Button } from '../../components/ui/Button'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../components/ui/DropdownMenu'
import CreateCompanyModal from '../../components/forms/CreateCompanyModal'
import CompanyViewModal from '../../components/modals/CompanyViewModal'
import CompanyEditModal from '../../components/modals/CompanyEditModal'
import CompanyDeleteModal from '../../components/modals/CompanyDeleteModal'
import NotificationPanel from '../../components/layout/NotificationPanel'
import athenasLogo from '../../assets/logo.jpeg'

const EnhancedMasterAdminDashboard: React.FC = () => {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Ensure theme is applied to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeSection, setActiveSection] = useState('overview')

  // Handle URL parameters for section navigation
  useEffect(() => {
    const section = searchParams.get('section')
    if (section && ['overview', 'companies', 'services', 'users', 'notifications', 'analytics', 'settings'].includes(section)) {
      setActiveSection(section)
    }
  }, [searchParams])

  // Get highlighted company ID from URL
  const highlightCompanyId = searchParams.get('highlight')

  // Auto-scroll to highlighted company
  useEffect(() => {
    if (highlightCompanyId && activeSection === 'companies') {
      setTimeout(() => {
        const element = document.getElementById(`company-${highlightCompanyId}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 500) // Wait for section to render

      // Clear highlight after 10 seconds
      setTimeout(() => {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev)
          newParams.delete('highlight')
          return newParams
        })
      }, 10000)
    }
  }, [highlightCompanyId, activeSection, setSearchParams])

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<any>(null)

  // Bulk actions
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Fetch companies
  const { data: companies, isLoading: companiesLoading, refetch: refetchCompanies } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiClient.getCompanies(),
  })

  // Fetch notifications
  const { data: notifications, isLoading: notificationsLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.getNotifications({ is_read: false }),
  })

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => apiClient.getServices(),
  })

  const companiesData = companies?.data?.results || []
  const notificationsData = notifications?.data?.results || []
  const servicesData = services?.data?.results || []

  // Filter companies
  const filteredCompanies = companiesData.filter((company: any) => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || company.approval_status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Stats
  const stats = {
    totalCompanies: companiesData.length,
    pendingApprovals: companiesData.filter((c: any) => c.approval_status === 'pending').length,
    approvedCompanies: companiesData.filter((c: any) => c.approval_status === 'approved').length,
    totalServices: servicesData.length,
    unreadNotifications: notificationsData.length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'suspended': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  // Navigation sections
  const navigationSections = [
    { id: 'overview', label: 'Overview', icon: BarChart3, description: 'Dashboard analytics and insights' },
    { id: 'companies', label: 'Companies', icon: Building2, description: 'Manage company registrations' },
    { id: 'services', label: 'Services', icon: Server, description: 'Manage available services' },
    { id: 'users', label: 'Users', icon: Users, description: 'Manage company users' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'System notifications' },
    { id: 'analytics', label: 'Analytics', icon: PieChart, description: 'Reports and analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'System configuration' }
  ]

  // Handle company actions
  const handleApproveCompany = async (companyId: string) => {
    try {
      await apiClient.approveCompany(parseInt(companyId), 'approve')
      toast.success('Company approved successfully!')
      refetchCompanies()
    } catch (error: any) {
      console.error('Error approving company:', error)
      const message = error.response?.data?.message || 'Failed to approve company'
      toast.error(message)
    }
  }

  const handleRejectCompany = async (companyId: string) => {
    try {
      await apiClient.approveCompany(parseInt(companyId), 'reject')
      toast.success('Company rejected successfully!')
      refetchCompanies()
    } catch (error: any) {
      console.error('Error rejecting company:', error)
      const message = error.response?.data?.message || 'Failed to reject company'
      toast.error(message)
    }
  }

  // Modal handlers
  const handleViewCompany = (company: any) => {
    setSelectedCompany(company)
    setShowViewModal(true)
  }

  const handleEditCompany = (company: any) => {
    setSelectedCompany(company)
    setShowEditModal(true)
  }

  const handleDeleteCompany = (company: any) => {
    setSelectedCompany(company)
    setShowDeleteModal(true)
  }

  const handleSaveCompany = async (updatedCompany: any) => {
    try {
      await apiClient.updateCompany(updatedCompany.id, updatedCompany)
      console.log('Successfully updated company:', updatedCompany)
      refetchCompanies()
    } catch (error) {
      console.error('Error updating company:', error)
      throw error
    }
  }

  const handleDeleteConfirm = async (companyId: string) => {
    try {
      await apiClient.deleteCompany(parseInt(companyId))
      console.log('Successfully deleted company:', companyId)
      refetchCompanies()
    } catch (error) {
      console.error('Error deleting company:', error)
      throw error
    }
  }

  // Bulk actions handlers
  const handleSelectCompany = (companyId: string) => {
    setSelectedCompanies(prev =>
      prev.includes(companyId)
        ? prev.filter(id => id !== companyId)
        : [...prev, companyId]
    )
  }

  const handleSelectAll = () => {
    if (selectedCompanies.length === filteredCompanies.length) {
      setSelectedCompanies([])
    } else {
      setSelectedCompanies(filteredCompanies.map((c: any) => c.id))
    }
  }

  const handleBulkApprove = async () => {
    try {
      await Promise.all(selectedCompanies.map(id => apiClient.approveCompany(parseInt(id), 'approve')))
      toast.success(`${selectedCompanies.length} companies approved successfully!`)
      setSelectedCompanies([])
      refetchCompanies()
    } catch (error: any) {
      console.error('Error bulk approving companies:', error)
      const message = error.response?.data?.message || 'Failed to approve companies'
      toast.error(message)
    }
  }

  const handleBulkReject = async () => {
    try {
      // await Promise.all(selectedCompanies.map(id => apiClient.rejectCompany(id)))
      console.log('Bulk rejecting companies:', selectedCompanies)
      setSelectedCompanies([])
      refetchCompanies()
    } catch (error) {
      console.error('Error bulk rejecting companies:', error)
    }
  }

  // Overview Section
  const renderOverviewSection = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome back! 👋
            </h2>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Online
            </div>
          </div>
        </div>
      </div>

      {/* Modern Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6 w-full">
        {/* Total Companies Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-6 text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Building2 className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-blue-100 text-sm font-medium mb-1">Total Companies</p>
              <p className="text-3xl font-bold mb-2">{stats.totalCompanies}</p>
              <div className="flex items-center gap-1 text-blue-100 text-xs">
                <TrendingUp className="h-3 w-3" />
                <span>+12% from last month</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approvals Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-6 text-white shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Clock className="h-6 w-6" />
              </div>
              {stats.pendingApprovals > 0 && (
                <div className="h-3 w-3 bg-white rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <p className="text-orange-100 text-sm font-medium mb-1">Pending Approvals</p>
              <p className="text-3xl font-bold mb-2">{stats.pendingApprovals}</p>
              <div className="flex items-center gap-1 text-orange-100 text-xs">
                <Target className="h-3 w-3" />
                <span>Requires attention</span>
              </div>
            </div>
          </div>
        </div>

        {/* Approved Companies Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-6 text-white shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <CheckCircle className="h-6 w-6" />
              </div>
              <ArrowUpRight className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-green-100 text-sm font-medium mb-1">Approved Companies</p>
              <p className="text-3xl font-bold mb-2">{stats.approvedCompanies}</p>
              <div className="flex items-center gap-1 text-green-100 text-xs">
                <BarChart3 className="h-3 w-3" />
                <span>Active & operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Services Card */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-600 p-6 text-white shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Zap className="h-6 w-6" />
              </div>
              <PieChart className="h-5 w-5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-purple-100 text-sm font-medium mb-1">Active Services</p>
              <p className="text-3xl font-bold mb-2">{stats.totalServices}</p>
              <div className="flex items-center gap-1 text-purple-100 text-xs">
                <Activity className="h-3 w-3" />
                <span>All systems running</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Companies Section
  const renderCompaniesSection = () => (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search companies by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCompanies.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedCompanies.length} companies selected
              </span>
              <button
                onClick={() => setSelectedCompanies([])}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve Selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkReject}
                className="border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Companies List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {companiesLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-8 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No companies found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
            {/* Select All Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedCompanies.length === filteredCompanies.length && filteredCompanies.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select all companies ({filteredCompanies.length})
                </span>
              </label>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCompanies.map((company: any) => {
                const isHighlighted = highlightCompanyId && company.id.toString() === highlightCompanyId
                const isSelected = selectedCompanies.includes(company.id)

                return (
                <div key={company.id} id={`company-${company.id}`} className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 border-l-4 ${
                  isHighlighted
                    ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-900/10 ring-2 ring-orange-200 dark:ring-orange-800'
                    : isSelected
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                      : 'border-transparent hover:border-blue-500'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedCompanies.includes(company.id)}
                      onChange={() => handleSelectCompany(company.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="relative">
                      <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {company.name.charAt(0).toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-gray-800 ${
                        company.approval_status === 'approved' ? 'bg-green-500' :
                        company.approval_status === 'pending' ? 'bg-yellow-500' :
                        company.approval_status === 'rejected' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{company.name}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(company.approval_status)}`}>
                          {getStatusIcon(company.approval_status)}
                          <span className="ml-1 capitalize">{company.approval_status}</span>
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 truncate">{company.email}</p>
                      <div className="flex items-center space-x-6 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {new Date(company.created_at).toLocaleDateString()}</span>
                        </span>
                        {company.services && (
                          <span className="flex items-center space-x-1">
                            <Server className="h-3 w-3" />
                            <span>{company.services.length} Services</span>
                          </span>
                        )}
                        {company.users_count && (
                          <span className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{company.users_count} Users</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {company.approval_status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApproveCompany(company.id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectCompany(company.id)}
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    <DropdownMenu
                      trigger={
                        <Button size="sm" variant="ghost" className="hover:bg-gray-100 dark:hover:bg-gray-700">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      }
                    >
                      <DropdownMenuItem onClick={() => handleViewCompany(company)}>
                        <Eye className="h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditCompany(company)}>
                        <Edit className="h-4 w-4" />
                        Edit Company
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDeleteCompany(company)}
                        variant="danger"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Company
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )

  // Services Section
  const renderServicesSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servicesData.map((service: any) => (
          <div key={service.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Server className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                ${service.base_price}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{service.name}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{service.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Type: {service.service_type}
              </span>
              <Button size="sm" variant="outline">
                Edit Service
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // Placeholder sections
  const renderPlaceholderSection = (title: string, description: string, icon: React.ReactNode) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
      <Button variant="outline">Coming Soon</Button>
    </div>
  )

  // Section content renderer
  const renderSectionContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverviewSection()
      case 'companies':
        return renderCompaniesSection()
      case 'services':
        return renderServicesSection()
      case 'users':
        return renderPlaceholderSection('User Management', 'Comprehensive user management system', <Users className="h-16 w-16 text-gray-400 mx-auto" />)
      case 'notifications':
        return renderPlaceholderSection('Notifications Center', 'Advanced notification management system', <Bell className="h-16 w-16 text-gray-400 mx-auto" />)
      case 'analytics':
        return renderPlaceholderSection('Analytics & Reports', 'Comprehensive analytics dashboard with detailed insights', <PieChart className="h-16 w-16 text-gray-400 mx-auto" />)
      case 'settings':
        return renderPlaceholderSection('System Settings', 'Configure system preferences and global settings', <Settings className="h-16 w-16 text-gray-400 mx-auto" />)
      default:
        return renderOverviewSection()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950/30 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Enhanced Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/5">
        <div className="px-6 max-w-none">
          <div className="flex justify-between items-center h-20">
            {/* Left: Enhanced Company Logo and Name */}
            <div className="flex items-center space-x-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-300"></div>
                <div className="relative h-14 w-14 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
                  <img
                    src={athenasLogo}
                    alt="ᗩTᕼᙓᑎᗩ'𝔖 Logo"
                    className="h-10 w-10 rounded-xl object-cover"
                  />
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Sparkles className="h-2.5 w-2.5 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                  ᗩTᕼᙓᑎᗩ'𝔖
                </h1>
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Rocket className="h-3 w-3 text-blue-500" />
                  Master Control Center
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Right: Enhanced Actions and User Menu */}
            <div className="flex items-center space-x-4">
              {/* System Status */}
              <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>System Online</span>
                </div>
              </div>

              {/* Notifications */}
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                {stats.unreadNotifications > 0 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-bold rounded-full flex items-center justify-center animate-bounce">
                    {stats.unreadNotifications}
                  </div>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                )}
              </button>

              {/* Settings */}
              <Link
                to="/master-admin/settings"
                className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
              </Link>

              {/* Enhanced User Menu */}
              <div className="flex items-center space-x-4 pl-4 border-l border-gray-200/50 dark:border-gray-700/50">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {user?.email?.split('@')[0]}
                  </p>
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    Master Admin
                  </p>
                </div>
                <div className="relative group">
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-105 transition-transform">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 hover:-translate-y-0.5"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex min-h-screen">
        {/* Enhanced Fixed Sidebar Navigation */}
        <aside className="fixed left-0 top-20 bottom-0 w-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl border-r border-gray-200/50 dark:border-gray-700/50 overflow-y-auto z-40 shadow-2xl shadow-gray-900/5">
          <div className="p-6">
            {/* Sidebar Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Navigation</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Control Center</p>
                </div>
              </div>
            </div>

            <nav className="space-y-3">
              {navigationSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id)
                      setSearchParams({ section: section.id })
                    }}
                    className={`w-full flex items-center space-x-4 px-5 py-4 rounded-2xl text-left transition-all duration-300 group relative overflow-hidden ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30 transform scale-105'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-gray-200 hover:shadow-lg hover:-translate-y-0.5'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-700 opacity-90"></div>
                    )}
                    <div className="relative z-10 flex items-center space-x-4 w-full">
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-white/20 shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'
                      }`}>
                        <Icon className={`h-5 w-5 transition-all duration-300 ${
                          isActive
                            ? 'text-white'
                            : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold transition-colors ${
                          isActive ? 'text-white' : ''
                        }`}>{section.label}</p>
                        <p className={`text-xs transition-colors ${
                          isActive ? 'text-white/80' : 'opacity-75'
                        }`}>{section.description}</p>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                          <ArrowUpRight className="h-4 w-4 text-white/80" />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-700/50">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">System Status</p>
                    <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      All systems operational
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Enhanced Main Content Area */}
        <main className="flex-1 ml-72 pt-20 min-h-screen relative z-10 overflow-y-auto">
          <div className="w-full max-w-none p-8">
            <div className="space-y-8">
              {/* Enhanced Section Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                    {(() => {
                      const section = navigationSections.find(s => s.id === activeSection)
                      const Icon = section?.icon || BarChart3
                      return <Icon className="h-6 w-6 text-white" />
                    })()}
                  </div>
                  <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                      {navigationSections.find(s => s.id === activeSection)?.label || 'Overview'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-blue-500" />
                      {navigationSections.find(s => s.id === activeSection)?.description}
                    </p>
                  </div>
                </div>
                {activeSection === 'companies' && (
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-0.5"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Company
                  </Button>
                )}
              </div>

              {/* Dynamic Content Based on Active Section */}
              {renderSectionContent()}
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateCompanyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            refetchCompanies()
          }}
          services={servicesData}
          servicesLoading={servicesLoading}
        />
      )}

      {showNotifications && (
        <NotificationPanel
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notificationsData}
        />
      )}

      {/* Company CRUD Modals */}
      <CompanyViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setSelectedCompany(null)
        }}
        company={selectedCompany}
      />

      <CompanyEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedCompany(null)
        }}
        company={selectedCompany}
        onSave={handleSaveCompany}
        services={servicesData}
      />

      <CompanyDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false)
          setSelectedCompany(null)
        }}
        company={selectedCompany}
        onDelete={handleDeleteConfirm}
      />
    </div>
  )
}

export default EnhancedMasterAdminDashboard
