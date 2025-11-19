import React, { useState } from 'react'
import { FileText, Settings, Building } from 'lucide-react'
import StatutoryDashboard from '../components/statutory/StatutoryDashboard'
import StatutoryPayrollSettings from '../components/settings/StatutoryPayrollSettings'
import GovernmentReturns from '../components/statutory/GovernmentReturns'

const Statutory: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'returns', label: 'Government Returns', icon: Building }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Statutory Compliance
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              PF, ESI, Professional Tax, and TDS management system
            </p>
          </div>
          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
            <FileText className="h-8 w-8 text-white" />
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
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
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
          {activeView === 'dashboard' && <StatutoryDashboard />}
          {activeView === 'settings' && <StatutoryPayrollSettings />}
          {activeView === 'returns' && <GovernmentReturns />}
        </div>
      </div>
    </div>
  )
}

export default Statutory
