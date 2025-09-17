import React, { useState, useEffect } from 'react'
import { Calendar, Clock, Search } from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import toast from 'react-hot-toast'

interface Attendance {
  id: number
  employee: {
    id: number
    first_name: string
    last_name: string
    employee_id: string
  }
  date: string
  check_in_time: string | null
  check_out_time: string | null
  working_hours: number
  status: string
}

const AttendanceList: React.FC = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const { sessionKey } = useServiceUserStore()

  const fetchAttendances = async () => {
    try {
      const response = await apiClient.get(`/api/hr/attendances/?session_key=${sessionKey}&date=${selectedDate}`)
      setAttendances(response.data.results || response.data)
    } catch (error) {
      toast.error('Failed to fetch attendance records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionKey) {
      fetchAttendances()
    }
  }, [sessionKey, selectedDate])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'late': return 'bg-yellow-100 text-yellow-800'
      case 'half_day': return 'bg-blue-100 text-blue-800'
      case 'on_leave': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredAttendances = attendances.filter(attendance =>
    `${attendance.employee.first_name} ${attendance.employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendance.employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check In
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Working Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAttendances.map((attendance) => (
                <tr key={attendance.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {attendance.employee.first_name} {attendance.employee.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {attendance.employee.employee_id}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.check_in_time ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-green-500" />
                        {attendance.check_in_time}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.check_out_time ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-red-500" />
                        {attendance.check_out_time}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {attendance.working_hours.toFixed(2)} hrs
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(attendance.status)}`}>
                      {attendance.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAttendances.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No attendance records found for {selectedDate}</p>
        </div>
      )}
    </div>
  )
}

export default AttendanceList