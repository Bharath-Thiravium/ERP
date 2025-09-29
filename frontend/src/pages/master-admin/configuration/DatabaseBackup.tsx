import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Play, 
  Trash2, 
  Eye,
  HardDrive,
  Server,
  FileText,
  Settings
} from 'lucide-react'
import { apiClient } from '../../../lib/api'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const DatabaseBackup: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch backups
  const { data: backupsData, isLoading: backupsLoading } = useQuery({
    queryKey: ['database-backups'],
    queryFn: () => apiClient.get('/api/configuration/backups/'),
    refetchInterval: 10000,
  })

  // Fetch backup schedules
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['backup-schedules'],
    queryFn: () => apiClient.get('/api/configuration/backup-schedules/'),
  })

  // Fetch backup statistics
  const { data: statsData } = useQuery({
    queryKey: ['backup-statistics'],
    queryFn: () => apiClient.get('/api/configuration/backups/statistics/'),
    refetchInterval: 30000,
  })

  const backups = backupsData?.data?.results || []
  const schedules = schedulesData?.data?.results || []
  const stats = statsData?.data || {}

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/configuration/backups/create_backup/', data),
    onSuccess: () => {
      toast.success('Backup created successfully!')
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-statistics'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create backup')
    }
  })

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (backupId: string) => apiClient.post(`/api/configuration/backups/${backupId}/restore/`),
    onSuccess: () => {
      toast.success('Database restored successfully!')
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to restore backup')
    }
  })

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: (backupId: string) => apiClient.delete(`/api/configuration/backups/${backupId}/`),
    onSuccess: () => {
      toast.success('Backup deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-statistics'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete backup')
    }
  })

  const handleCreateBackup = (formData: any) => {
    createBackupMutation.mutate(formData)
  }

  const handleRestoreBackup = (backup: any) => {
    if (window.confirm(`Are you sure you want to restore from "${backup.name}"? This will overwrite the current database.`)) {
      restoreBackupMutation.mutate(backup.id)
    }
  }

  const handleDeleteBackup = (backup: any) => {
    if (window.confirm(`Are you sure you want to delete backup "${backup.name}"?`)) {
      deleteBackupMutation.mutate(backup.id)
    }
  }

  const handleDownloadBackup = (backup: any) => {
    window.open(`/api/configuration/backups/${backup.id}/download/`, '_blank')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
      case 'running':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
      default:
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Backup Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Backups</h3>
            <Database className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {stats.total_backups || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-green-700 dark:text-green-300">Successful</h3>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {stats.successful_backups || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl p-6 border border-red-200 dark:border-red-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-red-700 dark:text-red-300">Failed</h3>
            <XCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-900 dark:text-red-100">
            {stats.failed_backups || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Size</h3>
            <HardDrive className="h-5 w-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {stats.total_size_mb || 0}
          </p>
          <p className="text-sm text-purple-600 dark:text-purple-400">MB</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Backup
        </Button>
        <Button
          onClick={() => setShowScheduleModal(true)}
          variant="outline"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Backup
        </Button>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['database-backups'] })}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Backups List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-500" />
            Database Backups
          </h3>
        </div>

        {backupsLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No backups found</h3>
            <p className="text-gray-600 dark:text-gray-400">Create your first backup to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {backups.map((backup: any) => (
              <div key={backup.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getStatusIcon(backup.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-1">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          {backup.name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                          {backup.status}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {backup.backup_type}
                        </span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>Created: {new Date(backup.created_at).toLocaleString()}</span>
                        </span>
                        {backup.file_size_mb && (
                          <span className="flex items-center space-x-1">
                            <HardDrive className="h-3 w-3" />
                            <span>Size: {backup.file_size_mb} MB</span>
                          </span>
                        )}
                        {backup.duration && (
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>Duration: {backup.duration}</span>
                          </span>
                        )}
                      </div>
                      {backup.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {backup.description}
                        </p>
                      )}
                      {backup.error_message && (
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                          Error: {backup.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {backup.status === 'completed' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadBackup(backup)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreBackup(backup)}
                          disabled={restoreBackupMutation.isPending}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteBackup(backup)}
                      disabled={deleteBackupMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backup Schedules */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            Backup Schedules
          </h3>
        </div>

        {schedulesLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No schedules found</h3>
            <p className="text-gray-600 dark:text-gray-400">Set up automated backup schedules</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {schedules.map((schedule: any) => (
              <div key={schedule.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${schedule.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {schedule.name}
                      </h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>{schedule.frequency} at {schedule.time}</span>
                        <span>{schedule.backup_type} backup</span>
                        <span>Retention: {schedule.retention_days} days</span>
                      </div>
                      {schedule.last_run && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last run: {new Date(schedule.last_run).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Run schedule now
                        apiClient.post(`/api/configuration/backup-schedules/${schedule.id}/run_now/`)
                          .then(() => {
                            toast.success('Backup started')
                            queryClient.invalidateQueries({ queryKey: ['database-backups'] })
                          })
                          .catch(() => toast.error('Failed to start backup'))
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Backup Modal */}
      {showCreateModal && (
        <CreateBackupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateBackup}
          isLoading={createBackupMutation.isPending}
        />
      )}
    </div>
  )
}

// Create Backup Modal Component
const CreateBackupModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  isLoading: boolean
}> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    backup_type: 'full',
    description: '',
    compression: 'gzip'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Create Database Backup
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Backup Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter backup name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Backup Type
            </label>
            <select
              value={formData.backup_type}
              onChange={(e) => setFormData({ ...formData, backup_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="full">Full Backup</option>
              <option value="schema">Schema Only</option>
              <option value="data">Data Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Enter backup description"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Create Backup
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DatabaseBackup