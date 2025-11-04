import React, { useState, useEffect } from 'react'
import { FileText, Download, Send, Plus, Calendar, Users, DollarSign, CheckCircle, AlertTriangle, Clock, X } from 'lucide-react'
import { Card, CardContent } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface GovernmentReturn {
  id: number
  return_type: string
  return_type_display: string
  period_month: number
  period_year: number
  generated_date: string | null
  filed_date: string | null
  due_date: string
  status: string
  status_display: string
  total_employees: number
  total_wages: number
  total_contribution: number
  acknowledgment_number: string
  return_data?: any
}

const GovernmentReturns: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [returns, setReturns] = useState<GovernmentReturn[]>([])
  const [loading, setLoading] = useState(false)
  const [generateModalVisible, setGenerateModalVisible] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateForm, setGenerateForm] = useState({
    return_type: '',
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear()
  })
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<GovernmentReturn | null>(null)

  useEffect(() => {
    fetchReturns()
  }, [sessionKey])

  const fetchReturns = async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      const response = await api.get('/api/hr/government-returns/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setReturns(response.data.results || [])
    } catch (error) {
      console.error('Error fetching government returns:', error)
      toast.error('Failed to load government returns')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateReturn = async () => {
    if (!sessionKey) return
    
    try {
      setGenerating(true)
      const { return_type, period_month, period_year } = generateForm
      
      let endpoint = ''
      switch (return_type) {
        case 'pf_ecr':
          endpoint = '/api/hr/statutory/pf-ecr/'
          break
        case 'esi_return':
          endpoint = '/api/hr/statutory/esi-return/'
          break
        case 'pt_return':
          endpoint = '/api/hr/statutory/pt-return/'
          break
        case 'tds_24q':
          endpoint = '/api/hr/statutory/tds-24q/'
          break
        default:
          throw new Error('Invalid return type')
      }
      
      const response = await api.post(endpoint, {
        period_month,
        period_year,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success(response.data.message)
      setGenerateModalVisible(false)
      setGenerateForm({
        return_type: '',
        period_month: new Date().getMonth() + 1,
        period_year: new Date().getFullYear()
      })
      fetchReturns()
    } catch (error: any) {
      console.error('Error generating return:', error)
      toast.error('Failed to generate return')
    } finally {
      setGenerating(false)
    }
  }

  const handleViewReturn = async (returnId: number) => {
    if (!sessionKey) return
    
    try {
      const response = await api.get(`/api/hr/government-returns/${returnId}/view_return/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setSelectedReturn(response.data)
      setViewModalVisible(true)
    } catch (error: any) {
      console.error('Error viewing return:', error)
      toast.error('Failed to load return details')
    }
  }

  const handleSubmitReturn = async (returnId: number) => {
    if (!sessionKey) return
    
    try {
      const response = await api.post(`/api/hr/government-returns/${returnId}/submit_return/`, {
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      toast.success(response.data.message)
      fetchReturns()
    } catch (error: any) {
      console.error('Error submitting return:', error)
      toast.error('Failed to submit return')
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      'generated': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'filed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      'overdue': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      'rejected': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'generated': return <FileText className="h-4 w-4" />
      case 'filed': return <CheckCircle className="h-4 w-4" />
      case 'overdue': return <AlertTriangle className="h-4 w-4" />
      case 'rejected': return <X className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const returnTypes = [
    { value: 'pf_ecr', label: 'PF ECR' },
    { value: 'esi_return', label: 'ESI Return' },
    { value: 'pt_return', label: 'Professional Tax Return' },
    { value: 'tds_24q', label: 'TDS 24Q Return' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Government Returns</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Generate and manage statutory returns</p>
        </div>
        <Button onClick={() => setGenerateModalVisible(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate Return
        </Button>
      </div>

      {/* Returns Grid */}
      <div className="grid grid-cols-1 gap-6">
        {returns.length > 0 ? (
          returns.map((returnItem) => (
            <Card key={returnItem.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {returnItem.return_type_display}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Period: {returnItem.period_month.toString().padStart(2, '0')}/{returnItem.period_year}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(returnItem.status)}`}>
                      {getStatusIcon(returnItem.status)}
                      <span className="ml-1">{returnItem.status_display}</span>
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(returnItem.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Employees</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {returnItem.total_employees}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Wages</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ₹{returnItem.total_wages.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Contribution</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        ₹{returnItem.total_contribution.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                {returnItem.generated_date && (
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    Generated on: {new Date(returnItem.generated_date).toLocaleDateString()}
                  </div>
                )}
                
                {returnItem.acknowledgment_number && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    ACK: {returnItem.acknowledgment_number}
                  </div>
                )}
                
                <div className="mt-4 flex space-x-2">
                  {returnItem.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setGenerateForm({
                          return_type: returnItem.return_type,
                          period_month: returnItem.period_month,
                          period_year: returnItem.period_year
                        })
                        setGenerateModalVisible(true)
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Generate
                    </Button>
                  )}
                  {returnItem.status === 'generated' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewReturn(returnItem.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleSubmitReturn(returnItem.id)}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Submit
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Returns Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by generating your first government return.</p>
              <Button onClick={() => setGenerateModalVisible(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Generate Return
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Generate Return Modal */}
      {generateModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Generate Government Return</h3>
              <button
                onClick={() => setGenerateModalVisible(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Return Type *
                </label>
                <select
                  value={generateForm.return_type}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, return_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select return type</option>
                  {returnTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Month *
                  </label>
                  <select
                    value={generateForm.period_month}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, period_month: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    {monthNames.map((month, index) => (
                      <option key={index + 1} value={index + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Year *
                  </label>
                  <select
                    value={generateForm.period_year}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, period_year: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    {Array.from({ length: 5 }, (_, i) => {
                      const year = new Date().getFullYear() - 2 + i
                      return (
                        <option key={year} value={year}>{year}</option>
                      )
                    })}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setGenerateModalVisible(false)}
                disabled={generating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerateReturn}
                disabled={generating || !generateForm.return_type}
              >
                {generating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {generating ? 'Generating...' : 'Generate Return'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Return Modal */}
      {viewModalVisible && selectedReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedReturn.return_type_display} Details
              </h3>
              <button
                onClick={() => setViewModalVisible(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Period</label>
                  <p className="text-gray-900 dark:text-white">{selectedReturn.period_month}/{selectedReturn.period_year}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${getStatusColor(selectedReturn.status)}`}>
                    {selectedReturn.status_display}
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employees</label>
                  <p className="text-gray-900 dark:text-white">{selectedReturn.total_employees}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Wages</label>
                  <p className="text-gray-900 dark:text-white">₹{selectedReturn.total_wages.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contribution</label>
                  <p className="text-gray-900 dark:text-white">₹{selectedReturn.total_contribution.toLocaleString()}</p>
                </div>
              </div>
              
              {selectedReturn.acknowledgment_number && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Acknowledgment Number</label>
                  <p className="text-gray-900 dark:text-white">{selectedReturn.acknowledgment_number}</p>
                </div>
              )}
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Return Data</h4>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto">
                  {JSON.stringify(selectedReturn.return_data, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="outline" onClick={() => setViewModalVisible(false)}>
                Close
              </Button>
              {selectedReturn.status === 'generated' && (
                <Button onClick={() => {
                  handleSubmitReturn(selectedReturn.id)
                  setViewModalVisible(false)
                }}>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Return
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GovernmentReturns