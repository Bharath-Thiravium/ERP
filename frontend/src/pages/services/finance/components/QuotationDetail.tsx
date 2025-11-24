import React, { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { X, User, MapPin, FileText, DollarSign, Printer, Mail, Edit, Download } from 'lucide-react'

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
}

const QuotationDetail: React.FC<QuotationDetailProps> = ({ quotationId, onClose, onEdit }) => {
  const { sessionKey } = useServiceUserStore()
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const printableRef = useRef<HTMLDivElement>(null)

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 print:hidden">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Quotation Details
            </h2>
            <p className="text-gray-600 dark:text-gray-400">{quotation.quotation_number}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download PDF"
            >
              {isGeneratingPDF ? (
                <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
              ) : (
                <Download className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={handleSendEmail}
              className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              title="Send Email"
            >
              <Mail className="w-5 h-5" />
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              title="Edit"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-4 print:max-h-none print-content">
          {/* Print Header - Only visible when printing */}
          <div className="hidden print:block mb-6">
            <div className="text-center border-b-2 border-gray-300 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">QUOTATION</h1>
              <p className="text-lg text-gray-700">{quotation.quotation_number}</p>
            </div>
          </div>

          {/* Quotation Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:gap-4 print:mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Quotation Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Quotation Number:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{quotation.quotation_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(quotation.quotation_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Valid Until:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(quotation.valid_until)}</span>
                </div>
                {quotation.reference && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Reference:</span>
                    <span className="text-gray-900 dark:text-white">{quotation.reference}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    quotation.is_rejected 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      : quotation.status === 'draft' 
                        ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        : quotation.status === 'sent'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                          : quotation.status === 'accepted'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {quotation.is_rejected ? 'Rejected' : quotation.status.charAt(0).toUpperCase() + quotation.status.slice(1)}
                  </span>
                </div>
                {quotation.is_rejected && quotation.rejection_reason && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      Rejection Reason:
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      {quotation.rejection_reason}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">GST Type:</span>
                  {getGstTypeBadge(quotation.gst_type)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 print:text-base print:mb-3">
                <User className="w-5 h-5 inline mr-2 print:hidden" />
                Customer Details
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{quotation.customer_details.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{quotation.customer_details.customer_code}</div>
                </div>
                {quotation.customer_details.gstin && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">GSTIN: </span>
                    <span className="text-gray-900 dark:text-white">{quotation.customer_details.gstin}</span>
                  </div>
                )}
                {quotation.customer_details.pan_number && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">PAN: </span>
                    <span className="text-gray-900 dark:text-white">{quotation.customer_details.pan_number}</span>
                  </div>
                )}
                {quotation.customer_details.email && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Email: </span>
                    <span className="text-gray-900 dark:text-white">{quotation.customer_details.email}</span>
                  </div>
                )}
                {quotation.customer_details.phone && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Phone: </span>
                    <span className="text-gray-900 dark:text-white">{quotation.customer_details.phone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 print:gap-4 print:mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 print:text-base print:mb-3">
                <MapPin className="w-5 h-5 inline mr-2 print:hidden" />
                Billing Address
              </h3>
              <div className="text-gray-600 dark:text-gray-400 print:text-gray-900 print:text-sm">
                {quotation.customer_details.billing_address_line1}<br />
                {quotation.customer_details.billing_address_line2 && (
                  <>{quotation.customer_details.billing_address_line2}<br /></>
                )}
                {quotation.customer_details.billing_city}, {quotation.customer_details.billing_state} {quotation.customer_details.billing_pincode}<br />
                {quotation.customer_details.billing_country}
              </div>
            </div>

            {quotation.shipping_address_details && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 print:text-base print:mb-3">
                  <MapPin className="w-5 h-5 inline mr-2 print:hidden" />
                  Shipping Address
                </h3>
                <div className="text-gray-600 dark:text-gray-400 print:text-gray-900 print:text-sm">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {quotation.shipping_address_details.label}
                  </div>
                  {quotation.shipping_address_details.address_line1}<br />
                  {quotation.shipping_address_details.address_line2 && (
                    <>{quotation.shipping_address_details.address_line2}<br /></>
                  )}
                  {quotation.shipping_address_details.city}, {quotation.shipping_address_details.state} {quotation.shipping_address_details.pincode}<br />
                  {quotation.shipping_address_details.country}
                </div>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="mb-8 print:mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 print:text-base print:mb-3">
              <FileText className="w-5 h-5 inline mr-2 print:hidden" />
              Items
            </h3>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
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
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {quotation.quotation_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
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

          {/* Totals */}
          <div className="mb-8 print:mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 print:text-base print:mb-3">
              <DollarSign className="w-5 h-5 inline mr-2 print:hidden" />
              Summary
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 print:bg-white print:border print:border-gray-300 print:p-4">
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

                <div className="border-t border-gray-300 dark:border-gray-600 pt-3">
                  <div className="flex justify-between text-lg font-semibold">
                    <span className="text-gray-900 dark:text-white">Total Amount:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(quotation.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(quotation.notes || quotation.terms_and_conditions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 print:gap-4 print:mb-4">
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

          {/* Footer Info */}
          <div className="text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4 print:text-xs print:text-gray-700 print:border-gray-300 print:pt-3">
            <div className="flex justify-between print:flex-col print:gap-1">
              <span>Created by: {quotation.created_by_name}</span>
              <span>Created on: {formatDate(quotation.created_at)}</span>
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
