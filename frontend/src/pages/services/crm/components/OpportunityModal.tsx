import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

interface OpportunityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  opportunity?: any
}

export const OpportunityModal: React.FC<OpportunityModalProps> = ({ isOpen, onClose, onSuccess, opportunity }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: '',
    account: '',
    contact: '',
    stage: 'prospecting',
    amount: '',
    probability: 25,
    expected_close_date: '',
    description: '',
    next_step: '',
    owner: ''
  })

  const stages = [
    { value: 'prospecting', label: 'Prospecting' },
    { value: 'qualification', label: 'Qualification' },
    { value: 'needs_analysis', label: 'Needs Analysis' },
    { value: 'proposal', label: 'Proposal/Price Quote' },
    { value: 'negotiation', label: 'Negotiation/Review' },
    { value: 'closed_won', label: 'Closed Won' },
    { value: 'closed_lost', label: 'Closed Lost' }
  ]

  const probabilities = [10, 25, 50, 75, 90, 100]

  useEffect(() => {
    if (isOpen && sessionKey!) {
      fetchAccounts()
      fetchContacts()
      fetchUsers()
    }
  }, [isOpen, sessionKey])

  const fetchAccounts = async () => {
    try {
      const response = await crmApi.getAccounts(sessionKey!)
      setAccounts(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const fetchContacts = async () => {
    try {
      const response = await crmApi.getContacts(sessionKey!)
      setContacts(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching contacts:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const { serviceUser } = useServiceUserStore.getState()
      
      // Since backend will handle the owner assignment automatically,
      // we just need to show a placeholder user for the UI
      const currentUser = {
        id: 'auto', // Special value that backend will replace
        first_name: serviceUser?.full_name?.split(' ')[0] || 'Current',
        last_name: serviceUser?.full_name?.split(' ').slice(1).join(' ') || 'User',
        username: 'user',
        display_name: serviceUser?.full_name || 'Current User'
      }
      
      setUsers([currentUser])
      
      // Set default owner for new opportunities
      if (!opportunity) {
        setFormData(prev => ({ ...prev, owner: 'auto' }))
      }
      
    } catch (error) {
      console.error('Error setting up users:', error)
      // Fallback user
      const fallbackUser = {
        id: 'auto',
        first_name: 'Current',
        last_name: 'User',
        username: 'user',
        display_name: 'Current User'
      }
      setUsers([fallbackUser])
      if (!opportunity) {
        setFormData(prev => ({ ...prev, owner: 'auto' }))
      }
    }
  }

  React.useEffect(() => {
    if (opportunity) {
      setFormData({
        name: opportunity.name || '',
        account: opportunity.account?.id || opportunity.account || '',
        contact: opportunity.contact?.id || opportunity.contact || '',
        stage: opportunity.stage || 'prospecting',
        amount: opportunity.amount?.toString() || '',
        probability: opportunity.probability || 25,
        expected_close_date: opportunity.expected_close_date || '',
        description: opportunity.description || '',
        next_step: opportunity.next_step || '',
        owner: opportunity.owner?.id || opportunity.owner || ''
      })
    } else {
      setFormData({
        name: '',
        account: '',
        contact: '',
        stage: 'prospecting',
        amount: '',
        probability: 25,
        expected_close_date: '',
        description: '',
        next_step: '',
        owner: ''
      })
    }
  }, [opportunity, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey!) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        account: parseInt(formData.account),
        contact: formData.contact ? parseInt(formData.contact) : null,
        owner: 'auto' // Send 'auto' and let backend replace with correct user ID
      }

      if (opportunity) {
        await crmApi.updateOpportunity(sessionKey!, opportunity.id, payload)
        toast.success('Opportunity updated successfully!')
      } else {
        await crmApi.createOpportunity(sessionKey!, payload)
        toast.success('Opportunity created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save opportunity')
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
            {opportunity ? 'Edit Opportunity' : 'Create New Opportunity'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Opportunity Name *
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
                Account *
              </label>
              <select
                required
                value={formData.account}
                onChange={(e) => setFormData(prev => ({ ...prev, account: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Account</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>{account.name}</option>
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
                Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData(prev => ({ ...prev, stage: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {stages.map(stage => (
                  <option key={stage.value} value={stage.value}>{stage.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Probability (%)
              </label>
              <select
                value={formData.probability}
                onChange={(e) => setFormData(prev => ({ ...prev, probability: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {probabilities.map(prob => (
                  <option key={prob} value={prob}>{prob}%</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Owner *
              </label>
              <select
                required
                value={formData.owner}
                onChange={(e) => setFormData(prev => ({ ...prev, owner: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select Owner</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name} ({user.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expected Close Date *
              </label>
              <input
                type="date"
                required
                value={formData.expected_close_date}
                onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
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
              {loading ? 'Saving...' : (opportunity ? 'Update Opportunity' : 'Create Opportunity')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}