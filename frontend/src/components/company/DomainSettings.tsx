import React, { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { apiClient } from '../../lib/api'
import toast from 'react-hot-toast'

const DomainSettings: React.FC = () => {
  const [domain, setDomain] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()

  // Fetch current domain
  const { data: companyData, isLoading } = useQuery({
    queryKey: ['company-domain'],
    queryFn: () => apiClient.get('/api/company-dashboard/domain/'),
  })

  useEffect(() => {
    if (companyData?.data?.domain_name) {
      setDomain(companyData.data.domain_name)
    }
  }, [companyData])

  // Update domain mutation
  const updateDomainMutation = useMutation({
    mutationFn: (domainName: string) => 
      apiClient.post('/api/company-dashboard/domain/', { domain_name: domainName }),
    onSuccess: () => {
      toast.success('Domain updated successfully!')
      setIsEditing(false)
      queryClient.invalidateQueries({ queryKey: ['company-domain'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update domain')
    }
  })

  const handleSave = () => {
    if (!domain.trim()) {
      toast.error('Please enter a valid domain')
      return
    }

    // Basic domain validation - more flexible
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain)) {
      toast.error('Please enter a valid domain format (e.g., athenas.co.in)')
      return
    }

    updateDomainMutation.mutate(domain)
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Company Domain
        </label>
        <div className="flex space-x-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={!isEditing}
              className="w-full px-4 py-3 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500"
              placeholder="athenas.co.in"
            />
            <Globe className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
          </div>
          {isEditing ? (
            <div className="flex space-x-2">
              <Button
                onClick={handleSave}
                disabled={updateDomainMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {updateDomainMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setDomain(companyData?.data?.domain_name || '')
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Info boxes */}
      <div className="space-y-3">
        {domain && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium">Domain Format Preview:</p>
                <p>Service users will be created as: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">username@{domain}</code></p>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-700 dark:text-amber-300">
              <p className="font-medium mb-1">Important Notes:</p>
              <ul className="space-y-1 text-xs">
                <li>• All new service users will use this domain format</li>
                <li>• Existing users will not be affected</li>
                <li>• Use your company's official domain</li>
                <li>• Format: domain.com or subdomain.domain.com</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DomainSettings