import React, { useState, useEffect } from 'react'
import { Users, Calendar, Download, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface LeaveBalance {
  id: number
  employee_name: string
  leave_type_name: string
  year: number
  opening_balance: number
  credited: number
  used: number
  closing_balance: number
}

interface Employee {
  id: number
  full_name: string
}

const LeaveBalances: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [balances, setBalances] = useState<LeaveBalance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    fetchBalances()
    fetchEmployees()
  }, [sessionKey, selectedEmployee, selectedYear])

  const fetchBalances = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/leave-balances/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          employee: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          year: selectedYear
        }
      })
      setBalances(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching balances:', error)
      toast.error('Failed to fetch leave balances')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/employees/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setEmployees(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const exportBalances = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/leave-balances/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { 
          session_key: sessionKey,
          export: 'csv',
          employee: selectedEmployee !== 'all' ? selectedEmployee : undefined,
          year: selectedYear
        },
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      const sanitizedYear = String(selectedYear).replace(/[^0-9]/g, '')
      link.setAttribute('download', `leave_balances_${sanitizedYear}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error: any) {
      console.error('Error exporting balances:', error)
      toast.error('Failed to export balances')
    }
  }

  const initializeBalances = async () => {
    if (!sessionKey) return
    
    try {
      await api.post('/api/hr/leave-balances/initialize/', 
        { year: selectedYear, session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      toast.success('Leave balances initialized successfully')
      fetchBalances()
    } catch (error: any) {
      console.error('Error initializing balances:', error)
      toast.error('Failed to initialize balances')
    }
  }

  const recalculateBalances = async () => {
    if (!sessionKey) return
    
    try {
      await api.post('/api/hr/leave-balances/recalculate/', 
        { year: selectedYear, session_key: sessionKey },
        { headers: { Authorization: `Bearer ${sessionKey}` } }
      )
      toast.success('Leave balances recalculated successfully')
      fetchBalances()
    } catch (error: any) {
      console.error('Error recalculating balances:', error)
      toast.error('Failed to recalculate balances')
    }
  }

  const getBalanceColor = (balance: number, total: number) => {
    const percentage = (balance / total) * 100
    if (percentage > 70) return 'text-green-600'
    if (percentage > 30) return 'text-yellow-600'
    return 'text-red-600'
  }

  const groupedBalances = balances.reduce((acc, balance) => {
    const key = balance.employee_name
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(balance)
    return acc
  }, {} as Record<string, LeaveBalance[]>)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.full_name}</option>
            ))}
          </select>
          
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-lg"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        
        <div className="flex space-x-2">
          <Button onClick={initializeBalances} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Initialize Balances
          </Button>
          <Button onClick={recalculateBalances} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Recalculate
          </Button>
          <Button onClick={exportBalances}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedBalances).map(([employeeName, employeeBalances]) => (
            <Card key={employeeName}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span>{employeeName}</span>
                  <span className="text-sm text-gray-500">({selectedYear})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {employeeBalances.map((balance) => (
                    <div key={balance.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-900">{balance.leave_type_name}</h4>
                        <span className={`text-lg font-bold ${getBalanceColor(balance.closing_balance, balance.opening_balance + balance.credited)}`}>
                          {balance.closing_balance}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Opening:</span>
                          <span>{balance.opening_balance}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Credited:</span>
                          <span className="text-green-600">+{balance.credited}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Used:</span>
                          <span className="text-red-600">-{balance.used}</span>
                        </div>
                        <hr />
                        <div className="flex justify-between font-medium">
                          <span>Available:</span>
                          <span className={getBalanceColor(balance.closing_balance, balance.opening_balance + balance.credited)}>
                            {balance.closing_balance}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              balance.closing_balance > (balance.opening_balance + balance.credited) * 0.7
                                ? 'bg-green-500'
                                : balance.closing_balance > (balance.opening_balance + balance.credited) * 0.3
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{
                              width: `${Math.max(0, (balance.closing_balance / (balance.opening_balance + balance.credited)) * 100)}%`
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.round((balance.closing_balance / (balance.opening_balance + balance.credited)) * 100)}% remaining
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {Object.keys(groupedBalances).length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No leave balances found for the selected criteria.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

export default LeaveBalances