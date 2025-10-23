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
  const [showPasswordField, setShowPasswordField] = useState(false)
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
    // Save settings first if they haven't been saved
    if (!formData.is_active) {
      toast.error('Please save your settings first before testing')
      return
    }
    
    setIsTesting(true)
    try {
      const response = await apiClient.testCompanyEmailConfiguration()
      console.log('Test email response:', response.data)
      
      // Check for success in multiple possible response formats
      if (response.data.success === true || response.data.status === 'success' || response.status === 200) {
        toast.success(response.data.message || 'Test email sent successfully!')
      } else {
        toast.error(response.data.error || response.data.message || 'Test email failed')
      }
      loadUsage()
    } catch (error: any) {
      console.error('Test email error:', error)
      
      // If it's a 200 response but caught as error, it might still be successful
      if (error.response?.status === 200) {
        toast.success('Test email sent successfully!')
      } else {
        const message = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to send test email'
        toast.error(message)
      }
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
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Email Usage</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{usage.emails_sent_today}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Sent Today</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{usage.remaining_today}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{usage.daily_limit}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Daily Limit</p>
              </div>
              <div className="text-center">
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  formData.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {formData.is_active ? 'Active' : 'Inactive'}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Status</p>
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Email *
              </label>
              <input
                type="email"
                value={formData.from_email}
                onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="company@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From Name *
              </label>
              <input
                type="text"
                value={formData.from_name}
                onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your Company Name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reply-To Email (Optional)
            </label>
            <input
              type="email"
              value={formData.reply_to_email}
              onChange={(e) => setFormData({ ...formData, reply_to_email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="support@example.com"
            />
          </div>

          {/* Email Provider */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Provider *
            </label>
            <select
              value={formData.email_provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {Object.entries(providers).map(([key, provider]: [string, any]) => (
                <option key={key} value={key}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          {/* Active Status Toggle */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable email sending
            </label>
          </div>

          {/* Daily Limit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Email Limit
            </label>
            <input
              type="number"
              value={formData.daily_limit}
              onChange={(e) => setFormData({ ...formData, daily_limit: parseInt(e.target.value) || 500 })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              max="10000"
            />
          </div>

          {/* Provider Configuration */}
          {!isApiProvider ? (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">SMTP Configuration</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SMTP Host *
                  </label>
                  <input
                    type="text"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="smtp.gmail.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    SMTP Port *
                  </label>
                  <input
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="587"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Username/Email *
                </label>
                <input
                  type="text"
                  value={formData.smtp_username}
                  onChange={(e) => setFormData({ ...formData, smtp_username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="your-email@gmail.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password/App Password *
                </label>
                <div className="relative">
                  <input
                    type={showPasswordField ? 'text' : 'password'}
                    value={formData.smtp_password}
                    onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your app password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordField(!showPasswordField)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                  >
                    {showPasswordField ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.use_tls}
                    onChange={(e) => setFormData({ ...formData, use_tls: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use TLS</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.use_ssl}
                    onChange={(e) => setFormData({ ...formData, use_ssl: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Use SSL</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">API Configuration</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key *
                </label>
                <div className="relative">
                  <input
                    type={showPasswordField ? 'text' : 'password'}
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Your API key"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordField(!showPasswordField)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition-colors"
                  >
                    {showPasswordField ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
              {selectedProvider?.requires_secret && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Secret *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={formData.api_secret}
                      onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your API secret"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showPasswords ? (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Eye className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-2"
            >
              {isSaving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !formData.from_email || !formData.from_name || (!formData.smtp_password && !isApiProvider) || (!formData.api_key && isApiProvider)}
              className="flex items-center space-x-2"
            >
              {isTesting ? (
                <LoadingSpinner size="sm" />
              ) : (
                <TestTube className="h-4 w-4" />
              )}
              <span>{isTesting ? 'Testing...' : 'Send Test Email'}</span>
            </Button>
          </div>

          {/* Help Text */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">Configuration Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>For Gmail, use an App Password instead of your regular password</li>
                  <li>Make sure to enable "Less secure app access" or use OAuth2 for production</li>
                  <li>Save and enable email sending before testing</li>
                  <li>Monitor your daily usage to avoid hitting limits</li>
                </ul>
              </div>
            </div>
          </div>
          
          {/* Test Requirements */}
          {!formData.is_active && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-300">
                  <p className="font-medium mb-1">Test Email Requirements:</p>
                  <p>Please save your settings and enable email sending before testing the configuration.</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default EmailSettings