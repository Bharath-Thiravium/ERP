import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../../../lib/api'
import api from '../../../../lib/api'
import { toast } from 'react-hot-toast'
import {
  FileText, Plus, Search, Eye, Edit, User,
  IndianRupee, XCircle, Trash2,
  Download, Mail, RefreshCw, ChevronUp, ChevronDown
} from 'lucide-react'
import ProformaInvoiceView from './ProformaInvoiceView'
import DirectCreateProformaInvoiceModal from './DirectCreateProformaInvoiceModal'
import SimpleProformaForm from './SimpleProformaForm'
import UpdatePaymentModal from './UpdatePaymentModal'
import SendEmailModal from './SendEmailModal'
import RejectInvoiceModal from './RejectInvoiceModal'
import CreateNewInvoiceModal from './CreateNewInvoiceModal'
import { isOverdue, getOverdueDate } from '../../../../utils/overdueUtils'

const PAGE_SIZE = 10

interface ProformaInvoice {
  id: number
  proforma_number: string
  proforma_date: string
  due_date: string
  customer_name: string
  customer_code: string
  customer_project_area: string
  customer_shipping_addresses?: Array<{ type: string; address: string; is_default?: boolean }>
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
  selectedFY?: string
  initialPaymentStatus?: string
  onMetricsUpdate?: (metrics: {
    total: number; draft: number; sent: number; rejected: number
    totalValue: number; paidAmount: number; outstandingAmount: number; overdueCount: number
  }) => void
}

