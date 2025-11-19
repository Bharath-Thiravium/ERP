import React, { useState, useEffect } from 'react'
import { FileText, Download, Eye, CheckCircle, Clock, AlertCircle, Filter, Search } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'
import PayslipDetailView from './PayslipDetailView'

interface Payslip {
  id: number
  emp_name: string
  emp_id: string
  emp_department: string
  emp_designation: string
  basic_salary: number
  gross_salary: number
  total_deductions: number
  net_salary: number
  status: string
  working_days: number
  present_days: number
  overtime_hours: number
}

interface PayslipListProps {
  cycleId?: number
  onViewPayslip: (payslip: Payslip) => void
}

const PayslipList: React.FC<PayslipListProps> = ({ cycleId }) => {
  const { sessionKey } = useServiceUserStore()
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    department: ''
  })

  useEffect(() => {
    fetchPayslips()
  }, [sessionKey, cycleId, filters])

  const fetchPayslips = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const params: any = { session_key: sessionKey }
      if (cycleId) params.cycle_id = cycleId
      if (filters.status) params.status = filters.status
      if (filters.search) params.search = filters.search

      const response = await api.get('/api/hr/payslips/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params
      })
      
      setPayslips(response.data.results || response.data || [])
    } catch (error) {
      console.error('Error fetching payslips:', error)
      toast.error('Failed to load payslips')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'calculated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'hold': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'calculated': return <Clock className="h-4 w-4" />
      case 'hold': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
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

  const exportPayslips = async () => {
    try {
      const params: any = { session_key: sessionKey, export: 'csv' }
      if (cycleId) params.cycle_id = cycleId

      const response = await api.get('/api/hr/payslips/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params,
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `payslips-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Payslips exported successfully')
    } catch (error) {
      toast.error('Failed to export payslips')
    }
  }

  const handleViewPayslip = (payslip: Payslip) => {
    setSelectedPayslip(payslip)
  }

  const handleCloseDetailView = () => {
    setSelectedPayslip(null)
  }

  const handleDownloadPDF = async (payslip: Payslip) => {
    try {
      const response = await api.get(`/api/hr/payslips/${payslip.id}/download_pdf/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey },
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `payslip_${payslip.emp_id}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Payslip PDF downloaded successfully')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download payslip PDF')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Payslips ({payslips.length})
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage employee payslips and salary details
            </p>
          </div>
          <Button 
            onClick={exportPayslips}
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-blue-500" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Employee
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Search by name or ID..."
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="calculated">Calculated</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="hold">On Hold</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <select
                value={filters.department}
                onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="HR">HR</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payslips Table */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : payslips.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Payslips Found</h3>
              <p className="text-gray-500 dark:text-gray-400">No payslips match your current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Employee</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Department</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Attendance</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Basic Salary</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Gross Salary</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Deductions</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Net Salary</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="text-left py-3 px-6 font-medium text-gray-900 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((payslip) => (
                    <tr key={payslip.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{payslip.emp_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{payslip.emp_id}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-gray-900 dark:text-white">{payslip.emp_department}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{payslip.emp_designation}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div>
                          <p className="text-gray-900 dark:text-white">{payslip.present_days}/{payslip.working_days} days</p>
                          {payslip.overtime_hours > 0 && (
                            <p className="text-sm text-blue-600 dark:text-blue-400">{payslip.overtime_hours}h OT</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatCurrency(payslip.basic_salary)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {formatCurrency(payslip.gross_salary)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-red-600 dark:text-red-400 font-medium">
                          -{formatCurrency(payslip.total_deductions)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-green-600 dark:text-green-400 font-bold">
                          {formatCurrency(payslip.net_salary)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 text-xs rounded-full ${getStatusColor(payslip.status)}`}>
                          {getStatusIcon(payslip.status)}
                          <span className="capitalize">{payslip.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => handleViewPayslip(payslip)}
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            onClick={() => handleDownloadPDF(payslip)}
                            size="sm"
                            variant="outline"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslip Detail Modal */}
      {selectedPayslip && (
        <PayslipDetailView
          payslip={selectedPayslip}
          onClose={handleCloseDetailView}
          onDownloadPDF={handleDownloadPDF}
        />
      )}
    </div>
  )
}

export default PayslipList