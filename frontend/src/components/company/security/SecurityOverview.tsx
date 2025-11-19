import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Shield, Smartphone, Key, Code, Globe, AlertCircle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { apiClient } from '../../../lib/api'

interface SecurityOverviewProps {
  onNavigateToTab: (tabId: string) => void
}

const SecurityOverview: React.FC<SecurityOverviewProps> = ({ onNavigateToTab }) => {
  // Fetch security overview data
  const { data: securityData, isLoading } = useQuery({
    queryKey: ['security-overview'],
    queryFn: () => apiClient.get('/api/company-dashboard/security/overview/'),
  })

  const securityMetrics = securityData?.data || {
    security_score: 50,
    active_sessions: 0,
    failed_attempts: 0,
    days_until_expiry: 0,
    two_factor_enabled: false,
    recovery_codes_generated: false,
    api_keys_count: 0,
    ip_restrictions_enabled: false
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
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
            <div className={`text-center p-4 rounded-lg ${
              securityMetrics.security_score >= 80 ? 'bg-green-50 dark:bg-green-900/20' :
              securityMetrics.security_score >= 60 ? 'bg-yellow-50 dark:bg-yellow-900/20' :
              'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className={`text-3xl font-bold ${
                securityMetrics.security_score >= 80 ? 'text-green-600 dark:text-green-400' :
                securityMetrics.security_score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {securityMetrics.security_score}%
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Security Score</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {securityMetrics.active_sessions}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${
              securityMetrics.failed_attempts > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className={`text-3xl font-bold ${
                securityMetrics.failed_attempts > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {securityMetrics.failed_attempts}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed Attempts</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${
              securityMetrics.days_until_expiry <= 7 ? 'bg-red-50 dark:bg-red-900/20' :
              securityMetrics.days_until_expiry <= 30 ? 'bg-yellow-50 dark:bg-yellow-900/20' :
              'bg-green-50 dark:bg-green-900/20'
            }`}>
              <div className={`text-3xl font-bold ${
                securityMetrics.days_until_expiry <= 7 ? 'text-red-600 dark:text-red-400' :
                securityMetrics.days_until_expiry <= 30 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-green-600 dark:text-green-400'
              }`}>
                {securityMetrics.days_until_expiry}
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
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              securityMetrics.two_factor_enabled ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className="flex items-center space-x-3">
                {securityMetrics.two_factor_enabled ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Smartphone className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${
                  securityMetrics.two_factor_enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {securityMetrics.two_factor_enabled ? 'Enabled' : 'Disabled'}
                </span>
                {!securityMetrics.two_factor_enabled && (
                  <Button size="sm" onClick={() => onNavigateToTab('2fa')}>Enable</Button>
                )}
              </div>
            </div>
            
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              securityMetrics.recovery_codes_generated ? 'bg-green-50 dark:bg-green-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'
            }`}>
              <div className="flex items-center space-x-3">
                {securityMetrics.recovery_codes_generated ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Key className="h-5 w-5 text-yellow-500" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">Recovery Codes</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${
                  securityMetrics.recovery_codes_generated ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {securityMetrics.recovery_codes_generated ? 'Generated' : 'Not Generated'}
                </span>
                {!securityMetrics.recovery_codes_generated && (
                  <Button size="sm" variant="outline" onClick={() => onNavigateToTab('recovery')}>Generate</Button>
                )}
              </div>
            </div>
            
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              securityMetrics.api_keys_count > 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'
            }`}>
              <div className="flex items-center space-x-3">
                {securityMetrics.api_keys_count > 0 ? (
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                ) : (
                  <Code className="h-5 w-5 text-gray-500" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">API Keys</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${
                  securityMetrics.api_keys_count > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {securityMetrics.api_keys_count} Active
                </span>
                <Button size="sm" variant="outline" onClick={() => onNavigateToTab('api-keys')}>Manage</Button>
              </div>
            </div>
            
            <div className={`flex items-center justify-between p-3 rounded-lg ${
              securityMetrics.ip_restrictions_enabled ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'
            }`}>
              <div className="flex items-center space-x-3">
                {securityMetrics.ip_restrictions_enabled ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Globe className="h-5 w-5 text-gray-500" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">IP Restrictions</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${
                  securityMetrics.ip_restrictions_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {securityMetrics.ip_restrictions_enabled ? 'Enabled' : 'Disabled'}
                </span>
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
            {securityData?.data?.recent_security_events?.length > 0 ? (
              securityData?.data?.recent_security_events.map((event: any, index: number) => (
                <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${
                  event.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  {event.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <p className={`font-medium ${
                      event.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                    }`}>
                      {event.action.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                    <p className={`text-sm ${
                      event.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                      {event.details || new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <>
                {!securityMetrics.two_factor_enabled && (
                  <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-900 dark:text-orange-100">Enable Two-Factor Authentication</p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">Add an extra layer of security to your account</p>
                    </div>
                  </div>
                )}
                {!securityMetrics.recovery_codes_generated && (
                  <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <Key className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">Generate Recovery Codes</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">Create backup codes for account recovery</p>
                    </div>
                  </div>
                )}
                {securityMetrics.security_score < 80 && (
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 dark:text-blue-100">Improve Security Score</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Enable more security features to increase your score</p>
                    </div>
                  </div>
                )}
                {securityMetrics.two_factor_enabled && securityMetrics.recovery_codes_generated && securityMetrics.security_score >= 80 && (
                  <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-900 dark:text-green-100">Excellent Security</p>
                      <p className="text-sm text-green-700 dark:text-green-300">Your account security is well configured</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SecurityOverview