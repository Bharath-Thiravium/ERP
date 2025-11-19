import React, { useState, useEffect } from 'react'
import { X, User, Calendar, Search, Trash2, MapPin } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { apiClient } from '../../../../lib/api'
import toast from 'react-hot-toast'

interface Customer {
  id: number
  customer_code: string
  name: string
  email: string
  phone: string
  gstin: string
  pan_number: string
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_state: string
  billing_pincode: string
  billing_country: string
  shipping_addresses?: ShippingAddress[]
}

interface ShippingAddress {
  id: number
  label: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  country: string
  is_default: boolean
  full_address: string
}

interface Product {
  id: number
  product_code: string
  name: string
  description: string
  product_type: 'product' | 'service'
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

interface QuotationItem {
  product: number
  quantity: number
  unit_price: number
  hsn_sac_code: string
  gst_rate: number
}

interface QuotationItemDetail {
  id: number
  product: number
  product_name: string
  product_code: string
  description: string
  hsn_sac_code: string
  quantity: string
  unit: string
  unit_price: string
  line_total: string
  gst_rate: string
  line_number: number
}

interface QuotationFormProps {
  quotation?: any // Only provided when editing
  onClose: () => void
  onSuccess: () => void
}

const QuotationForm: React.FC<QuotationFormProps> = ({ quotation, onClose, onSuccess }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [companyDetails, setCompanyDetails] = useState<any>(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    customer: 0,
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from today
    reference: '',
    shipping_address: null as number | null,
    notes: '',
    terms_and_conditions: '',
    quotation_items: [] as QuotationItem[]
  })

  // Load customers, products, and company details
  useEffect(() => {
    if (sessionKey) {
      loadCustomers()
      loadProducts()
      loadCompanyDetails()
    }
  }, [sessionKey])

  // Populate form when editing existing quotation
  useEffect(() => {
    if (quotation) {
      console.log('Editing quotation:', quotation)
      // Convert quotation items from detailed format to form format
      const convertedItems = quotation.quotation_items ? quotation.quotation_items.map((item: QuotationItemDetail) => ({
        product: item.product,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        hsn_sac_code: item.hsn_sac_code || '',
        gst_rate: parseFloat(item.gst_rate) || 0
      })) : []

      setFormData({
        customer: quotation.customer?.id || quotation.customer_details?.id || 0,
        quotation_date: quotation.quotation_date || new Date().toISOString().split('T')[0],
        valid_until: quotation.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        reference: quotation.reference || '',
        shipping_address: quotation.shipping_address?.id || quotation.shipping_address_details?.id || null,
        notes: quotation.notes || '',
        terms_and_conditions: quotation.terms_and_conditions || '',
        quotation_items: convertedItems
      })

      // Set selected customer if available - use customer_details for detailed view
      const customerData = quotation.customer_details || quotation.customer
      if (customerData) {
        setSelectedCustomer(customerData)
        setCustomerSearch(customerData.name)
      } else if (quotation.customer?.id || quotation.customer) {
        // If we only have customer ID, load the full customer details
        loadCustomerDetails(quotation.customer?.id || quotation.customer)
      }
    }
  }, [quotation])

  // Load full customer details when editing
  const loadCustomerDetails = async (customerId: number) => {
    if (!sessionKey || !customerId) {
      console.error('Missing session key or customer ID for loading customer details')
      return
    }

    try {
      const response = await apiClient.getFinanceCustomer(customerId, { session_key: sessionKey })
      const fullCustomer = response.data
      setSelectedCustomer(fullCustomer)
      setCustomerSearch(fullCustomer.name)
    } catch (error) {
      console.error('Error loading customer details:', error)
      toast.error('Failed to load customer details')
    }
  }

  const loadCustomers = async () => {
    if (!sessionKey) {
      console.error('No session key available for loading customers')
      return
    }
    try {
      const response = await apiClient.getFinanceCustomers({ session_key: sessionKey })
      setCustomers(response.data.results || [])
    } catch (error) {
      console.error('Error loading customers:', error)
      toast.error('Failed to load customers')
    }
  }

