import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Building2, Mail, Phone, MapPin, Key, Eye, EyeOff, Check, Sparkles, Zap, Star, Calculator, Shield, Rocket } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '../../lib/api'
import { generatePassword, validatePassword } from '../../lib/utils'
import { Modal } from '../ui/Modal'


const createCompanySchema = z.object({
  name: z.string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s&.-]+$/, 'Company name contains invalid characters'),
  company_prefix: z.string()
    .min(2, 'Company prefix must be at least 2 characters')
    .max(10, 'Company prefix must be less than 10 characters')
    .regex(/^[A-Za-z0-9]+$/, 'Company prefix must contain only letters and numbers')
    .transform(val => val.toUpperCase()),
  email: z.string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z.string()
    .regex(/^[0-9]{10}$/, 'Phone number must be exactly 10 digits'),
  address: z.string()
    .min(5, 'Address must be at least 5 characters')
    .max(500, 'Address must be less than 500 characters'),
  services: z.array(z.number()).min(1, 'Please select at least one service'),
  user_email: z.string()
    .email('Please enter a valid user email address')
    .max(255, 'Email must be less than 255 characters'),
  user_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
           'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
})

type CreateCompanyFormData = z.infer<typeof createCompanySchema>

interface CreateCompanyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  services?: any[]
  servicesLoading?: boolean
}

