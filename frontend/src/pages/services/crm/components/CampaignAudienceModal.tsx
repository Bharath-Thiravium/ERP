import React, { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../../../../components/ui/Button'
import { Modal } from '../../../../components/ui/Modal'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'

interface CampaignAudienceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  campaign: any
}

export const CampaignAudienceModal: React.FC<CampaignAudienceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  campaign
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'leads' | 'contacts'>('leads')
  const [searchTerm, setSearchTerm] = useState('')
  const [leads, setLeads] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([])
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([])

  useEffect(() => {
    if (!isOpen || !campaign || !sessionKey) return

    const loadAudienceData = async () => {
      try {
        setLoading(true)
        const [leadRes, contactRes, memberRes] = await Promise.all([
          crmApi.getLeads(sessionKey),
          crmApi.getContacts(sessionKey),
          crmApi.getCampaignMembers(sessionKey, campaign.id)
        ])
        setLeads(leadRes.data.results || leadRes.data || [])
        setContacts(contactRes.data.results || contactRes.data || [])
        setMembers(memberRes.data.results || memberRes.data || [])
      } catch (error) {
        console.error('Error loading campaign audience:', error)
        toast.error('Failed to load audience data')
      } finally {
        setLoading(false)
      }
    }

    setSearchTerm('')
    setSelectedLeadIds([])
    setSelectedContactIds([])
    loadAudienceData()
  }, [isOpen, campaign, sessionKey])

  const existingLeadIds = useMemo(
    () => new Set(members.filter(member => member.lead).map(member => member.lead)),
    [members]
  )

  const existingContactIds = useMemo(
    () => new Set(members.filter(member => member.contact).map(member => member.contact)),
    [members]
  )

  const filteredLeads = leads.filter(lead => {
    const name = `${lead.first_name || ''} ${lead.last_name || ''} ${lead.email || ''} ${lead.company_name || ''}`.toLowerCase()
    return name.includes(searchTerm.toLowerCase())
  })

  const filteredContacts = contacts.filter(contact => {
    const name = `${contact.first_name || ''} ${contact.last_name || ''} ${contact.email || ''} ${contact.company_name || ''}`.toLowerCase()
    return name.includes(searchTerm.toLowerCase())
  })

  const toggleLead = (id: number) => {
    setSelectedLeadIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const toggleContact = (id: number) => {
    setSelectedContactIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  }

  const handleSubmit = async () => {
    if (!sessionKey || !campaign) return
    if (selectedLeadIds.length === 0 && selectedContactIds.length === 0) {
      toast.error('Select at least one lead or contact')
      return
    }

    try {
      setSaving(true)
      await crmApi.addCampaignMembers(sessionKey, campaign.id, {
        lead_ids: selectedLeadIds,
        contact_ids: selectedContactIds
      })
      toast.success('Audience added to campaign')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding campaign audience:', error)
      toast.error('Failed to add audience')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !campaign) return null

  const selectedCount = selectedLeadIds.length + selectedContactIds.length

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
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Audience</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{campaign.name}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('leads')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'leads' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
            >
              Leads
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('contacts')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${activeTab === 'contacts' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}
            >
              Contacts
            </button>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search audience..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading audience...</div>
          ) : activeTab === 'leads' ? (
            filteredLeads.length > 0 ? filteredLeads.map(lead => {
              const disabled = existingLeadIds.has(lead.id)
              const checked = selectedLeadIds.includes(lead.id) || disabled
              return (
                <label key={lead.id} className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 p-4 last:border-0 dark:border-gray-800 ${disabled ? 'bg-gray-50 text-gray-400 dark:bg-gray-800/50' : 'hover:bg-orange-50 dark:hover:bg-gray-800'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleLead(lead.id)}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{lead.first_name} {lead.last_name}</p>
                    <p className="truncate text-sm text-gray-500">{lead.email || 'No email'} {lead.company_name ? `- ${lead.company_name}` : ''}</p>
                  </div>
                  {disabled && <span className="text-xs font-medium text-green-600">Already added</span>}
                </label>
              )
            }) : (
              <div className="p-8 text-center text-sm text-gray-500">No leads found</div>
            )
          ) : (
            filteredContacts.length > 0 ? filteredContacts.map(contact => {
              const disabled = existingContactIds.has(contact.id)
              const checked = selectedContactIds.includes(contact.id) || disabled
              return (
                <label key={contact.id} className={`flex cursor-pointer items-center gap-3 border-b border-gray-100 p-4 last:border-0 dark:border-gray-800 ${disabled ? 'bg-gray-50 text-gray-400 dark:bg-gray-800/50' : 'hover:bg-orange-50 dark:hover:bg-gray-800'}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleContact(contact.id)}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{contact.first_name} {contact.last_name}</p>
                    <p className="truncate text-sm text-gray-500">{contact.email || 'No email'} {contact.phone ? `- ${contact.phone}` : ''}</p>
                  </div>
                  {disabled && <span className="text-xs font-medium text-green-600">Already added</span>}
                </label>
              )
            }) : (
              <div className="p-8 text-center text-sm text-gray-500">No contacts found</div>
            )
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 p-6 dark:border-gray-700">
        <p className="text-sm text-gray-500">{selectedCount} selected</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {saving ? 'Adding...' : 'Add Audience'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
