import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Server, DollarSign, Users } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'

const ServiceAnalytics: React.FC = () => {
  const { data: serviceData, isLoading } = useQuery({
    queryKey: ['service-analytics'],
    queryFn: () => apiClient.get('/api/analytics/services/'),
    refetchInterval: 60000,
  })

  const services = serviceData?.data || {}

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Service Adoption Rates */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Service Adoption Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.adoption_rates?.map((service: any) => (
            <div key={service.service_id} className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg inline-block mb-4">
                <Server className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {service.service_name}
              </h4>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {service.adoption_rate}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {service.companies_using} companies using
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Service Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Finance Service */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Finance Service</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Companies</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {services.performance_metrics?.finance?.active_companies || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {services.performance_metrics?.finance?.total_invoices || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Payments</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {services.performance_metrics?.finance?.total_payments || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Success Rate</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {services.performance_metrics?.finance?.success_rate || 0}
              </span>
            </div>
          </div>
        </div>

        {/* HR Service */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">HR Service</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Companies</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {services.performance_metrics?.hr?.active_companies || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Employees</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {services.performance_metrics?.hr?.total_employees || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg per Company</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {Math.round(services.performance_metrics?.hr?.avg_employees_per_company || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Inventory Service */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Server className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory Service</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Companies</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {services.performance_metrics?.inventory?.active_companies || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Products</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {services.performance_metrics?.inventory?.total_products || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Movements</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {services.performance_metrics?.inventory?.total_movements || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg per Company</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {Math.round(services.performance_metrics?.inventory?.avg_products_per_company || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Contribution */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Contribution by Service</h3>
        <div className="space-y-4">
          {services.revenue_contribution?.map((service: any, index: number) => {
            const maxRevenue = Math.max(...(services.revenue_contribution?.map((s: any) => s.revenue) || [1]))
            const percentage = (service.revenue / maxRevenue) * 100
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {service.service_name}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                      ({service.companies_count} companies)
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(service.revenue)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Service Usage Trends */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Service Usage Trends (Last 30 Days)</h3>
        <div className="space-y-6">
          {Object.entries(services.usage_trends || {}).map(([serviceName, trend]: [string, any]) => (
            <div key={serviceName} className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white capitalize">{serviceName} Service</h4>
              <div className="h-32 flex items-end space-x-1">
                {trend?.map((day: any, index: number) => {
                  const maxUsers = Math.max(...(trend?.map((d: any) => d.active_users) || [1]))
                  const height = (day.active_users / maxUsers) * 100
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          serviceName === 'finance' ? 'bg-gradient-to-t from-green-500 to-green-400' :
                          serviceName === 'hr' ? 'bg-gradient-to-t from-blue-500 to-blue-400' :
                          'bg-gradient-to-t from-purple-500 to-purple-400'
                        }`}
                        style={{ height: `${height}px` }}
                        title={`${day.date}: ${day.active_users} users`}
                      ></div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ServiceAnalytics