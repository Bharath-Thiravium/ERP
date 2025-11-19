import React, { useState, useEffect } from 'react'
import { Plus, Clock, User, Save } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface ManualAttendanceEntryProps {
  onSuccess: () => void
}

const ManualAttendanceEntry: React.FC<ManualAttendanceEntryProps> = ({ onSuccess }) => {
  const { sessionKey } = useServiceUserStore()
  const [employees, setEmployees] = useState<any[]>([])
  // const [loading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in_time: '',
    check_out_time: '',
    notes: '',
    status: 'present'
  })

  useEffect(() => {
    fetchEmployees()
  }, [sessionKey])

  const fetchEmployees = async () => {
    if (!sessionKey) return
    
    // setLoading(true)
    try {
      const response = await api.get('/api/hr/employees/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setEmployees(response.data.results || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to load employees')
    } finally {
      // setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employee_id) {
      toast.error('Please select an employee')
      return
    }
    
    if (!formData.check_in_time && formData.status === 'present') {
      toast.error('Check-in time is required for present status')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        check_in_time: formData.check_in_time ? `${formData.date}T${formData.check_in_time}:00` : null,
        check_out_time: formData.check_out_time ? `${formData.date}T${formData.check_out_time}:00` : null,
        session_key: sessionKey
      }

      await api.post('/api/hr/attendance/manual-entry/', payload, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success('Attendance recorded successfully')
      onSuccess()
      
      // Reset form
      setFormData({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        check_in_time: '',
        check_out_time: '',
        notes: '',
        status: 'present'
      })
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      toast.error(error.response?.data?.detail || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'absent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'late': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'half_day': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'leave': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'holiday': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <Plus className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Manual Attendance Entry
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manually record employee attendance for any date
            </p>
          </div>
        </div>
      </div>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <span>Attendance Entry Form</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Employee Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee *
                </label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {/* Check-in Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Check-in Time
                </label>
                <input
                  type="time"
                  value={formData.check_in_time}
                  onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              {/* Check-out Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Check-out Time
                </label>
                <input
                  type="time"
                  value={formData.check_out_time}
                  onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { value: 'present', label: 'Present' },
                  { value: 'absent', label: 'Absent' },
                  { value: 'late', label: 'Late' },
                  { value: 'half_day', label: 'Half Day' },
                  { value: 'leave', label: 'On Leave' },
                  { value: 'holiday', label: 'Holiday' }
                ].map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: status.value })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formData.status === status.value
                        ? getStatusColor(status.value)
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Add any additional notes about this attendance entry..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    employee_id: '',
                    date: new Date().toISOString().split('T')[0],
                    check_in_time: '',
                    check_out_time: '',
                    notes: '',
                    status: 'present'
                  })
                }}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={() => {
                setFormData({
                  ...formData,
                  check_in_time: '09:00',
                  check_out_time: '18:00',
                  status: 'present'
                })
              }}
              variant="outline"
              className="h-16 flex-col space-y-2"
            >
              <Clock className="h-5 w-5" />
              <span>Full Day Present</span>
            </Button>
            
            <Button
              onClick={() => {
                setFormData({
                  ...formData,
                  check_in_time: '09:30',
                  check_out_time: '18:00',
                  status: 'late'
                })
              }}
              variant="outline"
              className="h-16 flex-col space-y-2"
            >
              <Clock className="h-5 w-5" />
              <span>Late Arrival</span>
            </Button>
            
            <Button
              onClick={() => {
                setFormData({
                  ...formData,
                  check_in_time: '',
                  check_out_time: '',
                  status: 'absent'
                })
              }}
              variant="outline"
              className="h-16 flex-col space-y-2"
            >
              <User className="h-5 w-5" />
              <span>Mark Absent</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ManualAttendanceEntry