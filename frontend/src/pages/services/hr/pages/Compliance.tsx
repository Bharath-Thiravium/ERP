import React, { useState } from 'react'
import { Shield, BarChart3, Settings, Link, FileText, History } from 'lucide-react'
import ComplianceDashboard from '../components/compliance/ComplianceDashboard'
import AdvancedReports from '../components/compliance/AdvancedReports'
import AutomationCenter from '../components/compliance/AutomationCenter'
import IntegrationHub from '../components/compliance/IntegrationHub'
import MonthlyForms from '../components/compliance/MonthlyForms'
import Configuration from '../components/compliance/Configuration'
import FormHistory from '../components/compliance/FormHistory'

const Compliance: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard')

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'configuration', label: 'Configuration', icon: Settings },
    { id: 'monthly-forms', label: 'Monthly Forms', icon: FileText },
    { id: 'form-history', label: 'Form History', icon: History },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'automation', label: 'Automation', icon: Settings },
    { id: 'integration', label: 'Integration', icon: Link }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Compliance Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Advanced compliance monitoring and automation platform
            </p>
          </div>
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
            <Shield className="h-8 w-8 text-white" />
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
          {activeView === 'dashboard' && <ComplianceDashboard />}
          {activeView === 'configuration' && <Configuration />}
          {activeView === 'monthly-forms' && <MonthlyForms />}
          {activeView === 'form-history' && <FormHistory />}
          {activeView === 'reports' && <AdvancedReports />}
          {activeView === 'automation' && <AutomationCenter />}
          {activeView === 'integration' && <IntegrationHub />}
        </div>
      </div>
    </div>
  )
}

export default Compliance
