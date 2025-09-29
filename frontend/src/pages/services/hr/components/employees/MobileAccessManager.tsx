import React, { useState, useEffect } from 'react'
import { Smartphone, Key, Download, CheckCircle, XCircle, Users, RefreshCw } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Employee } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface MobileAccessManagerProps {
  employees: Employee[]
  onRefresh: () => void
}



const MobileAccessManager: React.FC<MobileAccessManagerProps> = ({ employees: initialEmployees, onRefresh }) => {
  const { sessionKey } = useServiceUserStore()
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [password, setPassword] = useState('')
  const [settingPassword, setSettingPassword] = useState(false)

  // Update local employees when props change
  useEffect(() => {
    setEmployees(initialEmployees)
  }, [initialEmployees])

  const setMobilePassword = async (employeeId: string, password: string) => {
    setSettingPassword(true)
    try {
      const response = await api.post('/api/hr/set-mobile-password/', {
        employee_id: employeeId,
        password: password,
        session_key: sessionKey,
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })

      if (response.data.success) {
        toast.success('Mobile access enabled successfully!')
        setSelectedEmployee(null)
        setPassword('')
        
        // Update the employee in the local state immediately
        setEmployees(prevEmployees => 
          prevEmployees.map(emp => 
            emp.employee_id === employeeId 
              ? { ...emp, mobile_app_enabled: true, last_mobile_login: undefined }
              : emp
          )
        )
        
        // Also refresh parent component
        onRefresh()
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to set mobile password')
    } finally {
      setSettingPassword(false)
    }
  }

  const downloadCredentials = async (employeeId: string) => {
    try {
      const response = await api.get(`/api/hr/download-mobile-credentials/?employee_id=${employeeId}&session_key=${sessionKey}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      const blob = new Blob([response.data], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${employeeId}_mobile_credentials.txt`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('Credentials downloaded successfully!')
    } catch (error) {
      toast.error('Failed to download credentials')
    }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(result)
  }

  const mobileEnabledCount = employees.filter(emp => emp.mobile_app_enabled).length
  const totalEmployees = employees.length

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-blue-500" />
              <span>Mobile App Access</span>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{mobileEnabledCount}</div>
              <div className="text-sm text-gray-600">Mobile Enabled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{totalEmployees - mobileEnabledCount}</div>
              <div className="text-sm text-gray-600">Pending Setup</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {totalEmployees > 0 ? Math.round((mobileEnabledCount / totalEmployees) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Coverage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-indigo-500" />
            <span>Employee Mobile Access Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                      {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {employee.first_name} {employee.last_name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {employee.employee_id} • {employee.department_name}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {employee.mobile_app_enabled ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          <CheckCircle className="h-3 w-3" />
                          <span>Enabled</span>
                        </div>
                        {employee.last_mobile_login && (
                          <span className="text-xs text-gray-500">
                            Last: {new Date(employee.last_mobile_login).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadCredentials(employee.employee_id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        <XCircle className="h-3 w-3" />
                        <span>Disabled</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setSelectedEmployee(employee)}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Key className="h-4 w-4 mr-1" />
                        Enable
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Password Setup Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Enable Mobile Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Employee: <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  ID: <strong>{selectedEmployee.employee_id}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mobile App Password</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomPassword}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  This password will be used by the employee to login to the mobile app.
                </p>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedEmployee(null)
                    setPassword('')
                  }}
                  disabled={settingPassword}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setMobilePassword(selectedEmployee.employee_id, password)}
                  disabled={!password || settingPassword}
                  className="flex-1 bg-blue-500 hover:bg-blue-600"
                >
                  {settingPassword ? 'Setting...' : 'Enable Access'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default MobileAccessManager