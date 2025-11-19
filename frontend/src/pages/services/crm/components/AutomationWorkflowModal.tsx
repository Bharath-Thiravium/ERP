import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

interface AutomationWorkflowModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  workflow?: any
}

export const AutomationWorkflowModal: React.FC<AutomationWorkflowModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  workflow 
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'lead_created',
    status: 'draft',
    description: '',
    trigger_conditions: '{}',
    actions: '[]'
  })

  const triggerTypes = [
    { value: 'lead_created', label: 'Lead Created' },
    { value: 'lead_status_change', label: 'Lead Status Change' },
    { value: 'deal_stage_change', label: 'Deal Stage Change' },
    { value: 'email_opened', label: 'Email Opened' },
    { value: 'email_clicked', label: 'Email Clicked' },
    { value: 'form_submitted', label: 'Form Submitted' },
    { value: 'date_based', label: 'Date Based' },
    { value: 'score_threshold', label: 'Score Threshold' }
  ]

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'active', label: 'Active' },
    { value: 'paused', label: 'Paused' }
  ]

  React.useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name || '',
        trigger_type: workflow.trigger_type || 'lead_created',
        status: workflow.status || 'draft',
        description: workflow.description || '',
        trigger_conditions: JSON.stringify(workflow.trigger_conditions || {}, null, 2),
        actions: JSON.stringify(workflow.actions || [], null, 2)
      })
    } else {
      setFormData({
        name: '',
        trigger_type: 'lead_created',
        status: 'draft',
        description: '',
        trigger_conditions: '{}',
        actions: '[]'
      })
    }
  }, [workflow, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        trigger_conditions: JSON.parse(formData.trigger_conditions),
        actions: JSON.parse(formData.actions)
      }

      if (workflow) {
        await crmApi.updateAutomationWorkflow(sessionKey, workflow.id, payload)
        toast.success('Workflow updated successfully!')
      } else {
        await crmApi.createAutomationWorkflow(sessionKey, payload)
        toast.success('Workflow created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save workflow')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {workflow ? 'Edit Automation Workflow' : 'Create New Automation Workflow'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Workflow Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Type
              </label>
              <select
                value={formData.trigger_type}
                onChange={(e) => setFormData(prev => ({ ...prev, trigger_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {triggerTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Describe what this workflow does..."
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              {loading ? 'Saving...' : (workflow ? 'Update Workflow' : 'Create Workflow')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}