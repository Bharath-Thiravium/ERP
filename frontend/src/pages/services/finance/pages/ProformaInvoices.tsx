import React, { useState, useEffect } from 'react'
import { FileText, IndianRupee, AlertCircle, List, Send } from 'lucide-react'
import ProformaInvoiceList from '../components/ProformaInvoiceList'
import FinanceCard from '../components/FinanceCard'
import MetricCard from '../components/MetricCard'
import FinancialYearFilter from '../components/FinancialYearFilter'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

interface ProformaInvoicesProps {
  sessionKey: string
}

interface ProformaStats {
  totalProformas: number
  totalAmount: number
  paidAmount: number
  outstandingAmount: number
  overdueProformas: number
  thisMonthProformas: number
  paidProformas: number
  rejectedProformas: number
}

const ProformaInvoices: React.FC<ProformaInvoicesProps> = ({ sessionKey }) => {
  const [stats, setStats] = useState<ProformaStats>({
    totalProformas: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    overdueProformas: 0,
    thisMonthProformas: 0,
    paidProformas: 0,
    rejectedProformas: 0,
  })
  const [loading, setLoading] = useState(true)
  const [selectedFY, setSelectedFY] = useState<string>('')
  const [proformaFilter, setProformaFilter] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchStats = async () => {
    if (!sessionKey) return
    try {
      setLoading(true)
      const params: Record<string, string> = {
        financial_year: selectedFY || 'all',
      }
      const response = await api.get('/api/finance/proforma-invoices/stats/', { params })
      const d = response.data
      setStats({
        totalProformas: d.total_proformas,
        totalAmount: d.total_amount,
        paidAmount: d.paid_amount,
        outstandingAmount: d.outstanding_amount,
        overdueProformas: d.overdue_proformas,
        thisMonthProformas: d.this_month_proformas,
        paidProformas: d.paid_proformas,
        rejectedProformas: d.rejected_proformas,
      })
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast.error('Failed to fetch proforma statistics')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [sessionKey, selectedFY])

  return (
    <div className="space-y-6 min-w-0 max-w-full">

      {/* Page Header */}
      <FinanceCard>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Proforma Invoices
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your proforma invoices and track payments
            </p>
          </div>
          <FinancialYearFilter
            selectedYear={selectedFY}
            onYearChange={setSelectedFY}
          />
        </div>
      </FinanceCard>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Proformas"
          value={loading ? '...' : stats.totalProformas}
          subtitle={`${loading ? '...' : stats.thisMonthProformas} this month`}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="Total Amount"
          value={loading ? '...' : `₹${stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Total proforma value"
          icon={IndianRupee}
          color="green"
        />
        <MetricCard
          title="Outstanding"
          value={loading ? '...' : `₹${stats.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${loading ? '...' : stats.overdueProformas} overdue`}
          icon={AlertCircle}
          color="orange"
        />
        <MetricCard
          title="Paid"
          value={loading ? '...' : stats.paidProformas}
          subtitle={`${loading ? '...' : stats.rejectedProformas} rejected`}
          icon={Send}
          color="purple"
        />
      </div>

      {/* Quick Filters */}
      <FinanceCard>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => { setProformaFilter(''); setRefreshKey(k => k + 1) }}
            className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${
              proformaFilter === ''
                ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-white'
                : 'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/40'
            }`}
          >
            <List className="w-5 h-5 mr-3 shrink-0" />
            <div className="text-left">
              <div className="font-medium">All Proformas</div>
              <div className="text-sm opacity-75">{stats.totalProformas} total</div>
            </div>
          </button>

          <button
            onClick={() => { setProformaFilter('overdue'); setRefreshKey(k => k + 1) }}
            className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${
              proformaFilter === 'overdue'
                ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40'
            }`}
          >
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <div className="text-left">
              <div className="font-medium">View Overdue</div>
              <div className="text-sm opacity-75">{stats.overdueProformas} proformas</div>
            </div>
          </button>

          <button
            onClick={() => { setProformaFilter('unpaid_or_partial'); setRefreshKey(k => k + 1) }}
            className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${
              proformaFilter === 'unpaid_or_partial'
                ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40'
            }`}
          >
            <IndianRupee className="w-5 h-5 mr-3 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Unpaid Proformas</div>
              <div className="text-sm opacity-75">Unpaid &amp; partial payments</div>
            </div>
          </button>
        </div>
      </FinanceCard>

      {/* Proforma List */}
      <ProformaInvoiceList
        key={`${refreshKey}-${proformaFilter}-${selectedFY}`}
        sessionKey={sessionKey}
        selectedFY={selectedFY}
        initialPaymentStatus={proformaFilter}
        onMetricsUpdate={() => {}}
      />
    </div>
  )
}

export default ProformaInvoices
