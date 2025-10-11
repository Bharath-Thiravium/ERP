import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Shield, AlertTriangle, Globe, Smartphone, Activity, 
  Settings, 
  CheckCircle, XCircle,
  Plus, RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { apiClient } from '../../../lib/api'

interface AdvancedSecurityProps {
  onNavigateToTab?: (tab: string) => void
}

const AdvancedSecurity: React.FC<AdvancedSecurityProps> = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [filterSeverity, setFilterSeverity] = useState('')
  const queryClient = useQueryClient()

  // Fetch advanced security dashboard data
  const { data: dashboardData } = useQuery({
    queryKey: ['advanced-security-dashboard'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/advanced-dashboard/'),
  })

  // Fetch threat detections
  const { data: threatsData } = useQuery({
    queryKey: ['threat-detections', filterSeverity],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/threat-detection/', {
      params: { severity: filterSeverity }
    }),
  })

  // Fetch security alerts
  const { data: alertsData } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/security-alerts/'),
  })

  // Fetch device fingerprints
  const { data: devicesData } = useQuery({
    queryKey: ['device-fingerprints'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/device-fingerprinting/'),
  })

  // Fetch geolocation rules
  const { data: geoRulesData } = useQuery({
    queryKey: ['geolocation-rules'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/geolocation-rules/'),
  })

  // Fetch advanced settings
  const { data: settingsData } = useQuery({
    queryKey: ['advanced-settings'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/advanced-settings/'),
  })

  const dashboard = dashboardData?.data || {}
  const threats = threatsData?.data || []
  const alerts = alertsData?.data || []
  const devices = devicesData?.data || []
  const geoRules = geoRulesData?.data || []
  const settings = settingsData?.data || {}

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
        <h3 className="text-lg font-semibold">Threat Detection</h3>
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
        </div>
      </div>

      <div className="space-y-4">
        {threats.map((threat: any) => (
          <Card key={threat.id}>
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
                  <div>
                    <h4 className="font-medium">{threat.threat_type_display}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{threat.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>User: {threat.user_email}</span>
                      <span>IP: {threat.ip_address}</span>
                      <span>{new Date(threat.detected_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
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
        ))}
      </div>
    </div>
  )

  const renderDevices = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Device Management</h3>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['device-fingerprints'] })}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {devices.map((device: any) => (
          <Card key={device.device_id}>
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
                  <div>
                    <h4 className="font-medium">{device.browser} on {device.os}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{device.location_info}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Trust Score: {device.trust_score}%</span>
                      <span>Logins: {device.login_count}</span>
                      <span>Last Seen: {new Date(device.last_seen).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    device.trust_level === 'high' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    device.trust_level === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {device.trust_level?.toUpperCase()}
                  </span>
                  {device.is_trusted && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {device.is_blocked && <XCircle className="h-5 w-5 text-red-600" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderGeolocation = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Geolocation Security</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-4">
        {geoRules.map((rule: any) => (
          <Card key={rule.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    rule.rule_type === 'allow' ? 'bg-green-100 dark:bg-green-900/20' :
                    rule.rule_type === 'block' ? 'bg-red-100 dark:bg-red-900/20' :
                    'bg-yellow-100 dark:bg-yellow-900/20'
                  }`}>
                    <Globe className={`h-5 w-5 ${
                      rule.rule_type === 'allow' ? 'text-green-600 dark:text-green-400' :
                      rule.rule_type === 'block' ? 'text-red-600 dark:text-red-400' :
                      'text-yellow-600 dark:text-yellow-400'
                    }`} />
                  </div>
                  <div>
                    <h4 className="font-medium">{rule.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {rule.rule_type === 'allow' ? 'Allow' :
                       rule.rule_type === 'block' ? 'Block' :
                       rule.rule_type === 'require_2fa' ? 'Require 2FA' : 'Notify Only'}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Countries: {rule.countries?.length || 0}</span>
                      <span>Priority: {rule.priority}</span>
                      <span>Created: {new Date(rule.created_at).toLocaleDateString()}</span>
                    </div>
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
        ))}
      </div>
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

  const renderSettings = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Advanced Security Settings</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Threat Detection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Enable Threat Detection</span>
              <input
                type="checkbox"
                checked={settings.enable_threat_detection}
                className="rounded"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brute Force Threshold</label>
              <input
                type="number"
                value={settings.brute_force_threshold || 5}
                className="w-full px-3 py-2 border rounded-lg"
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Device Fingerprinting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Enable Device Fingerprinting</span>
              <input
                type="checkbox"
                checked={settings.enable_device_fingerprinting}
                className="rounded"
                readOnly
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Auto Trust Devices</span>
              <input
                type="checkbox"
                checked={settings.auto_trust_devices}
                className="rounded"
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Geolocation Security</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Enable Geolocation Security</span>
              <input
                type="checkbox"
                checked={settings.enable_geolocation_security}
                className="rounded"
                readOnly
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Block Unknown Locations</span>
              <input
                type="checkbox"
                checked={settings.block_unknown_locations}
                className="rounded"
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alert Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Email Alerts</span>
              <input
                type="checkbox"
                checked={settings.email_alerts}
                className="rounded"
                readOnly
              />
            </div>
            <div className="flex items-center justify-between">
              <span>Auto Block Threats</span>
              <input
                type="checkbox"
                checked={settings.auto_block_threats}
                className="rounded"
                readOnly
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

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