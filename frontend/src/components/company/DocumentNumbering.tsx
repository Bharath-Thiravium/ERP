import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Hash, Settings, CheckCircle, 
  Plus, Edit, Save, X, RefreshCw, 
  FileText, Calendar, Shield, History
} from 'lucide-react'
import { apiClient } from '../../lib/api'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import toast from 'react-hot-toast'
import EnhancedDocumentNumbering from './EnhancedDocumentNumbering'

interface DocumentNumberingProps {
  onNavigateToTab?: (tab: string) => void
}

const DocumentNumbering: React.FC<DocumentNumberingProps> = () => {
  const queryClient = useQueryClient()
  
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<any>(null)

  const [setupForm, setSetupForm] = useState({
    financial_year: '',
    start_date: '',
    end_date: '',
    quotation_prefix: 'QT',
    purchase_order_prefix: 'PO',
    invoice_prefix: 'INV',
    proforma_invoice_prefix: 'PI',
    payment_prefix: 'PAY',
    customer_prefix: 'CUST',
    vendor_prefix: 'VEN',
    product_prefix: 'PRD',
    starting_number: 1,
    number_padding: 3,
    allow_manual_override: false
  })

  // Fetch current financial year
  const { data: currentFY } = useQuery({
    queryKey: ['current-financial-year'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/current-financial-year/')
  })

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['numbering-dashboard-stats'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/dashboard-stats/')
  })

  // Fetch document numbering configurations
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ['document-numbering-configs'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/configs/')
  })

  // Fetch numbering history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['document-numbering-history'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/history/', {
      params: { page_size: 20 }
    })
  })

  // Fetch system status
  const { data: systemStatusData } = useQuery({
    queryKey: ['document-numbering-status'],
    queryFn: () => apiClient.get('/api/company-dashboard/document-numbering/system-status/')
  })

  // Initialize form with current financial year
  useEffect(() => {
    if (currentFY?.data) {
      setSetupForm(prev => ({
        ...prev,
        financial_year: currentFY.data.financial_year,
        start_date: currentFY.data.start_date,
        end_date: currentFY.data.end_date
      }))
    }
  }, [currentFY])



  // Bulk setup mutation
  const bulkSetupMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/company-dashboard/document-numbering/bulk-setup/', data),
    onSuccess: () => {
      toast.success('Document numbering setup completed successfully!')
      setShowSetupModal(false)
      queryClient.invalidateQueries({ queryKey: ['document-numbering-configs'] })
      queryClient.invalidateQueries({ queryKey: ['numbering-dashboard-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to setup document numbering')
    }
  })

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: any }) => 
      apiClient.put(`/api/company-dashboard/document-numbering/configs/${id}/`, data),
    onSuccess: () => {
      toast.success('Configuration updated successfully!')
      setShowConfigModal(false)
      setSelectedConfig(null)
      queryClient.invalidateQueries({ queryKey: ['document-numbering-configs'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update configuration')
    }
  })

  // Toggle system mutation
  const toggleSystemMutation = useMutation({
    mutationFn: (action: 'enable' | 'disable') => 
      apiClient.post('/api/company-dashboard/document-numbering/toggle-system/', { action }),
    onSuccess: (data) => {
      toast.success(data.data.message)
      queryClient.invalidateQueries({ queryKey: ['document-numbering-status'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to toggle system')
    }
  })

  const handleBulkSetup = () => {
    if (!setupForm.financial_year || !setupForm.start_date || !setupForm.end_date) {
      toast.error('Please fill all required fields')
      return
    }
    
    // Validate financial year format
    const fyRegex = /^\d{4}-\d{2}$/
    if (!fyRegex.test(setupForm.financial_year)) {
      toast.error('Financial year must be in format YYYY-YY (e.g., 2024-25)')
      return
    }
    
    bulkSetupMutation.mutate(setupForm)
  }

  const handleUpdateConfig = () => {
    if (!selectedConfig) return
    updateConfigMutation.mutate({
      id: selectedConfig.id,
      data: {
        prefix: selectedConfig.prefix,
        starting_number: selectedConfig.starting_number,
        number_padding: selectedConfig.number_padding,
        allow_manual_override: selectedConfig.allow_manual_override,
        is_active: selectedConfig.is_active
      }
    })
  }

  const getDocumentTypeIcon = (docType: string) => {
    switch (docType) {
      case 'quotation': return '📋'
      case 'purchase_order': return '🛒'
      case 'invoice': return '🧾'
      case 'proforma_invoice': return '📄'
      case 'payment': return '💳'
      case 'customer': return '👤'
      case 'vendor': return '🏢'
      case 'product': return '📦'
      default: return '📄'
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Settings },
    { id: 'configurations', label: 'Configurations', icon: FileText },
    { id: 'history', label: 'History', icon: History }
  ]

  // Check if enhanced system should be used
  const useEnhancedSystem = systemStatusData?.data?.use_document_numbering
  
  // If enhanced system is enabled, use the new component
  if (useEnhancedSystem) {
    return <EnhancedDocumentNumbering />
  }
  
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Hash className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Document Numbering System</span>
            {systemStatusData?.data && (
              <span className={`px-2 py-1 text-xs rounded-full ${
                systemStatusData.data.use_document_numbering 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {systemStatusData.data.status.toUpperCase()}
              </span>
            )}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure auto-generated document numbers with company prefixes and financial year management
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {systemStatusData?.data?.use_document_numbering && (
            <Button
              onClick={() => toggleSystemMutation.mutate('disable')}
              disabled={toggleSystemMutation.isPending}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {toggleSystemMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Disable System
            </Button>
          )}
          {!systemStatusData?.data?.use_document_numbering && (
            <Button
              onClick={() => toggleSystemMutation.mutate('enable')}
              disabled={toggleSystemMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {toggleSystemMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Enable System
            </Button>
          )}
          <Button
            onClick={() => setShowSetupModal(true)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!systemStatusData?.data?.use_document_numbering}
          >
            <Plus className="h-4 w-4 mr-2" />
            Setup Numbering
          </Button>
        </div>
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

      {/* System Disabled Warning */}
      {!systemStatusData?.data?.use_document_numbering && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
              Document Numbering System Disabled
            </h3>
          </div>
          <p className="text-yellow-700 dark:text-yellow-300 mt-1 text-sm">
            The centralized document numbering system is currently disabled. Your modules are using the old numbering system. 
            Enable the system to use centralized numbering with financial year management.
          </p>
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Current Financial Year */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span>Current Financial Year</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Financial Year</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {dashboardStats?.data?.current_financial_year || 'Not Set'}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Configurations</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {dashboardStats?.data?.total_configurations || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Active Services</p>
                  <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {dashboardStats?.data?.active_services || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Type Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Document Type Statistics</CardTitle>
              <CardDescription>Numbers generated per document type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashboardStats?.data?.document_type_statistics && 
                  Object.entries(dashboardStats.data.document_type_statistics).map(([docType, stats]: [string, any]) => (
                    <div key={docType} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-2xl">{getDocumentTypeIcon(docType)}</span>
                        <span className="font-medium capitalize">{docType.replace('_', ' ')}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Configs:</span>
                          <span className="font-medium">{stats.count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Generated:</span>
                          <span className="font-medium">{stats.total_generated}</span>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest document number generations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardStats?.data?.recent_activity?.slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getDocumentTypeIcon(activity.document_type)}</span>
                      <div>
                        <p className="font-medium">{activity.document_number}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {activity.document_type_display}
                          {activity.is_manual_override && (
                            <span className="ml-2 px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs rounded">
                              Manual Override
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      {new Date(activity.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configurations Tab */}
      {activeTab === 'configurations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Numbering Configurations</CardTitle>
              <CardDescription>Manage prefixes and settings for each document type</CardDescription>
            </CardHeader>
            <CardContent>
              {configsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2">Loading configurations...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {configs?.data?.length > 0 ? (
                    configs?.data?.map((config: any) => (
                      <div key={config.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <span className="text-2xl">{getDocumentTypeIcon(config.document_type)}</span>
                            <div>
                              <h4 className="font-medium">{config.document_type_display}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Service: {config.service_name} • FY: {config.financial_year}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {config.next_number_preview}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Counter: {config.current_counter}
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedConfig(config)
                                setShowConfigModal(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center space-x-4 text-sm">
                          <span className="flex items-center space-x-1">
                            <Hash className="h-4 w-4 text-gray-400" />
                            <span>Prefix: {config.prefix}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Settings className="h-4 w-4 text-gray-400" />
                            <span>Padding: {config.number_padding}</span>
                          </span>
                          {config.allow_manual_override && (
                            <span className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                              <Shield className="h-4 w-4" />
                              <span>Manual Override</span>
                            </span>
                          )}
                          <span className={`flex items-center space-x-1 ${
                            config.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            <CheckCircle className="h-4 w-4" />
                            <span>{config.is_active ? 'Active' : 'Inactive'}</span>
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Configurations Found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Set up document numbering to get started
                      </p>
                      <Button onClick={() => setShowSetupModal(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Setup Now
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Numbering History</CardTitle>
              <CardDescription>Track all generated document numbers and manual overrides</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2">Loading history...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {history?.data?.results?.length > 0 ? (
                    history?.data?.results?.map((item: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <span className="text-lg">{getDocumentTypeIcon(item.document_type)}</span>
                          <div>
                            <p className="font-mono font-medium">{item.document_number}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {item.document_type_display}
                              {item.created_by_name && ` • by ${item.created_by_name}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          {item.is_manual_override && (
                            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs rounded">
                              Manual Override
                            </span>
                          )}
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No history available</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Setup Document Numbering
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Configure numbering for all document types
                </p>
              </div>
              <button
                onClick={() => setShowSetupModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Financial Year Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Financial Year *
                  </label>
                  <input
                    type="text"
                    value={setupForm.financial_year}
                    onChange={(e) => {
                      let value = e.target.value.replace(/[^0-9-]/g, '') // Only allow numbers and dash
                      // Auto-format to YYYY-YY
                      if (value.length === 4 && !value.includes('-')) {
                        const year = parseInt(value)
                        const nextYear = (year + 1).toString().slice(-2)
                        value = `${year}-${nextYear}`
                      }
                      setSetupForm(prev => ({ ...prev, financial_year: value }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="2024-25"
                    maxLength={7}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Format: YYYY-YY (e.g., 2024-25)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={setupForm.start_date}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={setupForm.end_date}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Document Prefixes */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Document Prefixes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      📋 Quotation
                    </label>
                    <input
                      type="text"
                      value={setupForm.quotation_prefix}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, quotation_prefix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="QT"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      🛒 Purchase Order
                    </label>
                    <input
                      type="text"
                      value={setupForm.purchase_order_prefix}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, purchase_order_prefix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="PO"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      🧾 Invoice
                    </label>
                    <input
                      type="text"
                      value={setupForm.invoice_prefix}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, invoice_prefix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="INV"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      📄 Proforma Invoice
                    </label>
                    <input
                      type="text"
                      value={setupForm.proforma_invoice_prefix}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, proforma_invoice_prefix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="PI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      💳 Payment
                    </label>
                    <input
                      type="text"
                      value={setupForm.payment_prefix}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, payment_prefix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="PAY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      👤 Customer
                    </label>
                    <input
                      type="text"
                      value={setupForm.customer_prefix}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, customer_prefix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="CUST"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      🏢 Vendor
                    </label>
                    <input
                      type="text"
                      value={setupForm.vendor_prefix}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, vendor_prefix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="VEN"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      📦 Product
                    </label>
                    <input
                      type="text"
                      value={setupForm.product_prefix}
                      onChange={(e) => setSetupForm(prev => ({ ...prev, product_prefix: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="PRD"
                    />
                  </div>
                </div>
              </div>

              {/* Common Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Starting Number
                  </label>
                  <input
                    type="number"
                    value={setupForm.starting_number}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, starting_number: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Number Padding
                  </label>
                  <input
                    type="number"
                    value={setupForm.number_padding}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, number_padding: parseInt(e.target.value) || 3 }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="10"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="allow_manual_override"
                    checked={setupForm.allow_manual_override}
                    onChange={(e) => setSetupForm(prev => ({ ...prev, allow_manual_override: e.target.checked }))}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="allow_manual_override" className="text-sm text-gray-700 dark:text-gray-300">
                    Allow Manual Override
                  </label>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Preview Format:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {setupForm.quotation_prefix}-24-{String(setupForm.starting_number).padStart(setupForm.number_padding, '0')}
                  </span>
                  <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {setupForm.purchase_order_prefix}-24-{String(setupForm.starting_number).padStart(setupForm.number_padding, '0')}
                  </span>
                  <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {setupForm.invoice_prefix}-24-{String(setupForm.starting_number).padStart(setupForm.number_padding, '0')}
                  </span>
                  <span className="font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {setupForm.payment_prefix}-24-{String(setupForm.starting_number).padStart(setupForm.number_padding, '0')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => setShowSetupModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkSetup}
                disabled={bulkSetupMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {bulkSetupMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Setup Numbering
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Configuration Modal */}
      {showConfigModal && selectedConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Configuration
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedConfig.document_type_display}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowConfigModal(false)
                  setSelectedConfig(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Prefix
                </label>
                <input
                  type="text"
                  value={selectedConfig.prefix}
                  onChange={(e) => setSelectedConfig((prev: any) => ({ ...prev, prefix: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Starting Number
                </label>
                <input
                  type="number"
                  value={selectedConfig.starting_number}
                  onChange={(e) => setSelectedConfig((prev: any) => ({ ...prev, starting_number: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Number Padding
                </label>
                <input
                  type="number"
                  value={selectedConfig.number_padding}
                  onChange={(e) => setSelectedConfig((prev: any) => ({ ...prev, number_padding: parseInt(e.target.value) || 3 }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="1"
                  max="10"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_allow_manual_override"
                  checked={selectedConfig.allow_manual_override}
                  onChange={(e) => setSelectedConfig((prev: any) => ({ ...prev, allow_manual_override: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="edit_allow_manual_override" className="text-sm text-gray-700 dark:text-gray-300">
                  Allow Manual Override
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  checked={selectedConfig.is_active}
                  onChange={(e) => setSelectedConfig((prev: any) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <label htmlFor="edit_is_active" className="text-sm text-gray-700 dark:text-gray-300">
                  Active
                </label>
              </div>

              {/* Preview */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Preview:</p>
                <p className="font-mono text-lg">
                  {selectedConfig.prefix}-{selectedConfig.financial_year.split('-')[0].slice(-2)}-{String(selectedConfig.starting_number).padStart(selectedConfig.number_padding, '0')}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfigModal(false)
                  setSelectedConfig(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateConfig}
                disabled={updateConfigMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateConfigMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Update
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocumentNumbering