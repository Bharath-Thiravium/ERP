import React, { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Upload, Camera, User, Mail, Phone, MapPin, Calendar, Building, CreditCard, Save, AlertCircle, Sparkles, Zap, Shield } from 'lucide-react'
import { apiClient } from '../../../../../lib/api'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import toast from 'react-hot-toast'

const employeeSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  phone: z.string().min(1, 'Phone is required').regex(/^\d{10}$/, 'Phone must be 10 digits'),
  gender: z.enum(['M', 'F', 'O']),
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  address_line1: z.string().min(1, 'Address is required').max(200, 'Address too long'),
  address_line2: z.string().max(200, 'Address too long').optional(),
  city: z.string().min(1, 'City is required').max(50, 'City name too long'),
  state: z.string().min(1, 'State is required').max(50, 'State name too long'),
  pincode: z.string().min(1, 'Pincode is required').regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  country: z.string().min(1, 'Country is required'),
  department: z.number().min(1, 'Department is required'),
  designation: z.number().min(1, 'Designation is required'),
  join_date: z.string().min(1, 'Join date is required'),
  aadhar_number: z.string().min(1, 'Aadhar number is required').regex(/^\d{12}$/, 'Aadhar must be 12 digits'),
  pan_number: z.string().min(1, 'PAN number is required').regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  bank_name: z.string().min(1, 'Bank name is required').max(100, 'Bank name too long'),
  bank_account_number: z.string().min(1, 'Account number is required'),
  bank_ifsc_code: z.string().min(1, 'IFSC code is required').regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC format'),
  bank_branch: z.string().max(100, 'Branch name too long').optional(),
  status: z.enum(['active', 'inactive', 'terminated'])
})

type EmployeeFormData = z.infer<typeof employeeSchema>

