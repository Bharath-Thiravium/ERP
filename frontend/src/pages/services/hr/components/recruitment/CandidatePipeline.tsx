import React, { useState, useEffect } from 'react'
import { Users, Clock, CheckCircle, X, Calendar } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { JobApplication } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

const CandidatePipeline: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [jobPostings, setJobPostings] = useState<any[]>([])
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null)
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([])

  const fetchApplications = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const [appsResponse, jobsResponse] = await Promise.all([
        api.get('/api/hr/job-applications/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),
        api.get('/api/hr/job-postings/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
      ])
      
      const allApplications = appsResponse.data.results || []
      setApplications(allApplications)
      setJobPostings(jobsResponse.data.results || [])
      
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500'
      case 'shortlisted': return 'bg-green-500'
      case 'interview_scheduled': return 'bg-purple-500'
      case 'interviewed': return 'bg-indigo-500'
      case 'selected': return 'bg-emerald-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const pipelineStages = [
    { key: 'submitted', label: 'New Applications', icon: Users },
    { key: 'shortlisted', label: 'Shortlisted', icon: CheckCircle },
    { key: 'interview_scheduled', label: 'Interview Scheduled', icon: Calendar },
    { key: 'interviewed', label: 'Interviewed', icon: Clock },
    { key: 'selected', label: 'Selected', icon: CheckCircle },
    { key: 'rejected', label: 'Rejected', icon: X }
  ]

  const getApplicationsByStatus = (status: string) => {
    return filteredApplications.filter(app => app.status === status)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Job Selection Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Candidate Pipeline</h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedJobId ? `${filteredApplications.length} candidates for selected job` : `${applications.length} total candidates`}
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

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
        {pipelineStages.map((stage) => {
          const stageApplications = getApplicationsByStatus(stage.key)
          const Icon = stage.icon
          
          return (
            <Card key={stage.key} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`p-1 rounded ${getStatusColor(stage.key)} text-white`}>
                      <Icon className="h-3 w-3" />
                    </div>
                    <span>{stage.label}</span>
                  </div>
                  <span className="text-lg font-bold">{stageApplications.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {stageApplications.map((application) => (
                    <div
                      key={application.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {application.first_name} {application.last_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {application.job_posting_title}
                          </p>
                          {application.ai_score > 0 && (
                            <div className="flex items-center mt-1">
                              <div className="w-12 bg-gray-200 rounded-full h-1">
                                <div 
                                  className="bg-blue-500 h-1 rounded-full" 
                                  style={{ width: `${application.ai_score}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 ml-1">{application.ai_score}%</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          {stage.key === 'submitted' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                onClick={() => updateApplicationStatus(application.id, 'shortlisted')}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                onClick={() => updateApplicationStatus(application.id, 'rejected')}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {stage.key === 'interviewed' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-6 w-6 p-0 text-emerald-600 hover:text-emerald-700"
                                onClick={() => updateApplicationStatus(application.id, 'selected')}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                onClick={() => updateApplicationStatus(application.id, 'rejected')}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {stageApplications.length === 0 && (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
                      No candidates
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default CandidatePipeline