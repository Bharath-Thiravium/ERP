import React, { useState, useEffect } from 'react'
import { Calendar, Plus, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'

const LeaveManagement: React.FC = () => {
  const [activeView, setActiveView] = useState('overview')
  const [leaveBalances, setLeaveBalances] = useState<any[]>([])
  const [leaveApplications, setLeaveApplications] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [balances, applications, holidayList] = await Promise.all([
        apiClient.get('/api/hr/leave-balances/'),
        apiClient.get('/api/hr/leave-applications/'),
        apiClient.get('/api/hr/holidays/')
      ])
      setLeaveBalances(balances.data.results || [])
      setLeaveApplications(applications.data.results || [])
      setHolidays(holidayList.data.results || [])
    } catch (error) {
      console.error('Error loading leave data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApplyLeave = async (data: any) => {
    try {
      await apiClient.post('/api/hr/leave-applications/', data)
      toast.success('Leave application submitted successfully')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to apply leave')
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Calendar },
    { id: 'apply', label: 'Apply Leave', icon: Plus },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'holidays', label: 'Holidays', icon: Calendar }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Leave Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive leave tracking and holiday management system
            </p>
          </div>
          <div className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl">
            <Calendar className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Premium Navigation Tabs */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-2 shadow-xl">
        <div className="flex space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeView === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg shadow-purple-500/25'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 mr-2 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Container */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <div className="p-6">

      {activeView === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold mb-4">Leave Balance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {leaveBalances.map((balance) => (
                <Card key={balance.id}>
                  <CardHeader>
                    <CardTitle>{balance.leave_type_name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{balance.closing_balance}</div>
                    <p className="text-sm text-gray-500">days available</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaveApplications.slice(0, 5).map((app) => (
                  <div key={app.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium">{app.leave_type_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(app.from_date).toLocaleDateString()} - {new Date(app.to_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      app.status === 'approved' ? 'bg-green-100 text-green-800' :
                      app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeView === 'apply' && (
        <Card>
          <CardHeader>
            <CardTitle>Apply for Leave</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              handleApplyLeave({
                leave_type: formData.get('leave_type'),
                from_date: formData.get('from_date'),
                to_date: formData.get('to_date'),
                reason: formData.get('reason')
              })
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Leave Type</label>
                <select name="leave_type" required className="w-full p-2 border rounded-lg dark:bg-gray-800">
                  <option value="">Select leave type</option>
                  {leaveBalances.map(b => (
                    <option key={b.leave_type} value={b.leave_type}>{b.leave_type_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">From Date</label>
                  <input type="date" name="from_date" required className="w-full p-2 border rounded-lg dark:bg-gray-800" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">To Date</label>
                  <input type="date" name="to_date" required className="w-full p-2 border rounded-lg dark:bg-gray-800" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Reason</label>
                <textarea name="reason" required rows={4} className="w-full p-2 border rounded-lg dark:bg-gray-800" />
              </div>
              <Button type="submit">Submit Application</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeView === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Leave History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Leave Type</th>
                    <th className="text-left p-3">From Date</th>
                    <th className="text-left p-3">To Date</th>
                    <th className="text-left p-3">Days</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Applied On</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveApplications.map(app => (
                    <tr key={app.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-3">{app.leave_type_name}</td>
                      <td className="p-3">{new Date(app.from_date).toLocaleDateString()}</td>
                      <td className="p-3">{new Date(app.to_date).toLocaleDateString()}</td>
                      <td className="p-3">{app.total_days}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          app.status === 'approved' ? 'bg-green-100 text-green-800' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-3">{new Date(app.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

          {activeView === 'holidays' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Holiday Calendar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {holidays.map((holiday) => (
                    <div key={holiday.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium">{holiday.name}</p>
                        <p className="text-sm text-gray-500">{new Date(holiday.date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        holiday.is_mandatory ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {holiday.holiday_type}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default LeaveManagement
