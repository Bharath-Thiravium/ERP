import React, { useState } from 'react'
import { X, CreditCard, User, MapPin, Calculator, Package } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

interface SimpleTaxInvoiceFormProps {
  purchaseOrder: any
  invoiceData: any
  onClose: () => void
  onSuccess: () => void
}

const SimpleTaxInvoiceForm: React.FC<SimpleTaxInvoiceFormProps> = ({
  purchaseOrder,
  invoiceData,
  onClose,
  onSuccess
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})
  const [itemPercentages, setItemPercentages] = useState<Record<number, number>>({})
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: '',
    notes: 'Tax invoice for GST filing'
  })

  // Calculate amounts
  const baseAmount = parseFloat(purchaseOrder.subtotal || '0')
  const totalAmount = parseFloat(purchaseOrder.total_amount || '0')
  const taxAmount = totalAmount - baseAmount

  
  const calculateInvoiceAmounts = () => {
    if (invoiceData.claim_type === 'quantity') {
      // Calculate based on selected items and quantities
      const selectedBaseAmount = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
        const item = purchaseOrder.po_items?.find((item: any) => item.id === parseInt(itemId))
        if (item && quantity > 0) {
          return total + (parseFloat(item.unit_price) * quantity)
        }
        return total
      }, 0)
      
      const selectedTaxAmount = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
        const item = purchaseOrder.po_items?.find((item: any) => item.id === parseInt(itemId))
        if (item && quantity > 0) {
          const itemBaseAmount = parseFloat(item.unit_price) * quantity
          return total + (itemBaseAmount * parseFloat(item.gst_rate) / 100)
        }
        return total
      }, 0)
      
      return {
        invoiceBaseAmount: selectedBaseAmount,
        invoiceTaxAmount: selectedTaxAmount,
        invoiceTotalAmount: selectedBaseAmount + selectedTaxAmount
      }
    } else {
      // Percentage-based calculation - sum of individual item percentages
      const selectedBaseAmount = Object.entries(itemPercentages).reduce((total, [itemId, percentage]) => {
        const item = purchaseOrder.po_items?.find((item: any) => item.id === parseInt(itemId))
        if (item && percentage > 0) {
          const itemTotal = parseFloat(item.unit_price) * item.quantity
          return total + (itemTotal * percentage) / 100
        }
        return total
      }, 0)
      
      const selectedTaxAmount = Object.entries(itemPercentages).reduce((total, [itemId, percentage]) => {
        const item = purchaseOrder.po_items?.find((item: any) => item.id === parseInt(itemId))
        if (item && percentage > 0) {
          const itemTotal = parseFloat(item.unit_price) * item.quantity
          const itemBaseAmount = (itemTotal * percentage) / 100
          return total + (itemBaseAmount * parseFloat(item.gst_rate) / 100)
        }
        return total
      }, 0)
      
      return {
        invoiceBaseAmount: selectedBaseAmount,
        invoiceTaxAmount: selectedTaxAmount,
        invoiceTotalAmount: selectedBaseAmount + selectedTaxAmount
      }
    }
  }
  
  const { invoiceBaseAmount, invoiceTaxAmount, invoiceTotalAmount } = calculateInvoiceAmounts()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) {
      return // Prevent double submission
    }
    
    setLoading(true)

    try {
      // Validate that at least some items are selected
      if (invoiceData.claim_type === 'percentage') {
        const hasPercentages = Object.values(itemPercentages).some(p => p > 0)
        if (!hasPercentages) {
          toast.error('Please select at least one product with a percentage greater than 0')
          setLoading(false)
          return
        }
      } else if (invoiceData.claim_type === 'quantity') {
        const hasQuantities = Object.values(selectedItems).some(q => q > 0)
        if (!hasQuantities) {
          toast.error('Please select at least one product with a quantity greater than 0')
          setLoading(false)
          return
        }
      }

      const dataToSend = {
        purchase_order: purchaseOrder.id,
        claim_type: invoiceData.claim_type,
        claim_percentage: invoiceData.claim_percentage,
        selected_items: invoiceData.claim_type === 'quantity' ? selectedItems : undefined,
        item_percentages: invoiceData.claim_type === 'percentage' ? itemPercentages : undefined,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        reference: formData.reference,
        notes: formData.notes,
        invoice_type: 'tax_invoice',
        status: 'draft'
      }

      await apiClient.createFinanceInvoice({ ...dataToSend, session_key: sessionKey })
      
      toast.success('Tax Invoice created successfully!')
      onSuccess()
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      console.log('Data sent:', JSON.stringify(invoiceData))
      toast.error('Failed to create tax invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Tax Invoice
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                GST Invoice for Customer Filing
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[calc(90vh-80px)]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* PO Reference */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Purchase Order</h3>
              <p className="text-green-700 dark:text-green-300">{purchaseOrder.internal_po_number}</p>
            </div>

            {/* Customer Details - Read Only */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Customer Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="font-medium">{purchaseOrder.customer_details.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Code:</span>
                  <p className="font-medium">{purchaseOrder.customer_details.customer_code}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium">{purchaseOrder.customer_details.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium">{purchaseOrder.customer_details.phone}</p>
                </div>
                <div>
                  <span className="text-gray-500">GSTIN:</span>
                  <p className="font-medium">{purchaseOrder.customer_details.gstin || 'N/A'}</p>
                </div>
                {purchaseOrder.customer_details.project_area && (
                  <div>
                    <span className="text-gray-500">Project:</span>
                    <p className="font-medium">{purchaseOrder.customer_details.project_area}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Billing Address */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Billing Address
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <p>{purchaseOrder.customer_details.billing_address_line1}</p>
                  {purchaseOrder.customer_details.billing_address_line2 && (
                    <p>{purchaseOrder.customer_details.billing_address_line2}</p>
                  )}
                  <p>{purchaseOrder.customer_details.billing_city}, {purchaseOrder.customer_details.billing_state} {purchaseOrder.customer_details.billing_pincode}</p>
                  <p>{purchaseOrder.customer_details.billing_country}</p>
                </div>
              </div>
              
              {/* Shipping Address */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Shipping Address
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {purchaseOrder.shipping_address_details ? (
                    <>
                      <p>{purchaseOrder.shipping_address_details.address_line1}</p>
                      {purchaseOrder.shipping_address_details.address_line2 && (
                        <p>{purchaseOrder.shipping_address_details.address_line2}</p>
                      )}
                      <p>{purchaseOrder.shipping_address_details.city}, {purchaseOrder.shipping_address_details.state} {purchaseOrder.shipping_address_details.pincode}</p>
                      <p>{purchaseOrder.shipping_address_details.country}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Same as billing address</p>
                  )}
                </div>
              </div>
            </div>

            {/* Item Selection */}
            {purchaseOrder.po_items && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  {invoiceData.claim_type === 'quantity' ? 'Select Items & Quantities' : 'Select Items & Percentages'}
                </h3>
                <div className="space-y-3">
                  {purchaseOrder.po_items.map((item: any) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                          <p className="text-sm text-gray-500">
                            Available: {item.quantity} {item.unit} @ ₹{parseFloat(item.unit_price).toFixed(2)} (GST: {item.gst_rate}%)
                            {invoiceData.claim_type === 'percentage' && (
                              <span className="ml-2">Total: ₹{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
                            )}
                          </p>
                        </div>
                        <div className="w-24">
                          {invoiceData.claim_type === 'quantity' ? (
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              step="0.01"
                              value={selectedItems[item.id] || 0}
                              onChange={(e) => {
                                const value = Math.min(parseFloat(e.target.value) || 0, item.quantity)
                                setSelectedItems(prev => ({ ...prev, [item.id]: value }))
                              }}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="0"
                            />
                          ) : (
                            <div className="flex items-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={itemPercentages[item.id] || 0}
                                onChange={(e) => {
                                  const value = Math.min(parseFloat(e.target.value) || 0, 100)
                                  setItemPercentages(prev => ({ ...prev, [item.id]: value }))
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="0"
                              />
                              <span className="ml-1 text-xs text-gray-500">%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {(invoiceData.claim_type === 'quantity' ? selectedItems[item.id] > 0 : itemPercentages[item.id] > 0) && (
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between text-gray-600">
                            <span>Base Amount:</span>
                            <span>₹{
                              invoiceData.claim_type === 'quantity' 
                                ? (parseFloat(item.unit_price) * (selectedItems[item.id] || 0)).toFixed(2)
                                : ((parseFloat(item.unit_price) * item.quantity * (itemPercentages[item.id] || 0)) / 100).toFixed(2)
                            }</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Tax ({item.gst_rate}%):</span>
                            <span>₹{
                              invoiceData.claim_type === 'quantity' 
                                ? ((parseFloat(item.unit_price) * (selectedItems[item.id] || 0)) * parseFloat(item.gst_rate) / 100).toFixed(2)
                                : (((parseFloat(item.unit_price) * item.quantity * (itemPercentages[item.id] || 0)) / 100) * parseFloat(item.gst_rate) / 100).toFixed(2)
                            }</span>
                          </div>
                          <div className="flex justify-between text-green-600 dark:text-green-400 font-medium border-t pt-1">
                            <span>Total:</span>
                            <span>₹{
                              invoiceData.claim_type === 'quantity' 
                                ? ((parseFloat(item.unit_price) * (selectedItems[item.id] || 0)) * (1 + parseFloat(item.gst_rate) / 100)).toFixed(2)
                                : (((parseFloat(item.unit_price) * item.quantity * (itemPercentages[item.id] || 0)) / 100) * (1 + parseFloat(item.gst_rate) / 100)).toFixed(2)
                            }</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Balance Status */}
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-3">PO Balance Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total PO Amount:</span>
                  <span className="font-medium">₹{parseFloat(purchaseOrder.total_amount || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Proforma Available:</span>
                  <span className="font-medium">₹{parseFloat(purchaseOrder.subtotal || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Invoice Available:</span>
                  <span className="font-medium">₹{parseFloat(purchaseOrder.total_amount || '0').toLocaleString()}</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-blue-500"
                    style={{ width: '10%' }}
                  ></div>
                </div>
              </div>
              

            </div>

            {/* Billing Calculation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Current Claim Calculation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>PO Total Amount:</span>
                  <span className="font-medium">₹{(baseAmount + taxAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{invoiceData.claim_type === 'percentage' ? 'Item-wise Percentages:' : 'Selected Items:'}:</span>
                  <span className="font-medium text-green-600">₹{invoiceTotalAmount.toLocaleString()}</span>
                </div>
                <div className="border-t pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span>Invoice Base:</span>
                    <span className="font-medium">₹{invoiceBaseAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Invoice Tax:</span>
                    <span className="font-medium">₹{invoiceTaxAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-medium">Total Invoice Amount:</span>
                    <span className="font-bold text-blue-600">₹{invoiceTotalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>After this claim:</span>
                    <span>{((invoiceTotalAmount / parseFloat(purchaseOrder.total_amount || '1')) * 100).toFixed(1)}% of total</span>
                  </div>
                </div>
              </div>
              
              {/* Important Note about Invoice Priority */}
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200 text-xs">
                  📝 <strong>Note:</strong> Tax invoices are the main accountable bills. Creating this invoice will reduce the available proforma balance accordingly.
                </p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invoice Date
                </label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter reference"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter notes"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Tax Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SimpleTaxInvoiceForm