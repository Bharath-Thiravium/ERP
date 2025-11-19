import React, { useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface LeaveApplication {
  id: number
  employee_name: string
  leave_type_name: string
  from_date: string
  to_date: string
  status: string
}

interface Holiday {
  id: number
  name: string
  date: string
  holiday_type: string
}

const LeaveCalendar: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(false)
  const [showHolidayModal, setShowHolidayModal] = useState(false)
  const [newHoliday, setNewHoliday] = useState({
    name: '',
    date: '',
    holiday_type: 'national',
    description: ''
  })

  useEffect(() => {
    fetchLeaves()
    fetchHolidays()
  }, [sessionKey, currentDate])

  const fetchLeaves = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1
      
      const response = await api.get('/api/hr/leave-applications/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          year,
          month,
          status: 'approved'
        }
      })
      setLeaves(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching leaves:', error)
      toast.error('Failed to fetch leave data')
    } finally {
      setLoading(false)
    }
  }

  const fetchHolidays = async () => {
    if (!sessionKey) return
    
    try {
      const year = currentDate.getFullYear()
      const response = await api.get('/api/hr/holidays/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          year
        }
      })
      setHolidays(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching holidays:', error)
      toast.error('Failed to fetch holidays')
    }
  }

  const handleAddHoliday = async () => {
    if (!sessionKey || !newHoliday.name || !newHoliday.date) {
      toast.error('Please fill all required fields')
      return
    }
    
    try {
      const payload = { ...newHoliday, session_key: sessionKey }
      await api.post('/api/hr/holidays/', payload, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success('Holiday added successfully')
      setShowHolidayModal(false)
      setNewHoliday({
        name: '',
        date: '',
        holiday_type: 'national',
        description: ''
      })
      fetchHolidays()
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add holiday')
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getHoliday = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return holidays.find(holiday => holiday.date === dateStr)
  }

  const getLeavesForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return leaves.filter(leave => {
      const fromDate = new Date(leave.from_date)
      const toDate = new Date(leave.to_date)
      const checkDate = new Date(dateStr)
      return checkDate >= fromDate && checkDate <= toDate
    })
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <Button variant="ghost" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <Button onClick={() => setShowHolidayModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Holiday
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <span>Leave Calendar</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {dayNames.map((day) => (
                <div key={day} className="p-2 text-center font-medium text-gray-600 border-b">
                  {day}
                </div>
              ))}
              
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} className="p-2 h-24"></div>
              ))}
              
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const holiday = getHoliday(day)
                const dayLeaves = getLeavesForDay(day)
                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString()
                
                return (
                  <div
                    key={day}
                    className={`p-2 h-24 border border-gray-200 relative ${
                      isToday ? 'bg-blue-50 border-blue-300' : ''
                    } ${holiday ? 'bg-red-50' : ''} ${dayLeaves.length > 0 ? 'bg-yellow-50' : ''}`}
                  >
                    <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                      {day}
                    </div>
                    
                    {holiday && (
                      <div className="text-xs text-red-600 font-medium truncate mt-1">
                        {holiday.name}
                      </div>
                    )}
                    
                    {dayLeaves.slice(0, 2).map((leave) => (
                      <div
                        key={leave.id}
                        className="text-xs bg-yellow-200 text-yellow-800 px-1 rounded truncate mt-1"
                        title={`${leave.employee_name} - ${leave.leave_type_name}`}
                      >
                        {leave.employee_name}
                      </div>
                    ))}
                    
                    {dayLeaves.length > 2 && (
                      <div className="text-xs text-gray-500 mt-1">
                        +{dayLeaves.length - 2} more
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-200 rounded"></div>
              <span className="text-sm">Leave Days</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span className="text-sm">Holidays</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-200 rounded"></div>
              <span className="text-sm">Today</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Holiday</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Holiday Name</label>
                <input
                  type="text"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Independence Day"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Holiday Type</label>
                <select
                  value={newHoliday.holiday_type}
                  onChange={(e) => setNewHoliday({ ...newHoliday, holiday_type: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="national">National Holiday</option>
                  <option value="regional">Regional Holiday</option>
                  <option value="optional">Optional Holiday</option>
                  <option value="company">Company Holiday</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button variant="ghost" onClick={() => setShowHolidayModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddHoliday}>
                Add Holiday
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LeaveCalendar