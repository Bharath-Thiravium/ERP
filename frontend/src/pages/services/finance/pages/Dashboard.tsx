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
  ShoppingCart,
  FileText
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
import ProformaInvoices from './ProformaInvoices'
import Invoices from './Invoices'
import Payments from './Payments'
import CustomerLedger from '../components/CustomerLedger'

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

  // Real financial data state
  const [financialData, setFinancialData] = useState({
    totalQuotations: 0,
    totalPurchaseOrders: 0,
    totalProformaInvoices: 0,
    totalInvoices: 0,
    totalCustomers: 0,
    totalProducts: 0,
    quotationValue: 0,
    poValue: 0,
    proformaValue: 0,
    invoiceValue: 0,
    outstandingAmount: 0,
    pendingQuotations: 0,
    approvedQuotations: 0,
    draftPOs: 0,
    confirmedPOs: 0,
    draftProformas: 0,
    sentProformas: 0,
    draftInvoices: 0,
    paidInvoices: 0,
    recentActivity: [] as any[]
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

  // Simplified sidebar menu items - Overview, Customers, Products, Quotations, PO/WO, Proforma Invoices, Invoices, and Settings
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, active: true },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products', icon: Building },
    { id: 'quotations', label: 'Quotations', icon: CreditCard },
    { id: 'purchase-orders', label: 'PO/WO', icon: ShoppingCart },
    { id: 'proforma-invoices', label: 'Proforma Invoices', icon: Banknote },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'customer-ledger', label: 'Customer Ledger', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  // Fetch real financial data from APIs
  const fetchFinancialData = async () => {
    if (!sessionKey) return

    try {
      const [quotationsRes, posRes, proformasRes, invoicesRes, customersRes, productsRes] = await Promise.all([
        api.get(`/api/finance/quotations/?session_key=${sessionKey}`),
        api.get(`/api/finance/purchase-orders/?session_key=${sessionKey}`),
        api.get(`/api/finance/proforma-invoices/?session_key=${sessionKey}`),
        api.get(`/api/finance/invoices/?session_key=${sessionKey}`),
        api.get(`/api/finance/customers/?session_key=${sessionKey}`),
        api.get(`/api/finance/products/?session_key=${sessionKey}`)
      ])

      const quotations = quotationsRes.data.results || []
      const pos = posRes.data.results || []
      const proformas = proformasRes.data.results || []
      const invoices = invoicesRes.data.results || []
      const customers = customersRes.data.results || []
      const products = productsRes.data.results || []

      // Calculate real financial metrics
      const quotationValue = quotations.reduce((sum: number, q: any) => sum + parseFloat(q.total_amount || 0), 0)
      const poValue = pos.reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0)
      const proformaValue = proformas.reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0)
      const invoiceValue = invoices.reduce((sum: number, i: any) => sum + parseFloat(i.total_amount || 0), 0)
      const outstandingAmount = invoices.reduce((sum: number, i: any) => sum + parseFloat(i.outstanding_amount || 0), 0)

      setFinancialData({
        totalQuotations: quotations.length,
        totalPurchaseOrders: pos.length,
        totalProformaInvoices: proformas.length,
        totalInvoices: invoices.length,
        totalCustomers: customers.length,
        totalProducts: products.length,
        quotationValue,
        poValue,
        proformaValue,
        invoiceValue,
        outstandingAmount,
        pendingQuotations: quotations.filter((q: any) => q.status === 'sent').length,
        approvedQuotations: quotations.filter((q: any) => q.status === 'approved').length,
        draftPOs: pos.filter((p: any) => p.status === 'draft').length,
        confirmedPOs: pos.filter((p: any) => p.status === 'confirmed').length,
        draftProformas: proformas.filter((p: any) => p.status === 'draft').length,
        sentProformas: proformas.filter((p: any) => p.status === 'sent').length,
        draftInvoices: invoices.filter((i: any) => i.status === 'draft').length,
        paidInvoices: invoices.filter((i: any) => i.payment_status === 'paid').length,
        recentActivity: [...quotations, ...pos, ...proformas, ...invoices]
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
      })
    } catch (error) {
      console.error('Error fetching financial data:', error)
    }
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

  // Fetch financial data when sessionKey is available
  useEffect(() => {
    if (sessionKey) {
      fetchFinancialData()
    }
  }, [sessionKey])

  // Refresh financial data when quotations are updated
  useEffect(() => {
    if (quotationRefreshKey > 0 && sessionKey) {
      fetchFinancialData()
    }
  }, [quotationRefreshKey, sessionKey])

  // Format recent activity from real data
  const getRecentActivity = () => {
    return financialData.recentActivity.map((item: any, index: number) => {
      let type = 'quotation'
      let description = `Quotation ${item.quotation_number || item.internal_po_number || item.proforma_number}`
      let amount = parseFloat(item.total_amount || 0)

      if (item.internal_po_number) {
        type = 'purchase_order'
        description = `Purchase Order ${item.internal_po_number}`
      } else if (item.proforma_number) {
        type = 'proforma_invoice'
        description = `Proforma Invoice ${item.proforma_number}`
      }

      return {
        id: item.id || index,
        date: item.created_at ? new Date(item.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        description: `${description} - ${item.customer_name || 'Customer'}`,
        amount,
        type,
        status: item.status || 'draft'
      }
    })
  }

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
        {/* Total Quotations Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl shadow-blue-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total Value</div>
                <div className="text-2xl font-bold">₹{financialData.quotationValue.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">{financialData.totalQuotations} quotations</span>
              <span className="ml-2 opacity-70">• {financialData.pendingQuotations} pending</span>
            </div>
          </div>
        </div>

        {/* Total Purchase Orders Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl shadow-green-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total Value</div>
                <div className="text-2xl font-bold">₹{financialData.poValue.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">{financialData.totalPurchaseOrders} purchase orders</span>
              <span className="ml-2 opacity-70">• {financialData.confirmedPOs} confirmed</span>
            </div>
          </div>
        </div>

        {/* Total Proforma Invoices Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl shadow-purple-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Banknote className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total Value</div>
                <div className="text-2xl font-bold">₹{financialData.proformaValue.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">{financialData.totalProformaInvoices} proforma invoices</span>
              <span className="ml-2 opacity-70">• {financialData.sentProformas} sent</span>
            </div>
          </div>
        </div>

        {/* Total Invoices Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-xl shadow-emerald-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Total Value</div>
                <div className="text-2xl font-bold">₹{financialData.invoiceValue.toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">{financialData.totalInvoices} invoices</span>
              <span className="ml-2 opacity-70">• ₹{financialData.outstandingAmount.toLocaleString()} outstanding</span>
            </div>
          </div>
        </div>

        {/* Customers & Products Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl shadow-orange-500/25">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="h-6 w-6" />
              </div>
              <div className="text-right">
                <div className="text-xs opacity-80">Database</div>
                <div className="text-2xl font-bold">{financialData.totalCustomers + financialData.totalProducts}</div>
              </div>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium">{financialData.totalCustomers} customers</span>
              <span className="ml-2 opacity-70">• {financialData.totalProducts} products</span>
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
          {getRecentActivity().map((transaction: any) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${
                  transaction.type === 'quotation'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : transaction.type === 'purchase_order'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white'
                }`}>
                  {transaction.type === 'quotation' ? (
                    <FileText className="h-5 w-5" />
                  ) : transaction.type === 'purchase_order' ? (
                    <ShoppingCart className="h-5 w-5" />
                  ) : (
                    <Banknote className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{transaction.description}</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.date}</p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      transaction.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      transaction.status === 'sent' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  transaction.type === 'quotation'
                    ? 'text-blue-600 dark:text-blue-400'
                    : transaction.type === 'purchase_order'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-purple-600 dark:text-purple-400'
                }`}>
                  ₹{transaction.amount.toLocaleString()}
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
      case 'proforma-invoices':
        return <ProformaInvoices sessionKey={sessionKey || ''} />
      case 'invoices':
        return <Invoices sessionKey={sessionKey || ''} />
      case 'payments':
        return <Payments sessionKey={sessionKey || ''} />
      case 'customer-ledger':
        return <CustomerLedger sessionKey={sessionKey || ''} />
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
