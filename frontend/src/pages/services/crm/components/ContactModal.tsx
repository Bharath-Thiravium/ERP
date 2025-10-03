import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  contact?: any
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, onSuccess, contact }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    mobile: '',
    job_title: '',
    department: '',
    address_line1: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    notes: ''
  })

  React.useEffect(() => {
    if (contact) {
      setFormData({
        first_name: contact.first_name || '',
        last_name: contact.last_name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        job_title: contact.job_title || '',
        department: contact.department || '',
        address_line1: contact.address_line1 || '',
        city: contact.city || '',
        state: contact.state || '',
        postal_code: contact.postal_code || '',
        country: contact.country || '',
        notes: contact.notes || ''
      })
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        mobile: '',
        job_title: '',
        department: '',
        address_line1: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        notes: ''
      })
    }
  }, [contact, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey!) return

    setLoading(true)
    try {
      if (contact) {
        await crmApi.updateContact(sessionKey!, contact.id, formData)
        toast.success('Contact updated successfully!')
      } else {
        await crmApi.createContact(sessionKey!, formData)
        toast.success('Contact created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save contact')
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
            {contact ? 'Edit Contact' : 'Create New Contact'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Job Title
              </label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData(prev => ({ ...prev, job_title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
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
              {loading ? 'Saving...' : (contact ? 'Update Contact' : 'Create Contact')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}