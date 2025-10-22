import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, Key, Shield, Save, Info
} from 'lucide-react'
import { apiClient } from '../../../lib/api'
import { Button } from '../../ui/Button'
import toast from 'react-hot-toast'

interface EditCredentialModalProps {
  isOpen: boolean
  onClose: () => void
  credential: any
}

const EditCredentialModal: React.FC<EditCredentialModalProps> = ({ isOpen, onClose, credential }) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    credential_name: '',
    description: '',
    base_url: '',
    client_id_plain: '',
    client_secret_plain: '',
    username_plain: '',
    password_plain: '',
    api_key_plain: '',
    gstin_plain: '',
    pan_plain: '',
    tan_plain: '',
    is_active: false
  })


  // Fetch API templates
  const { data: apiTemplates } = useQuery({
    queryKey: ['api-templates'],
    queryFn: () => apiClient.get('/api/company-dashboard/government-api/api-templates/'),
    enabled: isOpen
  })

  const templatesData = apiTemplates?.data || {}

  // Pre-fill form when credential changes
  useEffect(() => {
    if (credential && isOpen) {
      setFormData({
        credential_name: credential.credential_name || '',
        description: credential.description || '',
        base_url: credential.base_url || '',
        client_id_plain: '', // Keep empty for security
        client_secret_plain: '',
        username_plain: '',
        password_plain: '',
        api_key_plain: '',
        gstin_plain: '',
        pan_plain: '',
        tan_plain: '',
        is_active: credential.is_active || false
      })
    }
  }, [credential, isOpen])

  // Update credential mutation
  const updateCredentialMutation = useMutation({
    mutationFn: (data: any) => 
      apiClient.put(`/api/company-dashboard/government-api/credentials/${credential.id}/`, data),
    onSuccess: () => {
      toast.success('Credentials updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['government-credentials'] })
      queryClient.invalidateQueries({ queryKey: ['credentials-summary'] })
      onClose()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          'Failed to update credentials'
      toast.error(errorMessage)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.credential_name.trim()) {
      toast.error('Please enter a credential name')
      return
    }

    // Only send fields that have values (to avoid overwriting with empty strings)
    const updateData: any = {
      credential_name: formData.credential_name,
      description: formData.description,
      base_url: formData.base_url,
      is_active: formData.is_active
    }

    // Only include credential fields if they have values
    if (formData.client_id_plain) updateData.client_id_plain = formData.client_id_plain
    if (formData.client_secret_plain) updateData.client_secret_plain = formData.client_secret_plain
    if (formData.username_plain) updateData.username_plain = formData.username_plain
    if (formData.password_plain) updateData.password_plain = formData.password_plain
    if (formData.api_key_plain) updateData.api_key_plain = formData.api_key_plain
    if (formData.gstin_plain) updateData.gstin_plain = formData.gstin_plain
    if (formData.pan_plain) updateData.pan_plain = formData.pan_plain
    if (formData.tan_plain) updateData.tan_plain = formData.tan_plain

    updateCredentialMutation.mutate(updateData)
  }

  const selectedTemplate = templatesData[credential?.api_type]

  if (!isOpen || !credential) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit {credential.api_type_display}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Update your government API credentials
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
          {/* Current Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100">
                  Editing: {credential.credential_name}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {credential.api_type_display} • {credential.environment_display}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  Leave credential fields empty to keep existing values
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Credential Name *
              </label>
              <input
                type="text"
                value={formData.credential_name}
                onChange={(e) => setFormData(prev => ({ ...prev, credential_name: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Base URL
              </label>
              <input
                type="url"
                value={formData.base_url}
                onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>

          {/* API Credentials */}
          {selectedTemplate && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  Update API Credentials
                </h4>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Show current masked values and input fields */}
                {selectedTemplate.required_fields.includes('client_id') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client ID
                    </label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">Current: {credential.client_id_masked}</div>
                      <input
                        type="text"
                        value={formData.client_id_plain}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_id_plain: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new client ID (optional)"
                      />
                    </div>
                  </div>
                )}

                {selectedTemplate.required_fields.includes('username') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username
                    </label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">Current: {credential.username_masked}</div>
                      <input
                        type="text"
                        value={formData.username_plain}
                        onChange={(e) => setFormData(prev => ({ ...prev, username_plain: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new username (optional)"
                      />
                    </div>
                  </div>
                )}

                {selectedTemplate.required_fields.includes('gstin') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GSTIN
                    </label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">Current: {credential.gstin_masked}</div>
                      <input
                        type="text"
                        value={formData.gstin_plain}
                        onChange={(e) => setFormData(prev => ({ ...prev, gstin_plain: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new GSTIN (optional)"
                        maxLength={15}
                      />
                    </div>
                  </div>
                )}

                {selectedTemplate.required_fields.includes('pan') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PAN
                    </label>
                    <div className="space-y-2">
                      <div className="text-sm text-gray-500">Current: {credential.pan_masked}</div>
                      <input
                        type="text"
                        value={formData.pan_plain}
                        onChange={(e) => setFormData(prev => ({ ...prev, pan_plain: e.target.value.toUpperCase() }))}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter new PAN (optional)"
                        maxLength={10}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activation */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Keep credentials active
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateCredentialMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateCredentialMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateCredentialMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Credentials
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditCredentialModal