import React, { useState } from 'react'
import { X, CheckCircle, XCircle, FileText, Download, Eye, MessageSquare, AlertTriangle, Building2, User } from 'lucide-react'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { API_BASE_URL } from '../../lib/api'
import { Modal } from '../ui/Modal'

interface CompanyApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  company: any
  onApprove: (companyId: string, comments?: string) => Promise<void>
  onReject: (companyId: string, comments: string) => Promise<void>
}

const CompanyApprovalModal: React.FC<CompanyApprovalModalProps> = ({
  isOpen,
  onClose,
  company,
  onApprove,
  onReject
}) => {
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  useState(false)

  const handleApprove = async () => {
    setLoading(true)
    try {
      await onApprove(company.id, comments)
      onClose()
    } catch (error) {
      console.error('Error approving company:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!comments.trim()) {
      alert('Please provide rejection reason')
      return
    }
    
    setLoading(true)
    try {
      await onReject(company.id, comments)
      onClose()
    } catch (error) {
      console.error('Error rejecting company:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDocuments = () => {
    try {
      if (company.special_requirements) {
        const parsed = JSON.parse(company.special_requirements)
        return parsed.documents || {}
      }
    } catch (e) {
      console.error('Error parsing documents:', e)
    }
    return {}
  }

  if (!isOpen || !company) return null

  // Debug logging to see what data we have
  console.log('🔍 DEBUG: Company data in approval modal:', company)
  console.log('🔍 DEBUG: Company fields:', {
    business_type: company.business_type,
    industry: company.industry,
    employee_count: company.employee_count,
    annual_revenue: company.annual_revenue,
    tax_id: company.tax_id,
    pan_number: company.pan_number,
    gst_number: company.gst_number,
    registration_number: company.registration_number
  })

  const documents = getDocuments()
  const hasDocuments = Object.keys(documents).length > 0
  console.log('🔍 DEBUG: Documents:', documents)
  console.log('🔍 DEBUG: Has documents:', hasDocuments)

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" className="max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Review Company Application
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {company.name} • Submitted for approval
                </p>
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
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-8">
              {/* Company Information */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Basic Info */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Company Name</label>
                      <p className="text-gray-900 dark:text-white font-medium">{company.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Company Prefix</label>
                      <p className="text-gray-900 dark:text-white font-medium">{company.company_prefix || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                      <p className="text-gray-900 dark:text-white">{company.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="text-gray-900 dark:text-white">{company.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                      <p className="text-gray-900 dark:text-white">{company.address || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Website</label>
                      <p className="text-gray-900 dark:text-white">{company.website || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200/50 dark:border-purple-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-600" />
                    Business Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Business Type</label>
                      <p className="text-gray-900 dark:text-white">{company.business_type || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Industry</label>
                      <p className="text-gray-900 dark:text-white">{company.industry || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Employee Count</label>
                      <p className="text-gray-900 dark:text-white">{company.employee_count || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Annual Revenue</label>
                      <p className="text-gray-900 dark:text-white">
                        {company.annual_revenue ? `₹${Number(company.annual_revenue).toLocaleString()}` : 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Legal Information */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border border-orange-200/50 dark:border-orange-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-orange-600" />
                    Legal Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Tax ID</label>
                      <p className="text-gray-900 dark:text-white">{company.tax_id || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">PAN Number</label>
                      <p className="text-gray-900 dark:text-white">{company.pan_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">GST Number</label>
                      <p className="text-gray-900 dark:text-white">{company.gst_number || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Registration Number</label>
                      <p className="text-gray-900 dark:text-white">{company.registration_number || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Person */}
              {company.contact_person_name && (
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-cyan-200/50 dark:border-cyan-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-cyan-600" />
                    Contact Person
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                      <p className="text-gray-900 dark:text-white font-medium">{company.contact_person_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</label>
                      <p className="text-gray-900 dark:text-white">{company.contact_person_title || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
                      <p className="text-gray-900 dark:text-white">{company.contact_person_email || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="text-gray-900 dark:text-white">{company.contact_person_phone || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Section - Always Show */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200/50 dark:border-green-700/50">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-green-600" />
                  Uploaded Documents
                </h3>
                
                {hasDocuments ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(documents).map(([key, path]) => {
                      const isImage = String(path).match(/\.(jpg|jpeg|png|gif)$/i)
                      return (
                        <div key={key} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200/30 dark:border-green-700/30 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-green-600" />
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => window.open(`${API_BASE_URL}/media/${path}`, '_blank')}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded transition-colors"
                                title="View Document"
                              >
                                <Eye className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = `${API_BASE_URL}/media/${path}`
                                  link.download = key
                                  link.click()
                                }}
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                                title="Download Document"
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          
                          {/* Document Preview */}
                          {isImage ? (
                            <div className="relative">
                              <img 
                                src={`${API_BASE_URL}/media/${path}`} 
                                alt={key}
                                className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  const nextEl = e.currentTarget.nextElementSibling as HTMLElement
                                  if (nextEl) nextEl.style.display = 'flex'
                                }}
                              />
                              <div className="hidden w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 items-center justify-center">
                                <FileText className="h-8 w-8 text-gray-400" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                              <div className="text-center">
                                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">PDF Document</p>
                              </div>
                            </div>
                          )}
                          
                          <p className="text-xs text-gray-500 mt-2 text-center">Click eye icon to view full document</p>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No documents uploaded</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Company did not upload any verification documents</p>
                  </div>
                )}
              </div>

              {/* Company Description */}
              {company.description && (
                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-6 border border-yellow-200/50 dark:border-yellow-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-yellow-600" />
                    Company Description
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-yellow-200/30 dark:border-yellow-700/30">
                    <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">{company.description}</p>
                  </div>
                </div>
              )}

              {/* Special Requirements */}
              {company.special_requirements && !hasDocuments && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200/50 dark:border-indigo-700/50">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-indigo-600" />
                    Special Requirements
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-indigo-200/30 dark:border-indigo-700/30">
                    <p className="text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">{company.special_requirements}</p>
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Review Comments
                </h3>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={4}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder={action === 'reject' ? 'Please provide reason for rejection (required)' : 'Add comments for approval (optional)'}
                  />
                </div>
                {action === 'reject' && !comments.trim() && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Rejection reason is required
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Submitted: {new Date(company.detailed_info_submitted_at || company.created_at).toLocaleDateString()}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setAction('reject')
                  handleReject()
                }}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading && action === 'reject' ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setAction('approve')
                  handleApprove()
                }}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {loading && action === 'approve' ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
            </div>
          </div>
    </Modal>
  )
}

export default CompanyApprovalModal