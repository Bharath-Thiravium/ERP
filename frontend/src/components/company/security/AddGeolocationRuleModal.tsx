import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button } from '../../ui/Button'
import { apiClient } from '../../../lib/api'

interface AddGeolocationRuleModalProps {
  onClose: () => void
  onSuccess: () => void
}

const AddGeolocationRuleModal: React.FC<AddGeolocationRuleModalProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    rule_type: 'allow',
    countries: [] as string[],
    priority: 1,
    description: ''
  })
  const [loading, setLoading] = useState(false)

  // Fetch countries list
  const { data: countriesData } = useQuery({
    queryKey: ['countries-list'],
    queryFn: () => apiClient.get('/api/company-dashboard/advanced-security/geolocation/countries/')
  })

  const countries = countriesData?.data?.countries || []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Rule name is required')
      return
    }
    
    if (formData.countries.length === 0) {
      alert('Please select at least one country')
      return
    }

    setLoading(true)
    try {
      await apiClient.post('/api/company-dashboard/advanced-security/geolocation/rules/', formData)
      onSuccess()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create rule')
    } finally {
      setLoading(false)
    }
  }

  const handleCountryToggle = (countryCode: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.includes(countryCode)
        ? prev.countries.filter(c => c !== countryCode)
        : [...prev.countries, countryCode]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">🌍 Add Geolocation Rule</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Rule Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Block High-Risk Countries"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Rule Type */}
          <div>
            <label className="block text-sm font-medium mb-2">Action *</label>
            <select
              value={formData.rule_type}
              onChange={(e) => setFormData(prev => ({ ...prev, rule_type: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="allow">✅ Allow Access</option>
              <option value="block">🚫 Block Access</option>
              <option value="require_2fa">🔐 Require 2FA</option>
              <option value="notify">📝 Notify Only</option>
            </select>
          </div>

          {/* Countries Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Countries * ({formData.countries.length} selected)
            </label>
            <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {countries.map((country: any) => (
                  <label key={country.code} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={formData.countries.includes(country.code)}
                      onChange={() => handleCountryToggle(country.code)}
                      className="rounded"
                    />
                    <span className="text-sm">{country.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
              min="1"
              max="100"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Higher priority rules are evaluated first</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for this rule..."
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddGeolocationRuleModal