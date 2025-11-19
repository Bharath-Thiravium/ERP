import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Monitor, Smartphone, Laptop, Trash2, MapPin, Clock, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { apiClient } from '../../../lib/api'
import toast from 'react-hot-toast'

const SessionManagement: React.FC = () => {
  const queryClient = useQueryClient()

  // Fetch active sessions
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['company-sessions'],
    queryFn: () => apiClient.get('/api/company-dashboard/security/sessions/'),
  })

  const sessions = sessionsData?.data || []

  // Terminate session mutation
  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: number) => apiClient.delete(`/api/company-dashboard/security/sessions/${sessionId}/`),
    onSuccess: () => {
      toast.success('Session terminated successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-sessions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to terminate session')
    }
  })

  // Terminate all sessions mutation
  const terminateAllMutation = useMutation({
    mutationFn: () => apiClient.post('/api/company-dashboard/security/sessions/terminate-all/'),
    onSuccess: () => {
      toast.success('All other sessions terminated successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-sessions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to terminate sessions')
    }
  })

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
      terminateSessionMutation.mutate(sessionId)
    }
  }

  const terminateAllSessions = () => {
    if (confirm('Are you sure you want to terminate all other sessions? You will remain logged in on this device.')) {
      terminateAllMutation.mutate()
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
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['company-sessions'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={terminateAllSessions}
              disabled={terminateAllMutation.isPending}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              {terminateAllMutation.isPending ? 'Terminating...' : 'Terminate All Others'}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Loading sessions...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Active Sessions</h3>
              <p className="text-gray-600 dark:text-gray-400">No other active sessions found</p>
            </div>
          ) : (
            sessions.map((session: any) => (
              <div 
                key={session.id} 
                className={`p-4 rounded-lg border ${
                  session.is_current 
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${
                      session.is_current 
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {getDeviceIcon(session.device_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {session.browser} on {session.os}
                        </h4>
                        {session.is_current && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300 text-xs font-medium rounded-full">
                            Current Session
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{session.location || 'Unknown Location'}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <span>IP: {session.ip_address}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>Last active: {new Date(session.last_activity).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {!session.is_current && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => terminateSession(session.id)}
                      disabled={terminateSessionMutation.isPending}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
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