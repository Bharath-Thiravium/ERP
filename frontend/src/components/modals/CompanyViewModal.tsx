import React from 'react'
import { X, Building2, Mail, Phone, MapPin, Calendar, User, CheckCircle, Clock, XCircle, Users, Server } from 'lucide-react'
import { Button } from '../ui/Button'

interface CompanyViewModalProps {
  isOpen: boolean
  onClose: () => void
  company: any
}

const CompanyViewModal: React.FC<CompanyViewModalProps> = ({
  isOpen,
  onClose,
  company
}) => {
  if (!isOpen || !company) return null

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'rejected': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      case 'suspended': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'pending': return <Clock className="h-4 w-4" />
      case 'rejected': return <XCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {company.name}
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(company.approval_status)}`}>
                    {getStatusIcon(company.approval_status)}
                    <span className="ml-1 capitalize">{company.approval_status}</span>
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Company Information */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                        <p className="text-gray-900 dark:text-white font-medium">{company.email}</p>
                      </div>
                    </div>
                    
                    {company.phone && (
                      <div className="flex items-center space-x-3">
                        <Phone className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                          <p className="text-gray-900 dark:text-white font-medium">{company.phone}</p>
                        </div>
                      </div>
                    )}
                    
                    {company.address && (
                      <div className="flex items-center space-x-3">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                          <p className="text-gray-900 dark:text-white font-medium">{company.address}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                        <p className="text-gray-900 dark:text-white font-medium">
                          {new Date(company.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {company.created_by_name && (
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Created By</p>
                          <p className="text-gray-900 dark:text-white font-medium">{company.created_by_name}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistics and Services */}
              <div className="space-y-6">
                {/* Quick Stats */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Users</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                            {company.users_count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Server className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm text-green-600 dark:text-green-400">Services</p>
                          <p className="text-xl font-bold text-green-700 dark:text-green-300">
                            {company.services_count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assigned Services */}
                {company.services && company.services.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assigned Services</h3>
                    <div className="space-y-2">
                      {company.services.map((service: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                              <Server className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{service.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{service.service_type}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            ${service.price}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CompanyViewModal
