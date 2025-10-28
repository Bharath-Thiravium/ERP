import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Building, Briefcase, Save } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

const OrganizationManager: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [departments, setDepartments] = useState<any[]>([])
  const [designations, setDesignations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  const [showDeptForm, setShowDeptForm] = useState(false)
  const [showDesigForm, setShowDesigForm] = useState(false)
  const [editingDept, setEditingDept] = useState<any>(null)
  const [editingDesig, setEditingDesig] = useState<any>(null)
  
  const [deptForm, setDeptForm] = useState({ name: '', description: '' })
  const [desigForm, setDesigForm] = useState({
    title: '', department: '', level: 'entry', min_salary: '', max_salary: ''
  })

  useEffect(() => {
    if (sessionKey) fetchData()
  }, [sessionKey])

  const fetchData = async () => {
    if (!sessionKey) return
    setLoading(true)
    try {
      const [deptRes, desigRes] = await Promise.all([
        api.get('/api/hr/departments/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),
        api.get('/api/hr/designations/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
      ])
      setDepartments(deptRes.data.results || deptRes.data || [])
      setDesignations(desigRes.data.results || desigRes.data || [])
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
      const url = editingDept ? `/api/hr/departments/${editingDept.id}/` : '/api/hr/departments/'
      const method = editingDept ? 'put' : 'post'
      
      await api[method](url, { ...deptForm, session_key: sessionKey }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      toast.success(editingDept ? 'Department updated' : 'Department created')
      setShowDeptForm(false)
      setEditingDept(null)
      setDeptForm({ name: '', description: '' })
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save department')
    }
  }

  const handleDesigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    try {
      const url = editingDesig ? `/api/hr/designations/${editingDesig.id}/` : '/api/hr/designations/'
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
      setDesigForm({ title: '', department: '', level: 'entry', min_salary: '', max_salary: '' })
      fetchData()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save designation')
    }
  }

  const deleteDepartment = async (id: number) => {
    if (!confirm('Delete this department?')) return
    
    try {
      await api.delete(`/api/hr/departments/${id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      toast.success('Department deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete department')
    }
  }

  const deleteDesignation = async (id: number) => {
    if (!confirm('Delete this designation?')) return
    
    try {
      await api.delete(`/api/hr/designations/${id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      toast.success('Designation deleted')
      fetchData()
    } catch (error) {
      toast.error('Failed to delete designation')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-blue-500" />
                <span>Departments</span>
              </CardTitle>
              <Button size="sm" onClick={() => { setShowDeptForm(true); setEditingDept(null); setDeptForm({ name: '', description: '' }) }}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {departments.map((dept) => (
                <div key={dept.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{dept.name}</p>
                    <p className="text-sm text-gray-500">Code: {dept.code}</p>
                    {dept.description && <p className="text-xs text-gray-400">{dept.description}</p>}
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingDept(dept)
                      setDeptForm({ name: dept.name, description: dept.description || '' })
                      setShowDeptForm(true)
                    }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteDepartment(dept.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Briefcase className="h-5 w-5 text-green-500" />
                <span>Designations</span>
              </CardTitle>
              <Button size="sm" onClick={() => { setShowDesigForm(true); setEditingDesig(null); setDesigForm({ title: '', department: '', level: 'entry', min_salary: '', max_salary: '' }) }}>
                <Plus className="h-4 w-4 mr-1" />Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {designations.map((desig) => (
                <div key={desig.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{desig.title}</p>
                    <p className="text-sm text-gray-500">Code: {desig.code}</p>
                    <p className="text-xs text-gray-400">{departments.find(d => d.id === desig.department)?.name} • {desig.level}</p>
                  </div>
                  <div className="flex space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => {
                      setEditingDesig(desig)
                      setDesigForm({
                        title: desig.title, department: desig.department.toString(),
                        level: desig.level, min_salary: desig.min_salary?.toString() || '', max_salary: desig.max_salary?.toString() || ''
                      })
                      setShowDesigForm(true)
                    }}>
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteDesignation(desig.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {showDeptForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{editingDept ? 'Edit Department' : 'Add Department'}</h3>
            <form onSubmit={handleDeptSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Department Name *</label>
                <input type="text" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required placeholder="e.g., Information Technology" />
              </div>
              {editingDept && (
                <div>
                  <label className="block text-sm font-medium mb-2">Auto-Generated Code</label>
                  <input type="text" value={editingDept.code} className="w-full px-3 py-2 border rounded-lg bg-gray-100" disabled />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
              </div>
              <div className="flex space-x-3">
                <Button type="submit" className="flex-1"><Save className="h-4 w-4 mr-2" />Save</Button>
                <Button type="button" variant="outline" onClick={() => setShowDeptForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDesigForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{editingDesig ? 'Edit Designation' : 'Add Designation'}</h3>
            <form onSubmit={handleDesigSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Designation Title *</label>
                <input type="text" value={desigForm.title} onChange={(e) => setDesigForm({ ...desigForm, title: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required placeholder="e.g., Software Engineer" />
              </div>
              {editingDesig && (
                <div>
                  <label className="block text-sm font-medium mb-2">Auto-Generated Code</label>
                  <input type="text" value={editingDesig.code} className="w-full px-3 py-2 border rounded-lg bg-gray-100" disabled />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Department *</label>
                <select value={desigForm.department} onChange={(e) => setDesigForm({ ...desigForm, department: e.target.value })} className="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">Select Department</option>
                  {departments.map((dept) => (<option key={dept.id} value={dept.id}>{dept.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Level</label>
                <select value={desigForm.level} onChange={(e) => setDesigForm({ ...desigForm, level: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
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
                  <input type="number" value={desigForm.min_salary} onChange={(e) => setDesigForm({ ...desigForm, min_salary: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Max Salary</label>
                  <input type="number" value={desigForm.max_salary} onChange={(e) => setDesigForm({ ...desigForm, max_salary: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="flex space-x-3">
                <Button type="submit" className="flex-1"><Save className="h-4 w-4 mr-2" />Save</Button>
                <Button type="button" variant="outline" onClick={() => setShowDesigForm(false)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrganizationManager