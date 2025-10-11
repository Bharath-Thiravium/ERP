import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Download, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  PieChart,

  Users,
  DollarSign,
  Receipt
} from 'lucide-react'
import { analyticsApiService, type TaxAnalyticsSummary, type ComplianceAlert } from '../../../../services/analyticsApi'

interface AdvancedAnalyticsDashboardProps {
  sessionKey: string
}

export const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = () => {
  const [analyticsData, setAnalyticsData] = useState<TaxAnalyticsSummary | null>(null)
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'gst' | 'tds' | 'reports'>('overview')

  useEffect(() => {
    loadAnalyticsData()
    loadAlerts()
  }, [])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      const data = await analyticsApiService.getTaxAnalyticsSummary()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAlerts = async () => {
    try {
      const alertsData = await analyticsApiService.getComplianceAlerts()
      setAlerts(alertsData.alerts)
    } catch (error) {
      console.error('Failed to load alerts:', error)
    }
  }

  const handleExportGSTR1 = async () => {
    try {
      const { startDate, endDate } = analyticsApiService.getCurrentMonthRange()
      const blob = await analyticsApiService.exportGSTR1CSV(startDate, endDate)
      analyticsApiService.downloadFile(blob, `GSTR1_${startDate}_${endDate}.csv`)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleExportTDS = async () => {
    try {
      const quarter = analyticsApiService.getCurrentQuarter()
      const financialYear = analyticsApiService.getCurrentFinancialYear()
      const blob = await analyticsApiService.exportTDSCSV(quarter, financialYear)
      analyticsApiService.downloadFile(blob, `TDS_${quarter}_${financialYear}.csv`)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <CheckCircle className="h-4 w-4 text-blue-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Advanced Analytics & Reports</h1>
          <p className="text-gray-600">Comprehensive tax analytics and compliance reporting</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportGSTR1} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export GSTR-1
          </Button>
          <Button onClick={handleExportTDS} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export TDS
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Compliance Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    alert.priority === 'high' ? 'bg-red-100 text-red-800' :
                    alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {alert.priority}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      {analyticsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">GST Collected</p>
                  <p className="text-2xl font-bold">
                    {analyticsApiService.formatCurrency(analyticsData.current_month.gst_collected)}
                  </p>
                  <div className={`flex items-center gap-1 text-sm ${getGrowthColor(analyticsData.current_month.gst_growth)}`}>
                    {getGrowthIcon(analyticsData.current_month.gst_growth)}
                    {analyticsApiService.formatPercentage(analyticsData.current_month.gst_growth)}
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">TDS Deducted</p>
                  <p className="text-2xl font-bold">
                    {analyticsApiService.formatCurrency(analyticsData.current_month.tds_deducted)}
                  </p>
                  <div className={`flex items-center gap-1 text-sm ${getGrowthColor(analyticsData.current_month.tds_growth)}`}>
                    {getGrowthIcon(analyticsData.current_month.tds_growth)}
                    {analyticsApiService.formatPercentage(analyticsData.current_month.tds_growth)}
                  </div>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Compliance Score</p>
                  <p className="text-2xl font-bold">{analyticsData.current_month.compliance_score.toFixed(1)}%</p>
                  <p className="text-sm text-green-600">Excellent</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Top Customers</p>
                  <p className="text-2xl font-bold">{analyticsData.top_customers.length}</p>
                  <p className="text-sm text-gray-600">Active this month</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'gst', label: 'GST Analytics', icon: PieChart },
            { id: 'tds', label: 'TDS Analytics', icon: Receipt },
            { id: 'reports', label: 'Reports', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && analyticsData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* GST Rate Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>GST Rate Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(analyticsData.gst_rate_breakdown).map(([rate, data]) => (
                    <div key={rate} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{rate}% GST</p>
                        <p className="text-sm text-gray-600">{data.invoice_count} invoices</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{analyticsApiService.formatCurrency(data.tax_amount)}</p>
                        <p className="text-sm text-gray-600">
                          Taxable: {analyticsApiService.formatCurrency(data.taxable_value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Customers by Tax</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.top_customers.map((customer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{customer.customer_name}</p>
                        <p className="text-sm text-gray-600">
                          {customer.invoice_count} invoices • {customer.customer_gstin || 'No GSTIN'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{analyticsApiService.formatCurrency(customer.total_tax)}</p>
                        <p className="text-sm text-gray-600">
                          Business: {analyticsApiService.formatCurrency(customer.total_business)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'gst' && analyticsData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly GST Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.monthly_trends.gst_trend.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{month.month}</p>
                        <p className="text-sm text-gray-600">{month.invoice_count} invoices</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{analyticsApiService.formatCurrency(month.tax_amount)}</p>
                        <p className="text-sm text-gray-600">
                          Taxable: {analyticsApiService.formatCurrency(month.taxable_value)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'tds' && analyticsData && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly TDS Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.monthly_trends.tds_trend.map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{month.month}</p>
                        <p className="text-sm text-gray-600">{month.payment_count} payments</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{analyticsApiService.formatCurrency(month.tds_amount)}</p>
                        <p className="text-sm text-gray-600">
                          Total: {analyticsApiService.formatCurrency(month.total_amount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  GSTR-1 Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Generate monthly GSTR-1 report for GST filing
                </p>
                <Button onClick={handleExportGSTR1} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Generate GSTR-1
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  TDS Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Generate quarterly TDS report and certificates
                </p>
                <Button onClick={handleExportTDS} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Generate TDS Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Audit Trail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Complete audit trail of all transactions
                </p>
                <Button className="w-full" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Audit Trail
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}