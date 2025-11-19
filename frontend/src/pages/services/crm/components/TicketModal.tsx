import React, { useState, useEffect } from 'react'
import { X, Ticket } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

interface TicketModalProps {
  isOpen: boolean
  onClose: () => void
  ticket?: any
  onSave: () => void
}

export const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, ticket, onSave }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    source: 'web',
    contact: '',
    account: '',
    category: ''
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
      if (ticket) {
        setFormData({
          subject: ticket.subject || '',
          description: ticket.description || '',
          priority: ticket.priority || 'medium',
          source: ticket.source || 'web',
          contact: ticket.contact || '',
          account: ticket.account || '',
          category: ticket.category || ''
        })
      } else {
        setFormData({
          subject: '',
          description: '',
          priority: 'medium',
          source: 'web',
          contact: '',
          account: '',
          category: ''
        })
      }
    }
  }, [isOpen, ticket])

  const fetchData = async () => {
    try {
      const [contactsRes, accountsRes] = await Promise.all([
        crmApi.getContacts(sessionKey!),
        crmApi.getAccounts(sessionKey!)
      ])
      setContacts(contactsRes.data.results || contactsRes.data || [])
      setAccounts(accountsRes.data.results || accountsRes.data || [])
      
      // Fetch categories from API
      try {
        const categoriesRes = await crmApi.getTicketCategories(sessionKey!)
        const apiCategories = categoriesRes.data.results || categoriesRes.data || []
        setCategories(apiCategories)
        
        // If no categories exist, create default ones
        if (apiCategories.length === 0) {
          await createDefaultCategories()
        }
      } catch (categoryError) {
        console.error('Error fetching categories:', categoryError)
        // Try to create default categories
        await createDefaultCategories()
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }

  const createDefaultCategories = async () => {
    const defaultCategories = [
      { name: 'Technical Support', description: 'Technical issues and support requests', color: '#3B82F6', is_active: true },
      { name: 'Billing & Payment', description: 'Billing and payment related inquiries', color: '#10B981', is_active: true },
      { name: 'General Inquiry', description: 'General questions and information requests', color: '#8B5CF6', is_active: true },
      { name: 'Feature Request', description: 'New feature requests and suggestions', color: '#F59E0B', is_active: true },
      { name: 'Bug Report', description: 'Bug reports and technical issues', color: '#EF4444', is_active: true },
      { name: 'Account Issues', description: 'Account access and management issues', color: '#6B7280', is_active: true }
    ]

    try {
      const createdCategories = []
      for (const category of defaultCategories) {
        try {
          const response = await crmApi.createTicketCategory(sessionKey!, category)
          createdCategories.push(response.data)
        } catch (error) {
          console.error('Error creating category:', category.name, error)
        }
      }
      if (createdCategories.length > 0) {
        setCategories(createdCategories)
      }
    } catch (error) {
      console.error('Error creating default categories:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.subject || !formData.description || !formData.contact) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)
    try {
      // Prepare form data with proper type conversion
      const submitData: any = {
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority,
        source: formData.source,
        contact: parseInt(formData.contact),
        account: formData.account ? parseInt(formData.account) : null
      }
      
      // Handle category field - only include if selected
      if (formData.category) {
        submitData.category = parseInt(formData.category)
      }
      
      // Remove null/empty fields
      if (!submitData.account) {
        delete submitData.account
      }

      if (ticket) {
        await crmApi.updateTicket(sessionKey!, ticket.id, submitData)
        toast.success('Ticket updated successfully')
      } else {
        await crmApi.createTicket(sessionKey!, submitData)
        toast.success('Ticket created successfully')
      }
      onSave()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save ticket')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <Ticket className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {ticket ? 'Edit Ticket' : 'Create New Ticket'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {ticket ? `Ticket ID: ${ticket.ticket_id}` : 'Create a new support ticket'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Brief description of the issue"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              placeholder="Detailed description of the issue"
              required
            />
          </div>

          {/* Priority and Source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="email">Email</option>
                <option value="web">Web Form</option>
                <option value="phone">Phone</option>
                <option value="chat">Live Chat</option>
                <option value="social">Social Media</option>
              </select>
            </div>
          </div>

          {/* Contact and Account */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact *
              </label>
              <select
                value={formData.contact}
                onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              >
                <option value="">Select Contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.first_name} {contact.last_name} - {contact.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account
              </label>
              <select
                value={formData.account}
                onChange={(e) => setFormData(prev => ({ ...prev, account: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Select Account</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Select Category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {ticket ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Ticket className="h-4 w-4 mr-2" />
                  {ticket ? 'Update Ticket' : 'Create Ticket'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}