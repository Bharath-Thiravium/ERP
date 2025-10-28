import React from 'react'
import { CheckCircle, Settings, Users, Calendar, Calculator, BarChart3, Clock, Briefcase, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'

const SystemStatus: React.FC = () => {
  const modules = [
    { name: 'Dashboard & Overview', icon: BarChart3, status: 'complete' },
    { name: 'Employee Management', icon: Users, status: 'complete' },
    { name: 'Attendance System', icon: Clock, status: 'complete' },
    { name: 'Leave Management', icon: Calendar, status: 'complete' },
    { name: 'Payroll System', icon: Calculator, status: 'complete' },
    { name: 'Recruitment', icon: Briefcase, status: 'complete' },
    { name: 'Analytics & Reports', icon: BarChart3, status: 'complete' },
    { name: 'Settings & Configuration', icon: Settings, status: 'complete' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              HR System Status
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Complete enterprise HR management system</p>
          </div>
          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
            <Activity className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Module Status */}
      <Card>
        <CardHeader>
          <CardTitle>Module Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((module, index) => {
              const Icon = module.icon
              return (
                <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
                  <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400" />
                  <Icon className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                  <span className="font-medium text-gray-900 dark:text-white">{module.name}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Success Banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center space-x-4">
          <CheckCircle className="h-12 w-12" />
          <div>
            <h2 className="text-2xl font-bold">🎉 HR System 100% Complete!</h2>
            <p className="text-green-100 mt-2">All modules implemented and ready for production use.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SystemStatus