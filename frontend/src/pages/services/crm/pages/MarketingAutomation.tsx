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
  Trash2
} from 'lucide-react'
import { crmApi } from '../utils/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { EmailTemplateModal } from '../components/EmailTemplateModal'
import { MarketingCampaignModal } from '../components/MarketingCampaignModal'
import { EmailTemplatePreviewModal } from '../components/EmailTemplatePreviewModal'
import { CampaignViewModal } from '../components/CampaignViewModal'
import { AutomationWorkflowModal } from '../components/AutomationWorkflowModal'
import { WorkflowViewModal } from '../components/WorkflowViewModal'
import toast from 'react-hot-toast'

export const MarketingAutomation: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [workflows, setWorkflows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('campaigns')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [showCampaignViewModal, setShowCampaignViewModal] = useState(false)
  const [showWorkflowModal, setShowWorkflowModal] = useState(false)
  const [showWorkflowViewModal, setShowWorkflowViewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const [previewTemplate, setPreviewTemplate] = useState<any>(null)
  const [viewCampaign, setViewCampaign] = useState<any>(null)
  const [viewWorkflow, setViewWorkflow] = useState<any>(null)

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

  const handleCompleteCampaign = async (campaignId: number) => {
    if (!confirm('Are you sure you want to complete this campaign? This action cannot be undone.')) return
    
    try {
      await crmApi.updateMarketingCampaign(sessionKey!, campaignId, { status: 'completed' })
      toast.success('Campaign completed successfully')
      loadData()
    } catch (error) {
      toast.error('Failed to complete campaign')
    }
  }

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template)
    setShowTemplateModal(true)
  }

  const handleEditCampaign = (campaign: any) => {
    setSelectedCampaign(campaign)
    setShowCampaignModal(true)
  }

  const handleDeleteTemplate = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      await crmApi.deleteEmailTemplate(sessionKey!, templateId)
      toast.success('Template deleted successfully')
      loadData()
    } catch (error) {
      toast.error('Failed to delete template')
    }
  }

  const handleDeleteCampaign = async (campaignId: number) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return
    
    try {
      await crmApi.deleteMarketingCampaign(sessionKey!, campaignId)
      toast.success('Campaign deleted successfully')
      loadData()
    } catch (error) {
      toast.error('Failed to delete campaign')
    }
  }

  const handleModalSuccess = () => {
    loadData()
    setSelectedTemplate(null)
    setSelectedCampaign(null)
    setSelectedWorkflow(null)
  }

  const handlePreviewTemplate = (template: any) => {
    setPreviewTemplate(template)
    setShowPreviewModal(true)
  }

  const handleViewCampaign = (campaign: any) => {
    setViewCampaign(campaign)
    setShowCampaignViewModal(true)
  }

  const handleViewWorkflow = (workflow: any) => {
    setViewWorkflow(workflow)
    setShowWorkflowViewModal(true)
  }

  const handleEditWorkflow = (workflow: any) => {
    setSelectedWorkflow(workflow)
    setShowWorkflowModal(true)
  }

  const handleDeleteWorkflow = async (workflowId: number) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return
    
    try {
      await crmApi.deleteAutomationWorkflow(sessionKey!, workflowId)
      toast.success('Workflow deleted successfully')
      loadData()
    } catch (error) {
      toast.error('Failed to delete workflow')
    }
  }

  const handleCloseTemplateModal = () => {
    setShowTemplateModal(false)
    setSelectedTemplate(null)
  }

  const handleCloseCampaignModal = () => {
    setShowCampaignModal(false)
    setSelectedCampaign(null)
  }

  const handleClosePreviewModal = () => {
    setShowPreviewModal(false)
    setPreviewTemplate(null)
  }

  const handleCloseCampaignViewModal = () => {
    setShowCampaignViewModal(false)
    setViewCampaign(null)
  }

  const handleCloseWorkflowModal = () => {
    setShowWorkflowModal(false)
    setSelectedWorkflow(null)
  }

  const handleCloseWorkflowViewModal = () => {
    setShowWorkflowViewModal(false)
    setViewWorkflow(null)
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
          <button 
            onClick={() => setShowTemplateModal(true)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </button>
          <button 
            onClick={() => setShowCampaignModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </button>
          <button 
            onClick={() => setShowWorkflowModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Workflow
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
                  ? (campaigns.reduce((sum, c) => sum + Number(c.open_rate || 0), 0) / campaigns.length).toFixed(1)
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {campaigns.map((campaign) => (
                <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate pr-2">{campaign.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(campaign.status)} text-white whitespace-nowrap`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{campaign.campaign_type_display || 'Email Campaign'}</p>
                  </div>
                  <div className="p-4 flex-1 space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Sent</span>
                        <span className="font-medium">{campaign.total_sent || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Open Rate</span>
                        <span className="font-medium">{Number(campaign.open_rate || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(Number(campaign.open_rate || 0), 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Click Rate</span>
                        <span className="font-medium">{Number(campaign.click_rate || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(Number(campaign.click_rate || 0), 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {campaign.status === 'draft' && (
                        <button 
                          onClick={() => handleLaunchCampaign(campaign.id)}
                          className="flex-1 min-w-0 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Launch
                        </button>
                      )}
                      {campaign.status === 'running' && (
                        <button 
                          onClick={() => handlePauseCampaign(campaign.id)}
                          className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </button>
                      )}
                      {campaign.status === 'paused' && (
                        <>
                          <button 
                            onClick={() => handleLaunchCampaign(campaign.id)}
                            className="flex-1 min-w-0 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Resume
                          </button>
                          <button 
                            onClick={() => handleCompleteCampaign(campaign.id)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                          >
                            Complete
                          </button>
                        </>
                      )}
                      {campaign.status === 'running' && (
                        <button 
                          onClick={() => handleCompleteCampaign(campaign.id)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
                        >
                          Complete
                        </button>
                      )}
                      <button 
                        onClick={() => handleViewCampaign(campaign)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => handleEditCampaign(campaign)}
                        className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {templates.map((template) => (
                <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate mb-2">{template.name}</h3>
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700 truncate">
                      {template.template_type_display || 'Email Template'}
                    </span>
                  </div>
                  <div className="p-4 flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">Subject:</p>
                      <p className="text-sm text-gray-600 line-clamp-2">{template.subject}</p>
                    </div>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handlePreviewTemplate(template)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Preview
                      </button>
                      <button 
                        onClick={() => handleEditTemplate(template)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center justify-center"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate pr-2">{workflow.name}</h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(workflow.status)} text-white whitespace-nowrap`}>
                        {workflow.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{workflow.trigger_type_display || 'Automation Workflow'}</p>
                  </div>
                  <div className="p-4 flex-1 space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Triggered</span>
                        <span className="font-medium">{workflow.total_triggered || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Completed</span>
                        <span className="font-medium">{workflow.total_completed || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Success Rate</span>
                        <span className="font-medium">{Number(workflow.completion_rate || 0).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div 
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${Math.min(Number(workflow.completion_rate || 0), 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleViewWorkflow(workflow)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>
                      <button 
                        onClick={() => handleEditWorkflow(workflow)}
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteWorkflow(workflow.id)}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50 flex items-center justify-center"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
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
                          ? (workflows.reduce((sum, w) => sum + Number(w.completion_rate || 0), 0) / workflows.length).toFixed(1)
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

      {/* Modals */}
      <EmailTemplateModal
        isOpen={showTemplateModal}
        onClose={handleCloseTemplateModal}
        onSuccess={handleModalSuccess}
        template={selectedTemplate}
      />
      
      <MarketingCampaignModal
        isOpen={showCampaignModal}
        onClose={handleCloseCampaignModal}
        onSuccess={handleModalSuccess}
        campaign={selectedCampaign}
      />
      
      <EmailTemplatePreviewModal
        isOpen={showPreviewModal}
        onClose={handleClosePreviewModal}
        template={previewTemplate}
      />
      
      <CampaignViewModal
        isOpen={showCampaignViewModal}
        onClose={handleCloseCampaignViewModal}
        campaign={viewCampaign}
      />
      
      <AutomationWorkflowModal
        isOpen={showWorkflowModal}
        onClose={handleCloseWorkflowModal}
        onSuccess={handleModalSuccess}
        workflow={selectedWorkflow}
      />
      
      <WorkflowViewModal
        isOpen={showWorkflowViewModal}
        onClose={handleCloseWorkflowViewModal}
        workflow={viewWorkflow}
      />
    </div>
  )
}