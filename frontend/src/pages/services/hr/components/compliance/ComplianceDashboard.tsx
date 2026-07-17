import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  FileClock,
  IndianRupee,
  RefreshCw,
  Settings2,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface SchemeSummary {
  enabled: boolean
  total_employees: number
  eligible_employees?: number
  taxable_employees?: number
  monthly_contribution?: number | string
  state?: string
}

interface ReturnSummary {
  return_type: string
  period_month: number
  period_year: number
  due_date: string
}

interface DashboardData {
  pf_compliance: SchemeSummary
  esi_compliance: SchemeSummary
  pt_compliance: SchemeSummary
  tds_compliance: SchemeSummary
  pending_returns: ReturnSummary[]
  overdue_returns: ReturnSummary[]
  compliance_summary: {
    total_items: number
    compliant_items: number
    compliance_percentage: number
    status: string
  }
}

interface ComplianceAlert {
  id: number
  alert_type: string
  alert_type_display?: string
  priority: string
  title: string
  message: string
  due_date?: string | null
}

const listFromResponse = <T,>(data: T[] | { results?: T[] }): T[] =>
  Array.isArray(data) ? data : data?.results || []

const formatReturnType = (value: string) =>
  value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())

const formatCurrency = (value?: number | string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    Number(value || 0)
  )

const ComplianceDashboard: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')

  const requestConfig = useMemo(
    () => ({ headers: { Authorization: `Bearer ${sessionKey}` }, params: { session_key: sessionKey } }),
    [sessionKey]
  )

  const loadData = useCallback(async () => {
    if (!sessionKey) return
    setError('')
    try {
      const [dashboardResponse, alertResponse] = await Promise.all([
        api.get('/api/hr/statutory/dashboard/', requestConfig),
        api.get('/api/hr/statutory-alerts/', {
          ...requestConfig,
          params: { session_key: sessionKey, is_resolved: false }
        })
      ])
      setDashboard(dashboardResponse.data)
      setAlerts(listFromResponse<ComplianceAlert>(alertResponse.data))
    } catch (requestError: any) {
      setError(requestError?.response?.data?.error || 'Unable to load compliance information.')
    } finally {
      setLoading(false)
    }
  }, [requestConfig, sessionKey])

  useEffect(() => {
    loadData()
  }, [loadData])

  const runComplianceCheck = async () => {
    if (!sessionKey) return
    setChecking(true)
    try {
      await api.post(
        '/api/hr/compliance/run_checks/',
        { session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      await loadData()
      toast.success('Compliance evidence checked successfully')
    } catch (requestError: any) {
      toast.error(requestError?.response?.data?.error || 'Compliance check failed')
    } finally {
      setChecking(false)
    }
  }

  const resolveAlert = async (alertId: number) => {
    if (!sessionKey) return
    try {
      await api.post(
        `/api/hr/statutory-alerts/${alertId}/resolve/`,
        { session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      setAlerts((current) => current.filter((alert) => alert.id !== alertId))
      toast.success('Alert marked as resolved')
    } catch (requestError: any) {
      toast.error(requestError?.response?.data?.error || 'Unable to resolve alert')
    }
  }

  if (loading) {
    return <div className="flex h-56 items-center justify-center text-sm text-gray-500">Loading compliance data...</div>
  }

  if (error || !dashboard) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-gray-700 dark:text-gray-300">{error || 'Compliance data is unavailable.'}</p>
          <Button size="sm" onClick={loadData}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  const totalEmployees = Math.max(
    dashboard.pf_compliance.total_employees || 0,
    dashboard.esi_compliance.total_employees || 0,
    dashboard.tds_compliance.total_employees || 0
  )
  const schemeRows = [
    {
      name: 'Provident Fund (PF)',
      data: dashboard.pf_compliance,
      detail: `${dashboard.pf_compliance.eligible_employees || 0} eligible employees`
    },
    {
      name: 'Employee State Insurance (ESI)',
      data: dashboard.esi_compliance,
      detail: `${dashboard.esi_compliance.eligible_employees || 0} eligible employees`
    },
    {
      name: 'Professional Tax (PT)',
      data: dashboard.pt_compliance,
      detail: dashboard.pt_compliance.state || 'State not configured'
    },
    {
      name: 'Tax Deducted at Source (TDS)',
      data: dashboard.tds_compliance,
      detail: `${dashboard.tds_compliance.taxable_employees || 0} taxable employees`
    }
  ]

  const priorityClass = (priority: string) => {
    const normalized = priority.toLowerCase()
    if (normalized === 'critical' || normalized === 'high') return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
    if (normalized === 'medium') return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
    return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Statutory Evidence Review</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Readiness is based on saved configuration, approved payroll and recorded filing evidence.
          </p>
        </div>
        <Button onClick={runComplianceCheck} disabled={checking}>
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking...' : 'Run Evidence Check'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Configuration Readiness', value: `${dashboard.compliance_summary.compliance_percentage}%`, icon: Settings2 },
          { label: 'Active Employees', value: totalEmployees, icon: Users },
          { label: 'Unresolved Alerts', value: alerts.length, icon: AlertTriangle },
          { label: 'Overdue Returns', value: dashboard.overdue_returns.length, icon: FileClock }
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
              </div>
              <Icon className="h-7 w-7 text-blue-600" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Configured Schemes</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {schemeRows.map(({ name, data, detail }) => (
              <div key={name} className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{name}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{detail}</p>
                    {data.monthly_contribution !== undefined && (
                      <p className="mt-2 flex items-center text-sm text-gray-700 dark:text-gray-300">
                        <IndianRupee className="mr-1 h-3.5 w-3.5" /> Latest approved payroll contribution: {formatCurrency(data.monthly_contribution)}
                      </p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    data.enabled
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    {data.enabled ? 'Enabled' : 'Not enabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Unresolved Alerts</CardTitle></CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" /> No unresolved evidence alerts were found.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 p-4 md:flex-row md:items-center dark:border-gray-700">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{alert.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityClass(alert.priority)}`}>
                        {alert.priority}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                    {alert.due_date && <p className="mt-1 text-xs text-gray-500">Due: {new Date(`${alert.due_date}T00:00:00`).toLocaleDateString()}</p>}
                  </div>
                  <Button size="sm" onClick={() => resolveAlert(alert.id)}>Resolve</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Return Status</CardTitle></CardHeader>
        <CardContent>
          {[...dashboard.overdue_returns, ...dashboard.pending_returns].length === 0 ? (
            <p className="text-sm text-gray-500">No pending or overdue returns. Generate returns from Statutory &gt; Government Returns after payroll approval.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead><tr className="border-b text-left text-gray-500 dark:border-gray-700"><th className="p-3">Return</th><th className="p-3">Period</th><th className="p-3">Due Date</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {dashboard.overdue_returns.map((item) => (
                    <tr key={`overdue-${item.return_type}-${item.period_month}-${item.period_year}`} className="border-b dark:border-gray-800">
                      <td className="p-3 font-medium">{formatReturnType(item.return_type)}</td><td className="p-3">{item.period_month}/{item.period_year}</td><td className="p-3">{item.due_date}</td><td className="p-3 text-red-600">Overdue</td>
                    </tr>
                  ))}
                  {dashboard.pending_returns.map((item) => (
                    <tr key={`pending-${item.return_type}-${item.period_month}-${item.period_year}`} className="border-b dark:border-gray-800">
                      <td className="p-3 font-medium">{formatReturnType(item.return_type)}</td><td className="p-3">{item.period_month}/{item.period_year}</td><td className="p-3">{item.due_date}</td><td className="p-3 text-amber-600">Pending filing</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ComplianceDashboard
