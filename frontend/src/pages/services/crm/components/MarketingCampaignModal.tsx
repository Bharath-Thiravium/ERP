import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'
import { Modal } from '../../../../components/ui/Modal'

interface MarketingCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  campaign?: any
}

export const MarketingCampaignModal: React.FC<MarketingCampaignModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  campaign 
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    campaign_type: 'email_blast',
    status: 'draft',
    description: '',
    start_date: '',
    end_date: '',
    email_template: ''
  })

  const campaignTypes = [
    { value: 'email_blast', label: 'Email Blast' },
    { value: 'drip_campaign', label: 'Drip Campaign' },
    { value: 'lead_nurture', label: 'Lead Nurture' },
    { value: 'event_promotion', label: 'Event Promotion' },
    { value: 'product_launch', label: 'Product Launch' },
    { value: 're_engagement', label: 'Re-engagement' }
  ]

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'running', label: 'Running' },
    { value: 'paused', label: 'Paused' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  React.useEffect(() => {
    if (isOpen && sessionKey) {
      loadTemplates()
    }
  }, [isOpen, sessionKey])

  React.useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        campaign_type: campaign.campaign_type || 'email_blast',
        status: campaign.status || 'draft',
        description: campaign.description || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        email_template: campaign.email_template?.toString() || ''
      })
    } else {
      setFormData({
        name: '',
        campaign_type: 'email_blast',
        status: 'draft',
        description: '',
        start_date: '',
        end_date: '',
        email_template: ''
      })
    }
  }, [campaign, isOpen])

  const loadTemplates = async () => {
    try {
      const response = await crmApi.getEmailTemplates(sessionKey!)
      setTemplates(response.data.results || response.data)
    } catch (error) {
      console.error('Error loading templates:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        email_template: formData.email_template ? parseInt(formData.email_template) : null
      }

      if (campaign) {
        await crmApi.updateMarketingCampaign(sessionKey, campaign.id, payload)
        toast.success('Campaign updated successfully!')
      } else {
        await crmApi.createMarketingCampaign(sessionKey, payload)
        toast.success('Campaign created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save campaign')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      className="max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
      bodyClassName="p-0"
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          {campaign ? 'Edit Marketing Campaign' : 'Create New Marketing Campaign'}
        </h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Campaign Name *
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
                Campaign Type
              </label>
              <select
                value={formData.campaign_type}
                onChange={(e) => setFormData(prev => ({ ...prev, campaign_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {campaignTypes.map(type => (
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Template
              </label>
              <select
                value={formData.email_template}
                onChange={(e) => setFormData(prev => ({ ...prev, email_template: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Template (Optional)</option>
                {templates.map(template => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Campaign description and objectives..."
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
              {loading ? 'Saving...' : (campaign ? 'Update Campaign' : 'Create Campaign')}
            </Button>
          </div>
      </form>
    </Modal>
  )
}
