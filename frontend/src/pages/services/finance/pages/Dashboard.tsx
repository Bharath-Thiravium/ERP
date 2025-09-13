import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  PieChart,
  BarChart3,
  Building,
  Users,
  Settings,
  Eye,
  Edit,
  Trash2,
  LogOut,
  Sun,
  Moon,
  Shield,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Banknote,
  LineChart,
  PlusCircle,
  User,
  ShoppingCart
} from 'lucide-react'
import { useAuthStore } from '../../../../store/authStore'
import { useThemeStore } from '../../../../store/themeStore'
import api from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import Customers from './Customers'
import Products from './Products'
import Quotations from './Quotations.tsx'
import PurchaseOrders from './PurchaseOrders'

const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { serviceUser, sessionKey } = useServiceUserStore()


  const [activeTab, setActiveTab] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [companyData, setCompanyData] = useState<any>(null)
  const [quotationForPO, setQuotationForPO] = useState<any>(null)
  const [poAction, setPOAction] = useState<string | null>(null)
  const [quotationRefreshKey, setQuotationRefreshKey] = useState(0)
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Handle URL parameters and session storage for PO creation
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    const action = urlParams.get('action')

    if (tab) {
      setActiveTab(tab)
    }

    if (action === 'create' && tab === 'purchase-orders') {
      const storedQuotation = sessionStorage.getItem('quotationForPO')
      if (storedQuotation) {
        setQuotationForPO(JSON.parse(storedQuotation))
        setPOAction('create')
        // Clear the session storage
        sessionStorage.removeItem('quotationForPO')
      }
    }

    // Clean up URL parameters
    if (tab || action) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

// Handle PO creation from quotations
const handleQuotationCreatePO = (quotation: any) => {
  setQuotationForPO(quotation)
  setPOAction('create')
  setActiveTab('purchase-orders')
}

// Handle PO creation success to refresh quotations
const handlePOCreated = () => {
  setQuotationRefreshKey(prev => prev + 1)
}

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

        // Try both Authorization header and query parameter approaches
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
      // Keep the existing company data (name) but without logo
    }
  }

  // Simplified sidebar menu items - Overview, Customers, Products, Quotations, PO/WO, and Settings
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, active: true },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Building },
    { id: 'quotations', label: 'Quotations', icon: CreditCard },
    { id: 'purchase-orders', label: 'PO/WO', icon: ShoppingCart },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  // Enhanced financial data
  const financialData = {
    totalRevenue: 2450000,
    totalExpenses: 1850000,
    netProfit: 600000,
    cashFlow: 450000,
    accountsReceivable: 320000,
    accountsPayable: 180000,
    monthlyGrowth: 12.5,
    yearlyGrowth: 28.3,
    budgetUtilization: 78.5,
    profitMargin: 24.5,
    operatingExpenses: 1200000,
    grossProfit: 1250000,
    currentAssets: 850000,
    currentLiabilities: 420000,
    workingCapital: 430000
  }



  useEffect(() => {
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

  const recentTransactions = [
    { id: 1, date: '2025-09-10', description: 'Client Payment - ABC Corp', amount: 25000, type: 'income' },
    { id: 2, date: '2025-09-09', description: 'Office Rent Payment', amount: -8500, type: 'expense' },
    { id: 3, date: '2025-09-08', description: 'Software License Renewal', amount: -2400, type: 'expense' },
    { id: 4, date: '2025-09-07', description: 'Consulting Services - XYZ Ltd', amount: 18000, type: 'income' },
    { id: 5, date: '2025-09-06', description: 'Equipment Purchase', amount: -15000, type: 'expense' }
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }



  const renderOverview = () => (
    <div className="space-y-8">
      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl shadow-green-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total Revenue</div>
                <div className="text-2xl font-bold">{formatCurrency(financialData.totalRevenue)}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="font-medium">{formatPercentage(financialData.yearlyGrowth)} YoY</span>
            </div>
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 p-6 text-white shadow-xl shadow-red-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total Expenses</div>
                <div className="text-2xl font-bold">{formatCurrency(financialData.totalExpenses)}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <TrendingDown className="h-4 w-4 mr-1" />
              <span className="font-medium">-6.2% vs last month</span>
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <LineChart className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Net Profit</div>
                <div className="text-2xl font-bold">{formatCurrency(financialData.netProfit)}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="font-medium">{formatPercentage(financialData.monthlyGrowth)} MoM</span>
            </div>
          </div>
        </div>

        {/* Cash Flow Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl shadow-purple-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Banknote className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Cash Flow</div>
                <div className="text-2xl font-bold">{formatCurrency(financialData.cashFlow)}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="font-medium">Positive trend</span>
            </div>
          </div>
        </div>
      </div>


      {/* Modern Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue vs Expenses Chart */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue vs Expenses</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly comparison for the last 6 months</p>
            </div>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Chart visualization will be implemented</p>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Expense Breakdown</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Current month expense categories</p>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl">
            <div className="text-center">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Pie chart visualization will be implemented</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Recent Transactions */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest financial activities</p>
          </div>
          <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
        </div>
        <div className="space-y-3">
          {recentTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${
                  transaction.type === 'income'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                }`}>
                  {transaction.type === 'income' ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{transaction.description}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  transaction.type === 'income'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )



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

      await api.post('/api/auth/service-user/change-password/', {
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
      {/* Page Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Finance Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your finance service preferences and security settings
        </p>
      </div>

      {/* Password Change Section */}
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

      {/* Account Information */}
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
                Finance Management
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                Finance User
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
        return renderOverview()
      case 'customers':
        return <Customers />
      case 'products':
        return <Products />
      case 'quotations':
        return <Quotations key={quotationRefreshKey} onCreatePO={handleQuotationCreatePO} />
      case 'purchase-orders':
        return <PurchaseOrders quotationForPO={quotationForPO} initialAction={poAction} onActionComplete={() => { setQuotationForPO(null); setPOAction(null); }} onPOCreated={handlePOCreated} />
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
        {/* Sidebar Header with Company Logo */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-3">
            {/* Company Logo */}
            <div className="h-8 w-8 rounded-lg overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
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
                Finance Management
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
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
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
                {serviceUser?.role || 'Finance User'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
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
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Finance Dashboard
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
                <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Transaction
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

export default FinanceDashboard
