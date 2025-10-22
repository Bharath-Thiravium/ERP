import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Shield, Key, Activity, CheckCircle, XCircle, AlertTriangle,
  TestTube, Edit, Trash2, Lock, Unlock, RefreshCw, Server
} from 'lucide-react'
import { apiClient } from '../../../lib/api'
import { Button } from '../../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/Card'
import CreateCredentialModal from './CreateCredentialModal'
import EditCredentialModal from './EditCredentialModal'
import toast from 'react-hot-toast'

interface GovernmentCredential {
  id: number
  api_type: string
  api_type_display: string
  environment: string
  environment_display: string
  credential_name: string
  description: string
  base_url: string
  client_id_masked: string
  username_masked: string
  gstin_masked: string
  pan_masked: string
  is_active: boolean
  is_validated: boolean
  last_validated: string | null
  validation_error: string
  last_used: string | null
  usage_count: number
  created_at: string
  updated_at: string
  created_by: string
}

const GovernmentAPICredentials: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTestModal, setShowTestModal] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<GovernmentCredential | null>(null)
  const [testResult, setTestResult] = useState<any>(null)
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  // Fetch credentials
  const { data: credentials, isLoading: credentialsLoading, error: credentialsError } = useQuery({
    queryKey: ['government-credentials'],
    queryFn: () => apiClient.get('/api/company-dashboard/government-api/credentials/'),
    retry: 1,

  })

  // Fetch credentials summary
  const { data: credentialsSummary } = useQuery({
    queryKey: ['credentials-summary'],
    queryFn: () => apiClient.get('/api/company-dashboard/government-api/credentials-summary/')
  })

  const credentialsData = Array.isArray((credentials as any)?.data?.results) ? (credentials as any).data.results : 
                         Array.isArray((credentials as any)?.data) ? (credentials as any).data : []
  const summaryData = credentialsSummary?.data || {}

  // Debug logging
  console.log('Credentials response:', credentials)
  console.log('Processed credentialsData:', credentialsData)
  console.log('Summary data:', summaryData)

  // Toggle credential status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: (credentialId: number) => 
      apiClient.post(`/api/company-dashboard/government-api/credentials/${credentialId}/toggle-status/`),
    onSuccess: () => {
      toast.success('Credential status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['government-credentials'] })
      queryClient.invalidateQueries({ queryKey: ['credentials-summary'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update credential status')
    }
  })

  // Delete credential mutation
  const deleteCredentialMutation = useMutation({
    mutationFn: (credentialId: number) => 
      apiClient.delete(`/api/company-dashboard/government-api/credentials/${credentialId}/`),
    onSuccess: () => {
      toast.success('Credential deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['government-credentials'] })
      queryClient.invalidateQueries({ queryKey: ['credentials-summary'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete credential')
    }
  })

  const getAPITypeIcon = (apiType: string) => {
    switch (apiType) {
      case 'gst': return '🏛️'
      case 'tds': return '💰'
      case 'einvoice': return '📄'
      case 'eway_bill': return '🚛'
      case 'pf': return '🏦'
      case 'esi': return '🏥'
      default: return '⚙️'
    }
  }

  const getStatusColor = (credential: GovernmentCredential) => {
    if (!credential.is_active) return 'text-gray-500'
    if (credential.is_validated) return 'text-green-600'
    if (credential.validation_error) return 'text-red-600'
    return 'text-yellow-600'
  }

  const getStatusIcon = (credential: GovernmentCredential) => {
    if (!credential.is_active) return <Lock className="h-4 w-4" />
    if (credential.is_validated) return <CheckCircle className="h-4 w-4" />
    if (credential.validation_error) return <XCircle className="h-4 w-4" />
    return <AlertTriangle className="h-4 w-4" />
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'credentials', label: 'Credentials', icon: Key },
    { id: 'activity', label: 'Activity', icon: Activity }
  ]

  if (credentialsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (credentialsError) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600">Failed to load credentials. Please try again.</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['government-credentials'] })}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Government API Credentials
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your government API credentials for GST, TDS, E-Invoice, and other services
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Credentials
        </Button>
      </div>

      {/* Navigation Tabs */}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Credentials
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {summaryData.total_credentials || 0}
                    </p>
                  </div>
                  <Key className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Active Credentials
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {summaryData.active_credentials || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Validated
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {summaryData.validated_credentials || 0}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      API Types
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {Object.keys(summaryData.by_api_type || {}).length}
                    </p>
                  </div>
                  <Server className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Getting Started */}
          <Card>
            <CardHeader>
              <CardTitle>🚀 Phase 1: Government API Integration</CardTitle>
              <CardDescription>
                Secure credential management for Indian government APIs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    ✅ Phase 1 Implementation Complete
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Secure encrypted credential storage</li>
                    <li>• Military-grade security with audit logging</li>
                    <li>• Support for GST, TDS, E-Invoice APIs</li>
                    <li>• Credential validation and testing</li>
                    <li>• Company-specific credential management</li>
                  </ul>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">🏛️</span>
                      <h5 className="font-medium">GST API</h5>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      GSTIN validation, tax rates, GSTR filing
                    </p>
                  </div>
                  
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">💰</span>
                      <h5 className="font-medium">TDS API</h5>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      PAN validation, TDS rates, return filing
                    </p>
                  </div>
                  
                  <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xl">📄</span>
                      <h5 className="font-medium">E-Invoice API</h5>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      IRN generation, QR codes, compliance
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Credentials Tab */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          {credentialsData.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Government API Credentials
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Get started by adding your first government API credentials for GST, TDS, or other services.
                </p>
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Credentials
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {credentialsData.length > 0 && credentialsData.map((credential: GovernmentCredential) => (
                <Card key={credential.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getAPITypeIcon(credential.api_type)}</span>
                        <div>
                          <CardTitle className="text-lg">
                            {credential.credential_name}
                          </CardTitle>
                          <CardDescription>
                            {credential.api_type_display} • {credential.environment_display}
                          </CardDescription>
                        </div>
                      </div>
                      <div className={`flex items-center space-x-1 ${getStatusColor(credential)}`}>
                        {getStatusIcon(credential)}
                        <span className="text-sm font-medium">
                          {credential.is_active ? 
                            (credential.is_validated ? 'Validated' : 
                             credential.validation_error ? 'Error' : 'Pending') 
                            : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Credential Details */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {credential.client_id_masked && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Client ID</p>
                            <p className="font-mono">{credential.client_id_masked}</p>
                          </div>
                        )}
                        {credential.username_masked && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Username</p>
                            <p className="font-mono">{credential.username_masked}</p>
                          </div>
                        )}
                        {credential.gstin_masked && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">GSTIN</p>
                            <p className="font-mono">{credential.gstin_masked}</p>
                          </div>
                        )}
                        {credential.pan_masked && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">PAN</p>
                            <p className="font-mono">{credential.pan_masked}</p>
                          </div>
                        )}
                      </div>

                      {/* Usage Stats */}
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>Used {credential.usage_count} times</span>
                        {credential.last_used && (
                          <span>Last used: {new Date(credential.last_used).toLocaleDateString()}</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedCredential(credential)
                              setShowTestModal(true)
                            }}
                          >
                            <TestTube className="h-4 w-4 mr-1" />
                            Test
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedCredential(credential)
                              setShowEditModal(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`${credential.is_active ? 'Deactivate' : 'Activate'} this credential?`)) {
                                toggleStatusMutation.mutate(credential.id)
                              }
                            }}
                            className={credential.is_active ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}
                            title={credential.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {credential.is_active ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Delete "${credential.credential_name}"? This cannot be undone.`)) {
                                deleteCredentialMutation.mutate(credential.id)
                              }
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <Card>
          <CardHeader>
            <CardTitle>Credential Activity Logs</CardTitle>
            <CardDescription>
              Detailed audit trail of all government API credential operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Activity logs will be displayed here
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Credential Modal */}
      <CreateCredentialModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Test Modal */}
      {showTestModal && selectedCredential && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Test {selectedCredential.api_type_display}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Test connection for: {selectedCredential.credential_name}
              </p>
              
              {/* Test Result */}
              {testResult && (
                <div className={`p-4 rounded-lg mb-4 ${
                  testResult.success 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start space-x-3">
                    {testResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div>
                      <p className={`font-medium ${
                        testResult.success 
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-red-900 dark:text-red-100'
                      }`}>
                        {testResult.success ? 'Test Successful' : 'Test Failed'}
                      </p>
                      <p className={`text-sm mt-1 ${
                        testResult.success 
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {testResult.message}
                      </p>
                      {testResult.data && (
                        <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto">
                          {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTestModal(false)
                    setSelectedCredential(null)
                    setTestResult(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedCredential) return
                    
                    setIsTestingConnection(true)
                    setTestResult(null)
                    
                    try {
                      const response = await apiClient.post(
                        `/api/company-dashboard/government-api/credentials/${selectedCredential.id}/test/`,
                        {
                          credential_id: selectedCredential.id,
                          test_type: 'connection'
                        }
                      )
                      
                      setTestResult(response.data)
                      
                      if (response.data.success) {
                        toast.success('Connection test successful!')
                      } else {
                        toast.error(`Test failed: ${response.data.message}`)
                      }
                    } catch (error: any) {
                      const errorMsg = error.response?.data?.error || 'Test failed'
                      setTestResult({ success: false, message: errorMsg })
                      toast.error(errorMsg)
                    } finally {
                      setIsTestingConnection(false)
                    }
                  }}
                  disabled={isTestingConnection}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isTestingConnection ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Run Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditCredentialModal 
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedCredential(null)
        }}
        credential={selectedCredential}
      />
    </div>
  )
}

export default GovernmentAPICredentials