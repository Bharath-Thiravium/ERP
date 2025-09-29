import React, { useState, useEffect } from 'react'
import { Mail, TestTube, CheckCircle, Info, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

interface EmailSettingsProps {
  onSettingsUpdate?: () => void
}

const EmailSettings: React.FC<EmailSettingsProps> = ({ onSettingsUpdate }) => {
  const [, setEmailSettings] = useState<any>(null)
  const [providers, setProviders] = useState<any>({})
  const [usage, setUsage] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [formData, setFormData] = useState({
    from_email: '',
    from_name: '',
    reply_to_email: '',
    email_provider: 'gmail',
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    use_tls: true,
    use_ssl: false,
    api_key: '',
    api_secret: '',
    is_active: false,
    daily_limit: 500
  })

  useEffect(() => {
    loadEmailSettings()
    loadProviders()
    loadUsage()
  }, [])

  const loadEmailSettings = async () => {
    try {
      const response = await apiClient.getCompanyEmailSettings()
      setEmailSettings(response.data)
      setFormData({ ...formData, ...response.data })
    } catch (error: any) {
      console.error('Failed to load email settings:', error)
      if (error.response?.status === 403) {
        toast.error('Access denied. Please ensure you are logged in as a company user.')
      } else {
        toast.error('Failed to load email settings')
      }
    }
  }

  const loadProviders = async () => {
    try {
      const response = await apiClient.getEmailProviderTemplates()
      setProviders(response.data)
    } catch (error: any) {
      console.error('Failed to load providers:', error)
      if (error.response?.status === 403) {
        toast.error('Access denied. Please ensure you are logged in as a company user.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const loadUsage = async () => {
    try {
      const response = await apiClient.getEmailUsageStats()
      setUsage(response.data)
    } catch (error: any) {
      console.error('Failed to load usage stats:', error)
      if (error.response?.status === 403) {
        toast.error('Access denied. Please ensure you are logged in as a company user.')
      }
    }
  }

  const handleProviderChange = (provider: string) => {
    const providerConfig = providers[provider]
    if (providerConfig && !providerConfig.api_based) {
      setFormData({
        ...formData,
        email_provider: provider,
        smtp_host: providerConfig.smtp_host || '',
        smtp_port: providerConfig.smtp_port || 587,
        use_tls: providerConfig.use_tls || true,
        use_ssl: providerConfig.use_ssl || false
      })
    } else {
      setFormData({
        ...formData,
        email_provider: provider
      })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await apiClient.updateCompanyEmailSettings(formData)
      setEmailSettings(response.data)
      toast.success('Email settings saved successfully!')
      onSettingsUpdate?.()
      loadUsage()
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to save email settings'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const response = await apiClient.testCompanyEmailConfiguration()
      if (response.data.success) {
        toast.success('Test email sent successfully!')
      } else {
        toast.error(response.data.error || 'Test email failed')
      }
      loadUsage()
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send test email'
      toast.error(message)
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Loading email settings..." />
      </div>
    )
  }

  const selectedProvider = providers[formData.email_provider]
  const isApiProvider = selectedProvider?.api_based

  return (
    <div className="space-y-6">
      {/* Usage Statistics */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-blue-600" />
              <span>Email Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{usage.emails_sent_today}</p>
                <p className="text-sm text-gray-600">Sent Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{usage.remaining_today}</p>
                <p className="text-sm text-gray-600">Remaining</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{usage.daily_limit}</p>
                <p className="text-sm text-gray-600">Daily Limit</p>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  usage.is_active && usage.is_verified
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {usage.is_active && usage.is_verified ? 'Active' : 'Inactive'}
                </div>
                <p className="text-sm text-gray-600 mt-1">Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>
            Configure your company's email settings for sending quotations, invoices, and notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email *
              </label>
              <input
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="company@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name *
              </label>
              <input
                type="text"
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Your Company Name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reply-To Email (Optional)
            </label>
            <input
              type="email"
              value={formData.reply_to_email}
              onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="support@example.com"
            />
          </div>

          {/* Email Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Provider *
            </label>
            <select
              value={formData.email_provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(providers).map(([key, provider]: [string, any]) => (
                <option key={key} value={key}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Instructions */}
          {selectedProvider && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Setup Instructions for {selectedProvider.name}</h4>
                  <ul className="mt-2 text-sm text-blue-800 space-y-1">
                    {selectedProvider.instructions?.map((instruction: string, index: number) => (
                      <li key={index}>• {instruction}</li>
                    ))}
                  </ul>
                  {selectedProvider.help_url && (
                    <a
                      href={selectedProvider.help_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View detailed setup guide →
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SMTP Settings */}
          {!isApiProvider && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">SMTP Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="smtp.gmail.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMTP Port *
                  </label>
                  <input
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="587"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.smtp_username}
                    onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="your-email@gmail.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={formData.smtp_password}
                      onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="App Password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.use_tls}
                    onChange={(e) => setFormData({ ...formData, use_tls: e.target.checked })}
                    className="mr-2"
                  />
                  Use TLS
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.use_ssl}
                    onChange={(e) => setFormData({ ...formData, use_ssl: e.target.checked })}
                    className="mr-2"
                  />
                  Use SSL
                </label>
              </div>
            </div>
          )}

          {/* API Settings */}
          {isApiProvider && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">API Configuration</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key *
                </label>
                <div className="relative">
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter API Key"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {formData.email_provider === 'ses' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secret Access Key *
                  </label>
                  <input
                    type="password"
                    value={formData.api_secret}
                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter Secret Access Key"
                    required
                  />
                </div>
              )}
            </div>
          )}

          {/* Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Email Limit
              </label>
              <input
                type="number"
                value={formData.daily_limit}
                onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                max="10000"
              />
            </div>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              Enable email sending for this company
            </label>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>

            <Button
              onClick={handleTest}
              disabled={isTesting || !formData.is_active}
              variant="outline"
            >
              {isTesting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Send Test Email
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EmailSettings