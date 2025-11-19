import React, { useState, useEffect } from 'react'
import { Shield, CheckCircle, AlertTriangle, FileText, Calendar, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface StatutoryDashboardData {
  pf_compliance: {
    enabled: boolean
    total_employees: number
    eligible_employees: number
    monthly_contribution: number
  }
  esi_compliance: {
    enabled: boolean
    total_employees: number
    eligible_employees: number
    monthly_contribution: number
  }
  pt_compliance: {
    enabled: boolean
    state: string
    total_employees: number
  }
  tds_compliance: {
    enabled: boolean
    total_employees: number
    taxable_employees: number
  }
  pending_returns: Array<{
    return_type: string
    period_month: number
    period_year: number
    due_date: string
  }>
  overdue_returns: Array<{
    return_type: string
    period_month: number
    period_year: number
    due_date: string
  }>
  recent_alerts: Array<{
    title: string
    priority: string
    due_date: string
    created_at: string
  }>
  compliance_summary: {
    total_items: number
    compliant_items: number
    compliance_percentage: number
    status: string
  }
}

const StatutoryDashboard: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<StatutoryDashboardData | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [sessionKey])

  const fetchDashboardData = async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      const response = await api.get('/api/hr/statutory/dashboard/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setData(response.data)
    } catch (error) {
      console.error('Error fetching statutory dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    await fetchDashboardData()
    toast.success('Dashboard data refreshed')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Error loading dashboard data</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Statutory Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">PF, ESI, Professional Tax, and TDS compliance overview</p>
        </div>
        <Button onClick={refreshData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compliance Status</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.compliance_summary.compliance_percentage}%
                </p>
              </div>
              {data.compliance_summary.compliance_percentage === 100 ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Compliant Items</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.compliance_summary.compliant_items}/{data.compliance_summary.total_items}
                </p>
              </div>
              <Shield className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Returns</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {data.pending_returns.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue Returns</p>
                <p className={`text-2xl font-bold ${data.overdue_returns.length > 0 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                  {data.overdue_returns.length}
                </p>
              </div>
              <Calendar className={`h-8 w-8 ${data.overdue_returns.length > 0 ? 'text-red-500' : 'text-gray-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statutory Compliance Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">PF Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  data.pf_compliance.enabled 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {data.pf_compliance.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Eligible Employees</span>
                  <span className="text-gray-900 dark:text-white">
                    {data.pf_compliance.eligible_employees}/{data.pf_compliance.total_employees}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${data.pf_compliance.total_employees > 0 ? (data.pf_compliance.eligible_employees / data.pf_compliance.total_employees) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ESI Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  data.esi_compliance.enabled 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {data.esi_compliance.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Eligible Employees</span>
                  <span className="text-gray-900 dark:text-white">
                    {data.esi_compliance.eligible_employees}/{data.esi_compliance.total_employees}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${data.esi_compliance.total_employees > 0 ? (data.esi_compliance.eligible_employees / data.esi_compliance.total_employees) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Professional Tax</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  data.pt_compliance.enabled 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {data.pt_compliance.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">State: </span>
                <span className="font-medium text-gray-900 dark:text-white">{data.pt_compliance.state}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Total Employees: </span>
                <span className="font-medium text-gray-900 dark:text-white">{data.pt_compliance.total_employees}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">TDS Compliance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  data.tds_compliance.enabled 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {data.tds_compliance.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Taxable Employees</span>
                  <span className="text-gray-900 dark:text-white">
                    {data.tds_compliance.taxable_employees}/{data.tds_compliance.total_employees}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${data.tds_compliance.total_employees > 0 ? (data.tds_compliance.taxable_employees / data.tds_compliance.total_employees) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      {data.recent_alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Compliance Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recent_alerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{alert.title}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Priority: {alert.priority} | Due: {new Date(alert.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default StatutoryDashboard