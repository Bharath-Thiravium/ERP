import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Users, 
  UserPlus,

  Clock,
  Award,
  FileText,
  Settings,
  Download,
  BarChart3,
  TrendingUp,
  Building
} from 'lucide-react'
import { useAuthStore } from '../../../../store/authStore'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent } from '../../../../components/ui/Card'

interface HRDashboardProps {
  service: any
}

const HRDashboard: React.FC<HRDashboardProps> = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { serviceUser } = useServiceUserStore()
  const [activeTab, setActiveTab] = useState('overview')

  // Placeholder menu items - you can customize these later
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'employees', label: 'Employee Management', icon: Users },
    { id: 'recruitment', label: 'Recruitment', icon: UserPlus },
    { id: 'attendance', label: 'Time & Attendance', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: FileText },
    { id: 'performance', label: 'Performance', icon: Award },
    { id: 'training', label: 'Training', icon: Building },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">248</p>
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +12 this month
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Recruitments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">15</p>
                <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center mt-1">
                  <UserPlus className="h-4 w-4 mr-1" />
                  8 positions open
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <UserPlus className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Attendance Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">94.2%</p>
                <p className="text-sm text-green-600 dark:text-green-400 flex items-center mt-1">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  +2.1% vs last month
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
                <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Training Programs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">23</p>
                <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center mt-1">
                  <Award className="h-4 w-4 mr-1" />
                  5 active courses
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-full">
                <Award className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon Notice */}
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-6xl mb-6">👥</div>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            HR Dashboard Overview
          </h3>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            The HR management system is ready for configuration. Detailed features and
            functionality will be implemented based on your specific requirements.
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline">
              Configure HR Settings
            </Button>
            <Button>
              View Employee Directory
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderPlaceholder = (title: string, description: string, icon: string) => (
    <Card>
      <CardContent className="p-12 text-center">
        <div className="text-4xl mb-4">{icon}</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{description}</p>
        <Button variant="outline">Coming Soon</Button>
      </CardContent>
    </Card>
  )

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview()
      case 'employees':
        return renderPlaceholder('Employee Management', 'Manage employee records, profiles, and organizational structure', '👤')
      case 'recruitment':
        return renderPlaceholder('Recruitment System', 'Handle job postings, applications, and hiring processes', '🎯')
      case 'attendance':
        return renderPlaceholder('Time & Attendance', 'Track working hours, leaves, and attendance patterns', '⏰')
      case 'payroll':
        return renderPlaceholder('Payroll Management', 'Process salaries, benefits, and payroll reports', '💰')
      case 'performance':
        return renderPlaceholder('Performance Management', 'Conduct reviews, set goals, and track performance', '📈')
      case 'training':
        return renderPlaceholder('Training & Development', 'Manage training programs and employee development', '🎓')
      case 'settings':
        return renderPlaceholder('HR Settings', 'Configure HR module preferences and policies', '⚙️')
      default:
        return renderOverview()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/company/services')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Human Resources
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {serviceUser?.company_name ? `${serviceUser.company_name} - Comprehensive HR management system` : 'Comprehensive HR management system'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.company_name}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          activeTab === item.id
                            ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HRDashboard
