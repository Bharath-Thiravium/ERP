import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Settings, Plus, Trash2, FileText, Upload, X, Save
} from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import toast from 'react-hot-toast'

const Configuration: React.FC = () => {
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null)
  const [uploadForm, setUploadForm] = useState({
    template_name: '',
    form_type: 'custom_template',
    file_type: 'excel',
    generation_day: 1,
    is_monthly_auto_generate: true,
    is_active: true
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['form-templates'],
    queryFn: () => apiClient.get('/api/hr/form-templates/')
  })

  // Upload template mutation
  const uploadTemplateMutation = useMutation({
    mutationFn: (formData: FormData) => apiClient.post('/api/hr/form-templates/', formData),
    onSuccess: () => {
      toast.success('Template uploaded successfully!')
      setShowAddModal(false)
      setSelectedFile(null)
      setUploadForm({
        template_name: '',
        form_type: 'custom_template',
        file_type: 'excel',
        generation_day: 1,
        is_monthly_auto_generate: true,
        is_active: true
      })
      queryClient.invalidateQueries({ queryKey: ['form-templates'] })
      queryClient.invalidateQueries({ queryKey: ['active-templates'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to upload template')
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

  const handleAddTemplate = () => {
    if (!selectedFile || !uploadForm.template_name) {
      toast.error('Please provide template name and select a file')
      return
    }

    const formData = new FormData()
    formData.append('template_file', selectedFile)
    formData.append('template_name', uploadForm.template_name)
    formData.append('form_type', uploadForm.form_type)
    formData.append('file_type', uploadForm.file_type)
    formData.append('generation_day', uploadForm.generation_day.toString())
    formData.append('is_monthly_auto_generate', uploadForm.is_monthly_auto_generate.toString())
    formData.append('is_active', uploadForm.is_active.toString())

    uploadTemplateMutation.mutate(formData)
  }

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Configuration</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage compliance form templates and scheduling
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Template
        </Button>
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
                    Upload your first compliance form template to get started.
                  </p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals using createPortal to render at body level */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add New Template
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={uploadForm.template_name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, template_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="e.g., Monthly Attendance Register"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Form Type
                  </label>
                  <select
                    value={uploadForm.form_type}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, form_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="custom_template">Custom Template</option>
                    <option value="register_of_fines">Register of Fines</option>
                    <option value="register_of_workmen">Register of Workmen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    File Type
                  </label>
                  <select
                    value={uploadForm.file_type}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, file_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="excel">Excel (.xlsx, .xls)</option>
                    <option value="pdf">PDF (.pdf)</option>
                    <option value="word">Word (.doc, .docx)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Generation Day (1-28)
                </label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={uploadForm.generation_day}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, generation_day: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload File *
                </label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf,.doc,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: Excel (.xlsx, .xls), PDF (.pdf), Word (.doc, .docx). Max size: 10MB
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={uploadForm.is_monthly_auto_generate}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, is_monthly_auto_generate: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Auto-generate monthly</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={uploadForm.is_active}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleAddTemplate}
                disabled={uploadTemplateMutation.isPending || !uploadForm.template_name || !selectedFile} 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {uploadTemplateMutation.isPending ? (
                  <>
                    <Upload className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Template
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showScheduleModal && selectedTemplate && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configure Schedule
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowScheduleModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Name
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
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
                  onChange={(e) => setSelectedTemplate((prev: any) => ({ 
                    ...prev, 
                    generation_day: parseInt(e.target.value) 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTemplate.is_monthly_auto_generate}
                    onChange={(e) => setSelectedTemplate((prev: any) => ({ 
                      ...prev, 
                      is_monthly_auto_generate: e.target.checked 
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Auto-generate monthly</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedTemplate.is_active}
                    onChange={(e) => setSelectedTemplate((prev: any) => ({ 
                      ...prev, 
                      is_active: e.target.checked 
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>
            
            <div className="flex space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                onClick={handleScheduleUpdate}
                disabled={updateTemplateMutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {updateTemplateMutation.isPending ? (
                  <>
                    <Save className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowScheduleModal(false)
                  setSelectedTemplate(null)
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export { Configuration as default }