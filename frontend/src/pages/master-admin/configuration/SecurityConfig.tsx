import React, { useState } from 'react'
import { 
  Shield, 
  Lock, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  EyeOff,
  RefreshCw,
  Settings,
  Users,
  Clock,
  Globe,
  Server
} from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import toast from 'react-hot-toast'

const SecurityConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({})

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

  const securitySettings = [
    {
      category: 'Authentication',
      settings: [
        { key: 'password_min_length', value: '12', description: 'Minimum password length' },
        { key: 'password_complexity', value: 'true', description: 'Require complex passwords' },
        { key: 'session_timeout', value: '3600', description: 'Session timeout (seconds)' },
        { key: 'max_login_attempts', value: '5', description: 'Maximum failed login attempts' },
        { key: 'lockout_duration', value: '900', description: 'Account lockout duration (seconds)' }
      ]
    },
    {
      category: 'Encryption',
      settings: [
        { key: 'database_encryption', value: 'AES-256', description: 'Database encryption algorithm' },
        { key: 'backup_encryption', value: 'true', description: 'Encrypt database backups' },
        { key: 'ssl_tls_version', value: 'TLS 1.3', description: 'Minimum SSL/TLS version' },
        { key: 'api_encryption', value: 'true', description: 'Encrypt API communications' }
      ]
    },
    {
      category: 'Access Control',
      settings: [
        { key: 'rbac_enabled', value: 'true', description: 'Role-based access control' },
        { key: 'ip_whitelist', value: '192.168.1.0/24', description: 'Allowed IP ranges' },
        { key: 'api_rate_limit', value: '1000', description: 'API requests per hour' },
        { key: 'cors_origins', value: 'https://app.example.com', description: 'Allowed CORS origins' }
      ]
    }
  ]

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

  const toggleShowPassword = (key: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

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

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      {securitySettings.map((category) => (
        <div key={category.category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{category.category}</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {category.settings.map((setting) => (
              <div key={setting.key} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">{setting.key}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{setting.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                      {setting.value}
                    </code>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderSecurityOverview()
      case 'authentication':
      case 'authorization':
      case 'encryption':
      case 'policies':
        return renderSecuritySettings()
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
    </div>
  )
}

export default SecurityConfig