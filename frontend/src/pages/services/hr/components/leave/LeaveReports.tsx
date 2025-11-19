import React, { useState, useEffect } from 'react'
import { BarChart3, Download, Calendar, Users, TrendingUp, PieChart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface LeaveStats {
  total_applications: number
  approved_applications: number
  pending_applications: number
  rejected_applications: number
  total_leave_days: number
  most_used_leave_type: string
  department_wise_stats: Array<{
    department: string
    total_days: number
    applications: number
  }>
  monthly_trends: Array<{
    month: string
    applications: number
    days: number
  }>
}

const LeaveReports: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [stats, setStats] = useState<LeaveStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [reportType, setReportType] = useState('summary')

  useEffect(() => {
    fetchStats()
  }, [sessionKey, selectedYear])

  const fetchStats = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/leave-applications/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          year: selectedYear,
          stats: true
        }
      })
      setStats(response.data)
    } catch (error: any) {
      console.error('Error fetching stats:', error)
      toast.error('Failed to fetch statistics')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'pdf' | 'excel') => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/leave-applications/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          year: selectedYear,
          export: format,
          report_type: reportType
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const sanitizedYear = String(selectedYear).replace(/[^0-9]/g, '')
      const sanitizedFormat = format === 'pdf' ? 'pdf' : 'xlsx'
      link.setAttribute('download', `leave_report_${sanitizedYear}.${sanitizedFormat}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('Error exporting report:', error)
      toast.error('Failed to export report')
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="summary">Summary Report</option>
            <option value="detailed">Detailed Report</option>
            <option value="department">Department Wise</option>
            <option value="trends">Monthly Trends</option>
          </select>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={() => exportReport('excel')}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => exportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {stats && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Applications</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_applications}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Approved</p>
                    <p className="text-2xl font-bold text-green-600">{stats.approved_applications}</p>
                  </div>
                  <Users className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending_applications}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Days</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.total_leave_days}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Department Wise Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <PieChart className="h-5 w-5 text-blue-500" />
                <span>Department Wise Leave Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Department</th>
                      <th className="text-left p-3">Applications</th>
                      <th className="text-left p-3">Total Days</th>
                      <th className="text-left p-3">Avg Days/Application</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.department_wise_stats?.map((dept, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{dept.department}</td>
                        <td className="p-3">{dept.applications}</td>
                        <td className="p-3">{dept.total_days}</td>
                        <td className="p-3">
                          {dept.applications > 0 ? (dept.total_days / dept.applications).toFixed(1) : '0'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <span>Monthly Trends ({selectedYear})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.monthly_trends?.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <span className="font-medium w-20">{month.month}</span>
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{
                              width: `${Math.min(100, (month.applications / Math.max(...stats.monthly_trends.map(m => m.applications))) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-4 text-sm">
                      <span className="text-gray-600">{month.applications} apps</span>
                      <span className="text-gray-600">{month.days} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Key Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Approval Rate</h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${stats.total_applications > 0 ? (stats.approved_applications / stats.total_applications) * 100 : 0}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {stats.total_applications > 0 ? Math.round((stats.approved_applications / stats.total_applications) * 100) : 0}%
                    </span>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Most Used Leave Type</h4>
                  <p className="text-lg font-semibold text-blue-600">{stats.most_used_leave_type || 'N/A'}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Average Leave Days</h4>
                  <p className="text-lg font-semibold text-purple-600">
                    {stats.total_applications > 0 ? (stats.total_leave_days / stats.total_applications).toFixed(1) : '0'} days
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Pending Applications</h4>
                  <p className="text-lg font-semibold text-yellow-600">{stats.pending_applications}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

export default LeaveReports