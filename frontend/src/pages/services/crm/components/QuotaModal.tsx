import React, { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { crmApi } from '../utils/api'
import { Modal } from '../../../../components/ui/Modal'

interface QuotaModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  sessionKey: string
}

export const QuotaModal: React.FC<QuotaModalProps> = ({ isOpen, onClose, onSave, sessionKey }) => {
  const [formData, setFormData] = useState({
    period: 'monthly',
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString(),
    quarter: '1',
    quota_amount: '',
    deals_target: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const quotaData = {
        ...formData,
        year: parseInt(formData.year),
        month: formData.period === 'monthly' ? parseInt(formData.month) : null,
        quarter: formData.period === 'quarterly' ? parseInt(formData.quarter) : null,
        quota_amount: parseFloat(formData.quota_amount),
        deals_target: parseInt(formData.deals_target),
        user: 'auto' // Let backend assign current user
      }
      await crmApi.createSalesQuota(sessionKey!, quotaData)
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving quota:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      className="max-w-md"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Set Sales Quota</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Period</label>
              <select 
                value={formData.period} 
                onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Year</label>
                <Input
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                />
              </div>

              {formData.period === 'monthly' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Month</label>
                  <select 
                    value={formData.month} 
                    onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={(i + 1).toString()}>
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.period === 'quarterly' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quarter</label>
                  <select 
                    value={formData.quarter} 
                    onChange={(e) => setFormData(prev => ({ ...prev, quarter: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="1">Q1</option>
                    <option value="2">Q2</option>
                    <option value="3">Q3</option>
                    <option value="4">Q4</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Quota Amount</label>
              <Input
                type="number"
                step="0.01"
                value={formData.quota_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, quota_amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deals Target</label>
              <Input
                type="number"
                value={formData.deals_target}
                onChange={(e) => setFormData(prev => ({ ...prev, deals_target: e.target.value }))}
                placeholder="Number of deals"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Set Quota'}
              </Button>
            </div>
      </form>
    </Modal>
  )
}
