import React, { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Search, Plus, Eye, Edit, Trash2, FileText, MapPin, Package, Mail, Copy, RotateCcw, X, ShoppingCart, Receipt, CheckCircle, Clock, TrendingUp, XCircle } from 'lucide-react'
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
  onCreateNew: () => void
  onEdit: (quotation: Quotation) => void
  onView: (quotation: Quotation) => void
  onCreatePO: (quotation: Quotation) => void
  onRaiseInvoice?: (quotation: Quotation) => void
}

const QuotationList: React.FC<QuotationListProps> = ({ onCreateNew, onView, onCreatePO, onRaiseInvoice }) => {
  const { sessionKey } = useServiceUserStore()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hoveredQuotation, setHoveredQuotation] = useState<number | null>(null)
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

    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('session_key', sessionKey)
      params.append('page', page.toString())
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm)
      if (statusFilter) params.append('status', statusFilter)

      console.log('🔍 DEBUG: Fetching quotations with session key:', sessionKey.substring(0, 10) + '...')
      console.log('🔍 DEBUG: API URL:', `/api/finance/quotations/?${params.toString()}`)

      const response = await apiClient.getFinanceQuotations(Object.fromEntries(params))



      const quotations = response.data.results || []
      setQuotations(quotations)
      setTotalCount(response.data.count || 0)
      setTotalPages(Math.ceil((response.data.count || 0) / 5))
      
      // Calculate metrics
      const total = quotations.length
      const pending = quotations.filter((q: Quotation) => q.status === 'sent').length
      const approved = quotations.filter((q: Quotation) => q.status === 'approved').length
      const rejected = quotations.filter((q: Quotation) => q.is_rejected).length
      const totalValue = quotations.reduce((sum: number, q: Quotation) => sum + parseFloat(q.total_amount || '0'), 0)
      const conversionRate = total > 0 ? ((approved / total) * 100) : 0
      
      setMetrics({ total, pending, approved, rejected, totalValue, conversionRate })
    } catch (error) {
      console.error('Error fetching quotations:', error)
      setQuotations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotations(currentPage)
  }, [sessionKey, currentPage, debouncedSearchTerm, statusFilter])

  // Reset to first page when search/filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [debouncedSearchTerm, statusFilter])

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

      // Refresh the list
      fetchQuotations(currentPage)
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

  const handleReverseQuotation = async (quotation: Quotation) => {
    if (!sessionKey) {
      alert('Session expired. Please login again.')
      return
    }

    if (!confirm(`Are you sure you want to reverse quotation ${quotation.quotation_number}? This will allow you to edit it once more.`)) {
      return
    }

    try {
      // Change status back to draft and mark as revised
      await apiClient.updateFinanceQuotation(quotation.id, {
        status: 'draft',
        is_revised: true,
        session_key: sessionKey
      })

      toast.success('Quotation reversed successfully! You can now edit it.')
      fetchQuotations(currentPage)
    } catch (error) {
      console.error('Error reversing quotation:', error)
      toast.error('Failed to reverse quotation')
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search quotations by number, customer name, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
              {/* Show loading indicator when search is being debounced */}
              {searchTerm !== debouncedSearchTerm && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
          </div>
          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Quotations List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quotation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date & Validity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status & GST
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {quotations.map((quotation) => (
                    <tr key={quotation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                            <span>{quotation.quotation_number}</span>
                            {quotation.is_revised && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                                Revised
                              </span>
                            )}
                          </div>
                          <div
                            className="text-sm text-gray-500 dark:text-gray-400 cursor-help relative"
                            onMouseEnter={() => setHoveredQuotation(quotation.id)}
                            onMouseLeave={() => setHoveredQuotation(null)}
                          >
                            <Package className="w-3 h-3 inline mr-1" />
                            {quotation.item_count} item{quotation.item_count !== 1 ? 's' : ''}

                            {/* Tooltip */}
                            {hoveredQuotation === quotation.id && (
                              <div className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 min-w-80 max-w-96 pointer-events-none"
                                   style={{
                                     left: '50%',
                                     top: '50%',
                                     transform: 'translate(-50%, -50%)',
                                   }}>
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items in this quotation:</div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {quotation.quotation_items && quotation.quotation_items.length > 0 ? (
                                    quotation.quotation_items.map((item, index) => (
                                      <div key={index} className="flex justify-between items-center text-xs">
                                        <div className="flex-1 truncate pr-2">
                                          <span className="font-medium text-gray-900 dark:text-white">{item.product_name}</span>
                                        </div>
                                        <div className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                          {item.quantity} {item.unit} × ₹{item.unit_price.toFixed(2)} = ₹{item.line_total.toFixed(2)}
                                        </div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">No items data available</div>
                                  )}
                                  {quotation.item_count > 10 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1 border-t">
                                      ... and {quotation.item_count - 10} more items
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {quotation.customer_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {quotation.customer_code}
                            {quotation.customer_project_area && (
                              <div className="flex items-center mt-1">
                                <MapPin className="w-3 h-3 mr-1" />
                                <span className="truncate">{quotation.customer_project_area}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatDate(quotation.quotation_date)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Valid until: {formatDate(quotation.valid_until)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {getStatusBadge(quotation.status)}
                          {getGstTypeBadge(quotation.gst_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(quotation.total_amount)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Tax: {formatCurrency(quotation.total_tax)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* View button - always visible */}
                          <button
                            onClick={() => onView(quotation)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Draft status buttons */}
                          {quotation.status === 'draft' && (
                            <>
                              <button
                                onClick={() => setEditingQuotationId(quotation.id)}
                                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleSendMail(quotation)}
                                className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                                title="Send Mail"
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
                              {/* Show Create PO button only if no PO created AND no invoices created from this quotation */}
                              {!quotation.po_created && !quotation.invoice_created && !quotation.proforma_created && (
                                <button
                                  onClick={() => {
                                    // Import and use session manager
                                    import('../../../../utils/sessionManager').then(({ SessionManager }) => {
                                      SessionManager.preserveSession()
                                      onCreatePO(quotation)
                                    }).catch(() => {
                                      // Fallback if import fails
                                      const sessionKey = sessionStorage.getItem('service_session_key')
                                      if (!sessionKey) {
                                        try {
                                          const storeState = JSON.parse(localStorage.getItem('service-user-storage') || '{}')
                                          const storeSessionKey = storeState?.state?.sessionKey
                                          if (storeSessionKey) {
                                            sessionStorage.setItem('service_session_key', storeSessionKey)
                                          }
                                        } catch (e) {
                                          console.warn('Session restoration failed:', e)
                                        }
                                      }
                                      onCreatePO(quotation)
                                    })
                                  }}
                                  className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                                  title="Create PO/WO"
                                >
                                  <ShoppingCart className="w-4 h-4" />
                                </button>
                              )}
                              {/* Show Raise Invoice button if no PO created AND available percentage > 0 */}
                              {onRaiseInvoice && !quotation.po_created && (
                                (quotation.available_invoice_percentage || 0) > 0 || (quotation.available_proforma_percentage || 0) > 0 || 
                                (!quotation.invoice_created && !quotation.proforma_created)
                              ) && (
                                <button
                                  onClick={() => onRaiseInvoice(quotation)}
                                  className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                  title="Raise Invoice"
                                >
                                  <Receipt className="w-4 h-4" />
                                </button>
                              )}
                              {/* Show status indicators when actions are taken */}
                              {quotation.po_created && (
                                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center">
                                  <ShoppingCart className="w-3 h-3 mr-1" />
                                  PO Created
                                </span>
                              )}
                              <button
                                onClick={() => handleCopyQuotation(quotation)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Copy Quotation"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              {/* Only allow reverse if not already revised AND no business transactions */}
                              {!quotation.is_revised && !quotation.po_created && !quotation.invoice_created && !quotation.proforma_created && (
                                <button
                                  onClick={() => handleReverseQuotation(quotation)}
                                  className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                  title="Reverse Quotation (Edit Once)"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}
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
                                onClick={() => handleCopyQuotation(quotation)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title="Copy Quotation"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <span className="text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center">
                                <ShoppingCart className="w-3 h-3 mr-1" />
                                PO Created ✓
                              </span>
                            </>
                          )}

                          {/* Other status buttons - only show reject if no business transactions */}
                          {(quotation.status === 'accepted' || quotation.status === 'expired' || quotation.status === 'converted') && 
                           !quotation.po_created && !quotation.invoice_created && !quotation.proforma_created && (
                            <button
                              onClick={() => handleRejectQuotation(quotation)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Reject Quotation"
                            >
                              <X className="w-4 h-4" />
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
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
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
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{((currentPage - 1) * 5) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * 5, totalCount)}</span> of{' '}
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
                        disabled={currentPage === totalPages}
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
