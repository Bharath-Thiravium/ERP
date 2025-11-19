import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import EmployeeMobileApp from './services/hr/components/attendance/EmployeeMobileApp'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { User, AlertTriangle, Loader } from 'lucide-react'

interface Employee {
  id: number
  employee_id: string
  full_name: string
  email: string
  phone: string
  department: string
  designation: string
  photo?: string
  attendance_method: string
}

const EmployeeApp: React.FC = () => {
  const [searchParams] = useSearchParams()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [employeeId, setEmployeeId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    // Check if employee ID is in URL params
    const empId = searchParams.get('emp_id')
    if (empId) {
      setEmployeeId(empId)
      loginEmployee(empId)
    }
  }, [searchParams])

  const loginEmployee = async (empId: string) => {
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch(`/api/hr/employee-mobile/employee_login/?employee_id=${empId}`)
      const data = await response.json()
      
      if (data.success) {
        setEmployee(data.employee)
        setIsLoggedIn(true)
        localStorage.setItem('employee_data', JSON.stringify(data.employee))
      } else {
        setError(data.error || 'Employee not found')
      }
    } catch (error) {
      setError('Network error. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (employeeId.trim()) {
      loginEmployee(employeeId.trim())
    }
  }

  const handleLogout = () => {
    setEmployee(null)
    setIsLoggedIn(false)
    setEmployeeId('')
    localStorage.removeItem('employee_data')
  }

  // Check if employee is logged in from localStorage
  useEffect(() => {
    const savedEmployee = localStorage.getItem('employee_data')
    if (savedEmployee) {
      try {
        const empData = JSON.parse(savedEmployee)
        setEmployee(empData)
        setIsLoggedIn(true)
      } catch (error) {
        localStorage.removeItem('employee_data')
      }
    }
  }, [])

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Employee Attendance</h1>
              <p className="text-gray-600 mt-2">Enter your Employee ID to continue</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="Enter your Employee ID (e.g., EMP001)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !employeeId.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 py-3"
              >
                {isLoading ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                For field employees only. Contact HR if you need assistance.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Logout Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="bg-white/80 backdrop-blur-sm"
        >
          Logout
        </Button>
      </div>

      {/* Employee Mobile App */}
      <EmployeeMobileApp
        employeeId={employee.employee_id}
        employeeName={employee.full_name}
        employeePhoto={employee.photo}
      />
    </div>
  )
}

export default EmployeeApp