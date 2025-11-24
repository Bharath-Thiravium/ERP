import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Settings, Plus, Trash2, FileText, X, Save
} from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import toast from 'react-hot-toast'

const Configuration: React.FC = () => {
  const queryClient = useQueryClient()
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['form-templates'],
    queryFn: () => apiClient.get('/api/hr/form-templates/')
  })

  // Create common templates mutation
  const createCommonTemplatesMutation = useMutation({
    mutationFn: () => apiClient.post('/api/hr/form-templates/create_common_templates/'),
    onSuccess: () => {
      toast.success('Common templates created successfully!')
      queryClient.invalidateQueries({ queryKey: ['form-templates'] })
      queryClient.invalidateQueries({ queryKey: ['active-templates'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create templates')
    }
  })

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      apiClient.put(`/api/hr/form-templates/${id}/`, data),
    onSuccess: () => {
      toast.success('Template updated successfully!')
      setShowScheduleModal(false)
      setSelectedTemplate(null)
      queryClient.invalidateQueries({ queryKey: ['form-templates'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update template')
    }
  })

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/hr/form-templates/${id}/`),
    onSuccess: () => {
      toast.success('Template deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['form-templates'] })
      queryClient.invalidateQueries({ queryKey: ['active-templates'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-forms-current'] })
      queryClient.invalidateQueries({ queryKey: ['monthly-forms-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete template')
    }
  })

  const handleScheduleUpdate = () => {
    if (!selectedTemplate) return
    
    updateTemplateMutation.mutate({
      id: selectedTemplate.id,
      data: {
        generation_day: selectedTemplate.generation_day,
        is_monthly_auto_generate: selectedTemplate.is_monthly_auto_generate,
        is_active: selectedTemplate.is_active
      }
    })
  }

  const getFormTypeIcon = (formType: string) => {
    switch (formType) {
      case 'register_of_fines': return '💰'
      case 'register_of_workmen': return '👥'
      case 'custom_template': return '📄'
      default: return '📋'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Build custom compliance form templates from scratch
        </p>
      </div>

      {/* Templates List */}
      <Card>
        <CardHeader>
          <CardTitle>Form Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : (
            <div className="space-y-4">
              {templates?.data?.results?.map((template: any) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">{getFormTypeIcon(template.form_type)}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {template.template_name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Type: {template.form_type.replace('_', ' ').toUpperCase()}
                          {template.template_file && ` • File: ${template.file_type?.toUpperCase()}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          Generate on: Day {template.generation_day} of each month
                          {template.can_generate_today && (
                            <span className="ml-2 text-green-600">• Can generate today</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {template.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template)
                          setShowScheduleModal(true)
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this template?')) {
                            deleteTemplateMutation.mutate(template.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {(!templates?.data?.results || templates.data.results.length === 0) && (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No templates found</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Create common compliance templates for your company.
                  </p>
                  <Button
                    onClick={() => createCommonTemplatesMutation.mutate()}
                    disabled={createCommonTemplatesMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createCommonTemplatesMutation.isPending ? 'Creating...' : 'Create Common Templates'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Configuration Modal */}
      {showScheduleModal && selectedTemplate && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configure Template
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowScheduleModal(false)
                  setSelectedTemplate(null)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name
                </label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {selectedTemplate.template_name}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Generation Day (1-28)
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={selectedTemplate.generation_day}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    generation_day: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto-generate"
                  checked={selectedTemplate.is_monthly_auto_generate}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    is_monthly_auto_generate: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto-generate" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Auto-generate monthly
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={selectedTemplate.is_active}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    is_active: e.target.checked
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is-active" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  Active
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleModal(false)
                  setSelectedTemplate(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleScheduleUpdate}
                disabled={updateTemplateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateTemplateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Configuration