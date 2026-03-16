import React, { useState, useEffect, useRef } from 'react'
import { X, Save, User, Building, Phone, MapPin, CreditCard, Camera, Upload, Eye } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Employee, Department, Designation, EmployeeFormData } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

// import { z } from 'zod'

// Unused schema - validation is done manually
// const employeeSchema = z.object({
//   first_name: z.string().min(1, 'First name is required'),
//   last_name: z.string().min(1, 'Last name is required'),
//   email: z.string().email('Invalid email format'),
//   phone: z.string().min(1, 'Phone number is required').regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
//   department: z.number().min(1, 'Department is required'),
//   designation: z.number().min(1, 'Designation is required'),
//   date_of_joining: z.string().min(1, 'Joining date is required'),
//   base_salary: z.number().min(1, 'Valid salary is required')
// })

interface EmployeeFormProps {
  employee?: Employee
  onClose: () => void
  onSave: (employee: Employee) => void
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ employee, onClose, onSave }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [designations, setDesignations] = useState<Designation[]>([])

  
  const [formData, setFormData] = useState<EmployeeFormData>({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    date_of_birth: employee?.date_of_birth || '',
    gender: employee?.gender || '',
    department: employee?.department || 0,
    designation: employee?.designation || 0,
    employment_type: employee?.employment_type || 'full_time',
    work_mode: employee?.work_mode || 'office',
    date_of_joining: employee?.date_of_joining || '',

    base_salary: employee?.base_salary || 0,
    address_line1: employee?.address_line1 || '',
    address_line2: employee?.address_line2 || '',
    city: employee?.city || '',
    state: employee?.state || '',
    pincode: employee?.pincode || '',
    country: employee?.country || 'India',
    aadhar_number: employee?.aadhar_number || '',
    pan_number: employee?.pan_number || '',
    pf_number: employee?.pf_number || '',
    uan_number: employee?.uan_number || '',
    esi_number: employee?.esi_number || '',
    bank_name: employee?.bank_name || '',
    bank_account_number: employee?.bank_account_number || '',
    bank_ifsc_code: employee?.bank_ifsc_code || '',
    bank_branch: employee?.bank_branch || '',
    emergency_contact_name: employee?.emergency_contact_name || '',
    emergency_contact_relationship: employee?.emergency_contact_relationship || '',
    emergency_contact_phone: employee?.emergency_contact_phone || '',
    emergency_contact_address: employee?.emergency_contact_address || '',
    skills: Array.isArray(employee?.skills) ? employee.skills : [],
    profile_picture: undefined,
    face_photo: undefined,
    capture_face_photo: false,
    
    // Form XIII Required Fields
    father_husband_name: employee?.father_husband_name || '',
    nature_of_employment: employee?.nature_of_employment || '',
    employee_signature: undefined,
    termination_reason: employee?.termination_reason || '',
    employee_remarks: employee?.employee_remarks || '',
    permanent_address_line1: employee?.permanent_address_line1 || employee?.address_line1 || '',
    permanent_address_line2: employee?.permanent_address_line2 || employee?.address_line2 || '',
    permanent_city: employee?.permanent_city || employee?.city || '',
    permanent_state: employee?.permanent_state || employee?.state || '',
    permanent_pincode: employee?.permanent_pincode || employee?.pincode || '',
    permanent_country: employee?.permanent_country || employee?.country || 'India',
    local_address_line1: employee?.local_address_line1 || '',
    local_address_line2: employee?.local_address_line2 || '',
    local_city: employee?.local_city || '',
    local_state: employee?.local_state || '',
    local_pincode: employee?.local_pincode || '',
    local_country: employee?.local_country || 'India'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [profilePreview, setProfilePreview] = useState<string | null>(null)
  const [facePreview, setFacePreview] = useState<string | null>(null)
  const [skillsText, setSkillsText] = useState<string>('')
  
  // Update form data and previews when employee changes
  useEffect(() => {
    if (employee) {
      // Update form data with employee data
      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        date_of_birth: employee.date_of_birth || '',
        gender: employee.gender || '',
        department: employee.department || 0,
        designation: employee.designation || 0,
        employment_type: employee.employment_type || 'full_time',
        work_mode: employee.work_mode || 'office',
        date_of_joining: employee.date_of_joining || '',
        base_salary: employee.base_salary || 0,
        address_line1: employee.address_line1 || '',
        address_line2: employee.address_line2 || '',
        city: employee.city || '',
        state: employee.state || '',
        pincode: employee.pincode || '',
        country: employee.country || 'India',
        aadhar_number: employee.aadhar_number || '',
        pan_number: employee.pan_number || '',
        pf_number: employee.pf_number || '',
        uan_number: employee.uan_number || '',
        esi_number: employee.esi_number || '',
        bank_name: employee.bank_name || '',
        bank_account_number: employee.bank_account_number || '',
        bank_ifsc_code: employee.bank_ifsc_code || '',
        bank_branch: employee.bank_branch || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_relationship: employee.emergency_contact_relationship || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
        emergency_contact_address: employee.emergency_contact_address || '',
        skills: Array.isArray(employee.skills) ? employee.skills : [],
        profile_picture: undefined,
        face_photo: undefined,
        capture_face_photo: false,
        
        // Form XIII Required Fields
        father_husband_name: employee.father_husband_name || '',
        nature_of_employment: employee.nature_of_employment || '',
        employee_signature: undefined,
        termination_reason: employee.termination_reason || '',
        employee_remarks: employee.employee_remarks || '',
        permanent_address_line1: employee.permanent_address_line1 || employee.address_line1 || '',
        permanent_address_line2: employee.permanent_address_line2 || employee.address_line2 || '',
        permanent_city: employee.permanent_city || employee.city || '',
        permanent_state: employee.permanent_state || employee.state || '',
        permanent_pincode: employee.permanent_pincode || employee.pincode || '',
        permanent_country: employee.permanent_country || employee.country || 'India',
        local_address_line1: employee.local_address_line1 || '',
        local_address_line2: employee.local_address_line2 || '',
        local_city: employee.local_city || '',
        local_state: employee.local_state || '',
        local_pincode: employee.local_pincode || '',
        local_country: employee.local_country || 'India'
      })
      
      // Construct URLs only if images exist and are not null/empty
      let profileUrl = null
      let faceUrl = null
      
      if (employee.profile_picture && 
          employee.profile_picture !== null && 
          employee.profile_picture !== '' && 
          typeof employee.profile_picture === 'string' &&
          !employee.profile_picture.includes('svg')) {
        profileUrl = employee.profile_picture.startsWith('http') 
          ? employee.profile_picture 
          : `http://localhost:8000${employee.profile_picture}`
      }
      
      if (employee.face_photo && 
          employee.face_photo !== null && 
          employee.face_photo !== '' && 
          typeof employee.face_photo === 'string' &&
          !employee.face_photo.includes('svg')) {
        faceUrl = employee.face_photo.startsWith('http') 
          ? employee.face_photo 
          : `http://localhost:8000${employee.face_photo}`
      }
      
      setProfilePreview(profileUrl)
      setFacePreview(faceUrl)
      
      // Set skills text
      setSkillsText(Array.isArray(employee.skills) ? employee.skills.join(', ') : '')
    } else {
      // Reset form for new employee creation
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        date_of_birth: '',
        gender: '',
        department: 0,
        designation: 0,
        employment_type: 'full_time',
        work_mode: 'office',
        date_of_joining: '',
        base_salary: 0,
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        aadhar_number: '',
        pan_number: '',
        pf_number: '',
        uan_number: '',
        esi_number: '',
        bank_name: '',
        bank_account_number: '',
        bank_ifsc_code: '',
        bank_branch: '',
        emergency_contact_name: '',
        emergency_contact_relationship: '',
        emergency_contact_phone: '',
        emergency_contact_address: '',
        skills: [],
        profile_picture: undefined,
        face_photo: undefined,
        capture_face_photo: false,
        father_husband_name: '',
        nature_of_employment: '',
        employee_signature: undefined,
        termination_reason: '',
        employee_remarks: '',
        permanent_address_line1: '',
        permanent_address_line2: '',
        permanent_city: '',
        permanent_state: '',
        permanent_pincode: '',
        permanent_country: 'India',
        local_address_line1: '',
        local_address_line2: '',
        local_city: '',
        local_state: '',
        local_pincode: '',
        local_country: 'India'
      })
      setProfilePreview(null)
      setFacePreview(null)
      setSkillsText('')
      setErrors({})
    }
  }, [employee])
  const [showCamera, setShowCamera] = useState(false)
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const faceFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    console.log('Session key changed:', sessionKey)
    if (sessionKey) {
      fetchDropdownData()
    }
  }, [sessionKey])

  useEffect(() => {
    if (formData.department) {
      fetchDesignations(formData.department)
    }
  }, [formData.department])

  const fetchDropdownData = async () => {
    if (!sessionKey) return

    setLoadingDropdowns(true)
    try {
      console.log('Fetching dropdown data with session key:', sessionKey)
      const [deptResponse] = await Promise.all([
        api.get('/api/hr/dropdown/departments/', {
          headers: { Authorization: `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        }),

      ])

      console.log('Departments response:', deptResponse.data)
      
      setDepartments(Array.isArray(deptResponse.data) ? deptResponse.data : [])
    } catch (error) {
      console.error('Error fetching dropdown data:', error)
      console.error('Error details:', (error as any).response?.data)
      toast.error('Failed to load form data')
    } finally {
      setLoadingDropdowns(false)
    }
  }

  const fetchDesignations = async (departmentId: number) => {
    if (!sessionKey) return

    try {
      console.log('Fetching designations for department:', departmentId)
      const response = await api.get('/api/hr/dropdown/designations/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { department_id: departmentId, session_key: sessionKey }
      })
      console.log('Designations response:', response.data)
      setDesignations(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Error fetching designations:', error)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Basic required fields
    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    if (!formData.phone?.trim()) newErrors.phone = 'Phone number is required'
    if (!formData.gender?.trim()) newErrors.gender = 'Gender is required'
    if (!formData.department) newErrors.department = 'Department is required'
    if (!formData.designation) newErrors.designation = 'Designation is required'
    if (!formData.date_of_joining) newErrors.date_of_joining = 'Joining date is required'
    if (!formData.base_salary || formData.base_salary <= 0) newErrors.base_salary = 'Valid salary is required'

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    // Phone validation
    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone number must be exactly 10 digits'
    }

    // Optional field validations
    if (formData.pan_number && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
      newErrors.pan_number = 'Invalid PAN format (e.g., ABCDE1234F)'
    }

    if (formData.aadhar_number && !/^\d{12}$/.test(formData.aadhar_number)) {
      newErrors.aadhar_number = 'Aadhar number must be 12 digits'
    }

    if (formData.uan_number && !/^\d{12}$/.test(formData.uan_number)) {
      newErrors.uan_number = 'UAN number must be 12 digits'
    }

    if (formData.esi_number && !/^\d{17}$/.test(formData.esi_number)) {
      newErrors.esi_number = 'ESI number must be 17 digits'
    }

    if (formData.bank_ifsc_code && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.bank_ifsc_code)) {
      newErrors.bank_ifsc_code = 'Invalid IFSC code format'
    }

    if (formData.emergency_contact_phone && !/^\d{10}$/.test(formData.emergency_contact_phone)) {
      newErrors.emergency_contact_phone = 'Emergency contact phone must be 10 digits'
    }

    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = 'PIN code must be 6 digits'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('Please fix the form errors')
      return
    }

    setLoading(true)
    try {
      const url = employee 
        ? `/api/hr/employees/${employee.id}/`
        : '/api/hr/employees/'
      
      const method = employee ? 'put' : 'post'
      
      // Create FormData for file uploads
      const submitData = new FormData()
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'skills') {
          // Send skills as JSON array
          const skillsArray = Array.isArray(value) ? value : []
          submitData.append(key, JSON.stringify(skillsArray))
        } else if (key === 'profile_picture' || key === 'face_photo' || key === 'employee_signature') {
          if (value instanceof File) {
            submitData.append(key, value)
          }
        } else if (key !== 'capture_face_photo' && value !== undefined && value !== '') {
          submitData.append(key, value.toString())
        }
      })
      submitData.append('session_key', sessionKey || '')
      
      const response = await api[method](url, submitData, {
        headers: { 
          Authorization: `Bearer ${sessionKey}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      toast.success(employee ? 'Employee updated successfully' : 'Employee created successfully')
      onSave(response.data)
      onClose()
    } catch (error: any) {
      console.error('Error saving employee:', error)
      if (error.response?.data) {
        const serverErrors = error.response.data
        if (typeof serverErrors === 'object') {
          setErrors(serverErrors)
        }
        toast.error(serverErrors.message || 'Failed to save employee')
      } else {
        toast.error('Failed to save employee')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSkillsChange = (text: string) => {
    setSkillsText(text)
    // Update skills array when text changes
    const skillsArray = text.split(',').map(skill => skill.trim()).filter(skill => skill)
    handleInputChange('skills', skillsArray)
  }

  // Image handling functions
  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      handleInputChange('profile_picture', file)
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfilePreview(event.target.result as string)
        }
      }
      reader.onerror = () => {
        toast.error('Error reading image file')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFaceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file')
        return
      }
      handleInputChange('face_photo', file)
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setFacePreview(event.target.result as string)
        }
      }
      reader.onerror = () => {
        toast.error('Error reading image file')
      }
      reader.readAsDataURL(file)
    }
  }

  const startCamera = async () => {
    console.log('Starting camera...')
    
    try {
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera not supported')
        toast.error('Camera not supported in this browser')
        return
      }

      console.log('Requesting camera access...')
      
      // Show camera modal first
      setShowCamera(true)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user' 
        },
        audio: false
      })
      
      console.log('Camera access granted, stream:', stream)
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Wait for video to load and play
        videoRef.current.onloadedmetadata = () => {
          console.log('Video metadata loaded')
          videoRef.current?.play().then(() => {
            console.log('Video playing successfully')
          }).catch(err => {
            console.error('Error playing video:', err)
          })
        }
      }
    } catch (error: any) {
      console.error('Error accessing camera:', error)
      setShowCamera(false) // Hide modal on error
      
      let errorMessage = 'Unable to access camera. '
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.'
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Camera is being used by another application.'
      } else {
        errorMessage += 'Please check camera permissions.'
      }
      
      toast.error(errorMessage)
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setShowCamera(false)
  }

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      
      // Set canvas dimensions
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        // Flip the image horizontally to match the mirrored video
        ctx.scale(-1, 1)
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `face-photo-${Date.now()}.jpg`, { type: 'image/jpeg' })
            handleInputChange('face_photo', file)
            setFacePreview(canvas.toDataURL())
            stopCamera()
            toast.success('Face photo captured successfully!')
          } else {
            toast.error('Failed to capture photo. Please try again.')
          }
        }, 'image/jpeg', 0.9)
      }
    } else {
      toast.error('Camera not ready. Please try again.')
    }
  }

  useEffect(() => {
    return () => {
      stopCamera() // Cleanup camera on unmount
    }
  }, [])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Profile Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Camera className="h-5 w-5 text-indigo-500" />
                <span>Profile & Face Recognition Photos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Profile Picture */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Profile Picture
                  </label>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-gray-800">
                      {profilePreview ? (
                        <img src={profilePreview} alt="Profile" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <User className="h-12 w-12 text-gray-400" />
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                      {profilePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProfilePreview(null)
                            handleInputChange('profile_picture', undefined)
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Face Recognition Photo */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Face Recognition Photo
                    <span className="text-xs text-gray-500 block mt-1">For future attendance system</span>
                  </label>
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-32 h-32 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg flex items-center justify-center overflow-hidden bg-blue-50 dark:bg-blue-900/20">
                      {facePreview ? (
                        <img src={facePreview} alt="Face" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Eye className="h-12 w-12 text-blue-400" />
                      )}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startCamera}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-300"
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Capture
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => faceFileInputRef.current?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                      {facePreview && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFacePreview(null)
                            handleInputChange('face_photo', undefined)
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <input
                      ref={faceFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFaceImageChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Camera Modal */}
              {showCamera && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[var(--z-modal)]">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
                    <div className="text-center space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Capture Face Photo
                      </h3>
                      <div className="relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-64 object-cover rounded-lg"
                          style={{ transform: 'scaleX(-1)' }}
                        />
                        <canvas ref={canvasRef} className="hidden" />
                      </div>
                      <div className="flex justify-center space-x-4">
                        <Button
                          type="button"
                          onClick={capturePhoto}
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Capture
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={stopCamera}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-blue-500" />
                <span>Personal Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => handleInputChange('date_of_birth', e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  min={new Date(new Date().setFullYear(new Date().getFullYear() - 65)).toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.date_of_birth ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => handleInputChange('gender', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Father's/Husband's Name
                  <span className="text-xs text-gray-500 block mt-1">Required for Form XIII compliance</span>
                </label>
                <input
                  type="text"
                  value={formData.father_husband_name}
                  onChange={(e) => handleInputChange('father_husband_name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nature of Employment
                  <span className="text-xs text-gray-500 block mt-1">Detailed work description</span>
                </label>
                <input
                  type="text"
                  value={formData.nature_of_employment}
                  onChange={(e) => handleInputChange('nature_of_employment', e.target.value)}
                  placeholder="e.g., Software Development, Data Analysis, etc."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Employment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-green-500" />
                <span>Employment Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', parseInt(e.target.value))}
                  disabled={loadingDropdowns}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.department ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">{loadingDropdowns ? 'Loading departments...' : 'Select Department'}</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Designation *
                </label>
                <select
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.designation ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  disabled={!formData.department}
                >
                  <option value="">Select Designation</option>
                  {designations.map(desig => (
                    <option key={desig.id} value={desig.id}>{desig.title}</option>
                  ))}
                </select>
                {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employment Type
                </label>
                <select
                  value={formData.employment_type}
                  onChange={(e) => handleInputChange('employment_type', e.target.value)}
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
                  onChange={(e) => handleInputChange('work_mode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="office">Office</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Joining *
                </label>
                <input
                  type="date"
                  value={formData.date_of_joining}
                  onChange={(e) => handleInputChange('date_of_joining', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.date_of_joining ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.date_of_joining && <p className="text-red-500 text-xs mt-1">{errors.date_of_joining}</p>}
              </div>



              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Base Salary (₹) *
                </label>
                <input
                  type="number"
                  value={formData.base_salary}
                  onChange={(e) => handleInputChange('base_salary', parseFloat(e.target.value) || 0)}
                  placeholder="50000"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.base_salary ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  min="0"
                  step="1000"
                />
                {errors.base_salary && <p className="text-red-500 text-xs mt-1">{errors.base_salary}</p>}
                <p className="text-xs text-gray-500 mt-1">Monthly salary in Indian Rupees</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Skills & Expertise (comma-separated)
                </label>
                <textarea
                  value={skillsText}
                  onChange={(e) => handleSkillsChange(e.target.value)}
                  placeholder="e.g., JavaScript, React, Node.js, Python, Project Management, Team Leadership"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple skills with commas</p>
                {formData.skills.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {formData.skills.map((skill, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-purple-500" />
                <span>Address Information</span>
                <span className="text-xs text-gray-500">(Form XIII Compliance)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Permanent Address */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Permanent Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={formData.permanent_address_line1}
                      onChange={(e) => handleInputChange('permanent_address_line1', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.permanent_address_line2}
                      onChange={(e) => handleInputChange('permanent_address_line2', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.permanent_city}
                      onChange={(e) => handleInputChange('permanent_city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.permanent_state}
                      onChange={(e) => handleInputChange('permanent_state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      value={formData.permanent_pincode}
                      onChange={(e) => handleInputChange('permanent_pincode', e.target.value.replace(/\D/g, ''))}
                      placeholder="400001"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.permanent_country}
                      onChange={(e) => handleInputChange('permanent_country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Local Address */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900 dark:text-white">Local/Current Address</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        local_address_line1: prev.permanent_address_line1,
                        local_address_line2: prev.permanent_address_line2,
                        local_city: prev.permanent_city,
                        local_state: prev.permanent_state,
                        local_pincode: prev.permanent_pincode,
                        local_country: prev.permanent_country
                      }))
                    }}
                  >
                    Copy from Permanent
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      value={formData.local_address_line1}
                      onChange={(e) => handleInputChange('local_address_line1', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      value={formData.local_address_line2}
                      onChange={(e) => handleInputChange('local_address_line2', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.local_city}
                      onChange={(e) => handleInputChange('local_city', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.local_state}
                      onChange={(e) => handleInputChange('local_state', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      value={formData.local_pincode}
                      onChange={(e) => handleInputChange('local_pincode', e.target.value.replace(/\D/g, ''))}
                      placeholder="400001"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={formData.local_country}
                      onChange={(e) => handleInputChange('local_country', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Legacy Address Fields (Hidden but maintained for backward compatibility) */}
              <div className="hidden">
                <input type="hidden" value={formData.address_line1} onChange={(e) => handleInputChange('address_line1', e.target.value)} />
                <input type="hidden" value={formData.address_line2} onChange={(e) => handleInputChange('address_line2', e.target.value)} />
                <input type="hidden" value={formData.city} onChange={(e) => handleInputChange('city', e.target.value)} />
                <input type="hidden" value={formData.state} onChange={(e) => handleInputChange('state', e.target.value)} />
                <input type="hidden" value={formData.pincode} onChange={(e) => handleInputChange('pincode', e.target.value)} />
                <input type="hidden" value={formData.country} onChange={(e) => handleInputChange('country', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          {/* Government IDs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-orange-500" />
                <span>Government IDs & Statutory Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={formData.pan_number}
                  onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.pan_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.pan_number && <p className="text-red-500 text-xs mt-1">{errors.pan_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Aadhar Number
                </label>
                <input
                  type="text"
                  value={formData.aadhar_number}
                  onChange={(e) => handleInputChange('aadhar_number', e.target.value.replace(/\D/g, ''))}
                  placeholder="123456789012"
                  maxLength={12}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.aadhar_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.aadhar_number && <p className="text-red-500 text-xs mt-1">{errors.aadhar_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  PF Number
                </label>
                <input
                  type="text"
                  value={formData.pf_number}
                  onChange={(e) => handleInputChange('pf_number', e.target.value.toUpperCase())}
                  placeholder="KN/BLR/12345/000/1234567"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  UAN Number *
                </label>
                <input
                  type="text"
                  value={formData.uan_number}
                  onChange={(e) => handleInputChange('uan_number', e.target.value.replace(/\D/g, ''))}
                  placeholder="123456789012"
                  maxLength={12}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.uan_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.uan_number && <p className="text-red-500 text-xs mt-1">{errors.uan_number}</p>}
                <p className="text-xs text-gray-500 mt-1">Universal Account Number for PF</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ESI Number
                </label>
                <input
                  type="text"
                  value={formData.esi_number}
                  onChange={(e) => handleInputChange('esi_number', e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678901234567"
                  maxLength={17}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.esi_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.esi_number && <p className="text-red-500 text-xs mt-1">{errors.esi_number}</p>}
                <p className="text-xs text-gray-500 mt-1">Employee State Insurance Number</p>
              </div>
            </CardContent>
          </Card>

          {/* Banking Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-green-500" />
                <span>Banking Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bank Name *
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  placeholder="State Bank of India"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.bank_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.bank_name && <p className="text-red-500 text-xs mt-1">{errors.bank_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Number *
                </label>
                <input
                  type="text"
                  value={formData.bank_account_number}
                  onChange={(e) => handleInputChange('bank_account_number', e.target.value.replace(/\D/g, ''))}
                  placeholder="12345678901234"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.bank_account_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.bank_account_number && <p className="text-red-500 text-xs mt-1">{errors.bank_account_number}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  IFSC Code *
                </label>
                <input
                  type="text"
                  value={formData.bank_ifsc_code}
                  onChange={(e) => handleInputChange('bank_ifsc_code', e.target.value.toUpperCase())}
                  placeholder="SBIN0001234"
                  maxLength={11}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.bank_ifsc_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.bank_ifsc_code && <p className="text-red-500 text-xs mt-1">{errors.bank_ifsc_code}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={formData.bank_branch}
                  onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                  placeholder="Koramangala Branch"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-red-500" />
                <span>Emergency Contact Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.emergency_contact_name}
                  onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  placeholder="John Doe"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.emergency_contact_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.emergency_contact_name && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Relationship *
                </label>
                <select
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => handleInputChange('emergency_contact_relationship', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.emergency_contact_relationship ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select Relationship</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="spouse">Spouse</option>
                  <option value="sibling">Sibling</option>
                  <option value="friend">Friend</option>
                  <option value="other">Other</option>
                </select>
                {errors.emergency_contact_relationship && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_relationship}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value.replace(/\D/g, ''))}
                  placeholder="9876543210"
                  maxLength={10}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white ${
                    errors.emergency_contact_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.emergency_contact_phone && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact Address
                </label>
                <textarea
                  value={formData.emergency_contact_address}
                  onChange={(e) => handleInputChange('emergency_contact_address', e.target.value)}
                  placeholder="Complete address of emergency contact"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="md:col-span-2">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Eye className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        Face Recognition Attendance
                      </h4>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        The face photo will be used for our upcoming AI-powered attendance system. 
                        This will enable touchless, secure attendance marking using facial recognition technology.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employee Remarks */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Employee Remarks
                  <span className="text-xs text-gray-500 block mt-1">General remarks for Form XIII</span>
                </label>
                <textarea
                  value={formData.employee_remarks}
                  onChange={(e) => handleInputChange('employee_remarks', e.target.value)}
                  placeholder="Any additional remarks about the employee"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {employee ? 'Update Employee' : 'Create Employee'}
                </>
              )}
            </Button>
          </div>
        </form>


      </div>
    </div>
  )
}

export default EmployeeForm
