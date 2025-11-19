import React, { useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { 
  Shield, AlertTriangle, Globe, Smartphone, Activity, 
  Settings, 
  CheckCircle, XCircle,
  Plus, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { apiClient } from '../../../lib/api'
import AddGeolocationRuleModal from './AddGeolocationRuleModal'

interface AdvancedSecurityProps {
  onNavigateToTab?: (tab: string) => void
}

const AdvancedSecurity: React.FC<AdvancedSecurityProps> = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [showAddRuleModal, setShowAddRuleModal] = useState(false)
  const queryClient = useQueryClient()

  // Fetch advanced security dashboard data
  const { data: dashboardData } = useQuery({
    queryKey: ['advanced-security-dashboard'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/advanced-dashboard/'),
  })

  // Fetch enhanced threat detections with AI
  const { data: threatsData, isLoading: threatsLoading } = useQuery({
    queryKey: ['enhanced-threats', filterSeverity],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/enhanced-threats/', {
      params: { severity: filterSeverity, page_size: 50 }
    }),
  })
  
  // Removed unused analyticsData query

  // Fetch security alerts
  const { data: alertsData } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/security-alerts/'),
  })

  // Fetch device management data
  const { data: devicesData, isLoading: devicesLoading } = useQuery({
    queryKey: ['device-management'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/device-management/'),
  })

  // Fetch geolocation rules
  const { data: geoRulesData } = useQuery({
    queryKey: ['geolocation-rules'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/geolocation/rules/'),
  })

  // Fetch advanced settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['advanced-settings'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/advanced-settings/'),
  })

  // Settings update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Record<string, any>) => apiClient.patch('/api/company-dashboard/advanced-security/advanced-settings/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advanced-settings'] })
    }
  })

  const dashboard = dashboardData?.data || {}
  const threats = threatsData?.data?.threats || []
  const aiInsights = threatsData?.data?.ai_insights || {}
  const alerts = alertsData?.data || []
  const devices = devicesData?.data?.devices || []
  const deviceSummary = devicesData?.data?.summary || {}
  const geoRules = geoRulesData?.data?.rules || []

  const tabs = [
    { id: 'dashboard', label: 'Security Dashboard', icon: Shield },
    { id: 'threats', label: 'Threat Detection', icon: AlertTriangle },
    { id: 'devices', label: 'Device Management', icon: Smartphone },
    { id: 'geolocation', label: 'Geolocation Security', icon: Globe },
    { id: 'alerts', label: 'Security Alerts', icon: Activity },
    { id: 'settings', label: 'Advanced Settings', icon: Settings }
  ]

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Security Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <span>Security Score</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={dashboard.security_score >= 80 ? "#10b981" : dashboard.security_score >= 60 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(dashboard.security_score || 0) * 2.51} 251`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{dashboard.security_score || 0}</span>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {dashboard.security_score >= 80 ? 'Excellent' : 
                 dashboard.security_score >= 60 ? 'Good' : 
                 dashboard.security_score >= 40 ? 'Fair' : 'Poor'} Security
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your security posture is {dashboard.security_score >= 80 ? 'strong' : 'needs improvement'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Threats</p>
                <p className="text-2xl font-bold">{dashboard.threat_analysis?.total_threats || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Trusted Devices</p>
                <p className="text-2xl font-bold">{dashboard.device_stats?.trusted_devices || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Geo Rules</p>
                <p className="text-2xl font-bold">{dashboard.geolocation_stats?.active_rules || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <Activity className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unread Alerts</p>
                <p className="text-2xl font-bold">{dashboard.alert_summary?.unread_alerts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {dashboard.recommendations && dashboard.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Security Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recommendations.map((rec: any, index: number) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  rec.type === 'error' ? 'bg-red-50 border-red-500 dark:bg-red-900/20' :
                  rec.type === 'warning' ? 'bg-yellow-50 border-yellow-500 dark:bg-yellow-900/20' :
                  'bg-blue-50 border-blue-500 dark:bg-blue-900/20'
                }`}>
                  <h4 className="font-medium">{rec.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{rec.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  const renderThreats = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">🤖 AI-Enhanced Threat Detection</h3>
        <div className="flex space-x-2">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['enhanced-threats'] })}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={async () => {
              try {
                await apiClient.delete('/api/company-dashboard/advanced-security/clear-sample-data/')
                queryClient.invalidateQueries({ queryKey: ['enhanced-threats', 'device-management'] })
              } catch (error) {
                console.error('Failed to clear sample data:', error)
              }
            }}
            variant="outline"
            className="bg-red-50 hover:bg-red-100 text-red-600"
          >
            🗑️ Clear Sample Data
          </Button>
        </div>
      </div>
      
      {/* AI Insights Panel */}
      {aiInsights && Object.keys(aiInsights).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <span>AI Security Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{aiInsights.total_threats || 0}</div>
                <div className="text-sm text-gray-600">Total Threats</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{aiInsights.average_confidence || 0}%</div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{aiInsights.high_confidence_threats || 0}</div>
                <div className="text-sm text-gray-600">High Confidence</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{aiInsights.recent_threats_7d || 0}</div>
                <div className="text-sm text-gray-600">Last 7 Days</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-500">
              AI Model: {aiInsights.ai_model_version} | Last Analysis: {aiInsights.last_analysis ? new Date(aiInsights.last_analysis).toLocaleString() : 'N/A'}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {threatsLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading AI threat analysis...</p>
          </div>
        ) : threats.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">No Threats Detected</h3>
              <p className="text-gray-600">AI monitoring is active and protecting your system</p>
            </CardContent>
          </Card>
        ) : (
          threats.map((threat: any) => (
            <Card key={threat.id} className={threat.severity === 'critical' ? 'border-red-500' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      threat.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/20' :
                      threat.severity === 'high' ? 'bg-orange-100 dark:bg-orange-900/20' :
                      threat.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                      'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                      <AlertTriangle className={`h-5 w-5 ${
                        threat.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                        threat.severity === 'high' ? 'text-orange-600 dark:text-orange-400' :
                        threat.severity === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{threat.threat_type_display}</h4>
                        {threat.confidence_score && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            🤖 {Math.round(threat.confidence_score * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{threat.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>User: {threat.user_email}</span>
                        <span>IP: {threat.ip_address}</span>
                        <span>{threat.time_ago}</span>
                        {threat.auto_blocked && (
                          <span className="text-red-600 font-medium">🚫 Auto-blocked</span>
                        )}
                      </div>
                      {threat.behavioral_score && (
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500">Behavioral Score: </span>
                          <span className={`font-medium ${
                            threat.behavioral_score > 0.7 ? 'text-red-600' :
                            threat.behavioral_score > 0.4 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {Math.round(threat.behavioral_score * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      threat.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                      threat.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                      threat.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                      'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                    }`}>
                      {threat.severity.toUpperCase()}
                    </span>
                    {threat.is_resolved ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )

  const renderDevices = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">📱 Device Management</h3>
        <div className="flex space-x-2">
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['device-management'] })}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={async () => {
              try {
                await apiClient.delete('/api/company-dashboard/advanced-security/clear-sample-data/')
                queryClient.invalidateQueries({ queryKey: ['enhanced-threats', 'device-management'] })
              } catch (error) {
                console.error('Failed to clear sample data:', error)
              }
            }}
            variant="outline"
            className="bg-red-50 hover:bg-red-100 text-red-600"
          >
            🗑️ Clear Sample Data
          </Button>
        </div>
      </div>

      {/* Device Summary */}
      {deviceSummary && Object.keys(deviceSummary).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{deviceSummary.total_devices || 0}</div>
              <div className="text-sm text-gray-600">Total Devices</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{deviceSummary.trusted_devices || 0}</div>
              <div className="text-sm text-gray-600">Trusted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{deviceSummary.blocked_devices || 0}</div>
              <div className="text-sm text-gray-600">Blocked</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{deviceSummary.pending_devices || 0}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-4">
        {devicesLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading device information...</p>
          </div>
        ) : devices.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Devices Found</h3>
              <p className="text-gray-600 mb-4">No devices have been registered yet</p>

            </CardContent>
          </Card>
        ) : (
          devices.map((device: any) => (
            <Card key={device.device_id} className={device.is_blocked ? 'border-red-500' : device.is_trusted ? 'border-green-500' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      device.is_trusted ? 'bg-green-100 dark:bg-green-900/20' :
                      device.is_blocked ? 'bg-red-100 dark:bg-red-900/20' :
                      'bg-yellow-100 dark:bg-yellow-900/20'
                    }`}>
                      <Smartphone className={`h-5 w-5 ${
                        device.is_trusted ? 'text-green-600 dark:text-green-400' :
                        device.is_blocked ? 'text-red-600 dark:text-red-400' :
                        'text-yellow-600 dark:text-yellow-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{device.browser} {device.browser_version} on {device.os}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          device.trust_level === 'high' ? 'bg-green-100 text-green-800' :
                          device.trust_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {device.trust_level?.toUpperCase()} TRUST
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        📍 {device.location_info} • 🌐 {device.ip_address}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>👤 {device.user_email}</span>
                        <span>🎯 Trust: {device.trust_score}%</span>
                        <span>🔢 Logins: {device.login_count}</span>
                        <span>⏰ Last: {new Date(device.last_seen).toLocaleDateString()}</span>
                      </div>
                      {device.screen_resolution && (
                        <div className="mt-2 text-xs text-gray-500">
                          📺 {device.screen_resolution} • 🌍 {device.timezone} • 🗣️ {device.language}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    {device.is_trusted && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">TRUSTED</span>
                      </div>
                    )}
                    {device.is_blocked && (
                      <div className="flex items-center space-x-1 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">BLOCKED</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      ID: {device.fingerprint_hash}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )

  const renderGeolocation = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">🌍 Geolocation Security</h3>
        <div className="flex space-x-2">
          <Button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['geolocation-rules'] })}
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowAddRuleModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {geoRules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Geolocation Rules</h3>
              <p className="text-gray-600 mb-4">Create rules to control access based on geographic location</p>
              <Button onClick={() => setShowAddRuleModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </CardContent>
          </Card>
        ) : (
          geoRules.map((rule: any) => (
            <Card key={rule.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      rule.rule_type === 'allow' ? 'bg-green-100 dark:bg-green-900/20' :
                      rule.rule_type === 'block' ? 'bg-red-100 dark:bg-red-900/20' :
                      rule.rule_type === 'require_2fa' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                      'bg-blue-100 dark:bg-blue-900/20'
                    }`}>
                      <Globe className={`h-5 w-5 ${
                        rule.rule_type === 'allow' ? 'text-green-600 dark:text-green-400' :
                        rule.rule_type === 'block' ? 'text-red-600 dark:text-red-400' :
                        rule.rule_type === 'require_2fa' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium">{rule.name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {rule.rule_type === 'allow' ? '✅ Allow Access' :
                         rule.rule_type === 'block' ? '🚫 Block Access' :
                         rule.rule_type === 'require_2fa' ? '🔐 Require 2FA' : '📝 Notify Only'}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>🌍 Countries: {rule.countries?.length || 0}</span>
                        <span>⚡ Priority: {rule.priority}</span>
                        <span>📅 Created: {new Date(rule.created_at).toLocaleDateString()}</span>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-gray-500 mt-1">{rule.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rule.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                    }`}>
                      {rule.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddRuleModal && (
        <AddGeolocationRuleModal 
          onClose={() => setShowAddRuleModal(false)}
          onSuccess={() => {
            setShowAddRuleModal(false)
            queryClient.invalidateQueries({ queryKey: ['geolocation-rules'] })
          }}
        />
      )}
    </div>
  )

  const renderAlerts = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Security Alerts</h3>
        <Button variant="outline">
          Mark All Read
        </Button>
      </div>

      <div className="space-y-4">
        {alerts.map((alert: any) => (
          <Card key={alert.id} className={!alert.is_read ? 'border-blue-500' : ''}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-100 dark:bg-red-900/20' :
                    alert.severity === 'error' ? 'bg-orange-100 dark:bg-orange-900/20' :
                    alert.severity === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                    'bg-blue-100 dark:bg-blue-900/20'
                  }`}>
                    <Activity className={`h-5 w-5 ${
                      alert.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                      alert.severity === 'error' ? 'text-orange-600 dark:text-orange-400' :
                      alert.severity === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {alert.user_email && <span>User: {alert.user_email}</span>}
                      {alert.ip_address && <span>IP: {alert.ip_address}</span>}
                      <span>{alert.time_ago}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    alert.severity === 'error' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                    alert.severity === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  {!alert.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderSettings = () => {
    const currentSettings = settingsData?.data || {}

    const handleToggle = (field: string, value: boolean) => {
      updateSettingsMutation.mutate({ [field]: value })
    }

    const handleNumberChange = (field: string, value: string) => {
      const numValue = parseInt(value)
      if (!isNaN(numValue) && numValue > 0) {
        updateSettingsMutation.mutate({ [field]: numValue })
      }
    }

    if (settingsLoading) {
      return (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading settings...</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Advanced Security Settings</h3>
          {updateSettingsMutation.isPending && (
            <div className="flex items-center space-x-2 text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Saving...</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>🔍 Threat Detection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Enable AI Threat Detection</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.enable_threat_detection || false}
                    onChange={(e) => handleToggle('enable_threat_detection', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Brute Force Threshold</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={currentSettings.brute_force_threshold || 5}
                  onChange={(e) => handleNumberChange('brute_force_threshold', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Failed attempts before account lockout</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Auto Lockout Duration (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={currentSettings.auto_lockout_duration_minutes || 30}
                  onChange={(e) => handleNumberChange('auto_lockout_duration_minutes', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">How long to lock accounts after threats</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📱 Device Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Enable Device Fingerprinting</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.enable_device_fingerprinting || false}
                    onChange={(e) => handleToggle('enable_device_fingerprinting', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto Trust Devices</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.auto_trust_devices || false}
                    onChange={(e) => handleToggle('auto_trust_devices', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500">Automatically trust devices after successful logins</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🌍 Geolocation Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Enable Geolocation Security</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.enable_geolocation_security || false}
                    onChange={(e) => handleToggle('enable_geolocation_security', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500">Control access based on geographic location</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📧 Email Alert Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Enable Email Alerts</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.email_alerts || false}
                    onChange={(e) => handleToggle('email_alerts', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <span>Auto Block Threats</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={currentSettings.auto_block_threats || false}
                    onChange={(e) => handleToggle('auto_block_threats', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <p className="text-xs text-gray-500">Send email notifications for login and security events</p>
            </CardContent>
          </Card>
        </div>

        {updateSettingsMutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">Settings updated successfully!</span>
            </div>
          </div>
        )}

        {updateSettingsMutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800 font-medium">Failed to update settings. Please try again.</span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                data-tab={tab.id}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'threats' && renderThreats()}
        {activeTab === 'devices' && renderDevices()}
        {activeTab === 'geolocation' && renderGeolocation()}
        {activeTab === 'alerts' && renderAlerts()}
        {activeTab === 'settings' && renderSettings()}
      </div>
    </div>
  )
}

export default AdvancedSecurity