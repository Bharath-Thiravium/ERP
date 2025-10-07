import React, { useState, useEffect } from 'react'
import { X, Save, Calculator, AlertTriangle, CheckCircle } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'

interface EnhancedPaymentFormProps {
  invoice: any
  onClose: () => void
  onSave: () => void
}

interface TDSCalculation {
  payment_amount: number
  tds_section: string
  section_description: string
  tds_rate: number
  tds_amount: number
  net_amount: number
  threshold: number
  is_above_threshold: boolean
}

interface TDSSection {
  code: string
  description: string
  rate: number
  threshold: number
}

const EnhancedPaymentForm: React.FC<EnhancedPaymentFormProps> = ({
  invoice,
  onClose,
  onSave
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [tdsCalculation, setTdsCalculation] = useState<TDSCalculation | null>(null)
  const [tdsLoading, setTdsLoading] = useState(false)
  const [tdsSections, setTdsSections] = useState<TDSSection[]>([])
  
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: invoice?.outstanding_amount || 0,
    payment_method: 'bank_transfer',
    reference_number: '',
    bank_name: '',
    tds_section: '194A',
    notes: ''
  })

  // Fetch TDS sections on component load
  useEffect(() => {
    fetchTdsSections()
  }, [])

  // Auto-calculate TDS when amount or section changes
  useEffect(() => {
    if (formData.amount > 0 && formData.tds_section) {
      calculateTDS()
    }
  }, [formData.amount, formData.tds_section])

  const fetchTdsSections = async () => {
    try {
      const response = await fetch('/api/finance/tds-sections/')
      const data = await response.json()
      setTdsSections(data.tds_sections || [])
    } catch (error) {
      console.error('Error fetching TDS sections:', error)
    }
  }

  const calculateTDS = async () => {
    if (!sessionKey || !formData.amount || !formData.tds_section) return

    setTdsLoading(true)
    try {
      const response = await fetch('/api/finance/tds/calculate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_key: sessionKey,
          payment_amount: formData.amount,
          tds_section: formData.tds_section
        })
      })

      const data = await response.json()
      if (response.ok) {
        setTdsCalculation(data)
        if (data.is_above_threshold) {
          toast.success('TDS calculated automatically!')
        }
      } else {
        console.error('TDS calculation error:', data.error)
        toast.error('TDS calculation failed')
      }
    } catch (error) {
      console.error('Error calculating TDS:', error)
      toast.error('TDS calculation failed')
    } finally {
      setTdsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        invoice: invoice.id,
        session_key: sessionKey,
        // Include TDS details if calculated
        ...(tdsCalculation?.is_above_threshold && {
          tds_amount: tdsCalculation.tds_amount,
          tds_percentage: tdsCalculation.tds_rate,
          tds_section: tdsCalculation.tds_section,
          net_amount_received: tdsCalculation.net_amount
        })
      }

      await apiClient.createFinancePayment(payload)
      toast.success('Payment recorded successfully with TDS compliance!')
      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error creating payment:', error)
      toast.error(error.response?.data?.message || 'Failed to record payment')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getSelectedSectionInfo = () => {
    return tdsSections.find(section => section.code === formData.tds_section)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Record Payment with TDS Compliance
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Invoice: {invoice?.invoice_number} | Outstanding: {formatCurrency(invoice?.outstanding_amount || 0)}
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
          {/* TDS Calculation Section */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100 flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Automatic TDS Calculation
              </h3>
              <button
                type="button"
                onClick={calculateTDS}
                disabled={tdsLoading}
                className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                {tdsLoading ? 'Calculating...' : 'Recalculate'}
              </button>
            </div>

            {/* TDS Section Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-700 dark:text-purple-300 mb-2">
                TDS Section
              </label>
              <select
                value={formData.tds_section}
                onChange={(e) => setFormData(prev => ({ ...prev, tds_section: e.target.value }))}
                className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {tdsSections.map(section => (
                  <option key={section.code} value={section.code}>
                    {section.code} - {section.description} ({section.rate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Section Info */}
            {formData.tds_section && (
              <div className="mb-4 p-3 bg-purple-100 dark:bg-purple-800 rounded-lg">
                {(() => {
                  const sectionInfo = getSelectedSectionInfo()
                  if (!sectionInfo) return null
                  
                  return (
                    <div className="space-y-2">
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                        Section {sectionInfo.code}: {sectionInfo.description}
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-purple-700 dark:text-purple-300">TDS Rate:</span>
                          <span className="ml-2 font-semibold">{sectionInfo.rate}%</span>
                        </div>
                        <div>
                          <span className="text-purple-700 dark:text-purple-300">Threshold:</span>
                          <span className="ml-2 font-semibold">{formatCurrency(sectionInfo.threshold)}</span>
                        </div>
                      </div>
                      {formData.amount > 0 && formData.amount < sectionInfo.threshold && (
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800 p-2 rounded">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="text-sm">
                            Payment amount is below threshold. TDS may not be applicable.
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* TDS Calculation Results */}
            {tdsCalculation && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Payment Amount</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-white">
                      {formatCurrency(tdsCalculation.payment_amount)}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg border">
                    <p className="text-sm text-gray-600 dark:text-gray-400">TDS Amount ({tdsCalculation.tds_rate}%)</p>
                    <p className="text-xl font-semibold text-red-600">
                      -{formatCurrency(tdsCalculation.tds_amount)}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 dark:bg-green-800 rounded-lg border border-green-200 dark:border-green-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Net Amount Payable</p>
                    <p className="text-xl font-semibold text-green-600">
                      {formatCurrency(tdsCalculation.net_amount)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {tdsCalculation.is_above_threshold ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-300">
                        TDS applicable and calculated automatically
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span className="text-sm text-amber-700 dark:text-amber-300">
                        Below threshold - TDS not applicable
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Amount (₹) *
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0"
                step="0.01"
                max={invoice?.outstanding_amount}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Payment Method *
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Transaction/Cheque number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Bank name"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Payment notes..."
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
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              Record Payment with TDS
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EnhancedPaymentForm