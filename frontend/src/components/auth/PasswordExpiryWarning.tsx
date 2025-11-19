import React from 'react'
import { Clock, AlertTriangle, Key } from 'lucide-react'

interface PasswordExpiryWarningProps {
  expiresInDays?: number
  expiresAt?: string
}

const PasswordExpiryWarning: React.FC<PasswordExpiryWarningProps> = ({
  expiresInDays,
  expiresAt
}) => {
  if (expiresInDays === undefined || expiresInDays === null) return null
  
  // Show warning for any password that expires within 30 days or is already expired
  if (expiresInDays > 30) return null

  const isUrgent = expiresInDays <= 3
  const isExpired = expiresInDays <= 0
  
  const bgColor = isExpired 
    ? 'bg-red-500/20 border-red-500/30' 
    : isUrgent 
    ? 'bg-orange-500/20 border-orange-500/30'
    : 'bg-yellow-500/20 border-yellow-500/30'
    
  const textColor = isExpired 
    ? 'text-red-200' 
    : isUrgent 
    ? 'text-orange-200'
    : 'text-yellow-200'
    
  const iconColor = isExpired 
    ? 'text-red-400' 
    : isUrgent 
    ? 'text-orange-400'
    : 'text-yellow-400'

  const formatExpiryDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getMessage = () => {
    if (isExpired) {
      return 'Your password has expired and must be changed'
    }
    if (expiresInDays === 1) {
      return 'Your password expires tomorrow'
    }
    return `Your password expires in ${expiresInDays} days`
  }

  return (
    <div className={`mb-6 p-4 ${bgColor} rounded-2xl backdrop-blur-md`}>
      <div className="flex items-start space-x-3">
        {isExpired ? (
          <AlertTriangle className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
        ) : (
          <Clock className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
        )}
        <div className={textColor}>
          <p className="font-medium mb-1">
            {isExpired ? 'Password Expired' : 'Password Expiry Warning'}
          </p>
          <p className="text-sm mb-2">{getMessage()}</p>
          {expiresAt && (
            <p className="text-xs opacity-80">
              {isExpired ? 'Expired on' : 'Expires on'} {formatExpiryDate(expiresAt)}
            </p>
          )}
          <div className="flex items-center space-x-1 mt-2 text-xs">
            <Key className="h-3 w-3" />
            <span>
              {isExpired 
                ? 'You will be prompted to change it after login'
                : 'Consider changing your password soon'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PasswordExpiryWarning