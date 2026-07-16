import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { Button } from '../../../../components/ui/Button'
import {
  FileSpreadsheet, Download, CheckCircle, AlertTriangle,
  XCircle, RefreshCw, FileText, ChevronDown, ChevronUp
} from 'lucide-react'
import api from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import toast from 'react-hot-toast'

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
]

const FINANCIAL_YEARS = ['2024-25', '2025-26', '2026-27', '2027-28']

interface ValidationIssue {
  document_number: string
  document_date: string
  customer: string
  gstin: string
  validation_field: string
  current_value: string
  error_message: string
  suggested_action: string
  is_blocking: boolean
}

interface ValidationResult {
  has_blocking_errors: boolean
  blocking_count: number
  warning_count: number
  blocking: ValidationIssue[]
  warnings: ValidationIssue[]
}

interface ReconciliationSummary {
  b2b_invoice_count: number
  b2b_invoice_value: number
  b2b_taxable_value: number
  b2cs_taxable_value: number
  cdnr_count: number
  cdnr_value: number
  cdnra_count: number
  cdnra_value: number
  hsn_b2b_taxable: number
  hsn_b2c_taxable: number
  total_igst: number
  total_cgst: number
  total_sgst_utgst: number
  total_cess: number
  total_docs_issued: number
  total_docs_cancelled: number
  reconciliation: {
    b2b_vs_hsn_b2b_diff: number
    b2c_vs_hsn_b2c_diff: number
    b2b_hsn_match: boolean
    b2c_hsn_match: boolean
  }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(n)

const Gstr1Export: React.FC = () => {
  const { sessionKey } = useServiceUserStore()

  const today = new Date()
  const [returnMonth, setReturnMonth] = useState(MONTHS[today.getMonth()])
  const [financialYear, setFinancialYear] = useState('2025-26')
  const [includeCancelled, setIncludeCancelled] = useState(false)

  const deriveDates = (month: string, fy: string) => {
    const monthIdx = MONTHS.indexOf(month)
    const startYear = parseInt(fy.split('-')[0])
    // FY Apr–Mar: months Apr(3)–Dec(11) belong to startYear, Jan(0)–Mar(2) to startYear+1
    const year = monthIdx >= 3 ? startYear : startYear + 1
    const lastDay = new Date(year, monthIdx + 1, 0).getDate()
    return {
      fromDate: `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`,
      toDate: `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }

  const { fromDate, toDate } = deriveDates(returnMonth, financialYear)

  const [validating, setValidating] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [exporting, setExporting] = useState(false)

  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [reconciliation, setReconciliation] = useState<ReconciliationSummary | null>(null)
  const [showBlocking, setShowBlocking] = useState(true)
  const [showWarnings, setShowWarnings] = useState(false)

  const getKey = () => sessionKey || sessionStorage.getItem('service_session_key') || ''

  const payload = () => ({
    session_key: getKey(),
    from_date: fromDate,
    to_date: toDate,
    return_month: returnMonth,
    financial_year: financialYear,
    include_cancelled: includeCancelled,
  })

  const handleValidate = async () => {
    if (!getKey()) { toast.error('Session expired. Please login again.'); return }
    setValidating(true)
    setValidation(null)
    try {
      const res = await api.post('/api/finance/gstr1/validate/', payload())
      setValidation(res.data)
      if (res.data.has_blocking_errors) {
        toast.error(`${res.data.blocking_count} blocking error(s) found. Fix before export.`)
      } else if (res.data.warning_count > 0) {
        toast(`${res.data.warning_count} warning(s). Review before export.`, { icon: '⚠️' })
      } else {
        toast.success('Validation passed — no issues found.')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Validation failed.')
    } finally {
      setValidating(false)
    }
  }

  const handleReconcile = async () => {
    if (!getKey()) { toast.error('Session expired.'); return }
    setReconciling(true)
    setReconciliation(null)
    try {
      const res = await api.post('/api/finance/gstr1/reconcile/', payload())
      setReconciliation(res.data)
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Reconciliation failed.')
    } finally {
      setReconciling(false)
    }
  }

  const handleExport = async () => {
    if (!getKey()) { toast.error('Session expired.'); return }
    setExporting(true)
    try {
      const res = await api.post('/api/finance/gstr1/export/', payload(), {
        responseType: 'blob',
        timeout: 300000,
      })
      const filename =
        res.headers['x-gstr1-filename'] ||
        `GSTR1_${returnMonth.slice(0, 3)}${financialYear}.xlsx`
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success(`Downloaded: ${filename}`)
    } catch (e: any) {
      if (e?.response?.data instanceof Blob) {
        const text = await e.response.data.text()
        try {
          const json = JSON.parse(text)
          if (json.validation) {
            setValidation(json.validation)
            toast.error('Export blocked — fix validation errors first.')
          } else {
            toast.error(json.error || 'Export failed.')
          }
        } catch {
          toast.error('Export failed.')
        }
      } else {
        toast.error(e?.response?.data?.error || 'Export failed.')
      }
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadValidationReport = async () => {
    if (!getKey()) { toast.error('Session expired.'); return }
    try {
      const res = await api.post('/api/finance/gstr1/validation-report/', payload(), {
        responseType: 'blob',
        timeout: 300000,
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'GSTR1_Validation_Report.xlsx'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to download validation report.')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileSpreadsheet className="h-7 w-7 text-green-600" />
        <div>
          <h1 className="text-2xl font-bold">GSTR-1 Export</h1>
          <p className="text-sm text-gray-500">Generate GSTR-1 Excel Offline Utility file</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>Export Parameters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Return Month *</label>
              <select
                value={returnMonth}
                onChange={e => setReturnMonth(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
              >
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Financial Year *</label>
              <select
                value={financialYear}
                onChange={e => setFinancialYear(e.target.value)}
                className="w-full border rounded-md p-2 text-sm"
              >
                {FINANCIAL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={includeCancelled}
                  onChange={e => setIncludeCancelled(e.target.checked)}
                  className="rounded" />
                Include Cancelled Documents
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            <Button onClick={handleValidate} disabled={validating} variant="outline">
              {validating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Validate
            </Button>
            <Button onClick={handleReconcile} disabled={reconciling} variant="outline">
              {reconciling ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Reconcile
            </Button>
            <Button onClick={handleExport} disabled={exporting}
              className="bg-green-600 hover:bg-green-700 text-white">
              {exporting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export GSTR-1 Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validation.has_blocking_errors
                ? <XCircle className="h-5 w-5 text-red-500" />
                : validation.warning_count > 0
                ? <AlertTriangle className="h-5 w-5 text-yellow-500" />
                : <CheckCircle className="h-5 w-5 text-green-500" />}
              Validation Results
              {validation && (
                <Button variant="outline" size="sm" className="ml-auto text-xs"
                  onClick={handleDownloadValidationReport}>
                  <Download className="h-3 w-3 mr-1" /> Download Report
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="text-red-600 font-medium">{validation.blocking_count} Blocking Errors</span>
              <span className="text-yellow-600 font-medium">{validation.warning_count} Warnings</span>
            </div>

            {validation.blocking.length > 0 && (
              <div>
                <button onClick={() => setShowBlocking(v => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-red-700 mb-2">
                  {showBlocking ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Blocking Errors ({validation.blocking_count})
                </button>
                {showBlocking && (
                  <IssueTable issues={validation.blocking} color="red" />
                )}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div>
                <button onClick={() => setShowWarnings(v => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-yellow-700 mb-2">
                  {showWarnings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Warnings ({validation.warning_count})
                </button>
                {showWarnings && (
                  <IssueTable issues={validation.warnings} color="yellow" />
                )}
              </div>
            )}

            {!validation.has_blocking_errors && validation.warning_count === 0 && (
              <p className="text-green-600 text-sm font-medium">✓ All validations passed. Ready to export.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reconciliation Summary */}
      {reconciliation && (
        <Card>
          <CardHeader><CardTitle>Reconciliation Summary</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <SummaryTile label="B2B Invoices" value={String(reconciliation.b2b_invoice_count)} />
              <SummaryTile label="B2B Invoice Value" value={fmt(reconciliation.b2b_invoice_value)} />
              <SummaryTile label="B2B Taxable Value" value={fmt(reconciliation.b2b_taxable_value)} />
              <SummaryTile label="B2CS Taxable Value" value={fmt(reconciliation.b2cs_taxable_value)} />
              <SummaryTile label="Credit Notes" value={String(reconciliation.cdnr_count)} />
              <SummaryTile label="CDN Value" value={fmt(reconciliation.cdnr_value)} />
              <SummaryTile label="Total IGST" value={fmt(reconciliation.total_igst)} />
              <SummaryTile label="Total CGST" value={fmt(reconciliation.total_cgst)} />
              <SummaryTile label="Total SGST/UTGST" value={fmt(reconciliation.total_sgst_utgst)} />
              <SummaryTile label="Total Cess" value={fmt(reconciliation.total_cess)} />
              <SummaryTile label="Docs Issued" value={String(reconciliation.total_docs_issued)} />
              <SummaryTile label="Docs Cancelled" value={String(reconciliation.total_docs_cancelled)} />
            </div>

            <div className="border-t pt-3 space-y-2 text-sm">
              <p className="font-medium text-gray-700">Cross-checks</p>
              <ReconcileRow
                label="B2B Taxable vs HSN B2B Taxable"
                diff={reconciliation.reconciliation.b2b_vs_hsn_b2b_diff}
                match={reconciliation.reconciliation.b2b_hsn_match}
              />
              <ReconcileRow
                label="B2C Taxable vs HSN B2C Taxable"
                diff={reconciliation.reconciliation.b2c_vs_hsn_b2c_diff}
                match={reconciliation.reconciliation.b2c_hsn_match}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const IssueTable: React.FC<{ issues: ValidationIssue[]; color: 'red' | 'yellow' }> = ({ issues, color }) => (
  <div className="overflow-x-auto rounded border">
    <table className="w-full text-xs">
      <thead className={`bg-${color}-50`}>
        <tr>
          {['Doc No', 'Date', 'Customer', 'GSTIN', 'Field', 'Value', 'Error', 'Action'].map(h => (
            <th key={h} className="text-left p-2 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {issues.map((issue, i) => (
          <tr key={i} className="border-t hover:bg-gray-50">
            <td className="p-2 font-mono">{issue.document_number}</td>
            <td className="p-2">{issue.document_date}</td>
            <td className="p-2">{issue.customer}</td>
            <td className="p-2 font-mono">{issue.gstin}</td>
            <td className="p-2 font-medium">{issue.validation_field}</td>
            <td className="p-2">{issue.current_value}</td>
            <td className={`p-2 text-${color}-700`}>{issue.error_message}</td>
            <td className="p-2 text-gray-600">{issue.suggested_action}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const SummaryTile: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-gray-50 rounded-lg p-3">
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-semibold mt-1">{value}</p>
  </div>
)

const ReconcileRow: React.FC<{ label: string; diff: number; match: boolean }> = ({ label, diff, match }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-600">{label}</span>
    <span className={`font-medium ${match ? 'text-green-600' : 'text-red-600'}`}>
      {match ? '✓ Match' : `✗ Diff: ${fmt(Math.abs(diff))}`}
    </span>
  </div>
)

export default Gstr1Export
