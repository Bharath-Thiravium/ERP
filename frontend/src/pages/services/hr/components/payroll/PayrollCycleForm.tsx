import React, { useState } from 'react'
import { Save, Calendar, DollarSign } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface PayrollCycleFormProps {
  onSuccess: () => void
  onCancel: () => void
}

const PayrollCycleForm: React.FC<PayrollCycleFormProps> = ({ onSuccess, onCancel }) => {
  const { sessionKey } = useServiceUserStore()
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    period_type: 'monthly',
    start_date: '',
    end_date: '',
    pay_date: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!sessionKey) {
      toast.error('Session expired. Please login again.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        session_key: sessionKey
      }

      await api.post('/api/hr/payroll/', payload, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success('Payroll cycle created successfully')
      onSuccess()
    } catch (error: any) {
      console.error('Error creating payroll cycle:', error)
      toast.error(error.response?.data?.error || 'Failed to create payroll cycle')
    } finally {
      setSaving(false)
    }
  }

  const generateCycleName = () => {
    if (formData.start_date) {
      const date = new Date(formData.start_date)
      const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      setFormData({ ...formData, name: `Payroll - ${monthYear}` })
    }
  }

  const handleStartDateChange = (date: string) => {
    setFormData({ ...formData, start_date: date })
    
    if (date && formData.period_type === 'monthly') {
      const startDate = new Date(date)
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0) // Last day of month
      const payDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 5) // 5th of next month
      
      setFormData({
        ...formData,
        start_date: date,
        end_date: endDate.toISOString().split('T')[0],
        pay_date: payDate.toISOString().split('T')[0]
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Create New Payroll Cycle
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Set up a new payroll processing cycle for your employees
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            <span>Payroll Cycle Details</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cycle Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cycle Name *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g., Payroll - January 2024"
                    required
                  />
                  <Button
                    type="button"
                    onClick={generateCycleName}
                    variant="outline"
                    disabled={!formData.start_date}
                  >
                    Auto Generate
                  </Button>
                </div>
              </div>

              {/* Period Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Period Type *
                </label>
                <select
                  value={formData.period_type}
                  onChange={(e) => setFormData({ ...formData, period_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi_weekly">Bi-Weekly</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {/* Pay Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pay Date *
                </label>
                <input
                  type="date"
                  value={formData.pay_date}
                  onChange={(e) => setFormData({ ...formData, pay_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Payroll Cycle Information</h4>
              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                <li>• The system will automatically calculate salaries based on attendance data</li>
                <li>• Statutory deductions (PF, ESI, PT, TDS) will be applied as per company settings</li>
                <li>• You can review and approve payslips before processing payments</li>
                <li>• All calculations follow Indian labor law compliance</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Creating...' : 'Create Payroll Cycle'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default PayrollCycleForm