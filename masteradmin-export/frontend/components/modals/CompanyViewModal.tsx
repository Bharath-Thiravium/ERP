import React from 'react'
import { X, Building2, Mail, User, CheckCircle, Clock, XCircle, Users, Server } from 'lucide-react'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

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
  
  // Debug logging to see what data we have
  console.log('🔍 DEBUG: Company data in view modal:', company)

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
    <Modal isOpen={isOpen} onClose={onClose} size="4xl">
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
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-8">
              {/* Basic Company Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Company Name</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Company Prefix</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.company_prefix || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200/50 dark:border-purple-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-600" />
                    Business Details
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Business Type</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.business_type || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Industry</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.industry || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Employee Count</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.employee_count || 'Not provided'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Annual Revenue</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        {company.annual_revenue ? `$${company.annual_revenue.toLocaleString()}` : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                      <p className="text-gray-900 dark:text-white font-medium">{company.website || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Person & Legal Information */}
              {(company.contact_person_name || company.tax_id || company.gst_number) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {company.contact_person_name && (
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200/50 dark:border-green-700/50">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Mail className="h-5 w-5 text-green-600" />
                        Contact Person
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                          <p className="text-gray-900 dark:text-white font-medium">{company.contact_person_name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Title</p>
                          <p className="text-gray-900 dark:text-white font-medium">{company.contact_person_title || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                          <p className="text-gray-900 dark:text-white font-medium">{company.contact_person_email || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                          <p className="text-gray-900 dark:text-white font-medium">{company.contact_person_phone || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border border-orange-200/50 dark:border-orange-700/50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-orange-600" />
                      Legal Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Tax ID</p>
                        <p className="text-gray-900 dark:text-white font-medium">{company.tax_id || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">PAN Number</p>
                        <p className="text-gray-900 dark:text-white font-medium">{company.pan_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">GST Number</p>
                        <p className="text-gray-900 dark:text-white font-medium">{company.gst_number || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Registration Number</p>
                        <p className="text-gray-900 dark:text-white font-medium">{company.registration_number || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Services & Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Stats */}
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/50 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-600" />
                    Statistics
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 text-center">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {company.users_count || 0}
                      </p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Users</p>
                    </div>
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 text-center">
                      <Server className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {company.services_count || 0}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">Services</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Created</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(company.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {company.created_by_name && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-500 dark:text-gray-400">Created By</span>
                        <span className="font-medium text-gray-900 dark:text-white">{company.created_by_name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assigned Services */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-indigo-200/50 dark:border-indigo-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Server className="h-5 w-5 text-indigo-600" />
                    Assigned Services
                  </h3>
                  {company.services && company.services.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {company.services.map((service: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-indigo-200/30 dark:border-indigo-700/30">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <Server className="h-4 w-4 text-white" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white text-sm">{service.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{service.service_type}</p>
                            </div>
                          </div>
                          {service.base_price && (
                            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                              ${service.base_price}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Server className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-gray-400">No services assigned</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Description */}
              {company.description && (
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-yellow-200/50 dark:border-yellow-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-yellow-600" />
                    Company Description
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{company.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
    </Modal>
  )
}

export default CompanyViewModal
