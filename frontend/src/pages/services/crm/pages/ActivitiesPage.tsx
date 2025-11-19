import React, { useState, useEffect } from 'react'
import { Plus, Search, Calendar, Clock, CheckCircle, Edit, Trash2 } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { crmApi } from '../utils/api'
import { ActivityModal } from '../components/ActivityModal'
import toast from 'react-hot-toast'

interface Activity {
  id: number
  activity_id: string
  subject: string
  activity_type: string
  status: string
  due_date: string
  assigned_to_name?: string
  created_at: string
}

export const ActivitiesPage: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)

  const fetchActivities = async () => {
    if (!sessionKey!) return
    
    try {
      setLoading(true)
      const response = await crmApi.getActivities(sessionKey!)
      setActivities(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching activities:', error)
      toast.error('Failed to fetch activities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [sessionKey])

  const filteredActivities = activities.filter(activity =>
    activity.subject.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    const colors = {
      planned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getActivityTypeColor = (type: string) => {
    const colors = {
      call: 'bg-blue-100 text-blue-800',
      email: 'bg-purple-100 text-purple-800',
      meeting: 'bg-green-100 text-green-800',
      task: 'bg-orange-100 text-orange-800',
      note: 'bg-gray-100 text-gray-800',
      demo: 'bg-pink-100 text-pink-800',
      proposal: 'bg-indigo-100 text-indigo-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleCreateActivity = () => {
    setSelectedActivity(null)
    setShowModal(true)
  }

  const handleEditActivity = (activity: Activity) => {
    setSelectedActivity(activity)
    setShowModal(true)
  }

  const handleDeleteActivity = async (id: number) => {
    if (!sessionKey || !confirm('Are you sure you want to delete this activity?')) return
    
    try {
      await crmApi.deleteActivity(sessionKey!, id)
      toast.success('Activity deleted successfully!')
      fetchActivities()
    } catch (error) {
      console.error('Error deleting activity:', error)
      toast.error('Failed to delete activity')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              Activity Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Track your tasks and activities
            </p>
          </div>
          <Button 
            onClick={handleCreateActivity}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Activities Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredActivities.map((activity) => (
          <div key={activity.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-4 hover:shadow-lg transition-all duration-200 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <div className="h-8 w-8 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                    {activity.subject}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{activity.assigned_to_name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-1 flex-shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => handleEditActivity(activity)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 text-red-600"
                  onClick={() => handleDeleteActivity(activity.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 text-xs rounded-full ${getActivityTypeColor(activity.activity_type)}`}>
                  {activity.activity_type}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(activity.status)}`}>
                  {activity.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                  {new Date(activity.due_date).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                {activity.status === 'completed' && (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                )}
                <span className="text-xs text-gray-500">
                  {new Date(activity.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No activities found</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first activity'}
          </p>
        </div>
      )}

      <ActivityModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSelectedActivity(null)
        }}
        onSuccess={fetchActivities}
        activity={selectedActivity}
      />
    </div>
  )
}