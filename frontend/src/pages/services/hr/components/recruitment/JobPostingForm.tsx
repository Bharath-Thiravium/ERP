import React, { useState, useEffect } from 'react'
import { X, Briefcase, DollarSign, Users, FileText } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { JobPosting } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'


interface JobPostingFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  job?: JobPosting
}

const JobPostingForm: React.FC<JobPostingFormProps> = ({ isOpen, onClose, onSuccess, job }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<any[]>([])
  const [designations, setDesignations] = useState<any[]>([])

  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    responsibilities: '',
    department: '',
    designation: '',
    employment_type: 'full_time',
    work_mode: 'office',
    min_salary: '',
    max_salary: '',
    required_skills: '',
    status: 'active'
  })

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        description: job.description || '',
        requirements: job.requirements || '',
        responsibilities: job.responsibilities || '',
        department: job.department?.toString() || '',
        designation: job.designation?.toString() || '',
        employment_type: job.employment_type || 'full_time',
        work_mode: job.work_mode || 'office',
        min_salary: job.min_salary?.toString() || '',
        max_salary: job.max_salary?.toString() || '',
        required_skills: Array.isArray(job.required_skills) ? job.required_skills.join(', ') : '',
        status: job.status || 'active'
      })
    }
  }, [job])

  useEffect(() => {
    if (isOpen && sessionKey) {
      fetchDepartments()
    }
  }, [isOpen, sessionKey])

  useEffect(() => {
    if (formData.department) {
      fetchDesignations(formData.department)
    } else {
      setDesignations([])
    }
  }, [formData.department])

  const fetchDepartments = async () => {
    try {
      const deptResponse = await api.get('/api/hr/dropdown/departments/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setDepartments(deptResponse.data.results || deptResponse.data || [])
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

  const fetchDesignations = async (departmentId: string) => {
    try {
      const response = await api.get('/api/hr/dropdown/designations/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { department_id: departmentId, session_key: sessionKey }
      })
      setDesignations(response.data || [])
    } catch (error) {
      console.error('Error fetching designations:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    // Basic validation
    if (!formData.title.trim()) {
      toast.error('Job title is required')
      return
    }
    if (!formData.description.trim()) {
      toast.error('Job description is required')
      return
    }
    if (!formData.department) {
      toast.error('Department is required')
      return
    }
    if (!formData.designation) {
      toast.error('Designation is required')
      return
    }
    if (!formData.responsibilities.trim()) {
      toast.error('Responsibilities are required')
      return
    }

    setLoading(true)
    try {
      const payload = {
        ...formData,
        department: parseInt(formData.department),
        designation: parseInt(formData.designation),
        min_salary: formData.min_salary ? parseFloat(formData.min_salary) : null,
        max_salary: formData.max_salary ? parseFloat(formData.max_salary) : null,
        required_skills: formData.required_skills ? formData.required_skills.split(',').map(s => s.trim()).filter(s => s) : [],
        session_key: sessionKey
      }

      if (job) {
        await api.put(`/api/hr/job-postings/${job.id}/`, payload)
        toast.success('Job posting updated successfully')
      } else {
        await api.post('/api/hr/job-postings/', payload)
        toast.success('Job posting created successfully')
      }
      
      onSuccess()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error('Error saving job posting:', error)
      toast.error(error.response?.data?.detail || 'Failed to save job posting')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      requirements: '',
      responsibilities: '',
      department: '',
      designation: '',
      employment_type: 'full_time',
      work_mode: 'office',
      min_salary: '',
      max_salary: '',
      required_skills: '',
      status: 'active'
    })
  }

  const handleClose = () => {
    onClose()
    if (!job) resetForm()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {job ? 'Edit Job Posting' : 'Post New Job'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {job ? 'Update job posting details' : 'Create a new job posting to attract talent'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                <FileText className="h-5 w-5 text-blue-500" />
                <span>Basic Information</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g. Senior Software Engineer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value, designation: '' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Designation *
                  </label>
                  <select
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    disabled={!formData.department}
                    required
                  >
                    <option value="">Select Designation</option>
                    {designations.map((desig) => (
                      <option key={desig.id} value={desig.id}>
                        {desig.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Employment Type
                  </label>
                  <select
                    value={formData.employment_type}
                    onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                    <option value="consultant">Consultant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Work Mode
                  </label>
                  <select
                    value={formData.work_mode}
                    onChange={(e) => setFormData({ ...formData, work_mode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="office">Office</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Compensation */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span>Compensation</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.min_salary}
                    onChange={(e) => setFormData({ ...formData, min_salary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g. 500000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Salary (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.max_salary}
                    onChange={(e) => setFormData({ ...formData, max_salary: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="e.g. 800000"
                  />
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-500" />
                <span>Requirements</span>
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Required Skills
                </label>
                <input
                  type="text"
                  value={formData.required_skills}
                  onChange={(e) => setFormData({ ...formData, required_skills: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="e.g. React, TypeScript, Node.js, Python"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Describe the role, responsibilities, and what makes this position exciting..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Job Responsibilities *
                </label>
                <textarea
                  value={formData.responsibilities}
                  onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="List the key responsibilities and duties for this role..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Requirements & Qualifications
                </label>
                <textarea
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="List the required qualifications, skills, and experience..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            >
              {loading ? 'Saving...' : job ? 'Update Job' : 'Post Job'}
            </Button>
          </div>
        </form>


      </div>
    </div>
  )
}

export default JobPostingForm