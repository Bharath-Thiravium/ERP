import React from 'react'
import { Shield, AlertTriangle, CheckCircle, FileText, Calendar, Download } from 'lucide-react'

const ComplianceList: React.FC = () => {

  const complianceItems = [
    {
      id: 1,
      title: 'PF Compliance',
      description: 'Provident Fund statutory compliance',
      status: 'compliant',
      lastUpdated: '2024-01-15',
      dueDate: '2024-02-15'
    },
    {
      id: 2,
      title: 'ESI Compliance',
      description: 'Employee State Insurance compliance',
      status: 'pending',
      lastUpdated: '2024-01-10',
      dueDate: '2024-01-20'
    },
    {
      id: 3,
      title: 'TDS Returns',
      description: 'Tax Deducted at Source returns',
      status: 'overdue',
      lastUpdated: '2023-12-15',
      dueDate: '2024-01-15'
    },
    {
      id: 4,
      title: 'Labour Law Compliance',
      description: 'State and central labour law compliance',
      status: 'compliant',
      lastUpdated: '2024-01-12',
      dueDate: '2024-03-15'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'overdue': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'overdue': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Shield className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-green-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Compliant</p>
              <p className="text-2xl font-bold text-green-900">2</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-yellow-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">1</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="bg-red-50 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Overdue</p>
              <p className="text-2xl font-bold text-red-900">1</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {complianceItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(item.status)}
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                  {item.status.toUpperCase()}
                </span>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Last Updated: {item.lastUpdated}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Due Date: {item.dueDate}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 text-sm flex items-center justify-center gap-1">
                <FileText className="h-4 w-4" />
                View Details
              </button>
              <button className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-md hover:bg-gray-700 text-sm flex items-center justify-center gap-1">
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Calendar</h3>
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Compliance calendar will be implemented here</p>
        </div>
      </div>
    </div>
  )
}

export default ComplianceList