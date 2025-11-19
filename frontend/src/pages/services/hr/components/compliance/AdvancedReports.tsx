import React, { useState, useEffect } from 'react'
import { Download, FileText, BarChart3, AlertTriangle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface TrendsData {
  monthly_scores: Array<{ month: string; score: number }>
  category_scores: { [key: string]: number }
  alert_trends: Array<{ month: string; alerts: number }>
}

const AdvancedReports: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchTrendsData()
  }, [sessionKey])

  const fetchTrendsData = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/advanced-reports/compliance_trends/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setTrendsData(response.data)
    } catch (error) {
      console.error('Error fetching trends data:', error)
    }
  }

  const downloadReport = async (reportType: string) => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      let url = ''
      let filename = ''
      
      switch (reportType) {
        case 'statutory_summary':
          url = `/api/hr/advanced-reports/statutory_summary/?month=${selectedMonth}&year=${selectedYear}&session_key=${sessionKey}`
          filename = `statutory_summary_${selectedMonth}_${selectedYear}.pdf`
          break
        case 'audit_trail':
          url = `/api/hr/advanced-reports/audit_trail/?session_key=${sessionKey}`
          filename = `audit_trail_${new Date().toISOString().split('T')[0]}.pdf`
          break
        case 'scorecard':
          url = `/api/hr/advanced-reports/scorecard/?session_key=${sessionKey}`
          filename = `compliance_scorecard_${new Date().toISOString().split('T')[0]}.pdf`
          break
        case 'returns_summary':
          url = `/api/hr/advanced-reports/returns_summary/?session_key=${sessionKey}`
          filename = `returns_summary_${new Date().toISOString().split('T')[0]}.pdf`
          break
        default:
          setLoading(false)
          return
      }
      
      const response = await api.get(url, { 
        responseType: 'blob',
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
      
      toast.success('Report downloaded successfully')
      setLoading(false)
    } catch (error: any) {
      toast.error('Failed to download report')
      setLoading(false)
    }
  }

  const reportTemplates = [
    {
      title: 'Statutory Summary Report',
      description: 'Monthly summary of all statutory compliance activities',
      icon: <FileText className="h-6 w-6" />,
      type: 'statutory_summary',
      color: 'bg-blue-500'
    },
    {
      title: 'Audit Trail Report',
      description: 'Detailed audit trail of compliance activities',
      icon: <BarChart3 className="h-6 w-6" />,
      type: 'audit_trail',
      color: 'bg-green-500'
    },
    {
      title: 'Compliance Scorecard',
      description: 'Comprehensive compliance performance scorecard',
      icon: <TrendingUp className="h-6 w-6" />,
      type: 'scorecard',
      color: 'bg-purple-500'
    },
    {
      title: 'Government Returns Summary',
      description: 'Summary of all government return submissions',
      icon: <AlertTriangle className="h-6 w-6" />,
      type: 'returns_summary',
      color: 'bg-orange-500'
    }
  ]

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Advanced Compliance Reports</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Generate comprehensive compliance reports and analytics</p>
      </div>

      {/* Report Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Report Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {months.map((month, index) => (
                  <option key={index} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={() => downloadReport('statutory_summary')}
                disabled={loading}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Generate Monthly Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportTemplates.map((template, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  <div className={`${template.color} w-12 h-12 rounded-lg flex items-center justify-center text-white mx-auto mb-3`}>
                    {template.icon}
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">{template.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>
                </div>
                <Button 
                  size="sm"
                  onClick={() => downloadReport(template.type)}
                  disabled={loading}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Generate
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Score Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {trendsData?.monthly_scores ? (
              <div className="space-y-4">
                {trendsData.monthly_scores.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.month}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${item.score}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{item.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No trend data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Compliance Score</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {trendsData ? 
                      Math.round(trendsData.monthly_scores.reduce((sum, item) => sum + item.score, 0) / trendsData.monthly_scores.length) 
                      : 0}%
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Alerts (Last 6 months)</span>
                  <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {trendsData ? 
                      trendsData.alert_trends.reduce((sum, item) => sum + item.alerts, 0)
                      : 0}
                  </span>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Improvement Rate</span>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">12.5%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Trends</CardTitle>
        </CardHeader>
        <CardContent>
          {trendsData?.alert_trends ? (
            <div className="space-y-4">
              {trendsData.alert_trends.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <span className="font-medium text-gray-900 dark:text-white">{item.month}</span>
                  <div className="flex items-center space-x-4">
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min(100, (item.alerts / Math.max(...trendsData.alert_trends.map(t => t.alerts))) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.alerts} alerts</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No alert trend data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdvancedReports