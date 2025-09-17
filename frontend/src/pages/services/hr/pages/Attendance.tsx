import React from 'react'
import AttendanceList from '../components/attendance/AttendanceList'

const Attendance: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-gray-600">Track and manage employee attendance records</p>
      </div>
      <AttendanceList />
    </div>
  )
}

export default Attendance