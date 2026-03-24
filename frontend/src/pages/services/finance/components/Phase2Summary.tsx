import React, { useState, useEffect } from 'react'
import { AlertTriangle, Calculator, FileText, Users, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'

interface Phase2SummaryProps {
  sessionKey: string
}

interface ComplianceAlert {
  type: 'error' | 'warning' | 'info'
  category: string
  title: string
  message: string
  action: string
  priority: 'high' | 'medium' | 'low'
}

interface ComplianceData {
  period: string
  gst_compliance: {
    total_invoices: number
    total_taxable_amount: number
    total_tax_collected: number
    gstr1_filed: boolean
    gstr3b_filed: boolean
  }
  tds_compliance: {
    total_tds_payments: number
    total_tds_deducted: number
    certificates_issued: number
    certificates_pending: number
  }
  overall_status: string
  alerts: ComplianceAlert[]
  notifications: {
    total_alerts: number
    high_priority: number
    medium_priority: number
    low_priority: number
  }
}

const fmt = (amount: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

const Phase2Summary: React.FC<Phase2SummaryProps> = ({ sessionKey }) => {
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionKey) return
    fetch(`/api/finance/compliance/dashboard/?session_key=${sessionKey}`)
      .then(r => r.json())
      .then(data => setComplianceData(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sessionKey])

  const getAlertIcon = (type: string) => {
    if (type === 'error') return <AlertTriangle className="w-4 h-4 text-red-500" />
    if (type === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />
    return <FileText className="w-4 h-4 text-blue-500" />
  }

  const getAlertColor = (priority: string) => {
    if (priority === 'high') return 'border-red-200 bg-red-50'
    if (priority === 'medium') return 'border-amber-200 bg-amber-50'
    return 'border-blue-200 bg-blue-50'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading compliance data...</p>
        </div>
      </div>
    )
  }

  if (!complianceData) {
    return (
      <div className="text-center py-8">
        <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">No compliance data available</p>
      </div>
    )
  }

  const highAlerts = complianceData.alerts?.filter(a => a.priority === 'high').length || 0
  const medAlerts = complianceData.alerts?.filter(a => a.priority === 'medium').length || 0

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">GST Invoices</p>
                <p className="text-2xl font-bold text-green-600">{complianceData.gst_compliance.total_invoices}</p>
              </div>
              <Calculator className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-xs text-gray-500 mt-2">GSTR-1: {complianceData.gst_compliance.gstr1_filed ? 'Filed' : 'Pending'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tax Collected</p>
                <p className="text-2xl font-bold text-green-600">{fmt(complianceData.gst_compliance.total_tax_collected)}</p>
              </div>
              <FileText className="h-8 w-8 text-green-400" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Taxable: {fmt(complianceData.gst_compliance.total_taxable_amount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">TDS Deducted</p>
                <p className="text-2xl font-bold text-purple-600">{fmt(complianceData.tds_compliance.total_tds_deducted)}</p>
              </div>
              <Users className="h-8 w-8 text-purple-400" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {complianceData.tds_compliance.total_tds_payments} payment{complianceData.tds_compliance.total_tds_payments !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Open Alerts</p>
                <p className={`text-2xl font-bold ${highAlerts > 0 ? 'text-red-600' : medAlerts > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {complianceData.notifications?.total_alerts || 0}
                </p>
              </div>
              <Shield className={`h-8 w-8 ${highAlerts > 0 ? 'text-red-400' : 'text-amber-400'}`} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {highAlerts > 0 ? `${highAlerts} high priority` : medAlerts > 0 ? `${medAlerts} medium priority` : 'All clear'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* GST & TDS Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-500" />
              GST Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Invoices</p>
                <p className="text-xl font-bold text-green-600">{complianceData.gst_compliance.total_invoices}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Tax Collected</p>
                <p className="text-xl font-bold text-green-600">{fmt(complianceData.gst_compliance.total_tax_collected)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Taxable Amount</span>
              <span className="font-medium">{fmt(complianceData.gst_compliance.total_taxable_amount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">GSTR-1</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${complianceData.gst_compliance.gstr1_filed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {complianceData.gst_compliance.gstr1_filed ? 'Filed' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">GSTR-3B</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${complianceData.gst_compliance.gstr3b_filed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {complianceData.gst_compliance.gstr3b_filed ? 'Filed' : 'Pending'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              TDS Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Payments</p>
                <p className="text-xl font-bold text-purple-600">{complianceData.tds_compliance.total_tds_payments}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">TDS Deducted</p>
                <p className="text-xl font-bold text-purple-600">{fmt(complianceData.tds_compliance.total_tds_deducted)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Certificates Issued</span>
              <span className="font-medium">{complianceData.tds_compliance.certificates_issued}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Certificates Pending</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${complianceData.tds_compliance.certificates_pending === 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                {complianceData.tds_compliance.certificates_pending}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Alerts */}
      {complianceData.alerts && complianceData.alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Compliance Alerts
              </div>
              <div className="flex gap-2">
                {complianceData.notifications?.high_priority > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                    {complianceData.notifications.high_priority} High
                  </span>
                )}
                {complianceData.notifications?.medium_priority > 0 && (
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                    {complianceData.notifications.medium_priority} Medium
                  </span>
                )}
                {complianceData.notifications?.low_priority > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {complianceData.notifications.low_priority} Low
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {complianceData.alerts.map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg border ${getAlertColor(alert.priority)}`}>
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <span className="text-xs text-gray-500 uppercase">{alert.category}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{alert.message}</p>
                      <p className="text-xs text-gray-500"><strong>Action:</strong> {alert.action}</p>
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

export default Phase2Summary
