import { apiClient } from '../lib/api'

export interface Employee {
  id: number
  employee_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  department: {
    id: number
    name: string
  }
  designation: {
    id: number
    title: string
  }
  status: string
  created_at: string
}

export interface EmployeeStats {
  total_employees: number
  active_employees: number
  inactive_employees: number
  departments: number
}

export const employeeAPI = {
  // Get all employees with optional search and filters
  getEmployees: (params?: {
    search?: string
    status?: string
    department?: number
    page?: number
  }) => apiClient.get('/api/athens-sust/employees/', { params }),
  
  // Get single employee details
  getEmployee: (id: number) => 
    apiClient.get(`/api/athens-sust/employees/${id}/`),
  
  // Get employee statistics
  getStats: () => 
    apiClient.get('/api/athens-sust/employees/stats/'),
}

export default employeeAPI