import React from 'react'
import { X, User, Mail, Phone, Calendar, MapPin, Building, Briefcase, Star, Shield, Smartphone } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Employee } from '../../types/hrTypes'

interface EmployeeViewProps {
  employee: Employee
  onClose: () => void
}

const EmployeeView: React.FC<EmployeeViewProps> = ({ employee, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'on_leave': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      default: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const parseSkills = (skills: any) => {
    if (typeof skills === 'string') {
      try {
        return JSON.parse(skills)
      } catch {
        return []
      }
    }
    return Array.isArray(skills) ? skills : []
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-8">
          {/* Profile Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6">
            <div className="flex items-start space-x-6">
              <div className="flex-shrink-0">
                {employee.profile_picture ? (
                  <img
                    src={employee.profile_picture.startsWith('http') ? employee.profile_picture : `http://localhost:8000${employee.profile_picture}`}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{employee.full_name}</h3>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">ID: {employee.employee_id}</p>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(employee.status)}`}>
                    {employee.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className={`px-3 py-1 text-sm rounded-full ${getRiskColor(employee.retention_risk)}`}>
                    {employee.retention_risk.toUpperCase()} RISK
                  </span>
                  {employee.mobile_app_enabled && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      <Smartphone className="h-3 w-3 mr-1" />
                      Mobile Enabled
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Face Recognition Photo */}
          {employee.face_photo && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-blue-500" />
                Face Recognition Photo
              </h4>
              <img
                src={employee.face_photo.startsWith('http') ? employee.face_photo : `http://localhost:8000${employee.face_photo}`}
                alt="Face Recognition"
                className="w-32 h-32 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
              />
            </div>
          )}

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-500" />
                Personal Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{employee.email}</span>
                </div>
                {employee.phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{employee.phone}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">Born: {employee.date_of_birth ? formatDate(employee.date_of_birth) : 'Not specified'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">Gender: {employee.gender}</span>
                </div>
                {employee.address && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                    <span className="text-gray-900 dark:text-white">{employee.address}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-green-500" />
                Employment Details
              </h4>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{employee.department_name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{employee.designation_title}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">Joined: {formatDate(employee.date_of_joining)}</span>
                </div>
                {employee.salary && (
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-400">💰</span>
                    <span className="text-gray-900 dark:text-white">Salary: ${employee.salary.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3">
                  <Star className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">Performance: {employee.performance_score}/10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Skills */}
          {employee.skills && parseSkills(employee.skills).length > 0 && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Skills & Expertise</h4>
              <div className="flex flex-wrap gap-2">
                {parseSkills(employee.skills).map((skill: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          {(employee.emergency_contact_name || employee.emergency_contact_phone) && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Emergency Contact</h4>
              <div className="space-y-2">
                {employee.emergency_contact_name && (
                  <div className="flex items-center space-x-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{employee.emergency_contact_name}</span>
                  </div>
                )}
                {employee.emergency_contact_phone && (
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{employee.emergency_contact_phone}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default EmployeeView