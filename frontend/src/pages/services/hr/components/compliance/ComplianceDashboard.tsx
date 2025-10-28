import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, Trophy, FileText, RefreshCw, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface ComplianceData {
  total_employees: number
  pf_enrolled: number
  esi_enrolled: number
  pt_applicable: number
  tds_applicable: number
  compliance_score: number
  pending_returns: any[]
  recent_alerts: any[]
}

interface ComplianceAlert {
  id: number
  type: string
  severity: string
  title: string
  description: string
  due_date: string
  employee?: string
}

const ComplianceDashboard: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [dashboardData, setDashboardData] = useState<ComplianceData | null>(null)
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [scorecard, setScorecard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    fetchAlerts()
    fetchScorecard()
  }, [sessionKey])

  const fetchDashboardData = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/compliance/dashboard/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    }
  }

  const fetchAlerts = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/compliance/alerts/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setAlerts(response.data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const fetchScorecard = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/compliance/scorecard/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setScorecard(response.data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching scorecard:', error)
      setLoading(false)
    }
  }

  const runComplianceCheck = async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      await api.post('/api/hr/compliance/run_checks/', 
        { session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      await fetchAlerts()
      toast.success('Compliance check completed')
      setLoading(false)
    } catch (error: any) {
      toast.error('Failed to run compliance check')
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: number) => {
    if (!sessionKey) return
    
    try {
      await api.post(`/api/hr/compliance/${alertId}/resolve_alert/`, 
        { notes: 'Resolved from dashboard', session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      await fetchAlerts()
      toast.success('Alert resolved successfully')
    } catch (error: any) {
      toast.error('Failed to resolve alert')
    }
  }

  const generateReturn = async (returnType: string) => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      let endpoint = ''
      let filename = ''
      
      switch (returnType.toLowerCase()) {
        case 'ecr':
          endpoint = '/api/hr/forms/pf-challan/'
          filename = `ECR_${new Date().toISOString().split('T')[0]}.pdf`
          break
        case 'esi return':
          endpoint = '/api/hr/forms/esi-challan/'
          filename = `ESI_Return_${new Date().toISOString().split('T')[0]}.pdf`
          break
        default:
          toast.error('Unknown return type')
          setLoading(false)
          return
      }
      
      const response = await api.post(endpoint, 
        { session_key: sessionKey },
        {
          headers: { Authorization: `Bearer ${sessionKey}` },
          responseType: 'blob'
        }
      )
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success(`${returnType} generated successfully`)
      setLoading(false)
    } catch (error: any) {
      toast.error(`Failed to generate ${returnType}`)
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'HIGH': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'LOW': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time compliance monitoring and alerts</p>
        </div>
        <Button onClick={runComplianceCheck} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Processing...' : 'Run Compliance Check'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {scorecard?.overall_score || 0}%
                </p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.total_employees || 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{alerts.length}</p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${alerts.length > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Returns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {dashboardData?.pending_returns?.length || 0}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statutory Enrollment Status */}
      <Card>
        <CardHeader>
          <CardTitle>Statutory Enrollment Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">PF Enrolled</span>
                <span className="text-gray-900 dark:text-white">
                  {dashboardData?.pf_enrolled}/{dashboardData?.total_employees}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${dashboardData ? (dashboardData.pf_enrolled / dashboardData.total_employees) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">ESI Enrolled</span>
                <span className="text-gray-900 dark:text-white">
                  {dashboardData?.esi_enrolled}/{dashboardData?.total_employees}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${dashboardData ? (dashboardData.esi_enrolled / dashboardData.total_employees) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">PT Applicable</span>
                <span className="text-gray-900 dark:text-white">
                  {dashboardData?.pt_applicable}/{dashboardData?.total_employees}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{
                    width: `${dashboardData ? (dashboardData.pt_applicable / dashboardData.total_employees) * 100 : 0}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Compliance Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Type</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Severity</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Title</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Employee</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Due Date</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                          {alert.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="p-3 text-gray-900 dark:text-white">{alert.title}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{alert.employee || '-'}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {new Date(alert.due_date).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button size="sm" onClick={() => resolveAlert(alert.id)}>
                          Resolve
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No active alerts. All compliance requirements are met.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Returns */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Government Returns</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboardData?.pending_returns && dashboardData.pending_returns.length > 0 ? (
            <div className="space-y-3">
              {dashboardData.pending_returns.map((returnItem, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{returnItem.type}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Due: {returnItem.due_date}</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => generateReturn(returnItem.type)}>Generate</Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">All government returns are up to date.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ComplianceDashboard