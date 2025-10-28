import React, { useState } from 'react'
import { Calendar, Users, Settings, BarChart3 } from 'lucide-react'

const LeaveManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('applications')

  const tabs = [
    { id: 'applications', label: 'Leave Applications', icon: Calendar },
    { id: 'balances', label: 'Leave Balances', icon: Users },
    { id: 'calendar', label: 'Leave Calendar', icon: Calendar },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'settings', label: 'Leave Settings', icon: Settings }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'applications':
        const LeaveApplications = React.lazy(() => import('../components/leave/LeaveApplications'))
        return (
          <React.Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>}>
            <LeaveApplications />
          </React.Suspense>
        )
      case 'balances':
        const LeaveBalances = React.lazy(() => import('../components/leave/LeaveBalances'))
        return (
          <React.Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>}>
            <LeaveBalances />
          </React.Suspense>
        )
      case 'calendar':
        const LeaveCalendar = React.lazy(() => import('../components/leave/LeaveCalendar'))
        return (
          <React.Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>}>
            <LeaveCalendar />
          </React.Suspense>
        )
      case 'reports':
        const LeaveReports = React.lazy(() => import('../components/leave/LeaveReports'))
        return (
          <React.Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>}>
            <LeaveReports />
          </React.Suspense>
        )
      case 'settings':
        const LeaveSettings = React.lazy(() => import('../components/leave/LeaveSettings'))
        return (
          <React.Suspense fallback={<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>}>
            <LeaveSettings />
          </React.Suspense>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage employee leave applications, balances, and policies</p>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-2">
        <div className="flex space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        {renderContent()}
      </div>
    </div>
  )
}

export default LeaveManagement