import React, { useState, useEffect } from 'react'
import { X, Save, User, Building2, MapPin, CreditCard, FileText, Phone, Mail, Globe, Plus, Trash2 } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'

interface Customer {
  id?: number
  customer_type: 'individual' | 'business' | 'government' | 'ngo'
  name: string
  display_name: string
  email: string
  phone: string
  mobile: string
  website: string
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_state: string
  billing_pincode: string
  billing_country: string
  shipping_same_as_billing: boolean
  shipping_address_line1: string
  shipping_address_line2: string
  shipping_city: string
  shipping_state: string
  shipping_pincode: string
  shipping_country: string
  business_type: string
  industry: string
  gstin: string
  pan_number: string
  aadhar_number: string
  bank_name: string
  bank_account_number: string
  bank_ifsc_code: string
  bank_branch: string
  account_holder_name: string
  bank_verification_status: string
  bank_verified_date: string | null
  statement_import_enabled: boolean
  last_statement_import: string | null
  credit_limit: number
  payment_terms: string
  currency: string
  project_area: string
  notes: string
  is_active: boolean
  // Opening Balance Fields
  opening_balance?: number
  opening_balance_date?: string
  // Indian Compliance Fields
  state_code?: string
  is_gst_registered?: boolean
  gst_registration_date?: string
}

