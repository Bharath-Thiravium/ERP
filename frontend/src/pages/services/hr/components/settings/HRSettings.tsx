import React, { useState } from 'react'
import { 
  Settings, 
  Shield, 
  User, 
  Building, 
   
   
   
  
  Bell,
  Globe,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import { apiClient } from '../../../../../lib/api'
import toast from 'react-hot-toast'


const HRSettings: React.FC = () => {
  const { serviceUser, sessionKey } = useServiceUserStore()
  const [activeSection, setActiveSection] = useState('general')
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const settingSections = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'organization', label: 'Organization', icon: Building },
    { id: 'password', label: 'Password', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'integrations', label: 'Integrations', icon: Globe }
  ]

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>HR Service Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">HR Department Email</label>
              <input type="email" className="w-full px-3 py-2 border rounded-lg" placeholder="hr@company.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">HR Contact Number</label>
              <input type="tel" className="w-full px-3 py-2 border rounded-lg" placeholder="+91 XXXXX XXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time Zone</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>Asia/Kolkata (IST)</option>
                <option>Asia/Dubai (GST)</option>
                <option>America/New_York (EST)</option>
                <option>Europe/London (GMT)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <select className="w-full px-3 py-2 border rounded-lg">
                <option>English</option>
                <option>Hindi</option>
                <option>Regional Language</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderOrganizationSettings = () => {
    const OrganizationManager = React.lazy(() => import('../organization/OrganizationManager'))
    return (
      <React.Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>}>
        <OrganizationManager />
      </React.Suspense>
    )
  }

  // Handle password change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setIsChangingPassword(true)
    try {
      if (!sessionKey) {
        toast.error('Session expired. Please login again.')
        return
      }

      await apiClient.changeServiceUserPassword({
        session_key: sessionKey,
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword
      })

      toast.success('Password changed successfully')
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to change password')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Render Password Change Section
  const renderPasswordSettings = () => (
    <div className="space-y-6">
      {/* Password Change Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <span>Change Password</span>
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                minLength={8}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                minLength={8}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isChangingPassword}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {isChangingPassword ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Change Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-green-500" />
            <span>Account Information</span>
          </CardTitle>
          <CardDescription>
            Your service user account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {serviceUser?.unique_service_id || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Company
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                {serviceUser?.company_name || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                HR Management
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <p className="text-gray-900 dark:text-white font-medium">
                HR User
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderContent = () => {
    switch (activeSection) {
      case 'general':
        return renderGeneralSettings()
      case 'organization':
        return renderOrganizationSettings()
      case 'password':
        return renderPasswordSettings()

      case 'notifications':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  'New employee onboarding',
                  'Leave applications',
                  'Attendance irregularities',
                  'Payroll processing',
                  'Performance review reminders',
                  'Birthday notifications'
                ].map((notification, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{notification}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )

      case 'integrations':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Third-party Integrations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: 'Slack', description: 'Team communication', connected: true },
                  { name: 'Microsoft Teams', description: 'Video conferencing', connected: false },
                  { name: 'Google Workspace', description: 'Email integration', connected: true },
                  { name: 'Zoom', description: 'Video interviews', connected: false }
                ].map((integration, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{integration.name}</p>
                      <p className="text-sm text-gray-500">{integration.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        integration.connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {integration.connected ? 'Connected' : 'Not Connected'}
                      </span>
                      <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600">
                        {integration.connected ? 'Configure' : 'Connect'}
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )
      default:
        return renderGeneralSettings()
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold">HR System Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Configure your HR system</p>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-2">
        <div className="grid grid-cols-3 lg:grid-cols-5 gap-2">
          {settingSections.map((section) => {
            const Icon = section.icon
            const isActive = activeSection === section.id
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex flex-col items-center p-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{section.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        {renderContent()}
      </div>
    </div>
  )
}

export default HRSettings