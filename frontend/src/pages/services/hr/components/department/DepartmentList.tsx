import React, { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Users } from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import DepartmentForm from './DepartmentForm'
import toast from 'react-hot-toast'

interface Department {
  id: number
  name: string
  description: string
  head?: {
    id: number
    first_name: string
    last_name: string
  }
  employee_count: number
}

const DepartmentList: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const { sessionKey } = useServiceUserStore()

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get(`/api/hr/departments/?session_key=${sessionKey}`)
      setDepartments(response.data.results || response.data)
    } catch (error) {
      toast.error('Failed to fetch departments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (sessionKey) {
      fetchDepartments()
    }
  }, [sessionKey])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this department?')) return
    
    try {
      await apiClient.delete(`/api/hr/departments/${id}/?session_key=${sessionKey}`)
      toast.success('Department deleted successfully')
      fetchDepartments()
    } catch (error) {
      toast.error('Failed to delete department')
    }
  }

  const filteredDepartments = departments.filter(dept =>
    dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDepartments.map((department) => (
          <div key={department.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingDepartment(department)
                    setShowForm(true)
                  }}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(department.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">{department.description}</p>
            
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{department.employee_count} employees</span>
              </div>
              {department.head && (
                <span>Head: {department.head.first_name} {department.head.last_name}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredDepartments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No departments found</p>
        </div>
      )}

      {showForm && (
        <DepartmentForm
          department={editingDepartment}
          onClose={() => {
            setShowForm(false)
            setEditingDepartment(null)
          }}
          onSuccess={() => {
            fetchDepartments()
            setShowForm(false)
            setEditingDepartment(null)
          }}
        />
      )}
    </div>
  )
}

export default DepartmentList