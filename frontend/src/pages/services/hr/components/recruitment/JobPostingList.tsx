import React, { useState, useEffect } from 'react'
import { Search, Filter, Plus, Edit, Eye, Trash2, Briefcase, Users, Calendar, MapPin } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { JobPosting, JobPostingFilters } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'

interface JobPostingListProps {
  onAddJob?: () => void
  onEditJob?: (job: JobPosting) => void
  onViewJob?: (job: JobPosting) => void
}

const JobPostingList: React.FC<JobPostingListProps> = ({
  onAddJob,
  onEditJob,
  onViewJob
}) => {
  const { sessionKey } = useServiceUserStore()
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<JobPostingFilters>({})

  const fetchJobs = async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      // API call will be implemented when backend is ready
      console.log('Fetching job postings...')
      setJobs([])
    } catch (error) {
      console.error('Error fetching job postings:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [sessionKey, filters])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'closed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getWorkModeIcon = (workMode: string) => {
    switch (workMode) {
      case 'remote': return '🏠'
      case 'hybrid': return '🔄'
      default: return '🏢'
    }
  }

  return (
    <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Briefcase className="h-5 w-5 text-green-500" />
            <span>Job Postings</span>
          </CardTitle>
          <Button onClick={onAddJob} className="bg-gradient-to-r from-green-500 to-emerald-600">
            <Plus className="h-4 w-4 mr-2" />
            Post Job
          </Button>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search job postings..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No job postings found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Start recruiting by posting your first job</p>
            <Button onClick={onAddJob} className="bg-gradient-to-r from-green-500 to-emerald-600">
              <Plus className="h-4 w-4 mr-2" />
              Post Job
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white font-medium">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">{job.title}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{job.department_name}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {getWorkModeIcon(job.work_mode)} {job.work_mode}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {job.applications_count} applications
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {job.posted_date ? new Date(job.posted_date).toLocaleDateString() : 'Draft'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          ₹{job.min_salary.toLocaleString()} - ₹{job.max_salary.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    {/* AI Features */}
                    {job.ai_screening_enabled && (
                      <div className="flex items-center space-x-2 mb-3">
                        <div className="px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 text-xs rounded-full">
                          🤖 AI Screening Enabled
                        </div>
                        {job.required_skills.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-500">Skills:</span>
                            {job.required_skills.slice(0, 3).map((skill, index) => (
                              <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs rounded-full">
                                {skill}
                              </span>
                            ))}
                            {job.required_skills.length > 3 && (
                              <span className="text-xs text-gray-500">+{job.required_skills.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 ml-4">
                    <div className="text-right">
                      <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                      {job.application_deadline && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Deadline: {new Date(job.application_deadline).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => onViewJob?.(job)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => onEditJob?.(job)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default JobPostingList