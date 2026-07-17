import React, { useState } from 'react'
import { BarChart3, ShieldCheck } from 'lucide-react'
import ComplianceDashboard from '../components/compliance/ComplianceDashboard'
import AdvancedReports from '../components/compliance/AdvancedReports'

const Compliance: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'reports'>('dashboard')
  const tabs = [
    { id: 'dashboard' as const, label: 'Compliance Review', icon: ShieldCheck },
    { id: 'reports' as const, label: 'Reports', icon: BarChart3 }
  ]

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Compliance Management</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Review statutory configuration, payroll evidence, returns and unresolved alerts.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = activeView === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${
                active
                  ? 'border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeView === 'dashboard' ? <ComplianceDashboard /> : <AdvancedReports />}
    </div>
  )
}

export default Compliance
