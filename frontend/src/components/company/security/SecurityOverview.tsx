import React from 'react'
import { Shield, Smartphone, Key, Code, Globe, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'

interface SecurityOverviewProps {
  onNavigateToTab: (tabId: string) => void
}

const SecurityOverview: React.FC<SecurityOverviewProps> = ({ onNavigateToTab }) => {
  const securityMetrics = {
    securityScore: 85,
    activeSessions: 2,
    failedAttempts: 0,
    daysUntilExpiry: 30,
    twoFactorEnabled: false,
    recoveryCodesGenerated: false,
    apiKeysCount: 0,
    ipRestrictionsEnabled: false
  }

  return (
    <div className="space-y-6">
      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span>Security Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {securityMetrics.securityScore}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Security Score</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {securityMetrics.activeSessions}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {securityMetrics.failedAttempts}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed Attempts</p>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {securityMetrics.daysUntilExpiry}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Days Until Expiry</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Features Status */}
      <Card>
        <CardHeader>
          <CardTitle>Security Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-red-500" />
                <span className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-red-600 dark:text-red-400">Disabled</span>
                <Button size="sm" onClick={() => onNavigateToTab('2fa')}>Enable</Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <Key className="h-5 w-5 text-yellow-500" />
                <span className="font-medium text-gray-900 dark:text-white">Recovery Codes</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-yellow-600 dark:text-yellow-400">Not Generated</span>
                <Button size="sm" variant="outline" onClick={() => onNavigateToTab('recovery')}>Generate</Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Code className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">API Keys</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{securityMetrics.apiKeysCount} Active</span>
                <Button size="sm" variant="outline" onClick={() => onNavigateToTab('api-keys')}>Manage</Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-white">IP Restrictions</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Disabled</span>
                <Button size="sm" variant="outline" onClick={() => onNavigateToTab('ip-access')}>Configure</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span>Security Recommendations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">Enable Two-Factor Authentication</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">Add an extra layer of security to your account</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <Key className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100">Generate Recovery Codes</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Create backup codes for account recovery</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SecurityOverview