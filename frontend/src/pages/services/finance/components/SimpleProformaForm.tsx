import React, { useState, useEffect } from 'react'
import { X, FileText, User, MapPin, Package, ChevronDown, Hash, Percent } from 'lucide-react'

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
  const isEditing = Boolean(editingInvoice)
  const sourceData = purchaseOrder || quotation || (isEditing ? editingInvoice : null)
  const isFromQuotation = !!quotation
  const customerDetails = sourceData?.customer_details || editingInvoice?.customer_details || {}

  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [availableShippingAddresses, setAvailableShippingAddresses] = useState<any[]>([])
  const getInitialShippingAddress = () => {
    if (!editingInvoice?.shipping_address) return null
    return typeof editingInvoice.shipping_address === 'number'
      ? editingInvoice.shipping_address
      : editingInvoice.shipping_address?.id || null
  }
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<number | null>(getInitialShippingAddress())
  const [effectiveShippingAddress, setEffectiveShippingAddress] = useState<any>(null)
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})
  const [itemPercentages, setItemPercentages] = useState<Record<number, number>>({})
  const [itemClaimMethods, setItemClaimMethods] = useState<Record<number, 'quantity' | 'percentage'>>({})
  const [formData, setFormData] = useState({
    proforma_number: editingInvoice?.proforma_number || '',
    proforma_date: editingInvoice?.proforma_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    due_date: editingInvoice?.due_date?.split('T')[0] || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: editingInvoice?.reference || '',
    notes: editingInvoice?.notes || 'Advance payment request',
    terms_and_conditions: editingInvoice?.terms_and_conditions || 'Payment terms: Net 30 days. Late payments may incur additional charges.',
    shipping_address: editingInvoice?.shipping_address || null
  })

  // Initialize default claim methods for creation only
  useEffect(() => {
    if (isEditing) return
    const items = isFromQuotation ? sourceData?.quotation_items : sourceData?.po_items
    if (items && Object.keys(itemClaimMethods).length === 0) {
      const defaultMethods: Record<number, 'quantity' | 'percentage'> = {}
      items.forEach((item: any) => {
        defaultMethods[item.id] = 'quantity' // Default to quantity
      })
      setItemClaimMethods(defaultMethods)
    }
  }, [sourceData, isFromQuotation, itemClaimMethods, isEditing])

  // Fetch available shipping addresses and effective shipping address
  useEffect(() => {
    const fetchShippingAddresses = async () => {
      const customerId = sourceData?.customer_details?.id || editingInvoice?.customer_details?.id
      if (!sessionKey || !customerId) return
      
      try {
        // Fetch customer shipping addresses
const customerId = sourceData?.customer_details?.id || editingInvoice?.customer_details?.id
      const response = await api.get(`/api/finance/customers/${customerId}/`, {
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

  // Calculate amounts (NO TAX for Proforma)
  const calculateProformaAmounts = () => {
    if (isEditing) {
      return {
        proformaBaseAmount: parseFloat(editingInvoice?.subtotal?.toString() || '0'),
        proformaTotalAmount: parseFloat(editingInvoice?.total_amount?.toString() || '0')
      }
    }

    const items = isFromQuotation ? sourceData?.quotation_items : sourceData?.po_items
    if (!items) return { proformaBaseAmount: 0, proformaTotalAmount: 0 }

    let selectedBaseAmount = 0

    items.forEach((item: any) => {
      const claimMethod = itemClaimMethods[item.id]
      
      if (claimMethod === 'quantity') {
        const quantity = selectedItems[item.id] || 0
        if (quantity > 0) {
          const itemBaseAmount = parseFloat(item.unit_price) * quantity
          selectedBaseAmount += itemBaseAmount
        }
      } else if (claimMethod === 'percentage') {
        const percentage = itemPercentages[item.id] || 0
        if (percentage > 0) {
          const itemTotal = parseFloat(item.unit_price) * item.quantity
          const itemBaseAmount = (itemTotal * percentage) / 100
          selectedBaseAmount += itemBaseAmount
        }
      }
    })

    return {
      proformaBaseAmount: selectedBaseAmount,
      proformaTotalAmount: selectedBaseAmount // NO TAX for proforma
    }
  }
  
  const { proformaBaseAmount, proformaTotalAmount } = calculateProformaAmounts()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (loading) {
      console.log('Form already submitting, preventing double submission')
      return // Prevent double submission
    }

    if (!sessionKey) {
      toast.error('Session expired. Please refresh the page.')
      return
    }

    // For creation, validate that at least some items are selected
    if (!isEditing) {
      const hasSelections = Object.entries(itemClaimMethods).some(([itemId, method]) => {
        if (method === 'quantity') {
          return (selectedItems[parseInt(itemId)] || 0) > 0
        } else {
          return (itemPercentages[parseInt(itemId)] || 0) > 0
        }
      })

      if (!hasSelections) {
        toast.error('Please select at least one item with quantity or percentage greater than 0')
        return
      }
    }
    
    // Disable form immediately to prevent double clicks
    const submitButton = e.currentTarget.querySelector('button[type="submit"]') as HTMLButtonElement
    if (submitButton) {
      submitButton.disabled = true
    }
    
    setLoading(true)

    try {
      let dataToSend: any = {
        proforma_number: formData.proforma_number,
        proforma_date: formData.proforma_date,
        due_date: formData.due_date,
        reference: formData.reference,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        shipping_address: selectedShippingAddress,
        session_key: sessionKey
      }

      if (!isEditing) {
        const items = isFromQuotation ? sourceData?.quotation_items : sourceData?.po_items
        const proformaItems = items
          .map((item: any) => {
            const claimMethod = itemClaimMethods[item.id]
            let quantity = 0
            let unit = item.unit
            let lineTotal = 0

            if (claimMethod === 'quantity') {
              quantity = selectedItems[item.id] || 0
              if (quantity > 0) {
                lineTotal = parseFloat(item.unit_price) * quantity
              }
            } else if (claimMethod === 'percentage') {
              const percentage = itemPercentages[item.id] || 0
              if (percentage > 0) {
                quantity = percentage
                unit = 'PERCENTAGE'
                const itemTotal = parseFloat(item.unit_price) * item.quantity
                lineTotal = (itemTotal * percentage) / 100
              }
            }

            if (quantity > 0) {
              return {
                product: item.product || item.id,
                product_name: item.product_name,
                quantity: quantity,
                unit: unit,
                unit_price: parseFloat(item.unit_price),
                line_total: lineTotal
              }
            }
            return null
          })
          .filter((item: any) => item !== null)

        dataToSend = {
          ...dataToSend,
          customer: sourceData?.customer_details?.id || sourceData?.customer,
          ...(purchaseOrder && { purchase_order: purchaseOrder.id }),
          ...(quotation && { quotation: quotation.id }),
          claim_type: 'hybrid',
          proforma_items: proformaItems,
          is_advance_bill: true,
          status: 'draft'
        }
      }

      const url = editingInvoice ? `/api/finance/proforma-invoices/${editingInvoice.id}/` : '/api/finance/proforma-invoices/'
      const method = editingInvoice ? 'PUT' : 'POST'
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionKey}`
        },
        body: JSON.stringify(dataToSend)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save proforma invoice')
      }
      
      await response.json()

      if (!isEditing && purchaseOrder?.id) {
        await handlePostInvoiceStatusUpdate(purchaseOrder.id, sessionKey)
      }
      
      toast.success(editingInvoice ? 'Proforma Invoice updated successfully!' : 'Proforma Invoice created successfully!')
      onSuccess()
    } catch (error: any) {
      console.error('Error saving proforma:', error)
      toast.error('Failed to save proforma invoice')
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
                Advance Payment Request
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
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                {isEditing ? 'Proforma Invoice' : isFromQuotation ? 'Quotation' : 'Purchase Order'}
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                {isEditing ? editingInvoice?.proforma_number : isFromQuotation ? sourceData.quotation_number : sourceData.internal_po_number}
              </p>
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
                  <p>{customerDetails.billing_address_line1}</p>
                  {customerDetails.billing_address_line2 && (
                    <p>{customerDetails.billing_address_line2}</p>
                  )}
                  <p>{customerDetails.billing_city}, {customerDetails.billing_state} {customerDetails.billing_pincode}</p>
                  <p>{customerDetails.billing_country}</p>
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
                    {(sourceData?.shipping_address_details || editingInvoice?.shipping_address_details) ? (
                      <>
                        <p>{(sourceData?.shipping_address_details || editingInvoice?.shipping_address_details).address_line1}</p>
                        {(sourceData?.shipping_address_details || editingInvoice?.shipping_address_details).address_line2 && (
                          <p>{(sourceData?.shipping_address_details || editingInvoice?.shipping_address_details).address_line2}</p>
                        )}
                        <p>{(sourceData?.shipping_address_details || editingInvoice?.shipping_address_details).city}, {(sourceData?.shipping_address_details || editingInvoice?.shipping_address_details).state} {(sourceData?.shipping_address_details || editingInvoice?.shipping_address_details).pincode}</p>
                        <p>{(sourceData?.shipping_address_details || editingInvoice?.shipping_address_details).country}</p>
                      </>
                    ) : (
                      <p className="text-gray-500">Same as billing address</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Item Selection with Dynamic Claim Methods */}
            {isEditing && editingInvoice?.proforma_items?.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2" />
                  Existing Proforma Items (Read Only)
                </h3>
                <div className="space-y-3">
                  {editingInvoice.proforma_items.map((item: any) => (
                    <div key={item.id} className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{item.product_name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{item.quantity} {item.unit}</span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ₹{parseFloat(item.unit_price).toFixed(2)} each, total ₹{parseFloat(item.line_total).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Item-level edits are not supported here. Update invoice metadata and shipping details only.
                </p>
              </div>
            )}
            {!isEditing && (sourceData?.po_items || sourceData?.quotation_items) && (
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
                            Available: {item.quantity} {item.unit} @ ₹{parseFloat(item.unit_price).toFixed(2)}
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
                                setItemPercentages(prev => ({ ...prev, [item.id]: 0 }))
                              }}
                              className="w-4 h-4 text-blue-600 mr-2"
                            />
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
                                setSelectedItems(prev => ({ ...prev, [item.id]: 0 }))
                              }}
                              className="w-4 h-4 text-orange-600 mr-2"
                            />
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

                      {/* Calculation Preview (NO TAX) */}
                      {((itemClaimMethods[item.id] === 'quantity' && (selectedItems[item.id] || 0) > 0) ||
                        (itemClaimMethods[item.id] === 'percentage' && (itemPercentages[item.id] || 0) > 0)) && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between text-blue-600 dark:text-blue-400 font-medium">
                              <span>Amount (No Tax):</span>
                              <span>₹{
                                itemClaimMethods[item.id] === 'quantity' 
                                  ? (parseFloat(item.unit_price) * (selectedItems[item.id] || 0)).toFixed(2)
                                  : ((parseFloat(item.unit_price) * item.quantity * (itemPercentages[item.id] || 0)) / 100).toFixed(2)
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

            {/* Total Calculation (NO TAX) */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
                Proforma Invoice Calculation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">Total Amount (No Tax):</span>
                  <span className="font-bold text-blue-600">₹{proformaTotalAmount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Note: Proforma invoice for advance payment (GST will be charged on final tax invoice)
                </p>
              </div>
            </div>

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
              disabled={loading || (!editingInvoice && proformaTotalAmount <= 0)}
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