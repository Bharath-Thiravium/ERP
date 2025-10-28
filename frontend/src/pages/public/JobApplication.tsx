import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, User, Send, ChevronLeft, ChevronRight, Briefcase, GraduationCap, FileText } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { JobPosting } from '../services/hr/types/hrTypes'

const JobApplication: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<JobPosting | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
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
    }
  }, [jobId])

  const fetchJobDetails = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/api/hr/public/jobs/${jobId}/`)
      setJob(response.data)
    } catch (error) {
      console.error('Error fetching job details:', error)
      toast.error('Job not found')
      navigate('/jobs')
    } finally {
      setLoading(false)
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
        return formData.first_name && formData.last_name && formData.email && formData.phone
      case 2:
        return formData.current_position && formData.total_experience
      case 3:
        return true // Optional step
      case 4:
        return resume || formData.cover_letter
      default:
        return true
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateStep(1) || !validateStep(2) || !validateStep(4)) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          formDataToSend.append(key, JSON.stringify(value))
        } else {
          formDataToSend.append(key, value.toString())
        }
      })
      
      if (resume) {
        formDataToSend.append('resume', resume)
      }

      await api.post(`/api/hr/public/jobs/${jobId}/apply/`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.success('Application submitted successfully!')
      navigate('/jobs')
    } catch (error: any) {
      console.error('Error submitting application:', error)
      toast.error(error.response?.data?.detail || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Card className="text-center p-8">
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Job Not Found</h2>
            <Button onClick={() => navigate('/jobs')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/jobs')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Apply for {job.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {job.company_name} • {job.department_name}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Enhanced Multi-Step Application Form */}
          <div className="lg:col-span-2">
            <Card className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl">
              {/* Progress Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white rounded-t-2xl">
                <h2 className="text-2xl font-bold mb-4">Professional Application</h2>
                
                {/* Progress Bar */}
                <div className="flex items-center space-x-2 mb-4">
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
                
                <div className="text-sm text-blue-100">
                  Step {currentStep} of 4: {
                    currentStep === 1 ? 'Personal Information' :
                    currentStep === 2 ? 'Professional Details' :
                    currentStep === 3 ? 'Education & Skills' :
                    'Documents & Final Details'
                  }
                </div>
              </div>
              
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
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
                            value={formData.first_name}
                            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
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
                            value={formData.last_name}
                            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
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
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
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
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
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
                            value={formData.current_location}
                            onChange={(e) => setFormData({...formData, current_location: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="City, State"
                          />
                        </div>
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            id="relocate"
                            checked={formData.willing_to_relocate}
                            onChange={(e) => setFormData({...formData, willing_to_relocate: e.target.checked})}
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
                            value={formData.current_position}
                            onChange={(e) => setFormData({...formData, current_position: e.target.value})}
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
                            value={formData.current_company}
                            onChange={(e) => setFormData({...formData, current_company: e.target.value})}
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
                            value={formData.total_experience}
                            onChange={(e) => setFormData({...formData, total_experience: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Expected Salary (₹)
                          </label>
                          <input
                            type="number"
                            value={formData.expected_salary}
                            onChange={(e) => setFormData({...formData, expected_salary: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            placeholder="Expected annual salary"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notice Period
                          </label>
                          <select
                            value={formData.notice_period}
                            onChange={(e) => setFormData({...formData, notice_period: e.target.value})}
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
                            value={formData.linkedin_profile}
                            onChange={(e) => setFormData({...formData, linkedin_profile: e.target.value})}
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
                            value={Array.isArray(formData.skills) ? formData.skills.join(', ') : ''}
                            onChange={(e) => setFormData({...formData, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
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
                            value={Array.isArray(formData.certifications) ? formData.certifications.join(', ') : ''}
                            onChange={(e) => setFormData({...formData, certifications: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
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
                            value={formData.portfolio_url}
                            onChange={(e) => setFormData({...formData, portfolio_url: e.target.value})}
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
                            value={formData.cover_letter}
                            onChange={(e) => setFormData({...formData, cover_letter: e.target.value})}
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
                      <Button type="button" variant="outline" onClick={() => navigate('/jobs')}>
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
                          disabled={submitting || !validateStep(4)}
                          className="bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 flex items-center space-x-2"
                        >
                          {submitting ? 'Submitting...' : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>Submit Application</span>
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Job Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg text-blue-600 dark:text-blue-400">
                  {job.title}
                </CardTitle>
                <p className="text-gray-500 dark:text-gray-400">
                  {job.company_name}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Department</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{job.department_name}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Employment Type</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {job.employment_type?.replace('_', ' ')}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Salary Range</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    ₹{job.min_salary?.toLocaleString()} - ₹{job.max_salary?.toLocaleString()}
                  </p>
                </div>

                {job.required_skills && job.required_skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Required Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {job.required_skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default JobApplication