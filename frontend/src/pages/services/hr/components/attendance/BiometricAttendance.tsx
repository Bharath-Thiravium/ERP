import React, { useState, useEffect } from 'react'
import { Fingerprint, Wifi, WifiOff, CreditCard, User, CheckCircle, AlertCircle, Settings, Zap, Plus } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface BiometricDevice {
  id: string
  device_id: string
  device_name: string
  device_type: 'fingerprint' | 'card_reader' | 'face_scanner'
  name: string
  type: 'fingerprint' | 'card_reader' | 'face_scanner'
  ip_address: string
  port: number
  status: 'online' | 'offline' | 'error'
  is_active: boolean
  last_seen: string
}

const BiometricAttendance: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [devices, setDevices] = useState<BiometricDevice[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState<any>(null)
  const [systemConfig, setSystemConfig] = useState<any>(null)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [newDevice, setNewDevice] = useState({
    device_name: '',
    device_type: 'fingerprint',
    ip_address: '',
    location: ''
  })

  useEffect(() => {
    fetchDevices()
    fetchSystemConfig()
  }, [sessionKey])

  const fetchDevices = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/attendance/biometric-devices/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setDevices(response.data.results || [])
    } catch (error) {
      console.error('Error fetching devices:', error)
    }
  }

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

  const startScanning = async (action: 'checkin' | 'checkout') => {
    if (!selectedDevice) {
      toast.error('Please select a biometric device')
      return
    }

    setScanning(true)
    try {
      const response = await api.post('/api/hr/attendance/biometric-scan/', {
        device_id: selectedDevice,
        action: action,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      setLastScan(response.data)
      toast.success(response.data.message || `${action} successful`)
    } catch (error: any) {
      console.error('Biometric scan error:', error)
      toast.error(error.response?.data?.error || 'Biometric scan failed')
    } finally {
      setScanning(false)
    }
  }

  const testDevice = async (deviceId: string) => {
    try {
      await api.post('/api/hr/attendance/test-device/', {
        device_id: deviceId,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success('Device test successful')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Device test failed')
    }
  }

  const addDevice = async () => {
    if (!newDevice.device_name || !newDevice.ip_address || !newDevice.location) {
      toast.error('Please fill all required fields')
      return
    }

    try {
      await api.post('/api/hr/attendance/biometric-devices/', {
        ...newDevice,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      toast.success('Device added successfully')
      setShowAddDevice(false)
      setNewDevice({
        device_name: '',
        device_type: 'fingerprint',
        ip_address: '',
        location: ''
      })
      fetchDevices()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add device')
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'fingerprint': return <Fingerprint className="h-5 w-5" />
      case 'card_reader': return <CreditCard className="h-5 w-5" />
      case 'face_scanner': return <User className="h-5 w-5" />
      default: return <Fingerprint className="h-5 w-5" />
    }
  }

  const getDeviceColor = (type: string) => {
    switch (type) {
      case 'fingerprint': return 'text-purple-600'
      case 'card_reader': return 'text-blue-600'
      case 'face_scanner': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="h-4 w-4 text-green-500" />
      case 'offline': return <WifiOff className="h-4 w-4 text-red-500" />
      case 'error': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default: return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Fingerprint className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Biometric Attendance
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Fingerprint, card reader, and biometric device management
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Selection & Scanning */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Fingerprint className="h-5 w-5 text-purple-500" />
              <span>Biometric Scanner</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Device
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Choose Biometric Device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.device_id}>
                    {device.device_name} ({device.device_type}) - {device.is_active ? 'Active' : 'Inactive'}
                  </option>
                ))}
              </select>
            </div>

            {selectedDevice && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className={`w-32 h-32 rounded-full border-4 ${scanning ? 'border-purple-500 animate-pulse' : 'border-gray-300'} flex items-center justify-center bg-white dark:bg-gray-700`}>
                      <Fingerprint className={`h-16 w-16 ${scanning ? 'text-purple-500 animate-pulse' : 'text-gray-400'}`} />
                    </div>
                    {scanning && (
                      <div className="absolute inset-0 rounded-full border-4 border-purple-500 animate-ping"></div>
                    )}
                  </div>
                </div>

                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {scanning ? 'Scanning... Place your finger on the scanner' : 'Ready to scan'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => startScanning('checkin')}
                    disabled={scanning}
                    className="bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {scanning ? 'Scanning...' : 'Check In'}
                  </Button>
                  <Button
                    onClick={() => startScanning('checkout')}
                    disabled={scanning}
                    className="bg-gradient-to-r from-red-500 to-pink-600"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {scanning ? 'Scanning...' : 'Check Out'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Status & Last Scan */}
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
                    <span className="text-sm text-gray-600 dark:text-gray-400">Biometric System</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${systemConfig.enable_biometric ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {systemConfig.enable_biometric ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Connected Devices</span>
                    <span className="text-sm font-medium">{devices.filter(d => d.status === 'online').length}/{devices.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">System Type</span>
                    <span className="text-sm font-medium capitalize">{systemConfig.system_type?.replace('_', ' ')}</span>
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

          {/* Last Scan Result */}
          <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-500" />
                <span>Last Scan</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastScan ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Employee</span>
                    <span className="text-sm font-medium">{lastScan.employee_name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Action</span>
                    <span className="text-sm font-medium capitalize">{lastScan.action}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Device</span>
                    <span className="text-sm font-medium">{lastScan.device_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                    <span className={`text-sm font-medium ${lastScan.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                      {lastScan.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Time</span>
                    <span className="text-sm font-medium">{new Date(lastScan.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <Fingerprint className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">No recent scans</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connected Devices */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-gray-500" />
              <span>Connected Devices</span>
            </CardTitle>
            <Button
              onClick={() => setShowAddDevice(true)}
              className="bg-gradient-to-r from-purple-500 to-indigo-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAddDevice && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add New Biometric Device</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Device Name *
                  </label>
                  <input
                    type="text"
                    value={newDevice.device_name}
                    onChange={(e) => setNewDevice({...newDevice, device_name: e.target.value})}
                    placeholder="e.g., Main Entrance Scanner"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Device Type
                  </label>
                  <select
                    value={newDevice.device_type}
                    onChange={(e) => setNewDevice({...newDevice, device_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="fingerprint">Fingerprint Scanner</option>
                    <option value="card_reader">Card Reader</option>
                    <option value="face_scanner">Face Scanner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    IP Address *
                  </label>
                  <input
                    type="text"
                    value={newDevice.ip_address}
                    onChange={(e) => setNewDevice({...newDevice, ip_address: e.target.value})}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={newDevice.location}
                    onChange={(e) => setNewDevice({...newDevice, location: e.target.value})}
                    placeholder="Main Entrance"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-4">
                <Button onClick={addDevice} className="bg-gradient-to-r from-green-500 to-emerald-600">
                  Add Device
                </Button>
                <Button onClick={() => setShowAddDevice(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
          
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <Fingerprint className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Devices Configured</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">Add biometric devices to start using fingerprint attendance</p>
              <Button
                onClick={() => setShowAddDevice(true)}
                className="bg-gradient-to-r from-purple-500 to-indigo-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Device
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.map((device) => (
                <div key={device.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={getDeviceColor(device.type)}>
                        {getDeviceIcon(device.type)}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">{device.name}</span>
                    </div>
                    {getStatusIcon(device.status)}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="capitalize">{device.type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">IP:</span>
                      <span>{device.ip_address}:{device.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className={`capitalize ${device.status === 'online' ? 'text-green-600' : device.status === 'offline' ? 'text-red-600' : 'text-yellow-600'}`}>
                        {device.status}
                      </span>
                    </div>
                  </div>
                  <Button
                    onClick={() => testDevice(device.id)}
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                  >
                    Test Device
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
        <CardContent className="p-4">
          <h4 className="font-medium text-purple-800 dark:text-purple-200 mb-2">Biometric Instructions:</h4>
          <ul className="text-sm text-purple-600 dark:text-purple-400 space-y-1">
            <li>• Select the appropriate biometric device from the dropdown</li>
            <li>• Ensure the device is online and connected</li>
            <li>• Place your finger firmly on the fingerprint scanner</li>
            <li>• For card readers, tap or swipe your access card</li>
            <li>• Wait for the scan to complete before removing finger/card</li>
            <li>• Contact IT support if devices are offline</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default BiometricAttendance