import React from 'react'
import ComplianceList from '../components/compliance/ComplianceList'

const Compliance: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
        <p className="text-gray-600">Manage HR compliance and regulatory requirements</p>
      </div>
      <ComplianceList />
    </div>
  )
}

export default Compliance