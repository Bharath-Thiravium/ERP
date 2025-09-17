import React, { useState, useEffect } from 'react'
import { X, Search } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

import axios from 'axios'
import toast from 'react-hot-toast'

interface Product {
  id: number
  product_code: string
  name: string
  product_type: 'product' | 'service'
  description: string
  hsn_code?: number
  sac_code?: number
  hsn_code_display: string
  sac_code_display: string
  gst_rate: number
  unit: string
  selling_price: number
  purchase_price: number
  track_inventory: boolean
  current_stock: number
  minimum_stock: number
  is_active: boolean
}

interface HSNCode {
  id: number
  code: string
  description: string
  gst_rate: number
}

interface SACCode {
  id: number
  code: string
  service_name: string
  description: string
  gst_rate: number
}

interface ProductFormProps {
  product?: Product | null
  isEditing: boolean
  onClose: () => void
  onSuccess: () => void
}

const ProductForm: React.FC<ProductFormProps> = ({
  product,
  isEditing,
  onClose,
  onSuccess
}) => {
  const { sessionKey } = useServiceUserStore()

  
  // Form state
  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    product_type: 'product' as 'product' | 'service',
    description: '',
    hsn_code: '',
    sac_code: '',
    gst_rate: 0,
    unit: '',
    selling_price: 0,
    purchase_price: 0,
    track_inventory: true,
    current_stock: 0,
    minimum_stock: 0,
    is_active: true
  })

  // HSN/SAC search state
  const [hsnSearchTerm, setHsnSearchTerm] = useState('')
  const [sacSearchTerm, setSacSearchTerm] = useState('')
  const [hsnCodes, setHsnCodes] = useState<HSNCode[]>([])
  const [sacCodes, setSacCodes] = useState<SACCode[]>([])
  const [showHsnDropdown, setShowHsnDropdown] = useState(false)
  const [showSacDropdown, setShowSacDropdown] = useState(false)
  const [selectedHsnCode, setSelectedHsnCode] = useState<HSNCode | null>(null)
  const [selectedSacCode, setSelectedSacCode] = useState<SACCode | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form data when editing
  useEffect(() => {
    if (isEditing && product) {
      setFormData({
        product_code: product.product_code || '',
        name: product.name || '',
        product_type: product.product_type || 'product',
        description: product.description || '',
        hsn_code: product.hsn_code?.toString() || '',
        sac_code: product.sac_code?.toString() || '',
        gst_rate: product.gst_rate || 0,
        unit: product.unit || '',
        selling_price: product.selling_price || 0,
        purchase_price: product.purchase_price || 0,
        track_inventory: product.track_inventory ?? true,
        current_stock: product.current_stock || 0,
        minimum_stock: product.minimum_stock || 0,
        is_active: product.is_active ?? true
      })
      
      // Set search terms for display
      if (product.hsn_code_display) {
        setHsnSearchTerm(product.hsn_code_display)
      }
      if (product.sac_code_display) {
        setSacSearchTerm(product.sac_code_display)
      }
    } else if (!isEditing) {
      // Generate code for new products/services
      generateProductCode(formData.product_type)
    }
  }, [isEditing, product])

  // Generate product/service code when type changes
  useEffect(() => {
    if (!isEditing) {
      generateProductCode(formData.product_type)
    }
  }, [formData.product_type, isEditing])

  const generateProductCode = async (type: 'product' | 'service') => {
    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/generate-code/?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${sessionKey}`,
          'Content-Type': 'application/json'
        }
      })

      setFormData(prev => ({
        ...prev,
        product_code: response.data.code
      }))
    } catch (error) {
      console.error('Error generating product code:', error)
    }
  }

  // Search HSN codes
  const searchHsnCodes = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setHsnCodes([])
      return
    }

    if (!sessionKey) {
      console.error('No session key available')
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('session_key', sessionKey)
      params.append('search', searchTerm)

      const response = await axios.get(`http://127.0.0.1:8000/api/finance/hsn-codes/search/?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${sessionKey}`,
          'Content-Type': 'application/json'
        }
      })
      setHsnCodes(response.data.results || [])
    } catch (error) {
      console.error('Error searching HSN codes:', error)
      setHsnCodes([])
    }
  }

  // Search SAC codes
  const searchSacCodes = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSacCodes([])
      return
    }

    if (!sessionKey) {
      console.error('No session key available')
      return
    }

    try {
      const params = new URLSearchParams()
      params.append('session_key', sessionKey)
      params.append('search', searchTerm)

      const response = await axios.get(`http://127.0.0.1:8000/api/finance/sac-codes/search/?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${sessionKey}`,
          'Content-Type': 'application/json'
        }
      })
      setSacCodes(response.data.results || [])
    } catch (error) {
      console.error('Error searching SAC codes:', error)
      setSacCodes([])
    }
  }

  // Handle HSN search input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.product_type === 'product') {
        searchHsnCodes(hsnSearchTerm)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [hsnSearchTerm, formData.product_type])

  // Handle SAC search input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.product_type === 'service') {
        searchSacCodes(sacSearchTerm)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [sacSearchTerm, formData.product_type])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.hsn-sac-dropdown')) {
        setShowHsnDropdown(false)
        setShowSacDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle HSN code selection
  const handleHsnCodeSelect = (hsnCode: HSNCode) => {
    setSelectedHsnCode(hsnCode)
    setHsnSearchTerm(`${hsnCode.code} - ${hsnCode.description}`)
    setFormData(prev => ({
      ...prev,
      hsn_code: hsnCode.id.toString(),
      gst_rate: hsnCode.gst_rate
    }))
    setShowHsnDropdown(false)
    setHsnCodes([])
  }

  // Handle SAC code selection
  const handleSacCodeSelect = (sacCode: SACCode) => {
    setSelectedSacCode(sacCode)
    setSacSearchTerm(`${sacCode.code} - ${sacCode.service_name}`)
    setFormData(prev => ({
      ...prev,
      sac_code: sacCode.id.toString(),
      gst_rate: sacCode.gst_rate
    }))
    setShowSacDropdown(false)
    setSacCodes([])
  }

  // Handle product type change
  const handleProductTypeChange = (type: 'product' | 'service') => {
    setFormData(prev => ({
      ...prev,
      product_type: type,
      hsn_code: '',
      sac_code: '',
      gst_rate: 0
    }))
    setHsnSearchTerm('')
    setSacSearchTerm('')
    setSelectedHsnCode(null)
    setSelectedSacCode(null)
    setHsnCodes([])
    setSacCodes([])
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked
              : type === 'number' ? (value === '' ? '' : parseFloat(value) || 0)
              : value
    }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Product/Service name is required'
    }
    // Only validate product_code for editing mode (new entries get auto-generated codes)
    if (isEditing && !formData.product_code.trim()) {
      newErrors.product_code = `${formData.product_type === 'product' ? 'Product' : 'Service'} code is required`
    }
    if (formData.product_type === 'product' && !formData.hsn_code) {
      newErrors.hsn_code = 'HSN code is required for products'
    }
    if (formData.product_type === 'service' && !formData.sac_code) {
      newErrors.sac_code = 'SAC code is required for services'
    }
    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required'
    }
    // Handle selling_price validation (could be empty string or number)
    const sellingPrice = typeof formData.selling_price === 'string' && formData.selling_price === ''
      ? 0
      : Number(formData.selling_price)
    if (sellingPrice <= 0) {
      newErrors.selling_price = 'Selling price must be greater than 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const submitData: any = {
        ...formData,
        // Convert empty strings back to numbers for numeric fields
        selling_price: typeof formData.selling_price === 'string' && formData.selling_price === ''
          ? 0
          : Number(formData.selling_price),
        purchase_price: typeof formData.purchase_price === 'string' && formData.purchase_price === ''
          ? 0
          : Number(formData.purchase_price),
        current_stock: typeof formData.current_stock === 'string' && formData.current_stock === ''
          ? 0
          : Number(formData.current_stock),
        minimum_stock: typeof formData.minimum_stock === 'string' && formData.minimum_stock === ''
          ? 0
          : Number(formData.minimum_stock),
        hsn_code: formData.product_type === 'product' && formData.hsn_code ? parseInt(formData.hsn_code) : null,
        sac_code: formData.product_type === 'service' && formData.sac_code ? parseInt(formData.sac_code) : null,
        session_key: sessionKey
      }

      // Keep gst_rate in submission data - it's set from HSN/SAC selection

      // For new entries, remove product_code as it will be auto-generated by the backend
      if (!isEditing) {
        delete submitData.product_code
      }

      if (!sessionKey) {
        toast.error('Session expired. Please login again.')
        return
      }

      if (isEditing && product) {
        await axios.put(`http://127.0.0.1:8000/api/finance/products/${product.id}/`, submitData, {
          headers: {
            'Authorization': `Bearer ${sessionKey}`,
            'Content-Type': 'application/json'
          }
        })
        toast.success('Product updated successfully!')
      } else {
        await axios.post('http://127.0.0.1:8000/api/finance/products/', submitData, {
          headers: {
            'Authorization': `Bearer ${sessionKey}`,
            'Content-Type': 'application/json'
          }
        })
        toast.success('Product created successfully!')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving product:', error)
      if (error.response?.data) {
        const serverErrors: Record<string, string> = {}
        Object.keys(error.response.data).forEach(key => {
          if (Array.isArray(error.response.data[key])) {
            serverErrors[key] = error.response.data[key][0]
          } else {
            serverErrors[key] = error.response.data[key]
          }
        })
        setErrors(serverErrors)
        toast.error('Please fix the validation errors and try again.')
      } else {
        toast.error('Failed to save product. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Product/Service' : 'Add New Product/Service'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Product Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="product_type"
                    value="product"
                    checked={formData.product_type === 'product'}
                    onChange={(e) => handleProductTypeChange(e.target.value as 'product' | 'service')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Product</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="product_type"
                    value="service"
                    checked={formData.product_type === 'service'}
                    onChange={(e) => handleProductTypeChange(e.target.value as 'product' | 'service')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Service</span>
                </label>
              </div>
            </div>

            {/* Product/Service Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {formData.product_type === 'product' ? 'Product Code' : 'Service Code'} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="product_code"
                value={formData.product_code}
                onChange={handleInputChange}
                readOnly={!isEditing}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                  !isEditing
                    ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-700'
                } ${
                  errors.product_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder={formData.product_type === 'product' ? 'Auto-generated product code' : 'Auto-generated service code'}
              />
              {!isEditing && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Code will be auto-generated when you save
                </p>
              )}
              {errors.product_code && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.product_code}</p>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {formData.product_type === 'product' ? 'Product' : 'Service'} Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder={`Enter ${formData.product_type} name`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter description"
            />
          </div>

          {/* HSN/SAC Code Selection */}
          {formData.product_type === 'product' ? (
            <div className="relative hsn-sac-dropdown">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                HSN Code <span className="text-red-500">*</span>
                {selectedHsnCode && <span className="text-green-600 text-xs ml-2">✓ Selected</span>}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={hsnSearchTerm}
                  onChange={(e) => {
                    setHsnSearchTerm(e.target.value)
                    setShowHsnDropdown(true)
                    if (!e.target.value) {
                      setSelectedHsnCode(null)
                      setFormData(prev => ({ ...prev, hsn_code: '', gst_rate: 0 }))
                    }
                  }}
                  onFocus={() => setShowHsnDropdown(true)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.hsn_code ? 'border-red-500' : selectedHsnCode ? 'border-green-300 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Search HSN code or description..."
                />
                
                {/* HSN Dropdown */}
                {showHsnDropdown && hsnCodes.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {hsnCodes.map((hsn) => (
                      <div
                        key={hsn.id}
                        onClick={() => handleHsnCodeSelect(hsn)}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {hsn.code}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {hsn.description}
                        </div>
                        <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                          GST: {hsn.gst_rate}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.hsn_code && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.hsn_code}</p>
              )}
            </div>
          ) : (
            <div className="relative hsn-sac-dropdown">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                SAC Code <span className="text-red-500">*</span>
                {selectedSacCode && <span className="text-green-600 text-xs ml-2">✓ Selected</span>}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={sacSearchTerm}
                  onChange={(e) => {
                    setSacSearchTerm(e.target.value)
                    setShowSacDropdown(true)
                    if (!e.target.value) {
                      setSelectedSacCode(null)
                      setFormData(prev => ({ ...prev, sac_code: '', gst_rate: 0 }))
                    }
                  }}
                  onFocus={() => setShowSacDropdown(true)}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    errors.sac_code ? 'border-red-500' : selectedSacCode ? 'border-green-300 dark:border-green-600' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Search SAC code or service name..."
                />
                
                {/* SAC Dropdown */}
                {showSacDropdown && sacCodes.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {sacCodes.map((sac) => (
                      <div
                        key={sac.id}
                        onClick={() => handleSacCodeSelect(sac)}
                        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">
                          {sac.code}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {sac.service_name}
                        </div>
                        <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                          GST: {sac.gst_rate}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {errors.sac_code && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sac_code}</p>
              )}
            </div>
          )}

          {/* GST Rate (Auto-filled) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                GST Rate (%) {selectedHsnCode || selectedSacCode ? <span className="text-green-600 text-xs">(Auto-filled)</span> : ''}
              </label>
              <input
                type="number"
                name="gst_rate"
                value={formData.gst_rate}
                onChange={handleInputChange}
                step="0.01"
                className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white ${
                  selectedHsnCode || selectedSacCode 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-600' 
                    : 'bg-white dark:bg-gray-700'
                }`}
                placeholder={selectedHsnCode || selectedSacCode ? "Auto-filled from HSN/SAC" : "Enter GST rate"}
              />
              {(selectedHsnCode || selectedSacCode) && (
                <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                  ✓ Auto-filled from {formData.product_type === 'product' ? 'HSN' : 'SAC'} code: {formData.product_type === 'product' ? selectedHsnCode?.code : selectedSacCode?.code}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.unit ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select Unit</option>
                <option value="PCS">Pieces (PCS)</option>
                <option value="KG">Kilograms (KG)</option>
                <option value="LITER">Liters (LITER)</option>
                <option value="METER">Meters (METER)</option>
                <option value="BOX">Box (BOX)</option>
                <option value="HOUR">Hours (HOUR)</option>
                <option value="DAY">Days (DAY)</option>
                <option value="MONTH">Months (MONTH)</option>
                <option value="YEAR">Years (YEAR)</option>
              </select>
              {errors.unit && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.unit}</p>
              )}
            </div>

            <div>
              <label className="flex items-center mt-8">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selling Price <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="selling_price"
                value={formData.selling_price}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.selling_price ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="0.00"
              />
              {errors.selling_price && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.selling_price}</p>
              )}
            </div>

            {/* Purchase Price (only for products) */}
            {formData.product_type === 'product' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Purchase Price
                </label>
                <input
                  type="number"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          {/* Inventory Tracking (only for products) */}
          {formData.product_type === 'product' && (
            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="track_inventory"
                    checked={formData.track_inventory}
                    onChange={handleInputChange}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Track Inventory
                  </span>
                </label>
              </div>

              {formData.track_inventory && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      name="current_stock"
                      value={formData.current_stock}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Stock Level
                    </label>
                    <input
                      type="number"
                      name="minimum_stock"
                      value={formData.minimum_stock}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              {isEditing ? 'Update' : 'Create'} {formData.product_type === 'product' ? 'Product' : 'Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProductForm
