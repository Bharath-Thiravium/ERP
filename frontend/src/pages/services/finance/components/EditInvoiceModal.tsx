import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, Edit } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'

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
  product?: number
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
  gst_rate?: number
}

interface Invoice {
  id: number
  invoice_number: string
  invoice_date: string
  due_date?: string
  reference?: string
  customer?: number
  customer_name: string
  customer_gstin?: string
  company_gstin?: string
  status: string
  payment_status: string
  gst_type: string
  subtotal: string
  total_tax: string
  total_amount: string
  discount_percentage?: number
  discount_amount?: string
  shipping_charges?: string
  other_charges?: string
  notes?: string
  terms_and_conditions?: string
  invoice_items?: InvoiceItem[]
}

interface EditInvoiceModalProps {
  invoice: Invoice
  onClose: () => void
  onSave: () => void
}

const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  onClose,
  onSave
}) => {
  const { sessionKey } = useServiceUserStore()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  // Safety check for invoice prop
  if (!invoice || !invoice.id) {
    console.error('EditInvoiceModal: Invalid invoice prop', invoice)
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">Invalid invoice data. Please try again.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  // Debug logging
  console.log('EditInvoiceModal - Invoice data:', invoice)
  console.log('EditInvoiceModal - Session key:', sessionKey)

  // Form data state
  const [formData, setFormData] = useState(() => {
    try {
      return {
        customer: invoice?.customer ? String(invoice.customer) : '',
        invoice_number: String(invoice?.invoice_number || ''),
        invoice_date: invoice?.invoice_date ? invoice.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
        due_date: invoice?.due_date ? invoice.due_date.split('T')[0] : '',
        reference: String(invoice?.reference || ''),
        notes: String(invoice?.notes || ''),
        terms_and_conditions: String(invoice?.terms_and_conditions || ''),
        discount_percentage: Number(invoice?.discount_percentage) || 0,
        discount_amount: Number(invoice?.discount_amount) || 0,
        shipping_charges: Number(invoice?.shipping_charges) || 0,
        other_charges: Number(invoice?.other_charges) || 0
      }
    } catch (error) {
      console.error('Error initializing form data:', error)
      return {
        customer: '',
        invoice_number: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        reference: '',
        notes: '',
        terms_and_conditions: '',
        discount_percentage: 0,
        discount_amount: 0,
        shipping_charges: 0,
        other_charges: 0
      }
    }
  })

  // Invoice items state - convert existing items to editable format
  const [items, setItems] = useState<InvoiceItem[]>(() => {
    try {
      if (invoice?.invoice_items && Array.isArray(invoice.invoice_items) && invoice.invoice_items.length > 0) {
        return invoice.invoice_items.map((item, index) => {
          console.log(`Processing item ${index}:`, item)
          return {
            id: item?.id || undefined,
            product: Number(item?.product) || 0,
            product_name: String(item?.product_name || ''),
            quantity: Number(item?.quantity) || 0,
            unit: String(item?.unit || ''),
            unit_price: Number(item?.unit_price) || 0,
            line_total: Number(item?.line_total) || 0,
            gst_rate: Number(item?.gst_rate) || 0
          }
        })
      }
      console.log('No invoice items found, using default item')
      return [{
        product: 0,
        product_name: '',
        quantity: 1,
        unit: '',
        unit_price: 0,
        line_total: 0
      }]
    } catch (error) {
      console.error('Error processing invoice items:', error)
      return [{
        product: 0,
        product_name: '',
        quantity: 1,
        unit: '',
        unit_price: 0,
        line_total: 0
      }]
    }
  })

  useEffect(() => {
    fetchCustomers()
    fetchProducts()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.getFinanceCustomers({ session_key: sessionKey })
      setCustomers(response.data.results || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('Failed to fetch customers')
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await apiClient.getFinanceProducts({ session_key: sessionKey })
      setProducts(response.data.results || [])
    } catch (error) {
      console.error('Error fetching products:', error)
      toast.error('Failed to fetch products')
    }
  }

  const handleProductChange = (index: number, productId: number) => {
    try {
      const product = products?.find(p => p?.id === productId)
      if (product && items[index]) {
        const newItems = [...items]
        const currentQuantity = Number(newItems[index]?.quantity) || 1
        const sellingPrice = Number(product.selling_price) || 0
        
        newItems[index] = {
          ...newItems[index],
          product: productId,
          product_name: String(product.name || ''),
          unit: String(product.unit || ''),
          unit_price: sellingPrice,
          line_total: currentQuantity * sellingPrice,
          gst_rate: Number(product.gst_rate) || 0
        }
        setItems(newItems)
      }
    } catch (error) {
      console.error('Error in handleProductChange:', error)
    }
  }

  const handleQuantityChange = (index: number, quantity: number) => {
    try {
      if (items[index]) {
        const newItems = [...items]
        const safeQuantity = Number(quantity) || 0
        const unitPrice = Number(newItems[index]?.unit_price) || 0
        
        newItems[index] = {
          ...newItems[index],
          quantity: safeQuantity,
          line_total: safeQuantity * unitPrice
        }
        setItems(newItems)
      }
    } catch (error) {
      console.error('Error in handleQuantityChange:', error)
    }
  }

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    try {
      if (items[index]) {
        const newItems = [...items]
        const safeUnitPrice = Number(unitPrice) || 0
        const quantity = Number(newItems[index]?.quantity) || 0
        
        newItems[index] = {
          ...newItems[index],
          unit_price: safeUnitPrice,
          line_total: quantity * safeUnitPrice
        }
        setItems(newItems)
      }
    } catch (error) {
      console.error('Error in handleUnitPriceChange:', error)
    }
  }

  const addItem = () => {
    setItems([...items, {
      product: 0,
      product_name: '',
      quantity: 1,
      unit: '',
      unit_price: 0,
      line_total: 0
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const calculateSubtotal = () => {
    try {
      return items?.reduce((sum, item) => sum + (Number(item?.line_total) || 0), 0) || 0
    } catch (error) {
      console.error('Error calculating subtotal:', error)
      return 0
    }
  }

  const calculateTax = () => {
    try {
      return items?.reduce((sum, item) => {
        const product = item?.product ? products?.find(p => p?.id === item.product) : null
        const gstRate = Number(item?.gst_rate) || Number(product?.gst_rate) || 0
        const lineTotal = Number(item?.line_total) || 0
        return sum + (lineTotal * gstRate / 100)
      }, 0) || 0
    } catch (error) {
      console.error('Error calculating tax:', error)
      return 0
    }
  }

  const calculateTotal = () => {
    try {
      const subtotal = calculateSubtotal()
      const tax = calculateTax()
      const discountPercentage = Number(formData?.discount_percentage) || 0
      const discountAmount = Number(formData?.discount_amount) || 0
      const shippingCharges = Number(formData?.shipping_charges) || 0
      const otherCharges = Number(formData?.other_charges) || 0
      
      const discount = discountPercentage > 0 
        ? (subtotal * discountPercentage / 100)
        : discountAmount
      
      return subtotal + tax - discount + shippingCharges + otherCharges
    } catch (error) {
      console.error('Error calculating total:', error)
      return 0
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.customer) {
      toast.error('Please select a customer')
      return
    }

    const validItems = items.filter(item => (item.product && item.product > 0) && item.quantity > 0)
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item')
      return
    }

    setLoading(true)
    try {
      // Prepare the payload for invoice update
      const payload = {
        customer: parseInt(formData.customer),
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        reference: formData.reference,
        notes: formData.notes,
        terms_and_conditions: formData.terms_and_conditions,
        discount_percentage: formData.discount_percentage,
        discount_amount: formData.discount_amount,
        shipping_charges: formData.shipping_charges,
        other_charges: formData.other_charges,
        invoice_items: validItems.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        session_key: sessionKey
      }

      await apiClient.updateFinanceInvoice(invoice.id, payload)
      toast.success('Invoice updated successfully!')
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.response?.data?.invoice_number?.[0] ||
                          'Failed to update invoice'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
          <div className="flex items-center space-x-3">
            <Edit className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Edit Invoice: {invoice.invoice_number}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Modify invoice details and items | Customer: {invoice.customer_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer *
              </label>
              <select
                value={formData.customer}
                onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reference
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Reference number or description"
            />
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Invoice Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                  <div className="col-span-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Product
                    </label>
                    <select
                      value={item.product}
                      onChange={(e) => handleProductChange(index, parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={item.unit}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => handleUnitPriceChange(index, parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Line Total
                    </label>
                    <input
                      type="text"
                      value={`₹${item.line_total.toFixed(2)}`}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 dark:text-gray-400"
                    />
                  </div>

                  <div className="col-span-1">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={items.length === 1}
                      className="w-full p-2 text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      title="Remove Item"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0, discount_amount: 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Discount Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0, discount_percentage: 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shipping Charges
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.shipping_charges}
                onChange={(e) => setFormData({ ...formData, shipping_charges: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Other Charges
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.other_charges}
                onChange={(e) => setFormData({ ...formData, other_charges: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Additional notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Terms and Conditions
              </label>
              <textarea
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Terms and conditions..."
              />
            </div>
          </div>

          {/* Total Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-lg border border-green-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Invoice Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Subtotal:</span>
                <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 dark:text-gray-300">Tax (GST):</span>
                <span className="font-medium">₹{calculateTax().toFixed(2)}</span>
              </div>
              {(formData.discount_percentage > 0 || formData.discount_amount > 0) && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                  <span className="text-red-600">-₹{(formData.discount_percentage > 0 
                    ? (calculateSubtotal() * formData.discount_percentage / 100)
                    : formData.discount_amount).toFixed(2)}</span>
                </div>
              )}
              {formData.shipping_charges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Shipping:</span>
                  <span>₹{formData.shipping_charges.toFixed(2)}</span>
                </div>
              )}
              {formData.other_charges > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Other Charges:</span>
                  <span>₹{formData.other_charges.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-green-300 dark:border-gray-500 pt-2">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span className="text-gray-900 dark:text-white">Total Amount:</span>
                  <span className="text-green-600 dark:text-green-400">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Invoice</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditInvoiceModal