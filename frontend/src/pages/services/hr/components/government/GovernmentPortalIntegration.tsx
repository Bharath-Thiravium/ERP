import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { Badge } from '../../../../../components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../../components/ui/Tabs'
import { Input } from '../../../../../components/ui/Input'
import { Select } from '../../../../../components/ui/Select'
import { Modal } from '../../../../../components/ui/Modal'
import { AlertCircle, CheckCircle, Clock, Send, Download, Eye, Settings } from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
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
  const [activeTab, setActiveTab] = useState('submit')
  const [loading, setLoading] = useState(false)
  const [submissionHistory, setSubmissionHistory] = useState<SubmissionHistory[]>([])
  const [challans, setChallans] = useState<Challan[]>([])
  const [returns, setReturns] = useState<GovernmentReturn[]>([])
  const [selectedReturn, setSelectedReturn] = useState<number | null>(null)
  const [portalType, setPortalType] = useState('')
  const [statusCheck, setStatusCheck] = useState({ acknowledgmentNumber: '', returnType: '' })

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    try {
      if (activeTab === 'history') {
        const response = await apiClient.getGovernmentSubmissionHistory()
        setSubmissionHistory(response.data.submissions || [])
      } else if (activeTab === 'challans') {
        const response = await apiClient.getGovernmentChallans()
        setChallans(response.data.challans || [])
      } else if (activeTab === 'submit') {
        const response = await apiClient.getGovernmentReturns({ status: 'generated' })
        setReturns(response.data.results || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleSubmitToPortal = async () => {
    if (!selectedReturn || !portalType) {
      toast.error('Please select a return and portal type')
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.submitToGovernmentPortal({
        return_id: selectedReturn,
        portal_type: portalType
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
    if (!statusCheck.acknowledgmentNumber || !statusCheck.returnType) {
      toast.error('Please enter acknowledgment number and return type')
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.checkSubmissionStatus({
        acknowledgment_number: statusCheck.acknowledgmentNumber,
        return_type: statusCheck.returnType
      })

      toast.success(`Status: ${response.data.status}`)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Status check failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateChallan = async (returnId: number, challanType: string) => {
    setLoading(true)
    try {
      const response = await apiClient.generateChallan({
        return_id: returnId,
        challan_type: challanType
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
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      submitted: { color: 'bg-blue-100 text-blue-800', icon: Send },
      processed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
      error: { color: 'bg-red-100 text-red-800', icon: AlertCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const Icon = config.icon

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Government Portal Integration</h2>
        <Modal
          isOpen={false}
          onClose={() => {}}
          trigger={
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Portal Settings
            </Button>
          }
          title="Portal Credentials"
        >
          <div>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Configure your government portal credentials for automated submissions.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">EPFO Username</label>
                  <Input placeholder="Enter EPFO username" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">ESIC Username</label>
                  <Input placeholder="Enter ESIC username" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Income Tax Username</label>
                  <Input placeholder="Enter IT username" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">PT Username</label>
                  <Input placeholder="Enter PT username" />
                </div>
              </div>
              <Button className="w-full">Save Credentials</Button>
            </div>
          </div>
        </Modal>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="submit">Submit Returns</TabsTrigger>
          <TabsTrigger value="status">Check Status</TabsTrigger>
          <TabsTrigger value="history">Submission History</TabsTrigger>
          <TabsTrigger value="challans">Challans</TabsTrigger>
        </TabsList>

        <TabsContent value="submit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submit Returns to Government Portals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Select Return</label>
                  <Select 
                    value={selectedReturn?.toString() || ''} 
                    onChange={(value) => setSelectedReturn(Number(value))}
                    placeholder="Select a return to submit"
                    options={returns.map((ret) => ({
                      value: ret.id.toString(),
                      label: `${ret.return_type.toUpperCase()} - ${ret.period_month.toString().padStart(2, '0')}/${ret.period_year}`
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Portal Type</label>
                  <Select 
                    value={portalType} 
                    onChange={setPortalType}
                    placeholder="Select portal"
                    options={[
                      { value: 'epfo', label: 'EPFO Portal' },
                      { value: 'esic', label: 'ESIC Portal' },
                      { value: 'pt', label: 'Professional Tax Portal' },
                      { value: 'income_tax', label: 'Income Tax Portal' }
                    ]}
                  />
                </div>
              </div>
              <Button onClick={handleSubmitToPortal} disabled={loading} className="w-full">
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
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Return Type</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Period</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Employees</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Total Amount</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Due Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((ret) => (
                      <tr key={ret.id}>
                        <td className="border border-gray-300 px-4 py-2">{ret.return_type.toUpperCase()}</td>
                        <td className="border border-gray-300 px-4 py-2">{ret.period_month.toString().padStart(2, '0')}/{ret.period_year}</td>
                        <td className="border border-gray-300 px-4 py-2">{ret.total_employees}</td>
                        <td className="border border-gray-300 px-4 py-2">₹{ret.total_contribution.toLocaleString()}</td>
                        <td className="border border-gray-300 px-4 py-2">{new Date(ret.due_date).toLocaleDateString()}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateChallan(ret.id, ret.return_type.split('_')[0])}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Challan
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Check Submission Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Acknowledgment Number</label>
                  <Input
                    value={statusCheck.acknowledgmentNumber}
                    onChange={(e) => setStatusCheck(prev => ({ ...prev, acknowledgmentNumber: e.target.value }))}
                    placeholder="Enter acknowledgment number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Return Type</label>
                  <Select
                    value={statusCheck.returnType}
                    onChange={(value) => setStatusCheck(prev => ({ ...prev, returnType: value }))}
                    placeholder="Select return type"
                    options={[
                      { value: 'pf_ecr', label: 'PF ECR' },
                      { value: 'esi_return', label: 'ESI Return' },
                      { value: 'pt_return', label: 'Professional Tax Return' },
                      { value: 'tds_24q', label: 'TDS 24Q Return' }
                    ]}
                  />
                </div>
              </div>
              <Button onClick={handleCheckStatus} disabled={loading} className="w-full">
                <Eye className="w-4 h-4 mr-2" />
                {loading ? 'Checking...' : 'Check Status'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submission History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Portal</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Return Type</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Period</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Acknowledgment</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissionHistory.map((submission) => (
                      <tr key={submission.id}>
                        <td className="border border-gray-300 px-4 py-2">{getPortalName(submission.portal_name.toLowerCase())}</td>
                        <td className="border border-gray-300 px-4 py-2">{submission.return_type.toUpperCase()}</td>
                        <td className="border border-gray-300 px-4 py-2">{submission.period}</td>
                        <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{submission.acknowledgment_number}</td>
                        <td className="border border-gray-300 px-4 py-2">{getStatusBadge(submission.status)}</td>
                        <td className="border border-gray-300 px-4 py-2">{submission.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="challans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Challans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left">Challan Number</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Type</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Amount</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Due Date</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Status</th>
                      <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challans.map((challan) => (
                      <tr key={challan.id}>
                        <td className="border border-gray-300 px-4 py-2 font-mono">{challan.challan_number}</td>
                        <td className="border border-gray-300 px-4 py-2">{challan.challan_type.toUpperCase()}</td>
                        <td className="border border-gray-300 px-4 py-2">₹{challan.amount.toLocaleString()}</td>
                        <td className="border border-gray-300 px-4 py-2">{new Date(challan.due_date).toLocaleDateString()}</td>
                        <td className="border border-gray-300 px-4 py-2">
                          {challan.is_paid ? (
                            <Badge className="bg-green-100 text-green-800">Paid</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          )}
                        </td>
                        <td className="border border-gray-300 px-4 py-2">
                          <Button size="sm" variant="outline">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}