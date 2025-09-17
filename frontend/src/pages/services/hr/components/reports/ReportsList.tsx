import React, { useState } from 'react'
import { BarChart3, PieChart, TrendingUp, Users, Calendar, Download } from 'lucide-react'

const ReportsList: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('')

  const reports = [
    {
      id: 'employee-summary',
      title: 'Employee Summary Report',
      description: 'Overview of all employees with their basic information',
      icon: <Users className="h-6 w-6" />,
      color: 'bg-blue-500'
    },
    {
      id: 'attendance-report',
      title: 'Attendance Report',
      description: 'Monthly attendance summary for all employees',
      icon: <Calendar className="h-6 w-6" />,
      color: 'bg-green-500'
    },
    {
      id: 'payroll-report',
      title: 'Payroll Report',
      description: 'Salary and payroll details for selected period',
      icon: <BarChart3 className="h-6 w-6" />,
      color: 'bg-purple-500'
    },
    {
      id: 'leave-report',
      title: 'Leave Analysis Report',
      description: 'Leave patterns and balance analysis',
      icon: <PieChart className="h-6 w-6" />,
      color: 'bg-orange-500'
    },
    {
      id: 'department-report',
      title: 'Department Wise Report',
      description: 'Department statistics and employee distribution',
      icon: <TrendingUp className="h-6 w-6" />,
      color: 'bg-red-500'
    }
  ]

  const handleGenerateReport = (reportId: string) => {
    // In a real application, this would generate and download the report
    console.log(`Generating report: ${reportId}`)
    // For now, just show a message
    alert(`Report generation for ${reports.find(r => r.id === reportId)?.title} would start here`)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`${report.color} text-white p-3 rounded-lg`}>
                {report.icon}
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {report.title}
            </h3>
            
            <p className="text-gray-600 mb-4 text-sm">
              {report.description}
            </p>
            
            <button
              onClick={() => handleGenerateReport(report.id)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Generate Report
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Employees</p>
                <p className="text-2xl font-bold text-blue-900">0</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Present Today</p>
                <p className="text-2xl font-bold text-green-900">0</p>
              </div>
              <Calendar className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Departments</p>
                <p className="text-2xl font-bold text-purple-900">0</p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Pending Leaves</p>
                <p className="text-2xl font-bold text-orange-900">0</p>
              </div>
              <PieChart className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsList