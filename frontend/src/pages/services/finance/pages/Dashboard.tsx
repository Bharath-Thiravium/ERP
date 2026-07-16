import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  PlusCircle,
  CreditCard,
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
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Banknote,
  User,
  ShoppingCart,
  FileText,
  Zap,
  ChevronsLeft,
  ChevronsRight,
  FileBarChart
} from 'lucide-react'
// import { useAuthStore } from '../../../../store/authStore'
import { useThemeStore } from '../../../../store/themeStore'
import api, { apiClient } from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useSessionValidation } from '../../../../hooks/useSessionValidation'
import toast from 'react-hot-toast'
import Customers from './Customers'
import Products from './Products'
import Quotations from './Quotations.tsx'
import PurchaseOrders from './PurchaseOrders'
import ProformaInvoices from './ProformaInvoices'
import Invoices from './Invoices'
import Payments from './Payments'
import CustomerLedger from '../components/CustomerLedger'
import ComplianceDashboard from './ComplianceDashboard'
import Reports from './Reports'
import Gstr1Export from './Gstr1Export'


// Purchase & Expense Management Pages
import Vendors from './Vendors'
import PurchaseRequests from './PurchaseRequests'
import VendorInvoices from './VendorInvoices'
import PurchasePayments from './PurchasePayments'
import VendorLedger from './VendorLedger'

import { EInvoiceManager } from '../components/EInvoiceManager'

import Integration from './Integration'
import TDSList from './TDSList'
import FinanceCard from '../components/FinanceCard'

