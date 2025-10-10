import React, { useState } from 'react'
import { FileText, Download, Filter, Search, Calendar, Shield, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'

const SecurityAuditLogs: React.FC = () => {
  const [logs] = useState([
    {
      id: 1,
      timestamp: '2024-01-15T14:30:00Z',
      action: 'Password Changed',
      user: 'admin@company.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Chrome 120.0 (Windows)',
      status: 'success',
      details: 'Password updated successfully'
    },
    {
      id: 2,
      timestamp: '2024-01-15T14:25:00Z',
      action: 'Login Attempt',
      user: 'admin@company.com',
      ipAddress: '192.168.1.100',
      userAgent: 'Chrome 120.0 (Windows)',
      status: 'success',
      details: 'Successful login with 2FA'
    },
    {
      id: 3,
      timestamp: '2024-01-15T14:20:00Z',
      action: 'Failed Login',
      user: 'unknown@attacker.com',
      ipAddress: '203.0.113.45',
      userAgent: 'curl/7.68.0',
      status: 'failed',
      details: 'Invalid credentials'
    }
  ])

  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('Failed') || action.includes('Blocked')) {
      return 'text-red-600 dark:text-red-400'
    }
    if (action.includes('Login') || action.includes('Password')) {
      return 'text-blue-600 dark:text-blue-400'
    }
    return 'text-gray-900 dark:text-white'
  }

  const exportLogs = () => {
    const csvContent = [
      'Timestamp,Action,User,IP Address,Status,Details',
      ...logs.map(log => 
        `${log.timestamp},${log.action},${log.user},${log.ipAddress},${log.status},"${log.details}"`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `security-audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.status === filter
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.ipAddress.includes(searchTerm)
    return matchesFilter && matchesSearch
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span>Security Audit Logs</span>
          </div>
          <Button size="sm" onClick={exportLogs} className="bg-orange-600 hover:bg-orange-700">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search logs by action, user, or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Events</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Logs List */}
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Logs Found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || filter !== 'all' ? 'Try adjusting your search or filters' : 'Security events will appear here'}
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getStatusIcon(log.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            log.status === 'success'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {log.details}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>User: {log.user}</span>
                          <span>IP: {log.ipAddress}</span>
                          <span>Agent: {log.userAgent}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Log Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {logs.filter(log => log.status === 'success').length}
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">Successful Events</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {logs.filter(log => log.status === 'failed').length}
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">Failed Events</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {logs.length}
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">Total Events</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default SecurityAuditLogs