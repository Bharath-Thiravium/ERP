import React, { useState, useEffect } from 'react'
import { Link, RefreshCw, CheckCircle, AlertTriangle, Clock, Settings, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface PortalStatus {
  status: string
  last_sync: string
  next_sync: string
}

interface PortalStatuses {
  epfo: PortalStatus
  esic: PortalStatus
  income_tax: PortalStatus
  professional_tax: PortalStatus
}

interface Submission {
  date: string
  type: string
  portal: string
  status: string
  reference: string
}

const IntegrationHub: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [portalStatuses, setPortalStatuses] = useState<PortalStatuses | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedPortal, setSelectedPortal] = useState<string>('')
  const [config, setConfig] = useState({
    api_endpoint: '',
    client_id: '',
    client_secret: '',
    sync_frequency: 'daily'
  })

  useEffect(() => {
    fetchPortalStatuses()
    fetchSubmissionHistory()
  }, [sessionKey])

  const fetchPortalStatuses = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/integration/portal_status/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setPortalStatuses(response.data)
    } catch (error) {
      console.error('Error fetching portal statuses:', error)
    }
  }

  const fetchSubmissionHistory = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/integration/submission_history/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setSubmissions(response.data)
    } catch (error) {
      console.error('Error fetching submission history:', error)
    }
  }

  const syncPortal = async (portal: string) => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      const response = await api.post('/api/hr/integration/sync_portal/', 
        { portal, session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      await fetchPortalStatuses()
      toast.success(response.data.message || `${portal.toUpperCase()} portal synced successfully`)
      setLoading(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to sync ${portal.toUpperCase()} portal`)
      setLoading(false)
    }
  }

  const saveConfiguration = async () => {
    if (!sessionKey || !selectedPortal) return
    
    try {
      const response = await api.post('/api/hr/integration/configure_portal/', 
        { portal: selectedPortal, ...config, session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      toast.success(response.data.message || 'Configuration saved successfully')
      setShowConfigModal(false)
      setConfig({ api_endpoint: '', client_id: '', client_secret: '', sync_frequency: 'daily' })
      fetchPortalStatuses()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save configuration')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected': case 'Submitted': return 'text-green-600 dark:text-green-400'
      case 'Disconnected': case 'Failed': return 'text-red-600 dark:text-red-400'
      case 'Syncing': case 'Pending': return 'text-blue-600 dark:text-blue-400'
      case 'Error': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Connected': case 'Submitted': return <CheckCircle className="h-4 w-4" />
      case 'Disconnected': case 'Failed': return <WifiOff className="h-4 w-4" />
      case 'Syncing': return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'Pending': return <Clock className="h-4 w-4" />
      case 'Error': return <AlertTriangle className="h-4 w-4" />
      default: return <Wifi className="h-4 w-4" />
    }
  }

  const openConfigModal = (portal: string) => {
    setSelectedPortal(portal)
    setShowConfigModal(true)
  }

  const renderPortalCard = (portalName: string, portalData: PortalStatus, displayName: string) => (
    <div key={portalName} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="text-center mb-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-2">{displayName}</h4>
        <div className={`flex items-center justify-center space-x-2 ${getStatusColor(portalData.status)}`}>
          {getStatusIcon(portalData.status)}
          <span className="text-sm font-medium">{portalData.status}</span>
        </div>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-4 space-y-1">
        <div>Last Sync: {new Date(portalData.last_sync).toLocaleString()}</div>
        <div>Next Sync: {portalData.next_sync}</div>
      </div>
      
      <div className="flex space-x-2">
        <Button 
          size="sm"
          onClick={() => syncPortal(portalName)}
          disabled={loading || portalData.status === 'Disconnected'}
          className="flex-1"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Sync
        </Button>
        <Button 
          size="sm"
          variant="ghost"
          onClick={() => openConfigModal(portalName)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Government Portal Integration</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time synchronization with government portals</p>
        </div>
        <Button 
          onClick={() => syncPortal('all')} 
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Sync All Portals
        </Button>
      </div>

      {/* Portal Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Portal Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {portalStatuses && (
              <>
                {renderPortalCard('epfo', portalStatuses.epfo, 'EPFO Portal')}
                {renderPortalCard('esic', portalStatuses.esic, 'ESIC Portal')}
                {renderPortalCard('income_tax', portalStatuses.income_tax, 'Income Tax Portal')}
                {renderPortalCard('professional_tax', portalStatuses.professional_tax, 'Professional Tax Portal')}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Integration Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Integration Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Overall Health</span>
                  <span className="text-gray-900 dark:text-white">85%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Data Sync Rate</span>
                  <span className="text-gray-900 dark:text-white">92%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Error Rate</span>
                  <span className="text-gray-900 dark:text-white">3%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '3%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">EPFO Sync Completed</p>
                  <p className="text-xs text-green-600 dark:text-green-400">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-300">ESIC Data Syncing</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">5 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-300">PT Portal Connection Issue</p>
                  <p className="text-xs text-orange-600 dark:text-orange-400">1 hour ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submission History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Date</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Type</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Portal</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 text-gray-900 dark:text-white">
                        {new Date(submission.date).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{submission.type}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{submission.portal}</td>
                      <td className="p-3">
                        <div className={`flex items-center space-x-2 ${getStatusColor(submission.status)}`}>
                          {getStatusIcon(submission.status)}
                          <span>{submission.status}</span>
                        </div>
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{submission.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Link className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No submission history available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Configure {selectedPortal.toUpperCase()} Integration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Endpoint</label>
                <input
                  type="text"
                  value={config.api_endpoint}
                  onChange={(e) => setConfig({ ...config, api_endpoint: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter API endpoint URL"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client ID</label>
                <input
                  type="text"
                  value={config.client_id}
                  onChange={(e) => setConfig({ ...config, client_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter client ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Secret</label>
                <input
                  type="password"
                  value={config.client_secret}
                  onChange={(e) => setConfig({ ...config, client_secret: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter client secret"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sync Frequency</label>
                <select
                  value={config.sync_frequency}
                  onChange={(e) => setConfig({ ...config, sync_frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="manual">Manual Only</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="ghost" onClick={() => setShowConfigModal(false)}>
                Cancel
              </Button>
              <Button onClick={saveConfiguration}>
                Save Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IntegrationHub