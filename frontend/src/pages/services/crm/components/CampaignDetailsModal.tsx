import React, { useEffect, useState } from 'react'
import { Calendar, IndianRupee, Mail, Phone, Target, TrendingUp, Users, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../../components/ui/Button'
import { Modal } from '../../../../components/ui/Modal'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'

interface CampaignDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  campaign: any
}

export const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({ isOpen, onClose, campaign }) => {
  const { sessionKey } = useServiceUserStore()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !campaign || !sessionKey) return

    const loadMembers = async () => {
      try {
        setLoading(true)
        const response = await crmApi.getCampaignMembers(sessionKey, campaign.id)
        setMembers(response.data.results || response.data || [])
      } catch (error) {
        console.error('Error loading campaign members:', error)
        toast.error('Failed to load campaign audience')
      } finally {
        setLoading(false)
      }
    }

    loadMembers()
  }, [isOpen, campaign, sessionKey])

  if (!isOpen || !campaign) return null

  const leads = members.filter(member => member.lead)
  const contacts = members.filter(member => member.contact)

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      className="max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl"
      bodyClassName="p-0"
    >
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{campaign.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{campaign.campaign_id} - {campaign.campaign_type_display || campaign.campaign_type}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <Users className="mb-3 h-5 w-5 text-orange-500" />
            <p className="text-sm text-gray-500">Audience</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{members.length}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <Target className="mb-3 h-5 w-5 text-green-500" />
            <p className="text-sm text-gray-500">Leads Generated</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.leads_generated || 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <TrendingUp className="mb-3 h-5 w-5 text-blue-500" />
            <p className="text-sm text-gray-500">Opportunities</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.opportunities_created || 0}</p>
          </div>
          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <IndianRupee className="mb-3 h-5 w-5 text-purple-500" />
            <p className="text-sm text-gray-500">Revenue</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">₹{Number(campaign.revenue_generated || 0).toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
              <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Campaign Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <IndianRupee className="h-4 w-4 text-gray-400" />
                  Budget: ₹{Number(campaign.budget || 0).toLocaleString()}
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Status:</span> {campaign.status_display || campaign.status}
                </p>
                {campaign.target_audience && (
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Target:</span> {campaign.target_audience}
                  </p>
                )}
                {campaign.description && (
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Description:</span> {campaign.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Audience Members</h3>
            {loading ? (
              <p className="py-8 text-center text-sm text-gray-500">Loading audience...</p>
            ) : members.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-500">No audience added yet</p>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {members.map(member => {
                  const isLead = Boolean(member.lead)
                  const name = isLead ? member.lead_name : member.contact_name
                  const email = isLead ? member.lead_email : member.contact_email
                  return (
                    <div key={member.id} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-900 dark:text-white">{name || 'Unnamed audience'}</p>
                          {email && (
                            <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
                              <Mail className="h-3.5 w-3.5" />
                              {email}
                            </p>
                          )}
                        </div>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${isLead ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isLead ? 'Lead' : 'Contact'}
                        </span>
                      </div>
                      {member.status && (
                        <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="h-3 w-3" />
                          Status: {member.status}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Leads: {leads.length} / Contacts: {contacts.length}
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 p-6 dark:border-gray-700">
        <Button onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
