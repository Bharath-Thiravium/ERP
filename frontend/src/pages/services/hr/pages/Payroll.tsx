import React from 'react'
import PayrollList from '../components/payroll/PayrollList'

const Payroll: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payroll</h1>
        <p className="text-gray-600">Process payroll and manage employee salaries</p>
      </div>
      <PayrollList />
    </div>
  )
}

export default Payroll