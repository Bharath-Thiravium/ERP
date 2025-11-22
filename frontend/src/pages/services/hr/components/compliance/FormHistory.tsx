import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  History, Calendar, Eye, Download,
  Filter, ChevronLeft, ChevronRight, X
} from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import toast from 'react-hot-toast'

const FormHistory: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedForm, setSelectedForm] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Fetch historical forms
  const { data: historyForms, isLoading } = useQuery({
    queryKey: ['monthly-forms-history', selectedYear, selectedMonth, selectedStatus],
    queryFn: () => {
      const params = new URLSearchParams({
        filter: 'history'
      })
      
      if (selectedMonth) {
        params.append('month', selectedMonth)
      }
      if (selectedStatus !== 'all') {
        params.append('status', selectedStatus)
      }
      
      return apiClient.get(`/api/hr/monthly-forms/?${params.toString()}`)
    }
  })

  // Fetch form details
  const { data: formDetails } = useQuery({
    queryKey: ['form-details', selectedForm?.id],
    queryFn: () => apiClient.get(`/api/hr/employee-form-entries/?form_id=${selectedForm.id}`),
    enabled: !!selectedForm?.id
  })

  const handleViewDetails = (form: any) => {
    setSelectedForm(form)
    setShowDetailsModal(true)
  }

  const handleExportPDF = async (form: any) => {
    try {
      const response = await apiClient.get(`/api/hr/monthly-forms/${form.id}/export_pdf/`, {
        responseType: 'blob'
      })
      
      if (response.data.size === 0) {
        throw new Error('Empty PDF file received')
      }
      
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const monthYear = new Date(form.month).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      }).replace(' ', '_')
      const filename = `${form.template_name.replace(/\s+/g, '_')}_${monthYear}.pdf`
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      toast.success('PDF exported successfully!')
    } catch (error: any) {
      console.error('PDF Export Error:', error)
      toast.error('Failed to export PDF')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'generated': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'in_review': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'submitted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getFormTypeIcon = (formType: string) => {
    switch (formType) {
      case 'register_of_fines': return '💰'
      case 'register_of_workmen': return '👥'
      case 'custom_template': return '📄'
      default: return '📋'
    }
  }

  // Group forms by month and year
  const groupedForms = historyForms?.data?.results?.reduce((acc: any, form: any) => {
    const date = new Date(form.month)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    
    if (!acc[key]) {
      acc[key] = {
        monthYear,
        forms: []
      }
    }
    acc[key].forms.push(form)
    return acc
  }, {}) || {}

  const months = [
    { value: '', label: 'All Months' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Form History</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            View and manage all previously generated compliance forms
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Year
              </label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedYear(prev => prev - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-4 py-2 text-center font-medium min-w-[80px]">
                  {selectedYear}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedYear(prev => prev + 1)}
                  disabled={selectedYear >= new Date().getFullYear()}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                {months.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="generated">Generated</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="submitted">Submitted</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <Button className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History List */}
      <div className="space-y-6">
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Loading history...</p>
              </div>
            </CardContent>
          </Card>
        ) : Object.keys(groupedForms).length > 0 ? (
          Object.entries(groupedForms)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([key, group]: [string, any]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <span>{group.monthYear}</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({group.forms.length} forms)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {group.forms.map((form: any) => (
                      <div
                        key={form.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="text-2xl">
                              {getFormTypeIcon(form.form_type)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">
                                {form.template_name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {form.total_employees} employees • Generated: {new Date(form.generated_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(form.status)}`}>
                              {form.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDetails(form)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExportPDF(form)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Export
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
        ) : (
          <Card>
            <CardContent className="p-6">
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No history found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No compliance forms found for the selected filters.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Form Details Modal */}
      {showDetailsModal && selectedForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedForm.template_name} - Details
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailsModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Form Type</p>
                  <p className="font-medium">{selectedForm.form_type.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Month</p>
                  <p className="font-medium">{new Date(selectedForm.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                  <p className="font-medium capitalize">{selectedForm.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                  <p className="font-medium">{selectedForm.total_employees}</p>
                </div>
              </div>
              
              {formDetails?.data?.results && (
                <div>
                  <h4 className="text-lg font-medium mb-4">Employee Entries</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Employee
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Employee ID
                          </th>
                          {selectedForm.form_type === 'register_of_fines' ? (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Fine Amount
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Reason
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Date
                              </th>
                            </>
                          ) : (
                            <>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Department
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Designation
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Basic Wage
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                Joining Date
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {formDetails.data.results.map((entry: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {entry.employee_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {entry.employee_id}
                            </td>
                            {selectedForm.form_type === 'register_of_fines' ? (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  ₹{entry.fine_amount || '0.00'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {entry.fine_reason || 'No fine'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {entry.fine_date ? new Date(entry.fine_date).toLocaleDateString() : '-'}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {entry.department}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {entry.designation}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  ₹{entry.basic_wage || '0.00'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                  {entry.joining_date ? new Date(entry.joining_date).toLocaleDateString() : '-'}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FormHistory