import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  X, Key, Shield, Lock, Info, Save, Eye, EyeOff
} from 'lucide-react'
import { apiClient } from '../../../lib/api'
import { Button } from '../../ui/Button'
import toast from 'react-hot-toast'

interface CreateCredentialModalProps {
  isOpen: boolean
  onClose: () => void
}



const CreateCredentialModal: React.FC<CreateCredentialModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    api_type: '',
    environment: 'sandbox',
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
  const [showPasswords, setShowPasswords] = useState({
    client_secret: false,
    password: false,
    api_key: false
  })

  // Fetch API templates
  const { data: apiTemplates } = useQuery({
    queryKey: ['api-templates'],
    queryFn: () => apiClient.get('/api/company-dashboard/government-api/api-templates/'),
    enabled: isOpen
  })

  const templatesData = apiTemplates?.data || {}

  // Create credential mutation
  const createCredentialMutation = useMutation({
    mutationFn: (data: any) => 
      apiClient.post('/api/company-dashboard/government-api/credentials/', data),
    onSuccess: () => {
      toast.success('Government API credentials created successfully!')
      queryClient.invalidateQueries({ queryKey: ['government-credentials'] })
      queryClient.invalidateQueries({ queryKey: ['credentials-summary'] })
      onClose()
      resetForm()
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 
                          error.response?.data?.message ||
                          'Failed to create credentials'
      toast.error(errorMessage)
    }
  })

  const resetForm = () => {
    setFormData({
      api_type: '',
      environment: 'sandbox',
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
    setShowPasswords({
      client_secret: false,
      password: false,
      api_key: false
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.api_type) {
      toast.error('Please select an API type')
      return
    }

    if (!formData.credential_name.trim()) {
      toast.error('Please enter a credential name')
      return
    }

    createCredentialMutation.mutate(formData)
  }

  const handleApiTypeChange = (apiType: string) => {
    const template = templatesData[apiType]
    if (template) {
      setFormData(prev => ({
        ...prev,
        api_type: apiType,
        base_url: template.environments[prev.environment]?.base_url || '',
        credential_name: `${template.name} - ${prev.environment}`
      }))
    }
  }

  const handleEnvironmentChange = (environment: string) => {
    const template = templatesData[formData.api_type]
    if (template) {
      setFormData(prev => ({
        ...prev,
        environment,
        base_url: template.environments[environment]?.base_url || '',
        credential_name: `${template.name} - ${environment}`
      }))
    }
  }

  const getAPITypeIcon = (apiType: string) => {
    switch (apiType) {
      case 'gst': return '🏛️'
      case 'tds': return '💰'
      case 'einvoice': return '📄'
      case 'eway_bill': return '🚛'
      case 'pf': return '🏦'
      case 'esi': return '🏥'
      default: return '⚙️'
    }
  }

  const selectedTemplate = templatesData[formData.api_type]

  if (!isOpen) return null

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
                Add Government API Credentials
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Securely store your government API credentials with military-grade encryption
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
          {/* API Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Type *
              </label>
              <select
                value={formData.api_type}
                onChange={(e) => handleApiTypeChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select API Type...</option>
                {Object.entries(templatesData).map(([key, template]: [string, any]) => (
                  <option key={key} value={key}>
                    {getAPITypeIcon(key)} {template.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Environment *
              </label>
              <select
                value={formData.environment}
                onChange={(e) => handleEnvironmentChange(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="sandbox">🧪 Sandbox/Testing</option>
                <option value="production">🚀 Production</option>
              </select>
            </div>
          </div>

          {/* API Description */}
          {selectedTemplate && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">
                    {selectedTemplate.name}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {selectedTemplate.description}
                  </p>
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    Required: {selectedTemplate.required_fields.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          )}

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
                placeholder="e.g., GST API - Production"
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
                placeholder="https://api.example.com"
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
              placeholder="Optional description or notes about this credential"
            />
          </div>

          {/* API Credentials */}
          {selectedTemplate && (
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                  API Credentials
                </h4>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Client ID */}
                {selectedTemplate.required_fields.includes('client_id') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client ID *
                    </label>
                    <input
                      type="text"
                      value={formData.client_id_plain}
                      onChange={(e) => setFormData(prev => ({ ...prev, client_id_plain: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter client ID"
                      required
                    />
                  </div>
                )}

                {/* Client Secret */}
                {selectedTemplate.required_fields.includes('client_secret') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Client Secret *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.client_secret ? 'text' : 'password'}
                        value={formData.client_secret_plain}
                        onChange={(e) => setFormData(prev => ({ ...prev, client_secret_plain: e.target.value }))}
                        className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter client secret"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, client_secret: !prev.client_secret }))}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.client_secret ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Username */}
                {selectedTemplate.required_fields.includes('username') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username_plain}
                      onChange={(e) => setFormData(prev => ({ ...prev, username_plain: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter username"
                      required
                    />
                  </div>
                )}

                {/* Password */}
                {selectedTemplate.required_fields.includes('password') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.password ? 'text' : 'password'}
                        value={formData.password_plain}
                        onChange={(e) => setFormData(prev => ({ ...prev, password_plain: e.target.value }))}
                        className="w-full px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, password: !prev.password }))}
                        className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.password ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* GSTIN */}
                {selectedTemplate.required_fields.includes('gstin') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GSTIN *
                    </label>
                    <input
                      type="text"
                      value={formData.gstin_plain}
                      onChange={(e) => setFormData(prev => ({ ...prev, gstin_plain: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      required
                    />
                  </div>
                )}

                {/* PAN */}
                {selectedTemplate.required_fields.includes('pan') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PAN *
                    </label>
                    <input
                      type="text"
                      value={formData.pan_plain}
                      onChange={(e) => setFormData(prev => ({ ...prev, pan_plain: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="AAAAA0000A"
                      maxLength={10}
                      required
                    />
                  </div>
                )}

                {/* TAN */}
                {selectedTemplate.required_fields.includes('tan') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      TAN *
                    </label>
                    <input
                      type="text"
                      value={formData.tan_plain}
                      onChange={(e) => setFormData(prev => ({ ...prev, tan_plain: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="AAAA00000A"
                      maxLength={10}
                      required
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="text-sm text-green-700 dark:text-green-300">
                <p className="font-medium mb-1">🔒 Military-Grade Security</p>
                <ul className="space-y-1 text-xs">
                  <li>• All credentials are encrypted using AES-256 encryption</li>
                  <li>• Stored securely in encrypted database fields</li>
                  <li>• Complete audit trail of all operations</li>
                  <li>• Only authorized company users can access</li>
                </ul>
              </div>
            </div>
          </div>

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
              Activate credentials immediately after creation
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createCredentialMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCredentialMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createCredentialMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Credentials
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateCredentialModal