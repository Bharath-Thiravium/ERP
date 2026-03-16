import React, { useState, useEffect, useCallback } from 'react'
import { Search, Filter, Plus, Edit, Eye, Trash2, Users, Building, Mail, Phone, UserX } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Employee, EmployeeFilters } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface EmployeeListProps {
  onAddEmployee?: () => void
  onEditEmployee?: (employee: Employee) => void
  onViewEmployee?: (employee: Employee) => void
}

const EmployeeList: React.FC<EmployeeListProps> = ({
  onAddEmployee,
  onEditEmployee,
  onViewEmployee
}) => {
  const { sessionKey } = useServiceUserStore()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<EmployeeFilters>({})

  const fetchEmployees = useCallback(async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.department) params.append('department', filters.department.toString())
      if (filters.status) params.append('status', filters.status)
      
      const response = await api.get(`/api/hr/employees/?${params.toString()}&session_key=${sessionKey}`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      setEmployees(response.data.results || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    } finally {
      setLoading(false)
    }
  }, [sessionKey, filters.search, filters.department, filters.status])

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!sessionKey) return
    
    if (!confirm(`Are you sure you want to permanently delete ${employee.full_name}? This action cannot be undone.`)) {
      return
    }
    
    try {
      await api.delete(`/api/hr/employees/${employee.id}/?session_key=${sessionKey}`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      // Remove from local state immediately
      setEmployees(prev => prev.filter(emp => emp.id !== employee.id))
      toast.success('Employee deleted successfully')
    } catch (error) {
      console.error('Error deleting employee:', error)
      toast.error('Failed to delete employee')
      // Refresh the list to ensure consistency
      fetchEmployees()
    }
  }

  const handleTerminateEmployee = async (employee: Employee) => {
    if (!sessionKey) return
    
    const reason = prompt(`Enter termination reason for ${employee.full_name}:`)
    if (!reason) return
    
    const terminationDate = prompt('Enter termination date (YYYY-MM-DD):', new Date().toISOString().split('T')[0])
    if (!terminationDate) return
    
    try {
      await api.patch(`/api/hr/employees/${employee.id}/?session_key=${sessionKey}`, {
        status: 'terminated',
        termination_reason: reason,
        termination_date: terminationDate
      })
      
      toast.success('Employee terminated successfully')
      fetchEmployees() // Refresh the list
    } catch (error) {
      console.error('Error terminating employee:', error)
      toast.error('Failed to terminate employee')
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [fetchEmployees])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'on_leave': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-500" />
            <span>Employee Directory</span>
          </CardTitle>
          <Button onClick={onAddEmployee} className="bg-gradient-to-r from-blue-500 to-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No employees found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by adding your first employee</p>
            <Button onClick={onAddEmployee} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map((employee) => (
              <div key={employee.id} className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{employee.full_name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{employee.employee_id}</p>
                      <div className="flex items-center space-x-4 mt-1">
                        <div className="flex items-center space-x-1">
                          <Building className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{employee.department_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">{employee.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(employee.status)}`}>
                          {employee.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getRiskColor(employee.retention_risk)}`}>
                          {employee.retention_risk} risk
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Performance: {employee.performance_score}/10
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        {employee.mobile_app_enabled ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            📱 Mobile Enabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            📱 Mobile Disabled
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onViewEmployee?.(employee)}
                        className="hover:bg-blue-100 dark:hover:bg-blue-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onEditEmployee?.(employee)}
                        className="hover:bg-green-100 dark:hover:bg-green-900"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {employee.status !== 'terminated' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleTerminateEmployee(employee)}
                          className="text-orange-500 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
                          title="Terminate Employee"
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteEmployee(employee)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EmployeeList