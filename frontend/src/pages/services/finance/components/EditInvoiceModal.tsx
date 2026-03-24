import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Package, Calculator, Hash, Percent } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { apiClient } from '../../../../lib/api'
import api from '../../../../lib/api'

interface Customer {
  id: number
  name: string
  customer_code: string
  email: string
  gstin: string
}

interface Product {
  id: number
  name: string
  product_code: string
  unit: string
  selling_price: number
  gst_rate: number
}

interface InvoiceItem {
  id?: number
  product: number
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  gst_rate: number
}

interface PurchaseOrderDetails {
  id: number
  internal_po_number: string
  po_number: string
  customer_name: string
  customer_details?: {
    id: number
    name: string
    customer_code: string
    email: string
    gstin: string
    project_area: string
    billing_address_line1: string
    billing_address_line2: string
    billing_city: string
    billing_state: string
    billing_pincode: string
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

interface EditInvoiceModalProps {
  invoice: { id: number; invoice_number: string; customer_name: string }
  onClose: () => void
  onSave: () => void
}

const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({ invoice, onClose, onSave }) => {
  const sessionKey = sessionStorage.getItem('service_session_key') || ''

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [fetchingInvoice, setFetchingInvoice] = useState(true)
  const [loading, setLoading] = useState(false)

  // PO-based vs direct mode
  const [isPOBased, setIsPOBased] = useState(false)
  const [poDetails, setPoDetails] = useState<PurchaseOrderDetails | null>(null)

  // Dynamic form state for PO-based mode
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})
  const [itemPercentages, setItemPercentages] = useState<Record<number, number>>({})
  const [itemClaimMethods, setItemClaimMethods] = useState<Record<number, 'quantity' | 'percentage'>>({})

  // Direct mode state
  const [shippingAddresses, setShippingAddresses] = useState<{ id: number | null; label: string; address: string }[]>([])
  const [formData, setFormData] = useState({
    customer: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    reference: '',
    shipping_address: '' as string | number,
    notes: '',
    terms_and_conditions: '',
    discount_percentage: 0,
    discount_amount: 0,
    shipping_charges: 0,
    other_charges: 0,
  })

  const [items, setItems] = useState<InvoiceItem[]>([{
    product: 0,
    product_name: '',
    quantity: 1,
    unit: '',
    unit_price: 0,
    line_total: 0,
    gst_rate: 0,
  }])

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [customersRes, productsRes, invoiceRes] = await Promise.all([
          apiClient.getFinanceCustomers({ session_key: sessionKey }),
          apiClient.getFinanceProducts({ session_key: sessionKey, page_size: 200 }),
          api.get(`/api/finance/invoices/${invoice.id}/`, { params: { session_key: sessionKey } }),
        ])

        const customerList: Customer[] = customersRes.data.results || []
        const productList: Product[] = productsRes.data.results || []
        setCustomers(customerList)
        setProducts(productList)

        const data = invoiceRes.data

