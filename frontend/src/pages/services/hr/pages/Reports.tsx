import React from 'react'
import ReportsList from '../components/reports/ReportsList'

const Reports: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">HR Reports</h1>
        <p className="text-gray-600">Generate and view HR analytics and reports</p>
      </div>
      <ReportsList />
    </div>
  )
}

export default Reports