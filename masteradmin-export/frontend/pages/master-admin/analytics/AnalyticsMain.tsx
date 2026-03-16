import React, { useState } from 'react'
import { TrendingUp, Users, Server, BarChart3, DollarSign } from 'lucide-react'
import AnalyticsOverview from './components/AnalyticsOverview'
import RevenueAnalytics from './components/RevenueAnalytics'
import UserAnalytics from './components/UserAnalytics'
import ServiceAnalytics from './components/ServiceAnalytics'
import GrowthAnalytics from './components/GrowthAnalytics'

const AnalyticsMain: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'services', label: 'Services', icon: Server },
    { id: 'growth', label: 'Growth', icon: TrendingUp },
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <AnalyticsOverview />
      case 'revenue':
        return <RevenueAnalytics />
      case 'users':
        return <UserAnalytics />
      case 'services':
        return <ServiceAnalytics />
      case 'growth':
        return <GrowthAnalytics />
      default:
        return <AnalyticsOverview />
    }
  }

  return (
    <div className="space-y-6">
      {/* Analytics Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Business Analytics</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive insights into your business performance
          </p>
        </div>
        
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="min-h-[600px]">
        {renderContent()}
      </div>
    </div>
  )
}

export default AnalyticsMain