interface CustomerFormProps {
  customer?: Customer | null
  onClose: () => void
  onSave: () => void
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose, onSave }) => {
  const { sessionKey } = useServiceUserStore()

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [shippingAddresses, setShippingAddresses] = useState<Array<{
    id: string
    label: string
    address_line1: string
    address_line2: string
    city: string
    state: string
    pincode: string
    country: string
  }>>([])
  const [stateSearchTerm, setStateSearchTerm] = useState('')
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [formData, setFormData] = useState<Customer>({
    customer_type: 'business',
    name: '',
    display_name: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    billing_address_line1: '',
    billing_address_line2: '',
    billing_city: '',
    billing_state: '',
    billing_pincode: '',
    billing_country: 'India',
    shipping_same_as_billing: true,
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_pincode: '',
    shipping_country: '',
    business_type: '',
    industry: '',
    gstin: '',
    pan_number: '',
    aadhar_number: '',
    bank_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_branch: '',
    account_holder_name: '',
    bank_verification_status: 'pending',
    bank_verified_date: null,
    statement_import_enabled: false,
    last_statement_import: null,
    credit_limit: 0,
    payment_terms: '',
    currency: 'INR',
    project_area: '',
    notes: '',
    is_active: true,
    // Opening Balance Fields
    opening_balance: 0,
    opening_balance_date: '',
    // Indian Compliance Fields
    state_code: '',
    is_gst_registered: false,
    gst_registration_date: ''
  })

  // Currency symbol mapping
  const getCurrencySymbol = (currency: string) => {
    const symbols: Record<string, string> = {
      'INR': '₹',
      'USD': '$',
      'EUR': '€',
      'GBP': '£'
    }
    return symbols[currency] || currency
  }

  useEffect(() => {
    if (customer) {
      if (customer.id) {
        // Fetch complete customer details for editing
        fetchCustomerDetails(customer.id)
      } else {
        // New customer - use default form data
        setFormData({ ...customer })
      }
    }
  }, [customer])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      if (showStateDropdown) {
        setShowStateDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showStateDropdown])

  const fetchCustomerDetails = async (customerId: number) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (sessionKey) params.append('session_key', sessionKey)

      const response = await apiClient.getFinanceCustomer(customerId, Object.fromEntries(params))
      const customerData = response.data

      // Set form data with all fields from the database
      setFormData({
        id: customerData.id,
        customer_type: customerData.customer_type || 'business',
        name: customerData.name || '',
        display_name: customerData.display_name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        mobile: customerData.mobile || '',
        website: customerData.website || '',
        billing_address_line1: customerData.billing_address_line1 || '',
        billing_address_line2: customerData.billing_address_line2 || '',
        billing_city: customerData.billing_city || '',
        billing_state: customerData.billing_state || '',
        billing_pincode: customerData.billing_pincode || '',
        billing_country: customerData.billing_country || 'India',
        shipping_same_as_billing: customerData.shipping_same_as_billing ?? true,
        shipping_address_line1: customerData.shipping_address_line1 || '',
        shipping_address_line2: customerData.shipping_address_line2 || '',
        shipping_city: customerData.shipping_city || '',
        shipping_state: customerData.shipping_state || '',
        shipping_pincode: customerData.shipping_pincode || '',
        shipping_country: customerData.shipping_country || '',
        business_type: customerData.business_type || '',
        industry: customerData.industry || '',
        gstin: customerData.gstin || '',
        pan_number: customerData.pan_number || '',
        aadhar_number: customerData.aadhar_number || '',
        bank_name: customerData.bank_name || '',
        bank_account_number: customerData.bank_account_number || '',
        bank_ifsc_code: customerData.bank_ifsc_code || '',
        bank_branch: customerData.bank_branch || '',
        account_holder_name: customerData.account_holder_name || '',
        bank_verification_status: customerData.bank_verification_status || 'pending',
        bank_verified_date: customerData.bank_verified_date || null,
        statement_import_enabled: customerData.statement_import_enabled || false,
        last_statement_import: customerData.last_statement_import || null,
        credit_limit: customerData.credit_limit || 0,
        payment_terms: customerData.payment_terms || '',
        currency: customerData.currency || 'INR',
        project_area: customerData.project_area || '',
        notes: customerData.notes || '',
        is_active: customerData.is_active ?? true,
        // Opening Balance Fields
        opening_balance: customerData.opening_balance || 0,
        opening_balance_date: customerData.opening_balance_date || '',
        // Indian Compliance Fields
        state_code: customerData.state_code || '',
        is_gst_registered: customerData.is_gst_registered ?? false,
        gst_registration_date: customerData.gst_registration_date || ''
      })

      // Load existing shipping addresses
      if (customerData.shipping_addresses && customerData.shipping_addresses.length > 0) {
        const addresses = customerData.shipping_addresses.map((addr: any, index: number) => ({
          id: addr.id?.toString() || `existing_${index}`,
          label: addr.label || `Address ${index + 1}`,
          address_line1: addr.address_line1 || '',
          address_line2: addr.address_line2 || '',
          city: addr.city || '',
          state: addr.state || '',
          pincode: addr.pincode || '',
          country: addr.country || 'India'
        }))
        setShippingAddresses(addresses)
      } else {
        setShippingAddresses([])
      }

    } catch (error) {
      console.error('Error fetching customer details:', error)
      // Fallback to the limited data from the list
      setFormData({
        ...customer,
        project_area: customer?.project_area || '',
        customer_type: customer?.customer_type || 'business'
      } as Customer)
      setShippingAddresses([])
    } finally {
      setLoading(false)
    }
  }

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[0-9]{10}$/
    return phoneRegex.test(phone)
  }

  const validateGSTIN = (gstin: string) => {
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    return gstinRegex.test(gstin)
  }

  const validatePAN = (pan: string) => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return panRegex.test(pan)
  }

  const validateAadhar = (aadhar: string) => {
    const aadharRegex = /^[0-9]{12}$/
    return aadharRegex.test(aadhar)
  }

  const validateIFSC = (ifsc: string) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
    return ifscRegex.test(ifsc)
  }

  const validatePincode = (pincode: string) => {
    const pincodeRegex = /^[0-9]{6}$/
    return pincodeRegex.test(pincode)
  }

  // State data and helper functions
  const states = [
    { code: '01', name: 'Jammu and Kashmir' },
    { code: '02', name: 'Himachal Pradesh' },
    { code: '03', name: 'Punjab' },
    { code: '04', name: 'Chandigarh' },
    { code: '05', name: 'Uttarakhand' },
    { code: '06', name: 'Haryana' },
    { code: '07', name: 'Delhi' },
    { code: '08', name: 'Rajasthan' },
    { code: '09', name: 'Uttar Pradesh' },
    { code: '10', name: 'Bihar' },
    { code: '11', name: 'Sikkim' },
    { code: '12', name: 'Arunachal Pradesh' },
    { code: '13', name: 'Nagaland' },
    { code: '14', name: 'Manipur' },
    { code: '15', name: 'Mizoram' },
    { code: '16', name: 'Tripura' },
    { code: '17', name: 'Meghalaya' },
    { code: '18', name: 'Assam' },
    { code: '19', name: 'West Bengal' },
    { code: '20', name: 'Jharkhand' },
    { code: '21', name: 'Odisha' },
    { code: '22', name: 'Chhattisgarh' },
    { code: '23', name: 'Madhya Pradesh' },
    { code: '24', name: 'Gujarat' },
    { code: '25', name: 'Daman and Diu' },
    { code: '26', name: 'Dadra and Nagar Haveli' },
    { code: '27', name: 'Maharashtra' },
    { code: '28', name: 'Andhra Pradesh' },
    { code: '29', name: 'Karnataka' },
    { code: '30', name: 'Goa' },
    { code: '31', name: 'Lakshadweep' },
    { code: '32', name: 'Kerala' },
    { code: '33', name: 'Tamil Nadu' },
    { code: '34', name: 'Puducherry' },
    { code: '35', name: 'Andaman and Nicobar Islands' },
    { code: '36', name: 'Telangana' },
    { code: '37', name: 'Andhra Pradesh (New)' }
  ]

  const getStateNameByCode = (code: string) => {
    const state = states.find(s => s.code === code)
    return state ? state.name : ''
  }

  const getFilteredStates = () => {
    if (!stateSearchTerm) return states
    return states.filter(state => 
      state.name.toLowerCase().includes(stateSearchTerm.toLowerCase()) ||
      state.code.includes(stateSearchTerm)
    ).sort((a, b) => {
      // Prioritize matches that start with the search term
      const aStartsWith = a.name.toLowerCase().startsWith(stateSearchTerm.toLowerCase())
      const bStartsWith = b.name.toLowerCase().startsWith(stateSearchTerm.toLowerCase())
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return 0
    })
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Basic Info - Mandatory fields
    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required'
    }
    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required'
    }
    // Phone is now optional since email is available
    
    // Address - Mandatory fields
    if (!formData.billing_address_line1.trim()) {
      newErrors.billing_address_line1 = 'Address line 1 is required'
    }
    if (!formData.billing_city.trim()) {
      newErrors.billing_city = 'City is required'
    }
    if (!formData.billing_state.trim()) {
      newErrors.billing_state = 'State is required'
    }
    if (!formData.billing_pincode.trim()) {
      newErrors.billing_pincode = 'PIN code is required'
    }
    
    // Tax & Legal - Mandatory fields
    if (!formData.gstin.trim()) {
      newErrors.gstin = 'GSTIN is required'
    }
    if (!formData.pan_number.trim()) {
      newErrors.pan_number = 'PAN number is required'
    }
    
    // Format validations (for all fields with values)
    if (formData.email && formData.email.trim() && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (formData.phone && formData.phone.trim() && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }
    if (formData.mobile && formData.mobile.trim() && !validatePhone(formData.mobile)) {
      newErrors.mobile = 'Please enter a valid mobile number'
    }
    if (formData.gstin && formData.gstin.trim() && !validateGSTIN(formData.gstin)) {
      newErrors.gstin = 'Please enter a valid GSTIN (15 characters)'
    }
    if (formData.pan_number && formData.pan_number.trim() && !validatePAN(formData.pan_number)) {
      newErrors.pan_number = 'Please enter a valid PAN (10 characters)'
    }
    if (formData.aadhar_number && formData.aadhar_number.trim() && !validateAadhar(formData.aadhar_number)) {
      newErrors.aadhar_number = 'Please enter a valid Aadhar number (12 digits)'
    }
    if (formData.billing_pincode && formData.billing_pincode.trim() && !validatePincode(formData.billing_pincode)) {
      newErrors.billing_pincode = 'PIN code must be exactly 6 digits'
    }
    if (formData.shipping_pincode && formData.shipping_pincode.trim() && !validatePincode(formData.shipping_pincode)) {
      newErrors.shipping_pincode = 'PIN code must be exactly 6 digits'
    }
    
    // Banking fields - Optional (only validate format if provided)
    if (formData.bank_ifsc_code && formData.bank_ifsc_code.trim() && !validateIFSC(formData.bank_ifsc_code)) {
      newErrors.bank_ifsc_code = 'Please enter a valid IFSC code'
    }
    
    // Other Info fields - Optional
    if (formData.credit_limit < 0) {
      newErrors.credit_limit = 'Credit limit cannot be negative'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: keyof Customer, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }

    // Auto-fill display name if not manually set
    if (field === 'name' && !formData.display_name) {
      setFormData(prev => ({
        ...prev,
        display_name: value
      }))
    }

    // Handle shipping address checkbox logic
    if (field === 'shipping_same_as_billing') {
      if (value === true) {
        // When checkbox is checked, clear shipping address fields
        setFormData(prev => ({
          ...prev,
          shipping_same_as_billing: true,
          shipping_address_line1: '',
          shipping_address_line2: '',
          shipping_city: '',
          shipping_state: '',
          shipping_pincode: '',
          shipping_country: ''
        }))
      } else {
        // When checkbox is unchecked, copy billing address to shipping
        setFormData(prev => ({
          ...prev,
          shipping_same_as_billing: false,
          shipping_address_line1: prev.billing_address_line1,
          shipping_address_line2: prev.billing_address_line2,
          shipping_city: prev.billing_city,
          shipping_state: prev.billing_state,
          shipping_pincode: prev.billing_pincode,
          shipping_country: prev.billing_country
        }))
      }
    }
  }

  // Shipping address functions
  const addShippingAddress = () => {
    const newAddress = {
      id: Date.now().toString(),
      label: `Address ${shippingAddresses.length + 1}`,
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
    setShippingAddresses(prev => [...prev, newAddress])
  }

  const updateShippingAddress = (id: string, field: string, value: string) => {
    setShippingAddresses(prev =>
      prev.map(addr =>
        addr.id === id ? { ...addr, [field]: value } : addr
      )
    )
  }

  const removeShippingAddress = (id: string) => {
    setShippingAddresses(prev => prev.filter(addr => addr.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form submitted with data:', formData)
    console.log('Customer ID:', customer?.id)

    // Validate form
    if (!validateForm()) {
      console.log('Validation failed with errors:', errors)
      // Find the first tab with errors and switch to it
      const errorFields = Object.keys(errors)
      if (errorFields.some(field => ['name', 'display_name', 'email', 'phone', 'mobile', 'website', 'business_type', 'industry'].includes(field))) {
        setActiveTab('basic')
      } else if (errorFields.some(field => field.includes('address') || field.includes('city') || field.includes('state') || field.includes('pincode'))) {
        setActiveTab('address')
      } else if (errorFields.some(field => ['gstin', 'pan_number', 'aadhar_number'].includes(field))) {
        setActiveTab('tax')
      } else if (errorFields.some(field => field.includes('bank'))) {
        setActiveTab('banking')
      } else {
        setActiveTab('other')
      }
      return
    }

    console.log('Validation passed, proceeding with save...')
    setLoading(true)

    try {
      // Prepare clean payload
      const payload = {
        ...formData,
        shipping_addresses: shippingAddresses, // Include multiple shipping addresses
        session_key: sessionKey
      }

      // Remove customer_code from payload (let backend generate it)
      delete (payload as any).customer_code
      
      // Handle empty date fields - send undefined instead of empty string
      if (!payload.opening_balance_date || payload.opening_balance_date === '') {
        payload.opening_balance_date = undefined
      }
      if (!payload.gst_registration_date || payload.gst_registration_date === '') {
        payload.gst_registration_date = undefined
      }

      // If shipping is same as billing, ensure shipping fields are empty
      if (payload.shipping_same_as_billing) {
        payload.shipping_address_line1 = ''
        payload.shipping_address_line2 = ''
        payload.shipping_city = ''
        payload.shipping_state = ''
        payload.shipping_pincode = ''
        payload.shipping_country = ''
      }

      console.log('Sending payload:', payload)
      
      if (customer?.id) {
        // Update existing customer
        console.log('Updating customer with ID:', customer.id)
        const response = await apiClient.updateFinanceCustomer(customer.id, payload)
        console.log('Update response:', response)
        toast.success('Customer updated successfully!')
      } else {
        // Create new customer
        console.log('Creating new customer')
        const response = await apiClient.createFinanceCustomer(payload)
        console.log('Create response:', response)
        toast.success('Customer created successfully!')
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving customer:', error)

      // Handle validation errors from backend
      if (error.response?.data) {
        const backendErrors = error.response.data
        
        // Handle field-specific validation errors
        if (typeof backendErrors === 'object' && !backendErrors.error && !backendErrors.message) {
          // Handle non_field_errors specially
          if (backendErrors.non_field_errors) {
            const nonFieldError = Array.isArray(backendErrors.non_field_errors) 
              ? backendErrors.non_field_errors[0] 
              : backendErrors.non_field_errors
            toast.error(`Validation Error: ${nonFieldError}`)
            
            // If it's about shipping address, switch to address tab
            if (nonFieldError.toLowerCase().includes('shipping')) {
              setActiveTab('address')
            }
          }
          
          // Set field errors
          const fieldErrors = { ...backendErrors }
          delete fieldErrors.non_field_errors // Remove non_field_errors from field errors
          setErrors(fieldErrors)
          
          // Show specific error messages for each field
          const errorFields = Object.keys(fieldErrors)
          if (errorFields.length > 0) {
            const firstError = fieldErrors[errorFields[0]]
            const errorMessage = Array.isArray(firstError) ? firstError[0] : firstError
            toast.error(`Field Error: ${errorMessage}`)
          }
          
          // Switch to the tab containing the first error
          if (errorFields.some(field => ['name', 'display_name', 'email', 'phone', 'mobile', 'website', 'business_type', 'industry', 'customer_code'].includes(field))) {
            setActiveTab('basic')
          } else if (errorFields.some(field => field.includes('address') || field.includes('city') || field.includes('state') || field.includes('pincode'))) {
            setActiveTab('address')
          } else if (errorFields.some(field => ['gstin', 'pan_number', 'aadhar_number'].includes(field))) {
            setActiveTab('tax')
          } else if (errorFields.some(field => field.includes('bank'))) {
            setActiveTab('banking')
          } else {
            setActiveTab('other')
          }
        } else {
          // Handle general error messages
          const message = backendErrors.message || backendErrors.error || 'Failed to save customer'
          toast.error(message)
          
          // If there are details, log them for debugging
          if (backendErrors.details) {
            console.error('Error details:', backendErrors.details)
            // Try to parse details if it's a string
            if (typeof backendErrors.details === 'string') {
              try {
                const parsedDetails = JSON.parse(backendErrors.details.replace(/'/g, '"'))
                setErrors(parsedDetails)
                
                // Show first error from details
                const detailFields = Object.keys(parsedDetails)
                if (detailFields.length > 0) {
                  const firstDetailError = parsedDetails[detailFields[0]]
                  const detailErrorMessage = Array.isArray(firstDetailError) ? firstDetailError[0] : firstDetailError
                  toast.error(`Error: ${detailErrorMessage}`)
                }
              } catch (parseError) {
                console.error('Could not parse error details:', parseError)
              }
            }
          }
        }
      } else {
        toast.error('Network error. Please check your connection and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'tax', label: 'Tax & Legal', icon: FileText },
    { id: 'banking', label: 'Banking', icon: CreditCard },
    { id: 'other', label: 'Other Info', icon: Building2 }
  ]

  // Helper function to render input with error
  const renderInput = (
    field: keyof Customer,
    label: string,
    type: string = 'text',
    placeholder?: string,
    required?: boolean,
    maxLength?: number,
    icon?: React.ReactNode
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={formData[field] as string}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
            errors[field] ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder={placeholder}
          maxLength={maxLength}
          required={required}
        />
      </div>
      {errors[field] && (
        <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {customer?.id ? 'Edit Customer' : 'Add New Customer'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 px-6 flex-shrink-0 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const hasErrors = Object.keys(errors).some(field => {
                if (tab.id === 'basic') return ['name', 'display_name', 'email', 'phone', 'mobile', 'website', 'business_type', 'industry'].includes(field)
                if (tab.id === 'address') return field.includes('address') || field.includes('city') || field.includes('state') || field.includes('pincode')
                if (tab.id === 'tax') return ['gstin', 'pan_number', 'aadhar_number'].includes(field)
                if (tab.id === 'banking') return field.includes('bank')
                if (tab.id === 'other') return ['credit_limit', 'payment_terms', 'currency', 'notes'].includes(field)
                return false
              })

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : hasErrors
                      ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {hasErrors && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                </button>
              )
            })}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10">
                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 px-6 py-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-gray-700 dark:text-gray-300">Saving customer...</span>
                </div>
              </div>
            )}
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Customer Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.customer_type}
                      onChange={(e) => handleInputChange('customer_type', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        errors.customer_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      required
                    >
                      <option value="individual">Individual</option>
                      <option value="business">Business</option>
                      <option value="government">Government</option>
                      <option value="ngo">NGO/Non-Profit</option>
                    </select>
                    {errors.customer_type && (
                      <p className="text-red-500 text-sm mt-1">{errors.customer_type}</p>
                    )}
                  </div>

                  {renderInput('name', 'Customer Name', 'text', 'Enter customer name', true)}
                  {renderInput('display_name', 'Display Name', 'text', 'Name to show on invoices', true)}
                  {renderInput('email', 'Email', 'email', 'customer@example.com', false, undefined, <Mail className="w-4 h-4" />)}
                  {renderInput('phone', 'Phone', 'tel', '9876543210', false, undefined, <Phone className="w-4 h-4" />)}
                  {renderInput('mobile', 'Mobile', 'tel', '9876543210', false, undefined, <Phone className="w-4 h-4" />)}
                  {renderInput('website', 'Website', 'url', 'https://example.com', false, undefined, <Globe className="w-4 h-4" />)}

                  {formData.customer_type === 'business' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Business Type
                        </label>
                        <select
                          value={formData.business_type}
                          onChange={(e) => handleInputChange('business_type', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                            errors.business_type ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">Select Business Type</option>
                          <option value="proprietorship">Sole Proprietorship</option>
                          <option value="partnership">Partnership</option>
                          <option value="llp">Limited Liability Partnership</option>
                          <option value="private_limited">Private Limited Company</option>
                          <option value="public_limited">Public Limited Company</option>
                          <option value="trust">Trust</option>
                          <option value="society">Society</option>
                          <option value="cooperative">Cooperative Society</option>
                          <option value="other">Other</option>
                        </select>
                        {errors.business_type && (
                          <p className="text-red-500 text-sm mt-1">{errors.business_type}</p>
                        )}
                      </div>

                      {renderInput('industry', 'Industry', 'text', 'e.g., Manufacturing, IT Services, Retail')}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Address Tab */}
            {activeTab === 'address' && (
              <div className="space-y-8">
                {/* Billing Address */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Billing Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      {renderInput('billing_address_line1', 'Address Line 1', 'text', 'Street address, building name', true)}
                    </div>
                    <div className="md:col-span-2">
                      {renderInput('billing_address_line2', 'Address Line 2', 'text', 'Apartment, suite, floor (optional)')}
                    </div>
                    {renderInput('billing_city', 'City', 'text', 'City name', true)}
                    {renderInput('billing_state', 'State', 'text', 'State/Province', true)}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        PIN Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.billing_pincode}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                          handleInputChange('billing_pincode', value)
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                          errors.billing_pincode ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="123456"
                        maxLength={6}
                      />
                      {errors.billing_pincode && (
                        <p className="text-red-500 text-sm mt-1">{errors.billing_pincode}</p>
                      )}
                    </div>
                    {renderInput('billing_country', 'Country', 'text', 'India')}
                  </div>
                </div>

                {/* Shipping Address Options */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Shipping Addresses
                    </h3>
                    <button
                      type="button"
                      onClick={addShippingAddress}
                      disabled={formData.shipping_same_as_billing}
                      className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                        formData.shipping_same_as_billing
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Add Address
                    </button>
                  </div>

                  <div className="flex items-center mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <input
                      type="checkbox"
                      id="shipping_same"
                      checked={formData.shipping_same_as_billing}
                      onChange={(e) => handleInputChange('shipping_same_as_billing', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shipping_same" className="ml-2 text-sm font-medium text-blue-800 dark:text-blue-200">
                      Use billing address as default shipping address
                    </label>
                    {formData.shipping_same_as_billing && (
                      <span className="ml-2 text-xs text-green-600 dark:text-green-400 font-medium">
                        ✓ Enabled
                      </span>
                    )}
                  </div>

                  {/* Multiple Shipping Addresses */}
                  {shippingAddresses.length > 0 && !formData.shipping_same_as_billing && (
                    <div className="space-y-6">
                      {shippingAddresses.map((address, index) => (
                        <div key={address.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Shipping Address {index + 1}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeShippingAddress(address.id)}
                              className="text-red-600 hover:text-red-800 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Address Label
                              </label>
                              <input
                                type="text"
                                value={address.label}
                                onChange={(e) => updateShippingAddress(address.id, 'label', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                placeholder="e.g., Warehouse, Branch Office"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Address Line 1
                              </label>
                              <input
                                type="text"
                                value={address.address_line1}
                                onChange={(e) => updateShippingAddress(address.id, 'address_line1', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                placeholder="Street address, building name"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Address Line 2
                              </label>
                              <input
                                type="text"
                                value={address.address_line2}
                                onChange={(e) => updateShippingAddress(address.id, 'address_line2', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                placeholder="Apartment, suite, floor (optional)"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                City
                              </label>
                              <input
                                type="text"
                                value={address.city}
                                onChange={(e) => updateShippingAddress(address.id, 'city', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                State
                              </label>
                              <input
                                type="text"
                                value={address.state}
                                onChange={(e) => updateShippingAddress(address.id, 'state', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                PIN Code
                              </label>
                              <input
                                type="text"
                                value={address.pincode}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                                  updateShippingAddress(address.id, 'pincode', value)
                                }}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                placeholder="123456"
                                maxLength={6}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Country
                              </label>
                              <input
                                type="text"
                                value={address.country}
                                onChange={(e) => updateShippingAddress(address.id, 'country', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {formData.shipping_same_as_billing && (
                    <div className="text-center py-8 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                      <p className="font-medium">Shipping addresses disabled</p>
                      <p className="text-sm text-blue-500">Billing address will be used for shipping</p>
                    </div>
                  )}
                  
                  {shippingAddresses.length === 0 && !formData.shipping_same_as_billing && (
                    <div className="text-center py-8 text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No additional shipping addresses added</p>
                      <p className="text-sm">Click "Add Address" to add shipping addresses</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tax & Legal Tab */}
            {activeTab === 'tax' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Indian Compliance Section */}
                  <div className="md:col-span-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Indian Compliance
                    </h3>
                  </div>
                  
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      State Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={stateSearchTerm || (formData.state_code ? getStateNameByCode(formData.state_code) : '')}
                        onChange={(e) => {
                          setStateSearchTerm(e.target.value)
                          setShowStateDropdown(true)
                        }}
                        onFocus={() => setShowStateDropdown(true)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="Type to search states..."
                      />
                      {showStateDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {getFilteredStates().map((state) => (
                            <div
                              key={state.code}
                              onClick={() => {
                                handleInputChange('state_code', state.code)
                                setStateSearchTerm(state.name)
                                setShowStateDropdown(false)
                              }}
                              className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0 text-gray-900 dark:text-white"
                            >
                              {state.code} - {state.name}
                            </div>
                          ))}
                          {getFilteredStates().length === 0 && (
                            <div className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">
                              No states found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.is_gst_registered || false}
                        onChange={(e) => handleInputChange('is_gst_registered', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">GST Registered</span>
                    </label>
                    {formData.is_gst_registered && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          GST Registration Date
                        </label>
                        <input
                          type="date"
                          value={formData.gst_registration_date || ''}
                          onChange={(e) => {
                            const dateValue = e.target.value // Already in YYYY-MM-DD format from date input
                            handleInputChange('gst_registration_date', dateValue || undefined)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      GSTIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase()
                        handleInputChange('gstin', value)
                        // Auto-extract state code from GSTIN
                        if (value.length >= 2) {
                          const stateCode = value.substring(0, 2)
                          if (!formData.state_code) {
                            handleInputChange('state_code', stateCode)
                          }
                        }
                        // Auto-set GST registered if GSTIN is provided
                        if (value.length === 15 && !formData.is_gst_registered) {
                          handleInputChange('is_gst_registered', true)
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.gstin ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="15-digit GST number"
                      maxLength={15}
                    />
                    {errors.gstin && (
                      <p className="text-red-500 text-sm mt-1">{errors.gstin}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Format: 22AAAAA0000A1Z5</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      PAN Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pan_number}
                      onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.pan_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="10-character PAN"
                      maxLength={10}
                    />
                    {errors.pan_number && (
                      <p className="text-red-500 text-sm mt-1">{errors.pan_number}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Format: ABCDE1234F</p>
                  </div>

                  {formData.customer_type === 'individual' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Aadhar Number
                      </label>
                      <input
                        type="text"
                        value={formData.aadhar_number}
                        onChange={(e) => handleInputChange('aadhar_number', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        placeholder="12-digit Aadhar number"
                        maxLength={12}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">12-digit number only</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Banking Tab */}
            {activeTab === 'banking' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.bank_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., State Bank of India"
                    />
                    {errors.bank_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.bank_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.bank_account_number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.bank_account_number && (
                      <p className="text-red-500 text-sm mt-1">{errors.bank_account_number}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={formData.bank_ifsc_code}
                      onChange={(e) => handleInputChange('bank_ifsc_code', e.target.value.toUpperCase())}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.bank_ifsc_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="e.g., SBIN0001234"
                      maxLength={11}
                    />
                    {errors.bank_ifsc_code && (
                      <p className="text-red-500 text-sm mt-1">{errors.bank_ifsc_code}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={formData.bank_branch}
                      onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={formData.account_holder_name}
                      onChange={(e) => handleInputChange('account_holder_name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                        errors.account_holder_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                      placeholder="Name as per bank records"
                    />
                    {errors.account_holder_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.account_holder_name}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.statement_import_enabled}
                        onChange={(e) => handleInputChange('statement_import_enabled', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Bank Statement Import</span>
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Allow importing bank statements for payment reconciliation
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Other Info Tab */}
            {activeTab === 'other' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Credit Limit ({getCurrencySymbol(formData.currency)})
                    </label>
                    <input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => handleInputChange('credit_limit', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="e.g., Net 30, COD, Advance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Opening Balance ({getCurrencySymbol(formData.currency)})
                    </label>
                    <input
                      type="number"
                      value={formData.opening_balance || 0}
                      onChange={(e) => handleInputChange('opening_balance', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      step="0.01"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Initial balance for this customer (positive for receivable, negative for payable)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Opening Balance Date
                    </label>
                    <input
                      type="date"
                      value={formData.opening_balance_date || ''}
                      onChange={(e) => {
                        const dateValue = e.target.value // Already in YYYY-MM-DD format from date input
                        handleInputChange('opening_balance_date', dateValue || undefined)
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Date when the opening balance was set
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => handleInputChange('is_active', e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Project Area / Address Label
                    </label>
                    <input
                      type="text"
                      value={formData.project_area}
                      onChange={(e) => handleInputChange('project_area', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="e.g., Downtown Office, Warehouse A, Main Branch..."
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      This label helps identify the customer's location and can be used to search quotations
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      placeholder="Internal notes about the customer..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {customer?.id ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CustomerForm
