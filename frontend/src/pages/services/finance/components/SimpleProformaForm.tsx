import React, { useState, useEffect } from 'react'
import { X, FileText, User, MapPin, Package, ChevronDown } from 'lucide-react'

import toast from 'react-hot-toast'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import { handlePostInvoiceStatusUpdate } from '../utils/poStatusUtils'

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
  editingInvoice,
  onClose,
  onSuccess
}) => {
  // Use either PO or Quotation data
  const sourceData = purchaseOrder || quotation
  const isFromQuotation = !!quotation
  
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [availableShippingAddresses, setAvailableShippingAddresses] = useState<any[]>([])
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<number | null>(null)
  const [effectiveShippingAddress, setEffectiveShippingAddress] = useState<any>(null)
  const [formData, setFormData] = useState({
    proforma_number: editingInvoice?.proforma_number || '',
    proforma_date: editingInvoice?.proforma_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    due_date: editingInvoice?.due_date?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: editingInvoice?.reference || '',
    notes: editingInvoice?.notes || 'Advance payment request',
    terms_and_conditions: editingInvoice?.terms_and_conditions || 'Payment terms: Net 30 days. Late payments may incur additional charges.',
    shipping_address: editingInvoice?.shipping_address || null
  })

  // Fetch available shipping addresses and effective shipping address
  useEffect(() => {
    const fetchShippingAddresses = async () => {
      if (!sessionKey || !sourceData?.customer_details?.id) return
      
      try {
        // Fetch customer shipping addresses
        const response = await api.get(`/api/finance/customers/${sourceData.customer_details.id}/`, {
          params: { session_key: sessionKey }
        })
        
        const customer = response.data
        const addresses = []
        
        // Add billing address as option
        addresses.push({
          id: null,
          type: 'billing',
          label: 'Same as Billing Address',
          address: `${customer.billing_address_line1}, ${customer.billing_city}, ${customer.billing_state} ${customer.billing_pincode}`,
          is_default: true
        })
        
        // Add customer shipping addresses
        if (customer.shipping_addresses) {
          customer.shipping_addresses.forEach((addr: any) => {
            addresses.push({
              id: addr.id,
              type: 'shipping',
              label: addr.label || 'Shipping Address',
              address: addr.full_address,
              is_default: addr.is_default
            })
          })
        }
        
        setAvailableShippingAddresses(addresses)
        
        // Set effective shipping address from editing invoice or source data
        if (editingInvoice?.effective_shipping_address) {
          setEffectiveShippingAddress(editingInvoice.effective_shipping_address)
        } else if (sourceData?.effective_shipping_address) {
          setEffectiveShippingAddress(sourceData.effective_shipping_address)
        }
        
      } catch (error) {
        console.error('Error fetching shipping addresses:', error)
      }
    }
    
    fetchShippingAddresses()
  }, [sessionKey, sourceData?.customer_details?.id, editingInvoice])

  // Calculate amounts
  const baseAmount = parseFloat(sourceData.subtotal || '0')

  
  const calculateProformaAmount = () => {
    // Always use full quotation/PO amount for proforma (no tax)
    return baseAmount
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
      // Create proforma items from all source items
      const proformaItems: any[] = (isFromQuotation ? sourceData.quotation_items : sourceData.po_items).map((item: any) => ({
        product: item.product,
        product_name: item.product_name,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: parseFloat(item.unit_price),
        line_total: parseFloat(item.unit_price) * item.quantity
      }))

      const dataToSend = {
        proforma_number: formData.proforma_number,
        customer: sourceData.customer_details.id || sourceData.customer,
        ...(purchaseOrder && { purchase_order: purchaseOrder.id }),
        ...(quotation && { quotation: quotation.id }),
        proforma_items: proformaItems,
        proforma_amount: proformaAmount,
        proforma_date: formData.proforma_date,
        ...(formData.due_date && { due_date: formData.due_date }),
        reference: formData.reference,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        shipping_address: selectedShippingAddress,
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
      
      // Auto-update PO status if this is from a PO
      if (purchaseOrder?.id && sessionKey) {
        console.log('🔄 Updating PO status after proforma creation...')
        await handlePostInvoiceStatusUpdate(purchaseOrder.id, sessionKey)
      }
      
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
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    Shipping Address
                  </h3>
                  {effectiveShippingAddress?.source && (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                      {effectiveShippingAddress.source}
                    </span>
                  )}
                </div>
                
                {/* Current Effective Address Display */}
                {effectiveShippingAddress && (
                  <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border">
                    <div className="text-sm">
                      <div className="font-medium text-blue-800 dark:text-blue-300 mb-1">
                        Current: {effectiveShippingAddress.label}
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        {effectiveShippingAddress.address}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Source: {effectiveShippingAddress.source}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Shipping Address Selection */}
                {availableShippingAddresses.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Override Shipping Address (Optional)
                    </label>
                    <div className="relative">
                      <select
                        value={selectedShippingAddress || ''}
                        onChange={(e) => setSelectedShippingAddress(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                      >
                        <option value="">Use default from {effectiveShippingAddress?.source || 'source'}</option>
                        {availableShippingAddresses.map((addr) => (
                          <option key={addr.id || 'billing'} value={addr.id || ''}>
                            {addr.label} - {addr.address.substring(0, 50)}...
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Leave as default to use address from {effectiveShippingAddress?.source || 'source document'}
                    </p>
                  </div>
                )}
                
                {/* Fallback display */}
                {!effectiveShippingAddress && (
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
                )}
              </div>
            </div>

            {/* Item Selection - Simplified */}
            {(sourceData.po_items || sourceData.quotation_items) && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Items (Without Tax)
                </h3>
                <div className="space-y-2">
                  {(isFromQuotation ? sourceData.quotation_items : sourceData.po_items).map((item: any) => (
                    <div key={item.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{item.product_name}</p>
                        <p className="text-sm text-gray-500">{item.quantity} {item.unit} × ₹{parseFloat(item.unit_price).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">₹{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900 dark:text-white">Total Amount (No Tax):</span>
                    <span className="text-xl font-bold text-blue-600 dark:text-blue-400">₹{baseAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Proforma Invoice Number *
              </label>
              <input
                type="text"
                value={formData.proforma_number}
                onChange={(e) => setFormData(prev => ({ ...prev, proforma_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Leave empty for auto-generation"
              />
            </div>

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