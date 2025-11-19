import React from 'react'
import { Monitor, Shield, Check } from 'lucide-react'

interface TrustedDeviceOptionProps {
  isTrustedDevice: boolean
  onToggleTrustedDevice: (trusted: boolean) => void
  disabled?: boolean
}

const TrustedDeviceOption: React.FC<TrustedDeviceOptionProps> = ({
  isTrustedDevice,
  onToggleTrustedDevice,
  disabled = false
}) => {
  return (
    <div className="mb-6">
      <label className="flex items-start space-x-3 cursor-pointer group">
        <div className="relative mt-1">
          <input
            type="checkbox"
            checked={isTrustedDevice}
            onChange={(e) => onToggleTrustedDevice(e.target.checked)}
            disabled={disabled}
            className="sr-only"
          />
          <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            isTrustedDevice
              ? 'bg-blue-500 border-blue-500'
              : 'border-white/30 group-hover:border-white/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isTrustedDevice && <Check className="h-3 w-3 text-white" />}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Monitor className="h-4 w-4 text-blue-400" />
            <span className="text-white font-medium text-sm">Trust this device for 30 days</span>
          </div>
          <p className="text-gray-300 text-xs leading-relaxed">
            Skip 2FA verification on this device for 30 days. Only enable on your personal, secure devices.
          </p>
          <div className="flex items-center space-x-1 mt-2 text-xs text-gray-400">
            <Shield className="h-3 w-3" />
            <span>No 2FA codes required for 30 days on this device</span>
          </div>
        </div>
      </label>
    </div>
  )
}

export default TrustedDeviceOption