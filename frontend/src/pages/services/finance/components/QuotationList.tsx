import React, { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Search, Plus, Eye, Edit, Trash2, FileText, Package, Mail, Copy, X, ShoppingCart, IndianRupee, CheckCircle, Clock, TrendingUp, XCircle, ChevronUp, ChevronDown, User } from 'lucide-react'
import QuotationEdit from './QuotationEdit'
import SendEmailModal from './SendEmailModal'
import RejectInvoiceModal from './RejectInvoiceModal'
import MetricCard from './MetricCard'
import toast from 'react-hot-toast'

interface Quotation {
  id: number
  quotation_number: string
  customer_name: string
  customer_code: string
  customer_project_area?: string
  customer_email?: string
  customer_shipping_addresses?: Array<{
    type: string
    address: string
    is_default?: boolean
  }>
  shipping_address_text?: string
  quotation_date: string
  valid_until: string
  status: string
  gst_type: string
  subtotal: string
  total_tax: string
  total_amount: string
  item_count: number
  quotation_items?: Array<{
    product_name: string
    quantity: number
    unit: string
    unit_price: number
    line_total: number
  }>
  created_at: string
  created_by_name: string
  is_revised?: boolean
  revision_count?: number
  revised_at?: string
  revised_by_name?: string
  po_created?: boolean
  po_created_at?: string
  invoice_created?: boolean
  invoice_created_at?: string
  proforma_created?: boolean
  is_rejected?: boolean
  rejection_reason?: string
  // Balance tracking fields
  claim_type?: string
  proforma_claimed_amount?: number
  invoice_claimed_amount?: number
  remaining_proforma_balance?: number
  remaining_invoice_balance?: number
  available_proforma_percentage?: number
  available_invoice_percentage?: number
}

interface QuotationListProps {
  selectedFY?: string
  onCreateNew: () => void
  onEdit: (quotation: Quotation) => void
  onView: (quotation: Quotation) => void
  onCreatePO: (quotation: Quotation) => void
  onRaiseInvoice?: (quotation: Quotation) => void
}

const QUOTATIONS_PAGE_SIZE = 5

