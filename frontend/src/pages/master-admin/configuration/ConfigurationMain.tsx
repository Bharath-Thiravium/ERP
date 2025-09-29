import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Database, 
  Shield, 
  Settings, 
  Bell, 
  Key, 
  Activity,
  Server,
  HardDrive,

  RefreshCw,
  Calendar,
  Clock,

  AlertTriangle,

} from 'lucide-react'
import { apiClient } from '../../../lib/api'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'

import DatabaseBackup from './DatabaseBackup'
import SystemSettings from './SystemSettings'
import SecurityConfig from './SecurityConfig'

const ConfigurationMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')

  // Fetch configuration dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['configuration-dashboard'],
    queryFn: () => apiClient.get('/api/configuration/dashboard/'),
    refetchInterval: 30000,
    retry: false,
  })

  const dashboard = dashboardData?.data || {}

  const configTabs = [
    { id: 'overview', label: 'Overview', icon: Activity, description: 'System overview and status' },
    { id: 'database', label: 'Database', icon: Database, description: 'Database backup and management' },
    { id: 'system', label: 'System', icon: Settings, description: 'System configuration settings' },
    { id: 'security', label: 'Security', icon: Shield, description: 'Security policies and settings' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Notification settings' },
    { id: 'api', label: 'API Keys', icon: Key, description: 'API key management' },
    { id: 'monitoring', label: 'Monitoring', icon: Activity, description: 'System monitoring settings' }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* System Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-blue-500" />
          System Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Database Engine</p>
            <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              {dashboard.system_info?.database_engine?.split('.')?.pop() || 'PostgreSQL'}
            </p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Database Name</p>
            <p className="text-lg font-semibold text-green-900 dark:text-green-100">
              {dashboard.system_info?.database_name || 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Python Version</p>
            <p className="text-lg font-semibold text-purple-900 dark:text-purple-100">
              {dashboard.system_info?.python_version || 'N/A'}
            </p>
          </div>
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Django Version</p>
            <p className="text-lg font-semibold text-orange-900 dark:text-orange-100">
              {dashboard.system_info?.django_version || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Configuration Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Configurations</h3>
            <Settings className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {dashboard.config_stats?.total_configurations || 0}
          </p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {dashboard.config_stats?.categories || 0} categories
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Total Backups</h3>
            <Database className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {dashboard.backup_stats?.total_backups || 0}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            {dashboard.backup_stats?.total_size_mb || 0} MB total
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">Active Schedules</h3>
            <Calendar className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {dashboard.active_schedules || 0}
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-400">Automated backups</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-orange-700 dark:text-orange-300">Pending Tasks</h3>
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {dashboard.pending_maintenance || 0}
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400">Maintenance tasks</p>
        </div>
      </div>

      {/* Recent Backups */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-green-500" />
            Recent Backups
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActiveTab('database')}
          >
            View All
          </Button>
        </div>
        
        {dashboard.recent_backups?.length > 0 ? (
          <div className="space-y-3">
            {dashboard.recent_backups.slice(0, 5).map((backup: any) => (
              <div key={backup.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    backup.status === 'completed' ? 'bg-green-500' :
                    backup.status === 'failed' ? 'bg-red-500' :
                    backup.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-yellow-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{backup.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {backup.backup_type} • {backup.file_size_mb}MB • {new Date(backup.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    backup.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
                    backup.status === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300' :
                    backup.status === 'running' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}>
                    {backup.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No backups found</p>
          </div>
        )}
      </div>

      {/* Backup Success Rate */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Backup Health
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {dashboard.backup_stats?.recent_success_rate || 0}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Success Rate (30 days)</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {dashboard.backup_stats?.successful_backups || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Successful Backups</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">
              {dashboard.backup_stats?.failed_backups || 0}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Failed Backups</p>
          </div>
        </div>
      </div>
    </div>
  )

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'database':
        return <DatabaseBackup />
      case 'system':
        return <SystemSettings />
      case 'security':
        return <SecurityConfig />
      case 'notifications':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Notification Settings</h3>
              <p className="text-gray-600 dark:text-gray-400">Configure email, SMS, and system notifications</p>
              <Button className="mt-4" variant="outline">Coming Soon</Button>
            </div>
          </div>
        )
      case 'api':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">API Key Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Manage API keys, webhooks, and integrations</p>
              <Button className="mt-4" variant="outline">Coming Soon</Button>
            </div>
          </div>
        )
      case 'monitoring':
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Monitoring Configuration</h3>
              <p className="text-gray-600 dark:text-gray-400">Configure monitoring thresholds and alerts</p>
              <Button className="mt-4" variant="outline">Coming Soon</Button>
            </div>
          </div>
        )
      default:
        return renderOverview()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Session Expired</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your session has expired. Please login again to access the Configuration menu.
          </p>
          <div className="space-x-3">
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={() => window.location.href = '/login'} className="bg-blue-600 hover:bg-blue-700 text-white">
              Login Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Configuration Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {configTabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
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

export default ConfigurationMain