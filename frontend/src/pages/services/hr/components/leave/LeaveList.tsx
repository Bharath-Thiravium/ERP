import React, { useState, useEffect } from 'react'
import { Search, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import toast from 'react-hot-toast'

interface LeaveApplication {
  id: number
  employee: {
    id: number
    first_name: string
    last_name: string
    employee_id: string
  }
  leave_type: {
    id: number
    name: string
  }
  from_date: string
  to_date: string
  days_requested: number
  reason: string
  status: string
  applied_at: string
}

const LeaveList: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { sessionKey } = useServiceUserStore()

  const fetchLeaves = async () => {
    try {
      const response = await apiClient.get(`/api/hr/leave-applications/?session_key=${sessionKey}`)
      setLeaves(response.data.results || response.data)
    } catch (error) {
      toast.error('Failed to fetch leave applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionKey) {
      fetchLeaves()
    }
  }, [sessionKey])

  const handleStatusUpdate = async (id: number, status: string) => {
    try {
      await apiClient.patch(`/api/hr/leave-applications/${id}/?session_key=${sessionKey}`, { status })
      toast.success(`Leave ${status} successfully`)
      fetchLeaves()
    } catch (error) {
      toast.error('Failed to update leave status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = `${leave.employee.first_name} ${leave.employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         leave.employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredLeaves.map((leave) => (
          <div key={leave.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {leave.employee.first_name} {leave.employee.last_name}
                </h3>
                <p className="text-sm text-gray-500">{leave.employee.employee_id}</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(leave.status)}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                  {leave.status.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>{leave.from_date} to {leave.to_date}</span>
                <span className="text-blue-600">({leave.days_requested} days)</span>
              </div>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Type:</span> {leave.leave_type.name}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Reason:</span> {leave.reason}
              </p>
            </div>
            
            {leave.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusUpdate(leave.id, 'approved')}
                  className="flex-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                  className="flex-1 bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredLeaves.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No leave applications found</p>
        </div>
      )}
    </div>
  )
}

export default LeaveList