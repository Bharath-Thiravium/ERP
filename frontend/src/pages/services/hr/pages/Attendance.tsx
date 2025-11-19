import React, { useState, useEffect } from 'react'
import { Clock, Users, Smartphone, Settings, Plus, Calendar, TrendingUp, AlertCircle, CheckCircle, Camera, Fingerprint } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'
import AttendanceSystemConfig from '../components/attendance/AttendanceSystemConfig'
import AttendanceRecords from '../components/attendance/AttendanceRecords'
import ManualAttendanceEntry from '../components/attendance/ManualAttendanceEntry'
import MobileAttendanceDemo from '../components/attendance/MobileAttendanceDemo'
import AttendanceTracker from '../components/attendance/AttendanceTracker'
import FaceRecognitionAttendance from '../components/attendance/FaceRecognitionAttendance'
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
      case 'face_recognition': return <Camera className="h-5 w-5" />
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
              Multi-method attendance tracking with AI-powered insights
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
              onClick={() => setActiveView('manual')}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Manual Entry
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
                  <span className="font-medium capitalize">{attendanceSystem.system_type?.replace('_', ' ')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Biometric</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${attendanceSystem.enable_biometric ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {attendanceSystem.enable_biometric ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Face Recognition</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${attendanceSystem.enable_face_recognition ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {attendanceSystem.enable_face_recognition ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mobile App</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${attendanceSystem.enable_mobile_app ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {attendanceSystem.enable_mobile_app ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Geo-fencing</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${attendanceSystem.enable_geo_fencing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {attendanceSystem.enable_geo_fencing ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
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
              <Button 
                onClick={() => setActiveView('manual')}
                variant="outline" 
                className="h-20 flex-col space-y-2"
              >
                <Plus className="h-6 w-6" />
                <span>Manual Entry</span>
              </Button>
              <Button 
                onClick={() => setActiveView('mobile')}
                variant="outline" 
                className="h-20 flex-col space-y-2"
              >
                <Smartphone className="h-6 w-6" />
                <span>Mobile Demo</span>
              </Button>
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
        <button
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'overview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveView('records')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'records'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Records
        </button>
        <button
          onClick={() => setActiveView('manual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'manual'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => setActiveView('mobile')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'mobile'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Mobile Demo
        </button>
        <button
          onClick={() => setActiveView('biometric')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'biometric'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Biometric
        </button>
        <button
          onClick={() => setActiveView('face')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'face'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Face Recognition
        </button>
        <button
          onClick={() => setActiveView('tracker')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'tracker'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Live Tracker
        </button>
        <button
          onClick={() => setActiveView('config')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'config'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          System Config
        </button>
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
          {activeView === 'mobile' && <MobileAttendanceDemo />}
          {activeView === 'biometric' && <BiometricAttendance />}
          {activeView === 'face' && <FaceRecognitionAttendance />}
          {activeView === 'tracker' && <AttendanceTracker />}
          {activeView === 'config' && <AttendanceSystemConfig onSuccess={fetchAttendanceData} />}
        </>
      )}
    </div>
  )
}

export default Attendance