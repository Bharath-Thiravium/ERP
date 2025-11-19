import React from 'react'
import { X, Download, Calendar, User, Building, DollarSign } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'

interface PayslipDetailViewProps {
  payslip: any
  onClose: () => void
  onDownloadPDF: (payslip: any) => void
}

const PayslipDetailView: React.FC<PayslipDetailViewProps> = ({ payslip, onClose, onDownloadPDF }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'approved': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'calculated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payslip Details</h2>
            <p className="text-gray-600 dark:text-gray-400">{payslip.emp_name} - {payslip.emp_id}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => onDownloadPDF(payslip)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Employee & Status Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4 text-blue-500" />
                  <span>Employee Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{payslip.emp_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Employee ID</p>
                  <p className="font-medium text-gray-900 dark:text-white">{payslip.emp_id}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Building className="h-4 w-4 text-green-500" />
                  <span>Department</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Department</p>
                  <p className="font-medium text-gray-900 dark:text-white">{payslip.emp_department}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Designation</p>
                  <p className="font-medium text-gray-900 dark:text-white">{payslip.emp_designation}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  <span>Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Payment Status</p>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(payslip.status)}`}>
                    {payslip.status.charAt(0).toUpperCase() + payslip.status.slice(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{payslip.working_days}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Working Days</p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{payslip.present_days}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Present Days</p>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{payslip.absent_days}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Absent Days</p>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{payslip.overtime_hours || 0}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Overtime Hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Salary Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Earnings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <DollarSign className="h-5 w-5" />
                  <span>Earnings</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Basic Salary</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.basic_salary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">HRA</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.hra || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Conveyance Allowance</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.conveyance_allowance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Medical Allowance</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.medical_allowance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Special Allowance</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.special_allowance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Overtime Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.overtime_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Bonus</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.bonus || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Other Earnings</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.other_earnings || 0)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-green-600 dark:text-green-400">Gross Salary</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(payslip.gross_salary)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deductions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                  <DollarSign className="h-5 w-5" />
                  <span>Deductions</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Provident Fund (PF)</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.pf_employee || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">ESI</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.esi_employee || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Professional Tax</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.professional_tax || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">TDS</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.tds || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Loan Deduction</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.loan_deduction || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Advance Deduction</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.advance_deduction || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Other Deductions</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(payslip.other_deductions || 0)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span className="text-red-600 dark:text-red-400">Total Deductions</span>
                    <span className="text-red-600 dark:text-red-400">{formatCurrency(payslip.total_deductions)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Net Salary */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Net Salary</p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(payslip.net_salary)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  Gross: {formatCurrency(payslip.gross_salary)} - Deductions: {formatCurrency(payslip.total_deductions)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PayslipDetailView