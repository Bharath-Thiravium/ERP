import React from 'react'
import LeaveList from '../components/leave/LeaveList'

const Leave: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
        <p className="text-gray-600">Manage leave applications and employee leave balances</p>
      </div>
      <LeaveList />
    </div>
  )
}

export default Leave