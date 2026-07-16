import React, { useState, useEffect } from 'react'
import { Clock, Users, Smartphone, Settings, Plus, Calendar, TrendingUp, AlertCircle, CheckCircle, Fingerprint } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'
import AttendanceSystemConfig from '../components/attendance/AttendanceSystemConfig'
import AttendanceRecords from '../components/attendance/AttendanceRecords'
import ManualAttendanceEntry from '../components/attendance/ManualAttendanceEntry'
import AttendanceTracker from '../components/attendance/AttendanceTracker'
import BiometricAttendance from '../components/attendance/BiometricAttendance'

interface AttendanceStats {
  today: {
    total_employees: number
    present: number
    late: number
    absent: number
    attendance_rate: number
  }
  week: {
    avg_attendance: number
  }
  methods: Array<{
    check_in_method: string
    count: number
  }>
}

const Attendance: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [activeView, setActiveView] = useState('overview')
  const [stats, setStats] = useState<AttendanceStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [attendanceSystem, setAttendanceSystem] = useState<any>(null)

  const fetchAttendanceData = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const [statsResponse, systemResponse] = await Promise.all([
        api.get('/api/hr/attendance/dashboard-stats/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),
        api.get('/api/hr/attendance/system/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
      ])
      
      setStats(statsResponse.data)
      setAttendanceSystem(systemResponse.data.results?.[0] || null)
    } catch (error) {
      console.error('Error fetching attendance data:', error)
      toast.error('Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendanceData()
  }, [sessionKey])

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'biometric': return <Fingerprint className="h-5 w-5" />
      case 'face_recognition': return <Fingerprint className="h-5 w-5" />
      case 'mobile_app': return <Smartphone className="h-5 w-5" />
      case 'manual': return <Clock className="h-5 w-5" />
      default: return <Clock className="h-5 w-5" />
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'biometric': return 'text-purple-600'
      case 'face_recognition': return 'text-blue-600'
      case 'mobile_app': return 'text-green-600'
      case 'manual': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const attendanceMode = attendanceSystem?.system_type === 'mobile_app'
    ? 'mobile_app'
    : attendanceSystem?.system_type === 'biometric' || attendanceSystem?.system_type === 'face_recognition'
      ? 'biometric'
      : 'manual'
  const canShowManual = attendanceMode === 'manual'
  const canShowBiometric = attendanceMode === 'biometric'

  const attendanceTabs = [
    { id: 'overview', label: 'Overview', visible: true },
    { id: 'records', label: 'Records', visible: true },
    { id: 'manual', label: 'Manual Entry', visible: canShowManual },
    { id: 'biometric', label: 'Devices', visible: canShowBiometric },
    { id: 'tracker', label: 'Live Tracker', visible: true },
    { id: 'config', label: 'Settings', visible: true },
  ].filter(tab => tab.visible)

  useEffect(() => {
    if (!attendanceTabs.some(tab => tab.id === activeView)) {
      setActiveView('overview')
    }
  }, [attendanceSystem, activeView])

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Smart Attendance System
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Configure and track one reliable attendance flow for this company
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => setActiveView('config')}
              variant="outline"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configure System
            </Button>
            <Button
              onClick={() => setActiveView(canShowManual ? 'manual' : canShowBiometric ? 'biometric' : 'records')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {canShowManual ? <Plus className="h-4 w-4 mr-2" /> : canShowBiometric ? <Fingerprint className="h-4 w-4 mr-2" /> : <Calendar className="h-4 w-4 mr-2" />}
              {canShowManual ? 'Manual Entry' : canShowBiometric ? 'Manage Devices' : 'View Records'}
            </Button>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Present Today</p>
                <p className="text-3xl font-bold">{stats.today.present}</p>
                <p className="text-xs opacity-75">{stats.today.attendance_rate}% attendance</p>
              </div>
              <CheckCircle className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Late Arrivals</p>
                <p className="text-3xl font-bold">{stats.today.late}</p>
                <p className="text-xs opacity-75">Need attention</p>
              </div>
              <AlertCircle className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Absent</p>
                <p className="text-3xl font-bold">{stats.today.absent}</p>
                <p className="text-xs opacity-75">Not marked</p>
              </div>
              <Users className="h-8 w-8 opacity-80" />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Employees</p>
                <p className="text-3xl font-bold">{stats.today.total_employees}</p>
                <p className="text-xs opacity-75">Active workforce</p>
              </div>
              <TrendingUp className="h-8 w-8 opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Attendance Methods */}
      {stats?.methods && stats.methods.length > 0 && (
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle>Today's Check-in Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.methods.map((method, index) => (
                <div key={index} className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className={`${getMethodColor(method.check_in_method)}`}>
                    {getMethodIcon(method.check_in_method)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {method.check_in_method?.replace('_', ' ') || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {method.count} employees
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle>Attendance System Status</CardTitle>
          </CardHeader>
          <CardContent>
            {attendanceSystem ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">System Type</span>
                  <span className="font-medium">
                    {attendanceMode === 'mobile_app' ? 'Mobile App Location Based' : attendanceMode === 'biometric' ? 'Biometric Device' : 'Manual Entry'}
                  </span>
                </div>
                {attendanceMode === 'mobile_app' && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Location Radius</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${attendanceSystem.enable_geo_fencing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {attendanceSystem.enable_geo_fencing ? `${attendanceSystem.geo_fence_radius}m` : 'Not enforced'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Face Photo</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${attendanceSystem.require_face_for_checkin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {attendanceSystem.require_face_for_checkin ? 'Required' : 'Optional'}
                      </span>
                    </div>
                  </>
                )}
                {attendanceMode === 'biometric' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Device Attendance</span>
                    <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">Enabled</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No System Configured</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Set up your attendance system to get started</p>
                <Button onClick={() => setActiveView('config')}>
                  Configure Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={() => setActiveView('records')}
                variant="outline" 
                className="h-20 flex-col space-y-2"
              >
                <Calendar className="h-6 w-6" />
                <span>View Records</span>
              </Button>
              {canShowManual && (
                <Button
                  onClick={() => setActiveView('manual')}
                  variant="outline"
                  className="h-20 flex-col space-y-2"
                >
                  <Plus className="h-6 w-6" />
                  <span>Manual Entry</span>
                </Button>
              )}
              {attendanceSystem?.enable_mobile_app && (
                <Button
                  onClick={() => setActiveView('records')}
                  variant="outline"
                  className="h-20 flex-col space-y-2"
                >
                  <Smartphone className="h-6 w-6" />
                  <span>Mobile Records</span>
                </Button>
              )}
              {canShowBiometric && (
                <Button
                  onClick={() => setActiveView('biometric')}
                  variant="outline"
                  className="h-20 flex-col space-y-2"
                >
                  <Fingerprint className="h-6 w-6" />
                  <span>Devices</span>
                </Button>
              )}
              <Button 
                onClick={() => setActiveView('config')}
                variant="outline" 
                className="h-20 flex-col space-y-2"
              >
                <Settings className="h-6 w-6" />
                <span>Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {attendanceTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === tab.id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <>
          {activeView === 'overview' && renderOverview()}
          {activeView === 'records' && <AttendanceRecords />}
          {activeView === 'manual' && <ManualAttendanceEntry onSuccess={fetchAttendanceData} />}
          {activeView === 'biometric' && <BiometricAttendance />}
          {activeView === 'tracker' && <AttendanceTracker />}
          {activeView === 'config' && <AttendanceSystemConfig onSuccess={fetchAttendanceData} />}
        </>
      )}
    </div>
  )
}

export default Attendance
