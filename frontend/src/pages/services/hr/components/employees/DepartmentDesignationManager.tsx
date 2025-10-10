import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Building, Briefcase, X, Save } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface DepartmentDesignationManagerProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: () => void
}

const DepartmentDesignationManager: React.FC<DepartmentDesignationManagerProps> = ({
  isOpen,
  onClose,
  onUpdate
}) => {
  const { sessionKey } = useServiceUserStore()
  const [departments, setDepartments] = useState<any[]>([])
  const [designations, setDesignations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [showDeptForm, setShowDeptForm] = useState(false)
  const [showDesigForm, setShowDesigForm] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)
  const [editingDesig, setEditingDesig] = useState<any>(null)
  
  const [deptForm, setDeptForm] = useState({
    name: '',
    code: '',
    description: ''
  })
  
  const [desigForm, setDesigForm] = useState({
    title: '',
    code: '',
    department: '',
    level: 'entry',
    min_salary: '',
    max_salary: ''
  })

  useEffect(() => {
    if (isOpen && sessionKey) {
      fetchData()
    }
  }, [isOpen, sessionKey])

  const fetchData = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const [deptResponse, desigResponse] = await Promise.all([
        api.get('/api/hr/departments/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),
        api.get('/api/hr/designations/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
      ])
      
      setDepartments(Array.isArray(deptResponse.data) ? deptResponse.data : [])
      setDesignations(Array.isArray(desigResponse.data) ? desigResponse.data : [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    try {
      const url = editingDept 
        ? `/api/hr/departments/${editingDept.id}/`
        : '/api/hr/departments/'
      
      const method = editingDept ? 'put' : 'post'
      
      await api[method](url, {
        ...deptForm,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      toast.success(editingDept ? 'Department updated' : 'Department created')
      setShowDeptForm(false)
      setEditingDept(null)
      setDeptForm({ name: '', code: '', description: '' })
      fetchData()
      onUpdate()
    } catch (error: any) {
      console.error('Error saving department:', error)
      toast.error(error.response?.data?.detail || 'Failed to save department')
    }
  }

  const handleDesigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    try {
      const url = editingDesig 
        ? `/api/hr/designations/${editingDesig.id}/`
        : '/api/hr/designations/'
      
      const method = editingDesig ? 'put' : 'post'
      
      await api[method](url, {
        ...desigForm,
        department: parseInt(desigForm.department),
        min_salary: parseFloat(desigForm.min_salary) || 0,
        max_salary: parseFloat(desigForm.max_salary) || 0,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      toast.success(editingDesig ? 'Designation updated' : 'Designation created')
      setShowDesigForm(false)
      setEditingDesig(null)
      setDesigForm({ title: '', code: '', department: '', level: 'entry', min_salary: '', max_salary: '' })
      fetchData()
      onUpdate()
    } catch (error: any) {
      console.error('Error saving designation:', error)
      toast.error(error.response?.data?.detail || 'Failed to save designation')
    }
  }

  const deleteDepartment = async (id: number) => {
    if (!confirm('Are you sure? This will also delete all designations in this department.')) return
    
    try {
      await api.delete(`/api/hr/departments/${id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      toast.success('Department deleted')
      fetchData()
      onUpdate()
    } catch (error) {
      toast.error('Failed to delete department')
    }
  }

  const deleteDesignation = async (id: number) => {
    if (!confirm('Are you sure you want to delete this designation?')) return
    
    try {
      await api.delete(`/api/hr/designations/${id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      toast.success('Designation deleted')
      fetchData()
      onUpdate()
    } catch (error) {
      toast.error('Failed to delete designation')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Manage Departments & Designations
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Departments */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5 text-blue-500" />
                    <span>Departments</span>
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowDeptForm(true)
                      setEditingDept(null)
                      setDeptForm({ name: '', code: '', description: '' })
                    }}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {departments.map((dept) => (
                      <div key={dept.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{dept.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{dept.code}</p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDept(dept)
                              setDeptForm({
                                name: dept.name,
                                code: dept.code,
                                description: dept.description || ''
                              })
                              setShowDeptForm(true)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteDepartment(dept.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Designations */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="h-5 w-5 text-green-500" />
                    <span>Designations</span>
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowDesigForm(true)
                      setEditingDesig(null)
                      setDesigForm({ title: '', code: '', department: '', level: 'entry', min_salary: '', max_salary: '' })
                    }}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-4">Loading...</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {designations.map((desig) => (
                      <div key={desig.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{desig.title}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {desig.code} • {departments.find(d => d.id === desig.department)?.name}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingDesig(desig)
                              setDesigForm({
                                title: desig.title,
                                code: desig.code,
                                department: desig.department.toString(),
                                level: desig.level,
                                min_salary: desig.min_salary?.toString() || '',
                                max_salary: desig.max_salary?.toString() || ''
                              })
                              setShowDesigForm(true)
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => deleteDesignation(desig.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Department Form */}
          {showDeptForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  {editingDept ? 'Edit Department' : 'Add Department'}
                </h3>
                <form onSubmit={handleDeptSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input
                      type="text"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Code *</label>
                    <input
                      type="text"
                      value={deptForm.code}
                      onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div className="flex space-x-3">
                    <Button type="submit" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowDeptForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Designation Form */}
          {showDesigForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold mb-4">
                  {editingDesig ? 'Edit Designation' : 'Add Designation'}
                </h3>
                <form onSubmit={handleDesigSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <input
                      type="text"
                      value={desigForm.title}
                      onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Code *</label>
                    <input
                      type="text"
                      value={desigForm.code}
                      onChange={(e) => setDesigForm({ ...desigForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Department *</label>
                    <select
                      value={desigForm.department}
                      onChange={(e) => setDesigForm({ ...desigForm, department: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Level</label>
                    <select
                      value={desigForm.level}
                      onChange={(e) => setDesigForm({ ...desigForm, level: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="entry">Entry Level</option>
                      <option value="junior">Junior</option>
                      <option value="mid">Mid Level</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead</option>
                      <option value="manager">Manager</option>
                      <option value="director">Director</option>
                      <option value="executive">Executive</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Min Salary</label>
                      <input
                        type="number"
                        value={desigForm.min_salary}
                        onChange={(e) => setDesigForm({ ...desigForm, min_salary: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Max Salary</label>
                      <input
                        type="number"
                        value={desigForm.max_salary}
                        onChange={(e) => setDesigForm({ ...desigForm, max_salary: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <Button type="submit" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowDesigForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DepartmentDesignationManager