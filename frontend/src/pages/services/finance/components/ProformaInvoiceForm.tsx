import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import { X, Calendar, FileText, User, Building, MapPin } from 'lucide-react'

interface PurchaseOrder {
  id: number
  internal_po_number: string
  customer_name: string
  customer_code: string
  total_amount: number
  status: string
}

interface ProformaInvoice {
  id: number
  proforma_number: string
  proforma_date: string
  due_date: string
  reference: string
  status: string
  notes: string
  terms_and_conditions: string
  purchase_order: number
}

interface ProformaInvoiceFormProps {
  proformaInvoice?: ProformaInvoice | null
  onClose: () => void
  onSuccess: () => void
  sessionKey: string
}

const ProformaInvoiceForm: React.FC<ProformaInvoiceFormProps> = ({
  proformaInvoice,
  onClose,
  onSuccess,
  sessionKey
}) => {
  const [loading, setLoading] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    purchase_order: proformaInvoice?.purchase_order || 0,
    proforma_date: proformaInvoice?.proforma_date || new Date().toISOString().split('T')[0],
    due_date: proformaInvoice?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: proformaInvoice?.reference || '',
    notes: proformaInvoice?.notes || '',
    terms_and_conditions: proformaInvoice?.terms_and_conditions || '',
    status: proformaInvoice?.status || 'draft'
  })

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent to Customer' },
    { value: 'approved', label: 'Approved by Customer' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  useEffect(() => {
    fetchPurchaseOrders()
  }, [])

  const fetchPurchaseOrders = async () => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/purchase-orders/?session_key=${sessionKey}`)
      // Filter only approved POs that don't have proforma invoices yet
      const availablePOs = response.data.results?.filter((po: PurchaseOrder) => 
        po.status === 'confirmed' || po.status === 'approved'
      ) || []
      setPurchaseOrders(availablePOs)
    } catch (error) {
      console.error('Error fetching purchase orders:', error)
      toast.error('Failed to fetch purchase orders')
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.purchase_order) {
      newErrors.purchase_order = 'Purchase Order is required'
    }

    if (!formData.proforma_date) {
      newErrors.proforma_date = 'Proforma date is required'
    }

    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required'
    }

    // Validate due date is after proforma date
    if (formData.proforma_date && formData.due_date) {
      if (new Date(formData.due_date) <= new Date(formData.proforma_date)) {
        newErrors.due_date = 'Due date must be after proforma date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      const dataToSend = {
        ...formData,
        session_key: sessionKey
      }

      const url = proformaInvoice 
        ? `http://127.0.0.1:8000/api/finance/proforma-invoices/${proformaInvoice.id}/`
        : 'http://127.0.0.1:8000/api/finance/proforma-invoices/'
      
      const method = proformaInvoice ? 'patch' : 'post'

      await axios[method](url, dataToSend, {
        headers: {
          'Authorization': `Bearer ${sessionKey}`,
          'Content-Type': 'application/json'
        }
      })

      toast.success(proformaInvoice ? 'Proforma invoice updated successfully!' : 'Proforma invoice created successfully!')
      onSuccess()
    } catch (error: any) {
      console.error('Error saving proforma invoice:', error)
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object') {
          const fieldErrors: Record<string, string> = {}
          Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              fieldErrors[key] = String(value[0])
            } else if (typeof value === 'string') {
              fieldErrors[key] = value
            } else {
              fieldErrors[key] = String(value)
            }
          })
          setErrors(fieldErrors)
          toast.error('Please check the form for errors')
        } else {
          toast.error(`Failed to save proforma invoice: ${String(errorData)}`)
        }
      } else {
        toast.error('Failed to save proforma invoice. Please check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedPO = purchaseOrders.find(po => po.id === formData.purchase_order)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {proformaInvoice ? 'Edit Proforma Invoice' : 'Create Proforma Invoice'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Purchase Order Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Purchase Order *
              </label>
              <select
                value={formData.purchase_order}
                onChange={(e) => setFormData(prev => ({ ...prev, purchase_order: parseInt(e.target.value) }))}
                disabled={!!proformaInvoice} // Disable editing PO for existing proforma invoices
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600"
              >
                <option value={0}>Select Purchase Order</option>
                {purchaseOrders.map(po => (
                  <option key={po.id} value={po.id}>
                    {po.internal_po_number} - {po.customer_name} (₹{po.total_amount.toFixed(2)})
                  </option>
                ))}
              </select>
              {errors.purchase_order && <p className="mt-1 text-sm text-red-600">{errors.purchase_order}</p>}
            </div>

            {/* Selected PO Details */}
            {selectedPO && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Selected Purchase Order</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">PO Number:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedPO.internal_po_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{selectedPO.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white">₹{selectedPO.total_amount.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">{selectedPO.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Date Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proforma Date *
                </label>
                <input
                  type="date"
                  value={formData.proforma_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, proforma_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.proforma_date && <p className="mt-1 text-sm text-red-600">{errors.proforma_date}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.due_date && <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>}
              </div>
            </div>

            {/* Reference and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter reference"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Internal Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter internal notes..."
              />
            </div>

            {/* Terms and Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Terms and Conditions
              </label>
              <textarea
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter terms and conditions..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : (proformaInvoice ? 'Update Proforma Invoice' : 'Create Proforma Invoice')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProformaInvoiceForm
