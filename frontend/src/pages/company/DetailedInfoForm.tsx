import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import {
  Building2, Users, DollarSign, Globe, FileText, Phone, Mail, User,
  Briefcase, Receipt, CreditCard, Star, Sparkles,
  CheckCircle, ArrowRight, Shield, Zap, LogOut, Upload, X, File
} from 'lucide-react'
import toast from 'react-hot-toast'
import { apiClient } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'


const detailedInfoSchema = z.object({
  business_type: z.string().min(2, 'Business type is required'),
  industry: z.string().min(2, 'Industry is required'),
  employee_count: z.number().min(1, 'Employee count must be at least 1'),
  annual_revenue: z.number().min(0, 'Annual revenue must be positive'),
  website: z.string().url('Please enter a valid website URL').optional().or(z.literal('')),

  pan_number: z.string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Please enter a valid PAN number (e.g., ABCDE1234F)')
    .optional()
    .or(z.literal('')),
  gst_number: z.string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Please enter a valid GST number (e.g., 22AAAAA0000A1Z5)')
    .optional()
    .or(z.literal('')),

  contact_person_name: z.string().min(2, 'Contact person name is required'),
  contact_person_title: z.string().min(2, 'Contact person title is required'),
  contact_person_email: z.string().email('Please enter a valid email'),
  contact_person_phone: z.string().regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  description: z.string().min(10, 'Company description is required (minimum 10 characters)'),
  special_requirements: z.string().optional(),
})

type DetailedInfoFormData = z.infer<typeof detailedInfoSchema>

