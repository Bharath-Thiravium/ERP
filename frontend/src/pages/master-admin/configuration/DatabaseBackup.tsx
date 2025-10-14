import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Database, 
  Download, 
  RefreshCw, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash2, 
  HardDrive,
  Building2,
  Server,
  Table,
  FileUp,
  RotateCcw,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { apiClient } from '../../../lib/api'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const DatabaseBackup: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showRestoreModal, setShowRestoreModal] = useState(false)
  const [selectedBackupLevel, setSelectedBackupLevel] = useState('system')
  const [selectedBackup, setSelectedBackup] = useState<any>(null)
  const queryClient = useQueryClient()

  // Fetch enhanced backups
  const { data: backupsData, isLoading: backupsLoading } = useQuery({
    queryKey: ['database-backups'],
    queryFn: () => apiClient.get('/api/configuration/backups/'),
    refetchInterval: 10000,
  })

  // Fetch companies for backup selection
  const { data: companiesData } = useQuery({
    queryKey: ['backup-companies'],
    queryFn: () => apiClient.get('/api/configuration/backups/companies/'),
  })

  // Fetch available tables
  const { data: tablesData } = useQuery({
    queryKey: ['available-tables'],
    queryFn: () => apiClient.get('/api/configuration/backups/available_tables/'),
  })

  // Fetch uploads
  const { data: uploadsData } = useQuery({
    queryKey: ['backup-uploads'],
    queryFn: () => apiClient.get('/api/configuration/backup-uploads/'),
  })

  // Fetch restore operations
  const { data: restoreOpsData } = useQuery({
    queryKey: ['restore-operations'],
    queryFn: () => apiClient.get('/api/configuration/restore-operations/'),
  })

  // Fetch backup statistics
  const { data: statsData } = useQuery({
    queryKey: ['backup-statistics'],
    queryFn: () => apiClient.get('/api/configuration/backups/statistics/'),
    refetchInterval: 30000,
  })

  const backups = backupsData?.data?.results || []
  const companies = companiesData?.data || []
  const tables = tablesData?.data || {}
  const uploads = uploadsData?.data?.results || []
  const restoreOps = restoreOpsData?.data?.results || []
  const stats = statsData?.data || {}

  // Create system backup
  const createSystemBackupMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/configuration/backups/create_system_backup/', data),
    onSuccess: () => {
      toast.success('System backup created successfully!')
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-statistics'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create system backup')
    }
  })

  // Create company backup
  const createCompanyBackupMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/configuration/backups/create_company_backup/', data),
    onSuccess: () => {
      toast.success('Company backup created successfully!')
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-statistics'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create company backup')
    }
  })

  // Create service backup
  const createServiceBackupMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/configuration/backups/create_service_backup/', data),
    onSuccess: () => {
      toast.success('Service backup created successfully!')
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-statistics'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create service backup')
    }
  })

  // Create table backup
  const createTableBackupMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/configuration/backups/create_table_backup/', data),
    onSuccess: () => {
      toast.success('Table backup created successfully!')
      queryClient.invalidateQueries({ queryKey: ['database-backups'] })
      queryClient.invalidateQueries({ queryKey: ['backup-statistics'] })
      setShowCreateModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create table backup')
    }
  })

  // Upload backup
  const uploadBackupMutation = useMutation({
    mutationFn: (formData: FormData) => apiClient.post('/api/configuration/backup-uploads/upload_backup/', formData),
    onSuccess: () => {
      toast.success('Backup uploaded successfully!')
      queryClient.invalidateQueries({ queryKey: ['backup-uploads'] })
      setShowUploadModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload backup')
    }
  })

  // Restore from backup
  const restoreBackupMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/api/configuration/restore-operations/restore_from_backup/', data),
    onSuccess: () => {
      toast.success('Restore operation started!')
      queryClient.invalidateQueries({ queryKey: ['restore-operations'] })
      setShowRestoreModal(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to start restore')
    }
  })

  // Delete backup
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
    if (formData.backup_level === 'system') {
      createSystemBackupMutation.mutate(formData)
    } else if (formData.backup_level === 'company') {
      createCompanyBackupMutation.mutate(formData)
    } else if (formData.backup_level === 'service') {
      createServiceBackupMutation.mutate(formData)
    } else if (formData.backup_level === 'table') {
      createTableBackupMutation.mutate(formData)
    }
  }

  const handleUploadBackup = (formData: FormData) => {
    uploadBackupMutation.mutate(formData)
  }

  const handleRestoreBackup = (backup: any) => {
    const warnings = [
      `⚠️ CRITICAL WARNING: RESTORE FROM "${backup.name}"`,
      '',
      '🚨 THIS WILL PERMANENTLY DELETE CURRENT DATA',
      '🚨 ALL RECENT TRANSACTIONS WILL BE LOST',
      '🚨 THIS ACTION CANNOT BE UNDONE',
      '',
      `📅 Backup Date: ${new Date(backup.created_at).toLocaleString()}`,
      `💾 Backup Size: ${backup.file_size_mb || 'Unknown'} MB`,
      `🏢 Scope: ${backup.scope_display || backup.backup_level}`,
      '',
      '⚡ RECOMMENDATION: Create a current backup first!',
      '',
      'Type "RESTORE" to confirm this dangerous operation:'
    ].join('\n')
    
    const confirmation = window.prompt(warnings)
    
    if (confirmation === 'RESTORE') {
      const finalConfirm = window.confirm(
        '🔥 FINAL CONFIRMATION: You typed RESTORE.\n\n' +
        'This will DESTROY current data and replace it with backup data.\n\n' +
        'Click OK to proceed with data destruction.'
      )
      
      if (finalConfirm) {
        setSelectedBackup(backup)
        setShowRestoreModal(true)
      }
    } else if (confirmation !== null) {
      toast.error('Restore cancelled - you must type "RESTORE" exactly to confirm')
    }
  }

  const handleDownloadBackup = async (backup: any) => {
    try {
      const token = sessionStorage.getItem('_at')
      if (!token) {
        toast.error('Authentication required')
        return
      }

      const decryptedToken = atob(token)

      const response = await fetch(`/api/configuration/backups/${backup.id}/download/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${decryptedToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = backup.file_path ? backup.file_path.split('/').pop() : `backup_${backup.id}.sql`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast.success('Backup downloaded successfully!')
    } catch (error: any) {
      toast.error('Failed to download backup')
    }
  }

  const handleDeleteBackup = (backup: any) => {
    if (window.confirm(`Are you sure you want to delete backup "${backup.name}"?`)) {
      deleteBackupMutation.mutate(backup.id)
    }
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

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'system':
        return <Database className="h-4 w-4 text-purple-500" />
      case 'company':
        return <Building2 className="h-4 w-4 text-blue-500" />
      case 'service':
        return <Server className="h-4 w-4 text-green-500" />
      case 'table':
        return <Table className="h-4 w-4 text-orange-500" />
      default:
        return <Database className="h-4 w-4 text-gray-500" />
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

      {/* Enhanced Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Backup
        </Button>
        <Button
          onClick={() => setShowUploadModal(true)}
          variant="outline"
        >
          <FileUp className="h-4 w-4 mr-2" />
          Upload Backup
        </Button>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['database-backups'] })}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Backup Level Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { value: 'all', label: 'All Backups', icon: Database },
            { value: 'system', label: 'System', icon: Database },
            { value: 'company', label: 'Company', icon: Building2 },
            { value: 'service', label: 'Service', icon: Server },
            { value: 'table', label: 'Table', icon: Table }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedBackupLevel(value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedBackupLevel === value
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Enhanced Backups List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Enhanced Database Backups
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
            {backups
              .filter((backup: any) => selectedBackupLevel === 'all' || backup.backup_level === selectedBackupLevel)
              .map((backup: any) => (
              <div key={backup.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 flex items-center space-x-2">
                      {getLevelIcon(backup.backup_level)}
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
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                          {backup.backup_level}
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
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-medium">Scope:</span> {backup.scope_display || backup.backup_level}
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
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          <RotateCcw className="h-4 w-4" />
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

      {/* Uploaded Backups Section */}
      {uploads.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileUp className="h-5 w-5 text-green-500" />
              Uploaded Backups
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {uploads.map((upload: any) => (
              <div key={upload.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <FileUp className="h-5 w-5 text-green-500" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {upload.name}
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Status: {upload.status} | Size: {Math.round(upload.file_size / (1024 * 1024))} MB
                      </div>
                    </div>
                  </div>
                  {upload.status === 'ready' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        restoreBackupMutation.mutate({
                          upload_id: upload.id,
                          restore_type: 'full_replace'
                        })
                      }}
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restore Operations Section */}
      {restoreOps.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-orange-500" />
              Restore Operations
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {restoreOps.map((restoreOp: any) => (
              <div key={restoreOp.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <RotateCcw className="h-5 w-5 text-orange-500" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {restoreOp.name}
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Status: {restoreOp.status} | Type: {restoreOp.restore_type}
                        {restoreOp.progress_percentage > 0 && (
                          <span> | Progress: {restoreOp.progress_percentage}%</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {restoreOp.status === 'completed' && restoreOp.pre_restore_backup && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to rollback this restore operation?')) {
                          apiClient.post(`/api/configuration/restore-operations/${restoreOp.id}/rollback/`)
                            .then(() => {
                              toast.success('Rollback initiated')
                              queryClient.invalidateQueries({ queryKey: ['restore-operations'] })
                            })
                            .catch(() => toast.error('Rollback failed'))
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Rollback
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateBackupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateBackup}
          companies={companies}
          tables={tables}
          isLoading={createSystemBackupMutation.isPending || createCompanyBackupMutation.isPending || createServiceBackupMutation.isPending || createTableBackupMutation.isPending}
        />
      )}

      {showUploadModal && (
        <UploadBackupModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUploadBackup}
          isLoading={uploadBackupMutation.isPending}
        />
      )}

      {showRestoreModal && selectedBackup && (
        <RestoreModal
          isOpen={showRestoreModal}
          onClose={() => {
            setShowRestoreModal(false)
            setSelectedBackup(null)
          }}
          backup={selectedBackup}
          onSubmit={(data) => restoreBackupMutation.mutate(data)}
          isLoading={restoreBackupMutation.isPending}
        />
      )}
    </div>
  )
}

// Enhanced Create Backup Modal
const CreateBackupModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  companies: any[]
  tables: any
  isLoading: boolean
}> = ({ isOpen, onClose, onSubmit, companies, tables, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    backup_level: 'system',
    backup_type: 'full',
    service_type: '',
    company_id: '',
    selected_tables: [] as string[],
    compression: 'gzip'
  })

  // Reset dependent fields when backup level changes
  const handleBackupLevelChange = (level: string) => {
    setFormData({
      ...formData,
      backup_level: level,
      company_id: level === 'system' ? '' : formData.company_id,
      service_type: level === 'service' ? '' : level === 'system' ? 'all' : formData.service_type,
      selected_tables: level === 'table' ? [] : formData.selected_tables
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation for service backup
    if (formData.backup_level === 'service') {
      if (!formData.company_id) {
        alert('Please select a company for service backup')
        return
      }
      if (!formData.service_type) {
        alert('Please select a service for service backup')
        return
      }
    }
    
    // Validation for table backup
    if (formData.backup_level === 'table' && formData.selected_tables.length === 0) {
      alert('Please select at least one table for table backup')
      return
    }
    
    onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Create Enhanced Backup
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
              Backup Level
            </label>
            <select
              value={formData.backup_level}
              onChange={(e) => handleBackupLevelChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="system">Complete System (All Data)</option>
              <option value="company">Company Data (Single Company)</option>
              <option value="service">Service Data (Company + Service)</option>
              <option value="table">Specific Tables (Custom Selection)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.backup_level === 'system' && 'Backup entire database including all companies and services'}
              {formData.backup_level === 'company' && 'Backup all data for a specific company across all services'}
              {formData.backup_level === 'service' && 'Backup specific service data for a selected company'}
              {formData.backup_level === 'table' && 'Backup selected tables with optional company filtering'}
            </p>
          </div>

          {formData.backup_level === 'company' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Company
              </label>
              <select
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {formData.backup_level === 'service' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Company *
                </label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Service *
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select a service</option>
                  <option value="finance">Finance Service</option>
                  <option value="hr">HR Service</option>
                  <option value="inventory">Inventory Service</option>
                </select>
              </div>
            </>
          )}

          {formData.backup_level === 'table' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Company (Optional)
                </label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All companies (system-wide)</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name} (company-specific data)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Select a company to backup only that company's data from selected tables
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Tables *
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                  {Object.entries(tables).map(([service, serviceTables]: [string, any]) => (
                    <div key={service} className="mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white capitalize">{service}</h4>
                      {serviceTables.map((table: string) => (
                        <label key={table} className="flex items-center space-x-2 ml-4">
                          <input
                            type="checkbox"
                            checked={formData.selected_tables.includes(table)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selected_tables: [...formData.selected_tables, table]
                                })
                              } else {
                                setFormData({
                                  ...formData,
                                  selected_tables: formData.selected_tables.filter(t => t !== table)
                                })
                              }
                            }}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">{table}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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

// Upload Backup Modal
const UploadBackupModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: FormData) => void
  isLoading: boolean
}> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    const formData = new FormData()
    formData.append('backup_file', file)
    formData.append('name', name || file.name)
    
    onSubmit(formData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Upload Backup File
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Backup Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter backup name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Backup File (.sql or .sql.gz)
            </label>
            <input
              type="file"
              accept=".sql,.gz"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
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
              disabled={isLoading || !file}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4 mr-2" />
                  Upload Backup
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Restore Modal
const RestoreModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  backup: any
  onSubmit: (data: any) => void
  isLoading: boolean
}> = ({ isOpen, onClose, backup, onSubmit, isLoading }) => {
  const [restoreType, setRestoreType] = useState('full_replace')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      backup_id: backup.id,
      restore_type: restoreType
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Restore Configuration
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-800 dark:text-red-200">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Warning</span>
            </div>
            <p className="text-red-700 dark:text-red-300 text-sm mt-1">
              This will overwrite existing data. A pre-restore backup will be created for rollback.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Restore Type
            </label>
            <select
              value={restoreType}
              onChange={(e) => setRestoreType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="full_replace">Full Replace</option>
              <option value="selective_merge">Selective Merge</option>
              <option value="company_only">Company Data Only</option>
              <option value="service_only">Service Data Only</option>
            </select>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Backup Details</h4>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              <p>Name: {backup.name}</p>
              <p>Level: {backup.backup_level}</p>
              <p>Size: {backup.file_size_mb} MB</p>
              <p>Created: {new Date(backup.created_at).toLocaleString()}</p>
            </div>
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
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Start Restore
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