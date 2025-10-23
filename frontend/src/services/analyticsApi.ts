/**
 * Analytics and Reporting API Service
 */
import { apiClient } from '../lib/api'

export interface GSTR1Report {
  period: {
    start_date: string
    end_date: string
    month: string
  }
  summary: {
    total_invoices: number
    total_taxable_value: number
    total_tax_amount: number
    total_invoice_value: number
  }
  b2b_supplies: Array<{
    invoice_number: string
    invoice_date: string
    customer_gstin: string
    customer_name: string
    place_of_supply: string
    taxable_value: number
    igst_amount: number
    cgst_amount: number
    sgst_amount: number
    total_tax: number
    invoice_value: number
  }>
  b2cl_supplies: Array<any>
  b2cs_supplies: Array<any>
  generated_at: string
}

export interface GSTR3BReport {
  period: {
    start_date: string
    end_date: string
    month: string
  }
  outward_supplies: {
    taxable_value: number
    igst: number
    cgst: number
    sgst: number
    cess: number
  }
  input_tax_credit: {
    igst: number
    cgst: number
    sgst: number
    cess: number
  }
  tax_payable: {
    igst: number
    cgst: number
    sgst: number
    cess: number
  }
  generated_at: string
}

export interface TDSCertificate {
  certificate_number: string
  deductor_details: {
    name: string
    tan: string
    pan: string
    address: string
  }
  deductee_details: {
    name: string
    pan: string
    address: string
  }
  payment_details: {
    payment_date: string
    amount_paid: number
    tds_amount: number
    tds_rate: number
    section_code: string
    challan_number: string
    deposit_date: string
  }
  financial_year: string
  generated_at: string
}

export interface QuarterlyTDSReport {
  period: {
    quarter: string
    financial_year: string
    start_date: string
    end_date: string
  }
  summary: {
    total_payments: number
    total_amount_paid: number
    total_tds_deducted: number
    unique_deductees: number
  }
  deductee_wise_details: Array<{
    deductee_name: string
    deductee_pan: string
    total_amount_paid: number
    total_tds_deducted: number
    payments: Array<{
      payment_date: string
      amount_paid: number
      tds_amount: number
      section_code: string
      rate: number
    }>
  }>
  generated_at: string
}

export interface ComplianceAnalytics {
  period: {
    start_date: string
    end_date: string
  }
  gst_analytics: {
    total_gst_collected: number
    gst_rate_wise_breakdown: Record<string, {
      taxable_value: number
      tax_amount: number
      invoice_count: number
    }>
    monthly_gst_trend: Array<{
      month: string
      taxable_value: number
      tax_amount: number
      invoice_count: number
    }>
    compliance_score: number
  }
  tds_analytics: {
    total_tds_deducted: number
    tds_section_wise_breakdown: Record<string, {
      total_amount: number
      tds_amount: number
      payment_count: number
    }>
    monthly_tds_trend: Array<{
      month: string
      total_amount: number
      tds_amount: number
      payment_count: number
    }>
    certificates_pending: number
  }
  customer_analytics: {
    gst_registered_customers: number
    non_gst_customers: number
    top_customers_by_tax: Array<{
      customer_name: string
      customer_gstin: string
      total_tax: number
      total_business: number
      invoice_count: number
    }>
  }
  overall_compliance_score: number
  generated_at: string
}

export interface TaxAnalyticsSummary {
  current_month: {
    gst_collected: number
    tds_deducted: number
    compliance_score: number
    gst_growth: number
    tds_growth: number
  }
  gst_rate_breakdown: Record<string, any>
  monthly_trends: {
    gst_trend: Array<any>
    tds_trend: Array<any>
  }
  top_customers: Array<any>
}

export interface ComplianceAlert {
  type: 'warning' | 'info' | 'error'
  title: string
  message: string
  action: string
  priority: 'high' | 'medium' | 'low'
}

export interface AuditTrailReport {
  period: {
    start_date: string
    end_date: string
  }
  summary: {
    total_transactions: number
    total_invoices: number
    total_payments: number
    compliant_transactions: number
    pending_transactions: number
  }
  audit_entries: Array<{
    timestamp: string
    transaction_type: string
    transaction_id: string
    customer: string
    amount: number
    tax_amount?: number
    tds_amount?: number
    compliance_status: string
    details: Record<string, any>
  }>
  generated_at: string
}

