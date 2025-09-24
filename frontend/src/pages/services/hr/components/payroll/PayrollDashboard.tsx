import React, { useState, useEffect } from 'react'
import { DollarSign, Users, Calendar, TrendingUp, FileText, Plus, Clock } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface PayrollDashboardData {
  current_cycle: any
  total_employees: number
  pending_payslips: number
  approved_payslips: number
  total_gross_amount: number
  total_net_amount: number
  statutory_deductions: {
    total_pf: number
    total_esi: number
    total_pt: number
    total_tds: number
  }
  recent_cycles: any[]
}

interface PayrollDashboardProps {
  onCreateCycle: () => void
  onViewCycle: (cycle: any) => void
  onViewPayslips: (cycleId: number) => void
}

const PayrollDashboard: React.FC<PayrollDashboardProps> = ({ onCreateCycle, onViewCycle, onViewPayslips }) => {
  const { sessionKey } = useServiceUserStore()
  const [dashboardData, setDashboardData] = useState<PayrollDashboardData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [sessionKey])

  const fetchDashboardData = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/payroll/dashboard/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load payroll dashboard')
    } finally {
      setLoading(false)
    }
  }

  const calculatePayroll = async (cycleId: number) => {
    if (!sessionKey) return
    
    try {
      await api.post(`/api/hr/payroll/${cycleId}/calculate_payroll/`, {
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success('Payroll calculated successfully!')
      fetchDashboardData() // Refresh data
    } catch (error: any) {
      console.error('Error calculating payroll:', error)
      toast.error(error.response?.data?.error || 'Failed to calculate payroll')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'calculated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Payroll Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              AI-powered payroll processing with statutory compliance
            </p>
          </div>
          <Button 
            onClick={onCreateCycle}
            className="bg-gradient-to-r from-green-500 to-emerald-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payroll Cycle
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Employees</p>
                <p className="text-3xl font-bold">{dashboardData.total_employees}</p>
                <p className="text-xs opacity-75">Active workforce</p>
              </div>
              <Users className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Gross Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.total_gross_amount)}</p>
                <p className="text-xs opacity-75">Current cycle</p>
              </div>
              <DollarSign className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Net Amount</p>
                <p className="text-2xl font-bold">{formatCurrency(dashboardData.total_net_amount)}</p>
                <p className="text-xs opacity-75">After deductions</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Pending Payslips</p>
                <p className="text-3xl font-bold">{dashboardData.pending_payslips}</p>
                <p className="text-xs opacity-75">Need processing</p>
              </div>
              <Clock className="h-8 w-8 opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Current Cycle & Statutory Deductions */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Cycle */}
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span>Current Payroll Cycle</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.current_cycle ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {dashboardData.current_cycle.name}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dashboardData.current_cycle.status)}`}>
                      {dashboardData.current_cycle.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Period</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(dashboardData.current_cycle.start_date).toLocaleDateString()} - {new Date(dashboardData.current_cycle.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Pay Date</p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {new Date(dashboardData.current_cycle.pay_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {dashboardData.current_cycle.status === 'draft' && (
                      <Button 
                        onClick={() => calculatePayroll(dashboardData.current_cycle.id)}
                        className="bg-gradient-to-r from-green-500 to-emerald-600"
                        size="sm"
                      >
                        Calculate Payroll
                      </Button>
                    )}
                    <Button 
                      onClick={() => onViewCycle(dashboardData.current_cycle)}
                      variant="outline" 
                      size="sm"
                    >
                      View Details
                    </Button>
                    <Button 
                      onClick={() => onViewPayslips(dashboardData.current_cycle.id)}
                      size="sm"
                    >
                      View Payslips
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Cycle</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Create a new payroll cycle to get started</p>
                  <Button onClick={onCreateCycle}>
                    Create Payroll Cycle
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statutory Deductions */}
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-green-500" />
                <span>Statutory Deductions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Provident Fund (PF)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(dashboardData.statutory_deductions.total_pf)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Employee State Insurance (ESI)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(dashboardData.statutory_deductions.total_esi)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Professional Tax (PT)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(dashboardData.statutory_deductions.total_pt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tax Deducted at Source (TDS)</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(dashboardData.statutory_deductions.total_tds)}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-900 dark:text-white">Total Deductions</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(
                        dashboardData.statutory_deductions.total_pf +
                        dashboardData.statutory_deductions.total_esi +
                        dashboardData.statutory_deductions.total_pt +
                        dashboardData.statutory_deductions.total_tds
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Cycles */}
      {dashboardData && dashboardData.recent_cycles.length > 0 && (
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle>Recent Payroll Cycles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.recent_cycles.map((cycle) => (
                <div key={cycle.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{cycle.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(cycle.start_date).toLocaleDateString()} - {new Date(cycle.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(cycle.total_net)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{cycle.total_employees} employees</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(cycle.status)}`}>
                      {cycle.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default PayrollDashboard