  const loadProducts = async () => {
    if (!sessionKey) {
      console.error('No session key available for loading products')
      return
    }
    try {
      const response = await apiClient.searchFinanceProducts({ session_key: sessionKey, limit: 200 })
      setProducts(response.data.results || [])
    } catch (error) {
      console.error('Error loading products:', error)
      toast.error('Failed to load products')
    }
  }

  const loadCompanyDetails = async () => {
    if (!sessionKey) {
      console.error('No session key available for loading company details')
      return
    }
    try {
      const serviceUser = useServiceUserStore.getState().serviceUser
      if (serviceUser?.company_id) {
        const response = await apiClient.get(`/api/auth/service-user/company/${serviceUser.company_id}/`, {
          headers: { 'Authorization': `Bearer ${sessionKey}` },
          params: { session_key: sessionKey }
        })
        setCompanyDetails(response.data)
      }
    } catch (error) {
      console.error('Error loading company details:', error)
      // Don't show error toast for company details as it's not critical
    }
  }

  // Handle customer selection
  const handleCustomerSelect = async (customer: Customer) => {
    setCustomerSearch(customer.name)
    setShowCustomerDropdown(false)

    if (!sessionKey) {
      console.error('No session key available for customer selection')
      setSelectedCustomer(customer)
      setFormData(prev => ({ ...prev, customer: customer.id, shipping_address: null }))
      return
    }

    try {
      const response = await apiClient.getFinanceCustomer(customer.id, { session_key: sessionKey })
      const fullCustomer = response.data
      setSelectedCustomer(fullCustomer)
      setFormData(prev => ({
        ...prev,
        customer: fullCustomer.id,
        shipping_address: fullCustomer.shipping_addresses?.find((addr: ShippingAddress) => addr.is_default)?.id || null
      }))
    } catch (error) {
      console.error('Error fetching customer details:', error)
      toast.error('Failed to load customer details, using basic info')
      setSelectedCustomer(customer)
      setFormData(prev => ({ ...prev, customer: customer.id, shipping_address: null }))
    }
  }

  // Handle product addition
  const handleAddProduct = (product: Product) => {
    // Check if product already exists
    const existingIndex = formData.quotation_items.findIndex(item => item.product === product.id)
    if (existingIndex >= 0) {
      // If exists, increase quantity
      handleUpdateItem(existingIndex, 'quantity', formData.quotation_items[existingIndex].quantity + 1)
      return
    }

    const newItem: QuotationItem = {
      product: product.id,
      quantity: 1,
      unit_price: product.selling_price, // Use selling_price from product
      hsn_sac_code: product.hsn_code_display || product.sac_code_display || '', // Use display fields
      gst_rate: product.gst_rate
    }

    setFormData(prev => ({
      ...prev,
      quotation_items: [...prev.quotation_items, newItem]
    }))

    setProductSearch('')
    setShowProductDropdown(false)
  }

  // Remove product
  const handleRemoveProduct = (index: number) => {
    setFormData(prev => ({
      ...prev,
      quotation_items: prev.quotation_items.filter((_, i) => i !== index)
    }))
  }

