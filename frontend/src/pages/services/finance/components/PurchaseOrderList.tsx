import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../../../lib/api'

import { Search, Plus, Eye, Edit, Trash2, Filter, FileText, MapPin, Package, ShoppingCart, Receipt, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface PurchaseOrder {
  id: number
  internal_po_number: string
  po_number: string
  po_date: string
  customer_name: string
  customer_code: string
  customer_project_area?: string
  quotation_number: string
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
  onCreateNew: () => void
  onEdit: (po: PurchaseOrder) => void
  onView: (po: PurchaseOrder) => void
  onViewDetails: (po: PurchaseOrder) => void
  onRaiseInvoice: (po: PurchaseOrder) => void
  onSendEmail: (po: PurchaseOrder) => void
  onDelete?: () => void
}

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({ sessionKey, onCreateNew, onEdit, onView, onViewDetails, onRaiseInvoice, onSendEmail, onDelete }) => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [hoveredPO, setHoveredPO] = useState<number | null>(null)

  // Debounce search term
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setSearching(true)
    }
    
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setSearching(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchTerm, debouncedSearchTerm])

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
        ...(statusFilter && { status: statusFilter })
      })

      const response = await apiClient.getFinancePurchaseOrders(Object.fromEntries(new URLSearchParams(params)))

      setPurchaseOrders(response.data.results)
      setTotalPages(Math.ceil(response.data.count / 5))
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast.error('Failed to fetch purchase orders')
    } finally {
      setLoading(false)
    }
  }, [sessionKey, debouncedSearchTerm, statusFilter, currentPage])

  useEffect(() => {
    fetchPurchaseOrders(currentPage)
  }, [currentPage, fetchPurchaseOrders])

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
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    )
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
      {/* Action Header */}
      <div className="flex justify-end">
        <button
          onClick={onCreateNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New PO/WO
        </button>
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
              <option value="draft">Draft</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
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
                      PO Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/50 dark:divide-gray-700/50">
                  {purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {po.po_number}
                          </div>
                          <div
                            className="text-sm text-gray-500 dark:text-gray-400 cursor-help relative"
                            onMouseEnter={() => setHoveredPO(po.id)}
                            onMouseLeave={() => setHoveredPO(null)}
                          >
                            <Package className="w-3 h-3 inline mr-1" />
                            {po.item_count} item{po.item_count !== 1 ? 's' : ''}

                            {/* Tooltip */}
                            {hoveredPO === po.id && (
                              <div className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 min-w-80 max-w-96 pointer-events-none"
                                   style={{
                                     left: '50%',
                                     top: '50%',
                                     transform: 'translate(-50%, -50%)',
                                   }}>
                                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items in this PO:</div>
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {po.po_items && po.po_items.length > 0 ? (
                                    po.po_items.map((item, index) => (
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
                                  {po.item_count > 10 && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1 border-t">
                                      ... and {po.item_count - 10} more items
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {po.quotation_number ? `From: ${po.quotation_number}` : 'Direct PO (No Quotation)'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {po.customer_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {po.customer_code}
                          </div>
                          {po.customer_project_area && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {po.customer_project_area}
                            </div>
                          )}
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
                          {getStatusBadge(po.status)}
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
                          <button
                            onClick={() => onSendEmail(po)}
                            className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                            title="Send Mail"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onRaiseInvoice(po)}
                            className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                            title="Raise Invoice"
                          >
                            <Receipt className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onViewDetails(po)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="PO Details & Payment Tracking"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onView(po)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onEdit(po)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
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
