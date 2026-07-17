import React, { useState, useEffect } from 'react'
import { Users, UserPlus, Building, TrendingUp, CheckCircle, AlertTriangle, BarChart3, Briefcase, FileText, IndianRupee, X } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import EmployeeList from '../components/employees/EmployeeList'
import EmployeeForm from '../components/employees/EmployeeForm'
import EmployeeView from '../components/employees/EmployeeView'
import MobileAccessManager from '../components/employees/MobileAccessManager'
import { Employee, EmployeeFormData } from '../types/hrTypes'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'

interface OnboardingRequest {
  applicationId: number
  offerId?: number
}

interface OnboardingPreview {
  application_id: number
  application_number: string
  candidate_name: string
  job_title: string
  offer_status: string
  annual_salary_offered: number
  already_converted: boolean
  employee?: Employee | null
  resume_url?: string | null
  initial_data: Partial<EmployeeFormData>
}

interface EmployeesProps {
  onboardingRequest?: OnboardingRequest | null
  onOnboardingHandled?: () => void
}

const Employees: React.FC<EmployeesProps> = ({ onboardingRequest, onOnboardingHandled }) => {
  const { sessionKey } = useServiceUserStore()
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeView, setActiveView] = useState('overview')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [onboardingPreview, setOnboardingPreview] = useState<OnboardingPreview | null>(null)
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [onboardingError, setOnboardingError] = useState('')
  const [onboardingInitialData, setOnboardingInitialData] = useState<Partial<EmployeeFormData> | undefined>()
  const [onboardingEndpoint, setOnboardingEndpoint] = useState<string | undefined>()
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
      const highPerformers = employeesData.filter((emp: Employee) => Number(emp.performance_score || 0) >= 8)
      const atRisk = employeesData.filter((emp: Employee) => emp.retention_risk === 'high')
      const avgPerformance = employeesData.length > 0 
        ? employeesData.reduce((sum: number, emp: Employee) => sum + Number(emp.performance_score || 0), 0) / employeesData.length
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

  useEffect(() => {
    if (!onboardingRequest?.applicationId || !sessionKey) return
    const fetchOnboardingPreview = async () => {
      setOnboardingLoading(true)
      setOnboardingError('')
      setActiveView('list')
      try {
        const response = await api.get(
          `/api/hr/recruitment/onboarding/${onboardingRequest.applicationId}/`,
          {
            headers: { Authorization: `Bearer ${sessionKey}` },
            params: { session_key: sessionKey }
          }
        )
        setOnboardingPreview(response.data)
      } catch (error: any) {
        setOnboardingError(error.response?.data?.detail || 'Unable to load candidate onboarding details.')
      } finally {
        setOnboardingLoading(false)
      }
    }
    fetchOnboardingPreview()
  }, [onboardingRequest?.applicationId, sessionKey])

  const handleAddEmployee = () => {
    // Clear any existing employee data to ensure clean create form
    setSelectedEmployee(undefined)
    setOnboardingInitialData(undefined)
    setOnboardingEndpoint(undefined)
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
    const wasCandidateOnboarding = Boolean(onboardingEndpoint)
    setShowForm(false)
    setSelectedEmployee(undefined)
    setOnboardingInitialData(undefined)
    setOnboardingEndpoint(undefined)
    if (wasCandidateOnboarding) {
      onOnboardingHandled?.()
    }
  }

  const handleViewClose = () => {
    setShowView(false)
    setSelectedEmployee(undefined)
  }

  const handleFormSave = (_employee: Employee) => {
    setRefreshKey(prev => prev + 1)
    fetchEmployeeStats()
    if (onboardingEndpoint) {
      setOnboardingPreview(null)
      setOnboardingInitialData(undefined)
      setOnboardingEndpoint(undefined)
      onOnboardingHandled?.()
    }
  }

  const closeOnboarding = () => {
    setOnboardingPreview(null)
    setOnboardingError('')
    onOnboardingHandled?.()
  }

  const startCandidateConversion = () => {
    if (!onboardingPreview || onboardingPreview.already_converted) return
    setSelectedEmployee(undefined)
    setOnboardingInitialData(onboardingPreview.initial_data)
    setOnboardingEndpoint(`/api/hr/recruitment/onboarding/${onboardingPreview.application_id}/`)
    setShowForm(true)
    setOnboardingPreview(null)
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
          initialData={onboardingInitialData}
          createEndpoint={onboardingEndpoint}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {(onboardingLoading || onboardingError || onboardingPreview) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-semibold text-gray-950 dark:text-white">Candidate onboarding</h2>
                <p className="text-sm text-gray-500">Review the accepted offer before creating an employee.</p>
              </div>
              <button onClick={closeOnboarding} className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6">
              {onboardingLoading ? (
                <p className="py-10 text-center text-gray-500">Loading candidate details...</p>
              ) : onboardingError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{onboardingError}</div>
              ) : onboardingPreview && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"><Users className="h-5 w-5 text-indigo-600" /><p className="mt-2 text-xs text-gray-500">Candidate</p><p className="font-semibold">{onboardingPreview.candidate_name}</p><p className="text-xs text-gray-500">{onboardingPreview.application_number}</p></div>
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"><Briefcase className="h-5 w-5 text-indigo-600" /><p className="mt-2 text-xs text-gray-500">Position</p><p className="font-semibold">{onboardingPreview.job_title}</p></div>
                    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"><IndianRupee className="h-5 w-5 text-indigo-600" /><p className="mt-2 text-xs text-gray-500">Annual offer</p><p className="font-semibold">₹{Number(onboardingPreview.annual_salary_offered).toLocaleString('en-IN')}</p></div>
                  </div>
                  {onboardingPreview.resume_url && <a href={onboardingPreview.resume_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"><FileText className="h-4 w-4" />Review candidate resume</a>}
                  {onboardingPreview.already_converted ? (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">This candidate is already linked to employee {onboardingPreview.employee?.employee_id || ''}.</div>
                  ) : (
                    <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">Candidate personal details, department, designation, joining date and offered salary will be prefilled. HR can verify and complete statutory, bank and emergency details before saving.</div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
              <Button variant="outline" onClick={closeOnboarding}>Close</Button>
              {onboardingPreview && !onboardingPreview.already_converted && <Button onClick={startCandidateConversion}>Create Employee Profile</Button>}
            </div>
          </div>
        </div>
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
