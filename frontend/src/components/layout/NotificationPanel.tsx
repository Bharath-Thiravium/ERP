import React from 'react'
import { X, Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiClient } from '../../lib/api'
import { Button } from '../ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import { getRelativeTime } from '../../lib/utils'

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  notifications: any[]
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
}) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds: number[]) => 
      apiClient.markNotificationsAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Notifications marked as read')
    },
    onError: () => {
      toast.error('Failed to mark notifications as read')
    },
  })

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate([notificationId])
  }

  const handleMarkAllAsRead = () => {
    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id)

    if (unreadIds.length > 0) {
      markAsReadMutation.mutate(unreadIds)
    }
  }

  const handleNotificationClick = (notification: any) => {
    // Mark as read first
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }

    // Navigate based on notification type
    if (notification.notification_type === 'company_registration' && notification.company_id) {
      // Navigate to master admin dashboard with companies section and highlight the company
      navigate(`/master-admin?section=companies&highlight=${notification.company_id}`)
      onClose()
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company_approval_request':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'company_approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'company_rejected':
        return <X className="h-5 w-5 text-red-500" />
      case 'system_alert':
        return <AlertTriangle className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Panel */}
        <section className="absolute inset-y-0 right-0 pl-10 max-w-full flex">
          <div className="w-screen max-w-md">
            <Card className="h-full flex flex-col shadow-xl" variant="elevated">
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    <CardTitle>Notifications</CardTitle>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                
                {notifications.length > 0 && (
                  <div className="flex justify-between items-center pt-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {notifications.filter(n => !n.is_read).length} unread
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleMarkAllAsRead}
                      disabled={markAsReadMutation.isPending}
                    >
                      Mark all as read
                    </Button>
                  </div>
                )}
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto p-0">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6">
                    <Bell className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No notifications
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      You're all caught up! New notifications will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                          !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            {getTypeIcon(notification.notification_type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {notification.title}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </span>
                            </div>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                {getRelativeTime(notification.created_at)}
                              </p>
                              
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  disabled={markAsReadMutation.isPending}
                                  className="text-xs"
                                >
                                  Mark as read
                                </Button>
                              )}
                            </div>
                            
                            {/* Additional metadata */}
                            {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                                {notification.metadata.company_name && (
                                  <p><strong>Company:</strong> {notification.metadata.company_name}</p>
                                )}
                                {notification.metadata.service_name && (
                                  <p><strong>Service:</strong> {notification.metadata.service_name}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}

export default NotificationPanel
