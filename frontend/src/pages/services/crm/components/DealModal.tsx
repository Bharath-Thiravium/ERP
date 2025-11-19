import React, { useState, useEffect } from 'react'
import { Button } from '../../../../components/ui/Button'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

// Define interfaces locally since types file might not exist
interface Deal {
  id: number
  name: string
  account: number
  contact?: number
  current_stage: number
  value: number
  probability: number
  expected_close_date: string
  description?: string
  next_action?: string
}

interface Account {
  id: number
  name: string
  primary_contact?: number
}

interface Contact {
  id: number
  first_name: string
  last_name: string
  full_name?: string
}

interface PipelineStage {
  id: number
  name: string
}

interface DealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  sessionKey: string
  deal?: Deal | null
}

export const DealModal: React.FC<DealModalProps> = ({
  isOpen,
  onClose,
  onSave,
  sessionKey,
  deal
}) => {
  const [formData, setFormData] = useState({
    name: '',
    account: '',
    contact: '',
    current_stage: '',
    value: '',
    probability: '',
    expected_close_date: '',
    description: '',
    next_action: ''
  })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (isOpen) {
      loadData()
      if (deal) {
        setFormData({
          name: deal.name,
          account: deal.account.toString(),
          contact: deal.contact?.toString() || '',
          current_stage: deal.current_stage.toString(),
          value: deal.value.toString(),
          probability: deal.probability.toString(),
          expected_close_date: deal.expected_close_date,
          description: deal.description || '',
          next_action: deal.next_action || ''
        })
      } else {
        setFormData({
          name: '',
          account: '',
          contact: '',
          current_stage: '',
          value: '',
          probability: '25',
          expected_close_date: '',
          description: '',
          next_action: ''
        })
      }
    }
  }, [isOpen, deal])

  const loadData = async () => {
    try {
      const [accountsRes, contactsRes, stagesRes] = await Promise.all([
        crmApi.getAccounts(sessionKey),
        crmApi.getContacts(sessionKey),
        crmApi.getPipelineStages(sessionKey)
      ])
      
      setAccounts(accountsRes.data.results || accountsRes.data)
      setContacts(contactsRes.data.results || contactsRes.data)
      setStages(stagesRes.data.results || stagesRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Deal name is required'
    }
    if (!formData.account) {
      newErrors.account = 'Account is required'
    }
    if (!formData.current_stage) {
      newErrors.current_stage = 'Pipeline stage is required'
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      newErrors.value = 'Valid deal value is required'
    }
    if (!formData.expected_close_date) {
      newErrors.expected_close_date = 'Expected close date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const dealData = {
        ...formData,
        account: parseInt(formData.account),
        contact: formData.contact ? parseInt(formData.contact) : null,
        current_stage: parseInt(formData.current_stage),
        value: parseFloat(formData.value),
        probability: parseInt(formData.probability)
      }

      if (deal) {
        await crmApi.updateDeal(sessionKey, deal.id, dealData)
      } else {
        await crmApi.createDeal(sessionKey, dealData)
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving deal:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show all contacts since there's no direct account-contact relationship
  // Only filter to primary contact if specifically needed
  const filteredContacts = contacts

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{deal ? 'Edit Deal' : 'Create New Deal'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deal Name *</label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter deal name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="account" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account *</label>
              <select 
                id="account"
                value={formData.account} 
                onChange={(e) => handleInputChange('account', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id.toString()}>
                    {account.name}
                  </option>
                ))}
              </select>
              {errors.account && <p className="text-sm text-red-500">{errors.account}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Primary Contact</label>
              <select 
                id="contact"
                value={formData.contact} 
                onChange={(e) => handleInputChange('contact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select contact</option>
                {filteredContacts.map((contact) => (
                  <option key={contact.id} value={contact.id.toString()}>
                    {contact.full_name || `${contact.first_name} ${contact.last_name}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="current_stage" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pipeline Stage *</label>
              <select 
                id="current_stage"
                value={formData.current_stage} 
                onChange={(e) => handleInputChange('current_stage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select stage</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id.toString()}>
                    {stage.name}
                  </option>
                ))}
              </select>
              {errors.current_stage && <p className="text-sm text-red-500">{errors.current_stage}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="value" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Deal Value *</label>
              <input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => handleInputChange('value', e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              {errors.value && <p className="text-sm text-red-500">{errors.value}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="probability" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Probability (%)</label>
              <select 
                id="probability"
                value={formData.probability} 
                onChange={(e) => handleInputChange('probability', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="10">10%</option>
                <option value="25">25%</option>
                <option value="50">50%</option>
                <option value="75">75%</option>
                <option value="90">90%</option>
                <option value="100">100%</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="expected_close_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expected Close Date *</label>
              <input
                id="expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => handleInputChange('expected_close_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              {errors.expected_close_date && <p className="text-sm text-red-500">{errors.expected_close_date}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="next_action" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Next Action</label>
              <input
                id="next_action"
                type="text"
                value={formData.next_action}
                onChange={(e) => handleInputChange('next_action', e.target.value)}
                placeholder="What's the next step?"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Deal description and notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : deal ? 'Update Deal' : 'Create Deal'}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  )
}