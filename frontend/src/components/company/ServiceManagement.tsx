import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings, ExternalLink, Users, Activity } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ServiceManagementProps {
  servicesData: any[]
  serviceUsersData: any[]
  servicesLoading: boolean
  onServiceAccess: (service: any) => void
  getServiceIcon: (serviceType: string) => string
}

const ServiceManagement: React.FC<ServiceManagementProps> = ({
  servicesData,
  serviceUsersData,
  servicesLoading,
  onServiceAccess,
  getServiceIcon
}) => {
  const navigate = useNavigate()

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Service Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Access and manage your assigned services
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Your ᗩTᕼᙓᑎᗩ'𝔖 Services</span>
          </CardTitle>
          <CardDescription>
            Click on any service to access its dashboard and features
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {servicesLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading your services..." />
            </div>
          ) : !Array.isArray(servicesData) || servicesData.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Services Assigned
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                No services have been assigned to your company yet. You can request access to available services.
              </p>
              <Button
                onClick={() => navigate('/company/services')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Request Service Access
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicesData.map((service: any) => {
                const serviceUsers = serviceUsersData.filter((user: any) => user.service_type === service.service_type)
                return (
                  <div
                    key={service.id}
                    className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => onServiceAccess(service)}
                  >
                    <div className="p-6 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="text-3xl">{getServiceIcon(service.service_type)}</div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {service.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                              {service.service_type.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            service.is_active
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {service.is_active ? 'Active' : 'Inactive'}
                          </span>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {service.description}
                      </p>
                    </div>

                    <div className="px-6 pb-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600 dark:text-gray-400">
                            {serviceUsers.length} user{serviceUsers.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            Ready
                          </span>
                        </div>
                      </div>
                    </div>

                    {service.features && service.features.length > 0 && (
                      <div className="px-6 pb-6">
                        <div className="flex flex-wrap gap-1">
                          {service.features.slice(0, 3).map((feature: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            >
                              {feature}
                            </span>
                          ))}
                          {service.features.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400">
                              +{service.features.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ServiceManagement