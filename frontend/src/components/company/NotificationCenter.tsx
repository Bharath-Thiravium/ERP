import React from 'react'
import { Bell, AlertCircle, Info, CheckCircle, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface NotificationCenterProps {
  notifications: any[]
  isLoading: boolean
  onMarkAsRead: (notificationId: number) => void
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  isLoading,
  onMarkAsRead
}) => {
  const getNotificationIcon = (type: string, priority: string) => {
    if (priority === 'critical' || priority === 'high') {
      return <AlertCircle className="h-5 w-5 text-red-500" />
    }
    
    switch (type) {
      case 'service_update':
        return <Info className="h-5 w-5 text-blue-500" />
      case 'user_activity':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'system_alert':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'maintenance':
        return <Clock className="h-5 w-5 text-purple-500" />
      case 'security':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10'
      case 'medium':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10'
      case 'low':
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10'
      default:
        return 'border-l-gray-300 bg-gray-50 dark:bg-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Loading notifications..." />
      </div>
    )
  }

  const unreadNotifications = notifications?.filter(n => !n.read) || []
  const readNotifications = notifications?.filter(n => n.read) || []

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notification Center
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Stay updated with system alerts and important information
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {unreadNotifications.length} unread
          </span>
          {unreadNotifications.length > 0 && (
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          )}
        </div>
      </div>

      {/* Unread Notifications */}
      {unreadNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-6 w-6 text-red-600 dark:text-red-400" />
              <span>Unread Notifications ({unreadNotifications.length})</span>
            </CardTitle>
            <CardDescription>
              New notifications requiring your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unreadNotifications.map((notification: any) => (
                <div
                  key={notification.id}
                  className={`border-l-4 p-4 rounded-lg ${getPriorityColor(notification.priority)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification.type, notification.priority)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            notification.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            notification.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            notification.priority === 'medium' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {notification.priority}
                          </span>
                          {notification.service_type && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 rounded-full text-xs font-medium">
                              {notification.service_type}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatDate(notification.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkAsRead(notification.id)}
                      className="ml-4"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Read
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Read Notifications */}
      {readNotifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              <span>Read Notifications</span>
            </CardTitle>
            <CardDescription>
              Previously viewed notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {readNotifications.slice(0, 10).map((notification: any) => (
                <div
                  key={notification.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg opacity-75"
                >
                  {getNotificationIcon(notification.type, notification.priority)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                        {notification.title}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(notification.read_at || notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notification.message}
                    </p>
                  </div>
                </div>
              ))}
              {readNotifications.length > 10 && (
                <div className="text-center py-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    +{readNotifications.length - 10} more notifications
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {(!notifications || notifications.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You're all caught up! No new notifications at this time.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Notification Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {notifications?.filter(n => n.priority === 'critical').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">High</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {notifications?.filter(n => n.priority === 'high').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Info className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Medium</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {notifications?.filter(n => n.priority === 'medium').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Low</p>
                <p className="font-bold text-gray-900 dark:text-white">
                  {notifications?.filter(n => n.priority === 'low').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default NotificationCenter