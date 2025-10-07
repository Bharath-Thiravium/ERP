import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { analyticsApiService, type GSTR1Report, type QuarterlyTDSReport, type TDSCertificate } from '../../../../services/analyticsApi'

interface ReportsManagerProps {
  sessionKey: string
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({ sessionKey }) => {
  const [activeReport, setActiveReport] = useState<'gstr1' | 'gstr3b' | 'tds' | 'certificates'>('gstr1')

  const handleTabChange = (tabId: 'gstr1' | 'gstr3b' | 'tds' | 'certificates') => {
    setActiveReport(tabId)
    setReportData(null) // Clear previous report data when switching tabs
  }
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [dateRange, setDateRange] = useState({
    startDate: analyticsApiService.getCurrentMonthRange().startDate,
    endDate: analyticsApiService.getCurrentMonthRange().endDate
  })
  const [quarter, setQuarter] = useState(analyticsApiService.getCurrentQuarter())
  const [financialYear, setFinancialYear] = useState(analyticsApiService.getCurrentFinancialYear())

  const generateGSTR1Report = async () => {
    setLoading(true)
    try {
      const data = await analyticsApiService.generateGSTR1Report(dateRange.startDate, dateRange.endDate)
      setReportData(data)
    } catch (error) {
      console.error('Failed to generate GSTR-1 report:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateGSTR3BReport = async () => {
    setLoading(true)
    try {
      const data = await analyticsApiService.generateGSTR3BReport(dateRange.startDate, dateRange.endDate)
      setReportData(data)
    } catch (error) {
      console.error('Failed to generate GSTR-3B report:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTDSReport = async () => {
    setLoading(true)
    try {
      const data = await analyticsApiService.generateQuarterlyTDSReport(quarter, financialYear)
      setReportData(data)
    } catch (error) {
      console.error('Failed to generate TDS report:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTDSCertificates = async () => {
    setLoading(true)
    try {
      const data = await analyticsApiService.generateQuarterlyTDSReport(quarter, financialYear)
      setReportData(data)
    } catch (error) {
      console.error('Failed to generate TDS certificates:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportCurrentReport = async () => {
    try {
      if (activeReport === 'gstr1') {
        const blob = await analyticsApiService.exportGSTR1CSV(dateRange.startDate, dateRange.endDate)
        analyticsApiService.downloadFile(blob, `GSTR1_${dateRange.startDate}_${dateRange.endDate}.csv`)
      } else if (activeReport === 'tds') {
        const blob = await analyticsApiService.exportTDSCSV(quarter, financialYear)
        analyticsApiService.downloadFile(blob, `TDS_${quarter}_${financialYear}.csv`)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleGenerateReport = () => {
    switch (activeReport) {
      case 'gstr1':
        generateGSTR1Report()
        break
      case 'gstr3b':
        generateGSTR3BReport()
        break
      case 'tds':
        generateTDSReport()
        break
      case 'certificates':
        generateTDSCertificates()
        break
    }
  }

  const renderGSTR1Report = (data: GSTR1Report) => (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>GSTR-1 Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{data.summary.total_invoices}</p>
              <p className="text-sm text-gray-600">Total Invoices</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {analyticsApiService.formatCurrency(data.summary.total_taxable_value)}
              </p>
              <p className="text-sm text-gray-600">Taxable Value</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-purple-600">
                {analyticsApiService.formatCurrency(data.summary.total_tax_amount)}
              </p>
              <p className="text-sm text-gray-600">Tax Amount</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {analyticsApiService.formatCurrency(data.summary.total_invoice_value)}
              </p>
              <p className="text-sm text-gray-600">Invoice Value</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* B2B Supplies */}
      <Card>
        <CardHeader>
          <CardTitle>B2B Supplies ({data.b2b_supplies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Invoice No.</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">GSTIN</th>
                  <th className="text-right p-2">Taxable Value</th>
                  <th className="text-right p-2">Tax Amount</th>
                  <th className="text-right p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.b2b_supplies.slice(0, 10).map((supply, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{supply.invoice_number}</td>
                    <td className="p-2">{supply.invoice_date}</td>
                    <td className="p-2">{supply.customer_name}</td>
                    <td className="p-2 font-mono text-xs">{supply.customer_gstin}</td>
                    <td className="p-2 text-right">{analyticsApiService.formatCurrency(supply.taxable_value)}</td>
                    <td className="p-2 text-right">{analyticsApiService.formatCurrency(supply.total_tax)}</td>
                    <td className="p-2 text-right font-medium">{analyticsApiService.formatCurrency(supply.invoice_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.b2b_supplies.length > 10 && (
              <p className="text-center text-gray-600 mt-4">
                Showing 10 of {data.b2b_supplies.length} records. Export for complete data.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderTDSReport = (data: QuarterlyTDSReport) => {
    if (!data || !data.summary || !data.period) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No TDS data available for the selected period</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>TDS Report Summary - {data.period.quarter} {data.period.financial_year}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.summary.total_payments || 0}</p>
                <p className="text-sm text-gray-600">Total Payments</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {analyticsApiService.formatCurrency(data.summary.total_amount_paid || 0)}
                </p>
                <p className="text-sm text-gray-600">Amount Paid</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {analyticsApiService.formatCurrency(data.summary.total_tds_deducted || 0)}
                </p>
                <p className="text-sm text-gray-600">TDS Deducted</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{data.summary.unique_deductees || 0}</p>
                <p className="text-sm text-gray-600">Deductees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Deductee Details */}
        <Card>
          <CardHeader>
            <CardTitle>Deductee-wise Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.deductee_wise_details && data.deductee_wise_details.length > 0 ? (
                data.deductee_wise_details.slice(0, 10).map((deductee, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">{deductee.deductee_name}</p>
                        <p className="text-sm text-gray-600 font-mono">{deductee.deductee_pan}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{analyticsApiService.formatCurrency(deductee.total_tds_deducted || 0)}</p>
                        <p className="text-sm text-gray-600">TDS Deducted</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Total Paid: {analyticsApiService.formatCurrency(deductee.total_amount_paid || 0)}</p>
                      <p>Payments: {deductee.payments ? deductee.payments.length : 0}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No deductee details available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reports Manager</h2>
          <p className="text-gray-600">Generate and manage compliance reports</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportCurrentReport} variant="outline" disabled={!reportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Generate Report
          </Button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {[
            { id: 'gstr1', label: 'GSTR-1', description: 'Monthly GST return' },
            { id: 'gstr3b', label: 'GSTR-3B', description: 'Monthly GST summary' },
            { id: 'tds', label: 'TDS Report', description: 'Quarterly TDS return' },
            { id: 'certificates', label: 'TDS Certificates', description: 'Form 16A certificates' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeReport === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div>
                <p>{tab.label}</p>
                <p className="text-xs text-gray-400">{tab.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(activeReport === 'gstr1' || activeReport === 'gstr3b') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
            </div>
          )}

          {(activeReport === 'tds' || activeReport === 'certificates') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Quarter</label>
                <select
                  value={quarter}
                  onChange={(e) => setQuarter(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="Q1">Q1 (Apr-Jun)</option>
                  <option value="Q2">Q2 (Jul-Sep)</option>
                  <option value="Q3">Q3 (Oct-Dec)</option>
                  <option value="Q4">Q4 (Jan-Mar)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Financial Year</label>
                <select
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="2024-25">2024-25</option>
                  <option value="2023-24">2023-24</option>
                  <option value="2022-23">2022-23</option>
                </select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Content */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Generating report...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {reportData && !loading && (
        <div>
          {activeReport === 'gstr1' && renderGSTR1Report(reportData)}
          {activeReport === 'tds' && renderTDSReport(reportData)}
          {activeReport === 'certificates' && renderTDSReport(reportData)}
          {activeReport === 'gstr3b' && (
            <Card>
              <CardHeader>
                <CardTitle>GSTR-3B Report</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {analyticsApiService.formatCurrency(reportData.outward_supplies.taxable_value)}
                    </p>
                    <p className="text-sm text-gray-600">Taxable Value</p>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {analyticsApiService.formatCurrency(
                        reportData.outward_supplies.igst + 
                        reportData.outward_supplies.cgst + 
                        reportData.outward_supplies.sgst
                      )}
                    </p>
                    <p className="text-sm text-gray-600">Total Tax</p>
                  </div>
                  <div className="text-center p-6 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {analyticsApiService.formatCurrency(
                        reportData.tax_payable.igst + 
                        reportData.tax_payable.cgst + 
                        reportData.tax_payable.sgst
                      )}
                    </p>
                    <p className="text-sm text-gray-600">Tax Payable</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!reportData && !loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select parameters and click "Generate Report" to view data</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}