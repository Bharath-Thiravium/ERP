/**
 * Government API Integration Service
 * Frontend service for government API calls
 */
import api from '../lib/api'

export interface GSTINValidationResult {
  valid: boolean
  business_name?: string
  legal_name?: string
  status?: string
  registration_date?: string
  state_code?: string
  taxpayer_type?: string
  error?: string
}

export interface PANValidationResult {
  valid: boolean
  name?: string
  status?: string
  category?: string
  error?: string
}

export interface GSTRates {
  cgst: number
  sgst: number
  igst: number
  cess: number
}

export interface TDSRates {
  rate: number
  threshold: number
  surcharge: number
  cess: number
}

export interface FilingResult {
  success: boolean
  reference_id?: string
  ack_no?: string
  status?: string
  token_no?: string
  error?: string
}

export interface EInvoiceResult {
  success: boolean
  irn?: string
  ack_no?: string
  ack_dt?: string
  qr_code?: string
  error?: string
}

export interface ComplianceStatus {
  gst_compliance: {
    pending_filings: number
    status: 'compliant' | 'pending'
  }
  tds_compliance: {
    pending_certificates: number
    status: 'compliant' | 'pending'
  }
  einvoice_compliance: {
    pending_irn: number
    status: 'compliant' | 'pending'
  }
  overall_status: 'compliant' | 'pending'
}

export interface CustomerValidationResult {
  customer_id: number
  name: string
  gstin_validation?: GSTINValidationResult
  pan_validation?: PANValidationResult
}

class GovernmentApiService {
  /**
   * Validate GSTIN with government database
   */
  async validateGSTIN(gstin: string): Promise<GSTINValidationResult> {
    try {
      const response = await api.post('/finance/gov-api/validate-gstin/', { gstin })
      return response.data
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.error || 'Validation failed'
      }
    }
  }

  /**
   * Validate PAN with income tax database
   */
  async validatePAN(pan: string): Promise<PANValidationResult> {
    try {
      const response = await api.post('/finance/gov-api/validate-pan/', { pan })
      return response.data
    } catch (error: any) {
      return {
        valid: false,
        error: error.response?.data?.error || 'Validation failed'
      }
    }
  }

  /**
   * Get current GST rates for HSN code
   */
  async getGSTRates(hsnCode: string): Promise<GSTRates | null> {
    try {
      const response = await api.get('/finance/gov-api/gst-rates/', {
        params: { hsn_code: hsnCode }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get GST rates:', error)
      return null
    }
  }

  /**
   * Get current TDS rates for section
   */
  async getTDSRates(sectionCode: string, assessmentYear: string = '2024-25'): Promise<TDSRates | null> {
    try {
      const response = await api.get('/finance/gov-api/tds-rates/', {
        params: { section_code: sectionCode, assessment_year: assessmentYear }
      })
      return response.data
    } catch (error) {
      console.error('Failed to get TDS rates:', error)
      return null
    }
  }

  /**
   * File GSTR-1 return
   */
  async fileGSTR1(gstin: string, returnPeriod: string): Promise<FilingResult> {
    try {
      const response = await api.post('/finance/gov-api/file-gstr1/', {
        gstin,
        return_period: returnPeriod
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Filing failed'
      }
    }
  }

  /**
   * File TDS return
   */
  async fileTDSReturn(quarter: string, financialYear: string): Promise<FilingResult> {
    try {
      const response = await api.post('/finance/gov-api/file-tds-return/', {
        quarter,
        financial_year: financialYear
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Filing failed'
      }
    }
  }

  /**
   * Generate e-invoice IRN
   */
  async generateEInvoice(invoiceId: number): Promise<EInvoiceResult> {
    try {
      const response = await api.post('/finance/gov-api/generate-einvoice/', {
        invoice_id: invoiceId
      })
      return response.data
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'E-invoice generation failed'
      }
    }
  }

  /**
   * Get overall compliance status
   */
  async getComplianceStatus(): Promise<ComplianceStatus | null> {
    try {
      const response = await api.get('/finance/gov-api/compliance-status/')
      return response.data
    } catch (error) {
      console.error('Failed to get compliance status:', error)
      return null
    }
  }

  /**
   * Bulk validate customer GST and PAN details
   */
  async bulkValidateCustomers(customerIds: number[]): Promise<CustomerValidationResult[]> {
    try {
      const response = await api.post('/finance/gov-api/bulk-validate-customers/', {
        customer_ids: customerIds
      })
      return response.data.results
    } catch (error: any) {
      console.error('Bulk validation failed:', error)
      return []
    }
  }

  /**
   * Real-time GSTIN validation with debouncing
   */
  private gstinValidationTimeout: NodeJS.Timeout | null = null

  async validateGSTINRealTime(
    gstin: string,
    callback: (result: GSTINValidationResult) => void,
    delay: number = 1000
  ): Promise<void> {
    if (this.gstinValidationTimeout) {
      clearTimeout(this.gstinValidationTimeout)
    }

    this.gstinValidationTimeout = setTimeout(async () => {
      if (gstin.length === 15) {
        const result = await this.validateGSTIN(gstin)
        callback(result)
      }
    }, delay)
  }

  /**
   * Real-time PAN validation with debouncing
   */
  private panValidationTimeout: NodeJS.Timeout | null = null

  async validatePANRealTime(
    pan: string,
    callback: (result: PANValidationResult) => void,
    delay: number = 1000
  ): Promise<void> {
    if (this.panValidationTimeout) {
      clearTimeout(this.panValidationTimeout)
    }

    this.panValidationTimeout = setTimeout(async () => {
      if (pan.length === 10) {
        const result = await this.validatePAN(pan)
        callback(result)
      }
    }, delay)
  }

  /**
   * Get filing calendar for the year
   */
  getFilingCalendar(year: number) {
    const calendar = []
    
    // GSTR-1 filing dates (monthly)
    for (let month = 1; month <= 12; month++) {
      calendar.push({
        type: 'GSTR-1',
        period: `${year}-${month.toString().padStart(2, '0')}`,
        due_date: new Date(year, month, 11), // 11th of next month
        description: `GSTR-1 for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year}`
      })
    }

    // TDS return filing dates (quarterly)
    const quarters = [
      { quarter: 'Q1', months: [4, 5, 6], due_month: 7, due_date: 31 },
      { quarter: 'Q2', months: [7, 8, 9], due_month: 10, due_date: 31 },
      { quarter: 'Q3', months: [10, 11, 12], due_month: 1, due_date: 31 },
      { quarter: 'Q4', months: [1, 2, 3], due_month: 5, due_date: 31 }
    ]

    quarters.forEach(q => {
      calendar.push({
        type: 'TDS Return',
        period: `${q.quarter} FY${year}-${(year + 1).toString().slice(-2)}`,
        due_date: new Date(q.due_month <= 3 ? year + 1 : year, q.due_month - 1, q.due_date),
        description: `TDS Return for ${q.quarter} FY${year}-${(year + 1).toString().slice(-2)}`
      })
    })

    return calendar.sort((a, b) => a.due_date.getTime() - b.due_date.getTime())
  }

  /**
   * Check if filing is due soon
   */
  getUpcomingFilings(days: number = 7) {
    const calendar = this.getFilingCalendar(new Date().getFullYear())
    const today = new Date()
    const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000))

    return calendar.filter(filing => 
      filing.due_date >= today && filing.due_date <= futureDate
    )
  }
}

export const governmentApiService = new GovernmentApiService()