import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2, Pencil, ToggleLeft, ToggleRight, X } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface LeaveType {
  id?: number
  name: string
  code: string
  category: string
  days_per_year: number
  carry_forward: boolean
  max_carry_forward: number
  is_paid: boolean
  requires_approval: boolean
  min_days_notice: number
  is_active: boolean
}

const EMPTY_FORM: LeaveType = {
  name: '',
  code: '',
  category: 'earned',
  days_per_year: 12,
  carry_forward: false,
  max_carry_forward: 0,
  is_paid: true,
  requires_approval: true,
  min_days_notice: 0,
  is_active: true,
}

const CATEGORIES = [
  { value: 'earned', label: 'Earned Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'compensatory', label: 'Compensatory Off' },
  { value: 'unpaid', label: 'Unpaid Leave' },
]

const LeaveSettings: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newLeaveType, setNewLeaveType] = useState<LeaveType>(EMPTY_FORM)

  // Edit modal state
  const [editTarget, setEditTarget] = useState<LeaveType | null>(null)
  const [editForm, setEditForm] = useState<LeaveType>(EMPTY_FORM)
  const [editSaving, setEditSaving] = useState(false)

  useEffect(() => { fetchLeaveTypes() }, [sessionKey])

  const fetchLeaveTypes = async () => {
    if (!sessionKey) return
    setLoading(true)
    try {
      const response = await api.get('/api/hr/leave-types/')
      setLeaveTypes(response.data.results || response.data || [])
    } catch {
      toast.error('Failed to fetch leave types')
    } finally {
      setLoading(false)
    }
  }

  const handleAddLeaveType = async () => {
    if (!sessionKey || !newLeaveType.name || !newLeaveType.code || !newLeaveType.category) {
      toast.error('Please fill all required fields')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/hr/leave-types/', newLeaveType)
      toast.success('Leave type added successfully')
      setNewLeaveType(EMPTY_FORM)
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add leave type')
    } finally {
      setSaving(false)
    }
  }

  const openEditModal = (lt: LeaveType) => {
    setEditTarget(lt)
    setEditForm({ ...lt })
  }

  const closeEditModal = () => {
    setEditTarget(null)
    setEditForm(EMPTY_FORM)
  }

  const handleEditSave = async () => {
    if (!sessionKey || !editTarget?.id) return
    if (!editForm.name || !editForm.code || !editForm.category) {
      toast.error('Please fill all required fields')
      return
    }
    setEditSaving(true)
    try {
      await api.patch(`/api/hr/leave-types/${editTarget.id}/`, editForm)
      toast.success('Leave type updated successfully')
      closeEditModal()
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update leave type')
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggleActive = async (lt: LeaveType) => {
    if (!sessionKey || !lt.id) return
    try {
      const response = await api.post(`/api/hr/leave-types/${lt.id}/toggle_active/`, {})
      toast.success(`Leave type ${response.data.is_active ? 'activated' : 'deactivated'}`)
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to toggle status')
    }
  }

  const handleDeleteLeaveType = async (id: number) => {
    if (!sessionKey) return
    if (!confirm('Are you sure you want to delete this leave type?')) return
    try {
      await api.delete(`/api/hr/leave-types/${id}/`)
      toast.success('Leave type deleted successfully')
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete leave type')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── Add Leave Type ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-green-500" />
            <span>Add Leave Type</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Leave Type Name *</label>
              <input
                type="text"
                value={newLeaveType.name}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Annual Leave"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Code *</label>
              <input
                type="text"
                value={newLeaveType.code}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., AL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category *</label>
              <select
                value={newLeaveType.category}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Days per Year</label>
              <input
                type="number"
                value={newLeaveType.days_per_year}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, days_per_year: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Max Carry Forward</label>
              <input
                type="number"
                value={newLeaveType.max_carry_forward}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, max_carry_forward: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-lg"
                min="0"
                disabled={!newLeaveType.carry_forward}
              />
            </div>
          </div>
          <div className="flex items-center space-x-4 mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newLeaveType.carry_forward}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, carry_forward: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Allow Carry Forward</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newLeaveType.is_paid}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, is_paid: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Paid Leave</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newLeaveType.requires_approval}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, requires_approval: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Requires Approval</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newLeaveType.is_active}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, is_active: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <Button onClick={handleAddLeaveType} disabled={saving}>
            <Plus className="h-4 w-4 mr-2" />
            {saving ? 'Adding...' : 'Add Leave Type'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Leave Types Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span>Leave Types</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Code</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-left p-3">Days/Year</th>
                  <th className="text-left p-3">Carry Forward</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaveTypes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">No leave types found</td>
                  </tr>
                ) : leaveTypes.map((lt) => (
                  <tr key={lt.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{lt.name}</td>
                    <td className="p-3 font-mono text-sm">{lt.code}</td>
                    <td className="p-3 capitalize">{lt.category?.replace('_', ' ')}</td>
                    <td className="p-3">{lt.days_per_year}</td>
                    <td className="p-3">
                      {lt.carry_forward
                        ? <span className="text-green-600">Yes ({lt.max_carry_forward} max)</span>
                        : <span className="text-gray-500">No</span>}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        lt.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {lt.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-1">
                        {/* Edit */}
                        <button
                          onClick={() => openEditModal(lt)}
                          title="Edit"
                          className="p-1.5 rounded hover:bg-blue-50 text-blue-600 hover:text-blue-800 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {/* Toggle Active / Inactive */}
                        <button
                          onClick={() => handleToggleActive(lt)}
                          title={lt.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded transition-colors ${
                            lt.is_active
                              ? 'hover:bg-yellow-50 text-yellow-600 hover:text-yellow-800'
                              : 'hover:bg-green-50 text-green-600 hover:text-green-800'
                          }`}
                        >
                          {lt.is_active
                            ? <ToggleRight className="h-4 w-4" />
                            : <ToggleLeft className="h-4 w-4" />}
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => lt.id && handleDeleteLeaveType(lt.id)}
                          title="Delete"
                          className="p-1.5 rounded hover:bg-red-50 text-red-600 hover:text-red-800 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Edit Modal ── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Edit Leave Type</h2>
              <button onClick={closeEditModal} className="p-1 rounded hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Leave Type Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Code *</label>
                  <input
                    type="text"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Days per Year</label>
                  <input
                    type="number"
                    value={editForm.days_per_year}
                    onChange={(e) => setEditForm({ ...editForm, days_per_year: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min Days Notice</label>
                  <input
                    type="number"
                    value={editForm.min_days_notice}
                    onChange={(e) => setEditForm({ ...editForm, min_days_notice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Carry Forward</label>
                  <input
                    type="number"
                    value={editForm.max_carry_forward}
                    onChange={(e) => setEditForm({ ...editForm, max_carry_forward: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    disabled={!editForm.carry_forward}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.carry_forward}
                    onChange={(e) => setEditForm({ ...editForm, carry_forward: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Allow Carry Forward</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_paid}
                    onChange={(e) => setEditForm({ ...editForm, is_paid: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Paid Leave</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.requires_approval}
                    onChange={(e) => setEditForm({ ...editForm, requires_approval: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Requires Approval</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <Button variant="ghost" onClick={closeEditModal} disabled={editSaving}>
                Cancel
              </Button>
              <Button onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveSettings
