import React from 'react'

interface EmployeeMobileAppProps {
  employeeId: string
  employeeName: string
  employeePhoto?: string
}

const EmployeeMobileApp: React.FC<EmployeeMobileAppProps> = ({
  employeeId,
  employeeName,
  employeePhoto
}) => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            {employeePhoto ? (
              <img
                src={employeePhoto}
                alt={employeeName}
                className="w-20 h-20 rounded-full mx-auto mb-4"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-gray-600 text-xl font-semibold">
                  {employeeName.charAt(0)}
                </span>
              </div>
            )}
            <h2 className="text-xl font-semibold text-gray-900">{employeeName}</h2>
            <p className="text-gray-600">ID: {employeeId}</p>
          </div>
          
          <div className="space-y-4">
            <button className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors">
              Mark Attendance
            </button>
            <button className="w-full bg-gray-500 text-white py-3 rounded-lg font-medium hover:bg-gray-600 transition-colors">
              View History
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeMobileApp