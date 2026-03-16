import React from 'react'
import { AlertTriangle, Shield, Clock, MapPin, Monitor } from 'lucide-react'
import { SecurityAlert } from '../../types'

interface SecurityAlertsProps {
  alerts: SecurityAlert[]
}

const SecurityAlerts: React.FC<SecurityAlertsProps> = ({ alerts }) => {
  if (!alerts || alerts.length === 0) return null

  const getAlertIcon = (type: SecurityAlert['type']) => {
    switch (type) {
      case 'suspicious_login':
        return <AlertTriangle className="h-4 w-4 text-red-400" />
      case 'new_device':
        return <Monitor className="h-4 w-4 text-yellow-400" />
      case 'password_change':
        return <Shield className="h-4 w-4 text-blue-400" />
      case 'failed_attempts':
        return <AlertTriangle className="h-4 w-4 text-orange-400" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl backdrop-blur-md">
      <div className="flex items-center space-x-2 mb-3">
        <Shield className="h-5 w-5 text-yellow-400" />
        <h4 className="text-yellow-200 font-medium">Security Alerts</h4>
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {alerts.slice(0, 3).map((alert) => (
          <div key={alert.id} className="flex items-start space-x-3 text-sm">
            {getAlertIcon(alert.type)}
            <div className="flex-1 min-w-0">
              <p className="text-yellow-100">{alert.message}</p>
              <div className="flex items-center space-x-3 text-xs text-yellow-300 mt-1">
                <span className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimestamp(alert.timestamp)}</span>
                </span>
                {alert.location && (
                  <span className="flex items-center space-x-1">
                    <MapPin className="h-3 w-3" />
                    <span>{alert.location}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {alerts.length > 3 && (
        <p className="text-xs text-yellow-300 mt-2">
          +{alerts.length - 3} more alerts
        </p>
      )}
    </div>
  )
}

export default SecurityAlerts