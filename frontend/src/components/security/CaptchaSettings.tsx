import React from 'react'
import { Shield, AlertTriangle, Settings } from 'lucide-react'

interface CaptchaSettingsProps {
  captchaAfterFailedAttempts: number
  maxFailedAttempts: number
  lockoutDurationMinutes: number
  onUpdateSettings: (settings: {
    captchaAfterFailedAttempts: number
    maxFailedAttempts: number
    lockoutDurationMinutes: number
  }) => Promise<void>
  isLoading?: boolean
}

const CaptchaSettings: React.FC<CaptchaSettingsProps> = ({
  captchaAfterFailedAttempts,
  maxFailedAttempts,
  lockoutDurationMinutes,
  onUpdateSettings,
  isLoading = false
}) => {
  const [settings, setSettings] = React.useState({
    captchaAfterFailedAttempts,
    maxFailedAttempts,
    lockoutDurationMinutes
  })

  const handleSave = async () => {
    await onUpdateSettings(settings)
  }

  const hasChanges = 
    settings.captchaAfterFailedAttempts !== captchaAfterFailedAttempts ||
    settings.maxFailedAttempts !== maxFailedAttempts ||
    settings.lockoutDurationMinutes !== lockoutDurationMinutes

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
      <div className="p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Security & Captcha Settings</h3>
            <p className="text-gray-600 dark:text-gray-400">Configure login security measures</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Captcha After Failed Attempts
              </label>
              <select
                value={settings.captchaAfterFailedAttempts}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  captchaAfterFailedAttempts: parseInt(e.target.value)
                }))}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 disabled:opacity-50"
              >
                <option value={1}>After 1 attempt</option>
                <option value={2}>After 2 attempts</option>
                <option value={3}>After 3 attempts</option>
                <option value={5}>After 5 attempts</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Max Failed Attempts
              </label>
              <select
                value={settings.maxFailedAttempts}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  maxFailedAttempts: parseInt(e.target.value)
                }))}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 disabled:opacity-50"
              >
                <option value={3}>3 attempts</option>
                <option value={5}>5 attempts</option>
                <option value={10}>10 attempts</option>
                <option value={15}>15 attempts</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Lockout Duration (minutes)
              </label>
              <select
                value={settings.lockoutDurationMinutes}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  lockoutDurationMinutes: parseInt(e.target.value)
                }))}
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300 disabled:opacity-50"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          <div className="p-6 bg-orange-50/80 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="text-orange-700 dark:text-orange-300 text-sm">
                <p className="font-semibold mb-2">Current Configuration</p>
                <ul className="space-y-1">
                  <li>• Captcha will appear after {settings.captchaAfterFailedAttempts} failed attempts</li>
                  <li>• Account locks after {settings.maxFailedAttempts} failed attempts</li>
                  <li>• Lockout duration: {settings.lockoutDurationMinutes} minutes</li>
                </ul>
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={() => setSettings({
                  captchaAfterFailedAttempts,
                  maxFailedAttempts,
                  lockoutDurationMinutes
                })}
                disabled={isLoading}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50 font-semibold"
              >
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center space-x-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors disabled:opacity-50 shadow-lg font-semibold"
              >
                <Settings className="h-4 w-4" />
                <span>{isLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CaptchaSettings