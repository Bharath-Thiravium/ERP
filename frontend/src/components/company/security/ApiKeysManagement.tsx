import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Code, Plus, Eye, EyeOff, Copy, Trash2, Calendar, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { apiClient } from '../../../lib/api'
import toast from 'react-hot-toast'

const ApiKeysManagement: React.FC = () => {
  const [showKeys, setShowKeys] = useState<{[key: number]: boolean}>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyForm, setNewKeyForm] = useState({ name: '', permissions: ['read'] })
  const queryClient = useQueryClient()

  // Fetch API keys
  const { data: apiKeysData } = useQuery({
    queryKey: ['company-api-keys'],
    queryFn: () => apiClient.get('/api/company-dashboard/security/api-keys/'),
  })

  const apiKeys = apiKeysData?.data || []

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/company-dashboard/security/api-keys/', data),
    onSuccess: () => {
      toast.success('API key created successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-api-keys'] })
      setShowCreateModal(false)
      setNewKeyForm({ name: '', permissions: ['read'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create API key')
    }
  })

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: (keyId: number) => apiClient.delete(`/api/company-dashboard/security/api-keys/${keyId}/`),
    onSuccess: () => {
      toast.success('API key deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-api-keys'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete API key')
    }
  })

  const toggleKeyVisibility = (keyId: number) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('API key copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleCreateApiKey = () => {
    if (!newKeyForm.name.trim()) {
      toast.error('Please enter a name for the API key')
      return
    }
    createApiKeyMutation.mutate(newKeyForm)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span>API Keys Management</span>
          </div>
          <Button 
            size="sm" 
            className="bg-purple-600 hover:bg-purple-700"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No API Keys</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create API keys to integrate with external services
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create First API Key
              </Button>
            </div>
          ) : (
            apiKeys.map((apiKey: any) => (
              <div key={apiKey.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{apiKey.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Created: {new Date(apiKey.created).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(apiKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this API key?')) {
                          deleteApiKeyMutation.mutate(apiKey.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 mb-3">
                  <code className="text-sm font-mono">
                    {showKeys[apiKey.id] ? apiKey.key : '••••••••••••••••••••••••••••••••'}
                  </code>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span>Permissions: {apiKey.permissions.join(', ')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Create API Key
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key Name *
                  </label>
                  <input
                    type="text"
                    value={newKeyForm.name}
                    onChange={(e) => setNewKeyForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Production API, Development Key"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Permissions
                  </label>
                  <div className="space-y-2">
                    {['read', 'write', 'delete'].map((permission) => (
                      <label key={permission} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newKeyForm.permissions.includes(permission)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewKeyForm(prev => ({
                                ...prev,
                                permissions: [...prev.permissions, permission]
                              }))
                            } else {
                              setNewKeyForm(prev => ({
                                ...prev,
                                permissions: prev.permissions.filter(p => p !== permission)
                              }))
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize">
                          {permission}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateApiKey}
                  disabled={createApiKeyMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {createApiKeyMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Key
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ApiKeysManagement