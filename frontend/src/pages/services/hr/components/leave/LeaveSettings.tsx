import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Trash2 } from 'lucide-react'
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
  is_active: boolean
}

const LeaveSettings: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newLeaveType, setNewLeaveType] = useState<LeaveType>({
    name: '',
    code: '',
    category: 'earned',
    days_per_year: 12,
    carry_forward: false,
    max_carry_forward: 0,
    is_active: true
  })

  useEffect(() => {
    fetchLeaveTypes()
  }, [sessionKey])

  const fetchLeaveTypes = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/leave-types/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setLeaveTypes(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching leave types:', error)
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
      const payload = { ...newLeaveType, session_key: sessionKey }
      await api.post('/api/hr/leave-types/', payload, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success('Leave type added successfully')
      setNewLeaveType({
        name: '',
        code: '',
        category: 'earned',
        days_per_year: 12,
        carry_forward: false,
        max_carry_forward: 0,
        is_active: true
      })
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add leave type')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLeaveType = async (id: number) => {
    if (!sessionKey) return
    
    if (!confirm('Are you sure you want to delete this leave type?')) {
      return
    }
    
    try {
      await api.delete(`/api/hr/leave-types/${id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      
      toast.success('Leave type deleted successfully')
      fetchLeaveTypes()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete leave type')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
              <label className="block text-sm font-medium mb-2">Leave Type Name</label>
              <input
                type="text"
                value={newLeaveType.name}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., Annual Leave"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Code</label>
              <input
                type="text"
                value={newLeaveType.code}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="e.g., AL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={newLeaveType.category}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="earned">Earned Leave</option>
                <option value="casual">Casual Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="maternity">Maternity Leave</option>
                <option value="paternity">Paternity Leave</option>
                <option value="compensatory">Compensatory Off</option>
                <option value="unpaid">Unpaid Leave</option>
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
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newLeaveType.carry_forward}
                onChange={(e) => setNewLeaveType({ ...newLeaveType, carry_forward: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Allow Carry Forward</span>
            </label>
            <label className="flex items-center space-x-2">
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
                {leaveTypes.map((leaveType) => (
                  <tr key={leaveType.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{leaveType.name}</td>
                    <td className="p-3">{leaveType.code}</td>
                    <td className="p-3">
                      <span className="capitalize">{leaveType.category?.replace('_', ' ')}</span>
                    </td>
                    <td className="p-3">{leaveType.days_per_year}</td>
                    <td className="p-3">
                      {leaveType.carry_forward ? (
                        <span className="text-green-600">
                          Yes ({leaveType.max_carry_forward} max)
                        </span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        leaveType.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {leaveType.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => leaveType.id && handleDeleteLeaveType(leaveType.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default LeaveSettings