const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate()
  // const { logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { serviceUser, sessionKey, logout: serviceUserLogout } = useServiceUserStore()
  
  // Debug logging
  console.log('🔍 Dashboard - serviceUser:', serviceUser ? 'Present' : 'Missing');
  console.log('🔍 Dashboard - sessionKey from store:', sessionKey ? 'Present' : 'Missing');
  console.log('🔍 Dashboard - sessionKey from sessionStorage:', sessionStorage.getItem('service_session_key') ? 'Present' : 'Missing');
  
  // Add session validation
  useSessionValidation()

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

  // Purchase & Expense data state
  const [purchaseExpenseData, setPurchaseExpenseData] = useState({
    totalVendors: 0,
    activeVendors: 0,
    totalPurchaseRequests: 0,
    pendingRequests: 0,
    totalVendorInvoices: 0,
    vendorInvoiceValue: 0,
    outstandingVendorAmount: 0,
    totalPurchasePayments: 0,
    totalPaid: 0,
    totalTDS: 0
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  // Handle URL parameters and session storage for PO creation
  useEffect(() => {
    // Ensure session key is maintained during navigation
    const storeSessionKey = useServiceUserStore.getState().sessionKey
    const storageSessionKey = sessionStorage.getItem('service_session_key')
    
    if (storeSessionKey && !storageSessionKey) {
      sessionStorage.setItem('service_session_key', storeSessionKey)
    }
    
    const urlParams = new URLSearchParams(window.location.search)
    const tab = urlParams.get('tab')
    const action = urlParams.get('action')
    
    // Check if URL path indicates a specific tab
    const currentPath = window.location.pathname
    if (currentPath.includes('/invoices')) {
      setActiveTab('invoices')
    } else if (currentPath.includes('/purchase-orders')) {
      setActiveTab('purchase-orders')
    } else if (tab) {
      setActiveTab(tab)
    }

    if (action === 'create' && tab === 'purchase-orders') {
      const storedQuotation = sessionStorage.getItem('quotationForPO')
      if (storedQuotation) {
        try {
          setQuotationForPO(JSON.parse(storedQuotation))
          setPOAction('create')
          // Clear the session storage
          sessionStorage.removeItem('quotationForPO')
        } catch (error) {
          console.error('Error parsing quotation data:', error)
          sessionStorage.removeItem('quotationForPO')
        }
      }
    }

    // Clean up URL parameters
    if (tab || action) {
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

// Handle PO creation from quotations
const handleQuotationCreatePO = (quotation: any) => {
  // Ensure session key is preserved during navigation
  const currentSessionKey = useServiceUserStore.getState().sessionKey
  const storageSessionKey = sessionStorage.getItem('service_session_key')
  
  // Ensure session key is in sessionStorage
  if (currentSessionKey && !storageSessionKey) {
    sessionStorage.setItem('service_session_key', currentSessionKey)
  } else if (!currentSessionKey && !storageSessionKey) {
    // Try to restore from localStorage
    try {
      const storeData = localStorage.getItem('service-user-storage')
      if (storeData) {
        const parsed = JSON.parse(storeData)
        const storeSessionKey = parsed?.state?.sessionKey
        if (storeSessionKey) {
          sessionStorage.setItem('service_session_key', storeSessionKey)
        }
      }
    } catch (error) {
      console.warn('Failed to restore session during PO creation:', error)
    }
  }
  
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

  const [expandedMenus, setExpandedMenus] = useState<string[]>(['purchase-expense'])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Complete sidebar menu items with hierarchical structure
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3, description: 'Dashboard analytics and insights' },
    { id: 'customers', label: 'Customers', icon: Users, description: 'Manage customer database' },
    { id: 'products', label: 'Products', icon: Building, description: 'Product catalog management' },
    { id: 'quotations', label: 'Quotations', icon: CreditCard, description: 'Create and manage quotations' },
    { id: 'purchase-orders', label: 'PO/WO', icon: ShoppingCart, description: 'Purchase and work orders' },
    { id: 'proforma-invoices', label: 'Proforma Invoices', icon: Banknote, description: 'Proforma invoice management' },
    { id: 'invoices', label: 'Invoices', icon: FileText, description: 'Invoice generation and tracking' },
    { id: 'payments', label: 'Payments', icon: CreditCard, description: 'Payment processing and records' },
    { id: 'customer-ledger', label: 'Customer Ledger', icon: User, description: 'Customer account statements' },
    {
      id: 'purchase-expense',
      label: 'Purchase & Expense',
      icon: ShoppingCart,
      description: 'Vendor and expense management',
      isParent: true,
      children: [
        { id: 'vendors', label: 'Vendors', icon: Users, description: 'Vendor database management' },
        { id: 'purchase-requests', label: 'Purchase Requests', icon: FileText, description: 'Purchase request workflow' },
        { id: 'vendor-invoices', label: 'Vendor Invoices', icon: FileText, description: 'Vendor invoice processing' },
        { id: 'purchase-payments', label: 'Purchase Payments', icon: CreditCard, description: 'Vendor payment management' },
        { id: 'vendor-ledger', label: 'Vendor Ledger', icon: User, description: 'Vendor account statements' }
      ]
    },
    { id: 'tds', label: 'TDS Register', icon: FileText, description: 'TDS deductions & 26Q filing' },
    { id: 'compliance', label: 'Indian Compliance', icon: Shield, description: 'Tax and regulatory compliance' },
    { id: 'reports', label: 'Reports', icon: FileBarChart, description: 'Extract and filter financial documents' },
    { id: 'gstr1', label: 'GSTR-1 Export', icon: FileBarChart, description: 'Generate GSTR-1 Excel Offline Utility' },
    { id: 'einvoice', label: 'E-Invoice', icon: Zap, description: 'Electronic invoice management' },
    { id: 'integration', label: 'Integration', icon: Zap, description: 'Third-party integrations' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'System preferences and security' }
  ]

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => 
      prev.includes(menuId) 
        ? prev.filter(id => id !== menuId)
        : [...prev, menuId]
    )
  }

  // Fetch purchase and expense data
  const fetchPurchaseExpenseData = async () => {
    if (!sessionKey) return

    try {
      const [vendorsRes, purchaseRequestsRes, vendorInvoicesRes, purchasePaymentsRes] = await Promise.all([
        api.get('/api/finance/vendors/', { headers: { Authorization: `Bearer ${sessionKey}` } }),
        api.get('/api/finance/purchase-requests/', { headers: { Authorization: `Bearer ${sessionKey}` } }),
        api.get('/api/finance/vendor-invoices/', { headers: { Authorization: `Bearer ${sessionKey}` } }),
        api.get('/api/finance/purchase-payments/', { headers: { Authorization: `Bearer ${sessionKey}` } })
      ])

      const vendors = vendorsRes.data.results || []
      const purchaseRequests = purchaseRequestsRes.data.results || []
      const vendorInvoices = vendorInvoicesRes.data.results || []
      const purchasePayments = purchasePaymentsRes.data.results || []

      // Get total counts from pagination info or fallback to array length
      const totalVendors = vendorsRes.data.count || vendors.length
      const totalPurchaseRequests = purchaseRequestsRes.data.count || purchaseRequests.length
      const totalVendorInvoices = vendorInvoicesRes.data.count || vendorInvoices.length
      const totalPurchasePayments = purchasePaymentsRes.data.count || purchasePayments.length

      const vendorInvoiceValue = vendorInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount || 0), 0)
      const outstandingVendorAmount = vendorInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.outstanding_amount || 0), 0)
      const totalPaid = purchasePayments.reduce((sum: number, pay: any) => sum + parseFloat(pay.amount || 0), 0)
      const totalTDS = purchasePayments.reduce((sum: number, pay: any) => sum + parseFloat(pay.tds_amount || 0), 0)

      setPurchaseExpenseData({
        totalVendors,
        activeVendors: vendors.filter((v: any) => v.is_active).length,
        totalPurchaseRequests,
        pendingRequests: purchaseRequests.filter((pr: any) => pr.status === 'sent').length,
        totalVendorInvoices,
        vendorInvoiceValue,
        outstandingVendorAmount,
        totalPurchasePayments,
        totalPaid,
        totalTDS
      })
    } catch (error) {
      console.error('Error fetching purchase expense data:', error)
    }
  }

  // Fetch real financial data from APIs
  const fetchFinancialData = async () => {
    if (!sessionKey) return

    try {
      const [quotationsRes, posRes, proformasRes, invoicesRes, customersRes, productsRes] = await Promise.all([
        apiClient.getFinanceQuotations({ session_key: sessionKey }),
        apiClient.getFinancePurchaseOrders({ session_key: sessionKey }),
        apiClient.getFinanceProformaInvoices({ session_key: sessionKey }),
        apiClient.getFinanceInvoices({ session_key: sessionKey }),
        apiClient.getFinanceCustomers({ session_key: sessionKey }),
        apiClient.getFinanceProducts({ session_key: sessionKey })
      ])

      const quotations = quotationsRes.data.results || []
      const pos = posRes.data.results || []
      const proformas = proformasRes.data.results || []
      const invoices = invoicesRes.data.results || []
      const customers = customersRes.data.results || []
      const products = productsRes.data.results || []

      // Get total counts from pagination info or fallback to array length
      const totalCustomers = customersRes.data.count || customers.length
      const totalProducts = productsRes.data.count || products.length
      const totalQuotations = quotationsRes.data.count || quotations.length
      const totalPurchaseOrders = posRes.data.count || pos.length
      const totalProformaInvoices = proformasRes.data.count || proformas.length
      const totalInvoices = invoicesRes.data.count || invoices.length

      // Calculate real financial metrics
      const quotationValue = quotations.reduce((sum: number, q: any) => sum + parseFloat(q.total_amount || 0), 0)
      const poValue = pos.reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0)
      const proformaValue = proformas.reduce((sum: number, p: any) => sum + parseFloat(p.total_amount || 0), 0)
      const invoiceValue = invoices.reduce((sum: number, i: any) => sum + parseFloat(i.total_amount || 0), 0)
      const outstandingAmount = invoices.reduce((sum: number, i: any) => sum + parseFloat(i.outstanding_amount || 0), 0)

      setFinancialData({
        totalQuotations,
        totalPurchaseOrders,
        totalProformaInvoices,
        totalInvoices,
        totalCustomers,
        totalProducts,
        quotationValue,
        poValue,
        proformaValue,
        invoiceValue,
        outstandingAmount,
        pendingQuotations: quotations.filter((q: any) => q.status === 'sent').length,
        approvedQuotations: quotations.filter((q: any) => q.status === 'approved').length,
        draftPOs: pos.filter((p: any) => p.status === 'sent').length,
        confirmedPOs: pos.filter((p: any) => p.status === 'active').length,
        draftProformas: proformas.filter((p: any) => p.status === 'sent').length,
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

  // Fetch financial data when sessionKey is available
  useEffect(() => {
    if (sessionKey) {
      fetchFinancialData()
      fetchPurchaseExpenseData()
    }
  }, [sessionKey])

  // Refresh financial data when quotations are updated
  useEffect(() => {
    if (quotationRefreshKey > 0 && sessionKey) {
      fetchFinancialData()
      fetchPurchaseExpenseData()
    }
  }, [quotationRefreshKey, sessionKey])

  // Format recent activity from real data
  const getRecentActivity = () => {
    return financialData.recentActivity.map((item: any, index: number) => {
      let type: string
      let description: string
      let docNumber: string
      const amount = parseFloat(item.total_amount || 0)
      const customerName = item.customer_name || item.customer_details?.name || 'Customer'

      if (item.internal_po_number) {
        type = 'purchase_order'
        docNumber = item.internal_po_number
        description = `Purchase Order ${docNumber}`
      } else if (item.proforma_number) {
        type = 'proforma_invoice'
        docNumber = item.proforma_number
        description = `Proforma Invoice ${docNumber}`
      } else if (item.invoice_number) {
        type = 'invoice'
        docNumber = item.invoice_number
        description = `Invoice ${docNumber}`
      } else if (item.quotation_number) {
        type = 'quotation'
        docNumber = item.quotation_number
        description = `Quotation ${docNumber}`
      } else {
        type = 'quotation'
        docNumber = item.id || index
        description = `Document #${docNumber}`
      }

      return {
        id: `${type}-${item.id || index}-${index}`,
        date: item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        description: `${description} - ${customerName}`,
        amount,
        type,
        status: item.payment_status || item.status || 'draft',
        originalItem: item
      }
    })
  }

  // Handle transaction actions
  const handleRefreshTransactions = () => {
    fetchFinancialData()
    fetchPurchaseExpenseData()
    toast.success('Transactions refreshed')
  }

  const handleNewTransaction = () => {
    setActiveTab('quotations')
  }

  const handleViewTransaction = (transaction: any) => {
    const { type } = transaction
    if (type === 'quotation') {
      setActiveTab('quotations')
    } else if (type === 'purchase_order') {
      setActiveTab('purchase-orders')
    } else if (type === 'proforma_invoice') {
      setActiveTab('proforma-invoices')
    } else if (type === 'invoice') {
      setActiveTab('invoices')
    }
  }

  const handleEditTransaction = (transaction: any) => {
    handleViewTransaction(transaction)
  }

  const handleDeleteTransaction = () => {
    toast.error('Delete functionality not implemented')
  }

  // Handle chart actions
  const handleRevenueAnalyticsMenu = () => {
    toast('Revenue analytics options not implemented')
  }

  const handlePaymentStatusExport = () => {
    toast('Payment status export not implemented')
  }

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

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Enhanced Key Metrics - Sales & Purchase Management */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Sales Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Quotations Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 p-6 text-gray-800 shadow-lg shadow-blue-200/30 border border-gray-300 dark:border-transparent">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/60 rounded-xl">
                <FileText className="h-6 w-6 text-blue-600" />
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-green-100 to-green-200 p-6 text-gray-800 shadow-lg shadow-green-200/30 border border-gray-300 dark:border-transparent">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/60 rounded-xl">
                <ShoppingCart className="h-6 w-6 text-green-600" />
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 p-6 text-gray-800 shadow-lg shadow-purple-200/30 border border-gray-300 dark:border-transparent">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/60 rounded-xl">
                <Banknote className="h-6 w-6 text-purple-600" />
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-200 p-6 text-gray-800 shadow-lg shadow-emerald-200/30 border border-gray-300 dark:border-transparent">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/60 rounded-xl">
                <FileText className="h-6 w-6 text-emerald-600" />
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 p-6 text-gray-800 shadow-lg shadow-orange-200/30 border border-gray-300 dark:border-transparent">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-white/60 rounded-xl">
                <Users className="h-6 w-6 text-orange-600" />
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
      </div>

      {/* Purchase & Expense Management Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Purchase & Expense Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Vendors Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 via-purple-100 to-purple-200 p-6 text-gray-800 shadow-lg shadow-purple-200/30 border border-gray-300 dark:border-transparent">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/60 rounded-xl">
                  <Building className="h-6 w-6 text-purple-600" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">Total Vendors</div>
                  <div className="text-2xl font-bold">{purchaseExpenseData.totalVendors}</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">{purchaseExpenseData.activeVendors} active vendors</span>
                <span className="ml-2 opacity-70">• Ready to use</span>
              </div>
            </div>
          </div>

          {/* Purchase Requests Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-50 via-green-100 to-green-200 p-6 text-gray-800 shadow-lg shadow-green-200/30 border border-gray-300 dark:border-transparent">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/60 rounded-xl">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">Purchase Requests</div>
                  <div className="text-2xl font-bold">{purchaseExpenseData.totalPurchaseRequests}</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">{purchaseExpenseData.totalPurchaseRequests} requests sent</span>
                <span className="ml-2 opacity-70">• {purchaseExpenseData.pendingRequests} pending</span>
              </div>
            </div>
          </div>

          {/* Vendor Invoices Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-indigo-100 to-indigo-200 p-6 text-gray-800 shadow-lg shadow-indigo-200/30 border border-gray-300 dark:border-transparent">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/60 rounded-xl">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">Vendor Invoices</div>
                  <div className="text-2xl font-bold">₹{purchaseExpenseData.vendorInvoiceValue.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">{purchaseExpenseData.totalVendorInvoices} invoices</span>
                <span className="ml-2 opacity-70">• ₹{purchaseExpenseData.outstandingVendorAmount.toLocaleString()} outstanding</span>
              </div>
            </div>
          </div>

          {/* Purchase Payments Card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-50 via-teal-100 to-teal-200 p-6 text-gray-800 shadow-lg shadow-teal-200/30 border border-gray-300 dark:border-transparent">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-white/60 rounded-xl">
                  <CreditCard className="h-6 w-6 text-teal-600" />
                </div>
                <div className="text-right">
                  <div className="text-xs opacity-80">Payments Made</div>
                  <div className="text-2xl font-bold">₹{purchaseExpenseData.totalPaid.toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center text-sm">
                <span className="font-medium">{purchaseExpenseData.totalPurchasePayments} payments</span>
                <span className="ml-2 opacity-70">• ₹{purchaseExpenseData.totalTDS.toLocaleString()} TDS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Charts and Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Analytics Chart */}
        <FinanceCard>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Analytics</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quotations vs Purchase Orders vs Invoices</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRevenueAnalyticsMenu}>
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4">
            <div className="h-full flex flex-col justify-between">
              {/* Revenue Bars */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quotations</span>
                  <span className="text-sm font-bold text-blue-600">₹{financialData.quotationValue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((financialData.quotationValue / Math.max(financialData.quotationValue, financialData.poValue, financialData.invoiceValue)) * 100, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Purchase Orders</span>
                  <span className="text-sm font-bold text-green-600">₹{financialData.poValue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((financialData.poValue / Math.max(financialData.quotationValue, financialData.poValue, financialData.invoiceValue)) * 100, 100)}%` }}
                  ></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoices</span>
                  <span className="text-sm font-bold text-purple-600">₹{financialData.invoiceValue.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min((financialData.invoiceValue / Math.max(financialData.quotationValue, financialData.poValue, financialData.invoiceValue)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Conversion Rate */}
              <div className="mt-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <div className="text-xs text-gray-600 dark:text-gray-400">Conversion Rate</div>
                <div className="text-sm font-bold text-gray-900 dark:text-white">
                  {financialData.quotationValue > 0 ? ((financialData.poValue / financialData.quotationValue) * 100).toFixed(1) : 0}% Quote to PO
                </div>
              </div>
            </div>
          </div>
        </FinanceCard>

        {/* Payment Status Breakdown */}
        <FinanceCard className="" padding="sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Status</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding vs Paid amounts</p>
            </div>
            <Button variant="outline" size="sm" onClick={handlePaymentStatusExport}>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-64 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4">
            <div className="h-full flex items-center justify-between">
              {/* Enhanced Donut Chart */}
              <div className="relative flex-shrink-0">
                <div className="w-40 h-40 relative">
                  {/* Background Circle */}
                  <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="20"
                      fill="transparent"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Paid Amount Arc */}
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#paidGradient)"
                      strokeWidth="20"
                      fill="transparent"
                      strokeDasharray={`${financialData.invoiceValue > 0 ? ((financialData.invoiceValue - financialData.outstandingAmount) / financialData.invoiceValue) * 440 : 0} 440`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    {/* Outstanding Amount Arc */}
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="url(#outstandingGradient)"
                      strokeWidth="20"
                      fill="transparent"
                      strokeDasharray={`${financialData.invoiceValue > 0 ? (financialData.outstandingAmount / financialData.invoiceValue) * 440 : 0} 440`}
                      strokeDashoffset={`-${financialData.invoiceValue > 0 ? ((financialData.invoiceValue - financialData.outstandingAmount) / financialData.invoiceValue) * 440 : 0}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="paidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                      <linearGradient id="outstandingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" />
                        <stop offset="100%" stopColor="#dc2626" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Center Content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {financialData.invoiceValue > 0 ? ((1 - financialData.outstandingAmount / financialData.invoiceValue) * 100).toFixed(0) : 0}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Paid</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Stats Panel */}
              <div className="flex-1 ml-8 space-y-4">
                {/* Paid Amount */}
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-green-200/50 dark:border-green-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-green-600 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Paid Amount</span>
                    </div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      {financialData.invoiceValue > 0 ? (((financialData.invoiceValue - financialData.outstandingAmount) / financialData.invoiceValue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    ₹{(financialData.invoiceValue - financialData.outstandingAmount).toLocaleString()}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${financialData.invoiceValue > 0 ? ((financialData.invoiceValue - financialData.outstandingAmount) / financialData.invoiceValue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Outstanding Amount */}
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4 border border-red-200/50 dark:border-red-800/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-red-600 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Outstanding</span>
                    </div>
                    <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {financialData.invoiceValue > 0 ? ((financialData.outstandingAmount / financialData.invoiceValue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="text-xl font-bold text-red-600 dark:text-red-400">
                    ₹{financialData.outstandingAmount.toLocaleString()}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${financialData.invoiceValue > 0 ? (financialData.outstandingAmount / financialData.invoiceValue) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
                
                {/* Total Invoice Value */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Invoice Value</span>
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ₹{financialData.invoiceValue.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FinanceCard>
      </div>

      {/* Business Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Stats */}
        <FinanceCard>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Conversion Rate</span>
              <span className="font-semibold text-green-600">
                {financialData.quotationValue > 0 ? ((financialData.poValue / financialData.quotationValue) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg. Deal Size</span>
              <span className="font-semibold text-blue-600">
                ₹{financialData.totalPurchaseOrders > 0 ? (financialData.poValue / financialData.totalPurchaseOrders).toLocaleString() : 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Collection Rate</span>
              <span className="font-semibold text-purple-600">
                {financialData.invoiceValue > 0 ? (((financialData.invoiceValue - financialData.outstandingAmount) / financialData.invoiceValue) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </FinanceCard>
        
        {/* Document Status */}
        <FinanceCard>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Document Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pending Quotes</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                {financialData.pendingQuotations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Draft POs</span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {financialData.draftPOs}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Paid Invoices</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                {financialData.paidInvoices}
              </span>
            </div>
          </div>
        </FinanceCard>
        
        {/* Performance Metrics */}
        <FinanceCard>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</span>
                <span className="text-sm font-semibold text-green-600">
                  ₹{(financialData.quotationValue + financialData.poValue + financialData.invoiceValue).toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active Documents</span>
                <span className="text-sm font-semibold text-blue-600">
                  {financialData.totalQuotations + financialData.totalPurchaseOrders + financialData.totalInvoices}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </FinanceCard>
      </div>

      {/* Modern Recent Transactions */}
      <FinanceCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latest financial activities</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={handleRefreshTransactions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleNewTransaction} className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Transaction
            </Button>
          </div>
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
                    : transaction.type === 'invoice'
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                    : 'bg-gradient-to-r from-purple-500 to-violet-600 text-white'
                }`}>
                  {transaction.type === 'quotation' ? (
                    <FileText className="h-5 w-5" />
                  ) : transaction.type === 'purchase_order' ? (
                    <ShoppingCart className="h-5 w-5" />
                  ) : transaction.type === 'invoice' ? (
                    <Banknote className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
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
                    : transaction.type === 'invoice'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-purple-600 dark:text-purple-400'
                }`}>
                  ₹{transaction.amount.toLocaleString()}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleViewTransaction(transaction)}>
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditTransaction(transaction)}>
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => handleDeleteTransaction()}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </FinanceCard>

    </div>
  )

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
                {serviceUser?.unique_service_id || 'N/A'}
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
        console.log('🔍 Dashboard - Rendering Invoices with sessionKey:', sessionKey ? 'Present' : 'Missing');
        return <Invoices sessionKey={sessionKey || ''} />
      case 'payments':
        return <Payments sessionKey={sessionKey || ''} />
      case 'customer-ledger':
        return <CustomerLedger sessionKey={sessionKey || ''} />
      case 'vendors':
        return <Vendors />
      case 'purchase-requests':
        return <PurchaseRequests sessionKey={sessionKey || ''} />
      case 'vendor-invoices':
        return <VendorInvoices sessionKey={sessionKey || ''} />
      case 'purchase-payments':
        return <PurchasePayments />
      case 'vendor-ledger':
        return <VendorLedger />
      case 'tds':
        return <TDSList />
      case 'compliance':
        return <ComplianceDashboard sessionKey={sessionKey || ''} />
      case 'reports':
        return <Reports />
      case 'gstr1':
        return <Gstr1Export />
      case 'einvoice':
        return <EInvoiceManager />
      case 'integration':
        return <Integration />
      case 'settings':
        return renderSettings()
      default:
        return renderOverview()
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Modern Sidebar */}
      <aside id="sidebar" className={`fixed inset-y-0 left-0 z-[var(--z-sidebar)] bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Sidebar Header with Company Logo */}
        <div className="flex items-center h-16 px-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'space-x-3'}`}>
            {/* Company Logo */}
            <div className={`h-8 w-8 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 ${!companyData?.logo ? 'bg-gradient-to-r from-green-500 to-emerald-600' : ''}`}>
              {companyData?.logo ? (
                <img
                  src={companyData.logo}
                  alt={`${companyData.name} logo`}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Building className="h-5 w-5 text-white" />
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  Finance Management
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {companyData?.name || serviceUser?.company_name || 'Company'}
                </p>
              </div>
            )}
          </div>
          {/* Collapse toggle — only visible when expanded */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
              title="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="mt-6 px-3 flex-1 overflow-y-auto pr-1">
          {/* Expand button when collapsed */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-2 mb-4 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Expand sidebar"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
          )}
          <div className="space-y-1">
            {sidebarItems.map((item: any) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              const isExpanded = expandedMenus.includes(item.id)
              const hasActiveChild = item.children?.some((child: any) => activeTab === child.id)
              
              if (item.isParent) {
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => sidebarCollapsed ? setSidebarCollapsed(false) : toggleMenu(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                        hasActiveChild
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/25'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                      } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    >
                      <div className={`p-2 rounded-xl transition-all duration-300 flex-shrink-0 ${
                        hasActiveChild
                          ? 'bg-white/20 shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <Icon className={`h-5 w-5 ${hasActiveChild ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                      </div>
                      {!sidebarCollapsed && (
                        <>
                          {hasActiveChild ? (
                            <div className="flex-1 ml-3 text-left overflow-hidden">
                              <p className="text-sm font-semibold text-white truncate">{item.label}</p>
                              <p className="text-xs text-white/80 truncate">{item.description}</p>
                            </div>
                          ) : (
                            <span className="ml-3 truncate">{item.label}</span>
                          )}
                          <ChevronRight className={`h-4 w-4 ml-auto flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </>
                      )}
                    </button>
                    {!sidebarCollapsed && isExpanded && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.children.map((child: any) => {
                          const ChildIcon = child.icon
                          const isChildActive = activeTab === child.id
                          return (
                            <button
                              key={child.id}
                              onClick={() => setActiveTab(child.id)}
                              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                isChildActive
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                              }`}
                            >
                              <div className={`p-1.5 rounded-lg transition-all duration-300 flex-shrink-0 ${
                                isChildActive
                                  ? 'bg-white/20 shadow-lg'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                <ChildIcon className={`h-4 w-4 ${isChildActive ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                              </div>
                              {isChildActive ? (
                                <div className="flex-1 ml-3 text-left overflow-hidden">
                                  <p className="text-sm font-semibold text-white truncate">{child.label}</p>
                                  <p className="text-xs text-white/80 truncate">{child.description}</p>
                                </div>
                              ) : (
                                <span className="ml-3 truncate">{child.label}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 flex-shrink-0 ${
                    isActive
                      ? 'bg-white/20 shadow-lg'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}>
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                  {!sidebarCollapsed && (
                    isActive ? (
                      <div className="flex-1 ml-3 text-left overflow-hidden">
                        <p className="text-sm font-semibold text-white truncate">{item.label}</p>
                        <p className="text-xs text-white/80 truncate">{item.description}</p>
                      </div>
                    ) : (
                      <span className="ml-3 truncate">{item.label}</span>
                    )
                  )}
                  {!sidebarCollapsed && isActive && <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </nav>

        {/* User Info at Bottom */}
        <div className="p-3 border-t border-gray-200/50 dark:border-gray-700/50">
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <button
                onClick={serviceUserLogout}
                title="Logout"
                className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
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
                onClick={serviceUserLogout}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* Top Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Clear service user session and redirect to company services
                    sessionStorage.removeItem('service_session_key')
                    serviceUserLogout()
                    navigate('/company/services')
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Services
                </Button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Finance Module
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

export default FinanceDashboard
