import React, { useState, useEffect } from 'react'
import { Clock, MapPin, Calendar, TrendingUp, CheckCircle, AlertCircle, Home, Building } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

const AttendanceTracker: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [attendanceData, setAttendanceData] = useState({
    presentToday: 0,
    totalEmployees: 0,
    remoteWorkers: 0,
    onLeave: 0,
    lateArrivals: 0,
    avgWorkHours: 0,
    attendanceRate: 0
  })
  const [recentAttendance, setRecentAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  const fetchAttendanceData = async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      
      // Fetch dashboard stats
      const statsResponse = await api.get('/api/hr/attendance/dashboard-stats/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      
      // Fetch attendance records for selected date
      const attendanceResponse = await api.get('/api/hr/attendance/records/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          start_date: selectedDate,
          end_date: selectedDate
        }
      })
      
      const stats = statsResponse.data
      const attendanceRecords = attendanceResponse.data.results || []
      
      // Calculate work mode distribution
      const remoteCount = attendanceRecords.filter((r: any) => r.work_mode === 'remote').length
      const onLeaveCount = attendanceRecords.filter((r: any) => r.status === 'leave').length
      const lateCount = attendanceRecords.filter((r: any) => r.status === 'late').length
      
      // Calculate average work hours
      const totalHours = attendanceRecords.reduce((sum: number, r: any) => sum + (r.total_hours || 0), 0)
      const avgHours = attendanceRecords.length > 0 ? totalHours / attendanceRecords.length : 0
      
      setAttendanceData({
        presentToday: stats.today?.present || 0,
        totalEmployees: stats.today?.total_employees || 0,
        remoteWorkers: remoteCount,
        onLeave: onLeaveCount,
        lateArrivals: lateCount,
        avgWorkHours: Math.round(avgHours * 10) / 10,
        attendanceRate: stats.today?.attendance_rate || 0
      })
      
      setRecentAttendance(attendanceRecords)
      
    } catch (error) {
      console.error('Error fetching attendance data:', error)
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendanceData()
  }, [sessionKey, selectedDate])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'half_day': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'leave': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'holiday': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getWorkModeIcon = (workMode: string) => {
    switch (workMode) {
      case 'remote': return <Home className="h-4 w-4" />
      case 'hybrid': return <MapPin className="h-4 w-4" />
      default: return <Building className="h-4 w-4" />
    }
  }

  const getWorkModeColor = (workMode: string) => {
    switch (workMode) {
      case 'remote': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'hybrid': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const attendancePercentage = Math.round((attendanceData.presentToday / attendanceData.totalEmployees) * 100)

  return (
    <div className="space-y-6">
      {/* Today's Attendance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Present Today</p>
                <p className="text-3xl font-bold">{attendanceData.presentToday}</p>
                <p className="text-xs opacity-75 mt-1">of {attendanceData.totalEmployees} employees</p>
              </div>
              <CheckCircle className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Remote Workers</p>
                <p className="text-3xl font-bold">{attendanceData.remoteWorkers}</p>
                <p className="text-xs opacity-75 mt-1">Working from home</p>
              </div>
              <Home className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-violet-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">On Leave</p>
                <p className="text-3xl font-bold">{attendanceData.onLeave}</p>
                <p className="text-xs opacity-75 mt-1">Approved leaves</p>
              </div>
              <Calendar className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Late Arrivals</p>
                <p className="text-3xl font-bold">{attendanceData.lateArrivals}</p>
                <p className="text-xs opacity-75 mt-1">Today</p>
              </div>
              <AlertCircle className="h-8 w-8 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Rate & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Attendance Rate</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200 dark:text-gray-700"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-green-500"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${attendancePercentage}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">{attendancePercentage}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's attendance rate</p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{attendanceData.avgWorkHours}h</p>
                  <p className="text-gray-500 dark:text-gray-400">Avg work hours</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{attendanceData.attendanceRate}%</p>
                  <p className="text-gray-500 dark:text-gray-400">Monthly rate</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-500" />
              <span>Work Mode Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <Building className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Office</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-gray-500 h-2 rounded-full" style={{ width: `${attendanceData.totalEmployees > 0 ? ((attendanceData.presentToday - attendanceData.remoteWorkers) / attendanceData.totalEmployees * 100) : 0}%` }}></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{attendanceData.presentToday - attendanceData.remoteWorkers}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Home className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Remote</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${attendanceData.totalEmployees > 0 ? (attendanceData.remoteWorkers / attendanceData.totalEmployees * 100) : 0}%` }}></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{attendanceData.remoteWorkers}</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <MapPin className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Hybrid</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">0</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Selector & Actions */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <span>Daily Attendance</span>
            </CardTitle>
            <div className="flex items-center space-x-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600">
                <Clock className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : recentAttendance.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No attendance data</h3>
              <p className="text-gray-500 dark:text-gray-400">Attendance records will appear here once employees check in</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttendance.map((record) => (
                <div key={record.id} className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                        {record.employee?.first_name?.charAt(0) || record.employee?.employee_id?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {record.employee ? `${record.employee.first_name} ${record.employee.last_name}` : 'Unknown Employee'}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : 'Not checked in'}
                            </span>
                          </div>
                          {record.check_in_location && (
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">{record.check_in_location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getWorkModeColor(record.work_mode || 'office')}`}>
                        {getWorkModeIcon(record.work_mode || 'office')}
                        <span className="capitalize">{record.work_mode || 'office'}</span>
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{record.total_hours || 0}h</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total hours</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-indigo-500" />
            <span>Attendance Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Attendance Trend</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Current attendance rate: {attendanceData.attendanceRate}%. {attendanceData.attendanceRate > 90 ? 'Excellent attendance performance!' : attendanceData.attendanceRate > 80 ? 'Good attendance, room for improvement.' : 'Attendance needs attention.'}
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Remote Work Impact</h4>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {attendanceData.remoteWorkers} employees working remotely today. Average work hours: {attendanceData.avgWorkHours}h per employee.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AttendanceTracker