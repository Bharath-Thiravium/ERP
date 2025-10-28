import React, { useState, useEffect } from 'react'
import { Play, Settings, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface ScheduledTask {
  name: string
  schedule: string
  last_run: string
  next_run: string
  status: string
}

interface TaskStatus {
  task_id: string
  status: string
  result: any
}

const AutomationCenter: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([])
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    type: '',
    schedule: ''
  })

  useEffect(() => {
    fetchScheduledTasks()
  }, [sessionKey])

  const fetchScheduledTasks = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/automation/scheduled_tasks/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setScheduledTasks(response.data || [])
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error)
      toast.error('Failed to fetch scheduled tasks')
    }
  }

  const triggerTask = async (taskType: string) => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      let response
      
      switch (taskType) {
        case 'ecr':
          response = await api.post('/api/hr/automation/trigger_ecr_generation/', 
            { session_key: sessionKey },
            { headers: { Authorization: `Bearer ${sessionKey}` } }
          )
          break
        case 'compliance':
          response = await api.post('/api/hr/automation/trigger_compliance_check/', 
            { session_key: sessionKey },
            { headers: { Authorization: `Bearer ${sessionKey}` } }
          )
          break
        default:
          setLoading(false)
          return
      }
      
      if (response.data.task_id) {
        monitorTaskStatus(response.data.task_id)
      }
      
      toast.success(response.data.message || 'Task triggered successfully')
      setLoading(false)
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to trigger task')
      setLoading(false)
    }
  }

  const monitorTaskStatus = async (taskId: string) => {
    try {
      const response = await api.get(`/api/hr/automation/task_status/?task_id=${taskId}&session_key=${sessionKey}`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      const newStatus = response.data
      
      setTaskStatuses(prev => {
        const existing = prev.find(t => t.task_id === taskId)
        if (existing) {
          return prev.map(t => t.task_id === taskId ? newStatus : t)
        } else {
          return [...prev, newStatus]
        }
      })
      
      if (newStatus.status === 'PENDING' || newStatus.status === 'STARTED') {
        setTimeout(() => monitorTaskStatus(taskId), 2000)
      }
    } catch (error) {
      console.error('Error monitoring task status:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': case 'SUCCESS': return 'text-green-600 dark:text-green-400'
      case 'Inactive': case 'FAILURE': return 'text-red-600 dark:text-red-400'
      case 'PENDING': case 'STARTED': return 'text-blue-600 dark:text-blue-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': case 'SUCCESS': return <CheckCircle className="h-4 w-4" />
      case 'Inactive': case 'FAILURE': return <AlertTriangle className="h-4 w-4" />
      case 'PENDING': case 'STARTED': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const createTask = async () => {
    if (!sessionKey || !newTask.name || !newTask.type || !newTask.schedule) {
      toast.error('Please fill all required fields')
      return
    }
    
    try {
      await api.post('/api/hr/automation/create_task/', 
        { ...newTask, session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      
      toast.success('Task created successfully')
      setShowModal(false)
      setNewTask({ name: '', type: '', schedule: '' })
      fetchScheduledTasks()
    } catch (error: any) {
      toast.error('Failed to create task')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Automation Center</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Automated compliance tasks and monitoring</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create New Task
        </Button>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Play className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Generate ECR</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Generate monthly ECR report for PF compliance</p>
              <Button 
                onClick={() => triggerTask('ecr')}
                disabled={loading}
                className="w-full"
              >
                Generate Now
              </Button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Compliance Check</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Run comprehensive compliance validation</p>
              <Button 
                onClick={() => triggerTask('compliance')}
                disabled={loading}
                className="w-full"
              >
                Run Check
              </Button>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Sync Portals</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Synchronize data with government portals</p>
              <Button disabled className="w-full">
                Coming Soon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledTasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Task Name</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Schedule</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Last Run</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Next Run</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left p-3 text-gray-600 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledTasks.map((task, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="p-3 font-medium text-gray-900 dark:text-white">{task.name}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{task.schedule}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {new Date(task.last_run).toLocaleString()}
                      </td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">
                        {new Date(task.next_run).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className={`flex items-center space-x-2 ${getStatusColor(task.status)}`}>
                          {getStatusIcon(task.status)}
                          <span>{task.status}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="ghost">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={task.status === 'Active'} 
                              className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No scheduled tasks configured</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Status Monitor */}
      <Card>
        <CardHeader>
          <CardTitle>Task Status Monitor</CardTitle>
        </CardHeader>
        <CardContent>
          {taskStatuses.length > 0 ? (
            <div className="space-y-3">
              {taskStatuses.map((task) => (
                <div key={task.task_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={getStatusColor(task.status)}>
                      {getStatusIcon(task.status)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Task {task.task_id.substring(0, 8)}...
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {task.result ? JSON.stringify(task.result).substring(0, 50) + '...' : 'No result yet'}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    task.status === 'SUCCESS' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    task.status === 'FAILURE' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No active tasks</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Automated Task</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Name</label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter task name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Type</label>
                <select
                  value={newTask.type}
                  onChange={(e) => setNewTask({ ...newTask, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select task type</option>
                  <option value="compliance_check">Compliance Check</option>
                  <option value="ecr_generation">ECR Generation</option>
                  <option value="esi_return">ESI Return</option>
                  <option value="backup">Data Backup</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule</label>
                <select
                  value={newTask.schedule}
                  onChange={(e) => setNewTask({ ...newTask, schedule: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select schedule</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button onClick={createTask}>
                Create Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AutomationCenter