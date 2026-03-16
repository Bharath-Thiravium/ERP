import React from 'react'
import { X, Calendar, Mail, TrendingUp } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Modal } from '../../../../components/ui/Modal'

interface CampaignViewModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: any
}

export const CampaignViewModal: React.FC<CampaignViewModalProps> = ({ 
  isOpen, 
  onClose, 
  campaign 
}) => {
  if (!isOpen || !campaign) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'draft': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

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
            {campaign.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(campaign.status)} text-white`}>
              {campaign.status}
            </span>
            <span className="text-sm text-gray-600">
              {campaign.campaign_type_display || 'Email Campaign'}
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Campaign Period</p>
                  <p className="text-sm text-gray-600">
                    {new Date(campaign.start_date).toLocaleDateString()} - {campaign.end_date ? new Date(campaign.end_date).toLocaleDateString() : 'Ongoing'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Email Template</p>
                  <p className="text-sm text-gray-600">
                    {campaign.email_template_name || 'No template selected'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Campaign Metrics
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Sent</span>
                    <span className="text-sm font-medium">{campaign.total_sent || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Delivered</span>
                    <span className="text-sm font-medium">{campaign.total_delivered || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Opened</span>
                    <span className="text-sm font-medium">{campaign.total_opened || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Clicked</span>
                    <span className="text-sm font-medium">{campaign.total_clicked || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Open Rate</span>
                    <span className="text-sm font-medium">{Number(campaign.open_rate || 0).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Click Rate</span>
                    <span className="text-sm font-medium">{Number(campaign.click_rate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {campaign.description && (
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                {campaign.description}
              </p>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
            Created: {new Date(campaign.created_at).toLocaleDateString()}
          </div>
      </div>

      <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
