import React, { useState } from 'react'
import { X, FileText, User, MapPin, Calculator, Package } from 'lucide-react'

import toast from 'react-hot-toast'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

interface SimpleProformaFormProps {
  purchaseOrder?: any
  quotation?: any
  invoiceData: any
  editingInvoice?: any
  onClose: () => void
  onSuccess: () => void
}

const SimpleProformaForm: React.FC<SimpleProformaFormProps> = ({
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
    proforma_date: editingInvoice?.proforma_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    due_date: editingInvoice?.due_date?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: editingInvoice?.reference || '',
    notes: editingInvoice?.notes || 'Advance payment request',
    terms_and_conditions: editingInvoice?.terms_and_conditions || 'Payment terms: Net 30 days. Late payments may incur additional charges.'
  })

  // Calculate amounts
  const baseAmount = parseFloat(sourceData.subtotal || '0')

  
  const calculateProformaAmount = () => {
    if (invoiceData.claim_type === 'quantity') {
      // Calculate based on selected items and quantities
      return Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
        const items = isFromQuotation ? sourceData.quotation_items : sourceData.po_items
        const item = items?.find((item: any) => item.id === parseInt(itemId))
        if (item && quantity > 0) {
          return total + (parseFloat(item.unit_price) * quantity)
        }
        return total
      }, 0)
    } else {
      // Percentage-based calculation - sum of individual item percentages
      return Object.entries(itemPercentages).reduce((total, [itemId, percentage]) => {
        const items = isFromQuotation ? sourceData.quotation_items : sourceData.po_items
        const item = items?.find((item: any) => item.id === parseInt(itemId))
        if (item && percentage > 0) {
          const itemTotal = parseFloat(item.unit_price) * item.quantity
          return total + (itemTotal * percentage) / 100
        }
        return total
      }, 0)
    }
  }
  
  const proformaAmount = calculateProformaAmount()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) {
      console.log('Form already submitting, preventing double submission')
      return // Prevent double submission
    }
    
    // Disable form immediately to prevent double clicks
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement
    if (submitButton) {
      submitButton.disabled = true
    }
    
    setLoading(true)
    console.log('Starting proforma creation...')

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
        const availablePercentage = parseFloat(sourceData.available_proforma_percentage || '100')
        if (maxPercentage > availablePercentage) {
          toast.error(`Maximum percentage (${maxPercentage.toFixed(1)}%) exceeds available proforma percentage (${availablePercentage.toFixed(1)}%)`)
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

      // Calculate proforma items based on selection
      const proformaItems: any[] = []
      
      if (invoiceData.claim_type === 'percentage') {
        // For percentage-based, create items with calculated amounts
        Object.entries(itemPercentages).forEach(([itemId, percentage]) => {
          if (percentage > 0) {
            const items = isFromQuotation ? sourceData.quotation_items : sourceData.po_items
            const item = items?.find((item: any) => item.id === parseInt(itemId))
            if (item) {
              const itemTotal = parseFloat(item.unit_price) * item.quantity
              const claimedAmount = (itemTotal * percentage) / 100
              proformaItems.push({
                product: item.product,
                product_name: item.product_name,
                quantity: (item.quantity * percentage) / 100, // Proportional quantity
                unit: item.unit,
                unit_price: parseFloat(item.unit_price),
                line_total: claimedAmount,
                percentage_claimed: percentage
              })
            }
          }
        })
      } else {
        // For quantity-based, create items with selected quantities
        Object.entries(selectedItems).forEach(([itemId, quantity]) => {
          if (quantity > 0) {
            const items = isFromQuotation ? sourceData.quotation_items : sourceData.po_items
            const item = items?.find((item: any) => item.id === parseInt(itemId))
            if (item) {
              proformaItems.push({
                product: item.product,
                product_name: item.product_name,
                quantity: quantity,
                unit: item.unit,
                unit_price: parseFloat(item.unit_price),
                line_total: parseFloat(item.unit_price) * quantity
              })
            }
          }
        })
      }

      const dataToSend = {
        customer: sourceData.customer_details.id || sourceData.customer,
        ...(purchaseOrder && { purchase_order: purchaseOrder.id }),
        ...(quotation && { quotation: quotation.id }),
        claim_type: invoiceData.claim_type,
        claim_percentage: invoiceData.claim_percentage,
        selected_items: invoiceData.claim_type === 'quantity' ? selectedItems : undefined,
        item_percentages: invoiceData.claim_type === 'percentage' ? itemPercentages : undefined,
        proforma_items: proformaItems,
        proforma_amount: proformaAmount,
        proforma_date: formData.proforma_date,
        ...(formData.due_date && { due_date: formData.due_date }),
        reference: formData.reference,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        is_advance_bill: true,
        status: 'draft'
      }

      // Use the specific quotation-based endpoint
      const url = editingInvoice ? `/api/finance/proforma-invoices/${editingInvoice.id}/` : '/api/finance/proforma-invoices/'
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
        throw new Error(errorData.error || 'Failed to create proforma invoice')
      }
      
      await response.json()
      
      toast.success(editingInvoice ? 'Proforma Invoice updated successfully!' : 'Proforma Invoice created successfully!')
      onSuccess()
    } catch (error: any) {
      console.error('Error creating proforma:', error)
      toast.error('Failed to create proforma invoice')
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
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Proforma Invoice
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Advance Payment Request (No Tax)
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
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">{isFromQuotation ? 'Quotation' : 'Purchase Order'}</h3>
              <p className="text-blue-700 dark:text-blue-300">{isFromQuotation ? sourceData.quotation_number : sourceData.internal_po_number}</p>
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
                            Available: {item.quantity} {item.unit} @ ₹{parseFloat(item.unit_price).toFixed(2)}
                            {invoiceData.claim_type === 'percentage' && (
                              <>
                                <span className="ml-2">Total: ₹{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
                                <span className="ml-2 text-blue-600 font-medium">
                                  Available: {parseFloat(sourceData.available_proforma_percentage || '100').toFixed(1)}%
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
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              placeholder="0"
                            />
                          ) : (
                            <div className="flex items-center">
                              <input
                                type="number"
                                min="0"
                                max={parseFloat(sourceData.available_proforma_percentage || '100')}
                                step="0.01"
                                value={itemPercentages[item.id] || 0}
                                onChange={(e) => {
                                  const maxAvailable = parseFloat(sourceData.available_proforma_percentage || '100')
                                  const value = Math.min(parseFloat(e.target.value) || 0, maxAvailable)
                                  setItemPercentages(prev => ({ ...prev, [item.id]: value }))
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="0"
                              />
                              <span className="ml-1 text-xs text-gray-500">%</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {(invoiceData.claim_type === 'quantity' ? selectedItems[item.id] > 0 : itemPercentages[item.id] > 0) && (
                        <div className="text-sm text-green-600 dark:text-green-400">
                          Amount: ₹{
                            invoiceData.claim_type === 'quantity' 
                              ? (parseFloat(item.unit_price) * (selectedItems[item.id] || 0)).toFixed(2)
                              : ((parseFloat(item.unit_price) * item.quantity * (itemPercentages[item.id] || 0)) / 100).toFixed(2)
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Balance Status */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">{isFromQuotation ? 'Quotation' : 'PO'} Balance Status</h3>
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
                    className="h-2 rounded-full transition-all duration-300 bg-blue-500"
                    style={{ width: `${Math.max(0, Math.min(100, ((parseFloat(sourceData.proforma_claimed_amount || '0') + parseFloat(sourceData.invoice_claimed_amount || '0')) / parseFloat(sourceData.total_amount || '1')) * 100))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Available Percentage Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                📊 Available for Proforma Invoice
              </h3>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p><strong>{parseFloat(sourceData.available_proforma_percentage || '100').toFixed(1)}%</strong> of base amount is available for proforma claiming</p>
                {parseFloat(sourceData.available_proforma_percentage || '100') < 100 && (
                  <p className="text-xs mt-1 text-blue-600 dark:text-blue-300">
                    ⚠️ Reduced due to existing tax invoices
                  </p>
                )}
              </div>
            </div>

            {/* Billing Calculation */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-3 flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Current Claim Calculation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{isFromQuotation ? 'Quotation' : 'PO'} Base Amount:</span>
                  <span className="font-medium">₹{baseAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{invoiceData.claim_type === 'percentage' ? 'Item-wise Percentages:' : 'Selected Items:'}:</span>
                  <span className="font-medium text-blue-600">₹{proformaAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Proforma Amount (No Tax):</span>
                  <span className="font-bold text-green-600">₹{proformaAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                  <span>Claiming from {isFromQuotation ? 'Quotation' : 'PO'}:</span>
                  <span>{((proformaAmount / parseFloat(sourceData.subtotal || '1')) * 100).toFixed(1)}% of base amount</span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proforma Date
                </label>
                <input
                  type="date"
                  value={formData.proforma_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, proforma_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              disabled={loading || (!editingInvoice && proformaAmount <= 0)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (editingInvoice ? 'Updating...' : 'Creating...') : (editingInvoice ? 'Update Proforma Invoice' : 'Create Proforma Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SimpleProformaForm