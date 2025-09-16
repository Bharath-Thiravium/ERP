import React, { useState, useEffect } from 'react'
import { X, Save, User, Building2, MapPin, CreditCard, FileText, Phone, Mail, Globe, Plus, Trash2 } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { useThemeStore } from '../../../../store/themeStore'
import api, { apiClient } from '../../../../lib/api'
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
  credit_limit: number
  payment_terms: string
  currency: string
  project_area: string
  notes: string
  is_active: boolean
}

interface CustomerFormProps {
  customer?: Customer | null
  onClose: () => void
  onSave: () => void
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose, onSave }) => {
  const { sessionKey } = useServiceUserStore()
  const { theme } = useThemeStore()
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
    credit_limit: 0,
    payment_terms: '',
    currency: 'INR',
    project_area: '',
    notes: '',
    is_active: true
  })

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
        credit_limit: customerData.credit_limit || 0,
        payment_terms: customerData.payment_terms || '',
        currency: customerData.currency || 'INR',
        project_area: customerData.project_area || '',
        notes: customerData.notes || '',
        is_active: customerData.is_active ?? true
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
    const phoneRegex = /^[+]?[\d\s\-()]{10,15}$/
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    // Basic validations
    if (!formData.name.trim()) {
      newErrors.name = 'Customer name is required'
    }

    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    if (formData.mobile && !validatePhone(formData.mobile)) {
      newErrors.mobile = 'Please enter a valid mobile number'
    }

    if (formData.gstin && !validateGSTIN(formData.gstin)) {
      newErrors.gstin = 'Please enter a valid GSTIN (15 characters)'
    }

    if (formData.pan_number && !validatePAN(formData.pan_number)) {
      newErrors.pan_number = 'Please enter a valid PAN (10 characters)'
    }

    if (formData.aadhar_number && !validateAadhar(formData.aadhar_number)) {
      newErrors.aadhar_number = 'Please enter a valid Aadhar number (12 digits)'
    }

    if (formData.bank_ifsc_code && !validateIFSC(formData.bank_ifsc_code)) {
      newErrors.bank_ifsc_code = 'Please enter a valid IFSC code'
    }

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

    // Validate form
    if (!validateForm()) {
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

    setLoading(true)

    try {
      const payload = {
        ...formData,
        shipping_addresses: shippingAddresses, // Include multiple shipping addresses
        session_key: sessionKey
      }

      if (customer?.id) {
        // Update existing customer
        await apiClient.updateFinanceCustomer(customer.id, payload)
        toast.success('Customer updated successfully!')
      } else {
        // Create new customer
        await apiClient.createFinanceCustomer(payload)
        toast.success('Customer created successfully!')
      }

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Error saving customer:', error)

      // Handle validation errors from backend
      if (error.response?.data) {
        const backendErrors = error.response.data
        if (typeof backendErrors === 'object') {
          setErrors(backendErrors)
          toast.error('Please fix the validation errors and try again.')
        } else {
          const message = backendErrors.message || 'Failed to save customer'
          toast.error(message)
        }
      } else {
        toast.error('Failed to save customer. Please try again.')
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
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
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
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : hasErrors
                      ? 'border-red-500 text-red-600 dark:text-red-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
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
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  {renderInput('display_name', 'Display Name', 'text', 'Name to show on invoices')}
                  {renderInput('email', 'Email', 'email', 'customer@example.com', false, undefined, <Mail className="w-4 h-4" />)}
                  {renderInput('phone', 'Phone', 'tel', '+91 98765 43210', false, undefined, <Phone className="w-4 h-4" />)}
                  {renderInput('mobile', 'Mobile', 'tel', '+91 98765 43210', false, undefined, <Phone className="w-4 h-4" />)}
                  {renderInput('website', 'Website', 'url', 'https://example.com', false, undefined, <Globe className="w-4 h-4" />)}

                  {formData.customer_type === 'business' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Business Type
                        </label>
                        <select
                          value={formData.business_type}
                          onChange={(e) => handleInputChange('business_type', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.business_type ? 'border-red-500' : 'border-gray-300'
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Billing Address
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      {renderInput('billing_address_line1', 'Address Line 1', 'text', 'Street address, building name')}
                    </div>
                    <div className="md:col-span-2">
                      {renderInput('billing_address_line2', 'Address Line 2', 'text', 'Apartment, suite, floor (optional)')}
                    </div>
                    {renderInput('billing_city', 'City', 'text', 'City name')}
                    {renderInput('billing_state', 'State', 'text', 'State/Province')}
                    {renderInput('billing_pincode', 'PIN Code', 'text', '123456', false, 10)}
                    {renderInput('billing_country', 'Country', 'text', 'India')}
                  </div>
                </div>

                {/* Shipping Address Options */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      Shipping Addresses
                    </h3>
                    <button
                      type="button"
                      onClick={addShippingAddress}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Address
                    </button>
                  </div>

                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="shipping_same"
                      checked={formData.shipping_same_as_billing}
                      onChange={(e) => handleInputChange('shipping_same_as_billing', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shipping_same" className="ml-2 text-sm text-gray-700">
                      Use billing address as default shipping address
                    </label>
                  </div>

                  {/* Multiple Shipping Addresses */}
                  {shippingAddresses.length > 0 && (
                    <div className="space-y-6">
                      {shippingAddresses.map((address, index) => (
                        <div key={address.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium text-gray-900">
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
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address Label
                              </label>
                              <input
                                type="text"
                                value={address.label}
                                onChange={(e) => updateShippingAddress(address.id, 'label', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="e.g., Warehouse, Branch Office"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address Line 1
                              </label>
                              <input
                                type="text"
                                value={address.address_line1}
                                onChange={(e) => updateShippingAddress(address.id, 'address_line1', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Street address, building name"
                              />
                            </div>

                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Address Line 2
                              </label>
                              <input
                                type="text"
                                value={address.address_line2}
                                onChange={(e) => updateShippingAddress(address.id, 'address_line2', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Apartment, suite, floor (optional)"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                City
                              </label>
                              <input
                                type="text"
                                value={address.city}
                                onChange={(e) => updateShippingAddress(address.id, 'city', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                State
                              </label>
                              <input
                                type="text"
                                value={address.state}
                                onChange={(e) => updateShippingAddress(address.id, 'state', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                PIN Code
                              </label>
                              <input
                                type="text"
                                value={address.pincode}
                                onChange={(e) => updateShippingAddress(address.id, 'pincode', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                maxLength={10}
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Country
                              </label>
                              <input
                                type="text"
                                value={address.country}
                                onChange={(e) => updateShippingAddress(address.id, 'country', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => handleInputChange('gstin', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="15-digit GST number"
                      maxLength={15}
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: 22AAAAA0000A1Z5</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAN Number
                    </label>
                    <input
                      type="text"
                      value={formData.pan_number}
                      onChange={(e) => handleInputChange('pan_number', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="10-character PAN"
                      maxLength={10}
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: ABCDE1234F</p>
                  </div>

                  {formData.customer_type === 'individual' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Aadhar Number
                      </label>
                      <input
                        type="text"
                        value={formData.aadhar_number}
                        onChange={(e) => handleInputChange('aadhar_number', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="12-digit Aadhar number"
                        maxLength={12}
                      />
                      <p className="text-xs text-gray-500 mt-1">12-digit number only</p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., State Bank of India"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_number}
                      onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={formData.bank_ifsc_code}
                      onChange={(e) => handleInputChange('bank_ifsc_code', e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., SBIN0001234"
                      maxLength={11}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Branch
                    </label>
                    <input
                      type="text"
                      value={formData.bank_branch}
                      onChange={(e) => handleInputChange('bank_branch', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Other Info Tab */}
            {activeTab === 'other' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Credit Limit (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.credit_limit}
                      onChange={(e) => handleInputChange('credit_limit', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Terms
                    </label>
                    <input
                      type="text"
                      value={formData.payment_terms}
                      onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Net 30, COD, Advance"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.is_active ? 'true' : 'false'}
                      onChange={(e) => handleInputChange('is_active', e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Project Area / Address Label
                    </label>
                    <input
                      type="text"
                      value={formData.project_area}
                      onChange={(e) => handleInputChange('project_area', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Downtown Office, Warehouse A, Main Branch..."
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      This label helps identify the customer's location and can be used to search quotations
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
