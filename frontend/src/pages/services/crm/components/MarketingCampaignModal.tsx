import React, { useEffect, useMemo, useState } from 'react'
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
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [templates, setTemplates] = useState<any[]>([])
  const [crmCampaigns, setCrmCampaigns] = useState<any[]>([])
  const [formData, setFormData] = useState({
    crm_campaign: '',
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

  useEffect(() => {
    if (!isOpen || !sessionKey) return

    const loadOptions = async () => {
      try {
        setLoadingOptions(true)
        const [templateRes, campaignRes] = await Promise.all([
          crmApi.getEmailTemplates(sessionKey),
          crmApi.getCampaigns(sessionKey)
        ])
        setTemplates(templateRes.data.results || templateRes.data || [])
        setCrmCampaigns(campaignRes.data.results || campaignRes.data || [])
      } catch (error) {
        console.error('Error loading campaign run options:', error)
        toast.error('Failed to load campaigns/templates')
      } finally {
        setLoadingOptions(false)
      }
    }

    loadOptions()
  }, [isOpen, sessionKey])

  useEffect(() => {
    if (campaign) {
      setFormData({
        crm_campaign: campaign.crm_campaign?.toString() || '',
        campaign_type: campaign.campaign_type || 'email_blast',
        status: campaign.status || 'draft',
        description: campaign.description || '',
        start_date: campaign.start_date ? campaign.start_date.split('T')[0] : '',
        end_date: campaign.end_date ? campaign.end_date.split('T')[0] : '',
        email_template: campaign.email_template?.toString() || ''
      })
    } else {
      setFormData({
        crm_campaign: '',
        campaign_type: 'email_blast',
        status: 'draft',
        description: '',
        start_date: '',
        end_date: '',
        email_template: ''
      })
    }
  }, [campaign, isOpen])

  const selectedCrmCampaign = useMemo(
    () => crmCampaigns.find(item => item.id.toString() === formData.crm_campaign),
    [crmCampaigns, formData.crm_campaign]
  )

  const selectedTemplate = useMemo(
    () => templates.find(item => item.id.toString() === formData.email_template),
    [templates, formData.email_template]
  )

  const handleCampaignChange = (campaignId: string) => {
    const selected = crmCampaigns.find(item => item.id.toString() === campaignId)
    setFormData(prev => ({
      ...prev,
      crm_campaign: campaignId,
      start_date: selected?.start_date || prev.start_date,
      end_date: selected?.end_date || prev.end_date,
      description: prev.description || selected?.description || ''
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return
    if (!formData.crm_campaign) {
      toast.error('Select a campaign from Campaigns menu')
      return
    }
    if (!formData.email_template) {
      toast.error('Select an email template')
      return
    }

    setLoading(true)
    try {
      const runName = selectedCrmCampaign
        ? `${selectedCrmCampaign.name} - ${selectedTemplate?.name || 'Email Run'}`
        : campaign?.name || 'Email Run'

      const payload = {
        ...formData,
        name: runName,
        crm_campaign: parseInt(formData.crm_campaign),
        email_template: parseInt(formData.email_template)
      }

      if (campaign) {
        await crmApi.updateMarketingCampaign(sessionKey, campaign.id, payload)
        toast.success('Email run updated successfully!')
      } else {
        await crmApi.createMarketingCampaign(sessionKey, payload)
        toast.success('Email run created successfully!')
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to save email run')
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
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {campaign ? 'Edit Email Run' : 'Create Email Run'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Select a campaign from Campaigns menu, then attach an email template.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {loadingOptions && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Loading campaigns and templates...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Campaign *
            </label>
            <select
              required
              value={formData.crm_campaign}
              onChange={(e) => handleCampaignChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Select campaign with audience</option>
              {crmCampaigns.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.members_count || 0} audience)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Template *
            </label>
            <select
              required
              value={formData.email_template}
              onChange={(e) => setFormData(prev => ({ ...prev, email_template: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">Select Template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Run Type
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

        {selectedCrmCampaign && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            <div className="font-medium">{selectedCrmCampaign.name}</div>
            <div className="mt-1">
              Audience: {selectedCrmCampaign.members_count || 0} people. Launch will create email send records for audience members with email addresses.
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            placeholder="Email run notes..."
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
            {loading ? 'Saving...' : (campaign ? 'Update Email Run' : 'Create Email Run')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