class AnalyticsApiService {
  /**
   * Generate GSTR-1 report
   */
  async generateGSTR1Report(startDate: string, endDate: string): Promise<GSTR1Report> {
    const response = await apiClient.get('/api/finance/reports/gstr1/', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  }

  /**
   * Generate GSTR-3B report
   */
  async generateGSTR3BReport(startDate: string, endDate: string): Promise<GSTR3BReport> {
    const response = await apiClient.get('/api/finance/reports/gstr3b/', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  }

  /**
   * Generate TDS certificate
   */
  async generateTDSCertificate(paymentId: number): Promise<TDSCertificate> {
    const response = await apiClient.get(`/api/finance/reports/tds-certificate/${paymentId}/`)
    return response.data
  }

  /**
   * Generate quarterly TDS report
   */
  async generateQuarterlyTDSReport(quarter: string, financialYear: string): Promise<QuarterlyTDSReport> {
    const response = await apiClient.get('/api/finance/reports/quarterly-tds/', {
      params: { quarter, financial_year: financialYear }
    })
    return response.data
  }

  /**
   * Get compliance analytics dashboard
   */
  async getComplianceAnalytics(startDate?: string, endDate?: string): Promise<ComplianceAnalytics> {
    const params: any = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    
    const response = await apiClient.get('/api/finance/analytics/dashboard/', { params })
    return response.data
  }

  /**
   * Get tax analytics summary
   */
  async getTaxAnalyticsSummary(): Promise<TaxAnalyticsSummary> {
    const response = await apiClient.get('/api/finance/analytics/tax-summary/')
    return response.data
  }

  /**
   * Get compliance alerts
   */
  async getComplianceAlerts(): Promise<{ alerts: ComplianceAlert[], total_alerts: number, high_priority: number }> {
    const response = await apiClient.get('/api/finance/analytics/alerts/')
    return response.data
  }

  /**
   * Get audit trail report
   */
  async getAuditTrailReport(startDate: string, endDate: string): Promise<AuditTrailReport> {
    const response = await apiClient.get('/api/finance/analytics/audit-trail/', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  }

  /**
   * Get reconciliation report
   */
  async getReconciliationReport(startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get('/api/finance/analytics/reconciliation/', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  }

  /**
   * Export GSTR-1 as CSV
   */
  async exportGSTR1CSV(startDate: string, endDate: string): Promise<Blob> {
    const response = await apiClient.get('/api/finance/export/gstr1-csv/', {
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * Export TDS as CSV
   */
  async exportTDSCSV(quarter: string, financialYear: string): Promise<Blob> {
    const response = await apiClient.get('/api/finance/export/tds-csv/', {
      params: { quarter, financial_year: financialYear },
      responseType: 'blob'
    })
    return response.data
  }

  /**
   * Bulk generate TDS certificates
   */
  async bulkGenerateTDSCertificates(paymentIds: number[]): Promise<{ certificates_generated: number, certificates: TDSCertificate[] }> {
    const response = await apiClient.post('/api/finance/bulk/tds-certificates/', {
      payment_ids: paymentIds
    })
    return response.data
  }

  /**
   * Download file from blob
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  /**
   * Format percentage for display
   */
  formatPercentage(value: number): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  /**
   * Get current financial year
   */
  getCurrentFinancialYear(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    if (month >= 4) {
      return `${year}-${(year + 1).toString().slice(-2)}`
    } else {
      return `${year - 1}-${year.toString().slice(-2)}`
    }
  }

  /**
   * Get current quarter
   */
  getCurrentQuarter(): string {
    const now = new Date()
    const month = now.getMonth() + 1
    
    if (month >= 4 && month <= 6) return 'Q1'
    if (month >= 7 && month <= 9) return 'Q2'
    if (month >= 10 && month <= 12) return 'Q3'
    return 'Q4'
  }

  /**
   * Get date range for current month
   */
  getCurrentMonthRange(): { startDate: string, endDate: string } {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  /**
   * Get date range for previous month
   */
  getPreviousMonthRange(): { startDate: string, endDate: string } {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endDate = new Date(now.getFullYear(), now.getMonth(), 0)
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  /**
   * Get date range for current quarter
   */
  getCurrentQuarterRange(): { startDate: string, endDate: string } {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    
    let startMonth: number, endMonth: number
    
    if (month >= 4 && month <= 6) {
      startMonth = 4
      endMonth = 6
    } else if (month >= 7 && month <= 9) {
      startMonth = 7
      endMonth = 9
    } else if (month >= 10 && month <= 12) {
      startMonth = 10
      endMonth = 12
    } else {
      startMonth = 1
      endMonth = 3
    }
    
    const startDate = new Date(year, startMonth - 1, 1)
    const endDate = new Date(year, endMonth, 0)
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  /**
   * Generate Profit & Loss Report
   */
  async generateProfitLossReport(startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get('/api/finance/reports/profit-loss/', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  }

  /**
   * Generate Balance Sheet
   */
  async generateBalanceSheet(asOfDate: string): Promise<any> {
    const response = await apiClient.get('/api/finance/reports/balance-sheet/', {
      params: { as_of_date: asOfDate }
    })
    return response.data
  }

  /**
   * Generate Cash Flow Statement
   */
  async generateCashFlowStatement(startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get('/api/finance/reports/cash-flow/', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  }

  /**
   * Generate Complete GSTR-3B Report
   */
  async generateCompleteGSTR3BReport(startDate: string, endDate: string): Promise<any> {
    const response = await apiClient.get('/api/finance/compliance/gstr3b-complete/', {
      params: { start_date: startDate, end_date: endDate }
    })
    return response.data
  }
}

export const analyticsApiService = new AnalyticsApiService()