import React, { useState, useEffect } from 'react'
import { Calendar, Filter, Download, Clock, MapPin, Camera, Fingerprint, Smartphone } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

const AttendanceRecords: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    employee_id: '',
    department_id: '',
    status: ''
  })
  const [employees, setEmployees] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])

  useEffect(() => {
    fetchInitialData()
  }, [sessionKey])

  useEffect(() => {
    fetchRecords()
  }, [filters, sessionKey])

  const fetchInitialData = async () => {
    if (!sessionKey) return
    
    try {
      const [empResponse, deptResponse] = await Promise.all([
        api.get('/api/hr/employees/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),
        api.get('/api/hr/departments/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
      ])
      
      setEmployees(empResponse.data.results || [])
      setDepartments(Array.isArray(deptResponse.data) ? deptResponse.data : deptResponse.data.results || [])
    } catch (error) {
      console.error('Error fetching initial data:', error)
    }
  }

  const fetchRecords = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/attendance/records/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          ...filters
        }
      })
      
      setRecords(response.data.results || [])
    } catch (error) {
      console.error('Error fetching records:', error)
      toast.error('Failed to load attendance records')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'late': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'half_day': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'early_departure': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'leave': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'holiday': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'biometric': return <Fingerprint className="h-4 w-4 text-purple-500" />
      case 'face_recognition': return <Camera className="h-4 w-4 text-blue-500" />
      case 'mobile_app': return <Smartphone className="h-4 w-4 text-green-500" />
      case 'manual': return <Clock className="h-4 w-4 text-orange-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return '-'
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const exportRecords = async () => {
    try {
      const response = await api.get('/api/hr/attendance/records/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          ...filters,
          export: 'csv'
        },
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `attendance-records-${filters.start_date}-to-${filters.end_date}.csv`
      link.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('Records exported successfully')
    } catch (error) {
      toast.error('Failed to export records')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Attendance Records
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              View and manage employee attendance history
            </p>
          </div>
          <Button 
            onClick={exportRecords}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee
              </label>
              <select
                value={filters.employee_id}
                onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Employees</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Department
              </label>
              <select
                value={filters.department_id}
                onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Departments</option>
                {Array.isArray(departments) && departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
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
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="leave">On Leave</option>
                <option value="holiday">Holiday</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <span>Attendance Records ({records.length})</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Records Found</h3>
              <p className="text-gray-500 dark:text-gray-400">No attendance records match your current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Check In</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Check Out</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Hours</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{record.employee_name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{record.employee_id}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-gray-900 dark:text-white">{formatDate(record.date)}</p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {record.check_in_method && getMethodIcon(record.check_in_method)}
                          <span className="text-gray-900 dark:text-white">{formatTime(record.check_in_time)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {record.check_out_method && getMethodIcon(record.check_out_method)}
                          <span className="text-gray-900 dark:text-white">{formatTime(record.check_out_time)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900 dark:text-white">
                          {record.total_hours ? `${record.total_hours}h` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(record.status)}`}>
                          {record.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1">
                          {record.check_in_method && getMethodIcon(record.check_in_method)}
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {record.check_in_method?.replace('_', ' ') || 'Manual'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {record.check_in_location ? (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-32">
                              {record.check_in_location}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
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
    </div>
  )
}

export default AttendanceRecords