import React, { useState } from 'react'
import { X, CreditCard, User, MapPin, Calculator, Package } from 'lucide-react'

import toast from 'react-hot-toast'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

interface SimpleTaxInvoiceFormProps {
  purchaseOrder?: any
  quotation?: any
  invoiceData: any
  editingInvoice?: any
  onClose: () => void
  onSuccess: () => void
}

const SimpleTaxInvoiceForm: React.FC<SimpleTaxInvoiceFormProps> = ({
  purchaseOrder,
  quotation,
  invoiceData,
  editingInvoice,
  onClose,
  onSuccess
}) => {
  // Use either PO or Quotation data
  const sourceData = purchaseOrder || quotation
  const isFromQuotation = !!quotation
  
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})
  const [itemPercentages, setItemPercentages] = useState<Record<number, number>>(
    editingInvoice ? { [sourceData.quotation_items?.[0]?.id || 1]: 100 } : {}
  )
  const [formData, setFormData] = useState({
    invoice_date: editingInvoice?.invoice_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    due_date: editingInvoice?.due_date?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: editingInvoice?.reference || '',
    notes: editingInvoice?.notes || 'Tax invoice for GST filing',
    terms_and_conditions: editingInvoice?.terms_and_conditions || 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.'
  })

  // Calculate amounts
  const baseAmount = parseFloat(sourceData.subtotal || '0')
  const totalAmount = parseFloat(sourceData.total_amount || '0')
  const taxAmount = totalAmount - baseAmount

  
  const calculateInvoiceAmounts = () => {
    if (invoiceData.claim_type === 'quantity') {
      // Calculate based on selected items and quantities
      const selectedBaseAmount = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
        const items = isFromQuotation ? sourceData.quotation_items : sourceData.po_items
        const item = items?.find((item: any) => item.id === parseInt(itemId))
        if (item && quantity > 0) {
          return total + (parseFloat(item.unit_price) * quantity)
        }
        return total
      }, 0)
      
      const selectedTaxAmount = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
        const items = isFromQuotation ? sourceData.quotation_items : sourceData.po_items
        const item = items?.find((item: any) => item.id === parseInt(itemId))
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
        const items = isFromQuotation ? sourceData.quotation_items : sourceData.po_items
        const item = items?.find((item: any) => item.id === parseInt(itemId))
        if (item && percentage > 0) {
          const itemTotal = parseFloat(item.unit_price) * item.quantity
          return total + (itemTotal * percentage) / 100
        }
        return total
      }, 0)
      
      const selectedTaxAmount = Object.entries(itemPercentages).reduce((total, [itemId, percentage]) => {
        const items = isFromQuotation ? sourceData.quotation_items : sourceData.po_items
        const item = items?.find((item: any) => item.id === parseInt(itemId))
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
      console.log('⚠️ Form already submitting, preventing double submission')
      return // Prevent double submission
    }
    
    setLoading(true)
    console.log('🚀 Starting tax invoice creation...')

    try {
      // Validate that at least some items are selected
      if (invoiceData.claim_type === 'percentage') {
        const hasPercentages = Object.values(itemPercentages).some(p => p > 0)
        if (!hasPercentages) {
          toast.error('Please select at least one product with a percentage greater than 0')
          setLoading(false)
          return
        }
        
        // Validate that percentages don't exceed available amount
        const maxPercentage = Math.max(...Object.values(itemPercentages))
        const availablePercentage = parseFloat(sourceData.available_invoice_percentage || '100')
        if (maxPercentage > availablePercentage) {
          toast.error(`Maximum percentage (${maxPercentage.toFixed(1)}%) exceeds available tax invoice percentage (${availablePercentage.toFixed(1)}%)`)
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
        customer: sourceData.customer_details.id || sourceData.customer,
        ...(purchaseOrder && { purchase_order: purchaseOrder.id }),
        ...(quotation && { quotation: quotation.id }),
        claim_type: invoiceData.claim_type,
        claim_percentage: invoiceData.claim_percentage,
        selected_items: invoiceData.claim_type === 'quantity' ? selectedItems : undefined,
        item_percentages: invoiceData.claim_type === 'percentage' ? itemPercentages : undefined,
        invoice_date: formData.invoice_date,
        ...(formData.due_date && { due_date: formData.due_date }),
        reference: formData.reference,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        invoice_type: 'tax_invoice',
        status: 'draft'
      }

      // Use the specific quotation-based endpoint
      const url = editingInvoice ? `/api/finance/invoices/${editingInvoice.id}/` : '/api/finance/invoices/'
      const method = editingInvoice ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionKey}`
        },
        body: JSON.stringify({ ...dataToSend, session_key: sessionKey })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create tax invoice')
      }
      
      await response.json()
      
      toast.success(editingInvoice ? 'Tax Invoice updated successfully!' : 'Tax Invoice created successfully!')
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
            
            {/* Source Reference */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">{isFromQuotation ? 'Quotation' : 'Purchase Order'}</h3>
              <p className="text-green-700 dark:text-green-300">{isFromQuotation ? sourceData.quotation_number : sourceData.internal_po_number}</p>
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
                  <p className="font-medium">{sourceData.customer_details.name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Code:</span>
                  <p className="font-medium">{sourceData.customer_details.customer_code}</p>
                </div>
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium">{sourceData.customer_details.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium">{sourceData.customer_details.phone}</p>
                </div>
                <div>
                  <span className="text-gray-500">GSTIN:</span>
                  <p className="font-medium">{sourceData.customer_details.gstin || 'N/A'}</p>
                </div>
                {sourceData.customer_details.project_area && (
                  <div>
                    <span className="text-gray-500">Project:</span>
                    <p className="font-medium">{sourceData.customer_details.project_area}</p>
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
                  <p>{sourceData.customer_details.billing_address_line1}</p>
                  {sourceData.customer_details.billing_address_line2 && (
                    <p>{sourceData.customer_details.billing_address_line2}</p>
                  )}
                  <p>{sourceData.customer_details.billing_city}, {sourceData.customer_details.billing_state} {sourceData.customer_details.billing_pincode}</p>
                  <p>{sourceData.customer_details.billing_country}</p>
                </div>
              </div>
              
              {/* Shipping Address */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Shipping Address
                </h3>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {sourceData.shipping_address_details ? (
                    <>
                      <p>{sourceData.shipping_address_details.address_line1}</p>
                      {sourceData.shipping_address_details.address_line2 && (
                        <p>{sourceData.shipping_address_details.address_line2}</p>
                      )}
                      <p>{sourceData.shipping_address_details.city}, {sourceData.shipping_address_details.state} {sourceData.shipping_address_details.pincode}</p>
                      <p>{sourceData.shipping_address_details.country}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">Same as billing address</p>
                  )}
                </div>
              </div>
            </div>

            {/* Item Selection */}
            {(sourceData.po_items || sourceData.quotation_items) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  {invoiceData.claim_type === 'quantity' ? 'Select Items & Quantities' : 'Select Items & Percentages'}
                </h3>
                <div className="space-y-3">
                  {(isFromQuotation ? sourceData.quotation_items : sourceData.po_items).map((item: any) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                          <p className="text-sm text-gray-500">
                            Available: {item.quantity} {item.unit} @ ₹{parseFloat(item.unit_price).toFixed(2)} (GST: {item.gst_rate}%)
                            {invoiceData.claim_type === 'percentage' && (
                              <>
                                <span className="ml-2">Total: ₹{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
                                <span className="ml-2 text-green-600 font-medium">
                                  Available: {parseFloat(sourceData.available_invoice_percentage || '100').toFixed(1)}%
                                </span>
                              </>
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
                                max={parseFloat(sourceData.available_invoice_percentage || '100')}
                                step="0.01"
                                value={itemPercentages[item.id] || 0}
                                onChange={(e) => {
                                  const maxAvailable = parseFloat(sourceData.available_invoice_percentage || '100')
                                  const value = Math.min(parseFloat(e.target.value) || 0, maxAvailable)
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
              <h3 className="font-medium text-orange-900 dark:text-orange-100 mb-3">{isFromQuotation ? 'Quotation' : 'PO'} Balance Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total {isFromQuotation ? 'Quotation' : 'PO'} Amount:</span>
                  <span className="font-medium">₹{parseFloat(sourceData.total_amount || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Proforma Available:</span>
                  <span className="font-medium">₹{parseFloat(sourceData.remaining_proforma_balance || sourceData.subtotal || '0').toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Invoice Available:</span>
                  <span className="font-medium">₹{parseFloat(sourceData.remaining_invoice_balance || sourceData.total_amount || '0').toLocaleString()}</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-300 bg-orange-500"
                    style={{ width: `${Math.max(0, Math.min(100, ((parseFloat(sourceData.proforma_claimed_amount || '0') + parseFloat(sourceData.invoice_claimed_amount || '0')) / parseFloat(sourceData.total_amount || '1')) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Available Percentage Info */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
                📊 Available for Tax Invoice
              </h3>
              <div className="text-sm text-green-800 dark:text-green-200">
                <p><strong>{parseFloat(sourceData.available_invoice_percentage || '100').toFixed(1)}%</strong> of total amount is available for tax invoicing</p>
                {parseFloat(sourceData.available_invoice_percentage || '100') < 100 && (
                  <p className="text-xs mt-1 text-green-600 dark:text-green-300">
                    ⚠️ Reduced due to existing tax invoices
                  </p>
                )}
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
                  <span>{isFromQuotation ? 'Quotation' : 'PO'} Total Amount:</span>
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
                    <span>{((invoiceTotalAmount / parseFloat(sourceData.total_amount || '1')) * 100).toFixed(1)}% of total</span>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Terms and Conditions
              </label>
              <textarea
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter terms and conditions"
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
              disabled={loading || (!editingInvoice && invoiceTotalAmount <= 0)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (editingInvoice ? '⏳ Updating...' : '⏳ Creating...') : (editingInvoice ? 'Update Tax Invoice' : 'Create Tax Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SimpleTaxInvoiceForm