interface EmployeeFormProps {
  employee?: any
  onClose: () => void
  onSuccess: () => void
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onClose, onSuccess }) => {
  const { sessionKey } = useServiceUserStore()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      first_name: employee?.first_name || '',
      last_name: employee?.last_name || '',
      email: employee?.email || '',
      phone: employee?.phone || '',
      gender: employee?.gender || 'M',
      date_of_birth: employee?.date_of_birth || '',
      address_line1: employee?.address_line1 || '',
      address_line2: employee?.address_line2 || '',
      city: employee?.city || '',
      state: employee?.state || '',
      pincode: employee?.pincode || '',
      country: employee?.country || 'India',
      department: employee?.department || 0,
      designation: employee?.designation || 0,
      join_date: employee?.join_date || '',
      aadhar_number: employee?.aadhar_number || '',
      pan_number: employee?.pan_number || '',
      bank_name: employee?.bank_name || '',
      bank_account_number: employee?.bank_account_number || '',
      bank_ifsc_code: employee?.bank_ifsc_code || '',
      bank_branch: employee?.bank_branch || '',
      status: employee?.status || 'active'
    }
  })

  const [departments, setDepartments] = useState<any[]>([])
  const [designations, setDesignations] = useState<any[]>([])
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')
  const [currentStep, setCurrentStep] = useState(1)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const steps = [
    { id: 1, title: 'Personal Info', icon: User },
    { id: 2, title: 'Address', icon: MapPin },
    { id: 3, title: 'Employment', icon: Building },
    { id: 4, title: 'Documents', icon: Shield },
    { id: 5, title: 'Banking', icon: CreditCard }
  ]

  useEffect(() => {
    fetchDepartments()
    fetchDesignations()
  }, [])

  const fetchDepartments = async () => {
    try {
      const response = await apiClient.get(`/api/hr/departments/?session_key=${sessionKey}`)
      setDepartments(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    }
  }

  const fetchDesignations = async () => {
    try {
      const response = await apiClient.get(`/api/hr/designations/?session_key=${sessionKey}`)
      setDesignations(response.data.results || response.data)
    } catch (error) {
      console.error('Failed to fetch designations:', error)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo size should be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      setPhoto(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      const submitData = {
        ...data,
        session_key: sessionKey,
        employee_id: employee?.employee_id || `EMP${Date.now()}`,
        pan_number: data.pan_number.toUpperCase(),
        bank_ifsc_code: data.bank_ifsc_code.toUpperCase()
      }

      if (employee?.id) {
        await apiClient.put(`/api/hr/employees/${employee.id}/?session_key=${sessionKey}`, submitData)
        toast.success('Employee updated successfully! 🎉')
      } else {
        await apiClient.post(`/api/hr/employees/?session_key=${sessionKey}`, submitData)
        toast.success('Employee created successfully! 🚀')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save employee')
    }
  }

  const renderField = (
    name: keyof EmployeeFormData,
    label: string,
    type: string = 'text',
    icon?: React.ReactNode,
    options?: { value: string | number; label: string }[],
    placeholder?: string
  ) => (
    <div className="group relative">
      <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        {icon}
        {label}
        {['first_name', 'last_name', 'email', 'phone', 'department', 'designation'].includes(name) && 
          <span className="text-red-500 animate-pulse">*</span>
        }
      </label>
      <div className="relative">
        {options ? (
          <select
            {...register(name, { valueAsNumber: typeof options[0]?.value === 'number' })}
            className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 hover:shadow-lg ${
              errors[name] ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <option value="">Select {label}</option>
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type}
            {...register(name)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 bg-white/80 backdrop-blur-sm border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 hover:shadow-lg ${
              errors[name] ? 'border-red-400 bg-red-50/50' : 'border-gray-200 hover:border-blue-300'
            }`}
          />
        )}
        {errors[name] && (
          <div className="absolute -bottom-6 left-0 flex items-center text-red-500 text-xs animate-bounce">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errors[name]?.message}
          </div>
        )}
      </div>
    </div>
  )

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-center mb-8">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full p-3 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('first_name', 'First Name', 'text', <User className="w-4 h-4 text-blue-500" />, undefined, 'Enter first name')}
              {renderField('last_name', 'Last Name', 'text', <User className="w-4 h-4 text-blue-500" />, undefined, 'Enter last name')}
              {renderField('email', 'Email Address', 'email', <Mail className="w-4 h-4 text-green-500" />, undefined, 'Enter email address')}
              {renderField('phone', 'Phone Number', 'tel', <Phone className="w-4 h-4 text-orange-500" />, undefined, 'Enter 10-digit phone number')}
              {renderField('gender', 'Gender', 'select', <User className="w-4 h-4 text-purple-500" />, [
                { value: 'M', label: 'Male' },
                { value: 'F', label: 'Female' },
                { value: 'O', label: 'Other' }
              ])}
              {renderField('date_of_birth', 'Date of Birth', 'date', <Calendar className="w-4 h-4 text-pink-500" />)}
            </div>
          </div>
        )
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {renderField('address_line1', 'Address Line 1', 'text', <MapPin className="w-4 h-4 text-red-500" />, undefined, 'Enter street address')}
              {renderField('address_line2', 'Address Line 2', 'text', <MapPin className="w-4 h-4 text-red-400" />, undefined, 'Enter apartment, suite, etc. (optional)')}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderField('city', 'City', 'text', <MapPin className="w-4 h-4 text-blue-500" />, undefined, 'Enter city')}
                {renderField('state', 'State', 'text', <MapPin className="w-4 h-4 text-green-500" />, undefined, 'Enter state')}
                {renderField('pincode', 'Pincode', 'text', <MapPin className="w-4 h-4 text-purple-500" />, undefined, 'Enter 6-digit pincode')}
              </div>
              {renderField('country', 'Country', 'text', <MapPin className="w-4 h-4 text-orange-500" />, undefined, 'Enter country')}
            </div>
          </div>
        )
      case 3:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('department', 'Department', 'select', <Building className="w-4 h-4 text-blue-500" />, 
                departments.map(d => ({ value: d.id, label: d.name })))}
              {renderField('designation', 'Designation', 'select', <Building className="w-4 h-4 text-purple-500" />, 
                designations.map(d => ({ value: d.id, label: d.title })))}
              {renderField('join_date', 'Join Date', 'date', <Calendar className="w-4 h-4 text-green-500" />)}
              {renderField('status', 'Employment Status', 'select', <Zap className="w-4 h-4 text-yellow-500" />, [
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'terminated', label: 'Terminated' }
              ])}
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('aadhar_number', 'Aadhar Number', 'text', <Shield className="w-4 h-4 text-red-500" />, undefined, 'Enter 12-digit Aadhar number')}
              {renderField('pan_number', 'PAN Number', 'text', <Shield className="w-4 h-4 text-blue-500" />, undefined, 'Enter PAN number (e.g., ABCDE1234F)')}
            </div>
          </div>
        )
      case 5:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderField('bank_name', 'Bank Name', 'text', <Building className="w-4 h-4 text-green-500" />, undefined, 'Enter bank name')}
              {renderField('bank_account_number', 'Account Number', 'text', <CreditCard className="w-4 h-4 text-blue-500" />, undefined, 'Enter account number')}
              {renderField('bank_ifsc_code', 'IFSC Code', 'text', <CreditCard className="w-4 h-4 text-purple-500" />, undefined, 'Enter IFSC code')}
              {renderField('bank_branch', 'Branch Name', 'text', <Building className="w-4 h-4 text-orange-500" />, undefined, 'Enter branch name (optional)')}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 via-purple-600/80 to-pink-600/80"></div>
          <div className="relative flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">
                  {employee ? 'Edit Employee' : 'Add New Employee'}
                </h2>
                <p className="text-white/80">Step {currentStep} of {steps.length}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-110"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                    isActive ? 'bg-blue-500 text-white shadow-lg scale-105' :
                    isCompleted ? 'bg-green-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:block">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 transition-all duration-300 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="min-h-[400px]">
            {renderStep()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
              className="px-6 py-3 text-gray-600 border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              Previous
            </button>

            <div className="flex gap-3">
              {currentStep < steps.length ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(steps.length, currentStep + 1))}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg flex items-center gap-2"
                >
                  Next
                  <Zap className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {employee ? 'Update Employee' : 'Create Employee'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmployeeForm