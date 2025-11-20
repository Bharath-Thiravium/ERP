import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { apiClient } from '../../../../lib/api'

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
  product: number
  product_name: string
  quantity: number
  unit: string
  unit_price: number
  line_total: number
}

interface DirectCreateProformaInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const DirectCreateProformaInvoiceModal: React.FC<DirectCreateProformaInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customer: '',
    proforma_date: new Date().toISOString().split('T')[0],
    due_date: '',
    reference: '',
    notes: '',
    terms_and_conditions: '',
    discount_percentage: 0,
    discount_amount: 0,
    shipping_charges: 0,
    other_charges: 0
  })

  const [items, setItems] = useState<InvoiceItem[]>([{
    product: 0,
    product_name: '',
    quantity: 1,
    unit: '',
    unit_price: 0,
    line_total: 0
  }])

  const sessionKey = localStorage.getItem('session_key') || ''

  useEffect(() => {
    if (isOpen) {
      fetchCustomers()
      fetchProducts()
      // Set due date to 30 days from proforma date
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 30)
      setFormData(prev => ({
        ...prev,
        due_date: dueDate.toISOString().split('T')[0]
      }))
    }
  }, [isOpen])

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
    const product = products.find(p => p.id === productId)
    if (product) {
      const newItems = [...items]
      newItems[index] = {
        ...newItems[index],
        product: productId,
        product_name: product.name,
        unit: product.unit,
        unit_price: product.selling_price,
        line_total: newItems[index].quantity * product.selling_price
      }
      setItems(newItems)
    }
  }



  const handleQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      quantity,
      line_total: quantity * newItems[index].unit_price
    }
    setItems(newItems)
  }

  const handleUnitPriceChange = (index: number, unitPrice: number) => {
    const newItems = [...items]
    newItems[index] = {
      ...newItems[index],
      unit_price: unitPrice,
      line_total: newItems[index].quantity * unitPrice
    }
    setItems(newItems)
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
    return items.reduce((sum, item) => sum + item.line_total, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discount = formData.discount_percentage > 0 
      ? (subtotal * formData.discount_percentage / 100)
      : formData.discount_amount
    return subtotal - discount + formData.shipping_charges + formData.other_charges
  }

  const handleSubmit = async (e: React.FormEvent) => {
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
        ...formData,
        proforma_items: validItems,
        session_key: sessionKey,
        ...(formData.due_date && { due_date: formData.due_date })
      }

      await apiClient.createFinanceProformaInvoice(payload)
      toast.success('Proforma invoice created successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating proforma invoice:', error)
      toast.error('Failed to create proforma invoice')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Create Proforma Invoice</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                Proforma Date *
              </label>
              <input
                type="date"
                value={formData.proforma_date}
                onChange={(e) => setFormData({ ...formData, proforma_date: e.target.value })}
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
                Reference
              </label>
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Reference number or description"
              />
            </div>
          </div>

          {/* Items Section */}
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
              <div className="text-xs text-gray-500 mt-2">
                Note: Proforma Invoice for advance payment collection (No GST)
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
              {loading ? 'Creating...' : 'Create Proforma Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DirectCreateProformaInvoiceModal