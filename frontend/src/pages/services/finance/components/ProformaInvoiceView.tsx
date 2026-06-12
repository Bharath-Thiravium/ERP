import React, { useState, useEffect, ErrorInfo } from 'react'
import {
  X, FileText, IndianRupee, Printer, Building, User,
  MapPin, Calendar, Hash, CreditCard, RefreshCw, Trash2
} from 'lucide-react'
import { isOverdue, getOverdueDate } from '../../../../utils/overdueUtils'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

class ProformaViewErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: () => void }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ProformaInvoiceView error:', error.message, info.componentStack?.substring(0, 300))
    if (this.props.onError) this.props.onError()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-4 text-center">
            <FileText className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Proforma</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              There was an error displaying the proforma details.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false })
                if (this.props.onError) this.props.onError()
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

interface ProformaItem {
  id?: number
  product_name: string
  product_code?: string
  description?: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
}

interface CustomerDetails {
  id?: number
  name?: string
  customer_code?: string
  email?: string
  phone?: string
  mobile?: string
  gstin?: string
  project_area?: string
  billing_address_line1?: string
  billing_address_line2?: string
  billing_city?: string
  billing_state?: string
  billing_pincode?: string
  billing_country?: string
  shipping_address_line1?: string
  shipping_address_line2?: string
  shipping_city?: string
  shipping_state?: string
  shipping_pincode?: string
  shipping_country?: string
  payment_terms?: string
}

interface EffectiveShippingAddress {
  source: string
  label?: string
  address: string
  is_default?: boolean
}

interface ProformaInvoice {
  id: number
  proforma_number: string
  proforma_date: string
  due_date?: string
  reference?: string
  customer_name: string
  customer_code: string
  customer_project_area?: string
  customer_gstin?: string
  customer_email?: string
  customer_phone?: string
  company_name?: string
  company_address?: string
  company_gstin?: string
  po_number?: string
  purchase_order_details?: { internal_po_number: string }
  quotation_details?: { quotation_number: string }
  effective_shipping_address?: EffectiveShippingAddress
  status: string
  payment_status: string
  is_rejected?: boolean
  rejection_reason?: string
  is_revised?: boolean
  revision_count?: number
  revised_at?: string
  revised_by_name?: string
  subtotal?: string | number
  total_amount: string | number
  paid_amount?: string | number
  outstanding_amount?: string | number
  discount_percentage?: number
  discount_amount?: string | number
  shipping_charges?: string | number
  other_charges?: string | number
  notes?: string
  terms_and_conditions?: string
  payment_terms?: string
  proforma_items?: ProformaItem[]
  customer_details?: CustomerDetails
  created_at?: string
  created_by_name?: string
}

interface ProformaInvoiceViewProps {
  proformaInvoice: any
  onClose: () => void
  onDeleteSuccess?: () => void
  sessionKey?: string
}

