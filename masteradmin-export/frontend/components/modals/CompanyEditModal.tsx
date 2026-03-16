import React, { useState, useEffect } from 'react'
import { Save, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Modal } from '../ui/Modal'

interface CompanyEditModalProps {
  isOpen: boolean
  onClose: () => void
  company: any
  onSave: (updatedCompany: any) => Promise<void>
  services: any[]
}

const CompanyEditModal: React.FC<CompanyEditModalProps> = ({
  isOpen,
  onClose,
  company,
  onSave,
  services
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    approval_status: 'pending',
    selected_services: [] as string[]
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (company) {
      console.log('🔍 DEBUG: Company data in modal:', company)
      console.log('🔍 DEBUG: Company services:', company.services)
      
      // Get assigned service IDs - handle both array of objects and array of IDs
      let assignedServiceIds = []
      if (company.services) {
        if (Array.isArray(company.services)) {
          // If services is array of objects with id property
          if (company.services.length > 0 && typeof company.services[0] === 'object' && company.services[0].id) {
            assignedServiceIds = company.services.map((s: any) => s.id.toString())
          }
          // If services is array of IDs
          else if (company.services.length > 0 && typeof company.services[0] === 'number') {
            assignedServiceIds = company.services.map((id: number) => id.toString())
          }
        }
      }
      
      console.log('🔍 DEBUG: Assigned service IDs:', assignedServiceIds)
      
      setFormData({
        name: company.name || '',
        email: company.email || '',
        phone: company.phone || '',
        address: company.address || '',
        approval_status: company.approval_status || 'pending',
        selected_services: assignedServiceIds
      })
    }
  }, [company])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.selected_services.length === 0) {
      newErrors.services = 'At least one service must be selected'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const updateData = {
        ...formData,
        services: formData.selected_services.map(id => parseInt(id))
      }
      console.log('🔍 DEBUG: Sending update data:', updateData)
      await onSave(updateData)
      onClose()
    } catch (error) {
      console.error('Error updating company:', error)
      setErrors({ submit: 'Failed to update company. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selected_services: prev.selected_services.includes(serviceId)
        ? prev.selected_services.filter(id => id !== serviceId)
        : [...prev.selected_services, serviceId]
    }))
    if (errors.services) {
      setErrors(prev => ({ ...prev, services: '' }))
    }
  }

  const modalFooter = (
    <div className="flex justify-end space-x-3">
      <Button variant="outline" onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button 
        onClick={handleSubmit} 
        disabled={loading} 
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  )

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Edit Company"
      footer={modalFooter}
      size="2xl"
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter company name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Prefix
            </label>
            <input
              type="text"
              value={company?.company_prefix || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
              placeholder="Auto-generated"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Company prefix cannot be changed after creation
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Enter email address"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.email}
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={formData.approval_status}
              onChange={(e) => handleInputChange('approval_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter phone number"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter company address"
          />
        </div>

        {/* Services Management */}
        <div className="space-y-6">
          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs">
              <strong>Debug:</strong> Selected services: [{formData.selected_services.join(', ')}]
            </div>
          )}
          {/* Currently Assigned Services */}
          {(() => {
            const assignedServices = services.filter(service => 
              formData.selected_services.includes(service.id.toString())
            )
            
            if (assignedServices.length > 0) {
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-green-700 dark:text-green-300">
                      Currently Assigned Services ({assignedServices.length})
                    </label>
                    <div className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                      Active
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {assignedServices.map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center p-4 border-2 border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-700 rounded-lg"
                      >
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => handleServiceToggle(service.id.toString())}
                          className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2 mr-3"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                            {service.name}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            {service.service_type?.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                            ₹{service.base_price || 0}/month
                          </p>
                        </div>
                        <div className="ml-2">
                          <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 p-2 rounded border border-green-200 dark:border-green-700">
                    💡 Uncheck services above to remove them from this company
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Available Services to Add */}
          {(() => {
            const availableServices = services.filter(service => 
              !formData.selected_services.includes(service.id.toString())
            )
            
            if (availableServices.length > 0) {
              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-blue-700 dark:text-blue-300">
                      Available Services to Add ({availableServices.length})
                    </label>
                    <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                      Available
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {availableServices.map((service) => (
                      <label
                        key={service.id}
                        className="flex items-center p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer transition-all duration-200 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-400 dark:hover:border-blue-500"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => handleServiceToggle(service.id.toString())}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 mr-3"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {service.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {service.service_type?.replace('_', ' ').toUpperCase()}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            ₹{service.base_price || 0}/month
                          </p>
                        </div>
                        <div className="ml-2">
                          <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full flex items-center justify-center">
                            <div className="h-2 w-2 bg-gray-300 dark:bg-gray-600 rounded-full opacity-50"></div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/10 p-2 rounded border border-blue-200 dark:border-blue-700">
                    💡 Check services above to add them to this company
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Selected Services: {formData.selected_services.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Monthly Cost: ₹{services
                  .filter(s => formData.selected_services.includes(s.id.toString()))
                  .reduce((total, s) => total + parseFloat(s.base_price || 0), 0)
                  .toFixed(2)}
              </div>
            </div>
          </div>

          {errors.services && (
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
              <AlertCircle className="h-4 w-4" />
              {errors.services}
            </p>
          )}
        </div>

        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {errors.submit}
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}

export default CompanyEditModal
