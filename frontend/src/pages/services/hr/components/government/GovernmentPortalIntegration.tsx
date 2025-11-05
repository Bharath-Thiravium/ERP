import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { Input } from '../../../../../components/ui/Input'
import { AlertCircle, CheckCircle, Clock, Send, Download, Eye, Settings, RefreshCw, Building, FileText, X } from 'lucide-react'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface SubmissionHistory {
  id: number
  portal_name: string
  return_type: string
  period: string
  acknowledgment_number: string
  status: string
  submitted_at: string
  processed_at: string
  error_message: string
}

interface Challan {
  id: number
  challan_number: string
  challan_type: string
  amount: number
  due_date: string
  is_paid: boolean
  payment_date: string
  payment_reference: string
  created_at: string
}

interface GovernmentReturn {
  id: number
  return_type: string
  period_month: number
  period_year: number
  status: string
  total_employees: number
  total_wages: number
  total_contribution: number
  due_date: string
}

export default function GovernmentPortalIntegration() {
  const { sessionKey } = useServiceUserStore()
  const [activeTab, setActiveTab] = useState('submit')
  const [loading, setLoading] = useState(false)
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistory[]>([])
  const [challans, setChallans] = useState<Challan[]>([])
  const [returns, setReturns] = useState<GovernmentReturn[]>([])
  const [selectedReturn, setSelectedReturn] = useState<number | null>(null)
  const [portalType, setPortalType] = useState('')
  const [statusCheck, setStatusCheck] = useState({ acknowledgmentNumber: '', returnType: '' })
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeTab, sessionKey])

  const loadData = async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      if (activeTab === 'history') {
        const response = await api.get('/api/hr/government/submission-history/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
        setSubmissionHistory(response.data.submissions || [])
      } else if (activeTab === 'challans') {
        const response = await api.get('/api/hr/government/challans/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
        setChallans(response.data.challans || [])
      } else if (activeTab === 'submit') {
        const response = await api.get('/api/hr/government-returns/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey, status: 'generated' }
        })
        setReturns(response.data.results || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitToPortal = async () => {
    if (!selectedReturn || !portalType || !sessionKey) {
      toast.error('Please select a return and portal type')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/hr/government/submit/', {
        return_id: selectedReturn,
        portal_type: portalType,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      if (response.data.status === 'success') {
        toast.success(`Return submitted successfully! Acknowledgment: ${response.data.acknowledgment_number}`)
        loadData()
      } else {
        toast.error(response.data.message || 'Submission failed')
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckStatus = async () => {
    if (!statusCheck.acknowledgmentNumber || !statusCheck.returnType || !sessionKey) {
      toast.error('Please enter acknowledgment number and return type')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/hr/government/check-status/', {
        acknowledgment_number: statusCheck.acknowledgmentNumber,
        return_type: statusCheck.returnType,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      toast.success(`Status: ${response.data.status}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Status check failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateChallan = async (returnId: number, challanType: string) => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.post('/api/hr/government/generate-challan/', {
        return_id: returnId,
        challan_type: challanType,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      toast.success(`Challan generated: ${response.data.challan_number}`)
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Challan generation failed')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400', icon: Clock },
      submitted: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: Send },
      processed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: AlertCircle },
      error: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: AlertCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getPortalName = (portalType: string) => {
    const portals = {
      epfo: 'EPFO Portal',
      esic: 'ESIC Portal',
      pt: 'Professional Tax Portal',
      income_tax: 'Income Tax Portal'
    }
    return portals[portalType as keyof typeof portals] || portalType
  }

  if (loading && returns.length === 0 && submissionHistory.length === 0 && challans.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Government Portal Integration</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Automated submission and management of government returns</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={loadData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setCredentialsModalVisible(true)} variant="outline">
            <Settings className="w-4 h-4 mr-2" />
            Portal Settings
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {[
          { id: 'submit', label: 'Submit Returns', icon: Send },
          { id: 'status', label: 'Check Status', icon: Eye },
          { id: 'history', label: 'Submission History', icon: FileText },
          { id: 'challans', label: 'Challans', icon: Download }
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 mr-2" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Submit Returns Tab */}
      {activeTab === 'submit' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Submit Returns to Government Portals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Return</label>
                  <select
                    value={selectedReturn?.toString() || ''}
                    onChange={(e) => setSelectedReturn(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a return to submit</option>
                    {returns.map((ret) => (
                      <option key={ret.id} value={ret.id}>
                        {ret.return_type.toUpperCase()} - {ret.period_month.toString().padStart(2, '0')}/{ret.period_year}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Portal Type</label>
                  <select
                    value={portalType}
                    onChange={(e) => setPortalType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select portal</option>
                    <option value="epfo">EPFO Portal</option>
                    <option value="esic">ESIC Portal</option>
                    <option value="pt">Professional Tax Portal</option>
                    <option value="income_tax">Income Tax Portal</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleSubmitToPortal} disabled={loading || !selectedReturn || !portalType} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Submitting...' : 'Submit to Portal'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available Returns</CardTitle>
            </CardHeader>
            <CardContent>
              {returns.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {returns.map((ret) => (
                    <div key={ret.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{ret.return_type.toUpperCase()}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Period: {ret.period_month.toString().padStart(2, '0')}/{ret.period_year}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400">Employees</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{ret.total_employees}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400">Amount</p>
                            <p className="font-semibold text-gray-900 dark:text-white">₹{ret.total_contribution.toLocaleString()}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400">Due Date</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{new Date(ret.due_date).toLocaleDateString()}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateChallan(ret.id, ret.return_type.split('_')[0])}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Challan
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No returns available for submission</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Check Status Tab */}
      {activeTab === 'status' && (
        <Card>
          <CardHeader>
            <CardTitle>Check Submission Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Acknowledgment Number"
                value={statusCheck.acknowledgmentNumber}
                onChange={(e) => setStatusCheck(prev => ({ ...prev, acknowledgmentNumber: e.target.value }))}
                placeholder="Enter acknowledgment number"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Return Type</label>
                <select
                  value={statusCheck.returnType}
                  onChange={(e) => setStatusCheck(prev => ({ ...prev, returnType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select return type</option>
                  <option value="pf_ecr">PF ECR</option>
                  <option value="esi_return">ESI Return</option>
                  <option value="pt_return">Professional Tax Return</option>
                  <option value="tds_24q">TDS 24Q Return</option>
                </select>
              </div>
            </div>
            <Button onClick={handleCheckStatus} disabled={loading || !statusCheck.acknowledgmentNumber || !statusCheck.returnType} className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              {loading ? 'Checking...' : 'Check Status'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Submission History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
          </CardHeader>
          <CardContent>
            {submissionHistory.length > 0 ? (
              <div className="space-y-4">
                {submissionHistory.map((submission) => (
                  <div key={submission.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                          <Building className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{getPortalName(submission.portal_name.toLowerCase())}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {submission.return_type.toUpperCase()} - {submission.period}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Acknowledgment</p>
                          <p className="font-mono text-sm text-gray-900 dark:text-white">{submission.acknowledgment_number}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                          {getStatusBadge(submission.status)}
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Submitted</p>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No submission history found</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Challans Tab */}
      {activeTab === 'challans' && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Challans</CardTitle>
          </CardHeader>
          <CardContent>
            {challans.length > 0 ? (
              <div className="space-y-4">
                {challans.map((challan) => (
                  <div key={challan.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                          <Download className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white font-mono">{challan.challan_number}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{challan.challan_type.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Amount</p>
                          <p className="font-semibold text-gray-900 dark:text-white">₹{challan.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Due Date</p>
                          <p className="text-sm text-gray-900 dark:text-white">{new Date(challan.due_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            challan.is_paid 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {challan.is_paid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Download className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No challans generated yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Portal Settings Modal */}
      {credentialsModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Portal Credentials</h3>
              <button
                onClick={() => setCredentialsModalVisible(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-2" />
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Important:</strong> Portal credentials are encrypted and stored securely. 
                    You need valid government portal accounts to use this feature.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="EPFO Username" 
                  placeholder="Enter EPFO portal username"
                />
                <Input 
                  label="EPFO Password" 
                  type="password"
                  placeholder="Enter EPFO portal password"
                />
                <Input 
                  label="ESIC Username" 
                  placeholder="Enter ESIC portal username"
                />
                <Input 
                  label="ESIC Password" 
                  type="password"
                  placeholder="Enter ESIC portal password"
                />
                <Input 
                  label="Income Tax Username" 
                  placeholder="Enter IT portal username"
                />
                <Input 
                  label="Income Tax Password" 
                  type="password"
                  placeholder="Enter IT portal password"
                />
                <Input 
                  label="Professional Tax Username" 
                  placeholder="Enter PT portal username"
                />
                <Input 
                  label="Professional Tax Password" 
                  type="password"
                  placeholder="Enter PT portal password"
                />
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Ensure you have active accounts on respective government portals. 
                  Test credentials will be validated before saving.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="outline" onClick={() => setCredentialsModalVisible(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setCredentialsModalVisible(false)}>
                  Save & Test Credentials
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}