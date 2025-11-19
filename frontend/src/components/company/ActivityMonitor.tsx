import React from 'react'
import { Activity, Users, Clock, Eye } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ActivityMonitorProps {
  userActivities: any[]
  activityLogs: any[]
  isLoading: boolean
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({
  userActivities,
  activityLogs,
  isLoading
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'login': return '🔐'
      case 'logout': return '🚪'
      case 'create_user': return '👤'
      case 'delete_user': return '🗑️'
      case 'access_service': return '🔧'
      case 'update_settings': return '⚙️'
      case 'upload_logo': return '🖼️'
      case 'change_password': return '🔑'
      default: return '📝'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Loading activity data..." />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Activity Monitor
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Real-time monitoring of your company's user activities and service events only
        </p>
      </div>

      {/* Service User Activities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Service User Activities</span>
          </CardTitle>
          <CardDescription>
            Current status and activity of your company's service users only
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userActivities && userActivities.length > 0 ? (
            <div className="space-y-4">
              {userActivities.map((activity: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-gray-100 dark:bg-gray-900/20'
                    }`}>
                      <Users className={`h-5 w-5 ${
                        activity.status === 'active' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {activity.full_name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {activity.username} • {activity.service_type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Sessions: </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {activity.total_sessions}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Actions: </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {activity.actions_performed}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {activity.last_login ? formatDate(activity.last_login) : 'Never'}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        activity.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {activity.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No user activity data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <span>Recent Activity Logs</span>
          </CardTitle>
          <CardDescription>
            Latest activities and actions from your company users only (excludes master admin)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activityLogs && activityLogs.length > 0 ? (
            <div className="space-y-3">
              {activityLogs.map((log: any, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-2xl">{getActivityIcon(log.action_type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {log.description}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {log.user_email}
                      </span>
                      {log.service_type && (
                        <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 px-2 py-1 rounded">
                          {log.service_type}
                        </span>
                      )}
                      {log.ip_address && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          IP: {log.ip_address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No activity logs available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Eye className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userActivities?.filter(a => a.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Actions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userActivities?.reduce((sum, a) => sum + (a.actions_performed || 0), 0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Recent Events</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {activityLogs?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ActivityMonitor