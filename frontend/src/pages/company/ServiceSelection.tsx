import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, Server, ArrowRight, Settings, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

const ServiceSelection: React.FC = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [selectedServices, setSelectedServices] = useState<number[]>([])

  // Fetch services assigned to this company
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['company-assigned-services'],
    queryFn: () => apiClient.getCompanyAssignedServices(),
  })

  // Check if company already has services assigned (for display purposes)
  const { data: companyServices } = useQuery({
    queryKey: ['company-services'],
    queryFn: () => apiClient.getCompanyServices(),
  })

  // Request service access mutation
  const requestServiceMutation = useMutation({
    mutationFn: (serviceIds: number[]) =>
      apiClient.requestServiceAccess(serviceIds),
    onSuccess: () => {
      toast.success('Service access requested successfully!')
      navigate('/company')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to request service access'
      toast.error(message)
    },
  })

  const servicesData = services?.data?.results || []

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType.toLowerCase()) {
      case 'finance': return '💰'
      case 'hr': return '👥'
      case 'inventory': return '📦'
      case 'orders': return '🛒'
      case 'analytics': return '📊'
      case 'crm': return '🤝'
      case 'procurement': return '🛍️'
      case 'manufacturing': return '🏭'
      case 'quality': return '✅'
      case 'maintenance': return '🔧'
      default: return '⚙️'
    }
  }

  const handleServiceToggle = (serviceId: number) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleSubmit = () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service')
      return
    }
    requestServiceMutation.mutate(selectedServices)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/company')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Service Selection
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose a service to access
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.company_name}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg mb-6">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Select Services
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {companyServices?.data && companyServices.data.length > 0
                ? `Request additional services for ${user?.company_name}`
                : `Choose the services you'd like to access for ${user?.company_name}`
              }
            </p>
          </div>

          {/* Services Grid */}
          {servicesLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading assigned services..." />
            </div>
          ) : servicesData.length === 0 ? (
            <Card variant="elevated" className="text-center py-12">
              <CardContent>
                <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Services Assigned
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  No services have been assigned to your company yet. Please contact your administrator.
                </p>
                <Button onClick={() => navigate('/company')}>
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicesData.map((service: any) => (
                <Card
                  key={service.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedServices.includes(service.id)
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => handleServiceToggle(service.id)}
                >
                  <CardHeader className="text-center">
                    <div className="flex items-center justify-center mb-3">
                      <div className="text-4xl mb-2">
                        {getServiceIcon(service.service_type)}
                      </div>
                      {selectedServices.includes(service.id) && (
                        <CheckCircle className="h-6 w-6 text-green-500 ml-2" />
                      )}
                    </div>
                    <CardTitle className="text-xl">{service.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {service.description}
                    </CardDescription>
                  </CardHeader>
                    
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Service Features */}
                        {service.features && service.features.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              Key Features:
                            </h4>
                            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              {service.features.slice(0, 3).map((feature: string, index: number) => (
                                <li key={index} className="flex items-center">
                                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                                  {feature}
                                </li>
                              ))}
                              {service.features.length > 3 && (
                                <li className="text-xs text-gray-500">
                                  +{service.features.length - 3} more features
                                </li>
                              )}
                            </ul>
                          </div>
                        )}

                        {/* Status and Info */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              service.is_active
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {service.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          
                          <ArrowRight className="h-5 w-5 text-blue-500" />
                        </div>

                        {/* Service Type */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Type:</span>
                          <span className="font-medium capitalize">{service.service_type}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}

          {/* Selection Summary */}
          {selectedServices.length > 0 && (
            <Card className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      Selected Services ({selectedServices.length})
                    </h3>
                    <p className="text-blue-700 dark:text-blue-300">
                      {servicesData
                        .filter((s: any) => selectedServices.includes(s.id))
                        .map((s: any) => s.name)
                        .join(', ')}
                    </p>
                  </div>
                  <Server className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/company')}
              disabled={requestServiceMutation.isPending}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={selectedServices.length === 0 || requestServiceMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {requestServiceMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Requesting Access...
                </>
              ) : (
                <>
                  Request Access
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ServiceSelection