const CreateCompanyModal: React.FC<CreateCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  services,
  servicesLoading = false,
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const [selectedServices, setSelectedServices] = useState<number[]>([])
  const [passwordGenerated, setPasswordGenerated] = useState(false)




  // Reset password generation state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPasswordGenerated(false)
    }
  }, [isOpen])



  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      services: [],
    },
  })

  const createCompanyMutation = useMutation({
    mutationFn: (data: CreateCompanyFormData) => apiClient.createCompany(data),
    onSuccess: (response) => {
      const { company, user_credentials } = response.data
      
      // Download the actual credentials used by backend
      if (user_credentials && company) {
        downloadCredentials(company.name, user_credentials.email, user_credentials.password)
      }
      
      toast.success('Company created successfully! Credentials downloaded.')

      // Close modal
      reset()
      setSelectedServices([])
      setPasswordGenerated(false)
      onSuccess()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to create company'
      toast.error(message)
    },
  })

  const onSubmit = (data: CreateCompanyFormData) => {
    createCompanyMutation.mutate({
      ...data,
      services: selectedServices,
    })
  }



  const handleServiceToggle = (serviceId: number) => {
    const newServices = selectedServices.includes(serviceId)
      ? selectedServices.filter(id => id !== serviceId)
      : [...selectedServices, serviceId]

    setSelectedServices(newServices)
    setValue('services', newServices)
  }

  const downloadCredentials = (companyName: string, email: string, password: string) => {
    const credentials = `Company Credentials
====================

Company Name: ${companyName}
User Email: ${email}
Password: ${password}

Generated on: ${new Date().toLocaleString()}

IMPORTANT: Please keep these credentials secure and share them only with authorized personnel.
`

    const blob = new Blob([credentials], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${companyName.replace(/[^a-zA-Z0-9]/g, '_')}_credentials.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const handleGeneratePassword = () => {
    // Get current form values
    const companyName = watch('name')
    const email = watch('user_email')

    // Validate required fields before generating password
    if (!companyName || !email) {
      toast.error('Please fill in Company Name and User Email before generating password')
      return
    }

    // Generate password and validate it meets requirements
    let password = generatePassword(12)
    let attempts = 0
    const maxAttempts = 5

    // Ensure the generated password meets all validation requirements
    while (!validatePassword(password).isValid && attempts < maxAttempts) {
      password = generatePassword(12)
      attempts++
    }

    if (!validatePassword(password).isValid) {
      toast.error('Failed to generate a valid password. Please try again.')
      return
    }

    setValue('user_password', password)
    setPasswordGenerated(true)

    toast.success('Password generated! Credentials will be downloaded after company creation.')
  }

  const calculateTotalPrice = () => {
    if (!services || !Array.isArray(services) || selectedServices.length === 0) {
      return 0
    }

    return selectedServices.reduce((total, serviceId) => {
      const service = services.find(s => s.id === serviceId)
      if (service && service.base_price) {
        const price = typeof service.base_price === 'string' ? parseFloat(service.base_price) : service.base_price
        return total + (isNaN(price) ? 0 : price)
      }
      return total
    }, 0)
  }

  // Debug services data in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 DEBUG: CreateCompanyModal services length:', services?.length)
    if (selectedServices.length > 0) {
      console.log('🔍 DEBUG: Selected services:', selectedServices)
      console.log('🔍 DEBUG: Available services:', services)
      console.log('🔍 DEBUG: Calculated total:', calculateTotalPrice())
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="4xl"
      className="max-w-6xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/25"
      bodyClassName="p-0"
    >
      <div className="relative w-full max-h-[95vh] overflow-hidden">
          {/* Futuristic Header with Animated Background */}
          <div className="relative p-8 border-b border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-r from-blue-50/80 via-purple-50/40 to-indigo-50/80 dark:from-blue-950/20 dark:via-purple-950/10 dark:to-indigo-950/20 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-2xl animate-pulse"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-cyan-600/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-300"></div>
                  <div className="relative p-4 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
                    <Building2 className="h-8 w-8 text-white" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-black bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    Create New Company
                  </h2>
                  <div className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-blue-500" />
                    Set up a new company with services and user credentials
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      Live Setup
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 rounded-2xl transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 group"
              >
                <X className="h-6 w-6 text-gray-500 dark:text-gray-400 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-8 overflow-y-auto max-h-[calc(95vh-120px)]">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Company Information Section */}
              <div className="bg-gray-50/80 dark:bg-gray-700/30 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Company Information
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Company Name *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="Enter company name"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Company Prefix *
                      <span className="text-xs text-gray-500 ml-2">(for auto-generated codes)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Shield className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('company_prefix')}
                        type="text"
                        placeholder="ACME, TECH, COMP001"
                        maxLength={10}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 uppercase"
                        style={{ textTransform: 'uppercase' }}
                      />
                    </div>
                    {errors.company_prefix && (
                      <p className="text-red-500 text-sm mt-1">{errors.company_prefix.message}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Used for employee IDs (e.g., ACMEEMP001), invoices (ACMEINV001), etc.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Company Email *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="company@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('phone')}
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MapPin className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('address')}
                        type="text"
                        placeholder="Enter company address"
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
                      />
                    </div>
                    {errors.address && (
                      <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                    )}
                  </div>
                </div>
              </div>



              {/* Enhanced Services Selection Section */}
              <div className="bg-gradient-to-br from-gray-50/80 via-purple-50/20 to-indigo-50/30 dark:from-gray-700/30 dark:via-purple-900/10 dark:to-indigo-900/20 rounded-3xl p-8 border border-gray-200/50 dark:border-gray-600/50 relative overflow-hidden">
                {/* Background Animation */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-purple-400/10 to-indigo-600/10 rounded-full blur-3xl animate-pulse delay-300"></div>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-300"></div>
                        <div className="relative p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
                          <Star className="h-6 w-6 text-white" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <Zap className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-400 dark:via-indigo-400 dark:to-blue-400 bg-clip-text text-transparent">
                          Select Services
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Choose the services your company needs</p>
                      </div>
                    </div>
                    {selectedServices.length > 0 && (
                      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl px-6 py-4 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 shadow-xl shadow-purple-500/20">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                            <Calculator className="h-4 w-4 text-white" />
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                            </p>
                            <p className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent">
                              ${calculateTotalPrice().toFixed(2)}/month
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {errors.services && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {errors.services.message}
                    </p>
                  </div>
                )}

                <div className="relative z-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {servicesLoading ? (
                      <div className="col-span-full text-center py-16">
                        <div className="relative mx-auto mb-6">
                          <div className="h-20 w-20 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-3xl flex items-center justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 dark:border-purple-700 border-t-purple-600 dark:border-t-purple-400"></div>
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-bounce"></div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Loading services...</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                          Please wait while we fetch available services.
                        </p>
                      </div>
                    ) : Array.isArray(services) && services.length > 0 ? services.map((service) => (
                      <div
                        key={service.id}
                        className={`group relative p-6 rounded-3xl cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:scale-105 overflow-hidden ${
                          selectedServices.includes(service.id)
                            ? 'bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-purple-900/30 dark:via-indigo-900/20 dark:to-blue-900/20 border-2 border-purple-500 shadow-2xl shadow-purple-500/30'
                            : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl border-2 border-gray-200/50 dark:border-gray-600/50 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-2xl hover:shadow-purple-500/20'
                        }`}
                        onClick={() => handleServiceToggle(service.id)}
                      >
                        {/* Service Card Background Animation */}
                        {selectedServices.includes(service.id) && (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-blue-500/5 animate-pulse"></div>
                        )}

                        <div className="relative z-10">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-xl transition-all duration-300 ${
                                  selectedServices.includes(service.id)
                                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg'
                                    : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30'
                                }`}>
                                  <Star className={`h-4 w-4 transition-colors ${
                                    selectedServices.includes(service.id)
                                      ? 'text-white'
                                      : 'text-gray-500 dark:text-gray-400 group-hover:text-purple-600'
                                  }`} />
                                </div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                                  {service.name}
                                </h4>
                              </div>
                              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                                selectedServices.includes(service.id)
                                  ? 'bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-700 dark:text-purple-300 shadow-lg'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20'
                              }`}>
                                {service.service_type}
                              </div>
                            </div>
                            <div className={`relative w-8 h-8 rounded-xl border-2 transition-all duration-300 ${
                              selectedServices.includes(service.id)
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-500 shadow-lg shadow-purple-500/30'
                                : 'border-gray-300 dark:border-gray-600 group-hover:border-purple-400 group-hover:shadow-lg'
                            }`}>
                              {selectedServices.includes(service.id) && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-white animate-bounce" />
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 leading-relaxed">
                            {service.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-baseline gap-1">
                              <span className={`text-3xl font-black transition-colors ${
                                selectedServices.includes(service.id)
                                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-400 dark:to-indigo-400 bg-clip-text text-transparent'
                                  : 'text-purple-600 dark:text-purple-400'
                              }`}>
                                ${service.base_price}
                              </span>
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">/month</span>
                            </div>
                            {service.features && service.features.length > 0 && (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                                selectedServices.includes(service.id)
                                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                              }`}>
                                <Zap className="h-3 w-3" />
                                {service.features.length} features
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full text-center py-16">
                        <div className="relative mx-auto mb-6">
                          <div className="h-20 w-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-3xl flex items-center justify-center shadow-xl">
                            <Building2 className="h-10 w-10 text-gray-400" />
                          </div>
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center">
                            <X className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No services available</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                          Please try refreshing the page or contact support.
                        </p>
                        {process.env.NODE_ENV === 'development' && (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
                            <Zap className="h-3 w-3" />
                            Debug: Services = {services ? `Array(${services.length})` : 'null/undefined'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User Credentials Section - After Service Selection */}
              {selectedServices.length > 0 && (
                <div className="bg-gradient-to-br from-green-50/80 via-emerald-50/40 to-teal-50/30 dark:from-green-900/30 dark:via-emerald-900/10 dark:to-teal-900/20 rounded-3xl p-8 border border-green-200/50 dark:border-green-600/50 relative overflow-hidden">
                  {/* Background Animation */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-green-400/10 to-teal-600/10 rounded-full blur-3xl animate-pulse delay-300"></div>
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-300"></div>
                        <div className="relative p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-lg">
                          <Key className="h-6 w-6 text-white" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                            <Zap className="h-2.5 w-2.5 text-white" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 dark:from-green-400 dark:via-emerald-400 dark:to-teal-400 bg-clip-text text-transparent">
                          Company User Credentials
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Create login credentials for the company administrator</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Company Admin Email *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            {...register('user_email')}
                            type="email"
                            placeholder="admin@company.com"
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
                          />
                        </div>
                        {errors.user_email && (
                          <p className="text-red-500 text-sm mt-1">{errors.user_email.message}</p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          This will be the main admin account for the company
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Admin Password *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Key className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            {...register('user_password')}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter secure password"
                            className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all duration-200"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        {errors.user_password && (
                          <p className="text-red-500 text-sm mt-1">{errors.user_password.message}</p>
                        )}
                        <button
                          type="button"
                          onClick={handleGeneratePassword}
                          disabled={passwordGenerated}
                          className={`mt-3 w-full px-6 py-3 text-sm font-bold rounded-2xl shadow-xl transition-all duration-500 flex items-center justify-center gap-3 relative overflow-hidden group ${
                            passwordGenerated
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white cursor-not-allowed shadow-green-500/30'
                              : 'bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 hover:from-green-700 hover:via-teal-700 hover:to-cyan-700 text-white shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/50 hover:-translate-y-1 hover:scale-105'
                          }`}
                        >
                          {/* Button Background Animation */}
                          {!passwordGenerated && (
                            <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          )}

                          <div className="relative z-10 flex items-center gap-3">
                            {passwordGenerated ? (
                              <>
                                <div className="p-1 bg-white/20 rounded-lg">
                                  <Check className="h-4 w-4 animate-bounce" />
                                </div>
                                <span>Password Generated</span>
                                <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                              </>
                            ) : (
                              <>
                                <div className="p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                                  <Key className="h-4 w-4" />
                                </div>
                                <span>Generate Secure Password</span>
                                <Zap className="h-4 w-4 group-hover:scale-110 transition-transform" />
                              </>
                            )}
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-6 pt-10 border-t border-gray-200/50 dark:border-gray-700/50">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={createCompanyMutation.isPending}
                  className="px-8 py-4 bg-gray-100/80 hover:bg-gray-200/80 dark:bg-gray-700/80 dark:hover:bg-gray-600/80 backdrop-blur-xl text-gray-700 dark:text-gray-300 font-semibold rounded-2xl border border-gray-200/50 dark:border-gray-600/50 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 group"
                >
                  <span className="flex items-center gap-2">
                    <X className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    Cancel
                  </span>
                </button>
                <button
                  type="submit"
                  disabled={createCompanyMutation.isPending || selectedServices.length === 0}
                  className="relative px-10 py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl shadow-2xl shadow-purple-500/30 hover:shadow-3xl hover:shadow-purple-500/50 transition-all duration-500 hover:-translate-y-1 hover:scale-105 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:shadow-2xl flex items-center justify-center gap-3 min-w-[200px] overflow-hidden group"
                >
                  {/* Button Background Animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="relative z-10 flex items-center gap-3">
                    {createCompanyMutation.isPending ? (
                      <>
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="font-bold">Creating Company...</span>
                      </>
                    ) : (
                      <>
                        <div className="p-1 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                          <Rocket className="h-5 w-5" />
                        </div>
                        <span className="font-bold">Create Company</span>
                        <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
    </Modal>
  )
}

export default CreateCompanyModal
