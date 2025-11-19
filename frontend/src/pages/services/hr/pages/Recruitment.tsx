import React, { useState, useEffect } from 'react'
import { Briefcase, Plus, Users, Eye, Edit, Trash2, Clock, CheckCircle, TrendingUp, FileText, Calendar, MapPin, DollarSign } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { JobPosting, JobApplication } from '../types/hrTypes'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'
import JobPostingForm from '../components/recruitment/JobPostingForm'
import JobDetailModal from '../components/recruitment/JobDetailModal'
import ApplicationsList from '../components/recruitment/ApplicationsList'
import CandidatePipeline from '../components/recruitment/CandidatePipeline'
import RecruitmentAnalytics from '../components/recruitment/RecruitmentAnalytics'
import InterviewsList from '../components/recruitment/InterviewsList'
import ShareAnalyticsDashboard from '../components/recruitment/ShareAnalyticsDashboard'

const Recruitment: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [activeView, setActiveView] = useState('overview')
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([])
  // const [applications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(false)
  const [showJobForm, setShowJobForm] = useState(false)
  const [showJobDetail, setShowJobDetail] = useState(false)
  const [selectedJob, setSelectedJob] = useState<JobPosting | undefined>()
  
  const [stats, setStats] = useState({
    activeJobs: 0,
    totalApplications: 0,
    pendingReview: 0,
    shortlisted: 0,
    interviewed: 0,
    hired: 0,
    avgTimeToHire: 0,
    topPerformingJobs: 0
  })

  const fetchRecruitmentData = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const [jobsResponse, appsResponse] = await Promise.all([
        api.get('/api/hr/job-postings/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),
        api.get('/api/hr/job-applications/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
      ])
      
      const jobs = jobsResponse.data.results || []
      const apps = appsResponse.data.results || []
      
      setJobPostings(jobs)
      // setApplications(apps)
      
      // Calculate stats
      const activeJobs = jobs.filter((job: JobPosting) => job.status === 'active').length
      const pendingReview = apps.filter((app: JobApplication) => app.status === 'submitted').length
      const shortlisted = apps.filter((app: JobApplication) => app.status === 'shortlisted').length
      const interviewed = apps.filter((app: JobApplication) => app.status === 'interviewed').length
      const hired = apps.filter((app: JobApplication) => app.status === 'selected').length
      
      setStats({
        activeJobs,
        totalApplications: apps.length,
        pendingReview,
        shortlisted,
        interviewed,
        hired,
        avgTimeToHire: apps.length > 0 ? Math.round(apps.reduce((sum: number, app: any) => sum + (new Date().getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24), 0) / apps.length) : 0,
        topPerformingJobs: Math.floor(activeJobs * 0.3)
      })
    } catch (error) {
      console.error('Error fetching recruitment data:', error)
      toast.error('Failed to load recruitment data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecruitmentData()
  }, [sessionKey])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'closed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const handleDeleteJob = async (jobId: number) => {
    if (!sessionKey) return
    
    if (!confirm('Are you sure you want to delete this job posting?')) return
    
    try {
      await api.delete(`/api/hr/job-postings/${jobId}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      toast.success('Job posting deleted successfully')
      fetchRecruitmentData()
    } catch (error) {
      console.error('Error deleting job posting:', error)
      toast.error('Failed to delete job posting')
    }
  }

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              AI-Powered Recruitment
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Smart talent acquisition with automated screening and insights
            </p>
          </div>
          <Button 
            onClick={() => setShowJobForm(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Post New Job
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Active Jobs</p>
              <p className="text-3xl font-bold">{stats.activeJobs}</p>
            </div>
            <Briefcase className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Applications</p>
              <p className="text-3xl font-bold">{stats.totalApplications}</p>
            </div>
            <FileText className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Shortlisted</p>
              <p className="text-3xl font-bold">{stats.shortlisted}</p>
            </div>
            <CheckCircle className="h-8 w-8 opacity-80" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Hired</p>
              <p className="text-3xl font-bold">{stats.hired}</p>
            </div>
            <Users className="h-8 w-8 opacity-80" />
          </div>
        </div>
      </div>

      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span>Pending Review</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.pendingReview}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Applications awaiting review</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <span>Interviews</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.interviewed}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Candidates interviewed</p>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span>Avg Time to Hire</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.avgTimeToHire}</div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Days average</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Button 
              onClick={() => setActiveView('jobs')}
              variant="outline" 
              className="h-20 flex-col space-y-2"
            >
              <Briefcase className="h-6 w-6" />
              <span>Manage Jobs</span>
            </Button>
            <Button 
              onClick={() => setActiveView('applications')}
              variant="outline" 
              className="h-20 flex-col space-y-2"
            >
              <FileText className="h-6 w-6" />
              <span>Review Applications</span>
            </Button>
            <Button 
              onClick={() => setActiveView('pipeline')}
              variant="outline" 
              className="h-20 flex-col space-y-2"
            >
              <Users className="h-6 w-6" />
              <span>Candidate Pipeline</span>
            </Button>
            <Button 
              onClick={() => setShowJobForm(true)}
              variant="outline" 
              className="h-20 flex-col space-y-2"
            >
              <Plus className="h-6 w-6" />
              <span>Post New Job</span>
            </Button>
            <Button 
              onClick={() => setActiveView('analytics')}
              variant="outline" 
              className="h-20 flex-col space-y-2"
            >
              <TrendingUp className="h-6 w-6" />
              <span>Analytics</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderJobPostings = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Job Postings</h2>
        <Button 
          onClick={() => setShowJobForm(true)}
          className="bg-gradient-to-r from-blue-500 to-indigo-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Post New Job
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : jobPostings.length === 0 ? (
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No job postings yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Start by creating your first job posting</p>
            <Button 
              onClick={() => setShowJobForm(true)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Post Your First Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobPostings.map((job) => (
            <Card key={job.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50 hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{job.title}</CardTitle>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>{job.department_name}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span>₹{job.min_salary} - ₹{job.max_salary}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {job.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {job.applications_count || 0} applications
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="View Details"
                      onClick={() => {
                        setSelectedJob(job)
                        setShowJobDetail(true)
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      title="Edit Job"
                      onClick={() => {
                        setSelectedJob(job)
                        setShowJobForm(true)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-red-500 hover:text-red-700"
                      title="Delete Job"
                      onClick={() => handleDeleteJob(job.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveView('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'overview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveView('jobs')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'jobs'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Job Postings
        </button>
        <button
          onClick={() => setActiveView('applications')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'applications'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Applications
        </button>
        <button
          onClick={() => setActiveView('pipeline')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'pipeline'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => setActiveView('interviews')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'interviews'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Interviews
        </button>
        <button
          onClick={() => setActiveView('analytics')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === 'analytics'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Analytics
        </button>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverview()}
      {activeView === 'jobs' && renderJobPostings()}
      {activeView === 'applications' && (
        <ApplicationsList />
      )}
      {activeView === 'pipeline' && (
        <CandidatePipeline />
      )}
      {activeView === 'interviews' && (
        <InterviewsList />
      )}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          <ShareAnalyticsDashboard />
          <RecruitmentAnalytics />
        </div>
      )}

      {/* Job Posting Form Modal */}
      <JobPostingForm
        isOpen={showJobForm}
        onClose={() => {
          setShowJobForm(false)
          setSelectedJob(undefined)
        }}
        onSuccess={fetchRecruitmentData}
        job={selectedJob}
      />

      {/* Job Detail Modal */}
      <JobDetailModal
        isOpen={showJobDetail}
        onClose={() => {
          setShowJobDetail(false)
          setSelectedJob(undefined)
        }}
        job={selectedJob || null}
      />
    </div>
  )
}

export default Recruitment