        // Determine if this is PO-based mode
        if (data.purchase_order_details) {
          setIsPOBased(true)
          setPoDetails(data.purchase_order_details)

          // Pre-populate dynamic form state by matching invoice_items to po_items
          if (data.purchase_order_details.po_items && data.invoice_items) {
            const poItems = data.purchase_order_details.po_items
            const invoiceItems = data.invoice_items

            // Initialize claim methods
            const defaultMethods: Record<number, 'quantity' | 'percentage'> = {}
            poItems.forEach((poItem: any) => {
              defaultMethods[poItem.id] = 'quantity' // Default to quantity
            })
            setItemClaimMethods(defaultMethods)

            // Match invoice items to PO items by product name
            invoiceItems.forEach((invItem: any) => {
              const matchingPoItem = poItems.find((poItem: any) =>
                poItem.product_name === invItem.product_name
              )

              if (matchingPoItem) {
                const poItemId = matchingPoItem.id
                const poItemTotal = parseFloat(matchingPoItem.line_total)
                const invItemTotal = parseFloat(invItem.line_total)

                if (poItemTotal > 0) {
                  const percentage = (invItemTotal / poItemTotal) * 100

                  // If percentage is close to whole number, use quantity method
                  // Otherwise use percentage method
                  if (Math.abs(percentage - Math.round(percentage)) < 0.01) {
                    // Use quantity method
                    const quantity = parseFloat(invItem.quantity)
                    setSelectedItems(prev => ({ ...prev, [poItemId]: quantity }))
                    setItemClaimMethods(prev => ({ ...prev, [poItemId]: 'quantity' }))
                  } else {
                    // Use percentage method
                    setItemPercentages(prev => ({ ...prev, [poItemId]: percentage }))
                    setItemClaimMethods(prev => ({ ...prev, [poItemId]: 'percentage' }))
                  }
                }
              }
            })
          }

          // Set form data for PO mode
          setFormData({
            customer: data.customer_details?.id ? String(data.customer_details.id) : '',
            invoice_number: data.invoice_number || '',
            invoice_date: data.invoice_date ? data.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
            due_date: data.due_date ? data.due_date.split('T')[0] : '',
            reference: data.reference || '',
            shipping_address: data.shipping_address_details?.id ?? '',
            notes: data.notes || '',
            terms_and_conditions: data.terms_and_conditions || '',
            discount_percentage: 0,
            discount_amount: 0,
            shipping_charges: 0,
            other_charges: 0,
          })
        } else {
          setIsPOBased(false)
          setPoDetails(null)

          // Load direct mode data
          const custId = data.customer_details?.id ? String(data.customer_details.id) : ''
          setFormData({
            customer: custId,
            invoice_number: data.invoice_number || '',
            invoice_date: data.invoice_date ? data.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
            due_date: data.due_date ? data.due_date.split('T')[0] : '',
            reference: data.reference || '',
            shipping_address: data.shipping_address_details?.id ?? '',
            notes: data.notes || '',
            terms_and_conditions: data.terms_and_conditions || '',
            discount_percentage: parseFloat(data.discount_percentage) || 0,
            discount_amount: parseFloat(data.discount_amount) || 0,
            shipping_charges: parseFloat(data.shipping_charges) || 0,
            other_charges: parseFloat(data.other_charges) || 0,
          })
          // Load shipping addresses for this customer
          if (custId) {
            try {
              const addrRes = await api.get(`/api/finance/customers/${custId}/`, { params: { session_key: sessionKey } })
              const c = addrRes.data
              const addrs: { id: number | null; label: string; address: string }[] = [
                { id: null, label: 'Billing Address (Default)', address: [c.billing_address_line1, c.billing_city, c.billing_state, c.billing_pincode].filter(Boolean).join(', ') }
              ]
              ;(c.shipping_addresses || []).forEach((a: any) => {
                addrs.push({ id: a.id, label: a.label || 'Shipping Address', address: a.full_address })
              })
              setShippingAddresses(addrs)
            } catch { setShippingAddresses([]) }
          }

          if (data.invoice_items && data.invoice_items.length > 0) {
            setItems(data.invoice_items.map((item: any) => {
              const matchedProduct = productList.find(
                p => p.id === item.product || p.name === item.product_name
              )
              return {
                id: item.id,
                product: item.product || matchedProduct?.id || 0,
                product_name: item.product_name || '',
                quantity: parseFloat(item.quantity) || 1,
                unit: item.unit || matchedProduct?.unit || '',
                unit_price: parseFloat(item.unit_price) || 0,
                line_total: parseFloat(item.line_total) || 0,
                gst_rate: parseFloat(item.gst_rate) || matchedProduct?.gst_rate || 0,
              }
            }))
          }
        }
      } catch (error) {
        console.error('Error loading invoice data:', error)
        toast.error('Failed to load invoice data')
      } finally {
        setFetchingInvoice(false)
      }
    }

    loadAll()
  }, [invoice.id, sessionKey])

  // Direct mode handlers
  const handleProductChange = (index: number, productId: number) => {
    if (isPOBased) return

    const product = products.find(p => p.id === productId)
    if (product) {
      const newItems = [...items]
      newItems[index] = {
        ...newItems[index],
        product: productId,
        product_name: product.name,
        unit: product.unit,
        unit_price: product.selling_price,
        line_total: newItems[index].quantity * product.selling_price,
        gst_rate: product.gst_rate,
      }
      setItems(newItems)
    }
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    if (isPOBased) return

    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      quantity,
      line_total: quantity * newItems[index].unit_price
    }
    setItems(newItems)
  }

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    if (isPOBased) return

    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      unit_price: unitPrice,
      line_total: newItems[index].quantity * unitPrice
    }
    setItems(newItems)
  }

  const addItem = () => {
    if (isPOBased) return

    setItems([...items, {
      product: 0,
      product_name: '',
      quantity: 1,
      unit: '',
      unit_price: 0,
      line_total: 0,
      gst_rate: 0,
    }])
  }

  const removeItem = (index: number) => {
    if (isPOBased) return

    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // Calculation functions
  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.line_total, 0)

  const calculateTax = () =>
    items.reduce((sum, item) => sum + (item.line_total * item.gst_rate / 100), 0)

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const tax = calculateTax()
    const discount = formData.discount_percentage > 0
      ? (subtotal * formData.discount_percentage / 100)
      : formData.discount_amount
    return subtotal + tax - discount + formData.shipping_charges + formData.other_charges
  }

  // PO-based calculation functions
  const calculateInvoiceAmounts = () => {
    if (!poDetails?.po_items) return { invoiceBaseAmount: 0, invoiceTaxAmount: 0, invoiceTotalAmount: 0 }

    let selectedBaseAmount = 0
    let selectedTaxAmount = 0

    poDetails.po_items.forEach((item: any) => {
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

  // Submit handlers
  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer) {
      toast.error('Please select a customer')
      return
    }

    const validItems = items.filter(item => item.product > 0 && item.quantity > 0)
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item')
      return
    }

    setLoading(true)
    try {
      const payload = {
        customer: parseInt(formData.customer),
        invoice_number: formData.invoice_number || invoice.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        reference: formData.reference,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        discount_percentage: formData.discount_percentage,
        discount_amount: formData.discount_amount,
        shipping_charges: formData.shipping_charges,
        other_charges: formData.other_charges,
        shipping_address: formData.shipping_address || null,
        invoice_items: validItems.map(item => ({
          ...(item.id ? { id: item.id } : {}),
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        session_key: sessionKey,
      }

      await apiClient.updateFinanceInvoice(invoice.id, payload)
      toast.success('Invoice updated successfully!')
      onSave()
      onClose()
    } catch (error: any) {
      const msg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Failed to update invoice'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handlePOSubmit = async (e: React.FormEvent) => {
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
        customer: poDetails?.customer_details?.id,
        invoice_number: invoice.invoice_number,
        purchase_order: poDetails?.id,
        claim_type: 'hybrid',
        selected_items: selectedItems,
        item_percentages: itemPercentages,
        item_claim_methods: itemClaimMethods,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        reference: formData.reference,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        session_key: sessionKey,
      }

      await apiClient.updateFinanceInvoice(invoice.id, dataToSend)
      toast.success('Tax Invoice updated successfully!')
      onSave()
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      toast.error('Failed to update tax invoice')
    } finally {
      setLoading(false)
    }
  }

  if (fetchingInvoice) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">Loading invoice data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit Invoice: {invoice.invoice_number}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {isPOBased ? (
          /* PO-BASED MODE: DynamicTaxInvoiceForm Layout */
          <form onSubmit={handlePOSubmit} className="flex flex-col max-h-[calc(90vh-80px)]">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Source Reference */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl">
                <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">Purchase Order</h3>
                <p className="text-green-700 dark:text-green-300">{poDetails?.internal_po_number}</p>
              </div>

              {/* Item Selection with Dynamic Claim Methods */}
              {poDetails?.po_items && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                    <Package className="w-4 h-4 mr-2" />
                    Select Items & Claim Methods
                  </h3>
                  <div className="space-y-4">
                    {poDetails.po_items.map((item: any) => (
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
                {loading ? '⏳ Updating...' : 'Update Tax Invoice'}
              </button>
            </div>
          </form>
        ) : (
          /* DIRECT MODE: DirectCreateTaxInvoiceModal Layout */
          <form onSubmit={handleDirectSubmit} className="p-6 space-y-6">
            {/* Customer and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.customer_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Auto-generated if empty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer PO / Reference
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Customer PO number or reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Address
                </label>
                <select
                  value={formData.shipping_address}
                  onChange={(e) => setFormData({ ...formData, shipping_address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Shipping Address --</option>
                  {shippingAddresses.map((a, i) => (
                    <option key={i} value={a.id ?? ''}>{a.label} — {a.address}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items Section - Editable */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 border border-gray-200 rounded-lg">
                    <div className="col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product
                      </label>
                      <select
                        value={item.product}
                        onChange={(e) => handleProductChange(index, parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={0}>Select Product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.product_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={item.unit}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => handleUnitPriceChange(index, parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line Total
                      </label>
                      <input
                        type="text"
                        value={`₹${item.line_total.toFixed(2)}`}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>

                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="w-full p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Charges */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount %
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0, discount_amount: 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0, discount_percentage: 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Charges
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.shipping_charges}
                  onChange={(e) => setFormData({ ...formData, shipping_charges: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other Charges
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.other_charges}
                  onChange={(e) => setFormData({ ...formData, other_charges: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Notes and Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms and Conditions
                </label>
                <textarea
                  value={formData.terms_and_conditions}
                  onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Terms and conditions..."
                />
              </div>
            </div>

            {/* Total Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (GST):</span>
                  <span>₹{calculateTax().toFixed(2)}</span>
                </div>
                {(formData.discount_percentage > 0 || formData.discount_amount > 0) && (
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-₹{(formData.discount_percentage > 0
                      ? (calculateSubtotal() * formData.discount_percentage / 100)
                      : formData.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                {formData.shipping_charges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>₹{formData.shipping_charges.toFixed(2)}</span>
                  </div>
                )}
                {formData.other_charges > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Other Charges:</span>
                    <span>₹{formData.other_charges.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default EditInvoiceModal