const QuotationList: React.FC<QuotationListProps> = ({ selectedFY, onCreateNew, onView, onCreatePO, onRaiseInvoice }) => {
  const { sessionKey } = useServiceUserStore()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('-quotation_date')

  const handleSort = (field: string) => {
    setSortBy(prev => prev === `-${field}` ? field : `-${field}`)
    setCurrentPage(1)
  }
  const SortIcon = ({ field }: { field: string }) => (
    sortBy === field ? <ChevronUp className="w-3 h-3 inline ml-1" /> :
    sortBy === `-${field}` ? <ChevronDown className="w-3 h-3 inline ml-1" /> :
    <ChevronUp className="w-3 h-3 inline ml-1 opacity-30" />
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [clickedTooltip, setClickedTooltip] = useState<number | string | null>(null)
  const [editingQuotationId, setEditingQuotationId] = useState<number | null>(null)
  const [emailQuotation, setEmailQuotation] = useState<Quotation | null>(null)
  const [rejectingQuotation, setRejectingQuotation] = useState<Quotation | null>(null)
  const [metrics, setMetrics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalValue: 0,
    conversionRate: 0
  })

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
    { value: 'converted', label: 'Converted' },
  ]

  const resetToFirstPage = () => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 500) // 500ms delay

    return () => clearTimeout(timer)
  }, [searchTerm])

  const fetchQuotations = async (page = 1) => {
    if (!sessionKey) {
      console.error('No session key available')
      return
    }

    // Don't fetch page 2+ if we haven't loaded page 1 yet
    if (page > 1 && totalPages === 1) {
      return
    }

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('session_key', sessionKey)
      params.append('page', page.toString())
      params.append('page_size', QUOTATIONS_PAGE_SIZE.toString())
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (statusFilter) params.append('status', statusFilter)
      if (selectedFY) {
        params.append('financial_year', selectedFY)
        console.log(`[QuotationList] Fetching with FY: ${selectedFY}`)
      } else {
        params.append('financial_year', 'all')
        console.log('[QuotationList] Fetching with FY: all')
      }
      console.log('[QuotationList] API params:', params.toString())
      params.append('ordering', sortBy)

      const response = await apiClient.getFinanceQuotations(Object.fromEntries(params))

      const quotations = response.data.results || []
      
      // Debug: Check if customer_shipping_addresses is in the response
      console.log('First Quotation customer data:', quotations[0] ? {
        customer_name: quotations[0].customer_name,
        customer_shipping_addresses: quotations[0].customer_shipping_addresses,
        hasAddresses: quotations[0].customer_shipping_addresses && quotations[0].customer_shipping_addresses.length > 0
      } : 'No quotations found')
      
      setQuotations(quotations)
      setTotalCount(response.data.count || 0)
      const calculatedPages = Math.ceil((response.data.count || 0) / QUOTATIONS_PAGE_SIZE)
      setTotalPages(Math.max(1, calculatedPages))
      
      // Calculate metrics
      const total = quotations.length
      const pending = quotations.filter((q: Quotation) => q.status === 'sent').length
      const approved = quotations.filter((q: Quotation) => q.status === 'approved').length
      const rejected = quotations.filter((q: Quotation) => q.is_rejected).length
      const totalValue = quotations.reduce((sum: number, q: Quotation) => sum + parseFloat(q.total_amount || '0'), 0)
      const conversionRate = total > 0 ? ((approved / total) * 100) : 0
      
      setMetrics({ total, pending, approved, rejected, totalValue, conversionRate })
    } catch (error: any) {
      console.error('Error fetching quotations:', error)

      const isInvalidPage = error?.response?.status === 404 &&
        typeof error?.response?.data?.detail === 'string' &&
        error.response.data.detail.toLowerCase().includes('invalid page')

      if (isInvalidPage && page > 1) {
        setCurrentPage(page - 1)
        return
      }

      setQuotations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotations(currentPage)
  }, [sessionKey, currentPage, debouncedSearchTerm, statusFilter, selectedFY])

  const toggleTooltip = (value: number | string) => {
    setClickedTooltip(prev => prev === value ? null : value)
  }

  const handleDelete = async (quotation: Quotation) => {
    if (!confirm(`Are you sure you want to delete quotation ${quotation.quotation_number}?`)) {
      return
    }

    if (!sessionKey) {
      alert('Session expired. Please login again.')
      return
    }

    try {
      await apiClient.deleteFinanceQuotation(quotation.id, { session_key: sessionKey })

      if (quotations.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1)
      } else {
        fetchQuotations(currentPage)
      }
      alert('Quotation deleted successfully!')
    } catch (error) {
      console.error('Error deleting quotation:', error)
      alert('Failed to delete quotation. Please try again.')
    }
  }

  const handleSendMail = (quotation: Quotation) => {
    setEmailQuotation(quotation)
  }

  const handleEmailSuccess = () => {
    setEmailQuotation(null)
    fetchQuotations(currentPage) // Refresh the list
  }

  const handleCopyQuotation = async (quotation: Quotation) => {
    if (!sessionKey) {
      alert('Session expired. Please login again.')
      return
    }

    try {
      await apiClient.copyFinanceQuotation(quotation.id, { session_key: sessionKey })

      toast.success('Quotation copied successfully!')
      fetchQuotations(currentPage)
    } catch (error) {
      console.error('Error copying quotation:', error)
      toast.error('Failed to copy quotation')
    }
  }

  const handleReviseQuotation = async (quotation: Quotation) => {
    if (!sessionKey) {
      alert('Session expired. Please login again.')
      return
    }

    if (!confirm(`Are you sure you want to revise quotation ${quotation.quotation_number}? This will allow you to edit it once more.`)) {
      return
    }

    try {
      // Use PATCH for partial update instead of PUT
      await apiClient.patch(`/api/finance/quotations/${quotation.id}/`, {
        status: 'draft',
        is_revised: true,
        session_key: sessionKey
      })

      toast.success('Quotation revised successfully! You can now edit it.')
      fetchQuotations(currentPage)
    } catch (error) {
      console.error('Error reversing quotation:', error)
      toast.error('Failed to revise quotation')
    }
  }

  const handleRejectQuotation = (quotation: Quotation) => {
    setRejectingQuotation(quotation)
  }

  const handleRejectSuccess = () => {
    setRejectingQuotation(null)
    fetchQuotations(currentPage)
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
      accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      expired: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      converted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getGstTypeBadge = (gstType: string) => {
    const gstColors = {
      igst: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      cgst_sgst: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      exempt: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    }

    const gstLabels = {
      igst: 'IGST',
      cgst_sgst: 'CGST+SGST',
      exempt: 'Exempt',
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${gstColors[gstType as keyof typeof gstColors] || gstColors.exempt}`}>
        {gstLabels[gstType as keyof typeof gstLabels] || gstType}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN')
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">


      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Quotations</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage your quotations and quotes</p>
        </div>
        <button
          onClick={onCreateNew}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Quotation
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Quotations"
          value={metrics.total}
          subtitle={`${metrics.total} quotations created`}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="Pending Approval"
          value={metrics.pending}
          subtitle={`${metrics.pending} awaiting response`}
          icon={Clock}
          color="orange"
        />
        <MetricCard
          title="Approved"
          value={metrics.approved}
          subtitle={`${metrics.approved} quotations approved`}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Rejected"
          value={metrics.rejected}
          subtitle={`${metrics.rejected} quotations rejected`}
          icon={XCircle}
          color="red"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate.toFixed(1)}%`}
          subtitle={`₹${metrics.totalValue.toLocaleString()} total value`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by quotation number, customer, or reference..."
              value={searchTerm}
              onChange={(e) => {
                resetToFirstPage()
                setSearchTerm(e.target.value)
              }}
              className="w-full pl-10 pr-12 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
            />
            {searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-athenas-blue"></div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                resetToFirstPage()
                setStatusFilter(e.target.value)
              }}
              className="px-3 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-200"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchTerm('')
                setDebouncedSearchTerm('')
                setStatusFilter('')
                setCurrentPage(1)
              }}
              className="px-4 py-2 bg-gray-100/50 dark:bg-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-500/50 transition-colors backdrop-blur-sm whitespace-nowrap"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Quotations List */}
      <div className="relative z-20 isolate bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-visible">
        {quotations.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No quotations</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating a new quotation.</p>
            <div className="mt-6">
              <button
                onClick={onCreateNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Quotation
              </button>
            </div>
          </div>
        ) : (
          <>
          <div className="relative z-20 overflow-x-auto overflow-y-visible max-w-full">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <span onClick={() => handleSort('quotation_number')} className="cursor-pointer hover:text-gray-700 dark:hover:text-white select-none">Quote# <SortIcon field="quotation_number" /></span>
                      <span className="mx-1 text-gray-300">|</span>
                      <span onClick={() => handleSort('quotation_date')} className="cursor-pointer hover:text-gray-700 dark:hover:text-white select-none">Date <SortIcon field="quotation_date" /></span>
                    </th>
                    <th onClick={() => handleSort('customer_name')} className="w-[22%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Customer <SortIcon field="customer_name" /></th>
                    <th className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th onClick={() => handleSort('total_amount')} className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Amount <SortIcon field="total_amount" /></th>
                    <th className="w-[14%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="w-[12%] px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/50 dark:divide-gray-700/50 overflow-visible">
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap overflow-visible">
                        <div>
                          <div className="text-sm font-medium flex items-center space-x-2">
                            <span 
                              onClick={() => onView(quotation)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer underline-offset-2 hover:underline transition-colors"
                            >
                              {quotation.quotation_number}
                            </span>
                            {quotation.is_revised && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                                Revised
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 relative">
                            <button
                              onClick={() => toggleTooltip(quotation.id)}
                              className="hover:text-gray-700 dark:hover:text-gray-300"
                              title="Click to view items"
                            >
                              <Package className="w-3 h-3 inline mr-1" />
                              {quotation.item_count} item{quotation.item_count !== 1 ? 's' : ''}
                            </button>
                            {clickedTooltip === quotation.id && quotation.quotation_items && quotation.quotation_items.length > 0 && (
                              <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 min-w-[300px]">
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items:</div>
                                <div className="space-y-1 max-h-60 overflow-y-auto">
                                  {quotation.quotation_items.map((item, index) => (
                                    <div key={index} className="text-xs">
                                      <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                                      <div className="text-gray-500 dark:text-gray-400">
                                        {parseFloat(String(item.quantity || 0)).toFixed(2)} {item.unit} x ₹{parseFloat(String(item.unit_price || 0)).toFixed(2)} = ₹{parseFloat(String(item.line_total || 0)).toFixed(2)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {quotation.reference ? `Ref: ${quotation.reference}` : `Valid until: ${formatDate(quotation.valid_until)}`}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap overflow-visible">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                          <div className="relative">
                            <button
                              onClick={() => toggleTooltip(`customer-${quotation.id}`)}
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Click to view customer details"
                            >
                              {quotation.customer_name}
                            </button>
                            {clickedTooltip === `customer-${quotation.id}` && (
                              <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 min-w-[300px]">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                  {quotation.customer_name}
                                </div>
                                {quotation.customer_email && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                    📧 {quotation.customer_email}
                                  </div>
                                )}
                                {quotation.shipping_address_text ? (
                                  <div className="text-xs">
                                    <div className="font-semibold mb-1 text-blue-600 dark:text-blue-400">
                                      🏢 Shipping Address
                                    </div>
                                    <div className="text-gray-700 dark:text-gray-300">
                                      {quotation.shipping_address_text}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    No shipping address
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {/* Shipping Address — same style as PO/WO and Invoice list */}
                          {quotation.shipping_address_text ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                              <span className="mr-1">📦</span>
                              {quotation.shipping_address_text}
                            </div>
                          ) : null}
                          {quotation.customer_project_area && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                              {quotation.customer_project_area}
                            </div>
                          )}
                        </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            Quote: {formatDate(quotation.quotation_date)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Valid until: {formatDate(quotation.valid_until)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            GST: {quotation.gst_type === 'igst' ? 'IGST' : quotation.gst_type === 'cgst_sgst' ? 'CGST+SGST' : 'Exempt'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(quotation.total_amount)}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Base: {formatCurrency(quotation.subtotal)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Tax: {formatCurrency(quotation.total_tax)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(quotation.status)}
                          {getGstTypeBadge(quotation.gst_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                        <div className="flex items-center justify-end space-x-2">
                          {/* Draft status buttons */}
                          {quotation.status === 'draft' && (
                            <>
                              <button
                                onClick={() => setEditingQuotationId(quotation.id)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSendMail(quotation)}
                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                title="Send Email"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              {/* Only show delete for non-revised quotations */}
                              {!quotation.is_revised && (
                                <button
                                  onClick={() => handleDelete(quotation)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {/* Sent status buttons */}
                          {quotation.status === 'sent' && (
                            <>
                              <button
                                onClick={() => setEditingQuotationId(quotation.id)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSendMail(quotation)}
                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                title="Send Email"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                              {/* Only show reject if no PO or invoices created */}
                              {!quotation.po_created && !quotation.invoice_created && !quotation.proforma_created && (
                                <button
                                  onClick={() => handleRejectQuotation(quotation)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title="Reject Quotation"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}

                          {/* Approved status buttons */}
                          {quotation.status === 'approved' && (
                            <>
                              <button
                                onClick={() => handleSendMail(quotation)}
                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                title="Send Email"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Other status buttons */}
                          {(quotation.status === 'accepted' || quotation.status === 'expired' || quotation.status === 'converted') && (
                            <button
                              onClick={() => handleSendMail(quotation)}
                              className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                              title="Send Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{((currentPage - 1) * QUOTATIONS_PAGE_SIZE) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * QUOTATIONS_PAGE_SIZE, totalCount)}</span> of{' '}
                      <span className="font-medium">{totalCount}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            page === currentPage
                              ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-300'
                              : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage >= totalPages || !quotations.length}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quotation Edit Modal */}
      {editingQuotationId && (
        <QuotationEdit
          quotationId={editingQuotationId}
          onClose={() => setEditingQuotationId(null)}
          onSuccess={() => {
            setEditingQuotationId(null)
            fetchQuotations(currentPage) // Refresh the list
          }}
        />
      )}

      {/* Email Modal */}
      {emailQuotation && (
        <SendEmailModal
          isOpen={true}
          onClose={() => setEmailQuotation(null)}
          invoiceId={emailQuotation.id}
          invoiceNumber={emailQuotation.quotation_number}
          invoiceType="quotation"
          customerEmail={emailQuotation.customer_email || ''}
          onSuccess={handleEmailSuccess}
        />
      )}

      {/* Reject Quotation Modal */}
      {rejectingQuotation && (
        <RejectInvoiceModal
          isOpen={true}
          onClose={() => setRejectingQuotation(null)}
          invoiceId={rejectingQuotation.id}
          invoiceNumber={rejectingQuotation.quotation_number}
          invoiceType="quotation"
          onSuccess={handleRejectSuccess}
        />
      )}
    </div>
  )
}

export default QuotationList
