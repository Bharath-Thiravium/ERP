import React, { useState, useEffect } from 'react'
import { Plug, Settings, CheckCircle, XCircle, AlertCircle, RefreshCw, Edit, Trash2 } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import { IntegrationModal } from '../components/IntegrationModal'
import toast from 'react-hot-toast'

interface Integration {
  id: number
  name: string
  integration_type: string
  provider: string
  status: 'active' | 'inactive' | 'error' | 'pending'
  last_sync?: string
  created_at: string
}

const IntegrationManagement: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800'
  }

  const statusIcons = {
    active: CheckCircle,
    inactive: XCircle,
    error: AlertCircle,
    pending: RefreshCw
  }

  // Fetch integrations
  const fetchIntegrations = async () => {
    if (!sessionKey!) return
    
    try {
      setLoading(true)
      const [integrationsRes, dashboardRes] = await Promise.all([
        crmApi.getIntegrations(sessionKey!),
        crmApi.getIntegrationDashboard(sessionKey!)
      ])
      
      setIntegrations(integrationsRes.data.results || integrationsRes.data || [])
      setDashboardData(dashboardRes.data)
    } catch (error) {
      console.error('Error fetching integrations:', error)
      toast.error('Failed to fetch integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [sessionKey])

  // Test connection
  const testConnection = async (integrationId: number) => {
    if (!sessionKey!) return
    
    try {
      await crmApi.testIntegrationConnection(sessionKey!, integrationId)
      toast.success('Connection test successful!')
      fetchIntegrations()
    } catch (error) {
      console.error('Error testing connection:', error)
      toast.error('Connection test failed')
    }
  }

  // Sync data
  const syncData = async (integrationId: number) => {
    if (!sessionKey!) return
    
    try {
      await crmApi.syncIntegrationData(sessionKey!, integrationId)
      toast.success('Data sync completed!')
      fetchIntegrations()
    } catch (error) {
      console.error('Error syncing data:', error)
      toast.error('Data sync failed')
    }
  }

  // Handle add integration
  const handleAddIntegration = () => {
    setSelectedIntegration(null)
    setShowModal(true)
  }

  // Handle edit integration
  const handleEditIntegration = (integration: Integration) => {
    setSelectedIntegration(integration)
    setShowModal(true)
  }

  // Handle delete integration
  const handleDeleteIntegration = async (integrationId: number) => {
    if (!confirm('Are you sure you want to delete this integration?')) return
    
    try {
      await crmApi.deleteIntegration(sessionKey!, integrationId)
      toast.success('Integration deleted successfully!')
      fetchIntegrations()
    } catch (error) {
      toast.error('Failed to delete integration')
    }
  }

  // Handle modal success
  const handleModalSuccess = () => {
    fetchIntegrations()
    setSelectedIntegration(null)
  }

  // Handle close modal
  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedIntegration(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Integration Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage third-party integrations and data synchronization
            </p>
          </div>
          <Button 
            onClick={handleAddIntegration}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plug className="h-4 w-4 mr-2" />
            Add Integration
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Integrations</p>
                <p className="text-2xl font-bold text-blue-600">{dashboardData.total_integrations}</p>
              </div>
              <Plug className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600">{dashboardData.active_integrations}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Errors</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData.error_integrations}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Logs</p>
                <p className="text-2xl font-bold text-purple-600">{dashboardData.recent_logs?.length || 0}</p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Integrations List */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Integrations</h2>
        
        {integrations.length === 0 ? (
          <div className="text-center py-12">
            <Plug className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No integrations configured</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Get started by adding your first integration
            </p>
            <Button 
              onClick={handleAddIntegration}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              <Plug className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {integrations.map((integration) => {
              const StatusIcon = statusIcons[integration.status]
              return (
                <div key={integration.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                      <Plug className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{integration.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {integration.provider} • {integration.integration_type.replace('_', ' ')}
                      </p>
                      {integration.last_sync && (
                        <p className="text-xs text-gray-400">
                          Last sync: {new Date(integration.last_sync).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${statusColors[integration.status]}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span className="capitalize">{integration.status}</span>
                    </span>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => testConnection(integration.id)}
                      >
                        Test
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => syncData(integration.id)}
                        className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                      >
                        Sync
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditIntegration(integration)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteIntegration(integration.id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Integration Modal */}
      <IntegrationModal
        isOpen={showModal}
        onClose={handleCloseModal}
        onSuccess={handleModalSuccess}
        integration={selectedIntegration}
      />
    </div>
  )
}

export default IntegrationManagement