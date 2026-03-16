import React from 'react'
import { Monitor, Smartphone, Shield, MapPin, Clock, Trash2 } from 'lucide-react'
import { DeviceFingerprint } from '../../types'

interface DeviceFingerprintManagerProps {
  devices: DeviceFingerprint[]
  isEnabled: boolean
  onToggleEnabled: (enabled: boolean) => void
  onRemoveDevice: (deviceId: string) => Promise<void>
  onToggleTrust: (deviceId: string, trusted: boolean) => Promise<void>
  isLoading?: boolean
}

const DeviceFingerprintManager: React.FC<DeviceFingerprintManagerProps> = ({
  devices,
  isEnabled,
  onToggleEnabled,
  onRemoveDevice,
  onToggleTrust,
  isLoading = false
}) => {
  const getDeviceIcon = (deviceInfo: string) => {
    const info = deviceInfo.toLowerCase()
    if (info.includes('mobile') || info.includes('android') || info.includes('iphone')) {
      return <Smartphone className="h-5 w-5 text-blue-400" />
    }
    return <Monitor className="h-5 w-5 text-blue-400" />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
              <Monitor className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Device Fingerprinting</h3>
              <p className="text-gray-600 dark:text-gray-400">Track and manage devices accessing the system</p>
            </div>
          </div>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => onToggleEnabled(e.target.checked)}
              disabled={isLoading}
              className="sr-only"
            />
            <div className={`w-12 h-6 rounded-full transition-colors ${
              isEnabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
            }`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                isEnabled ? 'translate-x-6' : 'translate-x-0.5'
              } mt-0.5`} />
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {isEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </div>

        {isEnabled && (
          <>
            <div className="mb-6 p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-blue-700 dark:text-blue-300 text-sm">
                  <p className="font-semibold mb-1">Device Tracking Active</p>
                  <p>New devices will be detected and require additional verification. Trusted devices skip 2FA.</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {devices.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h4 className="text-lg font-semibold mb-2">No devices detected yet</h4>
                  <p className="text-sm">Devices will appear here after login attempts</p>
                </div>
              ) : (
                devices.map((device) => {
                  const deviceIcon = getDeviceIcon(device.device_name)
                  return (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-6 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-xl ${
                          device.is_trusted 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}>
                          {React.cloneElement(deviceIcon, {
                            className: `h-6 w-6 ${
                              device.is_trusted 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`
                          })}
                        </div>
                        <div>
                          <div className="flex items-center space-x-3 mb-1">
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{device.device_name}</p>
                            {device.is_trusted && (
                              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                                Trusted
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{device.browser} on {device.os}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>First seen {formatDate(device.first_seen)}</span>
                            </span>
                            <span>Last seen {formatDate(device.last_seen)}</span>
                            {device.location && (
                              <span className="flex items-center space-x-1">
                                <MapPin className="h-3 w-3" />
                                <span>{device.location}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">IP: {device.ip_address}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => onToggleTrust(device.id, !device.is_trusted)}
                          disabled={isLoading}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                            device.is_trusted
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                          }`}
                        >
                          {device.is_trusted ? 'Untrust' : 'Trust'}
                        </button>
                        <button
                          onClick={() => onRemoveDevice(device.id)}
                          disabled={isLoading}
                          className="p-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default DeviceFingerprintManager