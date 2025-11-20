import React, { useState, useEffect } from 'react'
import { X, Save, Calculator, AlertCircle, CheckCircle } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'

interface EnhancedInvoiceFormProps {
  purchaseOrder: any
  onClose: () => void
  onSave: () => void
}

interface GSTCalculation {
  gst_type: 'igst' | 'cgst_sgst' | 'exempt'
  place_of_supply: string
  totals: {
    total_cgst: number
    total_sgst: number
    total_igst: number
    total_tax: number
  }
}

const EnhancedInvoiceForm: React.FC<EnhancedInvoiceFormProps> = ({
  purchaseOrder,
  onClose,
  onSave
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [gstCalculation, setGstCalculation] = useState<GSTCalculation | null>(null)
  const [gstLoading, setGstLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    reference: '',
    claim_type: 'percentage',
    claim_percentage: 100,
    selected_items: {} as Record<string, number>,
    item_percentages: {} as Record<string, number>,
    notes: '',
    terms_and_conditions: ''
  })

  // Auto-calculate GST when component loads
  useEffect(() => {
    if (purchaseOrder?.customer?.state_code && purchaseOrder?.customer?.is_gst_registered) {
      calculateGST()
    }
  }, [purchaseOrder])

  const calculateGST = async () => {
    if (!sessionKey || !purchaseOrder) return

    setGstLoading(true)
    try {
      // Prepare line items from purchase order
      const lineItems = purchaseOrder.po_items?.map((item: any) => ({
        product_name: item.product_name,
        line_total: parseFloat(item.line_total),
        gst_rate: parseFloat(item.gst_rate)
      })) || []

      const response = await fetch('/api/finance/gst/calculate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_key: sessionKey,
          company_state_code: '27', // Default to Maharashtra
          customer_gstin: purchaseOrder.customer.gstin,
          customer_state_code: purchaseOrder.customer.state_code,
          line_items: lineItems
        })
      })

      const data = await response.json()
      if (response.ok) {
        setGstCalculation(data)
        toast.success('GST calculated automatically!')
      } else {
        console.error('GST calculation error:', data.error)
        toast.error('GST calculation failed')
      }
    } catch (error) {
      console.error('Error calculating GST:', error)
      toast.error('GST calculation failed')
    } finally {
      setGstLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        purchase_order: purchaseOrder.id,
        session_key: sessionKey,
        ...(formData.due_date && { due_date: formData.due_date })
      }

      await apiClient.createFinanceInvoice(payload)
      toast.success('Invoice created successfully with GST compliance!')
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      toast.error(error.response?.data?.message || 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  const getGSTTypeDisplay = (gstType: string) => {
    switch (gstType) {
      case 'igst':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">IGST (Inter-State)</span>
      case 'cgst_sgst':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">CGST + SGST (Intra-State)</span>
      case 'exempt':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">GST Exempt</span>
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create Invoice with GST Compliance
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              PO: {purchaseOrder?.internal_po_number} | Customer: {purchaseOrder?.customer?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* GST Calculation Section */}
          {purchaseOrder?.customer?.is_gst_registered && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Automatic GST Calculation
                </h3>
                <button
                  type="button"
                  onClick={calculateGST}
                  disabled={gstLoading}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {gstLoading ? 'Calculating...' : 'Recalculate'}
                </button>
              </div>

              {gstCalculation ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">GST Type:</span>
                    {getGSTTypeDisplay(gstCalculation.gst_type)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Place of Supply:</span>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      {gstCalculation.place_of_supply}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {gstCalculation.gst_type === 'cgst_sgst' ? (
                      <>
                        <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400">CGST</p>
                          <p className="text-lg font-semibold text-green-600">₹{gstCalculation.totals.total_cgst.toFixed(2)}</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <p className="text-xs text-gray-600 dark:text-gray-400">SGST</p>
                          <p className="text-lg font-semibold text-green-600">₹{gstCalculation.totals.total_sgst.toFixed(2)}</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-600 dark:text-gray-400">IGST</p>
                        <p className="text-lg font-semibold text-blue-600">₹{gstCalculation.totals.total_igst.toFixed(2)}</p>
                      </div>
                    )}
                    <div className="text-center p-3 bg-blue-100 dark:bg-blue-800 rounded-lg">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Tax</p>
                      <p className="text-lg font-semibold text-blue-600">₹{gstCalculation.totals.total_tax.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">GST calculation completed automatically</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">GST calculation will be applied automatically when invoice is created</span>
                </div>
              )}
            </div>
          )}

          {/* Basic Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Invoice reference"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Claim Percentage *
              </label>
              <input
                type="number"
                value={formData.claim_percentage}
                onChange={(e) => setFormData(prev => ({ ...prev, claim_percentage: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
                max="100"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Internal notes..."
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Terms and conditions..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Create Invoice with GST
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EnhancedInvoiceForm