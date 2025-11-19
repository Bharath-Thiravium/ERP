import React, { useState, useEffect } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface LeaveApplication {
  id: number
  employee_name: string
  leave_type_name: string
  from_date: string
  to_date: string
  total_days: number
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
}

interface LeaveType {
  id: number
  name: string
  code: string
}

interface Employee {
  id: number
  full_name: string
}

const LeaveApplications: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  
  const [newApplication, setNewApplication] = useState({
    employee: '',
    leave_type: '',
    from_date: '',
    to_date: '',
    reason: ''
  })

  useEffect(() => {
    fetchApplications()
    fetchLeaveTypes()
    fetchEmployees()
  }, [sessionKey])

  const fetchApplications = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/leave-applications/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setApplications(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to fetch leave applications')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeaveTypes = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/leave-types/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setLeaveTypes(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching leave types:', error)
      toast.error('Failed to fetch leave types')
    }
  }

  const fetchEmployees = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/employees/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setEmployees(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const calculateDays = (fromDate: string, toDate: string) => {
    if (!fromDate || !toDate) return 0
    const from = new Date(fromDate)
    const to = new Date(toDate)
    const diffTime = Math.abs(to.getTime() - from.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  const handleSubmitApplication = async () => {
    if (!sessionKey || !newApplication.employee || !newApplication.leave_type || !newApplication.from_date || !newApplication.to_date) {
      toast.error('Please fill all required fields')
      return
    }
    
    try {
      const totalDays = calculateDays(newApplication.from_date, newApplication.to_date)
      const payload = {
        ...newApplication,
        total_days: totalDays,
        session_key: sessionKey
      }
      
      await api.post('/api/hr/leave-applications/', payload, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success('Leave application submitted successfully')
      setShowModal(false)
      setNewApplication({
        employee: '',
        leave_type: '',
        from_date: '',
        to_date: '',
        reason: ''
      })
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit application')
    }
  }

  const handleApprove = async (id: number) => {
    if (!sessionKey) return
    
    try {
      await api.post(`/api/hr/leave-applications/${id}/approve/`, 
        { session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      toast.success('Leave approved successfully')
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to approve leave')
    }
  }

  const handleReject = async (id: number) => {
    if (!sessionKey) return
    
    const reason = prompt('Enter rejection reason:')
    if (!reason) return
    
    try {
      await api.post(`/api/hr/leave-applications/${id}/reject/`, 
        { reason, session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      toast.success('Leave rejected successfully')
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject leave')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredApplications = applications.filter(app => 
    statusFilter === 'all' || app.status === statusFilter
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Application
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Employee</th>
                    <th className="text-left p-3">Leave Type</th>
                    <th className="text-left p-3">From Date</th>
                    <th className="text-left p-3">To Date</th>
                    <th className="text-left p-3">Days</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => (
                    <tr key={app.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{app.employee_name}</td>
                      <td className="p-3">{app.leave_type_name}</td>
                      <td className="p-3">{new Date(app.from_date).toLocaleDateString()}</td>
                      <td className="p-3">{new Date(app.to_date).toLocaleDateString()}</td>
                      <td className="p-3">{app.total_days}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(app.status)}`}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-3">
                        {app.status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(app.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReject(app.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">New Leave Application</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Employee</label>
                <select
                  value={newApplication.employee}
                  onChange={(e) => setNewApplication({ ...newApplication, employee: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Leave Type</label>
                <select
                  value={newApplication.leave_type}
                  onChange={(e) => setNewApplication({ ...newApplication, leave_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">Select Leave Type</option>
                  {leaveTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">From Date</label>
                  <input
                    type="date"
                    value={newApplication.from_date}
                    onChange={(e) => setNewApplication({ ...newApplication, from_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">To Date</label>
                  <input
                    type="date"
                    value={newApplication.to_date}
                    onChange={(e) => setNewApplication({ ...newApplication, to_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              {newApplication.from_date && newApplication.to_date && (
                <div className="text-sm text-gray-600">
                  Total Days: {calculateDays(newApplication.from_date, newApplication.to_date)}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2">Reason</label>
                <textarea
                  value={newApplication.reason}
                  onChange={(e) => setNewApplication({ ...newApplication, reason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Enter reason for leave"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitApplication}>
                Submit Application
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveApplications