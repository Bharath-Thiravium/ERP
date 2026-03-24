import React, { useState, useEffect } from 'react'
import { Button } from '../../../../components/ui/Button'
import { 
  FileText, 
  Calculator, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
  Shield,
  Brain
} from 'lucide-react'
import FinanceCard from '../components/FinanceCard'
import MetricCard from '../components/MetricCard'
import GSTCalculator from '../components/GSTCalculator'
import TDSCalculator from '../components/TDSCalculator'
import Phase2Summary from '../components/Phase2Summary'
import { SimpleGovernmentIntegration } from '../components/SimpleGovernmentIntegration'
import { AdvancedAnalyticsDashboard } from '../components/AdvancedAnalyticsDashboard'
import { ReportsManager } from '../components/ReportsManager'
import { AIFeaturesManager } from '../components/AIFeaturesManager'
import { GSTPaymentTracker } from '../components/GSTPaymentTracker'

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
    pending_certificates: number
  }
  overall_status: string
}

interface ComplianceDashboardProps {
  sessionKey: string
}

const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ sessionKey }) => {
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchComplianceData()
  }, [])

  const fetchComplianceData = async () => {
    if (!sessionKey) return

    setLoading(true)
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

  const refreshData = async () => {
    setRefreshing(true)
    await fetchComplianceData()
    setRefreshing(false)
  }

  const generateGSTR1 = async () => {
    if (!sessionKey) return

    try {
      const currentDate = new Date()
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const response = await fetch(
        `/api/finance/gstr1/generate/?session_key=${sessionKey}&start_date=${startDate.toISOString().split('T')[0]}&end_date=${endDate.toISOString().split('T')[0]}`
      )
      const data = await response.json()
      
      if (response.ok) {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `GSTR1_${data.period.start_date}_to_${data.period.end_date}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        console.error('Error generating GSTR-1:', data.error)
      }
    } catch (error) {
      console.error('Error generating GSTR-1:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Compliant</span>
      case 'pending':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />Pending</span>
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading compliance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <FinanceCard>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Indian Compliance Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              GST & TDS compliance status for {complianceData?.period || 'current period'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={refreshData} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={generateGSTR1}>
              <Download className="h-4 w-4 mr-2" />
              Generate GSTR-1
            </Button>
          </div>
        </div>
      </FinanceCard>

      {/* Overall Status */}
      {complianceData && (
        <FinanceCard>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Compliance Status</h3>
              <p className="text-gray-600 dark:text-gray-400">Current period: {complianceData.period}</p>
            </div>
            {getStatusBadge(complianceData.overall_status)}
          </div>
        </FinanceCard>
      )}

      {/* Compliance Summary Cards */}
      {complianceData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Invoices"
            value={complianceData.gst_compliance.total_invoices.toString()}
            subtitle=""
            icon={FileText}
            color="blue"
          />
          <MetricCard
            title="Tax Collected"
            value={formatCurrency(complianceData.gst_compliance.total_tax_collected)}
            subtitle=""
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            title="TDS Payments"
            value={complianceData.tds_compliance.total_tds_payments.toString()}
            subtitle=""
            icon={Calculator}
            color="purple"
          />
          <MetricCard
            title="TDS Deducted"
            value={formatCurrency(complianceData.tds_compliance.total_tds_deducted)}
            subtitle=""
            icon={Calendar}
            color="orange"
          />
        </div>
      )}

      {/* Detailed Compliance Status */}
      {complianceData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GST Compliance */}
          <FinanceCard>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">GST Compliance</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">GSTR-1 Filing</span>
                  {complianceData.gst_compliance.gstr1_filed ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Filed</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Pending</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">GSTR-3B Filing</span>
                  {complianceData.gst_compliance.gstr3b_filed ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Filed</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Pending</span>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Taxable Amount:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(complianceData.gst_compliance.total_taxable_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Tax Collected:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(complianceData.gst_compliance.total_tax_collected)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FinanceCard>

          {/* TDS Compliance */}
          <FinanceCard>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="h-5 w-5" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">TDS Compliance</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Certificates Issued</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {complianceData.tds_compliance.certificates_issued}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Pending Certificates</span>
                  {complianceData.tds_compliance.pending_certificates > 0 ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      {complianceData.tds_compliance.pending_certificates}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">0</span>
                  )}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">TDS Payments:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{complianceData.tds_compliance.total_tds_payments}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total TDS:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(complianceData.tds_compliance.total_tds_deducted)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </FinanceCard>
        </div>
      )}

      {/* Calculators */}
      <CalculatorTabs sessionKey={sessionKey} />
    </div>
  )
}

// Calculator Tabs Component
interface CalculatorTabsProps {
  sessionKey: string
}

const CalculatorTabs: React.FC<CalculatorTabsProps> = ({ sessionKey }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'gst' | 'tds' | 'gst-tracker' | 'government' | 'analytics' | 'reports' | 'ai-features'>('overview')

  return (
    <FinanceCard>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'text-green-600 border-b-2 border-green-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          Overview
        </button>
        <button 
          onClick={() => setActiveTab('gst')}
          className={`px-4 py-2 text-sm font-medium ml-4 transition-colors ${
            activeTab === 'gst' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          GST Calculator
        </button>
        <button 
          onClick={() => setActiveTab('gst-tracker')}
          className={`px-4 py-2 text-sm font-medium ml-4 transition-colors ${
            activeTab === 'gst-tracker' 
              ? 'text-green-600 border-b-2 border-green-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          GST Payment Tracker
        </button>
        <button 
          onClick={() => setActiveTab('tds')}
          className={`px-4 py-2 text-sm font-medium ml-4 transition-colors ${
            activeTab === 'tds' 
              ? 'text-purple-600 border-b-2 border-purple-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          TDS Calculator
        </button>
        <button 
          onClick={() => setActiveTab('government')}
          className={`px-4 py-2 text-sm font-medium ml-4 transition-colors ${
            activeTab === 'government' 
              ? 'text-green-600 border-b-2 border-green-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Shield className="h-4 w-4 mr-1 inline" />
          Government API
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 text-sm font-medium ml-4 transition-colors ${
            activeTab === 'analytics' 
              ? 'text-orange-600 border-b-2 border-orange-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <TrendingUp className="h-4 w-4 mr-1 inline" />
          Analytics
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 text-sm font-medium ml-4 transition-colors ${
            activeTab === 'reports' 
              ? 'text-red-600 border-b-2 border-red-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <FileText className="h-4 w-4 mr-1 inline" />
          Reports
        </button>
        <button 
          onClick={() => setActiveTab('ai-features')}
          className={`px-4 py-2 text-sm font-medium ml-4 transition-colors ${
            activeTab === 'ai-features' 
              ? 'text-purple-600 border-b-2 border-purple-600' 
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          }`}
        >
          <Brain className="h-4 w-4 mr-1 inline" />
          AI Features
        </button>

      </div>
      
      {activeTab === 'overview' && <Phase2Summary sessionKey={sessionKey} />}
      {activeTab === 'gst' && <GSTCalculator sessionKey={sessionKey} />}
      {activeTab === 'gst-tracker' && <GSTPaymentTracker />}
      {activeTab === 'tds' && <TDSCalculator sessionKey={sessionKey} />}
      {activeTab === 'government' && <SimpleGovernmentIntegration />}
      {activeTab === 'analytics' && <AdvancedAnalyticsDashboard sessionKey={sessionKey} />}
      {activeTab === 'reports' && <ReportsManager sessionKey={sessionKey} />}
      {activeTab === 'ai-features' && <AIFeaturesManager sessionKey={sessionKey} />}
    </FinanceCard>
  )
}

export default ComplianceDashboard