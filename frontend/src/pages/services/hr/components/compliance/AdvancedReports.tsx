import React, { useState } from 'react'
import { AlertTriangle, BarChart3, Download, FileText, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface ReportTemplate {
  title: string
  description: string
  type: 'statutory_summary' | 'audit_trail' | 'scorecard' | 'returns_summary'
  icon: React.ReactNode
}

const AdvancedReports: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [downloading, setDownloading] = useState<string | null>(null)

  const reportTemplates: ReportTemplate[] = [
    {
      title: 'Statutory Payroll Summary',
      description: 'Approved payroll deductions and statutory totals for the selected period.',
      type: 'statutory_summary',
      icon: <FileText className="h-5 w-5" />
    },
    {
      title: 'Compliance Audit Trail',
      description: 'Recorded compliance actions available for audit review.',
      type: 'audit_trail',
      icon: <BarChart3 className="h-5 w-5" />
    },
    {
      title: 'Configuration Readiness',
      description: 'Configured schemes, employee readiness and unresolved evidence gaps.',
      type: 'scorecard',
      icon: <ShieldCheck className="h-5 w-5" />
    },
    {
      title: 'Government Returns Register',
      description: 'Generated and filed return records with their current status.',
      type: 'returns_summary',
      icon: <AlertTriangle className="h-5 w-5" />
    }
  ]

  const downloadReport = async (reportType: ReportTemplate['type']) => {
    if (!sessionKey) return
    setDownloading(reportType)
    const dateStamp = now.toISOString().split('T')[0]
    const reportConfig = {
      statutory_summary: {
        endpoint: '/api/hr/advanced-reports/statutory_summary/',
        filename: `statutory_payroll_${selectedYear}_${String(selectedMonth).padStart(2, '0')}.pdf`,
        params: { month: selectedMonth, year: selectedYear, session_key: sessionKey }
      },
      audit_trail: {
        endpoint: '/api/hr/advanced-reports/audit_trail/',
        filename: `compliance_audit_trail_${dateStamp}.pdf`,
        params: { session_key: sessionKey }
      },
      scorecard: {
        endpoint: '/api/hr/advanced-reports/scorecard/',
        filename: `configuration_readiness_${dateStamp}.pdf`,
        params: { session_key: sessionKey }
      },
      returns_summary: {
        endpoint: '/api/hr/advanced-reports/returns_summary/',
        filename: `government_returns_${dateStamp}.pdf`,
        params: { session_key: sessionKey }
      }
    }[reportType]

    try {
      const response = await api.get(reportConfig.endpoint, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: reportConfig.params
      })
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = reportConfig.filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Report downloaded')
    } catch (requestError: any) {
      const message = requestError?.response?.data?.error || 'Report generation failed'
      toast.error(message)
    } finally {
      setDownloading(null)
    }
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const years = Array.from({ length: 7 }, (_, index) => now.getFullYear() - index)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Compliance Reports</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Download reports generated from saved configuration, approved payslips, alerts and return records.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Payroll Period</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Month
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Year
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
                className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {reportTemplates.map((template) => (
          <Card key={template.type}>
            <CardContent className="flex h-full flex-col p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300">{template.icon}</div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{template.title}</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{template.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                className="mt-5 self-start"
                disabled={downloading !== null}
                onClick={() => downloadReport(template.type)}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloading === template.type ? 'Generating...' : 'Download PDF'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
        Generated reports are internal working papers. File returns on the relevant government portal and record the official acknowledgment in Statutory &gt; Government Returns.
      </div>
    </div>
  )
}

export default AdvancedReports
