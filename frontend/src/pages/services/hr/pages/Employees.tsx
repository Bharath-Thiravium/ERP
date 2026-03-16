import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Building, TrendingUp, CheckCircle, AlertTriangle, BarChart3 } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import EmployeeList from '../components/employees/EmployeeList'
import EmployeeForm from '../components/employees/EmployeeForm'
import EmployeeView from '../components/employees/EmployeeView'
import MobileAccessManager from '../components/employees/MobileAccessManager'
import { Employee } from '../types/hrTypes'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'

const Employees: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeView, setActiveView] = useState('overview')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    newHires: 0,
    departments: 0,
    avgPerformance: 0,
    highPerformers: 0,
    atRisk: 0,
    pendingOnboarding: 0
  })

  const fetchEmployeeStats = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/employees/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      
      const employeesData = response.data.results || []
      setEmployees(employeesData)
      const activeEmployees = employeesData.filter((emp: Employee) => emp.status === 'active')
      const highPerformers = employees.filter((emp: Employee) => emp.performance_score >= 8)
      const atRisk = employees.filter((emp: Employee) => emp.retention_risk === 'high')
      const avgPerformance = employeesData.length > 0 
        ? employeesData.reduce((sum: number, emp: Employee) => sum + emp.performance_score, 0) / employeesData.length 
        : 0
      
      setStats({
        totalEmployees: employeesData.length,
        activeEmployees: activeEmployees.length,
        newHires: employeesData.filter((emp: Employee) => {
          const joinDate = new Date(emp.date_of_joining)
          const monthAgo = new Date()
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          return joinDate >= monthAgo
        }).length,
        departments: new Set(employeesData.map((emp: Employee) => emp.department)).size,
        avgPerformance: Math.round(avgPerformance * 10) / 10,
        highPerformers: highPerformers.length,
        atRisk: atRisk.length,
        pendingOnboarding: 0
      })
    } catch (error) {
      console.error('Error fetching employee stats:', error)
    }
  }

  useEffect(() => {
    fetchEmployeeStats()
  }, [sessionKey, refreshKey])

  const handleAddEmployee = () => {
    // Clear any existing employee data to ensure clean create form
    setSelectedEmployee(undefined)
    setShowForm(true)
  }

  const handleEditEmployee = (employee: Employee) => {
    // Ensure we have a clean copy of the employee data
    setSelectedEmployee({ ...employee })
    setShowForm(true)
  }

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowView(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedEmployee(undefined)
  }

  const handleViewClose = () => {
    setShowView(false)
    setSelectedEmployee(undefined)
  }

  const handleFormSave = (_employee: Employee) => {
    setRefreshKey(prev => prev + 1)
    fetchEmployeeStats()
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Employee Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive workforce management with AI-enhanced insights
            </p>
          </div>
          <Button 
            onClick={handleAddEmployee}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Employees</p>
              <p className="text-3xl font-bold">{stats.totalEmployees}</p>
            </div>
            <Users className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Active</p>
              <p className="text-3xl font-bold">{stats.activeEmployees}</p>
            </div>
            <CheckCircle className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">New Hires</p>
              <p className="text-3xl font-bold">{stats.newHires}</p>
            </div>
            <UserPlus className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Departments</p>
              <p className="text-3xl font-bold">{stats.departments}</p>
            </div>
            <Building className="h-8 w-8 opacity-80" />
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <span>Avg Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.avgPerformance}/10</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Overall team performance</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span>High Performers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.highPerformers}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Performance score ≥ 8</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>At Risk</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.atRisk}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">High retention risk</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => setActiveView('list')}
              variant="outline" 
              className="h-20 flex-col space-y-2"
            >
              <Users className="h-6 w-6" />
              <span>View All Employees</span>
            </Button>
            <Button 
              onClick={handleAddEmployee}
              variant="outline" 
              className="h-20 flex-col space-y-2"
            >
              <UserPlus className="h-6 w-6" />
              <span>Add New Employee</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col space-y-2"
            >
              <BarChart3 className="h-6 w-6" />
              <span>Performance Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'overview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveView('list')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'list'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Employee List
        </button>
        <button
          onClick={() => setActiveView('mobile')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'mobile'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Mobile Access
        </button>
      </div>

      {/* Content */}
      {activeView === 'overview' ? (
        renderOverview()
      ) : activeView === 'list' ? (
        <EmployeeList
          key={refreshKey}
          onAddEmployee={handleAddEmployee}
          onEditEmployee={handleEditEmployee}
          onViewEmployee={handleViewEmployee}
        />
      ) : (
        <MobileAccessManager
          employees={employees}
          onRefresh={() => {
            setRefreshKey(prev => prev + 1)
            fetchEmployeeStats()
          }}
        />
      )}
      
      {showForm && (
        <EmployeeForm
          employee={selectedEmployee}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
      
      {showView && selectedEmployee && (
        <EmployeeView
          employee={selectedEmployee}
          onClose={handleViewClose}
        />
      )}
    </div>
  )
}

export default Employees