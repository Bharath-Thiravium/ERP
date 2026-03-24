import React, { useState } from 'react'
import { X, FileText, CreditCard, Receipt, Building, User, MapPin, Package, ChevronRight } from 'lucide-react'

interface PurchaseOrder {
  id: number
  internal_po_number: string
  po_number: string
  customer_name: string
  subtotal: string
  total_amount: string
  status: string
  claim_type?: string
  remaining_proforma_balance: string
  remaining_invoice_balance: string
  proforma_claimed_amount: string
  invoice_claimed_amount: string
  total_claimed_percentage: number
  customer_details?: {
    name: string
    customer_code: string
    email: string
    phone: string
    gstin: string
    project_area: string
    billing_address_line1: string
    billing_address_line2: string
    billing_city: string
    billing_state: string
    billing_pincode: string
    billing_country: string
  }
  po_items?: Array<{
    id: number
    product_name: string
    quantity: number
    unit: string
    unit_price: string
    gst_rate: string
    line_total: string
  }>
}

interface Quotation {
  id: number
  quotation_number: string
  customer_name: string
  subtotal: string
  total_amount: string
  claim_type?: string
  remaining_proforma_balance: string
  remaining_invoice_balance: string
  proforma_claimed_amount: string
  invoice_claimed_amount: string
  total_claimed_percentage: number
  customer_details?: PurchaseOrder['customer_details']
  quotation_items?: PurchaseOrder['po_items']
}

interface RaiseInvoiceModalProps {
  purchaseOrder?: PurchaseOrder
  quotation?: Quotation
  onClose: () => void
  onCreateProforma: (data: any) => void
  onCreateTaxInvoice: (data: any) => void
}

const RaiseInvoiceModal: React.FC<RaiseInvoiceModalProps> = ({
  purchaseOrder,
  quotation,
  onClose,
  onCreateProforma,
  onCreateTaxInvoice,
}) => {
  const sourceData = purchaseOrder || quotation
  const isPO = !!purchaseOrder
  const sourceNumber = isPO ? purchaseOrder!.internal_po_number : quotation!.quotation_number
  const items = isPO ? purchaseOrder!.po_items : quotation!.quotation_items
  const customer = sourceData?.customer_details

  const [invoiceType, setInvoiceType] = useState<'proforma' | 'tax' | ''>('')
  const [loading, setLoading] = useState(false)

  const totalAmount = parseFloat(sourceData?.total_amount || '0')
  const remainingInvoice = parseFloat(sourceData?.remaining_invoice_balance || sourceData?.total_amount || '0')
  const remainingProforma = parseFloat(sourceData?.remaining_proforma_balance || sourceData?.subtotal || '0')
  const claimedPct = sourceData?.total_claimed_percentage || 0

  const handleProceed = () => {
    if (!invoiceType || loading) return
    setLoading(true)

    const data = {
      ...(purchaseOrder && { purchase_order: purchaseOrder.id }),
      ...(quotation && { quotation: quotation.id }),
      invoice_type: invoiceType,
    }

    if (invoiceType === 'proforma') {
      onCreateProforma(data)
    } else {
      onCreateTaxInvoice(data)
    }

    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Raise Invoice</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{isPO ? 'Purchase Order' : 'Quotation'}: {sourceNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* PO/Quotation Summary */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-3">
              <Building className="w-4 h-4 text-orange-600" />
              <h3 className="font-medium text-orange-900 dark:text-orange-100">{isPO ? 'PO' : 'Quotation'} Summary</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Total Value</p>
                <p className="font-semibold text-gray-900 dark:text-white">₹{totalAmount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Claimed %</p>
                <p className="font-semibold text-orange-600">{claimedPct.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Remaining (Invoice)</p>
                <p className="font-semibold text-green-600">₹{remainingInvoice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Remaining (Proforma)</p>
                <p className="font-semibold text-blue-600">₹{remainingProforma.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          {customer && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-white">Customer</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Code</p>
                  <p className="font-medium text-gray-900 dark:text-white">{customer.customer_code}</p>
                </div>
                {customer.gstin && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">GSTIN</p>
                    <p className="font-medium text-gray-900 dark:text-white">{customer.gstin}</p>
                  </div>
                )}
                {customer.project_area && (
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Project</p>
                    <p className="font-medium text-gray-900 dark:text-white">{customer.project_area}</p>
                  </div>
                )}
              </div>
              {customer.billing_address_line1 && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-1 mb-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Billing Address</p>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {[customer.billing_address_line1, customer.billing_address_line2, customer.billing_city, customer.billing_state, customer.billing_pincode].filter(Boolean).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Items */}
          {items && items.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Package className="w-4 h-4 text-gray-500" />
                <h3 className="font-medium text-gray-900 dark:text-white">Items ({items.length})</h3>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={item.id || index} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {item.quantity} {item.unit} × ₹{parseFloat(item.unit_price).toFixed(2)} · GST {item.gst_rate}%
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white ml-4">
                      ₹{parseFloat(item.line_total).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice Type Selection */}
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-3">Select Invoice Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                invoiceType === 'proforma'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
                <input
                  type="radio"
                  name="invoiceType"
                  value="proforma"
                  checked={invoiceType === 'proforma'}
                  onChange={() => setInvoiceType('proforma')}
                  className="w-4 h-4 text-blue-600 mr-3"
                />
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Proforma Invoice</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Advance bill · No tax</p>
                    <p className="text-sm font-semibold text-blue-600 mt-1">₹{remainingProforma.toLocaleString()}</p>
                  </div>
                </div>
              </label>

              <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                invoiceType === 'tax'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
                <input
                  type="radio"
                  name="invoiceType"
                  value="tax"
                  checked={invoiceType === 'tax'}
                  onChange={() => setInvoiceType('tax')}
                  className="w-4 h-4 text-green-600 mr-3"
                />
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Tax Invoice</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Final bill · GST included</p>
                    <p className="text-sm font-semibold text-green-600 mt-1">₹{remainingInvoice.toLocaleString()}</p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={!invoiceType || loading}
            className="flex items-center space-x-2 px-6 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            <span>{loading ? 'Opening...' : `Create ${invoiceType === 'proforma' ? 'Proforma' : invoiceType === 'tax' ? 'Tax Invoice' : 'Invoice'}`}</span>
            {!loading && <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}

export default RaiseInvoiceModal
