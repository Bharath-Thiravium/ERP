import React from 'react'
import { X, Zap, Activity, Settings } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'

interface WorkflowViewModalProps {
  isOpen: boolean
  onClose: () => void
  workflow: any
}

export const WorkflowViewModal: React.FC<WorkflowViewModalProps> = ({ 
  isOpen, 
  onClose, 
  workflow 
}) => {
  if (!isOpen || !workflow) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'draft': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {workflow.name}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusColor(workflow.status)} text-white`}>
                {workflow.status}
              </span>
              <span className="text-sm text-gray-600">
                {workflow.trigger_type_display || 'Automation Workflow'}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Trigger Type</p>
                  <p className="text-sm text-gray-600">
                    {workflow.trigger_type_display || workflow.trigger_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">Trigger Conditions</p>
                  <p className="text-sm text-gray-600">
                    {Object.keys(workflow.trigger_conditions || {}).length > 0 
                      ? JSON.stringify(workflow.trigger_conditions, null, 2)
                      : 'No specific conditions'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Performance Metrics
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Triggered</span>
                    <span className="text-sm font-medium">{workflow.total_triggered || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Completed</span>
                    <span className="text-sm font-medium">{workflow.total_completed || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-sm font-medium">{Number(workflow.completion_rate || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {workflow.description && (
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                {workflow.description}
              </p>
            </div>
          )}

          {workflow.actions && workflow.actions.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Workflow Actions</h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <pre className="text-sm text-gray-600 whitespace-pre-wrap">
                  {JSON.stringify(workflow.actions, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-4 border-t border-gray-200">
            Created: {new Date(workflow.created_at).toLocaleDateString()}
          </div>
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}