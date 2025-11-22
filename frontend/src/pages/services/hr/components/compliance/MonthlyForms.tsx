import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  FileText, Users, CheckCircle, 
  Clock, AlertCircle, Eye, Download,
  RefreshCw, X, Trash2
} from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import toast from 'react-hot-toast'

const MonthlyForms: React.FC = () => {
  const queryClient = useQueryClient()

  const [selectedForm, setSelectedForm] = useState<any>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  // Refresh templates when component mounts or becomes visible
  useEffect(() => {
    const timer = setTimeout(() => {
      refetchTemplates()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Fetch current month forms only
  const { data: monthlyForms, isLoading } = useQuery({
    queryKey: ['monthly-forms-current'],
    queryFn: () => apiClient.get('/api/hr/monthly-forms/?filter=current_month')
  })

  // Fetch all active templates with refetch on focus
  const { data: activeTemplates, refetch: refetchTemplates } = useQuery({
    queryKey: ['active-templates'],
    queryFn: () => apiClient.get('/api/hr/form-templates/').then(response => {
      // Filter only active templates
      const activeOnly = {
        ...response,
        data: {
          ...response.data,
          results: response.data.results?.filter((template: any) => template.is_active) || []
        }
      }
      return activeOnly
    }),
    refetchOnWindowFocus: true,
    refetchInterval: 30000 // Refetch every 30 seconds
  })

  // Fetch dashboard stats
  const { data: dashboardStats } = useQuery({
    queryKey: ['monthly-forms-stats'],
    queryFn: () => apiClient.get('/api/hr/monthly-forms/dashboard_stats/')
  })

  // Generate form for specific template mutation
  const generateFormMutation = useMutation({
    mutationFn: (templateId: string) => {
      const currentMonth = new Date().toISOString().slice(0, 10)
      return apiClient.post('/api/hr/monthly-forms/generate_monthly_forms/', {
        template_id: templateId,
        month: currentMonth
      })
    },
    onSuccess: () => {
      toast.success('Form generated successfully!')
      queryClient.invalidateQueries({ queryKey: ['monthly-forms-current'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-forms-stats'] })
      queryClient.invalidateQueries({ queryKey: ['active-templates'] })
      refetchTemplates()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to generate form')
    }
  })



  // Approve form mutation
  const approveFormMutation = useMutation({
    mutationFn: (formId: string) => apiClient.post(`/api/hr/monthly-forms/${formId}/approve_form/`),
    onSuccess: () => {
      toast.success('Form approved successfully!')
      queryClient.invalidateQueries({ queryKey: ['monthly-forms-current'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to approve form')
    }
  })

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: (formId: string) => apiClient.delete(`/api/hr/monthly-forms/${formId}/`),
    onSuccess: () => {
      toast.success('Form deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['monthly-forms-current'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-forms-stats'] })
      queryClient.invalidateQueries({ queryKey: ['active-templates'] })
      queryClient.invalidateQueries({ queryKey: ['form-templates'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete form')
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
      
      // Ensure we have a valid PDF blob
      if (response.data.size === 0) {
        throw new Error('Empty PDF file received')
      }
      
      const blob = new Blob([response.data], { 
        type: 'application/pdf'
      })
      
      // Create a more descriptive filename
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
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
      }, 100)
      
      toast.success('PDF exported successfully!')
    } catch (error: any) {
      console.error('PDF Export Error:', error)
      toast.error(error.response?.data?.error || 'Failed to export PDF')
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'generated': return <Clock className="h-4 w-4" />
      case 'in_review': return <AlertCircle className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'submitted': return <FileText className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monthly Compliance Forms</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Generate Register of Fines and Register of Workmen for all employees
        </p>
      </div>

      {/* Template Generation Buttons */}
      {activeTemplates?.data?.results && activeTemplates.data.results.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Forms</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click on a template to generate compliance forms for the current month
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchTemplates()}
                disabled={generateFormMutation.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generateFormMutation.isPending ? 'animate-spin' : ''}`} />
                Refresh Templates
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeTemplates.data.results.map((template: any) => {
                const isGenerated = monthlyForms?.data?.results?.some((form: any) => form.template === template.id)
                const today = new Date().getDate()
                const canGenerate = today >= template.generation_day && !isGenerated
                
                return (
                  <Button
                    key={template.id}
                    onClick={() => generateFormMutation.mutate(template.id)}
                    disabled={generateFormMutation.isPending || !canGenerate || isGenerated}
                    className={`h-auto p-4 flex flex-col items-start text-left ${
                      template.form_type === 'register_of_fines' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : template.form_type === 'register_of_workmen'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-green-600 hover:bg-green-700'
                    } ${(!canGenerate || isGenerated) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={
                      isGenerated 
                        ? 'Already generated for this month'
                        : !canGenerate 
                        ? `Available from day ${template.generation_day} of month` 
                        : 'Click to generate form'
                    }
                  >
                    <div className="flex items-center w-full mb-2">
                      {generateFormMutation.isPending ? (
                        <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-5 w-5 mr-2" />
                      )}
                      <span className="font-medium truncate">{template.template_name}</span>
                    </div>
                    <div className="flex items-center justify-between w-full text-xs opacity-90">
                      <span className="capitalize">{template.form_type.replace('_', ' ')}</span>
                      {isGenerated && (
                        <span className="bg-white/20 px-2 py-1 rounded">✓ Generated</span>
                      )}
                      {!canGenerate && !isGenerated && (
                        <span className="bg-white/20 px-2 py-1 rounded">Day {template.generation_day}+</span>
                      )}
                      {canGenerate && !isGenerated && (
                        <span className="bg-white/20 px-2 py-1 rounded">Ready</span>
                      )}
                    </div>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Templates Message */}
      {(!activeTemplates?.data?.results || activeTemplates.data.results.length === 0) && (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Templates Available</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No active form templates found. Please add templates in the Configuration tab first.
            </p>
            <Button
              variant="outline"
              onClick={() => refetchTemplates()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Templates
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {dashboardStats?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Month</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.data.current_month_forms}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Approval</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.data.pending_approval}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.data.approved_forms}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {dashboardStats.data.total_employees}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Current Month Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Current Month: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Generate compliance forms for the current month only
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Forms Generated</p>
              <p className="text-2xl font-bold text-blue-600">
                {monthlyForms?.data?.count || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forms List */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Forms</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading forms...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyForms?.data?.results?.map((form: any) => (
                <div
                  key={form.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${
                        form.form_type === 'register_of_fines' 
                          ? 'bg-red-100 dark:bg-red-900/20' 
                          : 'bg-blue-100 dark:bg-blue-900/20'
                      }`}>
                        {form.form_type === 'register_of_fines' ? (
                          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                        ) : (
                          <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {form.template_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(form.month).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long' 
                          })} • {form.total_employees} employees
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(form.status)}`}>
                        {getStatusIcon(form.status)}
                        <span className="ml-2 capitalize">{form.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-500">
                      Generated: {new Date(form.generated_at).toLocaleDateString()}
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(form)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {form.status === 'generated' && (
                        <Button
                          onClick={() => approveFormMutation.mutate(form.id)}
                          disabled={approveFormMutation.isPending}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleExportPDF(form)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export PDF
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const message = form.status === 'approved' 
                            ? 'Are you sure you want to delete this APPROVED form? This action cannot be undone.' 
                            : 'Are you sure you want to delete this form? This action cannot be undone.'
                          if (confirm(message)) {
                            deleteFormMutation.mutate(form.id)
                          }
                        }}
                        disabled={deleteFormMutation.isPending}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!monthlyForms?.data?.results || monthlyForms.data.results.length === 0) && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No forms generated for current month</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Click the template buttons above to generate compliance forms for this month.
                  </p>
                  <div className="space-y-2 text-sm text-gray-500">
                    <p>• Forms are generated based on configured templates</p>
                    <p>• Generation is available based on scheduled dates</p>
                    <p>• View previous months in Form History tab</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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

export default MonthlyForms