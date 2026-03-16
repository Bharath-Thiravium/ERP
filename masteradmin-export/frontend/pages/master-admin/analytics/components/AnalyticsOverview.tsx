import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, Users, Building2, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'

const AnalyticsOverview: React.FC = () => {
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => apiClient.get('/api/analytics/overview/'),
    refetchInterval: 60000, // Refresh every minute
  })

  const overview = analyticsData?.data || {}

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
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            {overview.growth?.revenue_growth_rate && formatPercentage(overview.growth.revenue_growth_rate)}
          </div>
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {formatCurrency(overview.revenue?.total_revenue || 0)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              This month: {formatCurrency(overview.growth?.revenue_this_month || 0)}
            </p>
          </div>
        </div>

        {/* Total Companies */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            {overview.growth?.company_growth_rate && formatPercentage(overview.growth.company_growth_rate)}
          </div>
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Active Companies</p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {overview.users?.total_companies || 0}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              New this month: {overview.growth?.new_companies_this_month || 0}
            </p>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {(overview.users?.total_service_users || 0) + (overview.users?.total_employees || 0)}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Active 24h: {overview.users?.active_users_24h || 0}
            </p>
          </div>
        </div>

        {/* Service Adoption */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Avg Service Adoption</p>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
              {overview.services?.adoption_rates?.length > 0 
                ? Math.round(overview.services.adoption_rates.reduce((acc: number, service: any) => acc + service.adoption_rate, 0) / overview.services.adoption_rates.length)
                : 0}%
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Across all services
            </p>
          </div>
        </div>
      </div>

      {/* Payment Status Breakdown */}
      {overview.revenue?.payment_breakdown && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Status Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {overview.revenue.payment_breakdown.completed}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {overview.revenue.payment_breakdown.pending}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {overview.revenue.payment_breakdown.failed}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Failed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {overview.revenue.payment_breakdown.total_invoices}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Invoices</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Services */}
      {overview.services?.adoption_rates && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Adoption Rates</h3>
          <div className="space-y-3">
            {overview.services.adoption_rates.map((service: any) => (
              <div key={service.service_id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{service.service_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {service.companies_using} companies using
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {service.adoption_rate}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AnalyticsOverview