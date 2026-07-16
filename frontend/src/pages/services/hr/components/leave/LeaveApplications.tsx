import React, { useState, useEffect } from 'react'
import { Plus, Check, X, Trash2 } from 'lucide-react'
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

interface AttendancePolicy {
  weekly_off_days: number[]
  exclude_weekoffs_from_leave: boolean
  exclude_holidays_from_leave: boolean
}

interface Holiday {
  date: string
}

interface DayOverride {
  date: string
  is_working_day: boolean
}

const LeaveApplications: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [policy, setPolicy] = useState<AttendancePolicy>({
    weekly_off_days: [6],
    exclude_weekoffs_from_leave: true,
    exclude_holidays_from_leave: true,
  })
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [dayOverrides, setDayOverrides] = useState<DayOverride[]>([])
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
    fetchCalendarRules()
  }, [sessionKey])

  const fetchApplications = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/leave-applications/')
      setApplications(response.data.results || response.data || [])
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
      const response = await api.get('/api/hr/leave-types/')
      setLeaveTypes(response.data.results || response.data || [])
    } catch (error: any) {
      console.error('Error fetching leave types:', error)
      toast.error('Failed to fetch leave types')
    }
  }

  const fetchEmployees = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/employees/')
      setEmployees(response.data.results || response.data || [])
    } catch (error: any) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const fetchCalendarRules = async () => {
    if (!sessionKey) return
    try {
      const currentYear = new Date().getFullYear()
      const [policyResponse, holidayResponse, overrideResponse] = await Promise.all([
        api.get('/api/hr/attendance/policy/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),
        api.get('/api/hr/holidays/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey, year: currentYear }
        }),
        api.get('/api/hr/attendance/day-overrides/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey, year: currentYear }
        }),
      ])
      const loadedPolicy = policyResponse.data.results?.[0]
      if (loadedPolicy) {
        setPolicy({
          weekly_off_days: loadedPolicy.weekly_off_days || [],
          exclude_weekoffs_from_leave: Boolean(loadedPolicy.exclude_weekoffs_from_leave),
          exclude_holidays_from_leave: Boolean(loadedPolicy.exclude_holidays_from_leave),
        })
      }
      setHolidays(holidayResponse.data.results || [])
      setDayOverrides(overrideResponse.data.results || [])
    } catch (error) {
      console.error('Error fetching leave calendar rules:', error)
    }
  }

  const calculateDays = (fromDate: string, toDate: string) => {
    if (!fromDate || !toDate) return 0
    const from = new Date(fromDate)
    const to = new Date(toDate)
    if (to < from) return 0
    let count = 0
    const current = new Date(from)
    const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    while (current <= to) {
      const dateStr = formatDate(current)
      const override = dayOverrides.find(item => item.date === dateStr)
      const holiday = holidays.find(item => item.date === dateStr)
      const pythonWeekday = (current.getDay() + 6) % 7
      const weeklyOff = policy.weekly_off_days.includes(pythonWeekday)

      if (override) {
        if (override.is_working_day) count += 1
      } else if (holiday && policy.exclude_holidays_from_leave) {
        // skip configured holiday
      } else if (weeklyOff && policy.exclude_weekoffs_from_leave) {
        // skip weekly off
      } else {
        count += 1
      }
      current.setDate(current.getDate() + 1)
    }
    return count
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
      
      await api.post('/api/hr/leave-applications/', payload)
      
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
      await api.post(`/api/hr/leave-applications/${id}/approve/`, {})
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
      await api.post(`/api/hr/leave-applications/${id}/reject/`, { reason })
      toast.success('Leave rejected successfully')
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to reject leave')
    }
  }

  const handleCancel = async (id: number) => {
    if (!sessionKey) return
    if (!confirm('Cancel this leave application?')) return
    try {
      await api.post(`/api/hr/leave-applications/${id}/cancel/`, {})
      toast.success('Leave cancelled')
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel leave')
    }
  }

  const handleDelete = async (id: number) => {
    if (!sessionKey) return
    if (!confirm('Delete this leave application?')) return
    try {
      await api.delete(`/api/hr/leave-applications/${id}/`)
      toast.success('Leave application deleted')
      fetchApplications()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete')
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
                        <div className="flex items-center gap-2">
                          {app.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(app.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700"
                              >
                                <Check className="h-3 w-3" /> Approve
                              </button>
                              <button
                                onClick={() => handleReject(app.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700"
                              >
                                <X className="h-3 w-3" /> Reject
                              </button>
                            </>
                          )}
                          {(app.status === 'pending' || app.status === 'approved') && (
                            <button
                              onClick={() => handleCancel(app.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-yellow-500 text-white hover:bg-yellow-600"
                            >
                              <X className="h-3 w-3" /> Cancel
                            </button>
                          )}
                          {(app.status === 'rejected' || app.status === 'cancelled') && (
                            <button
                              onClick={() => handleDelete(app.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded bg-gray-500 text-white hover:bg-gray-600"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          )}
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
