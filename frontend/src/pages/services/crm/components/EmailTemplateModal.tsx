import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import toast from 'react-hot-toast'

interface EmailTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  template?: any
}

export const EmailTemplateModal: React.FC<EmailTemplateModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  template 
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    template_type: 'welcome',
    subject: '',
    html_content: '',
    text_content: '',
    is_active: true
  })

  const templateTypes = [
    { value: 'welcome', label: 'Welcome Email' },
    { value: 'follow_up', label: 'Follow Up' },
    { value: 'newsletter', label: 'Newsletter' },
    { value: 'promotion', label: 'Promotional' },
    { value: 'nurture', label: 'Lead Nurture' },
    { value: 'event', label: 'Event Invitation' },
    { value: 'survey', label: 'Survey' },
    { value: 'custom', label: 'Custom' }
  ]

  React.useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || '',
        template_type: template.template_type || 'welcome',
        subject: template.subject || '',
        html_content: template.html_content || '',
        text_content: template.text_content || '',
        is_active: template.is_active !== undefined ? template.is_active : true
      })
    } else {
      setFormData({
        name: '',
        template_type: 'welcome',
        subject: '',
        html_content: '',
        text_content: '',
        is_active: true
      })
    }
  }, [template, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    setLoading(true)
    try {
      if (template) {
        await crmApi.updateEmailTemplate(sessionKey, template.id, formData)
        toast.success('Template updated successfully!')
      } else {
        await crmApi.createEmailTemplate(sessionKey, formData)
        toast.success('Template created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save template')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {template ? 'Edit Email Template' : 'Create New Email Template'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Template Name *
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
                Template Type
              </label>
              <select
                value={formData.template_type}
                onChange={(e) => setFormData(prev => ({ ...prev, template_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {templateTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subject Line *
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter email subject line..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              HTML Content *
            </label>
            <textarea
              rows={8}
              required
              value={formData.html_content}
              onChange={(e) => setFormData(prev => ({ ...prev, html_content: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              placeholder="Enter HTML email content..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Plain Text Content
            </label>
            <textarea
              rows={6}
              value={formData.text_content}
              onChange={(e) => setFormData(prev => ({ ...prev, text_content: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Enter plain text version (optional)..."
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Active Template
            </label>
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
              {loading ? 'Saving...' : (template ? 'Update Template' : 'Create Template')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}