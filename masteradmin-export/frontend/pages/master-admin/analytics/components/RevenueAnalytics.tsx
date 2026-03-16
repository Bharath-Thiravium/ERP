import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarSign, TrendingUp, Building2, CreditCard } from 'lucide-react'
import { apiClient } from '../../../../lib/api'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'

const RevenueAnalytics: React.FC = () => {
  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenue-analytics'],
    queryFn: () => apiClient.get('/api/analytics/revenue/'),
    refetchInterval: 60000,
  })

  const revenue = revenueData?.data || {}

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
      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Revenue</h3>
          </div>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(revenue.total_revenue || 0)}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Completed</h3>
          </div>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {revenue.payment_breakdown?.completed || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pending</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
            {revenue.payment_breakdown?.pending || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Companies</h3>
          </div>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {revenue.revenue_by_company?.length || 0}
          </p>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Monthly Revenue Trend</h3>
        <div className="h-64 flex items-end space-x-2">
          {revenue.monthly_trend?.map((month: any, index: number) => {
            const maxRevenue = Math.max(...(revenue.monthly_trend?.map((m: any) => m.revenue) || [1]))
            const height = (month.revenue / maxRevenue) * 200
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-md transition-all duration-300 hover:from-blue-600 hover:to-blue-500"
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
      </div>

      {/* Revenue by Company */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Revenue by Company</h3>
        <div className="space-y-4">
          {revenue.revenue_by_company?.map((company: any) => {
            const maxRevenue = Math.max(...(revenue.revenue_by_company?.map((c: any) => c.revenue) || [1]))
            const percentage = (company.revenue / maxRevenue) * 100
            
            return (
              <div key={company.company_id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {company.company_name}
                  </span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(company.revenue)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default RevenueAnalytics