import React from 'react'
import { X, User, MapPin, Package, Download } from 'lucide-react'

interface PurchaseOrder {
  id: number
  internal_po_number: string
  po_number: string
  po_date: string
  po_file?: string
  quotation_details?: {
    quotation_number: string
    quotation_date: string
    valid_until: string
  } | null
  customer_details: {
    name: string
    customer_code: string
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
    project_area?: string
  }
  shipping_address_details?: {
    address_line1: string
    address_line2: string
    city: string
    state: string
    pincode: string
    country: string
  }
  po_items: Array<{
    id: number
    product_name: string
    product_code: string
    description: string
    hsn_sac_code: string
    quantity: number
    unit: string
    unit_price: number
    line_total: number
    gst_rate: number
  }>
  status: string
  gst_type: string
  subtotal: number
  total_tax: number
  total_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  discount_percentage: number
  discount_amount: number
  shipping_charges: number
  other_charges: number
  notes: string
  terms_and_conditions: string
  created_at: string
  created_by_name: string
}

interface PurchaseOrderViewProps {
  purchaseOrder: PurchaseOrder
  onClose: () => void
}

const PurchaseOrderView: React.FC<PurchaseOrderViewProps> = ({ purchaseOrder, onClose }) => {
  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || statusColors.draft}`}>
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
      igst: 'IGST (Inter-State)',
      cgst_sgst: 'CGST + SGST (Intra-State)',
      exempt: 'GST Exempt'
    }

    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${gstColors[gstType as keyof typeof gstColors] || gstColors.exempt}`}>
        {gstLabels[gstType as keyof typeof gstLabels] || 'Unknown'}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const handleDownloadFile = () => {
    if (purchaseOrder.po_file) {
      window.open(purchaseOrder.po_file, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {purchaseOrder.internal_po_number}
            </h2>
            <div className="flex items-center space-x-4 mt-2">
              {getStatusBadge(purchaseOrder.status)}
              {getGstTypeBadge(purchaseOrder.gst_type)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* PO Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">PO Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Client PO Number:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{purchaseOrder.po_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">PO Date:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(purchaseOrder.po_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Created:</span>
                  <span className="text-gray-900 dark:text-white">{formatDate(purchaseOrder.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Created By:</span>
                  <span className="text-gray-900 dark:text-white">{purchaseOrder.created_by_name}</span>
                </div>
                {purchaseOrder.po_file && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">PO File:</span>
                    <button
                      onClick={handleDownloadFile}
                      className="flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Quotation Reference</h3>
              <div className="space-y-2 text-sm">
                {purchaseOrder.quotation_details ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Quotation Number:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{purchaseOrder.quotation_details.quotation_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Quotation Date:</span>
                      <span className="text-gray-900 dark:text-white">{formatDate(purchaseOrder.quotation_details.quotation_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Valid Until:</span>
                      <span className="text-gray-900 dark:text-white">{formatDate(purchaseOrder.quotation_details.valid_until)}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <span className="text-gray-500 dark:text-gray-400 italic">Direct PO - No Quotation Reference</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{purchaseOrder.customer_details.name}</div>
                <div className="text-gray-600 dark:text-gray-400">{purchaseOrder.customer_details.customer_code}</div>
                {purchaseOrder.customer_details.project_area && (
                  <div className="text-gray-600 dark:text-gray-400 flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {purchaseOrder.customer_details.project_area}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div><strong>Email:</strong> {purchaseOrder.customer_details.email}</div>
                <div><strong>Phone:</strong> {purchaseOrder.customer_details.phone}</div>
                <div><strong>GSTIN:</strong> {purchaseOrder.customer_details.gstin || 'Not provided'}</div>
                <div><strong>PAN:</strong> {purchaseOrder.customer_details.pan_number || 'Not provided'}</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Billing Address:</strong><br />
                  {purchaseOrder.customer_details.billing_address_line1}<br />
                  {purchaseOrder.customer_details.billing_address_line2 && <>{purchaseOrder.customer_details.billing_address_line2}<br /></>}
                  {purchaseOrder.customer_details.billing_city}, {purchaseOrder.customer_details.billing_state} {purchaseOrder.customer_details.billing_pincode}
                </div>
                {purchaseOrder.shipping_address_details && (
                  <div>
                    <strong>Shipping Address:</strong><br />
                    {purchaseOrder.shipping_address_details.address_line1}<br />
                    {purchaseOrder.shipping_address_details.address_line2 && <>{purchaseOrder.shipping_address_details.address_line2}<br /></>}
                    {purchaseOrder.shipping_address_details.city}, {purchaseOrder.shipping_address_details.state} {purchaseOrder.shipping_address_details.pincode}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Items ({purchaseOrder.po_items.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-600">
                    <th className="text-left py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Product</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Qty</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Unit Price</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">GST</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-700 dark:text-gray-300">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrder.po_items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 dark:border-gray-600 last:border-b-0">
                      <td className="py-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {item.product_code} | HSN/SAC: {item.hsn_sac_code}
                          </div>
                          {item.description && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-3 text-right text-sm text-gray-900 dark:text-white">
                        {item.gst_rate}%
                      </td>
                      <td className="py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(item.line_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Financial Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-900 dark:text-white">{formatCurrency(purchaseOrder.subtotal)}</span>
              </div>
              
              {purchaseOrder.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Discount {purchaseOrder.discount_percentage > 0 && `(${purchaseOrder.discount_percentage}%)`}:
                  </span>
                  <span className="text-red-600 dark:text-red-400">-{formatCurrency(purchaseOrder.discount_amount)}</span>
                </div>
              )}
              
              {purchaseOrder.shipping_charges > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shipping Charges:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(purchaseOrder.shipping_charges)}</span>
                </div>
              )}
              
              {purchaseOrder.other_charges > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Other Charges:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(purchaseOrder.other_charges)}</span>
                </div>
              )}

              {purchaseOrder.gst_type === 'cgst_sgst' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">CGST:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(purchaseOrder.cgst_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">SGST:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(purchaseOrder.sgst_amount)}</span>
                  </div>
                </>
              )}

              {purchaseOrder.gst_type === 'igst' && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">IGST:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(purchaseOrder.igst_amount)}</span>
                </div>
              )}

              <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span className="text-gray-900 dark:text-white">Total Amount:</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(purchaseOrder.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          {(purchaseOrder.notes || purchaseOrder.terms_and_conditions) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {purchaseOrder.notes && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Notes</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{purchaseOrder.notes}</p>
                </div>
              )}
              
              {purchaseOrder.terms_and_conditions && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Terms & Conditions</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{purchaseOrder.terms_and_conditions}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PurchaseOrderView
