import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Briefcase, MapPin, DollarSign, Users, FileText, Clock, Building, Send, Upload, ChevronLeft, ChevronRight, User, GraduationCap } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import api from '../../lib/api'
import toast from 'react-hot-toast'

interface PublicJobDetailProps {}

const PublicJobDetail: React.FC<PublicJobDetailProps> = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [applicationData, setApplicationData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    current_position: '',
    current_company: '',
    total_experience: '',
    relevant_experience: '',
    current_salary: '',
    expected_salary: '',
    notice_period: '',
    current_location: '',
    willing_to_relocate: false,
    linkedin_profile: '',
    portfolio_url: '',
    education_details: [] as string[],
    skills: [] as string[],
    certifications: [] as string[],
    languages: [] as string[],
    cover_letter: ''
  })
  const [currentStep, setCurrentStep] = useState(1)
  const [resume, setResume] = useState<File | null>(null)

  useEffect(() => {
    if (jobId) {
      fetchJobDetails()
      trackClick()
    }
  }, [jobId])

  const trackClick = async () => {
    const urlParams = new URLSearchParams(window.location.search)
    const shareId = urlParams.get('share_id')
    
    if (shareId) {
      try {
        await api.post('/api/hr/share-analytics/track-click/', {
          share_id: shareId
        })
      } catch (error) {
        console.error('Error tracking click:', error)
      }
    }
  }

  const fetchJobDetails = async () => {
    try {
      const response = await api.get(`/api/hr/public/jobs/${jobId}/`)
      setJob(response.data)
    } catch (error) {
      console.error('Error fetching job details:', error)
      toast.error('Job not found or no longer available')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB')
        return
      }
      if (!file.type.includes('pdf') && !file.type.includes('doc')) {
        toast.error('Please upload PDF or DOC file')
        return
      }
      setResume(file)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return applicationData.first_name && applicationData.last_name && applicationData.email && applicationData.phone
      case 2:
        return applicationData.current_position && applicationData.total_experience
      case 3:
        return true // Optional step
      case 4:
        return resume || applicationData.cover_letter
      default:
        return true
    }
  }

  const handleApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep(1) || !validateStep(2) || !validateStep(4)) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const formData = new FormData()
      Object.entries(applicationData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value))
        } else {
          formData.append(key, value.toString())
        }
      })
      
      if (resume) {
        formData.append('resume', resume)
      }

      const response = await api.post(`/api/hr/public/jobs/${jobId}/apply/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      // Track application from share if applicable
      const urlParams = new URLSearchParams(window.location.search)
      const shareId = urlParams.get('share_id')
      
      if (shareId && response.data.application_id) {
        try {
          await api.post('/api/hr/share-analytics/track-application/', {
            share_id: shareId,
            application_id: response.data.application_id
          })
        } catch (trackError) {
          console.error('Error tracking application from share:', trackError)
        }
      }
      
      // Refresh job posting to update application count
      fetchJobDetails()
      
      toast.success('Application submitted successfully!')
      setShowApplicationForm(false)
      setApplicationData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        current_position: '',
        current_company: '',
        total_experience: '',
        relevant_experience: '',
        current_salary: '',
        expected_salary: '',
        notice_period: '',
        current_location: '',
        willing_to_relocate: false,
        linkedin_profile: '',
        portfolio_url: '',
        education_details: [] as string[],
        skills: [] as string[],
        certifications: [] as string[],
        languages: [] as string[],
        cover_letter: ''
      })
      setCurrentStep(1)
      setResume(null)
    } catch (error: any) {
      console.error('Error submitting application:', error)
      toast.error(error.response?.data?.message || 'Failed to submit application')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Job Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400">This job posting is no longer available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Professional Header with Company Branding */}
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-lg border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Company Logo & Branding */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {job.company_logo ? (
                <img 
                  src={`http://localhost:8000${job.company_logo}`}
                  alt={job.company_name || 'Company Logo'}
                  className="h-16 w-16 rounded-xl object-cover shadow-lg"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg ${job.company_logo ? 'hidden' : ''}`}>
                <Building className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {job.company_name || 'Professional Company'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {job.department_name} Department
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm font-medium">
                Now Hiring
              </div>
            </div>
          </div>
          
          {/* Job Title & Key Info */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">{job.title}</h1>
                    <p className="text-blue-100 mt-1">
                      {job.designation_title} • {job.employment_type?.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-blue-200" />
                    <div>
                      <p className="text-sm text-blue-200">Salary Range</p>
                      <p className="font-semibold">₹{job.min_salary?.toLocaleString()} - ₹{job.max_salary?.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-blue-200" />
                    <div>
                      <p className="text-sm text-blue-200">Work Mode</p>
                      <p className="font-semibold capitalize">{job.work_mode}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-200" />
                    <div>
                      <p className="text-sm text-blue-200">Type</p>
                      <p className="font-semibold capitalize">{job.employment_type?.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Job Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Salary</p>
                      <p className="font-medium">₹{job.min_salary?.toLocaleString()} - ₹{job.max_salary?.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                      <p className="font-medium capitalize">{job.employment_type?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Work Mode</p>
                      <p className="font-medium capitalize">{job.work_mode}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span>Job Description</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{job.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Responsibilities */}
            {job.responsibilities && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-green-500" />
                    <span>Key Responsibilities</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{job.responsibilities}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Requirements */}
            {job.requirements && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements & Qualifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Required Skills */}
            {job.required_skills && job.required_skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Section */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-700">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-blue-100">Apply for this Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setShowApplicationForm(true)}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Send className="h-5 w-5 mr-2" />
                  Apply Now - Join Our Team
                </Button>
                <div className="text-center space-y-2">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    🚀 Join our team and make an impact
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Application process takes less than 5 minutes
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  <span>About {job.company_name || 'Our Company'}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    {job.company_logo ? (
                      <img 
                        src={`http://localhost:8000${job.company_logo}`}
                        alt={job.company_name || 'Company Logo'}
                        className="h-12 w-12 rounded-lg object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center ${job.company_logo ? 'hidden' : ''}`}>
                      <Building className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {job.company_name || 'Professional Company'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {job.department_name} Department
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Posted</p>
                        <p className="font-medium">{new Date(job.created_at).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Applications</p>
                        <p className="font-medium">{job.applications_count || 0} received</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Actively recruiting</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enhanced Multi-Step Application Modal */}
      {showApplicationForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden">
            {/* Header with Progress */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Apply for {job.title}</h2>
                  <p className="text-blue-100">{job.company_name || 'Company'}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowApplicationForm(false)} className="text-white hover:bg-white/20">
                  ×
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'
                    }`}>
                      {step}
                    </div>
                    {step < 4 && <div className={`w-12 h-1 mx-2 ${
                      currentStep > step ? 'bg-white' : 'bg-blue-500'
                    }`} />}
                  </div>
                ))}
              </div>
              
              <div className="mt-2 text-sm text-blue-100">
                Step {currentStep} of 4: {
                  currentStep === 1 ? 'Personal Information' :
                  currentStep === 2 ? 'Professional Details' :
                  currentStep === 3 ? 'Education & Skills' :
                  'Documents & Final Details'
                }
              </div>
            </div>
            
            <form onSubmit={handleApplicationSubmit} className="p-6 overflow-y-auto max-h-[calc(95vh-200px)]">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                      <p className="text-gray-600 dark:text-gray-400">Tell us about yourself</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={applicationData.first_name}
                        onChange={(e) => setApplicationData({...applicationData, first_name: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={applicationData.last_name}
                        onChange={(e) => setApplicationData({...applicationData, last_name: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={applicationData.email}
                        onChange={(e) => setApplicationData({...applicationData, email: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={applicationData.phone}
                        onChange={(e) => setApplicationData({...applicationData, phone: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Location
                      </label>
                      <input
                        type="text"
                        value={applicationData.current_location}
                        onChange={(e) => setApplicationData({...applicationData, current_location: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="City, State"
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="relocate"
                        checked={applicationData.willing_to_relocate}
                        onChange={(e) => setApplicationData({...applicationData, willing_to_relocate: e.target.checked})}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="relocate" className="text-sm text-gray-700 dark:text-gray-300">
                        Willing to relocate
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 2: Professional Details */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Briefcase className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Professional Details</h3>
                      <p className="text-gray-600 dark:text-gray-400">Your work experience and expectations</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Position *
                      </label>
                      <input
                        type="text"
                        value={applicationData.current_position}
                        onChange={(e) => setApplicationData({...applicationData, current_position: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="e.g. Senior Software Engineer"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Company
                      </label>
                      <input
                        type="text"
                        value={applicationData.current_company}
                        onChange={(e) => setApplicationData({...applicationData, current_company: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Company name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Total Experience (Years) *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={applicationData.total_experience}
                        onChange={(e) => setApplicationData({...applicationData, total_experience: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Relevant Experience (Years)
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={applicationData.relevant_experience}
                        onChange={(e) => setApplicationData({...applicationData, relevant_experience: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Current Salary (₹)
                      </label>
                      <input
                        type="number"
                        value={applicationData.current_salary}
                        onChange={(e) => setApplicationData({...applicationData, current_salary: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Annual salary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Expected Salary (₹)
                      </label>
                      <input
                        type="number"
                        value={applicationData.expected_salary}
                        onChange={(e) => setApplicationData({...applicationData, expected_salary: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Expected annual salary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notice Period
                      </label>
                      <select
                        value={applicationData.notice_period}
                        onChange={(e) => setApplicationData({...applicationData, notice_period: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">Select notice period</option>
                        <option value="immediate">Immediate</option>
                        <option value="15_days">15 Days</option>
                        <option value="1_month">1 Month</option>
                        <option value="2_months">2 Months</option>
                        <option value="3_months">3 Months</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        LinkedIn Profile
                      </label>
                      <input
                        type="url"
                        value={applicationData.linkedin_profile}
                        onChange={(e) => setApplicationData({...applicationData, linkedin_profile: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="https://linkedin.com/in/yourprofile"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 3: Education & Skills */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <GraduationCap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Education & Skills</h3>
                      <p className="text-gray-600 dark:text-gray-400">Your qualifications and expertise</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Key Skills (comma separated)
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(applicationData.skills) ? applicationData.skills.join(', ') : ''}
                        onChange={(e) => setApplicationData({...applicationData, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="React, Node.js, Python, Project Management"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Certifications (comma separated)
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(applicationData.certifications) ? applicationData.certifications.join(', ') : ''}
                        onChange={(e) => setApplicationData({...applicationData, certifications: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="AWS Certified, PMP, Scrum Master"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Portfolio/Website URL
                      </label>
                      <input
                        type="url"
                        value={applicationData.portfolio_url}
                        onChange={(e) => setApplicationData({...applicationData, portfolio_url: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="https://yourportfolio.com"
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Step 4: Documents & Final Details */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Documents & Final Details</h3>
                      <p className="text-gray-600 dark:text-gray-400">Upload your resume and add final touches</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Resume/CV *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-blue-500 transition-colors">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <div className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                          {resume ? resume.name : 'Upload your resume'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                          PDF, DOC, DOCX (Max 5MB)
                        </div>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                          id="resume-upload"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('resume-upload')?.click()}
                          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        >
                          Choose File
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cover Letter
                      </label>
                      <textarea
                        value={applicationData.cover_letter}
                        onChange={(e) => setApplicationData({...applicationData, cover_letter: e.target.value})}
                        rows={6}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="Tell us why you're interested in this position and what makes you a great fit for our team..."
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-8 border-t border-gray-200 dark:border-gray-700">
                <div>
                  {currentStep > 1 && (
                    <Button type="button" variant="outline" onClick={prevStep} className="flex items-center space-x-2">
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button type="button" variant="outline" onClick={() => setShowApplicationForm(false)}>
                    Cancel
                  </Button>
                  
                  {currentStep < 4 ? (
                    <Button 
                      type="button" 
                      onClick={nextStep}
                      disabled={!validateStep(currentStep)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 flex items-center space-x-2"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={!validateStep(4)}
                      className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Submit Application</span>
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default PublicJobDetail