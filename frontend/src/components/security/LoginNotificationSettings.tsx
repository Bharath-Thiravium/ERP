import React from 'react'
import { Mail, Bell, MapPin, Clock } from 'lucide-react'
import { LoginNotification } from '../../types'

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
              onChange={(e) => onToggleEnabled(e.target.checked)}
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

        {isEnabled && (
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