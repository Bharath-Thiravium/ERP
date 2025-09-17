import React, { useState } from 'react'
import EmployeeList from '../components/employee/EmployeeList'
import EmployeeForm from '../components/employee/EmployeeForm'

interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string
  department: number
  designation: number
  department_name: string
  designation_title: string
  city: string
  join_date: string
  status: string
}

interface EmployeesProps {
  sessionKey: string
}

const Employees: React.FC<EmployeesProps> = ({ sessionKey }) => {
  const [showForm, setShowForm] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleAddEmployee = () => {
    setSelectedEmployee(null)
    setShowForm(true)
  }

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowForm(true)
  }

  const handleViewEmployee = (employee: Employee) => {
    handleEditEmployee(employee)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedEmployee(null)
  }

  const handleSaveEmployee = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Employee Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage employee records, profiles, and organizational structure
        </p>
      </div>

      {/* Employee List */}
      <EmployeeList
        sessionKey={sessionKey}
        onAddEmployee={handleAddEmployee}
        onEditEmployee={handleEditEmployee}
        onViewEmployee={handleViewEmployee}
        refreshTrigger={refreshTrigger}
      />

      {/* Employee Form Modal */}
      {showForm && (
        <EmployeeForm
          sessionKey={sessionKey}
          employee={selectedEmployee}
          onClose={handleCloseForm}
          onSave={handleSaveEmployee}
        />
      )}
    </div>
  )
}

export default Employees