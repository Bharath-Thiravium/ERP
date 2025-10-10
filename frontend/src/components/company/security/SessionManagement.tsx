import React, { useState } from 'react'
import { Monitor, Smartphone, Laptop, Trash2, MapPin, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'

const SessionManagement: React.FC = () => {
  const [sessions] = useState([
    {
      id: 1,
      deviceType: 'desktop',
      browser: 'Chrome 120.0',
      os: 'Windows 11',
      ipAddress: '192.168.1.100',
      location: 'New York, US',
      lastActive: '2024-01-15T14:30:00Z',
      isCurrent: true
    },
    {
      id: 2,
      deviceType: 'mobile',
      browser: 'Safari 17.0',
      os: 'iOS 17.2',
      ipAddress: '203.0.113.45',
      location: 'San Francisco, US',
      lastActive: '2024-01-15T12:15:00Z',
      isCurrent: false
    }
  ])

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />
      case 'desktop':
        return <Monitor className="h-5 w-5" />
      default:
        return <Laptop className="h-5 w-5" />
    }
  }

  const terminateSession = (sessionId: number) => {
    if (confirm('Are you sure you want to terminate this session?')) {
      // API call to terminate session
      console.log('Terminating session:', sessionId)
    }
  }

  const terminateAllSessions = () => {
    if (confirm('Are you sure you want to terminate all other sessions? You will remain logged in on this device.')) {
      // API call to terminate all other sessions
      console.log('Terminating all other sessions')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Monitor className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span>Active Sessions</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={terminateAllSessions}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Terminate All Others
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              className={`p-4 rounded-lg border ${
                session.isCurrent 
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    session.isCurrent 
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {session.browser} on {session.os}
                      </h4>
                      {session.isCurrent && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 text-xs font-medium rounded-full">
                          Current Session
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3" />
                          <span>{session.location}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>IP: {session.ipAddress}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>Last active: {new Date(session.lastActive).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {!session.isCurrent && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => terminateSession(session.id)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Session Security</h4>
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p>• Sessions automatically expire after 1 hour of inactivity</p>
            <p>• Maximum of 5 concurrent sessions allowed</p>
            <p>• Suspicious login attempts are automatically blocked</p>
            <p>• All session activity is logged for security auditing</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SessionManagement