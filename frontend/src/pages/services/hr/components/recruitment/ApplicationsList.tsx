import React, { useState, useEffect } from 'react'
import { FileText, Eye, Download, CheckCircle, X, User, Mail, Phone, Calendar, Video } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent } from '../../../../../components/ui/Card'
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
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([])
  const [resendingEmails, setResendingEmails] = useState<Set<number>>(new Set())


  const fetchApplications = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/job-applications/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      
      const allApplications = response.data.results || []
      setApplications(allApplications)
      
      // Filter applications based on selected job
      if (selectedJobId) {
        const filtered = allApplications.filter((app: JobApplication) => app.job_posting === selectedJobId)
        setFilteredApplications(filtered)
      } else {
        setFilteredApplications(allApplications)
      }
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
  }, [sessionKey, selectedJobId])

  // Filter applications when job selection changes
  useEffect(() => {
    if (selectedJobId) {
      const filtered = applications.filter(app => app.job_posting === selectedJobId)
      setFilteredApplications(filtered)
    } else {
      setFilteredApplications(applications)
    }
  }, [selectedJobId, applications])

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

  const resendInterviewInvitation = async (applicationId: number) => {
    if (!sessionKey || resendingEmails.has(applicationId)) return
    
    // Add to resending set
    setResendingEmails(prev => new Set(prev).add(applicationId))
    
    try {
      // Get interview for this application
      const interviewResponse = await api.get('/api/hr/interviews/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey, application_id: applicationId }
      })
      
      const interviews = interviewResponse.data.results || []
      const interview = interviews.find((int: any) => int.application_id === applicationId)
      
      if (!interview) {
        toast.error('No interview found for this application')
        return
      }
      
      // Resend invitation by updating the interview (triggers email)
      await api.patch(`/api/hr/interviews/${interview.id}/`, {
        resend_invitation: true,
        session_key: sessionKey
      })
      
      toast.success('Interview invitation resent successfully')
    } catch (error) {
      console.error('Error resending interview invitation:', error)
      toast.error('Failed to resend interview invitation')
    } finally {
      // Remove from resending set
      setResendingEmails(prev => {
        const newSet = new Set(prev)
        newSet.delete(applicationId)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (filteredApplications.length === 0) {
    return (
      <div className="space-y-6">
        {/* Job Selection */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Job Applications</h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {applications.length} total applications
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Job Posting:</label>
            <select
              value={selectedJobId || ''}
              onChange={(e) => setSelectedJobId(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="">All Job Postings</option>
              {jobPostings.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} ({job.applications_count || 0} applications)
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {selectedJobId ? 'No applications for this job' : 'No applications yet'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {selectedJobId ? 'This job posting has no applications yet' : 'Applications will appear here when candidates apply for your job postings'}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Job Selection Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Job Applications</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedJobId ? `${filteredApplications.length} applications for selected job` : `${applications.length} total applications`}
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Job Posting:</label>
          <select
            value={selectedJobId || ''}
            onChange={(e) => setSelectedJobId(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Job Postings</option>
            {jobPostings.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} ({job.applications_count || 0} applications)
              </option>
            ))}
          </select>
          {selectedJobId && (
            <button
              onClick={() => setSelectedJobId(null)}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Clear Filter
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <AdvancedFilters 
        onFiltersChange={() => {}}
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
        {filteredApplications.map((application) => (
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
                    <div className="flex items-center space-x-4 mb-2">
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
                      {application.application_source && application.application_source !== 'direct' && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full">
                            📱 {application.application_source.charAt(0).toUpperCase() + application.application_source.slice(1)}
                          </span>
                        </div>
                      )}
                      {application.status === 'interview_scheduled' && (
                        <div className="flex items-center space-x-1">
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full">
                            📧 Interview Scheduled
                          </span>
                        </div>
                      )}
                    </div>
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
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => downloadResume(application)}
                        title="Download Resume"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(application.resume, '_blank')}
                        title="View Resume"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </>
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

                  {application.status === 'interview_scheduled' && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className={`${resendingEmails.has(application.id) ? 'text-gray-400' : 'text-blue-600 hover:text-blue-700'}`}
                      onClick={() => resendInterviewInvitation(application.id)}
                      disabled={resendingEmails.has(application.id)}
                      title={resendingEmails.has(application.id) ? 'Sending...' : 'Resend Interview Invitation'}
                    >
                      <Mail className="h-4 w-4" />
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
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Full Name</label>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.first_name} {selectedApplication.last_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Email</label>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Phone</label>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">Applied Date</label>
                      <p className="font-medium text-gray-900 dark:text-white">{new Date(selectedApplication.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Professional Details */}
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Professional Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedApplication.current_position && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Current Position</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.current_position}</p>
                      </div>
                    )}
                    {selectedApplication.current_company && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Current Company</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.current_company}</p>
                      </div>
                    )}
                    {selectedApplication.total_experience > 0 && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Total Experience</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.total_experience} years</p>
                      </div>
                    )}
                    {selectedApplication.relevant_experience > 0 && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Relevant Experience</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.relevant_experience} years</p>
                      </div>
                    )}
                    {selectedApplication.current_salary && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Current Salary</label>
                        <p className="font-medium text-gray-900 dark:text-white">₹{selectedApplication.current_salary.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedApplication.expected_salary && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Expected Salary</label>
                        <p className="font-medium text-gray-900 dark:text-white">₹{selectedApplication.expected_salary.toLocaleString()}</p>
                      </div>
                    )}
                    {selectedApplication.notice_period && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Notice Period</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.notice_period}</p>
                      </div>
                    )}
                    {selectedApplication.current_location && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400">Current Location</label>
                        <p className="font-medium text-gray-900 dark:text-white">{selectedApplication.current_location}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-500 dark:text-gray-400">Willing to Relocate:</label>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          selectedApplication.willing_to_relocate 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {selectedApplication.willing_to_relocate ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Links & Profiles */}
                {(selectedApplication.linkedin_profile || selectedApplication.portfolio_url) && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Professional Links</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {selectedApplication.linkedin_profile && (
                        <div>
                          <label className="text-sm text-gray-500 dark:text-gray-400">LinkedIn Profile</label>
                          <a href={selectedApplication.linkedin_profile} target="_blank" rel="noopener noreferrer" 
                             className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 block truncate">
                            {selectedApplication.linkedin_profile}
                          </a>
                        </div>
                      )}
                      {selectedApplication.portfolio_url && (
                        <div>
                          <label className="text-sm text-gray-500 dark:text-gray-400">Portfolio URL</label>
                          <a href={selectedApplication.portfolio_url} target="_blank" rel="noopener noreferrer" 
                             className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 block truncate">
                            {selectedApplication.portfolio_url}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Skills & Education */}
                {(selectedApplication.skills?.length > 0 || selectedApplication.education_details?.length > 0 || selectedApplication.certifications?.length > 0 || selectedApplication.languages?.length > 0) && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Skills & Qualifications</h3>
                    
                    {selectedApplication.skills?.length > 0 && (
                      <div className="mb-4">
                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">Skills</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplication.skills.map((skill, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 rounded-full text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedApplication.education_details?.length > 0 && (
                      <div className="mb-4">
                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">Education</label>
                        <div className="space-y-2">
                          {selectedApplication.education_details.map((edu, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <p className="font-medium text-gray-900 dark:text-white">{edu.degree || edu.qualification}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{edu.institution} {edu.year && `(${edu.year})`}</p>
                              {edu.percentage && <p className="text-sm text-gray-600 dark:text-gray-400">Score: {edu.percentage}%</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedApplication.certifications?.length > 0 && (
                      <div className="mb-4">
                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">Certifications</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplication.certifications.map((cert, index) => (
                            <span key={index} className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded-full text-sm">
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {selectedApplication.languages?.length > 0 && (
                      <div>
                        <label className="text-sm text-gray-500 dark:text-gray-400 block mb-2">Languages</label>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplication.languages.map((lang, index) => (
                            <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 rounded-full text-sm">
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Resume */}
                {selectedApplication.resume && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Resume</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-8 w-8 text-blue-500" />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">Resume Document</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Click to view or download</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(selectedApplication.resume, '_blank')}
                            className="flex items-center space-x-2"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadResume(selectedApplication)}
                            className="flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Cover Letter */}
                {selectedApplication.cover_letter && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Cover Letter</h3>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {selectedApplication.cover_letter}
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {(selectedApplication.ai_score > 0 || selectedApplication.skill_match_percentage > 0 || selectedApplication.ai_screening_notes) && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">AI Analysis</h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {selectedApplication.ai_score > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                          <label className="text-sm text-blue-600 dark:text-blue-400 block mb-2">AI Score</label>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                              <div 
                                className="bg-blue-500 h-3 rounded-full transition-all" 
                                style={{ width: `${selectedApplication.ai_score}%` }}
                              ></div>
                            </div>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{selectedApplication.ai_score}%</span>
                          </div>
                        </div>
                      )}
                      {selectedApplication.skill_match_percentage > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          <label className="text-sm text-green-600 dark:text-green-400 block mb-2">Skill Match</label>
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                              <div 
                                className="bg-green-500 h-3 rounded-full transition-all" 
                                style={{ width: `${selectedApplication.skill_match_percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-lg font-bold text-green-600 dark:text-green-400">{selectedApplication.skill_match_percentage}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {selectedApplication.ai_screening_notes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <label className="text-sm text-blue-600 dark:text-blue-400 block mb-2">AI Screening Notes</label>
                        <p className="text-blue-800 dark:text-blue-300">
                          {selectedApplication.ai_screening_notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Application Source */}
                {selectedApplication.application_source && selectedApplication.application_source !== 'direct' && (
                  <div>
                    <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Application Source</h3>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">📱</span>
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-300">
                            Applied via {selectedApplication.application_source.charAt(0).toUpperCase() + selectedApplication.application_source.slice(1).replace('_', ' ')}
                          </p>
                          {selectedApplication.share_id && (
                            <p className="text-sm text-green-600 dark:text-green-400">Share ID: {selectedApplication.share_id}</p>
                          )}
                        </div>
                      </div>
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