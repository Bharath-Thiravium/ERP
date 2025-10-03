import React, { useState, useEffect } from 'react'
import { 
  BarChart3, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  Eye, 
  Download,
  Plus,
  Calendar,
  Brain,
  Target
} from 'lucide-react'
import { crmApi } from '../utils/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

export const AdvancedReporting: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [reports, setReports] = useState<any[]>([])
  const [dashboards, setDashboards] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  // const [, setSelectedReport] = useState<any>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reports')

  useEffect(() => {
    loadData()
  }, [sessionKey])

  const loadData = async () => {
    try {
      setLoading(true)
      
      const [reportsRes, dashboardsRes, insightsRes] = await Promise.all([
        crmApi.getReports(sessionKey!),
        crmApi.getDashboards(sessionKey!),
        crmApi.getBusinessInsights(sessionKey!)
      ])
      
      setReports(reportsRes.data.results || reportsRes.data || [])
      setDashboards(dashboardsRes.data.results || dashboardsRes.data || [])
      setInsights(insightsRes.data.results || insightsRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReport = async (reportId: number) => {
    try {
      const response = await crmApi.generateReport(sessionKey!, reportId)
      setReportData(response.data)
    } catch (error) {
      console.error('Error generating report:', error)
    }
  }

  const handleGenerateInsights = async () => {
    try {
      await crmApi.generateBusinessInsights(sessionKey!)
      loadData()
    } catch (error) {
      console.error('Error generating insights:', error)
    }
  }

  const handleAcknowledgeInsight = async (insightId: number) => {
    try {
      await crmApi.acknowledgeInsight(sessionKey!, insightId)
      loadData()
    } catch (error) {
      console.error('Error acknowledging insight:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-5 w-5" />
      case 'alert': return <AlertTriangle className="h-5 w-5" />
      case 'forecast': return <Target className="h-5 w-5" />
      case 'recommendation': return <Brain className="h-5 w-5" />
      default: return <BarChart3 className="h-5 w-5" />
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
          <h1 className="text-2xl font-bold text-gray-900">Advanced Reporting</h1>
          <p className="text-gray-600">Generate insights and business intelligence reports</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleGenerateInsights}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center"
          >
            <Brain className="h-4 w-4 mr-2" />
            Generate Insights
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Reports</p>
              <p className="text-2xl font-bold">{reports.length}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Dashboards</p>
              <p className="text-2xl font-bold">{dashboards.length}</p>
            </div>
            <BarChart3 className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Insights</p>
              <p className="text-2xl font-bold">{insights.filter(i => !i.is_acknowledged).length}</p>
            </div>
            <Brain className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Critical Alerts</p>
              <p className="text-2xl font-bold">{insights.filter(i => i.priority === 'critical' && !i.is_acknowledged).length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button 
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'reports' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Reports
          </button>
          <button 
            onClick={() => setActiveTab('dashboards')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'dashboards' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Dashboards
          </button>
          <button 
            onClick={() => setActiveTab('insights')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'insights' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Business Intelligence
          </button>
          <button 
            onClick={() => setActiveTab('schedules')}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'schedules' 
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Scheduled Reports
          </button>
        </div>

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Report Templates */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Report Templates</h3>
                <div className="space-y-3">
                  {reports.map((report) => (
                    <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{report.name}</h4>
                            <p className="text-sm text-gray-600">{report.report_type_display}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700">
                                {report.chart_type_display}
                              </span>
                              {report.is_active && (
                                <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                  Active
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleGenerateReport(report.id)}
                              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Generate
                            </button>
                            <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center">
                              <Download className="h-4 w-4 mr-1" />
                              Export
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Report Preview</h3>
                {reportData ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Report Results</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {reportData.summary && (
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(reportData.summary).map(([key, value]) => (
                            <div key={key} className="text-center p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600 capitalize">{key.replace('_', ' ')}</p>
                              <p className="text-lg font-bold">
                                {typeof value === 'number' && key.includes('revenue') 
                                  ? `$${(value as number).toLocaleString()}`
                                  : String(value)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {reportData.data && Array.isArray(reportData.data) && (
                        <div className="space-y-2">
                          <h4 className="font-medium">Data Points</h4>
                          <div className="max-h-64 overflow-y-auto">
                            {reportData.data.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between items-center p-2 border-b">
                                <span className="text-sm">{JSON.stringify(item)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <div className="p-8 text-center">
                      <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Select a report template to generate and preview results</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboards' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboards.map((dashboard) => (
                <div key={dashboard.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{dashboard.name}</h3>
                    <p className="text-sm text-gray-600">{dashboard.description}</p>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      {dashboard.is_public && (
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Public
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700">
                        {dashboard.widgets?.length || 0} Widgets
                      </span>
                    </div>
                    
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center">
                        Edit
                      </button>
                    </div>

                    <div className="text-xs text-gray-500">
                      Created: {new Date(dashboard.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <div className="space-y-4">
              {insights.map((insight) => (
                <div key={insight.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${insight.is_acknowledged ? 'opacity-60' : ''}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getPriorityColor(insight.priority)} text-white`}>
                          {getInsightIcon(insight.insight_type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{insight.title}</h4>
                            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getPriorityColor(insight.priority)} text-white`}>
                              {insight.priority}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700">
                              {insight.insight_type_display}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                          
                          {insight.recommended_actions && insight.recommended_actions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-700">Recommended Actions:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {insight.recommended_actions.map((action: string, index: number) => (
                                  <li key={index} className="flex items-center gap-1">
                                    <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                    {action}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        {!insight.is_acknowledged && (
                          <button 
                            onClick={() => handleAcknowledgeInsight(insight.id)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Acknowledge
                          </button>
                        )}
                        <div className="text-xs text-gray-500 text-right">
                          {new Date(insight.created_at).toLocaleDateString()}
                          {insight.is_acknowledged && (
                            <div className="text-green-600">
                              ✓ Acknowledged
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {insights.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <div className="p-8 text-center">
                    <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No business insights available</p>
                    <button 
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700" 
                      onClick={handleGenerateInsights}
                    >
                      Generate New Insights
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="p-8 text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Scheduled reports feature coming soon</p>
                <p className="text-sm text-gray-500 mt-2">
                  Set up automated report generation and delivery
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}