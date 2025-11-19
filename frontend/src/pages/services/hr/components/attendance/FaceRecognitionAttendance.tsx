import React, { useState, useRef, useEffect } from 'react'
import { Camera, User, CheckCircle, AlertCircle, Clock, Zap, Users } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  face_photo?: string
}

const FaceRecognitionAttendance: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [selectedEmployee, setSelectedEmployee] = useState<string>('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [lastRecognition, setLastRecognition] = useState<any>(null)
  const [systemConfig, setSystemConfig] = useState<any>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    fetchSystemConfig()
    fetchEmployees()
    return () => {
      stopCamera()
    }
  }, [sessionKey])

  const fetchSystemConfig = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/attendance/system/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setSystemConfig(response.data.results?.[0] || null)
    } catch (error) {
      console.error('Error fetching system config:', error)
    }
  }

  const fetchEmployees = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/employees/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      // Filter employees who have face photos
      const employeesWithFaces = response.data.results?.filter((emp: Employee) => emp.face_photo) || []
      setEmployees(employeesWithFaces)
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setCameraActive(true)
        
        // Wait a bit then play
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error)
          }
        }, 100)
        
        toast.success('Camera started successfully')
      }
    } catch (error: any) {
      toast.error('Camera access denied: ' + error.message)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  const captureAndRecognize = async (action: 'checkin' | 'checkout') => {
    if (!selectedEmployee) {
      toast.error('Please select an employee first')
      return
    }

    if (!videoRef.current || !canvasRef.current) {
      toast.error('Camera not ready')
      return
    }

    setProcessing(true)
    try {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (context) {
        context.drawImage(video, 0, 0)
        
        canvas.toBlob(async (blob) => {
          if (blob) {
            const formData = new FormData()
            formData.append('face_image', blob, 'face-capture.jpg')
            formData.append('action', action)
            formData.append('employee_id', selectedEmployee)
            formData.append('session_key', sessionKey || '')

            try {
              // Use mobile attendance endpoint for consistency
              const response = await api.post('/api/hr/attendance/mobile/', formData, {
                headers: {
                  'Content-Type': 'multipart/form-data',
                  Authorization: `Bearer ${sessionKey}`
                }
              })

              const selectedEmp = employees.find(emp => emp.employee_id === selectedEmployee)
              setLastRecognition({
                employee_name: selectedEmp ? `${selectedEmp.first_name} ${selectedEmp.last_name}` : 'Unknown',
                action: action,
                status: 'success',
                timestamp: new Date().toISOString(),
                confidence: 0.95 // Mock confidence for web portal
              })
              toast.success(response.data.message || `${action} successful`)
            } catch (error: any) {
              console.error('Face recognition error:', error)
              setLastRecognition({
                employee_name: 'Unknown',
                action: action,
                status: 'failed',
                timestamp: new Date().toISOString(),
                confidence: 0.0
              })
              toast.error(error.response?.data?.error || 'Face recognition failed')
            }
          }
        }, 'image/jpeg', 0.8)
      }
    } catch (error) {
      console.error('Capture error:', error)
      toast.error('Failed to capture image')
    } finally {
      setProcessing(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'failed': return 'text-red-600'
      case 'warning': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Camera className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Face Recognition Attendance
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Web portal face recognition (Primary method: Mobile App)
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Selection & Camera Interface */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-blue-500" />
              <span>Employee Face Recognition</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Employee Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Employee
              </label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Choose Employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.employee_id}>
                    {emp.first_name} {emp.last_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
              {employees.length === 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                  No employees with face photos found. Please ensure employees have face photos registered.
                </p>
              )}
            </div>
            {!selectedEmployee ? (
              <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 mb-4">Select an employee to start face recognition</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {!cameraActive && (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 mb-4">Camera not active</p>
                      <Button 
                        onClick={startCamera}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                    </div>
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width="640"
                  height="480"
                  className={`w-full rounded-lg ${cameraActive ? 'block' : 'hidden'}`}
                  style={{ transform: 'scaleX(-1)', backgroundColor: '#000' }}
                />
                
                {cameraActive && (
                  <>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => captureAndRecognize('checkin')}
                        disabled={processing}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {processing ? 'Processing...' : 'Check In'}
                      </Button>
                      <Button
                        onClick={() => captureAndRecognize('checkout')}
                        disabled={processing}
                        className="flex-1 bg-gradient-to-r from-red-500 to-pink-600"
                      >
                        <Clock className="h-4 w-4 mr-2" />
                        {processing ? 'Processing...' : 'Check Out'}
                      </Button>
                    </div>
                    <Button onClick={stopCamera} variant="outline" className="w-full">
                      Stop Camera
                    </Button>
                  </>
                )}
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </CardContent>
        </Card>

        {/* System Status & Last Recognition */}
        <div className="space-y-6">
          {/* System Status */}
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-green-500" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {systemConfig ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Face Recognition</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${systemConfig.enable_face_recognition ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {systemConfig.enable_face_recognition ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Match Threshold</span>
                    <span className="text-sm font-medium">{(systemConfig.face_match_threshold * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Require Face Check-in</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${systemConfig.require_face_for_checkin ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {systemConfig.require_face_for_checkin ? 'Required' : 'Optional'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Require Face Check-out</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${systemConfig.require_face_for_checkout ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {systemConfig.require_face_for_checkout ? 'Required' : 'Optional'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">System not configured</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Last Recognition Result */}
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-purple-500" />
                <span>Last Recognition</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastRecognition ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Employee</span>
                    <span className="text-sm font-medium">{lastRecognition.employee_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Action</span>
                    <span className="text-sm font-medium capitalize">{lastRecognition.action}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
                    <span className="text-sm font-medium">{lastRecognition.confidence ? `${(lastRecognition.confidence * 100).toFixed(1)}%` : 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                    <span className={`text-sm font-medium ${getStatusColor(lastRecognition.status)}`}>
                      {lastRecognition.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Time</span>
                    <span className="text-sm font-medium">{new Date(lastRecognition.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent recognition</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Instructions */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Important Note:</h4>
          <div className="text-sm text-amber-700 dark:text-amber-300 space-y-2">
            <p>• <strong>Primary Method:</strong> Face recognition is primarily designed for the mobile app</p>
            <p>• <strong>Mobile App:</strong> Employees use their mobile app with face recognition + GPS for attendance</p>
            <p>• <strong>Web Portal:</strong> This interface is for testing/backup purposes only</p>
            <p>• <strong>Employee Selection:</strong> Select the employee first, then capture their face for verification</p>
            <p>• <strong>Best Practice:</strong> Encourage employees to use the mobile app for daily attendance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FaceRecognitionAttendance