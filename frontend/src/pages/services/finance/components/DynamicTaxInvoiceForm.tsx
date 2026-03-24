import React, { useState, useEffect } from 'react'
import { X, CreditCard, Calculator, Package, Hash, Percent } from 'lucide-react'

import toast from 'react-hot-toast'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'

interface DynamicTaxInvoiceFormProps {
  purchaseOrder?: any
  quotation?: any
  editingInvoice?: any
  onClose: () => void
  onSuccess: () => void
}

const DynamicTaxInvoiceForm: React.FC<DynamicTaxInvoiceFormProps> = ({
  purchaseOrder,
  quotation,
  editingInvoice,
  onClose,
  onSuccess
}) => {
  const sourceData = purchaseOrder || quotation
  const isFromQuotation = !!quotation
  
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})
  const [itemPercentages, setItemPercentages] = useState<Record<number, number>>({})
  const [itemClaimMethods, setItemClaimMethods] = useState<Record<number, 'quantity' | 'percentage'>>({})
  const [selectedShippingAddress] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    invoice_number: editingInvoice?.invoice_number || '',
    invoice_date: editingInvoice?.invoice_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    due_date: editingInvoice?.due_date?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: editingInvoice?.reference || '',
    notes: editingInvoice?.notes || 'Tax invoice for GST filing',
    terms_and_conditions: editingInvoice?.terms_and_conditions || 'Payment terms: Net 30 days. GST as applicable. Late payments may incur additional charges.',
    shipping_address: editingInvoice?.shipping_address || null
  })

  // Initialize default claim methods
  useEffect(() => {
    const items = isFromQuotation ? sourceData?.quotation_items : sourceData?.po_items
    if (items && Object.keys(itemClaimMethods).length === 0) {
      const defaultMethods: Record<number, 'quantity' | 'percentage'> = {}
      items.forEach((item: any) => {
        defaultMethods[item.id] = 'quantity' // Default to quantity
      })
      setItemClaimMethods(defaultMethods)
    }
  }, [sourceData, isFromQuotation, itemClaimMethods])

  // Fetch shipping addresses
  useEffect(() => {
    const fetchShippingAddresses = async () => {
      if (!sessionKey || !sourceData?.customer_details?.id) return
      
      try {
        await api.get(`/api/finance/customers/${sourceData.customer_details.id}/`, {
          params: { session_key: sessionKey }
        })
        
        // Use existing shipping address from editing invoice or source data
        
      } catch (error) {
        console.error('Error fetching shipping addresses:', error)
      }
    }
    
    fetchShippingAddresses()
  }, [sessionKey, sourceData?.customer_details?.id, editingInvoice])

  const calculateInvoiceAmounts = () => {
    const items = isFromQuotation ? sourceData?.quotation_items : sourceData?.po_items
    if (!items) return { invoiceBaseAmount: 0, invoiceTaxAmount: 0, invoiceTotalAmount: 0 }

    let selectedBaseAmount = 0
    let selectedTaxAmount = 0

    items.forEach((item: any) => {
      const claimMethod = itemClaimMethods[item.id]
      
      if (claimMethod === 'quantity') {
        const quantity = selectedItems[item.id] || 0
        if (quantity > 0) {
          const itemBaseAmount = parseFloat(item.unit_price) * quantity
          selectedBaseAmount += itemBaseAmount
          selectedTaxAmount += (itemBaseAmount * parseFloat(item.gst_rate) / 100)
        }
      } else if (claimMethod === 'percentage') {
        const percentage = itemPercentages[item.id] || 0
        if (percentage > 0) {
          const itemTotal = parseFloat(item.unit_price) * item.quantity
          const itemBaseAmount = (itemTotal * percentage) / 100
          selectedBaseAmount += itemBaseAmount
          selectedTaxAmount += (itemBaseAmount * parseFloat(item.gst_rate) / 100)
        }
      }
    })

    return {
      invoiceBaseAmount: selectedBaseAmount,
      invoiceTaxAmount: selectedTaxAmount,
      invoiceTotalAmount: selectedBaseAmount + selectedTaxAmount
    }
  }

  const { invoiceBaseAmount, invoiceTaxAmount, invoiceTotalAmount } = calculateInvoiceAmounts()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) return
    setLoading(true)

    try {
      // Validate that at least some items are selected
      const hasSelections = Object.entries(itemClaimMethods).some(([itemId, method]) => {
        if (method === 'quantity') {
          return (selectedItems[parseInt(itemId)] || 0) > 0
        } else {
          return (itemPercentages[parseInt(itemId)] || 0) > 0
        }
      })

      if (!hasSelections) {
        toast.error('Please select at least one item with quantity or percentage greater than 0')
        setLoading(false)
        return
      }

      const dataToSend = {
        customer: sourceData.customer_details.id || sourceData.customer,
        ...(purchaseOrder && { purchase_order: purchaseOrder.id }),
        ...(quotation && { quotation: quotation.id }),
        claim_type: 'hybrid', // Always use hybrid for dynamic claiming
        selected_items: selectedItems,
        item_percentages: itemPercentages,
        item_claim_methods: itemClaimMethods,
        invoice_number: formData.invoice_number || undefined,
        invoice_date: formData.invoice_date,
        ...(formData.due_date && { due_date: formData.due_date }),
        reference: formData.reference,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        shipping_address: selectedShippingAddress,
        invoice_type: 'tax_invoice',
        status: 'draft'
      }

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
                Create Tax Invoice (Dynamic)
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose claim method per item
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

            {/* Item Selection with Dynamic Claim Methods */}
            {(sourceData.po_items || sourceData.quotation_items) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Select Items & Claim Methods
                </h3>
                <div className="space-y-4">
                  {(isFromQuotation ? sourceData.quotation_items : sourceData.po_items).map((item: any) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                          <p className="text-sm text-gray-500">
                            Available: {item.quantity} {item.unit} @ ₹{parseFloat(item.unit_price).toFixed(2)} (GST: {item.gst_rate}%)
                          </p>
                          <p className="text-sm text-gray-600">
                            Total Value: ₹{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Claim Method Selector */}
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Claim Method:
                        </label>
                        <div className="flex space-x-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`claimMethod_${item.id}`}
                              value="quantity"
                              checked={itemClaimMethods[item.id] === 'quantity'}
                              onChange={() => {
                                setItemClaimMethods(prev => ({ ...prev, [item.id]: 'quantity' }))
                                // Clear percentage when switching to quantity
                                setItemPercentages(prev => ({ ...prev, [item.id]: 0 }))
                              }}
                              className="w-4 h-4 text-blue-600 mr-2"
                            />
                            <Hash className="w-4 h-4 mr-1 text-blue-600" />
                            <span className="text-sm">By Quantity</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`claimMethod_${item.id}`}
                              value="percentage"
                              checked={itemClaimMethods[item.id] === 'percentage'}
                              onChange={() => {
                                setItemClaimMethods(prev => ({ ...prev, [item.id]: 'percentage' }))
                                // Clear quantity when switching to percentage
                                setSelectedItems(prev => ({ ...prev, [item.id]: 0 }))
                              }}
                              className="w-4 h-4 text-orange-600 mr-2"
                            />
                            <Percent className="w-4 h-4 mr-1 text-orange-600" />
                            <span className="text-sm">By Percentage</span>
                          </label>
                        </div>
                      </div>

                      {/* Input Field Based on Selected Method */}
                      <div className="flex items-center space-x-3">
                        {itemClaimMethods[item.id] === 'quantity' ? (
                          <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Quantity:
                            </label>
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
                              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500">{item.unit}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Percentage:
                            </label>
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
                              className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500">%</span>
                          </div>
                        )}
                      </div>

                      {/* Calculation Preview */}
                      {((itemClaimMethods[item.id] === 'quantity' && (selectedItems[item.id] || 0) > 0) ||
                        (itemClaimMethods[item.id] === 'percentage' && (itemPercentages[item.id] || 0) > 0)) && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between text-gray-600">
                              <span>Base Amount:</span>
                              <span>₹{
                                itemClaimMethods[item.id] === 'quantity' 
                                  ? (parseFloat(item.unit_price) * (selectedItems[item.id] || 0)).toFixed(2)
                                  : ((parseFloat(item.unit_price) * item.quantity * (itemPercentages[item.id] || 0)) / 100).toFixed(2)
                              }</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                              <span>Tax ({item.gst_rate}%):</span>
                              <span>₹{
                                itemClaimMethods[item.id] === 'quantity' 
                                  ? ((parseFloat(item.unit_price) * (selectedItems[item.id] || 0)) * parseFloat(item.gst_rate) / 100).toFixed(2)
                                  : (((parseFloat(item.unit_price) * item.quantity * (itemPercentages[item.id] || 0)) / 100) * parseFloat(item.gst_rate) / 100).toFixed(2)
                              }</span>
                            </div>
                            <div className="flex justify-between text-green-600 dark:text-green-400 font-medium border-t pt-1">
                              <span>Total:</span>
                              <span>₹{
                                itemClaimMethods[item.id] === 'quantity' 
                                  ? ((parseFloat(item.unit_price) * (selectedItems[item.id] || 0)) * (1 + parseFloat(item.gst_rate) / 100)).toFixed(2)
                                  : (((parseFloat(item.unit_price) * item.quantity * (itemPercentages[item.id] || 0)) / 100) * (1 + parseFloat(item.gst_rate) / 100)).toFixed(2)
                              }</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total Calculation */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Invoice Calculation
              </h3>
              <div className="space-y-2 text-sm">
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
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invoice Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.invoice_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Auto-generated if empty"
                />
              </div>
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
              disabled={loading || invoiceTotalAmount <= 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '⏳ Creating...' : 'Create Tax Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DynamicTaxInvoiceForm