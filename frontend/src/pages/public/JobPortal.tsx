import React, { useState, useEffect } from 'react'
import { Search, MapPin, DollarSign, Briefcase, Building, Calendar, ArrowRight } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import api from '../../lib/api'
import { JobPosting } from '../services/hr/types/hrTypes'

const JobPortal: React.FC = () => {
  const [jobs, setJobs] = useState<JobPosting[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null)

  const fetchJobs = async () => {
    setLoading(true)
    try {
      const response = await api.get('/api/hr/public/jobs/', {
        params: { search }
      })
      setJobs(response.data.results || [])
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [search])

  const handleJobClick = (job: JobPosting) => {
    setSelectedJob(job)
  }

  const handleApply = (jobId: number) => {
    window.location.href = `/jobs/${jobId}/apply`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Find Your Dream Job
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
              Discover amazing opportunities with top companies
            </p>
          </div>
          
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search jobs, companies, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
                {jobs.length} Jobs Available
              </h2>
              
              {jobs.length === 0 ? (
                <Card className="text-center py-12">
                  <CardContent>
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No jobs found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
                  </CardContent>
                </Card>
              ) : (
                jobs.map((job) => (
                  <Card 
                    key={job.id} 
                    className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-500"
                    onClick={() => handleJobClick(job)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl text-blue-600 dark:text-blue-400">
                            {job.title}
                          </CardTitle>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <Building className="h-4 w-4" />
                              <span>{job.company_name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MapPin className="h-4 w-4" />
                              <span>{job.department_name}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(job.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleApply(job.id)
                          }}
                          className="bg-gradient-to-r from-blue-500 to-indigo-600"
                        >
                          Apply Now
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {job.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <DollarSign className="h-4 w-4" />
                            <span>₹{job.min_salary?.toLocaleString()} - ₹{job.max_salary?.toLocaleString()}</span>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full text-xs">
                            {job.employment_type?.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-500">
                          {job.applications_count || 0} applications
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="lg:col-span-1">
              {selectedJob ? (
                <Card className="sticky top-8">
                  <CardHeader>
                    <CardTitle className="text-xl text-blue-600 dark:text-blue-400">
                      {selectedJob.title}
                    </CardTitle>
                    <p className="text-gray-500 dark:text-gray-400">
                      {selectedJob.company_name} • {selectedJob.department_name}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">Job Description</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-4">
                        {selectedJob.description}
                      </p>
                    </div>
                    
                    {selectedJob.required_skills && selectedJob.required_skills.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white mb-2">Required Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.required_skills.slice(0, 6).map((skill, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <Button
                        onClick={() => handleApply(selectedJob.id)}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      >
                        Apply for this Job
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="text-center py-12">
                  <CardContent>
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Select a Job
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Click on a job to view details
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default JobPortal