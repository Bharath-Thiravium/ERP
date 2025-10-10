import React, { useState, useEffect } from 'react'
import { FileText, Eye, Download, CheckCircle, X, Clock, User, Mail, Phone, Calendar, Video } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { JobApplication } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'
import InterviewScheduler from './InterviewScheduler'
import OfferManagement from './OfferManagement'
import BulkActions from './BulkActions'
import AdvancedFilters from './AdvancedFilters'

const ApplicationsList: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showInterviewScheduler, setShowInterviewScheduler] = useState(false)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<number[]>([])
  const [jobPostings, setJobPostings] = useState<any[]>([])
  const [filters, setFilters] = useState<any>({})

  const fetchApplications = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/job-applications/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      
      setApplications(response.data.results || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
    fetchJobPostings()
  }, [sessionKey])

  const fetchJobPostings = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/job-postings/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setJobPostings(response.data.results || [])
    } catch (error) {
      console.error('Error fetching job postings:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'shortlisted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'interviewed': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'selected': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const updateApplicationStatus = async (applicationId: number, newStatus: string) => {
    if (!sessionKey) return
    
    try {
      await api.patch(`/api/hr/job-applications/${applicationId}/`, {
        status: newStatus,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      toast.success(`Application ${newStatus} successfully`)
      fetchApplications()
    } catch (error) {
      console.error('Error updating application status:', error)
      toast.error('Failed to update application status')
    }
  }

  const downloadResume = (application: JobApplication) => {
    if (application.resume) {
      window.open(application.resume, '_blank')
    } else {
      toast.error('No resume available')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardContent className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No applications yet</h3>
          <p className="text-gray-500 dark:text-gray-400">Applications will appear here when candidates apply for your job postings</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Job Applications</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {applications.length} total applications
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters 
        onFiltersChange={setFilters}
        jobPostings={jobPostings}
      />

      {/* Bulk Actions */}
      <BulkActions
        selectedApplications={selectedApplicationIds}
        applications={applications}
        onSuccess={fetchApplications}
        onClearSelection={() => setSelectedApplicationIds([])}
      />

      <div className="grid grid-cols-1 gap-4">
        {applications.map((application) => (
          <Card key={application.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <User className="h-5 w-5 text-gray-500" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {application.first_name} {application.last_name}
                      </h3>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(application.status)}`}>
                      {application.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Mail className="h-4 w-4" />
                      <span>{application.email}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Phone className="h-4 w-4" />
                      <span>{application.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(application.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Applied for: {application.job_posting_title}
                    </p>
                    {application.ai_score > 0 && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">AI Score:</span>
                        <div className="flex items-center space-x-1">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${application.ai_score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{application.ai_score}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSelectedApplication(application)
                      setShowDetailModal(true)
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {application.resume && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => downloadResume(application)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}

                  {application.status === 'submitted' && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => updateApplicationStatus(application.id, 'shortlisted')}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => updateApplicationStatus(application.id, 'rejected')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {(application.status === 'shortlisted' || application.status === 'screening') && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-purple-600 hover:text-purple-700"
                      onClick={() => {
                        setSelectedApplication(application)
                        setShowInterviewScheduler(true)
                      }}
                      title="Schedule Interview"
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                  )}

                  {(application.status === 'interviewed' || application.status === 'selected') && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-emerald-600 hover:text-emerald-700"
                        onClick={() => {
                          setSelectedApplication(application)
                          setShowOfferModal(true)
                        }}
                        title="Send Offer"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => updateApplicationStatus(application.id, 'rejected')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Application Detail Modal */}
      {showDetailModal && selectedApplication && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Application Details
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowDetailModal(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Candidate Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500">Name</label>
                      <p className="font-medium">{selectedApplication.first_name} {selectedApplication.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Email</label>
                      <p className="font-medium">{selectedApplication.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Phone</label>
                      <p className="font-medium">{selectedApplication.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500">Applied Date</label>
                      <p className="font-medium">{new Date(selectedApplication.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {selectedApplication.cover_letter && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Cover Letter</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedApplication.cover_letter}
                      </p>
                    </div>
                  </div>
                )}

                {selectedApplication.ai_screening_notes && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">AI Screening Notes</h3>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <p className="text-blue-800 dark:text-blue-300">
                        {selectedApplication.ai_screening_notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interview Scheduler Modal */}
      <InterviewScheduler
        isOpen={showInterviewScheduler}
        onClose={() => {
          setShowInterviewScheduler(false)
          setSelectedApplication(null)
        }}
        application={selectedApplication}
        onSuccess={() => {
          fetchApplications()
          setShowInterviewScheduler(false)
          setSelectedApplication(null)
        }}
      />

      {/* Offer Management Modal */}
      <OfferManagement
        isOpen={showOfferModal}
        onClose={() => {
          setShowOfferModal(false)
          setSelectedApplication(null)
        }}
        application={selectedApplication}
        onSuccess={() => {
          fetchApplications()
          setShowOfferModal(false)
          setSelectedApplication(null)
        }}
      />
    </div>
  )
}

export default ApplicationsList