import React, { useState } from 'react'
import { CheckSquare, X, Download } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { JobApplication } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface BulkActionsProps {
  selectedApplications: number[]
  applications: JobApplication[]
  onSuccess: () => void
  onClearSelection: () => void
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedApplications,
  applications,
  onSuccess,
  onClearSelection
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)

  const bulkUpdateStatus = async (newStatus: string) => {
    if (!sessionKey || selectedApplications.length === 0) return

    setLoading(true)
    try {
      const promises = selectedApplications.map(id =>
        api.patch(`/api/hr/job-applications/${id}/`, {
          status: newStatus,
          session_key: sessionKey
        })
      )

      await Promise.all(promises)
      toast.success(`${selectedApplications.length} applications updated to ${newStatus}`)
      onSuccess()
      onClearSelection()
    } catch (error) {
      console.error('Error updating applications:', error)
      toast.error('Failed to update applications')
    } finally {
      setLoading(false)
    }
  }

  const exportApplications = () => {
    const selectedApps = applications.filter(app => selectedApplications.includes(app.id))
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Job Title', 'Status', 'AI Score', 'Applied Date'].join(','),
      ...selectedApps.map(app => [
        `${app.first_name} ${app.last_name}`,
        app.email,
        app.phone,
        app.job_posting_title || '',
        app.status,
        app.ai_score,
        new Date(app.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Applications exported successfully')
  }

  if (selectedApplications.length === 0) return null

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <CheckSquare className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedApplications.length} application(s) selected
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkUpdateStatus('shortlisted')}
            disabled={loading}
            className="text-green-600 border-green-300 hover:bg-green-50"
          >
            Shortlist All
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkUpdateStatus('rejected')}
            disabled={loading}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            Reject All
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={exportApplications}
            className="text-blue-600 border-blue-300 hover:bg-blue-50"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            className="text-gray-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default BulkActions