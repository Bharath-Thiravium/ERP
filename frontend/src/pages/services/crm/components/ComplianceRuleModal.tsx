import React, { useState } from 'react'
import { X, Shield } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'
import { Modal } from '../../../../components/ui/Modal'

interface ComplianceRuleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  rule?: any
}

export const ComplianceRuleModal: React.FC<ComplianceRuleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rule
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    rule_type: rule?.rule_type || 'gdpr',
    description: rule?.description || '',
    conditions: rule?.conditions || {},
    actions: rule?.actions || [],
    status: rule?.status || 'draft'
  })

  const ruleTypes = [
    { value: 'gdpr', label: 'GDPR' },
    { value: 'ccpa', label: 'CCPA' },
    { value: 'hipaa', label: 'HIPAA' },
    { value: 'sox', label: 'SOX' },
    { value: 'custom', label: 'Custom' }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    setLoading(true)
    try {
      if (rule) {
        await crmApi.updateComplianceRule(sessionKey, rule.id, formData)
        toast.success('Compliance rule updated successfully!')
      } else {
        await crmApi.createComplianceRule(sessionKey, formData)
        toast.success('Compliance rule created successfully!')
      }
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Failed to save compliance rule')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl"
      bodyClassName="p-0"
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <Shield className="h-6 w-6 text-blue-500 mr-3" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {rule ? 'Edit Compliance Rule' : 'Add New Compliance Rule'}
          </h2>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-6 w-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., Data Retention Policy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rule Type *
              </label>
              <select
                name="rule_type"
                value={formData.rule_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {ruleTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Describe the compliance rule and its purpose..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
            </button>
          </div>
      </form>
    </Modal>
  )
}
