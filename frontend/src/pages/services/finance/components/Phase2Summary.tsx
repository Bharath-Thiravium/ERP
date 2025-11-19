import React, { useState, useEffect } from 'react'
import { CheckCircle, AlertTriangle, Clock, TrendingUp, Calculator, FileText, Users, Shield } from 'lucide-react'
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

const Phase2Summary: React.FC<Phase2SummaryProps> = ({ sessionKey }) => {
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchComplianceData()
  }, [sessionKey])

  const fetchComplianceData = async () => {
    if (!sessionKey) return

    try {
      const response = await fetch(`/api/finance/compliance/dashboard/?session_key=${sessionKey}`)
      const data = await response.json()
      if (response.ok) {
        setComplianceData(data)
      } else {
        console.error('Error fetching compliance data:', data.error)
      }
    } catch (error) {
      console.error('Error fetching compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'action_required':
        return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'attention_needed':
        return <Clock className="w-5 h-5 text-amber-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return 'text-green-600 bg-green-100'
      case 'action_required':
        return 'text-red-600 bg-red-100'
      case 'attention_needed':
        return 'text-amber-600 bg-amber-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'info':
        return <FileText className="w-4 h-4 text-blue-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getAlertColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50'
      case 'medium':
        return 'border-amber-200 bg-amber-50'
      case 'low':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading Phase 2 compliance data...</p>
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

  return (
    <div className="space-y-6">
      {/* Phase 2 Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Phase 2: Indian Finance Compliance</h2>
            <p className="text-green-100">
              Automatic GST & TDS calculations integrated into your workflows
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{complianceData.period}</div>
            <div className="flex items-center gap-2 mt-2">
              {getStatusIcon(complianceData.overall_status)}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(complianceData.overall_status)}`}>
                {complianceData.overall_status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Auto GST Calculation</p>
                <p className="text-2xl font-bold text-green-600">✓ Active</p>
              </div>
              <Calculator className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Integrated in invoice creation</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Auto TDS Calculation</p>
                <p className="text-2xl font-bold text-purple-600">✓ Active</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Integrated in payment recording</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customer Compliance</p>
                <p className="text-2xl font-bold text-blue-600">✓ Enhanced</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">State codes & GST registration</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Compliance Alerts</p>
                <p className="text-2xl font-bold text-red-600">{complianceData.notifications?.total_alerts || 0}</p>
              </div>
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Real-time notifications</p>
          </CardContent>
        </Card>
      </div>

      {/* GST & TDS Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GST Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-green-500" />
              GST Compliance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Total Invoices</p>
                <p className="text-xl font-bold text-green-600">
                  {complianceData.gst_compliance.total_invoices}
                </p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Tax Collected</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(complianceData.gst_compliance.total_tax_collected)}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taxable Amount:</span>
                <span className="font-medium">
                  {formatCurrency(complianceData.gst_compliance.total_taxable_amount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">GSTR-1 Filed:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  complianceData.gst_compliance.gstr1_filed 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {complianceData.gst_compliance.gstr1_filed ? 'Yes' : 'Pending'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TDS Compliance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              TDS Compliance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">TDS Payments</p>
                <p className="text-xl font-bold text-purple-600">
                  {complianceData.tds_compliance.total_tds_payments}
                </p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">TDS Deducted</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatCurrency(complianceData.tds_compliance.total_tds_deducted)}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Certificates Issued:</span>
                <span className="font-medium">{complianceData.tds_compliance.certificates_issued}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Certificates Pending:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  complianceData.tds_compliance.certificates_pending === 0
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {complianceData.tds_compliance.certificates_pending}
                </span>
              </div>
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
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getAlertColor(alert.priority)}`}
                >
                  <div className="flex items-start gap-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">{alert.title}</h4>
                        <span className="text-xs text-gray-500 uppercase">{alert.category}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                      <p className="text-xs text-gray-500">
                        <strong>Action:</strong> {alert.action}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phase 2 Features Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Phase 2 Implementation Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">✅ Completed Features</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automatic GST calculation in invoice creation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Automatic TDS calculation in payment recording
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Enhanced customer forms with compliance fields
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Real-time compliance notifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Integrated workflow compliance validation
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">🚀 Benefits</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Reduced manual GST calculation errors</li>
                <li>• Automatic TDS compliance for payments</li>
                <li>• Real-time compliance status monitoring</li>
                <li>• Seamless integration with existing workflows</li>
                <li>• Enhanced customer data management</li>
                <li>• Proactive compliance alerts and notifications</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Phase 2 Successfully Implemented!</span>
            </div>
            <p className="text-sm text-green-700">
              Your finance system now includes comprehensive Indian compliance features with automatic 
              GST and TDS calculations integrated directly into your invoice and payment workflows.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Phase2Summary