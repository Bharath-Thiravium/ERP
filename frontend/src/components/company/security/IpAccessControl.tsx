import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Globe, Plus, Trash2, Shield, AlertTriangle, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { apiClient } from '../../../lib/api'
import toast from 'react-hot-toast'

const IpAccessControl: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRuleForm, setNewRuleForm] = useState({ ip_address: '', rule_type: 'allow', description: '' })
  const queryClient = useQueryClient()

  // Fetch IP restrictions
  const { data: ipData, isLoading } = useQuery({
    queryKey: ['company-ip-restrictions'],
    queryFn: () => apiClient.get('/api/company-dashboard/security/ip-restrictions/'),
  })

  const ipRestrictions = ipData?.data?.restrictions || []
  const isEnabled = ipData?.data?.is_enabled || false

  // Toggle IP restrictions
  const toggleMutation = useMutation({
    mutationFn: (enabled: boolean) => apiClient.post('/api/company-dashboard/security/ip-restrictions/toggle/', { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-ip-restrictions'] })
      toast.success(`IP restrictions ${isEnabled ? 'disabled' : 'enabled'}`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to toggle IP restrictions')
    }
  })

  // Create IP rule
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/company-dashboard/security/ip-restrictions/', data),
    onSuccess: () => {
      toast.success('IP rule created successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-ip-restrictions'] })
      setShowCreateModal(false)
      setNewRuleForm({ ip_address: '', rule_type: 'allow', description: '' })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create IP rule')
    }
  })

  // Delete IP rule
  const deleteMutation = useMutation({
    mutationFn: (ruleId: number) => apiClient.delete(`/api/company-dashboard/security/ip-restrictions/${ruleId}/`),
    onSuccess: () => {
      toast.success('IP rule deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-ip-restrictions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete IP rule')
    }
  })

  const handleCreateRule = () => {
    if (!newRuleForm.ip_address.trim()) {
      toast.error('Please enter an IP address')
      return
    }
    createMutation.mutate(newRuleForm)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span>IP Access Control</span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => toggleMutation.mutate(e.target.checked)}
                disabled={toggleMutation.isPending}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium">Enable IP Restrictions</span>
            </label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!isEnabled && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium mb-1">IP Restrictions Disabled</p>
                  <p>Enable IP restrictions to control access based on IP addresses. This adds an extra layer of security to your account.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900 dark:text-white">IP Address Rules</h4>
            <Button 
              size="sm" 
              disabled={!isEnabled} 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add IP Rule
            </Button>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">Loading IP rules...</p>
              </div>
            ) : ipRestrictions.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No IP Rules</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Add IP addresses or ranges to control access to your account
                </p>
              </div>
            ) : (
              ipRestrictions.map((rule: any) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      rule.type === 'allow' 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      <Shield className={`h-4 w-4 ${
                        rule.type === 'allow' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{rule.ipAddress}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rule.type === 'allow'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {rule.type.toUpperCase()}
                    </span>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this IP rule?')) {
                          deleteMutation.mutate(rule.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">IP Restriction Guidelines:</p>
                <ul className="space-y-1">
                  <li>• Use CIDR notation for IP ranges (e.g., 192.168.1.0/24)</li>
                  <li>• Allow rules grant access, deny rules block access</li>
                  <li>• Rules are processed in order of creation</li>
                  <li>• Your current IP: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{ipData?.data?.current_ip || 'Loading...'}</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Create IP Rule Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Add IP Rule
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
                    IP Address/Range *
                  </label>
                  <input
                    type="text"
                    value={newRuleForm.ip_address}
                    onChange={(e) => setNewRuleForm(prev => ({ ...prev, ip_address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="192.168.1.0/24 or 203.0.113.1"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Rule Type
                  </label>
                  <select
                    value={newRuleForm.rule_type}
                    onChange={(e) => setNewRuleForm(prev => ({ ...prev, rule_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="allow">Allow</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newRuleForm.description}
                    onChange={(e) => setNewRuleForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Office Network, Home IP"
                  />
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
                  onClick={handleCreateRule}
                  disabled={createMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {createMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rule
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

export default IpAccessControl