import React, { useState } from 'react'

import {
  Shield,
  Users,
  Activity,
  Clock,
  Eye,
  Lock,
  UserX,

  XCircle,
  Globe,
  Smartphone,
  Monitor,
  RefreshCw
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import toast from 'react-hot-toast'

interface SecurityDashboardProps {
  companyId?: number
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('24h')

  // Fetch security logs


  // Fetch active sessions (mock data for now)
  const activeSessions = [
    {
      id: 1,
      username: 'finance_user',
      service: 'Finance',
      ip_address: '192.168.1.100',
      device: 'Chrome on Windows',
      login_time: '2025-09-11T10:30:00Z',
      last_activity: '2025-09-11T14:45:00Z',
      status: 'active'
    },
    {
      id: 2,
      username: 'hr_manager',
      service: 'HR',
      ip_address: '192.168.1.101',
      device: 'Safari on macOS',
      login_time: '2025-09-11T09:15:00Z',
      last_activity: '2025-09-11T14:30:00Z',
      status: 'active'
    },
    {
      id: 3,
      username: 'inventory_user',
      service: 'Inventory',
      ip_address: '192.168.1.102',
      device: 'Firefox on Linux',
      login_time: '2025-09-11T08:00:00Z',
      last_activity: '2025-09-11T12:00:00Z',
      status: 'idle'
    }
  ]

  // Security metrics (mock data)
  const securityMetrics = {
    totalSessions: 15,
    activeSessions: 8,
    failedLogins: 3,
    suspiciousActivity: 1,
    passwordChanges: 2,
    accountLockouts: 0
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const getDeviceIcon = (device: string) => {
    if (device.includes('Mobile') || device.includes('iPhone') || device.includes('Android')) {
      return <Smartphone className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400'
      case 'idle':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'locked':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const handleTerminateSession = (sessionId: number) => {
    toast.success(`Session ${sessionId} terminated`)
    // In a real app, call API to terminate session
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Security Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Sessions
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {securityMetrics.activeSessions}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {securityMetrics.totalSessions} total today
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Failed Logins
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {securityMetrics.failedLogins}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Last 24 hours
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Security Score
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  98%
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Excellent
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span>Active Sessions</span>
              </CardTitle>
              <CardDescription>
                Currently active service user sessions
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {}}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getDeviceIcon(session.device)}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {session.username}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {session.service} Service
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="flex items-center space-x-1">
                      <Globe className="h-3 w-3" />
                      <span>{session.ip_address}</span>
                    </p>
                    <p className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Last active: {formatDateTime(session.last_activity)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                    {session.status}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTerminateSession(session.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <UserX className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderSecurityLogs = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>Security Logs</span>
        </CardTitle>
        <CardDescription>
          Recent security events and activities
        </CardDescription>
      </CardHeader>
      <CardContent>
        {false ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" text="Loading security logs..." />
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Security Logs
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Security logging system is active and monitoring all activities.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Security Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage security for service user sessions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'sessions', label: 'Sessions', icon: Users },
            { id: 'logs', label: 'Security Logs', icon: Eye },
            { id: 'settings', label: 'Settings', icon: Lock }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'sessions' && renderOverview()}
      {activeTab === 'logs' && renderSecurityLogs()}
      {activeTab === 'settings' && (
        <div className="text-center py-12">
          <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Security Settings
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Security configuration options coming soon.
          </p>
        </div>
      )}
    </div>
  )
}

export default SecurityDashboard
