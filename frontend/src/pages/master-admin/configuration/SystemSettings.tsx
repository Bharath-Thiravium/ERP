import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Plus, 
  Edit, 
  Trash2,
  Server,
  Database,
  Mail,
  Globe,
  Lock,
  AlertCircle
} from 'lucide-react'
import { apiClient } from '../../../lib/api'
import { Button } from '../../../components/ui/Button'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const SystemSettings: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<any>(null)
  const [showValues, setShowValues] = useState<{ [key: string]: boolean }>({})
  const queryClient = useQueryClient()

  // Fetch configurations
  const { data: configurationsData, isLoading } = useQuery({
    queryKey: ['system-configurations', selectedCategory],
    queryFn: () => {
      const url = selectedCategory === 'all' 
        ? '/api/configuration/system-config/' 
        : `/api/configuration/system-config/by_category/?category=${selectedCategory}`
      return apiClient.get(url)
    },
  })

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['configuration-categories'],
    queryFn: () => apiClient.get('/api/configuration/system-config/categories/'),
  })

  const configurations = configurationsData?.data?.results || configurationsData?.data || []
  const categories: string[] = [...new Set((categoriesData?.data?.categories || []) as string[])]

  // Create/Update configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: (data: any) => {
      if (data.id) {
        return apiClient.put(`/api/configuration/system-config/${data.id}/`, data)
      } else {
        return apiClient.post('/api/configuration/system-config/', data)
      }
    },
    onSuccess: () => {
      toast.success('Configuration saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['system-configurations'] })
      setShowCreateModal(false)
      setEditingConfig(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save configuration')
    }
  })

  // Delete configuration mutation
  const deleteConfigMutation = useMutation({
    mutationFn: (configId: string) => apiClient.delete(`/api/configuration/system-config/${configId}/`),
    onSuccess: () => {
      toast.success('Configuration deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['system-configurations'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete configuration')
    }
  })

  const handleSaveConfig = (formData: any) => {
    saveConfigMutation.mutate(formData)
  }

  const handleDeleteConfig = (config: any) => {
    if (window.confirm(`Are you sure you want to delete "${config.key}"?`)) {
      deleteConfigMutation.mutate(config.id)
    }
  }

  const toggleShowValue = (configId: string) => {
    setShowValues(prev => ({
      ...prev,
      [configId]: !prev[configId]
    }))
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'database':
        return <Database className="h-4 w-4" />
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'security':
        return <Lock className="h-4 w-4" />
      case 'api':
        return <Globe className="h-4 w-4" />
      case 'server':
        return <Server className="h-4 w-4" />
      default:
        return <Settings className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'database':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
      case 'email':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
      case 'security':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
      case 'api':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
      case 'server':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Configuration</h2>
          <p className="text-gray-600 dark:text-gray-400">Manage system-wide configuration settings</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Categories
          </button>
          {categories.map((category: string) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedCategory === category
                  ? getCategoryColor(category)
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {getCategoryIcon(category)}
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Configurations List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-500" />
            Configuration Settings
            {selectedCategory !== 'all' && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(selectedCategory)}`}>
                {selectedCategory}
              </span>
            )}
          </h3>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <LoadingSpinner />
          </div>
        ) : configurations.length === 0 ? (
          <div className="p-8 text-center">
            <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No configurations found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {selectedCategory === 'all' 
                ? 'Add your first configuration setting'
                : `No configurations found in ${selectedCategory} category`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {configurations.map((config: any) => (
              <div key={config.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {config.key}
                      </h4>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(config.category)}`}>
                        {getCategoryIcon(config.category)}
                        <span className="ml-1">{config.category}</span>
                      </span>
                      {config.is_encrypted && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
                          <Lock className="h-3 w-3 mr-1" />
                          Encrypted
                        </span>
                      )}
                    </div>
                    
                    {config.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {config.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Value:</span>
                      {config.is_encrypted ? (
                        <div className="flex items-center space-x-2">
                          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                            {showValues[config.id] ? config.value : '***ENCRYPTED***'}
                          </code>
                          <button
                            onClick={() => toggleShowValue(config.id)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            {showValues[config.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      ) : (
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                          {config.value}
                        </code>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-2">
                      <span>Updated: {new Date(config.updated_at).toLocaleString()}</span>
                      {config.updated_by && (
                        <span>By: {config.updated_by}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingConfig(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteConfig(config)}
                      disabled={deleteConfigMutation.isPending}
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

      {/* Create/Edit Configuration Modal */}
      {(showCreateModal || editingConfig) && (
        <ConfigurationModal
          isOpen={showCreateModal || !!editingConfig}
          onClose={() => {
            setShowCreateModal(false)
            setEditingConfig(null)
          }}
          onSubmit={handleSaveConfig}
          isLoading={saveConfigMutation.isPending}
          initialData={editingConfig}
          categories={categories}
        />
      )}
    </div>
  )
}

// Configuration Modal Component
const ConfigurationModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  isLoading: boolean
  initialData?: any
  categories: string[]
}> = ({ isOpen, onClose, onSubmit, isLoading, initialData, categories }) => {
  const [formData, setFormData] = useState({
    key: initialData?.key || '',
    value: initialData?.value || '',
    description: initialData?.description || '',
    category: initialData?.category || 'general',
    is_encrypted: initialData?.is_encrypted || false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      id: initialData?.id
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {initialData ? 'Edit Configuration' : 'Add Configuration'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Configuration Key *
            </label>
            <input
              type="text"
              value={formData.key}
              onChange={(e) => setFormData({ ...formData, key: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., database.max_connections"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Value *
            </label>
            <textarea
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
              placeholder="Configuration value"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="general">General</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder="Optional description"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_encrypted"
              checked={formData.is_encrypted}
              onChange={(e) => setFormData({ ...formData, is_encrypted: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_encrypted" className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Encrypt this value
            </label>
          </div>

          {formData.is_encrypted && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium">Encryption Notice</p>
                  <p>This value will be encrypted in the database and hidden in API responses.</p>
                </div>
              </div>
            </div>
          )}

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
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {initialData ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SystemSettings