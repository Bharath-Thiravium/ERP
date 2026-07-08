import React, { useState, useEffect } from 'react'
import { BarChart3, FileText, TrendingUp, AlertTriangle, Eye, Plus, Calendar, Brain, Target, X } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  LineChart, Line,
  AreaChart, Area,
  FunnelChart, Funnel, LabelList,
  ResponsiveContainer
} from 'recharts'
import { crmApi } from '../utils/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { ReportTemplateModal } from '../components/ReportTemplateModal'
import toast from 'react-hot-toast'

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']

const normalizeChartData = (data: any): any[] => {
  if (!data) return []
  if (data?.data?.by_status) return data.data.by_status.map((d: any) => ({ name: d.status, value: d.count }))
  if (data?.data?.by_source) return data.data.by_source.map((d: any) => ({ name: d.source, value: d.count }))
  if (Array.isArray(data?.data)) {
    return data.data.map((d: any) => {
      const key = Object.keys(d).find(k => !['count','total_value','weighted_value'].includes(k)) || 'name'
      return { name: String(d[key] ?? ''), value: Number(d.total_value ?? d.weighted_value ?? d.value ?? d.count ?? 0) }
    })
  }
  // pipeline_forecast stage data
  if (Array.isArray(data)) return data.map((d: any) => ({ name: d.current_stage__name || d.name || '', value: Number(d.total_value ?? d.count ?? 0) }))
  return []
}

const ReportChart: React.FC<{ data: any; chartType: string }> = ({ data, chartType }) => {
  const chartData = normalizeChartData(data)

  if (!chartData.length) {
    return <p className="text-center text-gray-400 py-8">No chart data available</p>
  }

  if (chartType === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={340}>
        <PieChart>
          <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={72} outerRadius={118} paddingAngle={3}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(value: any) => Number(value).toLocaleString()} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
          <Line type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={340}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="reportArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.45}/>
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
          <Area type="monotone" dataKey="value" stroke="#f97316" fill="url(#reportArea)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  if (chartType === 'funnel') {
    const funnelData = chartData.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }))
    return (
      <ResponsiveContainer width="100%" height={340}>
        <FunnelChart>
          <Tooltip formatter={(value: any) => Number(value).toLocaleString()} />
          <Funnel dataKey="value" data={funnelData} isAnimationActive>
            <LabelList position="right" fill="#374151" stroke="none" dataKey="name" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    )
  }

  // default: bar
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value: any) => Number(value).toLocaleString()} /><Legend />
        <Bar dataKey="value" radius={[9, 9, 0, 0]} barSize={38}>
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

const ReportResultModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  report: any
  reportData: any
}> = ({ isOpen, onClose, report, reportData }) => {
  if (!isOpen || !reportData) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{report?.name || 'Report Results'}</h2>
            <p className="text-sm text-gray-500">{report?.report_type_display || report?.report_type} | {report?.chart_type_display || report?.chart_type}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-6 space-y-6">
          {reportData.summary && (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(reportData.summary).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-orange-100 bg-orange-50 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
                  <p className="mb-1 text-xs capitalize text-gray-500">{key.replace(/_/g, ' ')}</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {typeof value === 'number'
                      ? key.includes('revenue') || key.includes('pipeline') || key.includes('deal_size')
                        ? `₹${value.toLocaleString()}`
                        : value % 1 !== 0 ? value.toFixed(1) : value
                      : String(value)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <ReportChart data={reportData} chartType={report?.chart_type || 'bar'} />
          </div>
        </div>
      </div>
    </div>
  )
}

export const AdvancedReporting: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [reports, setReports] = useState<any[]>([])
  const [dashboards, setDashboards] = useState<any[]>([])
  const [insights, setInsights] = useState<any[]>([])
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('reports')
  const [showReportModal, setShowReportModal] = useState(false)
  const [showReportResultModal, setShowReportResultModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)

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

  const handleGenerateReport = async (report: any) => {
    try {
      setSelectedReport(report)
      const response = await crmApi.generateReport(sessionKey!, report.id)
      setReportData(response.data)
      setShowReportResultModal(true)
      toast.success('Report generated successfully!')
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    }
  }

  const handleExportReport = async (reportId: number, format: string = 'csv') => {
    try {
      // Generate report data first, then export as CSV client-side
      const response = await crmApi.generateReport(sessionKey!, reportId)
      const data = response.data
      
      // Build CSV content from report data
      let csvContent = 'data:text/csv;charset=utf-8,'
      
      if (data.summary) {
        csvContent += 'Summary\r\n'
        Object.entries(data.summary).forEach(([k, v]) => {
          csvContent += `${k.replace(/_/g, ' ')},${v}\r\n`
        })
        csvContent += '\r\n'
      }

      if (Array.isArray(data.data) && data.data.length > 0) {
        const headers = Object.keys(data.data[0])
        csvContent += headers.join(',') + '\r\n'
        data.data.forEach((row: any) => {
          csvContent += headers.map(h => row[h] ?? '').join(',') + '\r\n'
        })
      }

      const link = document.createElement('a')
      link.href = encodeURI(csvContent)
      link.download = `report_${reportId}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Report exported as CSV')
    } catch (error) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    }
  }

  const handleGenerateInsights = async () => {
    try {
      const response = await crmApi.generateBusinessInsights(sessionKey!)
      toast.success(response.data.message || 'Insights generated successfully!')
      loadData()
    } catch (error) {
      console.error('Error generating insights:', error)
      toast.error('Failed to generate insights')
    }
  }

  const handleCreateReport = () => {
    setSelectedReport(null)
    setShowReportModal(true)
  }

  const handleEditReport = (report: any) => {
    setSelectedReport(report)
    setShowReportModal(true)
  }

  const handleDeleteReport = async (reportId: number) => {
    if (!confirm('Are you sure you want to delete this report template?')) return
    
    try {
      await crmApi.deleteReportTemplate(sessionKey!, reportId)
      toast.success('Report template deleted successfully')
      if (selectedReport?.id === reportId) {
        setReportData(null)
        setSelectedReport(null)
        setShowReportResultModal(false)
      }
      loadData()
    } catch (error) {
      toast.error('Failed to delete report template')
    }
  }

  const handleModalSuccess = () => {
    loadData()
    setSelectedReport(null)
  }

  const handleCloseReportModal = () => {
    setShowReportModal(false)
    setSelectedReport(null)
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
          <button 
            onClick={handleCreateReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Report Templates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {reports.map((report) => (
                  <div key={report.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-sm">{report.name}</h4>
                          <p className="text-xs text-gray-600">{report.report_type_display}</p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700">
                            {report.chart_type_display}
                          </span>
                          {report.is_active && (
                            <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button 
                            onClick={() => handleGenerateReport(report)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-center"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            Generate
                          </button>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleExportReport(report.id, 'csv')}
                              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Export
                            </button>
                            <button 
                              onClick={() => handleEditReport(report)}
                              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteReport(report.id)}
                              className="flex-1 px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
                Click Generate on any report template to open the modern report viewer.
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboards' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dashboards.map((dashboard) => (
                <div key={dashboard.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{dashboard.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{dashboard.description}</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-1">
                      {dashboard.is_public && (
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          Public
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full border border-gray-300 text-gray-700">
                        {dashboard.widgets?.length || 0} Widgets
                      </span>
                    </div>
                    
                    <div className="flex gap-1">
                      <button className="flex-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </button>
                      <button className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {insights.map((insight) => (
                <div key={insight.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow ${insight.is_acknowledged ? 'opacity-60' : ''}`}>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-lg ${getPriorityColor(insight.priority)} text-white flex-shrink-0`}>
                          {getInsightIcon(insight.insight_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{insight.title}</h4>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 text-xs rounded-full ${getPriorityColor(insight.priority)} text-white`}>
                              {insight.priority}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs rounded-full border border-gray-300 text-gray-700">
                              {insight.insight_type_display}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-xs text-gray-600 line-clamp-3">{insight.description}</p>
                      
                      {insight.recommended_actions && insight.recommended_actions.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-gray-700">Actions:</p>
                          <ul className="text-xs text-gray-600 space-y-0.5">
                            {insight.recommended_actions.slice(0, 2).map((action: string, index: number) => (
                              <li key={index} className="flex items-start gap-1">
                                <span className="w-1 h-1 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                <span className="line-clamp-2">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="flex flex-col gap-2">
                        {!insight.is_acknowledged && (
                          <button 
                            onClick={() => handleAcknowledgeInsight(insight.id)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Acknowledge
                          </button>
                        )}
                        <div className="text-xs text-gray-500">
                          {new Date(insight.created_at).toLocaleDateString()}
                          {insight.is_acknowledged && (
                            <div className="text-green-600 mt-1">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <div className="p-6 text-center">
                  <Calendar className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Scheduled reports</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Coming soon
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ReportTemplateModal
        isOpen={showReportModal}
        onClose={handleCloseReportModal}
        onSuccess={handleModalSuccess}
        report={selectedReport}
      />
      <ReportResultModal
        isOpen={showReportResultModal}
        onClose={() => setShowReportResultModal(false)}
        report={selectedReport}
        reportData={reportData}
      />
    </div>
  )
}
