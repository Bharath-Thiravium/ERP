import React from 'react'
import { AlertTriangle, Clock, Shield } from 'lucide-react'

interface AccountLockoutWarningProps {
  isLocked: boolean
  remainingAttempts?: number
  lockoutExpiresAt?: string
}

const AccountLockoutWarning: React.FC<AccountLockoutWarningProps> = ({
  isLocked,
  remainingAttempts,
  lockoutExpiresAt
}) => {
  const formatLockoutTime = (expiresAt: string) => {
    const expiry = new Date(expiresAt)
    const now = new Date()
    const diffInMinutes = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60))
    
    if (diffInMinutes <= 0) return 'shortly'
    if (diffInMinutes < 60) return `${diffInMinutes} minutes`
    
    const hours = Math.floor(diffInMinutes / 60)
    const minutes = diffInMinutes % 60
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`
  }

  if (isLocked && lockoutExpiresAt) {
    return (
      <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl backdrop-blur-md">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-red-200">
            <p className="font-medium mb-1">Account Temporarily Locked</p>
            <p className="text-sm">
              Too many failed login attempts. Your account will be unlocked in{' '}
              <span className="font-medium">{formatLockoutTime(lockoutExpiresAt)}</span>.
            </p>
            <div className="flex items-center space-x-1 mt-2 text-xs text-red-300">
              <Clock className="h-3 w-3" />
              <span>For security, please wait before trying again</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (remainingAttempts !== undefined && remainingAttempts !== null && remainingAttempts <= 3) {
    const isUrgent = remainingAttempts <= 1
    const bgColor = isUrgent ? 'bg-red-500/20 border-red-500/30' : 'bg-orange-500/20 border-orange-500/30'
    const textColor = isUrgent ? 'text-red-200' : 'text-orange-200'
    const iconColor = isUrgent ? 'text-red-400' : 'text-orange-400'

    return (
      <div className={`mb-6 p-4 ${bgColor} rounded-2xl backdrop-blur-md`}>
        <div className="flex items-start space-x-3">
          <Shield className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
          <div className={textColor}>
            <p className="font-medium mb-1">Security Warning</p>
            <p className="text-sm">
              {remainingAttempts === 1 
                ? 'Last attempt remaining before account lockout'
                : `${remainingAttempts} attempts remaining before account lockout`
              }
            </p>
            <p className="text-xs mt-1 opacity-80">
              Please ensure you're using the correct credentials
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default AccountLockoutWarning