  // Update product quantity/price
  const handleUpdateItem = (index: number, field: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      quotation_items: prev.quotation_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Determine GST type based on customer and company GSTIN
  const determineGSTType = () => {
    // Check if we have customer GSTIN (from selectedCustomer or quotation data)
    const customerGstin = selectedCustomer?.gstin || quotation?.customer_gstin
    // Check if we have company GSTIN (from companyDetails or quotation data)
    const companyGstin = companyDetails?.gst_number || quotation?.company_gstin

    if (!customerGstin || !companyGstin) {
      return 'exempt'
    }

    const customerStateCode = customerGstin.substring(0, 2)
    const companyStateCode = companyGstin.substring(0, 2)

    return customerStateCode === companyStateCode ? 'cgst_sgst' : 'igst'
  }

  // Calculate totals with GST breakdown
  const calculateTotals = () => {
    const subtotal = formData.quotation_items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity?.toString() || '0') || 0
      const unitPrice = parseFloat(item.unit_price?.toString() || '0') || 0
      return sum + (quantity * unitPrice)
    }, 0)

    const gstType = determineGSTType()
    let totalTax = 0
    let cgstAmount = 0
    let sgstAmount = 0
    let igstAmount = 0

    // Calculate tax based on GST type - only if not exempt
    if (gstType !== 'exempt') {
      formData.quotation_items.forEach(item => {
        const quantity = parseFloat(item.quantity?.toString() || '0') || 0
        const unitPrice = parseFloat(item.unit_price?.toString() || '0') || 0
        const gstRate = parseFloat(item.gst_rate?.toString() || '0') || 0
        const lineTotal = quantity * unitPrice
        const itemTax = (lineTotal * gstRate) / 100

        totalTax += itemTax

        if (gstType === 'cgst_sgst') {
          // Split equally between CGST and SGST
          cgstAmount += itemTax / 2
          sgstAmount += itemTax / 2
        } else if (gstType === 'igst') {
          // Full amount as IGST
          igstAmount += itemTax
        }
      })
    }

    const totalAmount = subtotal + totalTax

    return {
      subtotal,
      totalTax,
      totalAmount,
      gstType,
      cgstAmount,
      sgstAmount,
      igstAmount
    }
  }

  const totals = calculateTotals()

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.customer) newErrors.customer = 'Customer is required'
    if (!formData.quotation_date) newErrors.quotation_date = 'Quotation date is required'
    if (!formData.valid_until) newErrors.valid_until = 'Valid until date is required'
    if (formData.quotation_items.length === 0) newErrors.quotation_items = 'At least one product is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setLoading(true)
    try {
      if (!sessionKey) {
        toast.error('Session expired. Please login again.')
        return
      }

      const submitData = { ...formData }

      if (quotation) {
        await apiClient.updateFinanceQuotation(quotation.id, { ...submitData, session_key: sessionKey })
        toast.success('Quotation updated successfully!')
      } else {
        await apiClient.createFinanceQuotation({ ...submitData, session_key: sessionKey })
        toast.success('Quotation created successfully!')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving quotation:', error)
      const message = error.response?.data?.message || error.response?.data?.error || 'Error saving quotation. Please try again.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {quotation ? 'Edit Quotation' : 'Create New Quotation'}
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
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Customer *
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search and select customer..."
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value)
                  setShowCustomerDropdown(true)
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {showCustomerDropdown && customers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customers
                    .filter(customer =>
                      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                      customer.customer_code.toLowerCase().includes(customerSearch.toLowerCase())
                    )
                    .map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{customer.customer_code} | {customer.email}</div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            {errors.customer && <p className="mt-1 text-sm text-red-600">{errors.customer}</p>}
          </div>

          {/* Customer Details Display */}
          {selectedCustomer && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">Customer Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><strong>GSTIN:</strong> {selectedCustomer.gstin || 'Not provided'}</div>
                <div><strong>PAN:</strong> {selectedCustomer.pan_number || 'Not provided'}</div>
                <div><strong>Email:</strong> {selectedCustomer.email || 'Not provided'}</div>
                <div><strong>Phone:</strong> {selectedCustomer.phone || 'Not provided'}</div>
                <div className="md:col-span-2">
                  <strong>Billing Address:</strong><br />
                  {selectedCustomer.billing_address_line1}<br />
                  {selectedCustomer.billing_address_line2 && <>{selectedCustomer.billing_address_line2}<br /></>}
                  {selectedCustomer.billing_city}, {selectedCustomer.billing_state} {selectedCustomer.billing_pincode}
                </div>
              </div>
            </div>
          )}

          {/* Shipping Address Selection */}
          {selectedCustomer && selectedCustomer.shipping_addresses && selectedCustomer.shipping_addresses.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Shipping Address
              </label>
              <select
                value={formData.shipping_address || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: e.target.value ? parseInt(e.target.value) : null }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Select shipping address</option>
                {selectedCustomer.shipping_addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label} - {address.city}, {address.state}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quotation Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Quotation Date *
              </label>
              <input
                type="date"
                value={formData.quotation_date}
                onChange={(e) => setFormData(prev => ({ ...prev, quotation_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.quotation_date && <p className="mt-1 text-sm text-red-600">{errors.quotation_date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Valid Until *
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {errors.valid_until && <p className="mt-1 text-sm text-red-600">{errors.valid_until}</p>}
            </div>
          </div>

          {/* Product Selection and Selected Products - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Product Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                Add Products *
              </label>
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search products to add..."
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value)
                    setShowProductDropdown(true)
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {showProductDropdown && products.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {products
                      .filter(product =>
                        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                        product.product_code.toLowerCase().includes(productSearch.toLowerCase())
                      )
                      .map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleAddProduct(product)}
                          className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {product.product_code} | HSN/SAC: {product.hsn_code_display || product.sac_code_display || 'N/A'} | GST: {product.gst_rate}% | ₹{product.selling_price}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
              {errors.quotation_items && <p className="mt-1 text-sm text-red-600">{errors.quotation_items}</p>}
            </div>

            {/* Right Column - Selected Products */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">Selected Products</h4>
                {formData.quotation_items.length > 0 && (
                  <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                    GST: {totals.gstType === 'igst' ? 'IGST (Inter-State)' : totals.gstType === 'cgst_sgst' ? 'CGST+SGST (Intra-State)' : 'Exempt'}
                  </div>
                )}
              </div>
              {formData.quotation_items.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {formData.quotation_items.map((item, index) => {
                    const product = products.find(p => p.id === item.product)
                    return (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {product?.name || 'Unknown Product'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {product?.product_code} | HSN/SAC: {item.hsn_sac_code} | GST: {item.gst_rate}%
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Price</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => handleUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Line Total</label>
                            <div className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-600 rounded text-gray-900 dark:text-white">
                              ₹{((parseFloat(item.quantity?.toString() || '0') || 0) * (parseFloat(item.unit_price?.toString() || '0') || 0)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-gray-500 dark:text-gray-400 text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <p className="mb-4">No products selected. Search and select products from the left panel.</p>
                  {selectedCustomer && companyDetails && (
                    <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-sm">
                      <p className="font-medium text-gray-900 dark:text-white text-center">
                        GST Type: {determineGSTType() === 'igst' ? 'Inter-State (IGST)' :
                                  determineGSTType() === 'cgst_sgst' ? 'Intra-State (CGST + SGST)' : 'Tax Exempt'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quotation Summary */}
          {formData.quotation_items.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quotation Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{(totals.subtotal || 0).toFixed(2)}</span>
                </div>

                {/* GST Breakdown */}
                {totals.gstType === 'cgst_sgst' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>CGST ({totals.cgstAmount > 0 ? ((totals.cgstAmount / (totals.subtotal || 1)) * 100).toFixed(1) : '0'}%):</span>
                      <span>₹{(totals.cgstAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>SGST ({totals.sgstAmount > 0 ? ((totals.sgstAmount / (totals.subtotal || 1)) * 100).toFixed(1) : '0'}%):</span>
                      <span>₹{(totals.sgstAmount || 0).toFixed(2)}</span>
                    </div>
                  </>
                )}

                {totals.gstType === 'igst' && (
                  <div className="flex justify-between text-sm">
                    <span>IGST ({totals.igstAmount > 0 ? ((totals.igstAmount / (totals.subtotal || 1)) * 100).toFixed(1) : '0'}%):</span>
                    <span>₹{(totals.igstAmount || 0).toFixed(2)}</span>
                  </div>
                )}

                {totals.gstType === 'exempt' && (
                  <div className="flex justify-between text-sm">
                    <span>Tax (Exempt):</span>
                    <span>₹0.00</span>
                  </div>
                )}

                {/* GST Type Information */}
                {totals.gstType && (
                  <div className={`text-xs p-3 rounded-lg ${
                    totals.gstType === 'exempt'
                      ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                      : 'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                  }`}>
                    <div className="font-medium">
                      GST Type: {totals.gstType === 'igst' ? 'Inter-State (IGST)' : totals.gstType === 'cgst_sgst' ? 'Intra-State (CGST + SGST)' : 'Tax Exempt'}
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total Amount:</span>
                    <span>₹{(totals.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Internal Notes
              </label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Internal notes (not visible to customer)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Terms and Conditions
              </label>
              <textarea
                rows={4}
                value={formData.terms_and_conditions}
                onChange={(e) => setFormData(prev => ({ ...prev, terms_and_conditions: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Terms and conditions for this quotation"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : quotation ? 'Update Quotation' : 'Create Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default QuotationForm