const ProformaInvoiceView: React.FC<ProformaInvoiceViewProps> = ({ proformaInvoice, onClose, onDeleteSuccess, sessionKey }) => {
  const [detailedProforma, setDetailedProforma] = useState<ProformaInvoice>(proformaInvoice)
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const btnBase = 'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors'
  const neutralBtn = `${btnBase} bg-white/85 hover:bg-white text-gray-700 border-gray-200 dark:bg-gray-800/80 dark:hover:bg-gray-800 dark:text-gray-200 dark:border-gray-600`
  const primaryBtn = `${btnBase} bg-blue-600 hover:bg-blue-700 text-white border-blue-600`

  const fetchDetail = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get(`/api/finance/proforma-invoices/${proformaInvoice.id}/`, {
        params: { session_key: sessionKey }
      })
      const d = response.data
      setDetailedProforma({
        ...proformaInvoice,
        ...d,
        customer_name: d.customer_details?.name || proformaInvoice.customer_name,
        customer_code: d.customer_details?.customer_code || proformaInvoice.customer_code,
        status: proformaInvoice.status,
        is_rejected: d.is_rejected ?? proformaInvoice.is_rejected,
      })
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load proforma details'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [proformaInvoice.id, sessionKey])

  const handlePrint = async () => {
    if (!sessionKey) return
    try {
      const response = await fetch(
        `/api/finance/proforma-invoices/${detailedProforma.id}/pdf/`,
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      if (!response.ok) throw new Error('PDF failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const win = window.open(url, '_blank')
      if (win) win.onload = () => win.print()
    } catch {
      toast.error('Failed to generate PDF for printing')
    }
  }

  const handleDownload = async () => {
    if (!sessionKey) return
    try {
      const response = await fetch(
        `/api/finance/proforma-invoices/${detailedProforma.id}/pdf/`,
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      if (!response.ok) throw new Error('PDF failed')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Proforma-${detailedProforma.proforma_number}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download PDF')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete proforma ${detailedProforma.proforma_number}?`)) {
      return
    }
    if (!sessionKey) {
      toast.error('Session expired. Please refresh the page.')
      return
    }

    try {
      setDeleting(true)
      await api.delete(`/api/finance/proforma-invoices/${detailedProforma.id}/`, {
        params: { session_key: sessionKey }
      })
      toast.success('Proforma invoice deleted successfully')
      onDeleteSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to delete proforma invoice')
    } finally {
      setDeleting(false)
    }
  }

  const formatAddress = (details: CustomerDetails | undefined, type: 'billing' | 'shipping') => {
    if (!details) return 'N/A'
    const parts: string[] = []
    if (type === 'billing') {
      if (details.billing_address_line1) parts.push(details.billing_address_line1)
      if (details.billing_address_line2) parts.push(details.billing_address_line2)
      if (details.billing_city) parts.push(details.billing_city)
      if (details.billing_state) parts.push(details.billing_state)
      if (details.billing_pincode) parts.push(details.billing_pincode)
      if (details.billing_country) parts.push(details.billing_country)
    } else {
      if (details.shipping_address_line1) parts.push(details.shipping_address_line1)
      if (details.shipping_address_line2) parts.push(details.shipping_address_line2)
      if (details.shipping_city) parts.push(details.shipping_city)
      if (details.shipping_state) parts.push(details.shipping_state)
      if (details.shipping_pincode) parts.push(details.shipping_pincode)
      if (details.shipping_country) parts.push(details.shipping_country)
    }
    return parts.length > 0 ? parts.join(', ') : 'N/A'
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-4 text-center">
          <FileText className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Proforma</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="flex space-x-3 justify-center">
            <button onClick={() => { setError(null); fetchDetail() }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Retry
            </button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Loading proforma details...</p>
          <p className="text-center mt-2 text-sm text-gray-500 dark:text-gray-500">
            Proforma #{proformaInvoice.proforma_number}
          </p>
        </div>
      </div>
    )
  }

  const p = detailedProforma

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Proforma Invoice</h2>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{p.proforma_number}</p>
              {p.is_revised && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 mt-1">
                  Revised ({p.revision_count} times)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchDetail} className={neutralBtn} title="Refresh">
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Refresh</span>
            </button>
            <button onClick={onClose} className={`${neutralBtn} px-3`} title="Close">
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">

            {/* Company & Customer */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Company */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Building className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">From (Company)</h3>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {p.company_name || 'Company Name'}
                    </div>
                    {p.company_address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">{p.company_address}</div>
                    )}
                    {p.company_gstin && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">GSTIN:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{p.company_gstin}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">To (Customer)</h3>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{p.customer_name}</div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Code:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{p.customer_code}</span>
                    </div>
                    {(p.customer_details?.email || p.customer_email) && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {p.customer_details?.email || p.customer_email}
                        </span>
                      </div>
                    )}
                    {(p.customer_details?.phone || p.customer_phone) && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {p.customer_details?.phone || p.customer_phone}
                        </span>
                      </div>
                    )}
                    {p.customer_gstin && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">GSTIN:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{p.customer_gstin}</span>
                      </div>
                    )}
                    {(p.customer_details?.project_area || p.customer_project_area) && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Project:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                          {p.customer_details?.project_area || p.customer_project_area}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Billing Address</h4>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatAddress(p.customer_details, 'billing')}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Shipping Address</h4>
                  {p.effective_shipping_address?.source && (
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 rounded-full">
                      {p.effective_shipping_address.source}
                    </span>
                  )}
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="space-y-2">
                    {p.effective_shipping_address?.label && (
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        {p.effective_shipping_address.label}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {p.effective_shipping_address?.address || formatAddress(p.customer_details, 'shipping')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Proforma Date</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {p.proforma_date ? new Date(p.proforma_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {p.due_date ? new Date(p.due_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Source</span>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {p.purchase_order_details
                    ? `PO: ${p.purchase_order_details.internal_po_number}`
                    : p.quotation_details
                      ? `Quotation: ${p.quotation_details.quotation_number}`
                      : p.po_number
                        ? `PO: ${p.po_number}`
                        : 'Direct'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                </div>
                <div className="flex flex-col space-y-1">
                  {p.is_rejected ? (
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                      REJECTED
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isOverdue(p.proforma_date, p.payment_status)
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {isOverdue(p.proforma_date, p.payment_status)
                        ? 'OVERDUE'
                        : `DUE ${getOverdueDate(p.proforma_date)?.toLocaleDateString()}`}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    p.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : p.payment_status === 'partially_paid'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {(p.payment_status === 'overdue' ? 'UNPAID' : (p.payment_status || 'UNPAID'))
                      .replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection Reason */}
            {p.is_rejected && p.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="text-md font-semibold text-red-800 dark:text-red-300 mb-2">Rejection Reason</h4>
                <p className="text-sm text-red-700 dark:text-red-400">{p.rejection_reason}</p>
              </div>
            )}

            {/* Items Table — no GST column */}
            {p.proforma_items && p.proforma_items.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Proforma Items</span>
                </h3>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">S.No</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Product Details</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Claim</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Rate</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {p.proforma_items.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              <div className="font-medium">{item.product_name}</div>
                              {item.product_code && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">Code: {item.product_code}</div>
                              )}
                              {item.description && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                              {item.unit === 'PERCENTAGE'
                                ? `${parseFloat(item.quantity.toString()).toFixed(2)}%`
                                : `${parseFloat(item.quantity.toString()).toFixed(2)} ${item.unit}`}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                              ₹{parseFloat(item.unit_price.toString()).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                              ₹{parseFloat(item.line_total.toString()).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Amount Summary — no tax breakdown */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                <IndianRupee className="w-5 h-5 text-green-600" />
                <span>Amount Summary</span>
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{parseFloat(p.subtotal?.toString() || p.total_amount?.toString() || '0').toFixed(2)}
                    </span>
                  </div>
                  {parseFloat(p.discount_amount?.toString() || '0') > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Discount{(p.discount_percentage || 0) > 0 ? ` (${p.discount_percentage}%)` : ''}:
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        -₹{parseFloat(p.discount_amount?.toString() || '0').toFixed(2)}
                      </span>
                    </div>
                  )}
                  {parseFloat(p.shipping_charges?.toString() || '0') > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Charges:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{parseFloat(p.shipping_charges?.toString() || '0').toFixed(2)}
                      </span>
                    </div>
                  )}
                  {parseFloat(p.other_charges?.toString() || '0') > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Other Charges:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{parseFloat(p.other_charges?.toString() || '0').toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right: Totals */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount:</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ₹{parseFloat(p.total_amount?.toString() || '0').toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Paid Amount:</span>
                      <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                        ₹{parseFloat(p.paid_amount?.toString() || '0').toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className={`p-4 rounded-lg border ${
                    parseFloat(p.outstanding_amount?.toString() || '0') > 0
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${
                        parseFloat(p.outstanding_amount?.toString() || '0') > 0
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}>Outstanding:</span>
                      <span className={`text-lg font-semibold ${
                        parseFloat(p.outstanding_amount?.toString() || '0') > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        ₹{parseFloat(p.outstanding_amount?.toString() || '0').toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {p.notes && (
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Notes</h4>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{p.notes}</p>
                  </div>
                </div>
              )}
              {p.terms_and_conditions && (
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Terms &amp; Conditions</h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{p.terms_and_conditions}</p>
                  </div>
                </div>
              )}
            </div>

            {p.payment_terms && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <h4 className="text-md font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Payment Terms</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-400">{p.payment_terms}</p>
              </div>
            )}

            {/* Footer Info */}
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                {p.created_by_name && (
                  <div><span className="font-medium">Created By:</span> {p.created_by_name}</div>
                )}
                {p.created_at && (
                  <div><span className="font-medium">Created On:</span> {new Date(p.created_at).toLocaleString()}</div>
                )}
                {p.is_revised && p.revised_at && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Last Revised:</span>{' '}
                    {new Date(p.revised_at).toLocaleString()} by {p.revised_by_name || 'N/A'}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Bar */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Proforma #{p.proforma_number} • {p.proforma_items?.length || 0} items
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleDelete} disabled={deleting} className={`${neutralBtn} ${deleting ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>{deleting ? 'Deleting...' : 'Delete'}</span>
            </button>
            <button onClick={handleDownload} className={neutralBtn}>
              <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>Download PDF</span>
            </button>
            <button onClick={handlePrint} className={primaryBtn}>
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button onClick={onClose} className={neutralBtn}>
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const ProformaInvoiceViewWithErrorBoundary: React.FC<ProformaInvoiceViewProps> = (props) => (
  <ProformaViewErrorBoundary onError={props.onClose}>
    <ProformaInvoiceView {...props} />
  </ProformaViewErrorBoundary>
)

export default ProformaInvoiceViewWithErrorBoundary
