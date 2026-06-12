import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../../../lib/api'
import api from '../../../../lib/api'
import MetricCard from './MetricCard'
import toast from 'react-hot-toast'

import { Search, Plus, Eye, Edit, Trash2, Filter, FileText, Package, ShoppingCart, Receipt, CheckCircle, TrendingUp, XCircle, User, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react'

interface PurchaseOrder {
  id: number
  internal_po_number: string
  po_number: string
  po_date: string
  customer_name: string
  customer_code: string
  customer_project_area?: string
  customer_email?: string
  customer_phone?: string
  customer_shipping_addresses?: Array<{
    type: string
    address: string
    is_default?: boolean
  }>
  quotation_number: string
  reference: string
  shipping_address?: string
  shipping_address_text?: string
  status: string
  gst_type: string
  subtotal: string
  total_tax: string
  total_amount: string
  item_count: number
  po_items?: Array<{
    product_name: string
    quantity: number
    unit: string
    unit_price: number
    line_total: number
  }>
  created_at: string
  created_by_name: string
}

interface PurchaseOrderListProps {
  sessionKey: string
  selectedFY?: string
  onCreateNew: () => void
  onEdit: (po: PurchaseOrder) => void
  onView: (po: PurchaseOrder) => void
  onViewDetails: (po: PurchaseOrder) => void
  onRaiseInvoice: (po: PurchaseOrder) => void
  onDelete?: () => void
}

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({ sessionKey, selectedFY, onCreateNew, onEdit, onView, onViewDetails, onRaiseInvoice, onDelete }) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('-po_date')

  const handleSort = (field: string) => {
    setSortBy(prev => prev === `-${field}` ? field : `-${field}`)
    setCurrentPage(1)
  }
  const SortIcon = ({ field }: { field: string }) => (
    sortBy === field ? <ChevronUp className="w-3 h-3 inline ml-1" /> :
    sortBy === `-${field}` ? <ChevronDown className="w-3 h-3 inline ml-1" /> :
    <ChevronUp className="w-3 h-3 inline ml-1 opacity-30" />
  )
  const [searching, setSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hoveredPO, setHoveredPO] = useState<number | string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [metrics, setMetrics] = useState({
    total: 0,
    draft: 0,
    confirmed: 0,
    cancelled: 0,
    totalValue: 0,
    avgDealSize: 0
  })
  const [updatingStatuses, setUpdatingStatuses] = useState(false)

  // Debounce search term and reset pagination
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setSearching(true)
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1) // Reset to first page when search changes
      setSearching(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, debouncedSearchTerm])

  // Reset pagination when status filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const fetchPurchaseOrders = useCallback(async (page: number) => {
    if (!sessionKey) return

    // Only show loading for initial load and pagination, not for search
    if (purchaseOrders.length === 0) {
      setLoading(true)
    }
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        session_key: sessionKey,
        ...(debouncedSearchTerm && { search: debouncedSearchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ordering: sortBy,
      })
      
      if (selectedFY) {
        params.append('financial_year', selectedFY)
      } else {
        params.append('financial_year', 'all')
      }

      const response = await apiClient.getFinancePurchaseOrders(Object.fromEntries(new URLSearchParams(params)))

      const pos = response.data.results
      
      // Debug: Check if customer_shipping_addresses is in the response
      console.log('First PO customer data:', pos[0] ? {
        customer_name: pos[0].customer_name,
        customer_shipping_addresses: pos[0].customer_shipping_addresses,
        customer_email: pos[0].customer_email,
        customer_phone: pos[0].customer_phone
      } : 'No POs found')
      
      setPurchaseOrders(pos)
      
      // Fix pagination calculation - use proper page size from backend (20 items per page)
      const pageSize = 20
      setTotalPages(Math.ceil(response.data.count / pageSize))
      
      // Calculate metrics from all data, not just current page
      const total = response.data.count
      const draft = pos.filter((po: PurchaseOrder) => po.status === 'draft').length
      const confirmed = pos.filter((po: PurchaseOrder) => ['active', 'partially_completed'].includes(po.status)).length
      const cancelled = pos.filter((po: PurchaseOrder) => po.status === 'cancelled').length
      const totalValue = pos.reduce((sum: number, po: PurchaseOrder) => sum + parseFloat(po.total_amount || '0'), 0)
      const avgDealSize = total > 0 ? (totalValue / total) : 0
      
      setMetrics({ total, draft, confirmed, cancelled, totalValue, avgDealSize })
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast.error('Failed to fetch purchase orders')
    } finally {
      setLoading(false)
    }
  }, [sessionKey, debouncedSearchTerm, statusFilter, currentPage, sortBy, selectedFY])

  useEffect(() => {
    fetchPurchaseOrders(currentPage)
  }, [currentPage, fetchPurchaseOrders])

  const handleBulkStatusUpdate = async () => {
    if (!sessionKey) {
      toast.error('Session expired. Please login again.')
      return
    }
    if (!confirm('Recalculate all PO statuses based on their actual invoice data? This will fix any status discrepancies.')) {
      return
    }
    setUpdatingStatuses(true)
    try {
      const response = await api.post(
        `/api/finance/purchase-orders/sync_statuses/?session_key=${sessionKey}`
      )
      const { synced, status_changed } = response.data
      toast.success(`Synced ${synced} POs — ${status_changed} status(es) corrected`)
      fetchPurchaseOrders(currentPage)
    } catch (error) {
      console.error('Error syncing PO statuses:', error)
      toast.error('Failed to sync PO statuses')
    } finally {
      setUpdatingStatuses(false)
    }
  }

  const handleDelete = async (po: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to delete PO ${po.internal_po_number}?`)) {
      return
    }

    if (!sessionKey) {
      alert('Session expired. Please login again.')
      return
    }

    try {
      await apiClient.deleteFinancePurchaseOrder(po.id, { session_key: sessionKey })

      toast.success('Purchase order deleted successfully! Quotation status reverted to "sent".')
      fetchPurchaseOrders(currentPage)

      // Notify parent component that a PO was deleted (to refresh quotations)
      if (onDelete) {
        onDelete()
      }
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      toast.error('Failed to delete purchase order')
    }
  }

  const handleReject = async (po: PurchaseOrder) => {
    if (!confirm(`Are you sure you want to reject PO ${po.internal_po_number}? This will mark it as rejected but keep it in the database for records.`)) {
      return
    }

    if (!sessionKey) {
      alert('Session expired. Please login again.')
      return
    }

    try {
      await apiClient.updateFinancePurchaseOrder(po.id, {
        status: 'cancelled',
        session_key: sessionKey
      })

      toast.success('Purchase order rejected successfully!')
      fetchPurchaseOrders(currentPage)
    } catch (error) {
      console.error('Error rejecting purchase order:', error)
      toast.error('Failed to reject purchase order')
    }
  }

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      partially_completed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    }

    const statusLabels = {
      draft: 'Draft',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      active: 'Active',
      partially_completed: 'Partially Completed',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {statusLabels[status as keyof typeof statusLabels] || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    )
  }

  const canRaiseInvoice = (status: string) => {
    return ['confirmed', 'active', 'in_progress', 'partially_completed'].includes(status)
  }



  const getGstTypeBadge = (gstType: string) => {
    const gstColors = {
      igst: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      cgst_sgst: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
      exempt: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }

    const gstLabels = {
      igst: 'IGST',
      cgst_sgst: 'CGST+SGST',
      exempt: 'Exempt'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${gstColors[gstType as keyof typeof gstColors] || gstColors.exempt}`}>
        {gstLabels[gstType as keyof typeof gstLabels] || 'Unknown'}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(parseFloat(amount))
  }

  if (loading && purchaseOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tooltip Portal - Render at root level */}
      {hoveredPO !== null && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 max-w-2xl pointer-events-none"
          style={{
            left: `${Math.min(mousePosition.x + 15, window.innerWidth - 600)}px`,
            top: `${Math.max(mousePosition.y - 50, 10)}px`,
          }}
        >
          {/* Customer Address Tooltip */}
          {typeof hoveredPO === 'string' && hoveredPO.startsWith('customer-') && (() => {
            const poId = parseInt(hoveredPO.replace('customer-', ''))
            const currentPO = purchaseOrders.find(po => po.id === poId)
            if (currentPO) {
              return (
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                    {currentPO.customer_name}
                    {currentPO.customer_email && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-normal mt-1">
                        📧 {currentPO.customer_email}
                      </div>
                    )}
                    {currentPO.customer_phone && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-normal">
                        📞 {currentPO.customer_phone}
                      </div>
                    )}
                  </div>
                  {/* Show only PO-specific shipping address */}
                  {currentPO.shipping_address_text ? (
                    <div className="text-xs">
                      <div className="font-semibold mb-1 flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        🏢 PO Shipping Address
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed pl-4">
                        {currentPO.shipping_address_text}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      No specific shipping address for this PO
                    </div>
                  )}
                </div>
              )
            }
            return null
          })()}
          
          {/* Items Tooltip */}
          {typeof hoveredPO === 'number' && (() => {
            const currentPO = purchaseOrders.find(po => po.id === hoveredPO)
            if (currentPO?.po_items && currentPO.po_items.length > 0) {
              return (
                <div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items in this PO:</div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {currentPO.po_items.map((item, index) => (
                      <div key={index} className="text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {parseFloat(String(item.quantity || 0)).toFixed(2)} {item.unit} x ₹{parseFloat(String(item.unit_price || 0)).toFixed(2)} = ₹{parseFloat(String(item.line_total || 0)).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            } else {
              return <div className="text-xs text-gray-500 dark:text-gray-400">No items data available</div>
            }
          })()}
        </div>
      )}


      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total PO/WO"
          value={metrics.total}
          subtitle={`${metrics.total} orders created`}
          icon={ShoppingCart}
          color="blue"
        />
        <MetricCard
          title="Draft"
          value={metrics.draft}
          subtitle={`${metrics.draft} awaiting confirmation`}
          icon={Edit}
          color="orange"
        />
        <MetricCard
          title="Confirmed"
          value={metrics.confirmed}
          subtitle={`${metrics.confirmed} ready for invoicing`}
          icon={CheckCircle}
          color="blue"
        />
        <MetricCard
          title="Cancelled"
          value={metrics.cancelled}
          subtitle={`${metrics.cancelled} orders cancelled`}
          icon={XCircle}
          color="red"
        />

        {/* Avg Deal Size (secondary) */}
        <div className="relative">
          <div className="scale-90 origin-left">
            <MetricCard
              title="Avg Deal Size"
              value={`₹${metrics.avgDealSize.toLocaleString()}`}
              subtitle={`₹${metrics.totalValue.toLocaleString()} total value`}
              icon={TrendingUp}
              color="purple"
            />
          </div>
        </div>

        {/* Total Value (highlight primary) */}
        <div className="lg:col-span-1">
          <MetricCard
            title="Total Value"
            value={`₹${metrics.totalValue.toLocaleString()}`}
            subtitle={`Across all Purchase Orders/Work Orders`}
            icon={TrendingUp}
            color="purple"
          />
        </div>
      </div>

      {/* Status Management */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">PO Status Management</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              PO statuses are automatically managed based on invoice claims
            </p>
          </div>
          <button
            onClick={handleBulkStatusUpdate}
            disabled={updatingStatuses}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${updatingStatuses ? 'animate-spin' : ''}`} />
            {updatingStatuses ? 'Updating...' : 'Sync All Statuses'}
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span><strong>Active:</strong> No invoices raised yet</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span><strong>Partially Completed:</strong> Partially claimed (&lt;100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span><strong>Completed:</strong> Fully claimed (100%)</span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by PO number, customer, quotation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-200"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="partially_completed">Partially Completed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        {purchaseOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Purchase Orders Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Get started by creating your first purchase order or work order. You can create POs directly or from sent quotations.
            </p>
            <button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 mx-auto transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              Create First PO/WO
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      <span onClick={() => handleSort('internal_po_number')} className="cursor-pointer hover:text-gray-900 dark:hover:text-white select-none">PO# <SortIcon field="internal_po_number" /></span>
                      <span className="mx-1 text-gray-300">|</span>
                      <span onClick={() => handleSort('po_date')} className="cursor-pointer hover:text-gray-900 dark:hover:text-white select-none">Date <SortIcon field="po_date" /></span>
                    </th>
                    <th onClick={() => handleSort('customer_name')} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 select-none">Customer <SortIcon field="customer_name" /></th>
                    <th onClick={() => handleSort('po_date')} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 select-none">Date <SortIcon field="po_date" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th onClick={() => handleSort('total_amount')} className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 select-none">Amount <SortIcon field="total_amount" /></th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div 
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                            onClick={() => onView(po)}
                          >
                            {po.po_number}
                          </div>
                          <div
                            className="text-sm text-gray-500 dark:text-gray-400 cursor-help relative"
                            onMouseEnter={(e) => {
                              setHoveredPO(po.id)
                              setMousePosition({ x: e.clientX, y: e.clientY })
                            }}
                            onMouseLeave={() => setHoveredPO(null)}
                            onMouseMove={(e) => {
                              if (hoveredPO === po.id) {
                                setMousePosition({ x: e.clientX, y: e.clientY })
                              }
                            }}
                          >
                            <Package className="w-3 h-3 inline mr-1" />
                            {po.item_count} item{po.item_count !== 1 ? 's' : ''}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {po.quotation_number ? `From: ${po.quotation_number}` : 'Direct PO (No Quotation)'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <div>
                            {/* Customer Name */}
                            <div
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer border-b border-dotted border-blue-600 dark:border-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              onMouseEnter={(e) => {
                                setHoveredPO(`customer-${po.id}`)
                                setMousePosition({ x: e.clientX, y: e.clientY })
                              }}
                              onMouseLeave={() => setHoveredPO(null)}
                              onMouseMove={(e) => {
                                if (hoveredPO === `customer-${po.id}`) {
                                  setMousePosition({ x: e.clientX, y: e.clientY })
                                }
                              }}
                            >
                              {po.customer_name ? po.customer_name.replace(/[<>"'&]/g, '') : ''}
                            </div>
                            {/* Shipping Address — same style as InvoiceList */}
                            {po.shipping_address_text ? (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                <span className="mr-1">📦</span>
                                {po.shipping_address_text}
                              </div>
                            ) : (
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[200px] italic">
                                Ship: same as billing
                              </div>
                            )}
                            {po.customer_project_area && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                {po.customer_project_area}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {formatDate(po.po_date)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Created: {formatDate(po.created_at)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(po.status)}
                            {(po.status === 'confirmed' || po.status === 'active') && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                                Ready for Invoice
                              </span>
                            )}
                            {(po.status === 'in_progress' || po.status === 'partially_completed') && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                Partially Claimed
                              </span>
                            )}
                            {po.status === 'completed' && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                100% Claimed
                              </span>
                            )}
                          </div>
                          {getGstTypeBadge(po.gst_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(po.total_amount)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Tax: {formatCurrency(po.total_tax)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {/* Edit (PO/WO) */}
                          {(() => {
                            const isEditable = !['completed', 'cancelled'].includes(po.status)
                            return (
                              <button
                                onClick={() => onEdit(po)}
                                disabled={!isEditable}
                                className={`transition-colors ${
                                  isEditable
                                    ? 'text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300'
                                    : 'text-gray-400 cursor-not-allowed'
                                }`}
                                title={isEditable ? 'Edit PO/WO' : `Cannot edit ${po.status} PO/WO`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )
                          })()}

                          {/* Raise Invoice Button - Only for appropriate statuses */}
                          {canRaiseInvoice(po.status) ? (
                            <button
                              onClick={() => onRaiseInvoice(po)}
                              className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                              title="Raise Invoice"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          ) : po.status === 'completed' ? (
                            <button
                              disabled
                              className="text-gray-400 cursor-not-allowed"
                              title="PO is 100% completed - no more invoices can be raised"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="text-gray-400 cursor-not-allowed"
                              title={`Cannot raise invoice for ${po.status} PO`}
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => onViewDetails(po)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="PO Details & Payment Tracking"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Show delete only for quotation-based POs, reject for direct POs */}
                          {po.quotation_number ? (
                            <button
                              onClick={() => handleDelete(po)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete PO"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReject(po)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Reject PO"
                            >
                              <Trash2 className="w-4 h-4" />
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
                <div className="flex items-center justify-between">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Page <span className="font-medium">{currentPage}</span> of{' '}
                        <span className="font-medium">{totalPages}</span>
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
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default PurchaseOrderList
