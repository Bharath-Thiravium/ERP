import React, { useState } from 'react'
import { Building } from 'lucide-react'
import GovernmentPortalIntegration from '../components/government/GovernmentPortalIntegration'

const GovernmentPortal: React.FC = () => {
  const [activeView, setActiveView] = useState('overview')

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Building },
    { id: 'portal', label: 'Portal Integration', icon: Building }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="text-center py-12">
        <div className="mx-auto w-24 h-24 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
          <Building className="h-12 w-12 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Government Portal Integration
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
          Automated submission and management of government returns including PF ECR, ESI returns, Professional Tax, and TDS submissions.
        </p>
        <button
          onClick={() => setActiveView('portal')}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg shadow-blue-500/25"
        >
          <Building className="h-5 w-5 mr-2" />
          Portal Integration
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Government Portal
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Automated submission and management of government returns
            </p>
          </div>
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
            <Building className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Premium Navigation Tabs */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-2 shadow-xl">
        <div className="flex space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeView === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <div className="p-6">
          {activeView === 'overview' && renderOverview()}
          {activeView === 'portal' && <GovernmentPortalIntegration />}
        </div>
      </div>
    </div>
  )
}

export default GovernmentPortal