const DetailedInfoForm: React.FC = () => {
  const navigate = useNavigate()
  const { user, setFirstLoginRequired, logout } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [documents, setDocuments] = useState<{
    business_license?: File
    tax_certificate?: File
    pan_certificate?: File
    gst_certificate?: File
    incorporation_certificate?: File
    bank_statement?: File
    other_documents?: File[]
  }>({})

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailedInfoFormData>({
    resolver: zodResolver(detailedInfoSchema),
  })

  const submitDetailedInfoMutation = useMutation({
    mutationFn: async (data: DetailedInfoFormData) => {
      const formData = new FormData()
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString())
        }
      })
      
      // Add documents
      Object.entries(documents).forEach(([key, file]) => {
        if (file) {
          if (Array.isArray(file)) {
            file.forEach((f, index) => {
              formData.append(`${key}_${index}`, f)
            })
          } else {
            formData.append(key, file)
          }
        }
      })
      
      return apiClient.submitDetailedInfo(user?.company_id!, formData)
    },
    onSuccess: () => {
      toast.success('Company information and documents submitted successfully!')
      setFirstLoginRequired(false)
      navigate('/company/waiting-approval')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to submit information'
      toast.error(message)
      setIsSubmitting(false)
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
    retry: false, // Disable automatic retries
  })

  const onSubmit = (data: DetailedInfoFormData) => {
    if (submitDetailedInfoMutation.isPending || isSubmitting) {
      return // Prevent double submission
    }
    setIsSubmitting(true)
    submitDetailedInfoMutation.mutate(data)
  }

  const handleFileUpload = (type: string, file: File | null) => {
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF, JPEG, and PNG files are allowed')
        return
      }
    }
    
    setDocuments(prev => ({
      ...prev,
      [type]: file || undefined
    }))
  }

  const handleMultipleFileUpload = (files: FileList | null) => {
    if (!files) return
    
    const validFiles: File[] = []
    
    Array.from(files).forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File size must be less than 5MB`)
        return
      }
      
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: Only PDF, JPEG, and PNG files are allowed`)
        return
      }
      
      validFiles.push(file)
    })
    
    setDocuments(prev => ({
      ...prev,
      other_documents: validFiles
    }))
  }

  const businessTypes = [
    'Corporation',
    'LLC',
    'Partnership',
    'Sole Proprietorship',
    'Non-Profit',
    'Government',
    'Other'
  ]

  const industries = [
    'Technology',
    'Healthcare',
    'Finance',
    'Manufacturing',
    'Retail',
    'Education',
    'Construction',
    'Transportation',
    'Energy',
    'Agriculture',
    'Entertainment',
    'Other'
  ]

  const employeeRanges = [
    { value: 5, label: '1-10 employees' },
    { value: 25, label: '11-50 employees' },
    { value: 100, label: '51-200 employees' },
    { value: 500, label: '201-1000 employees' },
    { value: 1000, label: '1000+ employees' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950/30 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Enhanced Header */}
          <div className="text-center mb-12">
            <div className="relative group mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl blur opacity-60 group-hover:opacity-80 transition duration-300"></div>
              <div className="relative mx-auto h-20 w-20 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Building2 className="h-10 w-10 text-white" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent mb-6">
              Complete Your Company Profile
            </h1>
            <div className="max-w-3xl mx-auto">
              <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
                Help us understand your business better by providing detailed information.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                <Shield className="h-4 w-4" />
                <span>Secure & Confidential</span>
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                <span>Reviewed by Our Team</span>
                <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                <span>Quick Approval Process</span>
              </div>
            </div>

            {/* Logout Button */}
            <div className="absolute top-8 right-8">
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <LogOut className="h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </div>

          {/* Enhanced Form Container */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5 rounded-3xl blur-xl"></div>
            <div className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-3xl shadow-2xl shadow-gray-900/10 border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
              {/* Form Header */}
              <div className="relative px-8 py-8 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                    <FileText className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                      Company Information Form
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      All fields marked with <span className="text-red-500 font-medium">*</span> are required for verification
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-10">
                {/* Business Information Section */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                      <Briefcase className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Business Information
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tell us about your business structure and industry
                      </p>
                    </div>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Type *
                    </label>
                    <select
                      {...register('business_type')}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select business type</option>
                      {businessTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.business_type && (
                      <p className="mt-1 text-sm text-red-600">{errors.business_type.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Industry *
                    </label>
                    <select
                      {...register('industry')}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select industry</option>
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                    {errors.industry && (
                      <p className="mt-1 text-sm text-red-600">{errors.industry.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Employee Count *
                    </label>
                    <select
                      {...register('employee_count', { valueAsNumber: true })}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Select employee range</option>
                      {employeeRanges.map(range => (
                        <option key={range.value} value={range.value}>{range.label}</option>
                      ))}
                    </select>
                    {errors.employee_count && (
                      <p className="mt-1 text-sm text-red-600">{errors.employee_count.message}</p>
                    )}
                  </div>

                  <Input
                    {...register('annual_revenue', { valueAsNumber: true })}
                    type="number"
                    label="Annual Revenue (USD) *"
                    placeholder="1000000"
                    icon={<DollarSign className="h-4 w-4" />}
                    error={errors.annual_revenue?.message}
                    required
                  />

                  <Input
                    {...register('website')}
                    type="url"
                    label="Website"
                    placeholder="https://www.company.com"
                    icon={<Globe className="h-4 w-4" />}
                    error={errors.website?.message}
                  />



                  <Input
                    {...register('pan_number')}
                    label="PAN Number"
                    placeholder="ABCDE1234F"
                    icon={<CreditCard className="h-4 w-4" />}
                    error={errors.pan_number?.message}
                    helperText="Enter your PAN card number (optional)"
                  />

                  <Input
                    {...register('gst_number')}
                    label="GST Number"
                    placeholder="22AAAAA0000A1Z5"
                    icon={<Receipt className="h-4 w-4" />}
                    error={errors.gst_number?.message}
                    helperText="Enter your GST registration number (optional)"
                  />
                </div>
              </div>

                {/* Contact Information Section */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Primary Contact Information
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Details of the main contact person for your company
                      </p>
                    </div>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    {...register('contact_person_name')}
                    label="Contact Person Name *"
                    placeholder="John Doe"
                    icon={<User className="h-4 w-4" />}
                    error={errors.contact_person_name?.message}
                    required
                  />

                  <Input
                    {...register('contact_person_title')}
                    label="Contact Person Title *"
                    placeholder="CEO, Manager, etc."
                    icon={<Users className="h-4 w-4" />}
                    error={errors.contact_person_title?.message}
                    required
                  />

                  <Input
                    {...register('contact_person_email')}
                    type="email"
                    label="Contact Person Email *"
                    placeholder="contact@company.com"
                    icon={<Mail className="h-4 w-4" />}
                    error={errors.contact_person_email?.message}
                    required
                  />

                  <Input
                    {...register('contact_person_phone')}
                    type="tel"
                    label="Contact Person Phone *"
                    placeholder="+1 (555) 123-4567"
                    icon={<Phone className="h-4 w-4" />}
                    error={errors.contact_person_phone?.message}
                    required
                  />
                </div>
              </div>

                {/* Document Upload Section */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Document Upload
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Upload business documents for verification (all documents are optional)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Business License */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Business License
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload('business_license', e.target.files?.[0] || null)}
                          className="hidden"
                          id="business_license"
                        />
                        <label
                          htmlFor="business_license"
                          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          {documents.business_license ? (
                            <div className="text-center">
                              <File className="h-8 w-8 text-green-500 mx-auto mb-2" />
                              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {documents.business_license.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(documents.business_license.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click to upload business license (optional)
                              </p>
                              <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                            </div>
                          )}
                        </label>
                        {documents.business_license && (
                          <button
                            type="button"
                            onClick={() => handleFileUpload('business_license', null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tax Certificate */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tax Certificate
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload('tax_certificate', e.target.files?.[0] || null)}
                          className="hidden"
                          id="tax_certificate"
                        />
                        <label
                          htmlFor="tax_certificate"
                          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          {documents.tax_certificate ? (
                            <div className="text-center">
                              <File className="h-8 w-8 text-green-500 mx-auto mb-2" />
                              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {documents.tax_certificate.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(documents.tax_certificate.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click to upload tax certificate (optional)
                              </p>
                              <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                            </div>
                          )}
                        </label>
                        {documents.tax_certificate && (
                          <button
                            type="button"
                            onClick={() => handleFileUpload('tax_certificate', null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PAN Certificate */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        PAN Certificate
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload('pan_certificate', e.target.files?.[0] || null)}
                          className="hidden"
                          id="pan_certificate"
                        />
                        <label
                          htmlFor="pan_certificate"
                          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          {documents.pan_certificate ? (
                            <div className="text-center">
                              <File className="h-8 w-8 text-green-500 mx-auto mb-2" />
                              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {documents.pan_certificate.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(documents.pan_certificate.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click to upload PAN certificate
                              </p>
                              <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                            </div>
                          )}
                        </label>
                        {documents.pan_certificate && (
                          <button
                            type="button"
                            onClick={() => handleFileUpload('pan_certificate', null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* GST Certificate */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        GST Certificate
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload('gst_certificate', e.target.files?.[0] || null)}
                          className="hidden"
                          id="gst_certificate"
                        />
                        <label
                          htmlFor="gst_certificate"
                          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          {documents.gst_certificate ? (
                            <div className="text-center">
                              <File className="h-8 w-8 text-green-500 mx-auto mb-2" />
                              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {documents.gst_certificate.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(documents.gst_certificate.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click to upload GST certificate
                              </p>
                              <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                            </div>
                          )}
                        </label>
                        {documents.gst_certificate && (
                          <button
                            type="button"
                            onClick={() => handleFileUpload('gst_certificate', null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Incorporation Certificate */}
                    <div className="group">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Incorporation Certificate
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileUpload('incorporation_certificate', e.target.files?.[0] || null)}
                          className="hidden"
                          id="incorporation_certificate"
                        />
                        <label
                          htmlFor="incorporation_certificate"
                          className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        >
                          {documents.incorporation_certificate ? (
                            <div className="text-center">
                              <File className="h-8 w-8 text-green-500 mx-auto mb-2" />
                              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                                {documents.incorporation_certificate.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(documents.incorporation_certificate.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Click to upload incorporation certificate (optional)
                              </p>
                              <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                            </div>
                          )}
                        </label>
                        {documents.incorporation_certificate && (
                          <button
                            type="button"
                            onClick={() => handleFileUpload('incorporation_certificate', null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Other Documents */}
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Additional Documents (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => handleMultipleFileUpload(e.target.files)}
                        className="hidden"
                        id="other_documents"
                      />
                      <label
                        htmlFor="other_documents"
                        className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-orange-500 dark:hover:border-orange-400 transition-colors bg-gray-50 dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      >
                        <div className="text-center">
                          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Click to upload additional documents
                          </p>
                          <p className="text-xs text-gray-500">Multiple files allowed • PDF, JPG, PNG (Max 5MB each)</p>
                        </div>
                      </label>
                    </div>
                    {documents.other_documents && documents.other_documents.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {documents.other_documents.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            <div className="flex items-center gap-3">
                              <File className="h-5 w-5 text-blue-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newFiles = documents.other_documents?.filter((_, i) => i !== index)
                                setDocuments(prev => ({ ...prev, other_documents: newFiles }))
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information Section */}
                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Additional Information
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Help us understand your business better
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Company Description */}
                    <div className="group">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        <FileText className="h-4 w-4 text-emerald-500" />
                        Company Description <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          {...register('description')}
                          rows={5}
                          className="block w-full rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-emerald-500 dark:focus:border-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-500 resize-none"
                          placeholder="Describe your company's business model, products, services, target market, and key objectives. This helps us understand your needs better..."
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </div>
                      {errors.description && (
                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                          {errors.description.message}
                        </p>
                      )}
                    </div>

                    {/* Special Requirements */}
                    <div className="group">
                      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        <Star className="h-4 w-4 text-amber-500" />
                        Special Requirements
                        <span className="text-xs text-gray-500 dark:text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <textarea
                          {...register('special_requirements')}
                          rows={4}
                          className="block w-full rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-4 py-3.5 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all duration-300 hover:border-amber-300 dark:hover:border-amber-500 resize-none"
                          placeholder="Any specific customizations, integrations, compliance requirements, or special features you need..."
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </div>
                  </div>
                </div>
              </div>

                {/* Enhanced Submit Section */}
                <div className="relative pt-8">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>

                  <div className="flex flex-col items-center gap-6">
                    {/* Progress Indicator */}
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Form completed • Ready for submission</span>
                    </div>

                    {/* Submit Button */}
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-300"></div>
                      <button
                        type="submit"
                        disabled={submitDetailedInfoMutation.isPending || isSubmitting}
                        className="relative px-12 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl shadow-2xl shadow-blue-500/30 hover:shadow-3xl hover:shadow-purple-500/50 transition-all duration-500 hover:-translate-y-1 hover:scale-105 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-2xl flex items-center justify-center gap-3 min-w-[240px] overflow-hidden disabled:cursor-not-allowed"
                      >
                        {/* Button Background Animation */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative flex items-center gap-3">
                          {submitDetailedInfoMutation.isPending ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="h-5 w-5" />
                              <span>Submit for Review</span>
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </>
                          )}
                        </div>
                      </button>
                    </div>

                    {/* Help Text */}
                    <div className="text-center max-w-md">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Your information will be reviewed by our team within 24-48 hours.
                        You'll receive an email notification once approved.
                      </p>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DetailedInfoForm
