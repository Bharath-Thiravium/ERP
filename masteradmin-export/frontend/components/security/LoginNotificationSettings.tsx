import React, { useState, useEffect } from 'react'
import { Mail, Bell, MapPin, Clock, Save, AlertCircle } from 'lucide-react'
import { LoginNotification } from '../../types'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

interface LoginNotificationSettingsProps {
  isEnabled: boolean
  onToggleEnabled: (enabled: boolean) => void
  recentNotifications: LoginNotification[]
  isLoading?: boolean
}

const LoginNotificationSettings: React.FC<LoginNotificationSettingsProps> = ({
  isEnabled,
  onToggleEnabled,
  recentNotifications,
  isLoading = false
}) => {
  const [notificationEmail, setNotificationEmail] = useState('')
  const [isLoadingEmail, setIsLoadingEmail] = useState(false)
  const [showEmailInput, setShowEmailInput] = useState(false)

  // Fetch current notification email and email settings when component mounts
  useEffect(() => {
    const fetchEmailData = async () => {
      try {
        // First try to get notification email
        const notificationResponse = await apiClient.getNotificationEmail()
        if (notificationResponse.data?.notification_email) {
          setNotificationEmail(notificationResponse.data.notification_email)
          return
        }
        
        // If no notification email, check if Master Admin email is configured
        const emailSettingsResponse = await apiClient.getMasterAdminEmailSettings()
        if (emailSettingsResponse?.data?.is_active && emailSettingsResponse?.data?.email_address) {
          setNotificationEmail(emailSettingsResponse.data.email_address)
        }
      } catch (error) {
        console.error('Failed to fetch email data:', error)
      }
    }
    fetchEmailData()
  }, [])

  const handleToggleEnabled = async (enabled: boolean) => {
    if (enabled) {
      // Check if Master Admin email settings are configured
      try {
        const emailSettingsResponse = await apiClient.getMasterAdminEmailSettings()
        console.log('🔍 Email settings response:', emailSettingsResponse)
        
        if (emailSettingsResponse?.data?.is_active && emailSettingsResponse?.data?.email_address) {
          // Use configured email from Master Admin settings
          const configuredEmail = emailSettingsResponse.data.email_address
          setNotificationEmail(configuredEmail)
          
          // Save notification email if not already set
          if (!notificationEmail || notificationEmail !== configuredEmail) {
            await apiClient.setNotificationEmail({ notification_email: configuredEmail })
            toast.success(`Login notifications will be sent to: ${configuredEmail}`)
          }
          
          onToggleEnabled(enabled)
          return
        } else {
          console.log('❌ Email settings not active or missing email')
          toast.error('Please configure and activate email settings first in the Email Settings tab')
          return
        }
      } catch (error) {
        console.error('Failed to get email settings:', error)
        toast.error('Failed to check email settings')
        return
      }
    }
    
    onToggleEnabled(enabled)
  }

  const handleSaveEmail = async () => {
    if (!notificationEmail || !notificationEmail.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setIsLoadingEmail(true)
    try {
      await apiClient.setNotificationEmail({ notification_email: notificationEmail })
      toast.success('Notification email saved successfully!')
      setShowEmailInput(false)
      onToggleEnabled(true)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save notification email')
    } finally {
      setIsLoadingEmail(false)
    }
  }
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
              <Mail className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Login Notifications</h3>
              <p className="text-gray-600 dark:text-gray-400">Get email alerts for new login attempts</p>
            </div>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              disabled={isLoading}
              className="sr-only"
            />
            <div className={`w-12 h-6 rounded-full transition-colors ${
              isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-0.5'
              } mt-0.5`} />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {/* Email Configuration Section */}
        {isEnabled && (
          <>
            <div className="mb-6 p-4 bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Bell className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                <div className="text-green-700 dark:text-green-300 text-sm">
                  <p className="font-semibold mb-1">✅ Login Notifications Active</p>
                  <p>You'll receive email alerts for every successful login to your account.</p>
                </div>
              </div>
              
              {notificationEmail && (
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-600">
                  <div className="text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Notifications sent to: </span>
                    <span className="font-mono text-green-700 dark:text-green-300 font-semibold">{notificationEmail}</span>
                  </div>
                  <button
                    onClick={() => {
                      // Navigate to Email Settings tab
                      const emailTab = document.querySelector('[data-tab="email"]') as HTMLButtonElement
                      if (emailTab) {
                        emailTab.click()
                        toast('Redirected to Email Settings to change email configuration')
                      }
                    }}
                    className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                  >
                    Change in Settings
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        
        {showEmailInput && (
          <div className="mb-6 p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
            <div className="flex items-center space-x-2 mb-3">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="text-lg font-semibold text-blue-700 dark:text-blue-300">Set Notification Email</h4>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-yellow-700 dark:text-yellow-300 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-semibold">Email Settings Required</span>
                </div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Configure your email settings in the "Email Settings" tab first, or enter a custom email below.
                </p>
              </div>
              <div className="flex space-x-3">
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="Enter notification email address"
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300"
                />
                <button
                  onClick={handleSaveEmail}
                  disabled={isLoadingEmail || !notificationEmail}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  <Save className="h-4 w-4" />
                  <span>{isLoadingEmail ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={() => setShowEmailInput(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {isEnabled && notificationEmail && (
          <>
            <div className="mb-6 p-4 bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
              <div className="flex items-start space-x-3">
                <Bell className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-green-700 dark:text-green-300 text-sm">
                  <p className="font-semibold mb-1">Email Notifications Active</p>
                  <p>You'll receive an email alert for every successful login to your account.</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Login Notifications</h4>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h5 className="text-lg font-semibold mb-2">No recent notifications</h5>
                    <p className="text-sm">Login notifications will appear here</p>
                  </div>
                ) : (
                  recentNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-center p-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`p-3 rounded-xl ${
                          notification.email_sent 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          <Mail className={`h-5 w-5 ${
                            notification.email_sent 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 dark:text-white font-semibold mb-1">
                            {notification.email_sent ? 'Email sent successfully' : 'Email delivery failed'}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(notification.timestamp)}</span>
                            </span>
                            <span>IP: {notification.ip_address}</span>
                            {notification.location && (
                              <span className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{notification.location}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{notification.device_info}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default LoginNotificationSettings