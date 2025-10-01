import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Shield, 
  Lock, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  Eye,
  RefreshCw,
  Settings,
  Users,
  Clock,
  Edit,
  Save
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { apiClient } from '../../../lib/api'
import toast from 'react-hot-toast'


const SecurityConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [editingConfig, setEditingConfig] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch security configurations
  const { data: securityConfigsData, isLoading } = useQuery({
    queryKey: ['security-configurations'],
    queryFn: () => apiClient.get('/api/configuration/system-config/by_category/?category=security'),
  })

  const securityConfigs = securityConfigsData?.data || []

  // Update configuration mutation
  const updateConfigMutation = useMutation({
    mutationFn: (data: any) => apiClient.put(`/api/configuration/system-config/${data.id}/`, data),
    onSuccess: () => {
      toast.success('Security configuration updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['security-configurations'] })
      setEditingConfig(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update configuration')
    }
  })

  const handleEditConfig = (config: any) => {
    setEditingConfig(config)
  }

  const handleSaveConfig = (updatedConfig: any) => {
    updateConfigMutation.mutate(updatedConfig)
  }

  const securityTabs = [
    { id: 'overview', label: 'Security Overview', icon: Shield },
    { id: 'authentication', label: 'Authentication', icon: Lock },
    { id: 'authorization', label: 'Authorization', icon: Users },
    { id: 'encryption', label: 'Encryption', icon: Key },
    { id: 'audit', label: 'Audit Logs', icon: Eye },
    { id: 'policies', label: 'Security Policies', icon: Settings }
  ]

  const securityMetrics = {
    overall_score: 85,
    last_security_scan: '2024-01-15T10:30:00Z',
    active_sessions: 12,
    failed_login_attempts: 3,
    password_policy_compliance: 92,
    two_factor_enabled: 78,
    encryption_status: 'Active',
    last_backup_encrypted: true,
    ssl_certificate_expiry: '2024-12-31',
    security_alerts: 2
  }

  // Group security configurations by subcategory
  const groupedConfigs = securityConfigs.reduce((acc: any, config: any) => {
    const subcategory = config.key.includes('password') ? 'Authentication' :
                       config.key.includes('session') || config.key.includes('login') || config.key.includes('lockout') ? 'Authentication' :
                       config.key.includes('encryption') || config.key.includes('ssl') || config.key.includes('tls') ? 'Encryption' :
                       'Access Control'
    
    if (!acc[subcategory]) {
      acc[subcategory] = []
    }
    acc[subcategory].push(config)
    return acc
  }, {})

  const auditLogs = [
    {
      id: 1,
      timestamp: '2024-01-15T14:30:00Z',
      user: 'admin@example.com',
      action: 'Configuration Updated',
      resource: 'system.password_policy',
      ip_address: '192.168.1.100',
      status: 'success'
    },
    {
      id: 2,
      timestamp: '2024-01-15T14:25:00Z',
      user: 'admin@example.com',
      action: 'Backup Created',
      resource: 'database.full_backup',
      ip_address: '192.168.1.100',
      status: 'success'
    },
    {
      id: 3,
      timestamp: '2024-01-15T14:20:00Z',
      user: 'unknown',
      action: 'Failed Login',
      resource: 'authentication.login',
      ip_address: '203.0.113.45',
      status: 'failed'
    }
  ]



  const renderSecurityOverview = () => (
    <div className="space-y-6">
      {/* Security Score */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">Security Score</h3>
          <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Overall Security</span>
              <span className="text-sm font-bold text-green-900 dark:text-green-100">{securityMetrics.overall_score}%</span>
            </div>
            <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
              <div 
                className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${securityMetrics.overall_score}%` }}
              ></div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{securityMetrics.overall_score}</div>
            <div className="text-xs text-green-600 dark:text-green-400">Excellent</div>
          </div>
        </div>
      </div>

      {/* Security Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Sessions</h4>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{securityMetrics.active_sessions}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Currently logged in</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Failed Logins</h4>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{securityMetrics.failed_login_attempts}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Last 24 hours</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">2FA Adoption</h4>
            <Lock className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{securityMetrics.two_factor_enabled}%</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Users with 2FA</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Security Alerts</h4>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{securityMetrics.security_alerts}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Requires attention</p>
        </div>
      </div>

      {/* Security Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Security Features
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">SSL/TLS Encryption</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Database Encryption</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Backup Encryption</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Role-based Access</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Audit Logging</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-500" />
            Recent Security Events
          </h4>
          <div className="space-y-3">
            <div className="text-sm">
              <p className="text-gray-900 dark:text-white font-medium">Security scan completed</p>
              <p className="text-gray-600 dark:text-gray-400">
                {new Date(securityMetrics.last_security_scan).toLocaleString()}
              </p>
            </div>
            <div className="text-sm">
              <p className="text-gray-900 dark:text-white font-medium">SSL certificate valid</p>
              <p className="text-gray-600 dark:text-gray-400">
                Expires: {new Date(securityMetrics.ssl_certificate_expiry).toLocaleDateString()}
              </p>
            </div>
            <div className="text-sm">
              <p className="text-gray-900 dark:text-white font-medium">Password policy updated</p>
              <p className="text-gray-600 dark:text-gray-400">Compliance: {securityMetrics.password_policy_compliance}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderSecuritySettings = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {Object.entries(groupedConfigs).map(([categoryName, configs]: [string, any]) => (
          <div key={categoryName} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{categoryName}</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {configs.map((config: any) => (
                <div key={config.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">{config.key}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{config.description || 'Security configuration setting'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Updated: {new Date(config.updated_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                        {config.is_encrypted ? '***ENCRYPTED***' : config.value}
                      </code>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleEditConfig(config)}
                        disabled={updateConfigMutation.isPending}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {Object.keys(groupedConfigs).length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700 text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Security Configurations</h3>
            <p className="text-gray-600 dark:text-gray-400">No security settings found. Add security configurations in the System tab.</p>
          </div>
        )}
      </div>
    )
  }

  const renderAuditLogs = () => (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-500" />
            Security Audit Logs
          </h3>
          <Button size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {auditLogs.map((log) => (
          <div key={log.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className={`w-3 h-3 rounded-full mt-2 ${
                  log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{log.action}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      log.status === 'success' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Resource: {log.resource}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>User: {log.user}</span>
                    <span>IP: {log.ip_address}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderAuthentication = () => {
    const authConfigs = securityConfigs.filter((config: any) => 
      config.key.includes('password') || config.key.includes('session') || 
      config.key.includes('login') || config.key.includes('lockout')
    )

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-500" />
              Authentication Settings
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {authConfigs.map((config: any) => (
              <div key={config.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{config.key}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{config.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      {config.value}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => handleEditConfig(config)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const renderSecurityPolicies = () => (
    <div className="space-y-6">
      {/* Password Policy */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          Password Policy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <h4 className="font-medium text-green-900 dark:text-green-100">Minimum Length</h4>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">12 characters</p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Complexity Required</h4>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">Yes</p>
          </div>
        </div>
      </div>

      {/* Session Policy */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Session Policy
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <h4 className="font-medium text-orange-900 dark:text-orange-100">Session Timeout</h4>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">1 hour</p>
          </div>
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h4 className="font-medium text-red-900 dark:text-red-100">Max Login Attempts</h4>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">5</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <h4 className="font-medium text-purple-900 dark:text-purple-100">Lockout Duration</h4>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">15 min</p>
          </div>
        </div>
      </div>

      {/* Security Compliance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          Security Compliance
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="font-medium text-green-900 dark:text-green-100">GDPR Compliance</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="font-medium text-green-900 dark:text-green-100">SOC 2 Type II</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="font-medium text-green-900 dark:text-green-100">ISO 27001</span>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderSecurityOverview()
      case 'authentication':
        return renderAuthentication()
      case 'authorization':
      case 'encryption':
        return renderSecuritySettings()
      case 'policies':
        return renderSecurityPolicies()
      case 'audit':
        return renderAuditLogs()
      default:
        return renderSecurityOverview()
    }
  }

  return (
    <div className="space-y-6">
      {/* Security Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {securityTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>

      {/* Edit Configuration Modal */}
      {editingConfig && (
        <EditConfigModal
          config={editingConfig}
          onClose={() => setEditingConfig(null)}
          onSave={handleSaveConfig}
          isLoading={updateConfigMutation.isPending}
        />
      )}
    </div>
  )
}

// Edit Configuration Modal
const EditConfigModal: React.FC<{
  config: any
  onClose: () => void
  onSave: (config: any) => void
  isLoading: boolean
}> = ({ config, onClose, onSave, isLoading }) => {
  const [value, setValue] = useState(config.value)
  const [description, setDescription] = useState(config.description || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...config,
      value,
      description
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Edit Security Configuration
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Configuration Key
            </label>
            <input
              type="text"
              value={config.key}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value *
            </label>
            <input
              type={config.is_encrypted ? 'password' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          </div>

          {config.is_encrypted && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-700 dark:text-yellow-300">
                <Lock className="h-4 w-4" />
                <span className="text-sm font-medium">Encrypted Configuration</span>
              </div>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                This value is encrypted and will be securely stored.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SecurityConfig