import React, { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api'
import api from '../../../../lib/api'
import { toast } from 'react-hot-toast'
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Calendar,
  IndianRupee,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  Mail,
  Send,
  TrendingUp,
  RotateCcw,
  RefreshCw,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
// import ProformaInvoiceForm from './ProformaInvoiceForm' // Removed - using simplified forms
import ProformaInvoiceView from './ProformaInvoiceView'
import SimpleProformaForm from './SimpleProformaForm'
import UpdatePaymentModal from './UpdatePaymentModal'
import SendEmailModal from './SendEmailModal'
import RejectInvoiceModal from './RejectInvoiceModal'
import CreateNewInvoiceModal from './CreateNewInvoiceModal'
import MetricCard from './MetricCard'
import { isOverdue, getOverdueDate } from '../../../../utils/overdueUtils'


interface ProformaInvoice {
  id: number
  proforma_number: string
  proforma_date: string
  due_date: string
  customer_name: string
  customer_code: string
  customer_project_area: string
  customer_shipping_addresses?: Array<{
    type: string
    address: string
    is_default?: boolean
  }>
  po_number: string
  status: string
  payment_status: string
  paid_amount: string | number
  outstanding_amount: string | number
  gst_type: string
  subtotal: string | number
  total_tax: string | number
  total_amount: string | number
  item_count: number
  is_rejected?: boolean
  rejection_reason?: string
  is_revised?: boolean
  revision_count?: number
  revised_at?: string
  revised_by_name?: string
  proforma_items: Array<{
    product_name: string
    quantity: number
    unit: string
    unit_price: number
    line_total: number
  }>
  created_at: string
  created_by_name: string
  // Optional customer and address fields for edit forms
  customer_details?: any
  customer?: number
  customer_email?: string
  customer_phone?: string
  customer_gstin?: string
  billing_address_line1?: string
  billing_address_line2?: string
  billing_city?: string
  billing_state?: string
  billing_pincode?: string
  billing_country?: string
  shipping_address_details?: any
}

interface ProformaInvoiceListProps {
  sessionKey: string
}

const ProformaInvoiceList: React.FC<ProformaInvoiceListProps> = ({ sessionKey }) => {
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState('-proforma_date')

  const handleSort = (field: string) => {
    setSortBy(prev => prev === `-${field}` ? field : `-${field}`)
    setCurrentPage(1)
  }
  const SortIcon = ({ field }: { field: string }) => (
    sortBy === field ? <ChevronUp className="w-3 h-3 inline ml-1" /> :
    sortBy === `-${field}` ? <ChevronDown className="w-3 h-3 inline ml-1" /> :
    <ChevronUp className="w-3 h-3 inline ml-1 opacity-30" />
  )
  const [showForm, setShowForm] = useState(false)
  const [selectedProformaInvoice, setSelectedProformaInvoice] = useState<ProformaInvoice | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState<ProformaInvoice | null>(null)

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchProformaInvoices()
    setRefreshing(false)
  }

  const paymentStatusOptions = [
    { value: '', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' }
  ]

  const getPaymentStatusIcon = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'unpaid': return <XCircle className="w-4 h-4 text-red-500" />
      case 'partially_paid': return <Clock className="w-4 h-4 text-yellow-500" />
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'overdue': return <XCircle className="w-4 h-4 text-red-600" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'unpaid': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const fetchProformaInvoices = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        session_key: sessionKey
      })

      if (paymentStatusFilter) params.append('payment_status', paymentStatusFilter)
      params.append('ordering', sortBy)

      console.log('Fetching proforma invoices with params:', params.toString()) // Debug log
      const response = await apiClient.getFinanceProformaInvoices(Object.fromEntries(new URLSearchParams(params)))
      console.log('Proforma Invoice API Response:', response.data) // Debug log

      const invoices = response.data.results || []
      
      // Apply overdue logic to proforma invoices
      const processedInvoices = invoices.map((invoice: any) => ({
        ...invoice
      }))
      
      // Debug: Check if customer_shipping_addresses is in the response
      console.log('First Proforma customer data:', processedInvoices[0] ? {
        customer_name: processedInvoices[0].customer_name,
        customer_shipping_addresses: processedInvoices[0].customer_shipping_addresses,
        hasAddresses: processedInvoices[0].customer_shipping_addresses && processedInvoices[0].customer_shipping_addresses.length > 0
      } : 'No proforma invoices found')
      
      setProformaInvoices(processedInvoices)
      setTotalPages(Math.ceil(response.data.count / 5))
      
      // Calculate metrics
      const total = processedInvoices.length
      const draft = processedInvoices.filter((inv: ProformaInvoice) => inv.status === 'draft').length
      const sent = processedInvoices.filter((inv: ProformaInvoice) => inv.status === 'sent').length
      const rejected = processedInvoices.filter((inv: ProformaInvoice) => inv.is_rejected).length
      const totalValue = processedInvoices.reduce((sum: number, inv: ProformaInvoice) => sum + parseFloat(inv.total_amount?.toString() || '0'), 0)
      const paidAmount = processedInvoices.reduce((sum: number, inv: ProformaInvoice) => sum + parseFloat(inv.paid_amount?.toString() || '0'), 0)
      const collectionRate = totalValue > 0 ? ((paidAmount / totalValue) * 100) : 0
      
      setMetrics({ total, draft, sent, rejected, totalValue, collectionRate })

      if (invoices.length === 0 && currentPage === 1) {
        console.log('No proforma invoices found') // Debug log
      }
    } catch (error) {
      console.error('Error fetching proforma invoices:', error)
      if ((error as any).response?.status === 401) {
        toast.error('Session expired. Please refresh the page.')
      } else {
        toast.error('Failed to fetch proforma invoices. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProformaInvoices()
  }, [currentPage, paymentStatusFilter, sessionKey, sortBy])

  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedForPayment, setSelectedForPayment] = useState<ProformaInvoice | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedForEmail, setSelectedForEmail] = useState<ProformaInvoice | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedForReject, setSelectedForReject] = useState<ProformaInvoice | null>(null)
  const [showCreateNewModal, setShowCreateNewModal] = useState(false)
  const [selectedForNewInvoice, setSelectedForNewInvoice] = useState<ProformaInvoice | null>(null)
  const [hoveredProforma, setHoveredProforma] = useState<number | string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [proformaItemsCache, setProformaItemsCache] = useState<{ [key: number]: any[] }>({})
  const [metrics, setMetrics] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    rejected: 0,
    totalValue: 0,
    collectionRate: 0
  })

  const fetchProformaItems = async (proformaId: number) => {
    if (proformaItemsCache[proformaId]) {
      return proformaItemsCache[proformaId];
    }
    
    try {
      const response = await api.get(`/api/finance/proforma-invoices/${proformaId}/`, {
        params: { session_key: sessionKey }
      });
      
      const items = response.data.proforma_items || [];
      setProformaItemsCache(prev => ({ ...prev, [proformaId]: items }));
      return items;
    } catch (error) {
      console.error('Error fetching proforma items:', error);
      return [];
    }
  };

  
  const handleUpdatePayment = (proformaInvoice: ProformaInvoice) => {
    setSelectedForPayment(proformaInvoice)
    setShowPaymentModal(true)
  }

  const handleView = (proformaInvoice: ProformaInvoice) => {
    setSelectedProformaInvoice(proformaInvoice)
    setShowForm(true)
  }
  
  const handleEdit = async (proformaInvoice: ProformaInvoice) => {
    try {
      // Fetch complete proforma invoice data with customer details
      const response = await fetch(`/api/finance/proforma-invoices/${proformaInvoice.id}/`, {
        headers: {
          'Authorization': `Bearer ${sessionKey}`
        }
      })
      
      if (response.ok) {
        const completeData = await response.json()
        setSelectedForEdit(completeData)
      } else {
        setSelectedForEdit(proformaInvoice)
      }
    } catch (error) {
      console.error('Error fetching complete proforma data:', error)
      setSelectedForEdit(proformaInvoice)
    }
    setShowEditForm(true)
  }

  const handleReject = (proforma: ProformaInvoice) => {
    setSelectedForReject(proforma)
    setShowRejectModal(true)
  }

  const handleCreateNewInvoice = (proforma: ProformaInvoice) => {
    setSelectedForNewInvoice(proforma)
    setShowCreateNewModal(true)
  }

  const handleReviseProforma = async (proforma: ProformaInvoice) => {
    if (!confirm(`Are you sure you want to revise proforma ${proforma.proforma_number}? This will allow you to edit it once more.`)) {
      return
    }

    try {
      // Create mutable copy of request data
      const requestData = {
        status: 'draft',
        is_revised: true,
        revision_count: (proforma.revision_count || 0) + 1,
        revised_at: new Date().toISOString(),
        proforma_date: proforma.proforma_date,
        due_date: proforma.due_date
      }

      const response = await fetch(`/api/finance/proforma-invoices/${proforma.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionKey}`
        },
        body: JSON.stringify({ ...requestData, session_key: sessionKey })
      })

      if (!response.ok) {
        throw new Error('Failed to revise proforma')
      }

      toast.success('Proforma revised successfully! You can now edit it.')
      fetchProformaInvoices()
    } catch (error) {
      console.error('Error reversing proforma:', error)
      toast.error('Failed to revise proforma')
    }
  }

  const handleDownloadPDF = async (id: number, proformaNumber: string) => {
    try {
      const response = await apiClient.generateProformaPDF(id, { session_key: sessionKey })

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Proforma_${proformaNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  const handleSendEmail = (proforma: ProformaInvoice) => {
    setSelectedForEmail(proforma)
    setShowEmailModal(true)
  }



  const filteredProformaInvoices = proformaInvoices.filter(proforma =>
    proforma.proforma_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proforma.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proforma.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Proforma Invoices</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your proforma invoices</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toast.success('Create proforma invoices via Purchase Orders → Raise Invoice')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            From Purchase Order
          </button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Proformas"
          value={metrics.total}
          subtitle={`${metrics.total} proforma invoices`}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="Draft"
          value={metrics.draft}
          subtitle={`${metrics.draft} in draft status`}
          icon={Edit}
          color="orange"
        />
        <MetricCard
          title="Sent"
          value={metrics.sent}
          subtitle={`${metrics.sent} sent to customers`}
          icon={Send}
          color="green"
        />
        <MetricCard
          title="Rejected"
          value={metrics.rejected}
          subtitle={`${metrics.rejected} proformas rejected`}
          icon={XCircle}
          color="red"
        />
        <MetricCard
          title="Collection Rate"
          value={`${metrics.collectionRate.toFixed(1)}%`}
          subtitle={`₹${metrics.totalValue.toLocaleString()} total value`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search proforma invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {paymentStatusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2 disabled:opacity-50"
          title="Refresh invoice statuses"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Proforma Invoice List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {filteredProformaInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No proforma invoices found</h3>
            <p className="text-gray-600 dark:text-gray-400">Create your first proforma invoice to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th onClick={() => handleSort('proforma_number')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">
                    <span onClick={() => handleSort('proforma_number')} className="cursor-pointer hover:text-gray-700 dark:hover:text-white select-none">Proforma# <SortIcon field="proforma_number" /></span>
                    <span className="mx-1 text-gray-300">|</span>
                    <span onClick={() => handleSort('proforma_date')} className="cursor-pointer hover:text-gray-700 dark:hover:text-white select-none">Date <SortIcon field="proforma_date" /></span>
                  </th>
                  <th onClick={() => handleSort('customer_name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Customer <SortIcon field="customer_name" /></th>
                  <th onClick={() => handleSort('total_amount')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Amount <SortIcon field="total_amount" /></th>
                  <th onClick={() => handleSort('payment_status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Payment Status <SortIcon field="payment_status" /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProformaInvoices.map((proforma) => (
                  <tr key={proforma.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-blue-500 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                            <span 
                              onClick={() => handleView(proforma)}
                              className="text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              {proforma.proforma_number}
                            </span>
                            {proforma.is_revised && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                                Revised
                              </span>
                            )}
                          </div>
                          <div 
                               onMouseEnter={(e) => {
                                 setHoveredProforma(proforma.id)
                                 setMousePosition({ x: e.clientX, y: e.clientY })
                                 if (!proformaItemsCache[proforma.id]) {
                                   fetchProformaItems(proforma.id).catch(err => {
                                     console.error('Failed to fetch items:', err)
                                     toast.error('Failed to load proforma items')
                                   })
                                 }
                               }}
                               onMouseLeave={() => setHoveredProforma(null)}
                               onMouseMove={(e) => {
                                 if (hoveredProforma === proforma.id) {
                                   setMousePosition({ x: e.clientX, y: e.clientY })
                                 }
                               }}
                               className="text-sm text-gray-500 dark:text-gray-400 cursor-help relative"
                          >
                            {proforma.item_count} item{proforma.item_count !== 1 ? 's' : ''}
                            
                            {hoveredProforma === proforma.id && (
                              <div className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 max-w-2xl pointer-events-none"
                                   style={{
                                     left: `${Math.min(mousePosition.x + 15, window.innerWidth - 600)}px`,
                                     top: `${Math.max(mousePosition.y - 50, 10)}px`,
                                   }}>
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items in this proforma:</div>
                                <div className="space-y-1 max-h-96 overflow-y-auto">
                                  {proformaItemsCache[proforma.id] && proformaItemsCache[proforma.id].length > 0 ? (
                                    proformaItemsCache[proforma.id].map((item, index) => (
                                      <div key={index} className="text-xs">
                                        <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                                        {item.description && (
                                          <div className="text-gray-500 dark:text-gray-400 text-xs">{item.description}</div>
                                        )}
                                        <div className="text-gray-500 dark:text-gray-400">
                                          {parseFloat(item.quantity || 0).toFixed(2)} {item.unit} x ₹{parseFloat(item.unit_price || 0).toFixed(2)} = ₹{parseFloat(item.line_total || 0).toFixed(2)}
                                        </div>
                                      </div>
                                    ))
                                  ) : proformaItemsCache[proforma.id] ? (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">No items found</div>
                                  ) : (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">Loading items...</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {/* Customer Name with Tooltip */}
                        {proforma.customer_shipping_addresses && proforma.customer_shipping_addresses.length > 0 ? (
                          <div 
                            className="text-sm font-medium text-blue-600 cursor-pointer border-b border-dotted border-blue-600 hover:text-blue-800"
                            onMouseEnter={(e) => {
                              setHoveredProforma(`customer-${proforma.id}` as any)
                              setMousePosition({ x: e.clientX, y: e.clientY })
                            }}
                            onMouseLeave={() => setHoveredProforma(null)}
                            onMouseMove={(e) => {
                              if (hoveredProforma === `customer-${proforma.id}`) {
                                setMousePosition({ x: e.clientX, y: e.clientY })
                              }
                            }}
                          >
                            {proforma.customer_name}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {proforma.customer_name}
                          </div>
                        )}
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {proforma.customer_code} • {proforma.customer_project_area}
                        </div>
                        
                        {/* Customer Address Tooltip */}
                        {hoveredProforma === `customer-${proforma.id}` && proforma.customer_shipping_addresses && proforma.customer_shipping_addresses.length > 0 && (
                          <div className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 max-w-2xl pointer-events-none"
                               style={{
                                 left: `${Math.min(mousePosition.x + 15, window.innerWidth - 600)}px`,
                                 top: `${Math.max(mousePosition.y - 50, 10)}px`,
                               }}>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                              {proforma.customer_name}
                            </div>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {proforma.customer_shipping_addresses.map((addr, index) => (
                                <div key={index} className="text-xs">
                                  <div className={`font-semibold mb-1 flex items-center gap-1 ${
                                    addr.type === 'Billing' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                                  }`}>
                                    {addr.type === 'Billing' ? '🏠' : '🏢'} {addr.type}
                                    {addr.is_default && (
                                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 py-0.5 rounded text-xs font-medium">
                                        DEFAULT
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed pl-4">
                                    {addr.address}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        ₹{parseFloat(proforma.total_amount?.toString() || '0').toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Paid: ₹{parseFloat(proforma.paid_amount?.toString() || '0').toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {proforma.is_rejected ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                            REJECTED
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isOverdue(proforma.proforma_date, proforma.payment_status)
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          }`}>
                            {isOverdue(proforma.proforma_date, proforma.payment_status) ? 'OVERDUE' : `DUE ${getOverdueDate(proforma.proforma_date)?.toLocaleDateString()}`}
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(proforma.payment_status === 'overdue' ? 'unpaid' : (proforma.payment_status || 'unpaid'))}`}>
                          {getPaymentStatusIcon(proforma.payment_status === 'overdue' ? 'unpaid' : (proforma.payment_status || 'unpaid'))}
                          <span className="ml-1 capitalize">{(proforma.payment_status === 'overdue' ? 'unpaid' : (proforma.payment_status || 'unpaid')).replace('_', ' ')}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(proforma.proforma_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {proforma.is_rejected ? (
                          // Show view and create new invoice buttons for rejected proforma invoices
                          <>
                            <button
                              onClick={() => handleView(proforma)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleCreateNewInvoice(proforma)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Create New Invoice"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          // Show all buttons for non-rejected proforma invoices
                          <>
                            <button
                              onClick={() => handleUpdatePayment(proforma)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Update Payment"
                            >
                              <IndianRupee className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleView(proforma)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Send Email - Only show for draft status */}
                            {proforma.status === 'draft' && (
                              <button
                                onClick={() => handleSendEmail(proforma)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Send Email"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDownloadPDF(proforma.id, proforma.proforma_number)}
                              className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {/* Draft status buttons */}
                            {proforma.status === 'draft' && (
                              <button
                                onClick={() => handleEdit(proforma)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Sent/Active status buttons */}
                            {(proforma.status === 'sent' || proforma.status === 'active') && (
                              <>
                                {/* Only allow revise if not already revised */}
                                {!proforma.is_revised && (
                                  <button
                                    onClick={() => handleReviseProforma(proforma)}
                                    className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                    title="Revise Proforma (Edit Once)"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => handleReject(proforma)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Reject"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Proforma Invoice View Modal */}
      {showForm && selectedProformaInvoice && (
        <ProformaInvoiceView
          proformaInvoice={selectedProformaInvoice}
          onClose={() => {
            setShowForm(false)
            setSelectedProformaInvoice(null)
          }}
        />
      )}

      {/* Proforma Invoice Edit Form */}
      {showEditForm && selectedForEdit && (
        <SimpleProformaForm
          editingInvoice={selectedForEdit}
          invoiceData={{
            claim_type: 'percentage',
            claim_percentage: 100
          }}
          quotation={{
            id: selectedForEdit.id,
            quotation_number: selectedForEdit.proforma_number,
            customer_details: selectedForEdit.customer_details || {
              id: selectedForEdit.customer || selectedForEdit.id,
              name: selectedForEdit.customer_name,
              customer_code: selectedForEdit.customer_code,
              email: selectedForEdit.customer_email || '',
              phone: selectedForEdit.customer_phone || '',
              gstin: selectedForEdit.customer_gstin || '',
              project_area: selectedForEdit.customer_project_area,
              billing_address_line1: selectedForEdit.billing_address_line1 || '',
              billing_address_line2: selectedForEdit.billing_address_line2 || '',
              billing_city: selectedForEdit.billing_city || '',
              billing_state: selectedForEdit.billing_state || '',
              billing_pincode: selectedForEdit.billing_pincode || '',
              billing_country: selectedForEdit.billing_country || 'India'
            },
            shipping_address_details: selectedForEdit.shipping_address_details || 
              (selectedForEdit.customer_details?.shipping_address_line1 ? {
                address_line1: selectedForEdit.customer_details.shipping_address_line1,
                address_line2: selectedForEdit.customer_details.shipping_address_line2 || '',
                city: selectedForEdit.customer_details.shipping_city || '',
                state: selectedForEdit.customer_details.shipping_state || '',
                pincode: selectedForEdit.customer_details.shipping_pincode || '',
                country: selectedForEdit.customer_details.shipping_country || 'India'
              } : null),
            quotation_items: selectedForEdit.proforma_items?.map(item => ({
              id: Math.random(),
              product: item.product_name,
              product_name: item.product_name,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price.toString(),
              gst_rate: '18'
            })) || [],
            subtotal: selectedForEdit.subtotal,
            total_amount: selectedForEdit.total_amount,
            available_proforma_percentage: '100',
            remaining_proforma_balance: selectedForEdit.total_amount
          }}
          onClose={() => {
            setShowEditForm(false)
            setSelectedForEdit(null)
          }}
          onSuccess={() => {
            setShowEditForm(false)
            setSelectedForEdit(null)
            fetchProformaInvoices()
          }}
        />
      )}

      {/* Update Payment Modal */}
      {showPaymentModal && selectedForPayment && (
        <UpdatePaymentModal
          invoice={{
            id: selectedForPayment.id,
            invoice_number: selectedForPayment.proforma_number,
            total_amount: selectedForPayment.total_amount?.toString() || '0',
            outstanding_amount: selectedForPayment.outstanding_amount?.toString() || selectedForPayment.total_amount?.toString() || '0'
          }}
          onClose={() => {
            setShowPaymentModal(false)
            setSelectedForPayment(null)
          }}
          onSuccess={() => {
            setShowPaymentModal(false)
            setSelectedForPayment(null)
            fetchProformaInvoices()
          }}
          sessionKey={sessionKey}
          invoiceType="proforma_invoice"
        />
      )}

      {/* Send Email Modal */}
      {showEmailModal && selectedForEmail && (
        <SendEmailModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false)
            setSelectedForEmail(null)
          }}
          invoiceId={selectedForEmail.id}
          invoiceNumber={selectedForEmail.proforma_number}
          invoiceType="proforma_invoice"
          customerEmail=""
          onSuccess={() => {
            setShowEmailModal(false)
            setSelectedForEmail(null)
            fetchProformaInvoices()
          }}
        />
      )}

      {/* Reject Invoice Modal */}
      {showRejectModal && selectedForReject && (
        <RejectInvoiceModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false)
            setSelectedForReject(null)
          }}
          onSuccess={() => {
            setShowRejectModal(false)
            setSelectedForReject(null)
            fetchProformaInvoices()
          }}
          invoiceId={selectedForReject.id}
          invoiceNumber={selectedForReject.proforma_number}
          invoiceType="proforma"
          sessionKey={sessionKey}
        />
      )}

      {/* Create New Invoice Modal */}
      {showCreateNewModal && selectedForNewInvoice && (
        <CreateNewInvoiceModal
          isOpen={showCreateNewModal}
          onClose={() => {
            setShowCreateNewModal(false)
            setSelectedForNewInvoice(null)
          }}
          onSuccess={() => {
            setShowCreateNewModal(false)
            setSelectedForNewInvoice(null)
            fetchProformaInvoices()
          }}
          rejectedInvoice={{
            id: selectedForNewInvoice.id,
            invoice_number: selectedForNewInvoice.proforma_number,
            purchase_order: selectedForNewInvoice.po_number ? {
              id: parseInt(selectedForNewInvoice.po_number.split('/')[0]) || 0,
              internal_po_number: selectedForNewInvoice.po_number
            } : undefined
          }}
          sessionKey={sessionKey}
        />
      )}


    </div>
  )
}

export default ProformaInvoiceList
