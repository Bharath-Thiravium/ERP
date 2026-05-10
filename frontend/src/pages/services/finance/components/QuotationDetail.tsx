import React, { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { X, User, MapPin, FileText, IndianRupee, Printer, Download, Calendar, Hash, CreditCard, RefreshCw, Edit, Copy, ShoppingCart } from 'lucide-react'
import toast from 'react-hot-toast'

import PrintableQuotation from './PrintableQuotation'
import SendEmailModal from './SendEmailModal'

interface QuotationItem {
  id: number
  product_name: string
  product_code: string
  description: string
  hsn_sac_code: string
  quantity: string
  unit: string
  unit_price: string
  line_total: string
  gst_rate: string
}

interface Customer {
  id: number
  customer_code: string
  name: string
  email: string
  phone: string
  gstin: string
  pan_number: string
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_state: string
  billing_pincode: string
  billing_country: string
}

interface ShippingAddress {
  id: number
  label: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  country: string
}

interface QuotationDetail {
  id: number
  quotation_number: string
  quotation_date: string
  valid_until: string
  reference: string
  status: string
  gst_type: string
  customer_gstin: string
  company_gstin: string
  subtotal: string
  total_tax: string
  total_amount: string
  cgst_amount: string
  sgst_amount: string
  igst_amount: string
  discount_percentage: string
  discount_amount: string
  shipping_charges: string
  other_charges: string
  notes: string
  terms_and_conditions: string
  created_at: string
  created_by_name: string
  is_rejected?: boolean
  rejection_reason?: string
  customer_details: Customer
  shipping_address_details: ShippingAddress | null
  quotation_items: QuotationItem[]
}

interface QuotationDetailProps {
  quotationId: number
  onClose: () => void
  onEdit: () => void
  onRevise?: () => void
  onCreatePO?: (quotation: any) => void
  onRaiseInvoice?: (quotation: any) => void
  quotationStatus?: string
}

const QuotationDetail: React.FC<QuotationDetailProps> = ({ quotationId, onClose, onEdit, onRevise, onCreatePO, onRaiseInvoice }) => {
  const { sessionKey } = useServiceUserStore()
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const printableRef = useRef<HTMLDivElement>(null)
  const headerActionButtonClass = 'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors'
  const neutralActionButtonClass = `${headerActionButtonClass} bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700`
  const primaryActionButtonClass = `${headerActionButtonClass} bg-blue-600 hover:bg-blue-700 text-white border-blue-600`
  const successActionButtonClass = `${headerActionButtonClass} bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:bg-gray-800 dark:text-emerald-300 dark:border-emerald-800 dark:hover:bg-gray-700`
  const accentActionButtonClass = `${headerActionButtonClass} bg-white text-orange-700 border-orange-200 hover:bg-orange-50 dark:bg-gray-800 dark:text-orange-300 dark:border-orange-800 dark:hover:bg-gray-700`

  useEffect(() => {
    fetchQuotationDetail()
  }, [quotationId, sessionKey])

  const fetchQuotationDetail = async () => {
    if (!sessionKey) {
      console.error('No session key available')
      return
    }

    try {
      setLoading(true)
      const response = await apiClient.getFinanceQuotation(quotationId, { session_key: sessionKey })

      setQuotation(response.data)
    } catch (error) {
      console.error('Error fetching quotation detail:', error)
      alert('Failed to load quotation details')
    } finally {
      setLoading(false)
    }
  }



  const getGstTypeBadge = (gstType: string) => {
    const gstColors = {
      igst: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      cgst_sgst: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      exempt: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    }

    const gstLabels = {
      igst: 'IGST (Inter-State)',
      cgst_sgst: 'CGST + SGST (Intra-State)',
      exempt: 'GST Exempt',
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${gstColors[gstType as keyof typeof gstColors] || gstColors.exempt}`}>
        {gstLabels[gstType as keyof typeof gstLabels] || gstType}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount))
  }

  const handlePrint = async () => {
    if (!quotation || !sessionKey) return

    try {
      // Use the backend API to generate PDF with company logo and from address
      const response = await fetch(`/api/finance/quotations/${quotation.id}/pdf/?session_key=${sessionKey}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionKey}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Get the PDF blob and open in new window for printing
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
    } catch (error) {
      console.error('Error generating PDF for print:', error)
      alert('Error generating PDF for print. Please try again.')
    }
  }

  const handleDownloadPDF = async () => {
    if (!quotation || !sessionKey) return

    setIsGeneratingPDF(true)
    try {
      // Use the backend API to generate PDF with company logo and from address
      const response = await fetch(`/api/finance/quotations/${quotation.id}/pdf/?session_key=${sessionKey}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionKey}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      // Get the PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Quotation-${quotation.quotation_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Error generating PDF. Please try again.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleSendEmail = () => {
    setShowEmailModal(true)
  }

  const handleCopyQuotation = async () => {
    if (!quotation || !sessionKey) return

    try {
      await apiClient.copyFinanceQuotation(quotation.id, { session_key: sessionKey })
      toast.success('Quotation copied successfully!')
      onClose()
    } catch (error) {
      console.error('Error copying quotation:', error)
      toast.error('Failed to copy quotation')
    }
  }

  const handleCreatePO = () => {
    if (!quotation) return
    if (onCreatePO) {
      onCreatePO(quotation)
      onClose()
    }
  }

  const handleRaiseInvoice = () => {
    if (!quotation) return
    if (onRaiseInvoice) {
      onRaiseInvoice(quotation)
      onClose()
    }
  }

  const handleEdit = () => {
    console.log('Edit button clicked in QuotationDetail')
    console.log('Quotation status:', quotation?.status)
    console.log('Calling onEdit...')
    onEdit()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading quotation...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <p className="text-red-600">Failed to load quotation details</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 print:hidden">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quotation
              </h2>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {quotation.quotation_number}
              </p>
            </div>
          </div>
          <div className="flex items-center flex-wrap justify-end gap-2">
            {/* Edit button - for draft, sent, and approved status */}
            {quotation && (
              quotation.status === 'draft' || 
              (quotation.status === 'sent' && !quotation.is_rejected && !quotation.po_created && !quotation.invoice_created && !quotation.proforma_created) ||
              (quotation.status === 'approved' && !quotation.po_created && !quotation.invoice_created && !quotation.proforma_created)
            ) && (
              <button
                onClick={handleEdit}
                className={successActionButtonClass}
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
            
            {/* Duplicate button - always available */}
            <button
              onClick={handleCopyQuotation}
              className={neutralActionButtonClass}
            >
              <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Duplicate</span>
            </button>
            
            {/* Create PO button - only for sent status without PO/Invoice */}
            {quotation && quotation.status === 'sent' && !quotation.po_created && !quotation.invoice_created && !quotation.proforma_created && onCreatePO && (
              <button
                onClick={handleCreatePO}
                className={neutralActionButtonClass}
              >
                <ShoppingCart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Create PO</span>
              </button>
            )}
            
            {/* Raise Invoice button - only for sent status without PO */}
            {quotation && quotation.status === 'sent' && !quotation.po_created && onRaiseInvoice && (
              (quotation.available_invoice_percentage || 0) > 0 || (quotation.available_proforma_percentage || 0) > 0 || 
              (!quotation.invoice_created && !quotation.proforma_created)
            ) && (
              <button
                onClick={handleRaiseInvoice}
                className={accentActionButtonClass}
              >
                <IndianRupee className="w-4 h-4" />
                <span>Raise Invoice</span>
              </button>
            )}

            <button
              onClick={fetchQuotationDetail}
              className={neutralActionButtonClass}
            >
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className={`${neutralActionButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isGeneratingPDF ? (
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"></div>
              ) : (
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className={primaryActionButtonClass}
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button
              onClick={onClose}
              className={neutralActionButtonClass}
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quotation Overview</h3>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{quotation.quotation_number}</div>
                    {quotation.reference && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Reference:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{quotation.reference}</span>
                      </div>
                    )}
                    {quotation.company_gstin && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Company GSTIN:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{quotation.company_gstin}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Details</h3>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{quotation.customer_details.name}</div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Code:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{quotation.customer_details.customer_code}</span>
                    </div>
                    {quotation.customer_details.email && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{quotation.customer_details.email}</span>
                      </div>
                    )}
                    {quotation.customer_details.phone && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{quotation.customer_details.phone}</span>
                      </div>
                    )}
                    {quotation.customer_details.gstin && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">GSTIN:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{quotation.customer_details.gstin}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Billing Address</h4>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800 text-sm text-gray-600 dark:text-gray-400">
                  {quotation.customer_details.billing_address_line1}<br />
                  {quotation.customer_details.billing_address_line2 && <>{quotation.customer_details.billing_address_line2}<br /></>}
                  {quotation.customer_details.billing_city}, {quotation.customer_details.billing_state} {quotation.customer_details.billing_pincode}<br />
                  {quotation.customer_details.billing_country}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Shipping Address</h4>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800 text-sm text-gray-600 dark:text-gray-400">
                  {quotation.shipping_address_details ? (
                    <>
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
                        {quotation.shipping_address_details.label}
                      </div>
                      {quotation.shipping_address_details.address_line1}<br />
                      {quotation.shipping_address_details.address_line2 && <>{quotation.shipping_address_details.address_line2}<br /></>}
                      {quotation.shipping_address_details.city}, {quotation.shipping_address_details.state} {quotation.shipping_address_details.pincode}<br />
                      {quotation.shipping_address_details.country}
                    </>
                  ) : (
                    <span>No shipping address selected</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quotation Date</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(quotation.quotation_date)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Valid Until</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(quotation.valid_until)}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Items</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">{quotation.quotation_items.length}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    quotation.is_rejected
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      : quotation.status === 'draft'
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        : quotation.status === 'sent'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                  }`}>
                    {quotation.is_rejected ? 'REJECTED' : quotation.status.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  {getGstTypeBadge(quotation.gst_type)}
                </div>
              </div>
            </div>

            {quotation.is_rejected && quotation.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="text-md font-semibold text-red-800 dark:text-red-300 mb-2">Rejection Reason</h4>
                <p className="text-sm text-red-700 dark:text-red-400">{quotation.rejection_reason}</p>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Quotation Items</span>
              </h3>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      S.No
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      HSN/SAC
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      GST %
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {quotation.quotation_items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.product_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {item.product_code}
                          </div>
                          {item.description && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item.hsn_sac_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        {parseFloat(item.quantity).toFixed(2)} {item.unit}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                        {parseFloat(item.gst_rate).toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                <IndianRupee className="w-5 h-5 text-green-600" />
                <span>Amount Summary</span>
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(quotation.subtotal)}</span>
                </div>
                
                {parseFloat(quotation.discount_amount) > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>
                      Discount {parseFloat(quotation.discount_percentage) > 0 && `(${parseFloat(quotation.discount_percentage).toFixed(2)}%)`}:
                    </span>
                    <span>-{formatCurrency(quotation.discount_amount)}</span>
                  </div>
                )}

                {quotation.gst_type === 'cgst_sgst' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">CGST:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(quotation.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">SGST:</span>
                      <span className="text-gray-900 dark:text-white">{formatCurrency(quotation.sgst_amount)}</span>
                    </div>
                  </>
                )}

                {quotation.gst_type === 'igst' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">IGST:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(quotation.igst_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Tax:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(quotation.total_tax)}</span>
                </div>

                {parseFloat(quotation.shipping_charges) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Shipping Charges:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(quotation.shipping_charges)}</span>
                  </div>
                )}

                {parseFloat(quotation.other_charges) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Other Charges:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(quotation.other_charges)}</span>
                  </div>
                )}

                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-900 dark:text-white">Total Amount:</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {(quotation.notes || quotation.terms_and_conditions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {quotation.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 print:text-base print:mb-2">Internal Notes</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 print:bg-white print:border print:border-gray-300 print:p-3">
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap print:text-gray-900 print:text-sm">{quotation.notes}</p>
                  </div>
                </div>
              )}

              {quotation.terms_and_conditions && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 print:text-base print:mb-2">Terms and Conditions</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 print:bg-white print:border print:border-gray-300 print:p-3">
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap print:text-gray-900 print:text-sm">{quotation.terms_and_conditions}</p>
                  </div>
                </div>
              )}
            </div>
          )}

            <div className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between">
              <span>Created by: {quotation.created_by_name}</span>
              <span>Created on: {formatDate(quotation.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Printable Component for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <div ref={printableRef}>
          <PrintableQuotation quotation={quotation} />
        </div>
      </div>

      {/* Email Modal */}
      <SendEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        invoiceId={quotation.id}
        invoiceNumber={quotation.quotation_number}
        invoiceType="quotation"
        customerEmail={quotation.customer_details.email}
        onSuccess={() => {
          setShowEmailModal(false);
          fetchQuotationDetail(); // Refresh quotation details
        }}
      />
    </div>
  )
}

export default QuotationDetail
