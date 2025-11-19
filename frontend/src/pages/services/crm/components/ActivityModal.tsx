import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

interface ActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  activity?: any
}

export const ActivityModal: React.FC<ActivityModalProps> = ({ isOpen, onClose, onSuccess, activity }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [leads, setLeads] = useState([])
  const [contacts, setContacts] = useState([])
  const [formData, setFormData] = useState({
    subject: '',
    activity_type: 'call',
    status: 'planned',
    lead: '',
    contact: '',
    account: '',
    opportunity: '',
    assigned_to: '',
    due_date: '',
    duration_minutes: 30,
    description: ''
  })

  const activityTypes = [
    { value: 'call', label: 'Phone Call' },
    { value: 'email', label: 'Email' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'task', label: 'Task' },
    { value: 'note', label: 'Note' },
    { value: 'demo', label: 'Demo' },
    { value: 'proposal', label: 'Proposal' }
  ]

  const statusOptions = [
    { value: 'planned', label: 'Planned' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  useEffect(() => {
    if (isOpen && sessionKey!) {
      fetchRelatedData()
    }
  }, [isOpen, sessionKey])

  const fetchRelatedData = async () => {
    try {
      const [leadsRes, contactsRes] = await Promise.all([
        crmApi.getLeads(sessionKey!),
        crmApi.getContacts(sessionKey!)
      ])
      
      setLeads(leadsRes.data.results || leadsRes.data)
      setContacts(contactsRes.data.results || contactsRes.data)
      
      // Set current user as default assigned_to
      if (!activity && leads.length > 0) {
        setFormData(prev => ({ ...prev, assigned_to: 'auto' }))
      }
    } catch (error) {
      console.error('Error fetching related data:', error)
    }
  }

  React.useEffect(() => {
    if (activity) {
      const dueDate = activity.due_date ? new Date(activity.due_date).toISOString().slice(0, 16) : ''
      setFormData({
        subject: activity.subject || '',
        activity_type: activity.activity_type || 'call',
        status: activity.status || 'planned',
        lead: activity.lead?.id || '',
        contact: activity.contact?.id || '',
        account: activity.account?.id || '',
        opportunity: activity.opportunity?.id || '',
        assigned_to: activity.assigned_to || activity.created_by || 'auto',
        due_date: dueDate,
        duration_minutes: activity.duration_minutes || 30,
        description: activity.description || ''
      })
    } else {
      setFormData({
        subject: '',
        activity_type: 'call',
        status: 'planned',
        lead: '',
        contact: '',
        account: '',
        opportunity: '',
        assigned_to: 'auto',
        due_date: '',
        duration_minutes: 30,
        description: ''
      })
    }
  }, [activity, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey!) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        lead: formData.lead ? parseInt(formData.lead) : null,
        contact: formData.contact ? parseInt(formData.contact) : null,
        account: formData.account ? parseInt(formData.account) : null,
        opportunity: formData.opportunity ? parseInt(formData.opportunity) : null,
        assigned_to: activity?.assigned_to || activity?.created_by || (activity ? activity.assigned_to : null),
        due_date: new Date(formData.due_date).toISOString()
      }

      if (activity) {
        await crmApi.updateActivity(sessionKey!, activity.id, payload)
        toast.success('Activity updated successfully!')
      } else {
        await crmApi.createActivity(sessionKey!, payload)
        toast.success('Activity created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save activity')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {activity ? 'Edit Activity' : 'Create New Activity'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Activity Type
              </label>
              <select
                value={formData.activity_type}
                onChange={(e) => setFormData(prev => ({ ...prev, activity_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {activityTypes.map(type => (
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
                Due Date *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Lead
              </label>
              <select
                value={formData.lead}
                onChange={(e) => setFormData(prev => ({ ...prev, lead: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Lead</option>
                {leads.map((lead: any) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.first_name} {lead.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact
              </label>
              <select
                value={formData.contact}
                onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Contact</option>
                {contacts.map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Assigned To *
              </label>
              <select
                value={formData.assigned_to}
                onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="auto">Auto Assign (Current User)</option>
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
              {loading ? 'Saving...' : (activity ? 'Update Activity' : 'Create Activity')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}