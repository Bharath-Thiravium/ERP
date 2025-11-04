import React, { useState, useRef, useEffect } from 'react'
import { Camera, MapPin, Clock, User, CheckCircle, AlertCircle, Smartphone } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

const MobileAttendanceDemo: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [location, setLocation] = useState<{latitude: number, longitude: number, address: string} | null>(null)
  const [faceImage, setFaceImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [cameraActive, setCameraActive] = useState(false)

  const [employees, setEmployees] = useState<any[]>([])

  useEffect(() => {
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/hr/employees/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setEmployees(response.data.results || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const getCurrentLocation = () => {
    setGettingLocation(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          
          // Reverse geocoding to get address (using a free service)
          try {
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
            const data = await response.json()
            
            setLocation({
              latitude,
              longitude,
              address: data.locality || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            })
            toast.success('Location captured successfully')
          } catch (error) {
            setLocation({
              latitude,
              longitude,
              address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            })
            toast.success('Location captured successfully')
          }
          setGettingLocation(false)
        },
        (error) => {
          toast.error('Failed to get location: ' + error.message)
          setGettingLocation(false)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    } else {
      toast.error('Geolocation is not supported by this browser')
      setGettingLocation(false)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraActive(true)
        
        // Wait a bit then play
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.play().catch(console.error)
          }
        }, 100)
        
        toast.success('Camera started')
      }
    } catch (error) {
      toast.error('Failed to access camera')
    }
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (context) {
        context.drawImage(video, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'face-capture.jpg', { type: 'image/jpeg' })
            setFaceImage(file)
            setPreviewUrl(URL.createObjectURL(blob))
            
            // Stop camera
            const stream = video.srcObject as MediaStream
            stream?.getTracks().forEach(track => track.stop())
            setCameraActive(false)
            
            toast.success('Photo captured successfully')
          }
        }, 'image/jpeg', 0.8)
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFaceImage(file)
      setPreviewUrl(URL.createObjectURL(file))
      toast.success('Photo uploaded successfully')
    }
  }

  const handleAttendance = async (action: 'checkin' | 'checkout') => {
    if (!selectedEmployee) {
      toast.error('Please select an employee')
      return
    }

    if (!location) {
      toast.error('Please capture location first')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('employee_id', selectedEmployee)
      formData.append('action', action)
      formData.append('latitude', location.latitude.toString())
      formData.append('longitude', location.longitude.toString())
      formData.append('location_name', location.address)
      
      if (faceImage) {
        formData.append('face_image', faceImage)
      }

      const response = await api.post('/api/hr/attendance/mobile/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.success(response.data.message)
      
      // Reset form
      setSelectedEmployee('')
      setLocation(null)
      setFaceImage(null)
      setPreviewUrl(null)
      
    } catch (error: any) {
      console.error('Error submitting attendance:', error)
      toast.error(error.response?.data?.error || 'Failed to submit attendance')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Smartphone className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Mobile Attendance Demo
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Test mobile attendance with face recognition and GPS location
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Selection & Location */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-blue-500" />
              <span>Employee & Location</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Location
                </label>
                <Button
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  variant="outline"
                  size="sm"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  {gettingLocation ? 'Getting...' : 'Get Location'}
                </Button>
              </div>
              
              {location ? (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Location Captured
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {location.address}
                      </p>
                      <p className="text-xs text-green-500 dark:text-green-500 mt-1">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Location not captured yet
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Face Recognition */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Camera className="h-5 w-5 text-purple-500" />
              <span>Face Recognition</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {!cameraActive && !previewUrl && (
                <>
                  <Button
                    onClick={startCamera}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-600"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start Camera
                  </Button>
                  
                  <div className="text-center text-gray-500 dark:text-gray-400">or</div>
                  
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    Upload Photo
                  </Button>
                </>
              )}

              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full rounded-lg ${cameraActive ? 'block' : 'hidden'}`}
                style={{ backgroundColor: '#000' }}
              />
              
              {cameraActive && (
                <Button
                  onClick={capturePhoto}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
                >
                  Capture Photo
                </Button>
              )}

              {previewUrl && (
                <>
                  <img
                    src={previewUrl}
                    alt="Face preview"
                    className="w-full rounded-lg"
                  />
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => {
                        setPreviewUrl(null)
                        setFaceImage(null)
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Retake
                    </Button>
                    <div className="flex items-center space-x-1 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-green-600 dark:text-green-400">Ready</span>
                    </div>
                  </div>
                </>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <canvas ref={canvasRef} className="hidden" />
          </CardContent>
        </Card>
      </div>

      {/* Attendance Actions */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-500" />
            <span>Mark Attendance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleAttendance('checkin')}
              disabled={loading || !selectedEmployee || !location}
              className="h-16 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              <div className="flex flex-col items-center space-y-1">
                <CheckCircle className="h-6 w-6" />
                <span>{loading ? 'Processing...' : 'Check In'}</span>
              </div>
            </Button>
            
            <Button
              onClick={() => handleAttendance('checkout')}
              disabled={loading || !selectedEmployee || !location}
              className="h-16 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700"
            >
              <div className="flex flex-col items-center space-y-1">
                <Clock className="h-6 w-6" />
                <span>{loading ? 'Processing...' : 'Check Out'}</span>
              </div>
            </Button>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Demo Instructions:</h4>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              <li>1. Select an employee from the dropdown</li>
              <li>2. Click "Get Location" to capture GPS coordinates</li>
              <li>3. Take a photo or upload one for face verification</li>
              <li>4. Click "Check In" or "Check Out" to mark attendance</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default MobileAttendanceDemo