const ProformaInvoiceList: React.FC<ProformaInvoiceListProps> = ({
  sessionKey, selectedFY, initialPaymentStatus = '', onMetricsUpdate
}) => {
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(initialPaymentStatus)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [sortBy, setSortBy] = useState('-proforma_date')
  const [refreshing, setRefreshing] = useState(false)

  // Modals
  const [showView, setShowView] = useState(false)
  const [selectedProforma, setSelectedProforma] = useState<ProformaInvoice | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [selectedForEdit, setSelectedForEdit] = useState<ProformaInvoice | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedForPayment, setSelectedForPayment] = useState<ProformaInvoice | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedForEmail, setSelectedForEmail] = useState<ProformaInvoice | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [selectedForReject, setSelectedForReject] = useState<ProformaInvoice | null>(null)
  const [showCreateNewModal, setShowCreateNewModal] = useState(false)
  const [selectedForNewInvoice, setSelectedForNewInvoice] = useState<ProformaInvoice | null>(null)
  const [showDirectCreateModal, setShowDirectCreateModal] = useState(false)

  // Hover tooltip
  const [hoveredProforma, setHoveredProforma] = useState<number | string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [proformaItemsCache, setProformaItemsCache] = useState<{ [key: number]: any[] }>({})

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 500)
    return () => clearTimeout(t)
  }, [searchTerm])

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1) }, [debouncedSearch, paymentStatusFilter, selectedFY])

  // Sync initialPaymentStatus if parent changes it (quick-action buttons)
  useEffect(() => { setPaymentStatusFilter(initialPaymentStatus) }, [initialPaymentStatus])

  const handleSort = (field: string) => {
    setSortBy(prev => prev === `-${field}` ? field : `-${field}`)
    setCurrentPage(1)
  }

  const SortIcon = ({ field }: { field: string }) => (
    sortBy === field
      ? <ChevronUp className="w-3 h-3 inline ml-1" />
      : sortBy === `-${field}`
        ? <ChevronDown className="w-3 h-3 inline ml-1" />
        : <ChevronUp className="w-3 h-3 inline ml-1 opacity-30" />
  )

  const paymentStatusOptions = [
    { value: '', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'unpaid_or_partial', label: 'Unpaid / Partial' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
  ]

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'partially_paid': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'unpaid': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

const fetchProformaInvoices = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: PAGE_SIZE.toString(),
        session_key: sessionKey,
        ordering: sortBy,
      })

      if (debouncedSearch) params.append('search', debouncedSearch)
      if (paymentStatusFilter) params.append('payment_status', paymentStatusFilter)
      params.append('financial_year', selectedFY || 'all')

      const response = await apiClient.getFinanceProformaInvoices(Object.fromEntries(params))
      const invoices: ProformaInvoice[] = response.data.results || []
      const count = response.data.count || 0

      setProformaInvoices(invoices)
      setTotalCount(count)
      setTotalPages(Math.ceil(count / PAGE_SIZE))

      if (onMetricsUpdate) {
        onMetricsUpdate({
          total: count,
          draft: invoices.filter(i => i.status === 'draft').length,
          sent: invoices.filter(i => i.status === 'sent').length,
          rejected: invoices.filter(i => i.is_rejected).length,
          totalValue: invoices.reduce((s, i) => s + parseFloat(i.total_amount?.toString() || '0'), 0),
          paidAmount: invoices.reduce((s, i) => s + parseFloat(i.paid_amount?.toString() || '0'), 0),
          outstandingAmount: invoices.reduce((s, i) => s + parseFloat(i.outstanding_amount?.toString() || '0'), 0),
          overdueCount: invoices.filter(i => isOverdue(i.proforma_date, i.payment_status)).length,
        })
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('Session expired. Please refresh the page.')
      } else {
        toast.error('Failed to fetch proforma invoices.')
      }
    } finally {
      setLoading(false)
    }
  }, [currentPage, debouncedSearch, paymentStatusFilter, sessionKey, sortBy, selectedFY])

  useEffect(() => { fetchProformaInvoices() }, [fetchProformaInvoices])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchProformaInvoices()
    setRefreshing(false)
  }

  const fetchProformaItems = async (proformaId: number) => {
    if (proformaItemsCache[proformaId]) return proformaItemsCache[proformaId]
    try {
      const response = await api.get(`/api/finance/proforma-invoices/${proformaId}/`, {
        params: { session_key: sessionKey }
      })
      const items = response.data.proforma_items || []
      setProformaItemsCache(prev => ({ ...prev, [proformaId]: items }))
      return items
    } catch {
      return []
    }
  }

  const handleView = (p: ProformaInvoice) => { setSelectedProforma(p); setShowView(true) }
  const handleViewClose = async () => {
    setShowView(false)
    setSelectedProforma(null)
  }
  const handleViewDeleteSuccess = async () => {
    setShowView(false)
    setSelectedProforma(null)
    await fetchProformaInvoices()
  }

  const handleEdit = async (p: ProformaInvoice) => {
    try {
      const response = await api.get(`/api/finance/proforma-invoices/${p.id}/`, {
        params: { session_key: sessionKey }
      })
      setSelectedForEdit(response.data)
    } catch {
      setSelectedForEdit(p)
    }
    setShowEditForm(true)
  }

  const handleUpdatePayment = (p: ProformaInvoice) => { setSelectedForPayment(p); setShowPaymentModal(true) }
  const handleSendEmail = (p: ProformaInvoice) => { setSelectedForEmail(p); setShowEmailModal(true) }
  const handleReject = (p: ProformaInvoice) => { setSelectedForReject(p); setShowRejectModal(true) }
  const handleCreateNewInvoice = (p: ProformaInvoice) => { setSelectedForNewInvoice(p); setShowCreateNewModal(true) }

  const handleDelete = async (p: ProformaInvoice) => {
    if (!confirm(`Are you sure you want to delete proforma ${p.proforma_number}?`)) return
    if (!sessionKey) {
      toast.error('Session expired. Please refresh the page.')
      return
    }

    try {
      await apiClient.deleteFinanceProformaInvoice(p.id, { session_key: sessionKey })
      toast.success('Proforma invoice deleted successfully')
      await fetchProformaInvoices()
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete proforma invoice')
    }
  }

  const handleDownloadPDF = async (id: number, proformaNumber: string) => {
    try {
      const response = await apiClient.generateProformaPDF(id, { session_key: sessionKey })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Proforma_${proformaNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('PDF downloaded successfully')
    } catch {
      toast.error('Failed to download PDF')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-athenas-blue"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Tooltip Portal - Render at root level */}
      {hoveredProforma !== null && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 max-w-2xl pointer-events-none"
          style={{
            left: `${Math.min(mousePosition.x + 15, window.innerWidth - 600)}px`,
            top: `${Math.max(mousePosition.y - 50, 10)}px`,
          }}
        >
          {/* Customer Address Tooltip */}
          {typeof hoveredProforma === 'string' && hoveredProforma.startsWith('cust-') && (() => {
            const proformaId = parseInt(hoveredProforma.replace('cust-', ''))
            const currentProforma = proformaInvoices.find(p => p.id === proformaId)
            if (!currentProforma) return null
            const addrs = currentProforma.customer_shipping_addresses || []
            return (
              <div className="min-w-[220px] max-w-[340px]">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                  {currentProforma.customer_name}
                </div>
                <div className="space-y-2">
                  {addrs.map((addr, index) => (
                    <div key={index} className="text-xs">
                      <div className={`font-semibold mb-0.5 flex items-center gap-1 ${
                        addr.type === 'PO Shipping' ? 'text-orange-600 dark:text-orange-400' :
                        'text-green-600 dark:text-green-400'
                      }`}>
                        {addr.type === 'PO Shipping' ? '🏭' : '📦'} {addr.type}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed pl-4 break-words">
                        {addr.address}
                      </div>
                    </div>
                  ))}
                  {addrs.length === 0 && (
                    <div className="text-xs text-gray-400">No shipping address for this proforma</div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* Items Tooltip */}
          {typeof hoveredProforma === 'number' && (() => {
            if (proformaItemsCache[hoveredProforma] && proformaItemsCache[hoveredProforma].length > 0) {
              return (
                <div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items in this proforma:</div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {proformaItemsCache[hoveredProforma].map((item, index) => (
                      <div key={index} className="text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                        {item.description && (
                          <div className="text-gray-500 dark:text-gray-400 text-xs">{item.description}</div>
                        )}
                        <div className="text-gray-500 dark:text-gray-400">
                          {item.unit === 'PERCENTAGE'
                            ? `${parseFloat(item.quantity || 0).toFixed(2)}% of ₹${parseFloat(item.unit_price || 0).toLocaleString()} = ₹${parseFloat(item.line_total || 0).toLocaleString()}`
                            : `${parseFloat(item.quantity || 0).toFixed(2)} ${item.unit} × ₹${parseFloat(item.unit_price || 0).toLocaleString()} = ₹${parseFloat(item.line_total || 0).toLocaleString()}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            } else if (proformaItemsCache[hoveredProforma]) {
              return <div className="text-xs text-gray-500 dark:text-gray-400">No items found</div>
            } else {
              return <div className="text-xs text-gray-500 dark:text-gray-400">Loading items...</div>
            }
          })()}
        </div>
      )}
      {/* Filters */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by proforma number, customer, PO number..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
            />
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={paymentStatusFilter}
              onChange={e => { setPaymentStatusFilter(e.target.value); setCurrentPage(1) }}
              className="px-3 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-200"
            >
              {paymentStatusOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors backdrop-blur-sm flex items-center gap-2 disabled:opacity-50"
            title="Refresh proforma statuses"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={() => {
              setSearchTerm('')
              setDebouncedSearch('')
              setPaymentStatusFilter('')
              setCurrentPage(1)
            }}
            className="px-4 py-2 bg-gray-100/50 dark:bg-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-500/50 transition-colors backdrop-blur-sm whitespace-nowrap"
          >
            Clear Filters
          </button>

          <button
            onClick={() => setShowDirectCreateModal(true)}
            className="px-4 py-2 bg-athenas-blue text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Direct Proforma
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        {proformaInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No proforma invoices found</h3>
            <p className="text-gray-600 dark:text-gray-400">Create proforma invoices via Purchase Orders → Raise Invoice, or use the direct creation option.</p>
            <button
              onClick={() => setShowDirectCreateModal(true)}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2 inline" />
              Create Direct Proforma Invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <span onClick={() => handleSort('proforma_number')} className="cursor-pointer hover:text-gray-700 dark:hover:text-white select-none">Proforma# <SortIcon field="proforma_number" /></span>
                    <span className="mx-1 text-gray-300">|</span>
                    <span onClick={() => handleSort('proforma_date')} className="cursor-pointer hover:text-gray-700 dark:hover:text-white select-none">Date <SortIcon field="proforma_date" /></span>
                  </th>
                  <th onClick={() => handleSort('customer_name')} className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Customer <SortIcon field="customer_name" /></th>
                  <th onClick={() => handleSort('total_amount')} className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Amount <SortIcon field="total_amount" /></th>
                  <th onClick={() => handleSort('payment_status')} className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Payment Status <SortIcon field="payment_status" /></th>
                  <th className="w-[14%] px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/50 dark:divide-gray-700/50">
                {proformaInvoices.map(proforma => {
                  const isPaid = proforma.payment_status === 'paid'
                  const isRejected = proforma.is_rejected

                  return (
                    <tr key={proforma.id} className="hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors duration-200">
                      {/* Proforma # + Date */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-athenas-blue mr-3" />
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
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(proforma.proforma_date).toLocaleDateString()}
                            </div>
                            {proforma.po_number && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">From: PO/WO: {proforma.po_number}</div>
                            )}
                            {/* Item count with hover */}
                            <div
                              className="text-sm text-gray-500 dark:text-gray-400 cursor-help relative"
                              onMouseEnter={e => {
                                setHoveredProforma(proforma.id)
                                setMousePosition({ x: e.clientX, y: e.clientY })
                                if (!proformaItemsCache[proforma.id]) {
                                  fetchProformaItems(proforma.id)
                                }
                              }}
                              onMouseLeave={() => setHoveredProforma(null)}
                              onMouseMove={e => {
                                if (hoveredProforma === proforma.id) {
                                  setMousePosition({ x: e.clientX, y: e.clientY })
                                }
                              }}
                            >
                              <span className="inline-block w-3 h-3 mr-1">📋</span>
                              {proforma.item_count} item{proforma.item_count !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div className="min-w-0">
                            {/* Customer Name — always hoverable */}
                            <div
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer border-b border-dotted border-blue-600 dark:border-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              onMouseEnter={e => {
                                setHoveredProforma(`cust-${proforma.id}`)
                                setMousePosition({ x: e.clientX, y: e.clientY })
                              }}
                              onMouseLeave={() => setHoveredProforma(null)}
                              onMouseMove={e => {
                                if (hoveredProforma === `cust-${proforma.id}`) {
                                  setMousePosition({ x: e.clientX, y: e.clientY })
                                }
                              }}
                            >
                              {proforma.customer_name ? proforma.customer_name.replace(/[<>"'&]/g, '') : ''}
                            </div>
                            {/* Show shipping address inline */}
                            {(() => {
                              const shippingEntry = proforma.customer_shipping_addresses?.find(
                                a => a.type !== 'Billing Address' && a.type !== 'Reference'
                              )
                              if (!shippingEntry) return null
                              return (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                  <span className="mr-1">📦</span>
                                  {shippingEntry.address}
                                </div>
                              )
                            })()}
                            {proforma.customer_project_area && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                {proforma.customer_project_area}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center">
                          <IndianRupee className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              ₹{parseFloat(proforma.total_amount?.toString() || '0').toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              Base: ₹{parseFloat(proforma.subtotal?.toString() || '0').toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Outstanding: ₹{parseFloat(proforma.outstanding_amount?.toString() || '0').toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          {/* Badge 1: Due date tracker */}
                          {isRejected ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                              REJECTED
                            </span>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              isOverdue(proforma.proforma_date, proforma.payment_status)
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}>
                              {isOverdue(proforma.proforma_date, proforma.payment_status)
                                ? `OVERDUE (Due: ${getOverdueDate(proforma.proforma_date)?.toLocaleDateString()})`
                                : `DUE ${getOverdueDate(proforma.proforma_date)?.toLocaleDateString()}`}
                            </span>
                          )}
                          {/* Badge 2: Payment status */}
                          {!isRejected && (() => {
                            const displayStatus = proforma.payment_status === 'overdue' ? 'unpaid' : (proforma.payment_status || 'unpaid')
                            return (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(displayStatus)}`}>
                                {displayStatus.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            )
                          })()}
                        </div>
                      </td>

                      {/* Actions — context-aware */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                        <div className="flex items-center justify-end space-x-2">
                          {isRejected ? (
                            <>
                              <button onClick={() => handleView(proforma)} className="text-athenas-blue hover:text-blue-600 transition-colors" title="View Proforma">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(proforma)} className="text-red-600 hover:text-red-800 transition-colors" title="Delete Proforma">
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleCreateNewInvoice(proforma)} className="text-green-600 hover:text-green-800 transition-colors" title="Create New Proforma">
                                <Plus className="w-4 h-4" />
                              </button>
                            </>
                          ) : isPaid ? (
                            <>
                              <button onClick={() => handleView(proforma)} className="text-athenas-blue hover:text-blue-600 transition-colors" title="View Proforma">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDownloadPDF(proforma.id, proforma.proforma_number)} className="text-orange-600 hover:text-orange-800 transition-colors" title="Download PDF">
                                <Download className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleUpdatePayment(proforma)} className="text-green-600 hover:text-green-800 transition-colors" title="Update Payment">
                                <IndianRupee className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleView(proforma)} className="text-athenas-blue hover:text-blue-600 transition-colors" title="View Proforma">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleSendEmail(proforma)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Send Email">
                                <Mail className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDownloadPDF(proforma.id, proforma.proforma_number)} className="text-orange-600 hover:text-orange-800 transition-colors" title="Download PDF">
                                <Download className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(proforma)} className="text-red-600 hover:text-red-800 transition-colors" title="Delete Proforma">
                                <Trash2 className="w-4 h-4" />
                              </button>
                              {!proforma.is_revised && (proforma.status === 'draft' || proforma.status === 'sent') && (
                                <button onClick={() => handleEdit(proforma)} className="text-green-600 hover:text-green-800 transition-colors" title="Edit Proforma">
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}
                              {!proforma.is_revised && (proforma.status === 'sent' || proforma.status === 'active') && (
                                <button onClick={() => handleReject(proforma)} className="text-red-600 hover:text-red-800 transition-colors" title="Reject Proforma">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white/50 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all duration-200"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white/50 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all duration-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proforma View Modal */}
      {showView && selectedProforma && (
        <ProformaInvoiceView
          proformaInvoice={selectedProforma}
          sessionKey={sessionKey}
          onClose={handleViewClose}
          onDeleteSuccess={handleViewDeleteSuccess}
        />
      )}

      {/* Edit Form */}
      {showEditForm && selectedForEdit && (
        <SimpleProformaForm
          editingInvoice={selectedForEdit}
          invoiceData={{ claim_type: 'percentage', claim_percentage: 100 }}
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
              billing_country: selectedForEdit.billing_country || 'India',
            },
            shipping_address_details: selectedForEdit.shipping_address_details || null,
            quotation_items: selectedForEdit.proforma_items?.map(item => ({
              id: Math.random(),
              product: item.product_name,
              product_name: item.product_name,
              quantity: item.quantity,
              unit: item.unit,
              unit_price: item.unit_price.toString(),
              gst_rate: '18',
            })) || [],
            subtotal: selectedForEdit.subtotal,
            total_amount: selectedForEdit.total_amount,
            available_proforma_percentage: '100',
            remaining_proforma_balance: selectedForEdit.total_amount,
          }}
          onClose={() => { setShowEditForm(false); setSelectedForEdit(null) }}
          onSuccess={() => { setShowEditForm(false); setSelectedForEdit(null); fetchProformaInvoices() }}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedForPayment && (
        <UpdatePaymentModal
          invoice={{
            id: selectedForPayment.id,
            invoice_number: selectedForPayment.proforma_number,
            total_amount: selectedForPayment.total_amount?.toString() || '0',
            outstanding_amount: selectedForPayment.outstanding_amount?.toString() || selectedForPayment.total_amount?.toString() || '0',
          }}
          onClose={() => { setShowPaymentModal(false); setSelectedForPayment(null) }}
          onSuccess={() => { setShowPaymentModal(false); setSelectedForPayment(null); fetchProformaInvoices() }}
          sessionKey={sessionKey}
          invoiceType="proforma_invoice"
        />
      )}

      {/* Email Modal */}
      {showEmailModal && selectedForEmail && (
        <SendEmailModal
          isOpen={showEmailModal}
          onClose={() => { setShowEmailModal(false); setSelectedForEmail(null) }}
          invoiceId={selectedForEmail.id}
          invoiceNumber={selectedForEmail.proforma_number}
          invoiceType="proforma_invoice"
          customerEmail=""
          onSuccess={() => { setShowEmailModal(false); setSelectedForEmail(null); fetchProformaInvoices() }}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedForReject && (
        <RejectInvoiceModal
          isOpen={showRejectModal}
          onClose={() => { setShowRejectModal(false); setSelectedForReject(null) }}
          onSuccess={() => { setShowRejectModal(false); setSelectedForReject(null); fetchProformaInvoices() }}
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
          onClose={() => { setShowCreateNewModal(false); setSelectedForNewInvoice(null) }}
          onSuccess={() => { setShowCreateNewModal(false); setSelectedForNewInvoice(null); fetchProformaInvoices() }}
          rejectedInvoice={{
            id: selectedForNewInvoice.id,
            invoice_number: selectedForNewInvoice.proforma_number,
            purchase_order: selectedForNewInvoice.po_number
              ? { id: parseInt(selectedForNewInvoice.po_number.split('/')[0]) || 0, internal_po_number: selectedForNewInvoice.po_number }
              : undefined,
          }}
          sessionKey={sessionKey}
        />
      )}
      <DirectCreateProformaInvoiceModal
        isOpen={showDirectCreateModal}
        onClose={() => setShowDirectCreateModal(false)}
        onSuccess={() => {
          setShowDirectCreateModal(false)
          fetchProformaInvoices()
        }}
      />
    </div>
  )
}

export default ProformaInvoiceList
