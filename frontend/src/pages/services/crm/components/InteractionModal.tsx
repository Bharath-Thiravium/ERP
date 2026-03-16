import React, { useState, useEffect } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { crmApi } from '../utils/api'
import { Account, Contact, Deal } from '../types'
import { Modal } from '../../../../components/ui/Modal'

interface InteractionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  sessionKey: string
}

export const InteractionModal: React.FC<InteractionModalProps> = ({ isOpen, onClose, onSave, sessionKey }) => {
  const [formData, setFormData] = useState({
    subject: '',
    interaction_type: 'call',
    account: '',
    contact: '',
    deal: '',
    interaction_date: new Date().toISOString().split('T')[0],
    duration_minutes: '',
    description: '',
    outcome: ''
  })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [accountsRes, contactsRes, dealsRes] = await Promise.all([
        crmApi.getAccounts(sessionKey!),
        crmApi.getContacts(sessionKey!),
        crmApi.getDeals(sessionKey!)
      ])
      setAccounts(accountsRes.data.results || accountsRes.data)
      setContacts(contactsRes.data.results || contactsRes.data)
      setDeals(dealsRes.data.results || dealsRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const interactionData = {
        ...formData,
        account: parseInt(formData.account),
        contact: parseInt(formData.contact),
        deal: formData.deal ? parseInt(formData.deal) : null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        interaction_date: new Date(formData.interaction_date).toISOString()
      }
      await crmApi.createCustomerInteraction(sessionKey!, interactionData)
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving interaction:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-2xl"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Log Customer Interaction</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject *</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Interaction subject"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select 
                  value={formData.interaction_type} 
                  onChange={(e) => setFormData(prev => ({ ...prev, interaction_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="call">Phone Call</option>
                  <option value="email">Email</option>
                  <option value="meeting">Meeting</option>
                  <option value="demo">Product Demo</option>
                  <option value="support">Support Request</option>
                  <option value="purchase">Purchase</option>
                  <option value="website_visit">Website Visit</option>
                  <option value="social_media">Social Media</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account *</label>
                <select 
                  value={formData.account} 
                  onChange={(e) => setFormData(prev => ({ ...prev, account: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id.toString()}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact *</label>
                <select 
                  value={formData.contact} 
                  onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id.toString()}>
                      {contact.full_name || `${contact.first_name} ${contact.last_name}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Related Deal</label>
                <select 
                  value={formData.deal} 
                  onChange={(e) => setFormData(prev => ({ ...prev, deal: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select deal</option>
                  {deals.map((deal) => (
                    <option key={deal.id} value={deal.id.toString()}>
                      {deal.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                <Input
                  type="date"
                  value={formData.interaction_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, interaction_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration (minutes)</label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Interaction details"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Outcome</label>
              <textarea
                value={formData.outcome}
                onChange={(e) => setFormData(prev => ({ ...prev, outcome: e.target.value }))}
                placeholder="What was the result?"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Log Interaction'}
              </Button>
            </div>
      </form>
    </Modal>
  )
}
