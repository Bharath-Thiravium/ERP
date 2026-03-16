import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp, Building2, DollarSign, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'

const GrowthAnalytics: React.FC = () => {
  const { data: growthData, isLoading } = useQuery({
    queryKey: ['growth-analytics'],
    queryFn: () => apiClient.get('/api/analytics/growth/'),
    refetchInterval: 60000,
  })

  const growth = growthData?.data || {}

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

  const formatPercentage = (value: number) => {
    const isPositive = value >= 0
    return (
      <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Growth KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            {growth.growth_kpis?.company_growth_rate && formatPercentage(growth.growth_kpis.company_growth_rate)}
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Company Growth</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {growth.growth_kpis?.new_companies_this_month || 0}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              New this month
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            {growth.growth_kpis?.revenue_growth_rate && formatPercentage(growth.growth_kpis.revenue_growth_rate)}
          </div>
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Revenue Growth</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(growth.growth_kpis?.revenue_this_month || 0)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              This month
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Last Month</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Companies</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {growth.growth_kpis?.new_companies_last_month || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Revenue</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatCurrency(growth.growth_kpis?.revenue_last_month || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Growth Rate</h3>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {Math.abs(growth.growth_kpis?.company_growth_rate || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Monthly average</p>
          </div>
        </div>
      </div>

      {/* Company Growth Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Company Growth Trend</h3>
        <div className="h-64 flex items-end space-x-2">
          {growth.company_growth?.map((month: any, index: number) => {
            const maxCompanies = Math.max(...(growth.company_growth?.map((m: any) => m.total_companies) || [1]))
            const height = (month.total_companies / maxCompanies) * 200
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
                  style={{ height: `${height}px` }}
                  title={`${month.month}: ${month.total_companies} total companies (${month.new_companies} new)`}
                ></div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 transform -rotate-45">
                  {month.month}
                </p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Total Companies</span>
          </div>
        </div>
      </div>

      {/* Revenue Growth Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue Growth Trend</h3>
        <div className="h-64 flex items-end space-x-2">
          {growth.revenue_growth?.map((month: any, index: number) => {
            const maxRevenue = Math.max(...(growth.revenue_growth?.map((m: any) => m.revenue) || [1]))
            const height = (month.revenue / maxRevenue) * 200
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t-md transition-all duration-300 hover:from-green-600 hover:to-green-500"
                  style={{ height: `${height}px` }}
                  title={`${month.month}: ${formatCurrency(month.revenue)}`}
                ></div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 transform -rotate-45">
                  {month.month}
                </p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Monthly Revenue</span>
          </div>
        </div>
      </div>

      {/* User Growth Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">User Growth Trend</h3>
        <div className="h-64 flex items-end space-x-2">
          {growth.user_growth?.map((month: any, index: number) => {
            const maxUsers = Math.max(...(growth.user_growth?.map((m: any) => m.total_new_users) || [1]))
            const serviceHeight = (month.service_users / maxUsers) * 200
            const employeeHeight = (month.employees / maxUsers) * 200
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col">
                  <div
                    className="w-full bg-gradient-to-t from-purple-500 to-purple-400 transition-all duration-300"
                    style={{ height: `${serviceHeight}px` }}
                    title={`${month.month}: ${month.service_users} service users`}
                  ></div>
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 transition-all duration-300"
                    style={{ height: `${employeeHeight}px` }}
                    title={`${month.month}: ${month.employees} employees`}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 transform -rotate-45">
                  {month.month}
                </p>
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Service Users</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-indigo-500 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Employees</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GrowthAnalytics