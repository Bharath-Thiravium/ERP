import React from 'react'
import DepartmentList from '../components/department/DepartmentList'

const Departments: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <p className="text-gray-600">Manage company departments and organizational structure</p>
      </div>
      <DepartmentList />
    </div>
  )
}

export default Departments