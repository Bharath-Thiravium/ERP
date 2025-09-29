import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, Building2, UserCheck, Activity } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'

const UserAnalytics: React.FC = () => {
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user-analytics'],
    queryFn: () => apiClient.get('/api/analytics/users/'),
    refetchInterval: 60000,
  })

  const users = userData?.data || {}

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* User Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Companies</h3>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {users.overview?.total_companies || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Service Users</h3>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {users.overview?.total_service_users || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <UserCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Employees</h3>
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {users.overview?.total_employees || 0}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active 24h</h3>
          </div>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {users.overview?.active_users_24h || 0}
          </p>
        </div>
      </div>

      {/* User Activity Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Daily User Activity (Last 30 Days)</h3>
        <div className="h-64 flex items-end space-x-1">
          {users.activity_trend?.map((day: any, index: number) => {
            const maxUsers = Math.max(...(users.activity_trend?.map((d: any) => d.active_users) || [1]))
            const height = (day.active_users / maxUsers) * 200
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-sm transition-all duration-300 hover:from-indigo-600 hover:to-indigo-500"
                  style={{ height: `${height}px` }}
                  title={`${day.date}: ${day.active_users} users`}
                ></div>
                {index % 5 === 0 && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 transform -rotate-45">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Company User Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Users by Company</h3>
        <div className="space-y-4">
          {users.company_breakdown?.map((company: any) => (
            <div key={company.company_id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">{company.company_name}</h4>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {company.total_users} total users
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {company.service_users}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Service Users</p>
                </div>
                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg">
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {company.employees}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Employees</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Service Usage by Company */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Service Usage by Company</h3>
        <div className="space-y-6">
          {users.service_usage?.map((company: any) => (
            <div key={company.company_id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">{company.company_name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {company.services?.map((service: any, index: number) => (
                  <div key={index} className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {service.users_count}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{service.service_name}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default UserAnalytics