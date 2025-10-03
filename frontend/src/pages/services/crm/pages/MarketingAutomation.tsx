import React, { useState, useEffect } from 'react'
import { 
  Mail, 
  Send, 
  Users, 
  TrendingUp, 
  Play, 
  Pause, 
  Plus,
  Eye,
  Edit,

} from 'lucide-react'
import { crmApi } from '../utils/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

export const MarketingAutomation: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [workflows, setWorkflows] = useState<any[]>([])
  // const [, setAnalytics] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('campaigns')

  useEffect(() => {
    loadData()
  }, [sessionKey])

  const loadData = async () => {
    try {
      setLoading(true)
      const [campaignsRes, templatesRes, workflowsRes] = await Promise.all([
        crmApi.getMarketingCampaigns(sessionKey!),
        crmApi.getEmailTemplates(sessionKey!),
        crmApi.getAutomationWorkflows(sessionKey!)
      ])
      
      setCampaigns(campaignsRes.data.results || campaignsRes.data)
      setTemplates(templatesRes.data.results || templatesRes.data)
      setWorkflows(workflowsRes.data.results || workflowsRes.data)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLaunchCampaign = async (campaignId: number) => {
    try {
      await crmApi.launchMarketingCampaign(sessionKey!, campaignId)
      loadData()
    } catch (error) {
      console.error('Error launching campaign:', error)
    }
  }

  const handlePauseCampaign = async (campaignId: number) => {
    try {
      await crmApi.pauseMarketingCampaign(sessionKey!, campaignId)
      loadData()
    } catch (error) {
      console.error('Error pausing campaign:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      case 'draft': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Automation</h1>
          <p className="text-gray-600">Manage email campaigns and automation workflows</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold">{campaigns.filter(c => c.status === 'running').length}</p>
            </div>
            <Mail className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Emails Sent</p>
              <p className="text-2xl font-bold">{campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0)}</p>
            </div>
            <Send className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Open Rate</p>
              <p className="text-2xl font-bold">
                {campaigns.length > 0 
                  ? (campaigns.reduce((sum, c) => sum + (c.open_rate || 0), 0) / campaigns.length).toFixed(1)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Workflows</p>
              <p className="text-2xl font-bold">{workflows.filter(w => w.status === 'active').length}</p>
            </div>
            <Users className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('campaigns')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'campaigns' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Email Campaigns
          </button>
          <button 
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'templates' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Templates
          </button>
          <button 
            onClick={() => setActiveTab('workflows')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'workflows' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Automation
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'analytics' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Analytics
          </button>
        </div>

        {activeTab === 'campaigns' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(campaign.status)} text-white`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{campaign.campaign_type_display || 'Email Campaign'}</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Sent</span>
                        <span>{campaign.total_sent || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Open Rate</span>
                        <span>{(campaign.open_rate || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${campaign.open_rate || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Click Rate</span>
                        <span>{(campaign.click_rate || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${campaign.click_rate || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {campaign.status === 'draft' && (
                        <button 
                          onClick={() => handleLaunchCampaign(campaign.id)}
                          className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Launch
                        </button>
                      )}
                      {campaign.status === 'running' && (
                        <button 
                          onClick={() => handlePauseCampaign(campaign.id)}
                          className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </button>
                      )}
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                    </div>

                    <div className="text-xs text-gray-500">
                      Created: {new Date(campaign.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700">
                      {template.template_type_display || 'Email Template'}
                    </span>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <p className="text-sm font-medium">Subject:</p>
                      <p className="text-sm text-gray-600">{template.subject}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </button>
                      <button className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                    </div>

                    <div className="text-xs text-gray-500">
                      Created: {new Date(template.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{workflow.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(workflow.status)} text-white`}>
                        {workflow.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{workflow.trigger_type_display || 'Automation Workflow'}</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Triggered</span>
                        <span>{workflow.total_triggered || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Completed</span>
                        <span>{workflow.total_completed || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Success Rate</span>
                        <span>{workflow.completion_rate?.toFixed(1) || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${workflow.completion_rate || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                    </div>

                    <div className="text-xs text-gray-500">
                      Created: {new Date(workflow.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Campaign Performance</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Campaigns</span>
                      <span className="font-medium">{campaigns.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Campaigns</span>
                      <span className="font-medium">{campaigns.filter(c => c.status === 'running').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Emails Sent</span>
                      <span className="font-medium">{campaigns.reduce((sum, c) => sum + (c.total_sent || 0), 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Opens</span>
                      <span className="font-medium">{campaigns.reduce((sum, c) => sum + (c.total_opened || 0), 0)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Automation Performance</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Workflows</span>
                      <span className="font-medium">{workflows.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Active Workflows</span>
                      <span className="font-medium">{workflows.filter(w => w.status === 'active').length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Total Executions</span>
                      <span className="font-medium">{workflows.reduce((sum, w) => sum + (w.total_triggered || 0), 0)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Success Rate</span>
                      <span className="font-medium">
                        {workflows.length > 0 
                          ? (workflows.reduce((sum, w) => sum + (w.completion_rate || 0), 0) / workflows.length).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}