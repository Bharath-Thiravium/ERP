import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import { 
  FileText, 
  Download, 
 
  Filter,
  Eye,


  AlertTriangle
} from 'lucide-react'
import { analyticsApiService, type GSTR1Report, type QuarterlyTDSReport } from '../../../../services/analyticsApi'

interface ReportsManagerProps {
  sessionKey: string
}

export const ReportsManager: React.FC<ReportsManagerProps> = ({ sessionKey }) => {
  // Note: sessionKey is automatically handled by apiClient interceptor for /api/finance/ endpoints
  // but we keep it in props for consistency and potential future use
  void sessionKey // Suppress TypeScript unused variable warning
  const [activeReport, setActiveReport] = useState<'gstr1' | 'gstr3b' | 'tds' | 'certificates' | 'financial'>('gstr1')

  const handleTabChange = (tabId: 'gstr1' | 'gstr3b' | 'tds' | 'certificates' | 'financial') => {
    setActiveReport(tabId)
    setReportData(null) // Clear previous report data when switching tabs
  }
  const [loading, setLoading] = useState(false)
  const [reportData, setReportData] = useState<any>(null)
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().slice(0, 7) + '-01', // First day of current month
    endDate: new Date().toISOString().slice(0, 10) // Today
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
      const data = await analyticsApiService.generateCompleteGSTR3BReport(dateRange.startDate, dateRange.endDate)
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

  const generateFinancialReports = async () => {
    setLoading(true)
    try {
      // Generate all three financial reports
      const [plData, bsData, cfData] = await Promise.all([
        analyticsApiService.generateProfitLossReport(dateRange.startDate, dateRange.endDate),
        analyticsApiService.generateBalanceSheet(dateRange.endDate),
        analyticsApiService.generateCashFlowStatement(dateRange.startDate, dateRange.endDate)
      ])
      
      setReportData({
        profitLoss: plData,
        balanceSheet: bsData,
        cashFlow: cfData
      })
    } catch (error) {
      console.error('Failed to generate financial reports:', error)
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
      case 'financial':
        generateFinancialReports()
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

  const renderFinancialReports = (data: any) => (
    <div className="space-y-6">
      {/* Profit & Loss Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-green-600">Revenue</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Product Revenue:</span>
                  <span className="font-medium">{analyticsApiService.formatCurrency(data.profitLoss.revenue.product_revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Revenue:</span>
                  <span className="font-medium">{analyticsApiService.formatCurrency(data.profitLoss.revenue.service_revenue)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Revenue:</span>
                  <span className="font-bold text-green-600">{analyticsApiService.formatCurrency(data.profitLoss.revenue.total_revenue)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-red-600">Costs & Expenses</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Cost of Goods Sold:</span>
                  <span className="font-medium">{analyticsApiService.formatCurrency(data.profitLoss.costs.cost_of_goods_sold)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Operating Expenses:</span>
                  <span className="font-medium">{analyticsApiService.formatCurrency(data.profitLoss.expenses.operating_expenses)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Expenses:</span>
                  <span className="font-medium">{analyticsApiService.formatCurrency(data.profitLoss.expenses.tax_expenses)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-blue-600">Profitability</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Gross Profit:</span>
                  <span className="font-medium">{analyticsApiService.formatCurrency(data.profitLoss.costs.gross_profit)}</span>
                </div>
                <div className="flex justify-between">
                  <span>EBITDA:</span>
                  <span className="font-medium">{analyticsApiService.formatCurrency(data.profitLoss.profitability.ebitda)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Net Income:</span>
                  <span className="font-bold text-blue-600">{analyticsApiService.formatCurrency(data.profitLoss.profitability.net_income)}</span>
                </div>
                <div className="text-sm text-gray-600">
                  Net Margin: {data.profitLoss.profitability.net_margin.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance Sheet */}
      <Card>
        <CardHeader>
          <CardTitle>Balance Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-semibold text-blue-600 mb-4">Assets</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium mb-2">Current Assets</h5>
                  <div className="space-y-1 text-sm ml-4">
                    <div className="flex justify-between">
                      <span>Cash & Equivalents:</span>
                      <span>{analyticsApiService.formatCurrency(data.balanceSheet.assets.current_assets.cash_and_equivalents)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accounts Receivable:</span>
                      <span>{analyticsApiService.formatCurrency(data.balanceSheet.assets.current_assets.accounts_receivable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inventory:</span>
                      <span>{analyticsApiService.formatCurrency(data.balanceSheet.assets.current_assets.inventory)}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total Current Assets:</span>
                      <span>{analyticsApiService.formatCurrency(data.balanceSheet.assets.current_assets.total_current_assets)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Fixed Assets</h5>
                  <div className="space-y-1 text-sm ml-4">
                    <div className="flex justify-between">
                      <span>Property, Plant & Equipment:</span>
                      <span>{analyticsApiService.formatCurrency(data.balanceSheet.assets.fixed_assets.property_plant_equipment)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between font-bold text-blue-600 border-t pt-2">
                  <span>Total Assets:</span>
                  <span>{analyticsApiService.formatCurrency(data.balanceSheet.assets.total_assets)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-red-600 mb-4">Liabilities & Equity</h4>
              <div className="space-y-3">
                <div>
                  <h5 className="font-medium mb-2">Current Liabilities</h5>
                  <div className="space-y-1 text-sm ml-4">
                    <div className="flex justify-between">
                      <span>Accounts Payable:</span>
                      <span>{analyticsApiService.formatCurrency(data.balanceSheet.liabilities.current_liabilities.accounts_payable)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax Payable:</span>
                      <span>{analyticsApiService.formatCurrency(data.balanceSheet.liabilities.current_liabilities.tax_payable)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium mb-2">Long-term Liabilities</h5>
                  <div className="space-y-1 text-sm ml-4">
                    <div className="flex justify-between">
                      <span>Long-term Debt:</span>
                      <span>{analyticsApiService.formatCurrency(data.balanceSheet.liabilities.long_term_liabilities.long_term_debt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total Liabilities:</span>
                  <span>{analyticsApiService.formatCurrency(data.balanceSheet.liabilities.total_liabilities)}</span>
                </div>
                <div className="flex justify-between font-bold text-green-600">
                  <span>Total Equity:</span>
                  <span>{analyticsApiService.formatCurrency(data.balanceSheet.equity.total_equity)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Flow Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-green-600 mb-3">Operating Activities</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Cash from Customers:</span>
                  <span className="text-green-600">{analyticsApiService.formatCurrency(data.cashFlow.operating_activities.cash_received_from_customers)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cash to Suppliers:</span>
                  <span className="text-red-600">{analyticsApiService.formatCurrency(data.cashFlow.operating_activities.cash_paid_to_suppliers)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Operating Expenses:</span>
                  <span className="text-red-600">{analyticsApiService.formatCurrency(data.cashFlow.operating_activities.cash_paid_for_expenses)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Net Operating Cash:</span>
                  <span className={data.cashFlow.operating_activities.net_cash_from_operations >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {analyticsApiService.formatCurrency(data.cashFlow.operating_activities.net_cash_from_operations)}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-600 mb-3">Investing Activities</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Capital Expenditure:</span>
                  <span className="text-red-600">{analyticsApiService.formatCurrency(data.cashFlow.investing_activities.capital_expenditure)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-medium">
                  <span>Net Investing Cash:</span>
                  <span className={data.cashFlow.investing_activities.net_cash_from_investing >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {analyticsApiService.formatCurrency(data.cashFlow.investing_activities.net_cash_from_investing)}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-purple-600 mb-3">Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Beginning Cash:</span>
                  <span>{analyticsApiService.formatCurrency(data.cashFlow.summary.beginning_cash_balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Net Change:</span>
                  <span className={data.cashFlow.summary.net_change_in_cash >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {analyticsApiService.formatCurrency(data.cashFlow.summary.net_change_in_cash)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Ending Cash:</span>
                  <span className="text-purple-600">{analyticsApiService.formatCurrency(data.cashFlow.summary.ending_cash_balance)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

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
            { id: 'certificates', label: 'TDS Certificates', description: 'Form 16A certificates' },
            { id: 'financial', label: 'Financial Reports', description: 'P&L, Balance Sheet, Cash Flow' }
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
          {(activeReport === 'gstr1' || activeReport === 'gstr3b' || activeReport === 'financial') && (
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
          {activeReport === 'gstr3b' && reportData && (
            <div className="space-y-6">
              {/* Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>GSTR-3B Summary - {reportData.period.month}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {analyticsApiService.formatCurrency(reportData.summary.total_turnover)}
                      </p>
                      <p className="text-sm text-gray-600">Total Turnover</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {analyticsApiService.formatCurrency(reportData.summary.total_tax_liability)}
                      </p>
                      <p className="text-sm text-gray-600">Tax Liability</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {analyticsApiService.formatCurrency(reportData.summary.total_itc_available)}
                      </p>
                      <p className="text-sm text-gray-600">ITC Available</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-orange-600">
                        {analyticsApiService.formatCurrency(reportData.summary.net_tax_payable)}
                      </p>
                      <p className="text-sm text-gray-600">Net Tax Payable</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 3.1 - Outward Supplies */}
              <Card>
                <CardHeader>
                  <CardTitle>Section 3.1 - Outward Taxable Supplies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">B2B Supplies</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Taxable Value:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2b_supplies.taxable_value)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2b_supplies.igst)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2b_supplies.cgst)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2b_supplies.sgst)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">B2C Large ({'>'}2.5L)</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Taxable Value:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2c_large_supplies.taxable_value)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2c_large_supplies.igst)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2c_large_supplies.cgst)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2c_large_supplies.sgst)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">B2C Other (≤2.5L)</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Taxable Value:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2c_other_supplies.taxable_value)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>IGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2c_other_supplies.igst)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>CGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2c_other_supplies.cgst)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST:</span>
                            <span>{analyticsApiService.formatCurrency(reportData.section_3_1_outward_supplies.b2c_other_supplies.sgst)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 4 - Eligible ITC */}
              <Card>
                <CardHeader>
                  <CardTitle>Section 4 - Eligible Input Tax Credit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">ITC on Inputs</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>IGST:</span>
                          <span>{analyticsApiService.formatCurrency(reportData.section_4_eligible_itc.itc_on_inputs.igst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CGST:</span>
                          <span>{analyticsApiService.formatCurrency(reportData.section_4_eligible_itc.itc_on_inputs.cgst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST:</span>
                          <span>{analyticsApiService.formatCurrency(reportData.section_4_eligible_itc.itc_on_inputs.sgst)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">ITC on Input Services</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>IGST:</span>
                          <span>{analyticsApiService.formatCurrency(reportData.section_4_eligible_itc.itc_on_input_services.igst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>CGST:</span>
                          <span>{analyticsApiService.formatCurrency(reportData.section_4_eligible_itc.itc_on_input_services.cgst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST:</span>
                          <span>{analyticsApiService.formatCurrency(reportData.section_4_eligible_itc.itc_on_input_services.sgst)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">ITC on Capital Goods</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>IGST:</span>
                          <span>{analyticsApiService.formatCurrency(reportData.section_4_eligible_itc.itc_on_capital_goods.igst)}</span>
                        </div>
                        <div className="flex justify-between font-medium border-t pt-1">
                          <span>Total ITC:</span>
                          <span>{analyticsApiService.formatCurrency(reportData.section_4_eligible_itc.total_itc)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Section 7 - Tax Payable */}
              <Card>
                <CardHeader>
                  <CardTitle>Section 7 - Tax Payable (Net of ITC)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-xl font-bold text-blue-600">
                        {analyticsApiService.formatCurrency(reportData.section_7_tax_payable.igst_payable)}
                      </p>
                      <p className="text-sm text-gray-600">IGST Payable</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-xl font-bold text-green-600">
                        {analyticsApiService.formatCurrency(reportData.section_7_tax_payable.cgst_payable)}
                      </p>
                      <p className="text-sm text-gray-600">CGST Payable</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-xl font-bold text-purple-600">
                        {analyticsApiService.formatCurrency(reportData.section_7_tax_payable.sgst_payable)}
                      </p>
                      <p className="text-sm text-gray-600">SGST Payable</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <p className="text-xl font-bold text-orange-600">
                        {analyticsApiService.formatCurrency(reportData.section_7_tax_payable.total_tax_payable)}
                      </p>
                      <p className="text-sm text-gray-600">Total Tax Payable</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {activeReport === 'financial' && reportData && renderFinancialReports(reportData)}
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