import React, { useState } from 'react'
import { X, Plug } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'
import { Modal } from '../../../../components/ui/Modal'

interface IntegrationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  integration?: any
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  integration
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: integration?.name || '',
    integration_type: integration?.integration_type || 'email_service',
    provider: integration?.provider || '',
    api_endpoint: integration?.api_endpoint || '',
    api_key: integration?.api_key || '',
    webhook_url: integration?.webhook_url || '',
    sync_frequency: integration?.sync_frequency || 60,
    status: integration?.status || 'pending'
  })

  const integrationTypes = [
    { value: 'email_service', label: 'Email Service' },
    { value: 'calendar', label: 'Calendar' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'accounting', label: 'Accounting' },
    { value: 'payment', label: 'Payment Gateway' },
    { value: 'telephony', label: 'Telephony' },
    { value: 'marketing', label: 'Marketing Platform' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'storage', label: 'Cloud Storage' },
    { value: 'custom', label: 'Custom API' }
  ]

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending Setup' },
    { value: 'error', label: 'Error' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    setLoading(true)
    try {
      if (integration) {
        await crmApi.updateIntegration(sessionKey, integration.id, formData)
        toast.success('Integration updated successfully!')
      } else {
        await crmApi.createIntegration(sessionKey, formData)
        toast.success('Integration created successfully!')
      }
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Failed to save integration')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'sync_frequency' ? parseInt(value) || 60 : value
    }))
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-2xl"
      bodyClassName="p-0"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Plug className="h-6 w-6 text-orange-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {integration ? 'Edit Integration' : 'Add New Integration'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Integration Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., Gmail Integration"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Integration Type *
              </label>
              <select
                name="integration_type"
                value={formData.integration_type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {integrationTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider *
              </label>
              <input
                type="text"
                name="provider"
                value={formData.provider}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="e.g., Gmail, Outlook, Slack"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Endpoint
              </label>
              <input
                type="url"
                name="api_endpoint"
                value={formData.api_endpoint}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://api.example.com/v1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sync Frequency (minutes)
              </label>
              <input
                type="number"
                name="sync_frequency"
                value={formData.sync_frequency}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                name="api_key"
                value={formData.api_key}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter API key or token"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Webhook URL
              </label>
              <input
                type="url"
                name="webhook_url"
                value={formData.webhook_url}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="https://your-app.com/webhooks/integration"
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
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Saving...' : integration ? 'Update Integration' : 'Create Integration'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
