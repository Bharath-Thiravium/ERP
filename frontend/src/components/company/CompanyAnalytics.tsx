import React from 'react'
import { BarChart3, TrendingUp, Activity, Users, Server, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface CompanyAnalyticsProps {
  analyticsData: any
  serviceUtilization: any[]
  isLoading: boolean
}

const CompanyAnalytics: React.FC<CompanyAnalyticsProps> = ({
  analyticsData,
  serviceUtilization,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Company Analytics
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive insights into your service usage and performance
        </p>
      </div>

      {/* Real-time Analytics Cards - No Dummy Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Service Utilization Rate */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 p-6 text-white shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BarChart3 className="h-6 w-6" />
              </div>
              <TrendingUp className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Service Utilization</p>
              <p className="text-3xl font-bold">{Math.round(analyticsData?.service_utilization_rate || 0)}%</p>
              <p className="text-white/70 text-xs mt-2">Overall adoption rate</p>
            </div>
          </div>
        </div>

        {/* Total Data Entries */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 via-green-600 to-green-700 p-6 text-white shadow-xl shadow-green-500/25 hover:shadow-2xl hover:shadow-green-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Server className="h-6 w-6" />
              </div>
              <Activity className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Total Data Entries</p>
              <p className="text-3xl font-bold">{(analyticsData?.total_data_entries || 0).toLocaleString()}</p>
              <p className="text-white/70 text-xs mt-2">Across all services</p>
            </div>
          </div>
        </div>

        {/* Active Users Today */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 p-6 text-white shadow-xl shadow-purple-500/25 hover:shadow-2xl hover:shadow-purple-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Users className="h-6 w-6" />
              </div>
              <Zap className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Active Users Today</p>
              <p className="text-3xl font-bold">{analyticsData?.active_users_today || 0}</p>
              <p className="text-white/70 text-xs mt-2">Currently online</p>
            </div>
          </div>
        </div>

        {/* Monthly Growth */}
        <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 p-6 text-white shadow-xl shadow-orange-500/25 hover:shadow-2xl hover:shadow-orange-500/40 transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10 backdrop-blur-sm"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <TrendingUp className="h-6 w-6" />
              </div>
              <Activity className="h-5 w-5 text-white/70" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium mb-1">Monthly Growth</p>
              <p className="text-3xl font-bold">{Math.round(analyticsData?.monthly_growth || 0)}%</p>
              <p className="text-white/70 text-xs mt-2">Data growth rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Service Utilization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Service Utilization Details</span>
          </CardTitle>
          <CardDescription>
            Detailed breakdown of service usage across your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serviceUtilization && serviceUtilization.length > 0 ? (
            <div className="space-y-4">
              {serviceUtilization.map((service: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                      <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{service.service_name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {service.service_type?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Users: </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {service.active_users}/{service.total_users}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Usage: </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {service.usage_percentage}%
                        </span>
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        service.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {service.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No service utilization data available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Health & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${
                analyticsData?.system_health === 'excellent' ? 'bg-green-500' :
                analyticsData?.system_health === 'good' ? 'bg-blue-500' :
                analyticsData?.system_health === 'fair' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {analyticsData?.system_health || 'Unknown'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  All systems operational
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Most Used:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {analyticsData?.most_used_service || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Least Used:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {analyticsData?.least_used_service || 'N/A'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CompanyAnalytics