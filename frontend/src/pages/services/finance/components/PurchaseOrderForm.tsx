import React, { useState, useEffect } from 'react'
import { X, User, Calendar, Search, Trash2, MapPin, Upload, FileText } from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import axios from 'axios'
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
  address_line1: string
  address_line2: string
  city: string
  state: string
  pincode: string
  country: string
  is_default: boolean
}

interface Product {
  id: number
  name: string
  product_code: string
  description: string
  unit: string
  selling_price: number
  gst_rate: number
  hsn_code?: { code: string }
  sac_code?: { code: string }
}

interface Quotation {
  id: number
  quotation_number: string
  customer: number
  customer_details?: Customer
  quotation_date: string
  valid_until: string
  reference: string
  shipping_address: number | null
  discount_percentage: number
  discount_amount: number
  shipping_charges: number
  other_charges: number
  notes: string
  terms_and_conditions: string
  quotation_items: Array<{
    product: number
    quantity: number
    unit_price: number
    hsn_sac_code: string
    gst_rate: number
  }>
}

interface PurchaseOrder {
  id?: number
  internal_po_number?: string
  quotation: number
  po_number: string
  po_date: string
  po_file?: File | null
  customer: number
  quotation_date: string
  valid_until: string
  reference: string
  shipping_address: number | null
  discount_percentage: number
  discount_amount: number
  shipping_charges: number
  other_charges: number
  notes: string
  terms_and_conditions: string
  status: string
  claim_type: string
  po_items: Array<{
    product: number
    quantity: number
    unit_price: number
    hsn_sac_code: string
    gst_rate: number
  }>
}

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder | null
  quotation?: Quotation | null
  onClose: () => void
  onSuccess: () => void
}

const PurchaseOrderForm: React.FC<PurchaseOrderFormProps> = ({ purchaseOrder, quotation, onClose, onSuccess }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [companyDetails, setCompanyDetails] = useState<any>(null)
  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [formData, setFormData] = useState<PurchaseOrder>({
    quotation: quotation?.id || 0,
    po_number: '',
    po_date: new Date().toISOString().split('T')[0],
    po_file: null,
    customer: quotation?.customer || 0,
    quotation_date: quotation?.quotation_date || new Date().toISOString().split('T')[0],
    valid_until: quotation?.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    reference: quotation?.reference || '',
    shipping_address: quotation?.shipping_address || null,
    discount_percentage: Number(quotation?.discount_percentage) || 0,
    discount_amount: Number(quotation?.discount_amount) || 0,
    shipping_charges: Number(quotation?.shipping_charges) || 0,
    other_charges: Number(quotation?.other_charges) || 0,
    notes: quotation?.notes || '',
    terms_and_conditions: quotation?.terms_and_conditions || '',
    status: 'draft',
    claim_type: '',
    po_items: quotation?.quotation_items || []
  })

  useEffect(() => {
    if (sessionKey) {
      loadCustomers()
      loadProducts()
      loadCompanyDetails()
    }
  }, [sessionKey])

  // Populate form when editing existing PO or creating from quotation
  useEffect(() => {
    if (purchaseOrder) {
      console.log('Editing PO:', purchaseOrder)
      // Convert PO items from detailed format to form format
      const convertedItems = purchaseOrder.po_items ? purchaseOrder.po_items.map((item: any) => ({
        product: item.product,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        hsn_sac_code: item.hsn_sac_code || '',
        gst_rate: parseFloat(item.gst_rate) || 0
      })) : []

      setFormData({
        ...purchaseOrder,
        po_items: convertedItems
      })

      // Set selected customer if available - use customer_details for detailed view
      const customerData = (purchaseOrder as any).customer_details || purchaseOrder.customer
      if (customerData) {
        if (typeof customerData === 'object') {
          setSelectedCustomer(customerData)

        } else {
          loadCustomerDetails(customerData)
        }
      }
    } else if (quotation) {
      console.log('Creating PO from quotation:', quotation)
      console.log('Full quotation object keys:', Object.keys(quotation))

      // Check if we have full quotation details or just basic data
      if (quotation.customer_details) {
        // We have full quotation details, proceed normally
        console.log('Full quotation details available')
        populateFormFromQuotation(quotation)
      } else {
        // We only have basic quotation data, need to load full details
        console.log('Loading full quotation details for ID:', quotation.id)
        loadFullQuotationDetails(quotation.id)
      }
    }
  }, [purchaseOrder, quotation])

  // Load customer details if we have customer ID but no selected customer
  useEffect(() => {
    if (formData.customer && !selectedCustomer && sessionKey && customers.length > 0) {
      console.log('Loading customer details for ID:', formData.customer)
      // First try to find customer in loaded customers list
      const foundCustomer = customers.find(c => c.id === formData.customer)
      if (foundCustomer) {
        console.log('Found customer in list:', foundCustomer)
        setSelectedCustomer(foundCustomer)

      } else {
        loadCustomerDetails(formData.customer)
      }
    }
  }, [formData.customer, selectedCustomer, sessionKey, customers])

  // Load full quotation details including customer_details
  const loadFullQuotationDetails = async (quotationId: number) => {
    if (!sessionKey) return

    try {
      console.log('Loading full quotation details for ID:', quotationId)
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/quotations/${quotationId}/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })

      const fullQuotation = response.data
      console.log('Loaded full quotation details:', fullQuotation)
      populateFormFromQuotation(fullQuotation)
    } catch (error) {
      console.error('Error loading full quotation details:', error)
      toast.error('Failed to load quotation details')
    }
  }

  // Populate form from quotation data
  const populateFormFromQuotation = (quotationData: any) => {
    console.log('Populating form from quotation:', quotationData)
    console.log('Quotation items:', quotationData.quotation_items)

    // Convert quotation items from detailed format to form format
    const convertedItems = quotationData.quotation_items ? quotationData.quotation_items.map((item: any) => {
      console.log('Converting quotation item:', item)
      return {
        product: item.product,
        quantity: parseFloat(item.quantity) || 0,
        unit_price: parseFloat(item.unit_price) || 0,
        hsn_sac_code: item.hsn_sac_code || '',
        gst_rate: parseFloat(item.gst_rate) || 0
      }
    }) : []

    console.log('Converted items:', convertedItems)

    setFormData(prev => ({
      ...prev,
      quotation: quotationData.id,
      customer: quotationData.customer || 0,
      quotation_date: quotationData.quotation_date,
      valid_until: quotationData.valid_until,
      reference: quotationData.reference || '',
      shipping_address: quotationData.shipping_address,
      discount_percentage: Number(quotationData.discount_percentage) || 0,
      discount_amount: Number(quotationData.discount_amount) || 0,
      shipping_charges: Number(quotationData.shipping_charges) || 0,
      other_charges: Number(quotationData.other_charges) || 0,
      notes: quotationData.notes || '',
      terms_and_conditions: quotationData.terms_and_conditions || '',
      po_items: convertedItems
    }))

    // Set selected customer if available - use customer_details for detailed view
    console.log('Quotation customer data:', quotationData.customer_details, quotationData.customer)

    const customerData = quotationData.customer_details || quotationData.customer
    if (customerData && typeof customerData === 'object') {
      console.log('Setting customer from object:', customerData)
      setSelectedCustomer(customerData)
    } else {
      // Try to get customer ID from the quotation.customer field
      const customerId = quotationData.customer
      if (customerId) {
        console.log('Loading customer details for ID:', customerId)
        loadCustomerDetails(customerId)
      } else {
        console.log('No customer ID found in quotation')
      }
    }
  }

  const loadCustomers = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/finance/customers/', {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })
      setCustomers(response.data.results)
    } catch (error) {
      console.error('Error loading customers:', error)
    }
  }

  const loadProducts = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/finance/products/', {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })
      setProducts(response.data.results)
    } catch (error) {
      console.error('Error loading products:', error)
    }
  }

  const loadCompanyDetails = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/auth/company-profile/', {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })
      setCompanyDetails(response.data)
    } catch (error) {
      console.error('Error loading company details:', error)
    }
  }

  const loadCustomerDetails = async (customerId: number) => {
    if (!sessionKey || !customerId) return

    try {
      console.log('Loading customer details for ID:', customerId)
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/customers/${customerId}/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })

      const fullCustomer = response.data
      console.log('Loaded customer details:', fullCustomer)
      setSelectedCustomer(fullCustomer)

      // Also update form data with customer ID and default shipping address
      setFormData(prev => ({
        ...prev,
        customer: fullCustomer.id,
        shipping_address: fullCustomer.shipping_addresses?.find((addr: any) => addr.is_default)?.id || null
      }))
    } catch (error) {
      console.error('Error loading customer details:', error)
      toast.error('Failed to load customer details')
    }
  }



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    setFormData(prev => ({ ...prev, po_file: file }))
  }

  const handleAddProduct = (product: Product) => {
    const existingItemIndex = formData.po_items.findIndex(item => item.product === product.id)
    
    if (existingItemIndex >= 0) {
      // Update existing item quantity
      const updatedItems = [...formData.po_items]
      updatedItems[existingItemIndex].quantity += 1
      setFormData(prev => ({ ...prev, po_items: updatedItems }))
    } else {
      // Add new item
      const newItem = {
        product: product.id,
        quantity: 1,
        unit_price: product.selling_price,
        hsn_sac_code: product.hsn_code?.code || product.sac_code?.code || '',
        gst_rate: product.gst_rate
      }
      setFormData(prev => ({ ...prev, po_items: [...prev.po_items, newItem] }))
    }
    
    setProductSearch('')
    setShowProductDropdown(false)
  }

  const handleRemoveProduct = (index: number) => {
    const updatedItems = formData.po_items.filter((_, i) => i !== index)
    setFormData(prev => ({ ...prev, po_items: updatedItems }))
  }

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...formData.po_items]
    updatedItems[index].quantity = Math.max(0.01, quantity)
    setFormData(prev => ({ ...prev, po_items: updatedItems }))
  }

  const handleItemPriceChange = (index: number, price: number) => {
    const updatedItems = [...formData.po_items]
    updatedItems[index].unit_price = Math.max(0, price)
    setFormData(prev => ({ ...prev, po_items: updatedItems }))
  }

  const calculateTotals = () => {
    const subtotal = formData.po_items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    const discountAmount = formData.discount_percentage > 0 ? (subtotal * formData.discount_percentage / 100) : formData.discount_amount
    const subtotalAfterDiscount = subtotal - discountAmount

    // Calculate GST
    const gstType = determineGSTType()
    let totalTax = 0

    if (gstType !== 'exempt') {
      totalTax = formData.po_items.reduce((sum, item) => {
        const itemTotal = item.quantity * item.unit_price
        return sum + (itemTotal * item.gst_rate / 100)
      }, 0)
    }

    const subtotalWithCharges = subtotalAfterDiscount + formData.shipping_charges + formData.other_charges
    const totalAmount = subtotalWithCharges + totalTax

    return {
      subtotal: Number(subtotalAfterDiscount) || 0,
      totalTax: Number(totalTax) || 0,
      totalAmount: Number(totalAmount) || 0,
      gstType,
      discountAmount: Number(discountAmount) || 0,
      shippingCharges: Number(formData.shipping_charges) || 0,
      otherCharges: Number(formData.other_charges) || 0
    }
  }

  const determineGSTType = () => {
    const customerGstin = selectedCustomer?.gstin || ''
    const companyGstin = companyDetails?.gst_number || ''

    if (!customerGstin || !companyGstin) {
      return 'exempt'
    }

    const customerStateCode = customerGstin.substring(0, 2)
    const companyStateCode = companyGstin.substring(0, 2)

    return customerStateCode === companyStateCode ? 'cgst_sgst' : 'igst'
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.po_number.trim()) {
      newErrors.po_number = 'Client PO number is required'
    }

    if (!formData.po_date) {
      newErrors.po_date = 'PO date is required'
    }

    if (!formData.customer) {
      newErrors.customer = 'Customer is required'
    }

    if (!formData.quotation) {
      newErrors.quotation = 'Quotation is required'
    }

    if (formData.po_items.length === 0) {
      newErrors.po_items = 'At least one item is required'
    } else {
      // Validate each item
      const invalidItems = formData.po_items.filter(item =>
        !item.product || !item.quantity || item.quantity <= 0 || !item.unit_price || item.unit_price <= 0
      )
      if (invalidItems.length > 0) {
        newErrors.po_items = 'All items must have valid product, quantity, and price'
      }
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
      console.log('Form data before sending:', formData)

      const url = purchaseOrder
        ? `http://127.0.0.1:8000/api/finance/purchase-orders/${purchaseOrder.id}/`
        : 'http://127.0.0.1:8000/api/finance/purchase-orders/'

      const method = purchaseOrder ? 'patch' : 'post'

      let response;

      if (selectedFile) {
        // If there's a file, use FormData
        const formDataToSend = new FormData()

        // Add all form fields except po_items
        Object.entries(formData).forEach(([key, value]) => {
          if (key === 'po_items') {
            // Don't add po_items to FormData, we'll add it separately
            return
          } else if (key === 'po_file') {
            // Don't add po_file here, we'll add the selectedFile
            return
          } else if (value !== null && value !== undefined) {
            formDataToSend.append(key, value.toString())
          }
        })

        // Add po_items as JSON string for FormData
        formDataToSend.append('po_items', JSON.stringify(formData.po_items))

        // Add the file
        formDataToSend.append('po_file', selectedFile)

        // Add session key
        formDataToSend.append('session_key', sessionKey || '')

        console.log('Sending FormData with file')

        response = await axios[method](url, formDataToSend, {
          headers: {
            'Authorization': `Bearer ${sessionKey}`,
            'Content-Type': 'multipart/form-data'
          }
        })
      } else {
        // If no file, send JSON data
        const jsonData = {
          ...formData,
          session_key: sessionKey
        }

        console.log('Sending JSON data:', jsonData)

        response = await axios[method](url, jsonData, {
          headers: {
            'Authorization': `Bearer ${sessionKey}`,
            'Content-Type': 'application/json'
          }
        })
      }

      console.log('PO saved successfully:', response.data)

      toast.success(purchaseOrder ? 'Purchase order updated successfully!' : 'Purchase order created successfully!')
      onSuccess()
    } catch (error: any) {
      console.error('Error saving purchase order:', error)
      console.error('Error response:', error.response?.data)
      console.error('Error status:', error.response?.status)

      if (error.response?.data) {
        const errorData = error.response.data
        console.log('Error data type:', typeof errorData)
        console.log('Error data:', errorData)

        if (typeof errorData === 'object') {
          // Handle field-specific errors
          const fieldErrors: Record<string, string> = {}
          Object.entries(errorData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              fieldErrors[key] = String(value[0])
            } else if (typeof value === 'string') {
              fieldErrors[key] = value
            } else if (typeof value === 'object') {
              fieldErrors[key] = JSON.stringify(value)
            } else {
              fieldErrors[key] = String(value)
            }
          })
          setErrors(fieldErrors)
          toast.error('Please check the form for errors')
        } else {
          toast.error(`Failed to save purchase order: ${String(errorData)}`)
        }
      } else {
        toast.error('Failed to save purchase order. Please check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {purchaseOrder ? 'Edit Purchase Order' : 'Create Purchase Order'}
            </h2>
            {quotation && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                From Quotation: {quotation.quotation_number}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form id="po-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* PO Details Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Client PO Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Client PO Number *
                </label>
                <input
                  type="text"
                  value={formData.po_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter client's PO number"
                />
                {errors.po_number && <p className="mt-1 text-sm text-red-600">{errors.po_number}</p>}
              </div>

              {/* PO Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  PO Date *
                </label>
                <input
                  type="date"
                  value={formData.po_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, po_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                {errors.po_date && <p className="mt-1 text-sm text-red-600">{errors.po_date}</p>}
              </div>
            </div>

            {/* PO File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Upload className="w-4 h-4 inline mr-1" />
                PO File Attachment
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300"
                />
                {selectedFile && (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <FileText className="w-4 h-4 mr-1" />
                    {selectedFile.name}
                  </div>
                )}
              </div>
            </div>

            {/* Quotation Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Quotation Date
                </label>
                <input
                  type="date"
                  value={formData.quotation_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, quotation_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  readOnly={!!quotation}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  readOnly={!!quotation}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reference
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Customer PO number or reference"
                />
              </div>
            </div>

            {/* Customer Display */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Customer (From Quotation)
              </label>
              <input
                type="text"
                value={selectedCustomer?.name || 'Loading customer...'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white cursor-not-allowed"
                readOnly
              />
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

            {/* Shipping Address Display */}
            {selectedCustomer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Shipping Address (From Quotation)
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white text-sm">
                  {selectedCustomer.shipping_addresses && selectedCustomer.shipping_addresses.length > 0 ? (
                    selectedCustomer.shipping_addresses
                      .filter(addr => addr.id === formData.shipping_address)
                      .map(address => (
                        <div key={address.id}>
                          {address.address_line1}, {address.city}, {address.state} {address.pincode}
                          {address.is_default && ' (Default)'}
                        </div>
                      ))[0] || 'Same as billing address'
                  ) : (
                    'Same as billing address'
                  )}
                </div>
              </div>
            )}

            {/* Products Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Product Search */}
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Add Products</h4>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value)
                      setShowProductDropdown(true)
                    }}
                    onFocus={() => setShowProductDropdown(true)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Search products..."
                  />

                  {showProductDropdown && productSearch && (
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
                              {product.product_code} | ₹{product.selling_price} | GST: {product.gst_rate}%
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Selected Products */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-900 dark:text-white">Selected Products</h4>
                  {formData.po_items.length > 0 && (
                    <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                      GST: {totals.gstType === 'igst' ? 'IGST (Inter-State)' : totals.gstType === 'cgst_sgst' ? 'CGST+SGST (Intra-State)' : 'Exempt'}
                    </div>
                  )}
                </div>
                {formData.po_items.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {formData.po_items.map((item, index) => {
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
                                min="0.01"
                                step="0.01"
                                value={item.quantity}
                                onChange={(e) => handleItemQuantityChange(index, parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Unit Price</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price}
                                onChange={(e) => handleItemPriceChange(index, parseFloat(e.target.value) || 0)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Total</label>
                              <div className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-600 rounded text-gray-900 dark:text-white">
                                ₹{(item.quantity * item.unit_price).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 dark:text-gray-400 text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="mb-4">No products selected. {quotation ? 'Loading products from quotation...' : 'Search and select products from the left panel.'}</p>
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
                {errors.po_items && <p className="mt-2 text-sm text-red-600">{errors.po_items}</p>}
              </div>
            </div>

            {/* Summary Section */}
            {formData.po_items.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white">₹{totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Discount:</span>
                      <span className="text-red-600">-₹{totals.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.gstType === 'cgst_sgst' && totals.totalTax > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">CGST:</span>
                        <span className="text-gray-900 dark:text-white">₹{(totals.totalTax / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">SGST:</span>
                        <span className="text-gray-900 dark:text-white">₹{(totals.totalTax / 2).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {totals.gstType === 'igst' && totals.totalTax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">IGST:</span>
                      <span className="text-gray-900 dark:text-white">₹{totals.totalTax.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.shippingCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Shipping Charges:</span>
                      <span className="text-gray-900 dark:text-white">₹{totals.shippingCharges.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.otherCharges > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Other Charges:</span>
                      <span className="text-gray-900 dark:text-white">₹{totals.otherCharges.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-300 dark:border-gray-600 pt-2">
                    <div className="flex justify-between font-medium">
                      <span className="text-gray-900 dark:text-white">Total Amount:</span>
                      <span className="text-gray-900 dark:text-white">₹{totals.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

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
                  placeholder="Terms and conditions for this purchase order"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex-shrink-0">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formData.po_items.length} item{formData.po_items.length !== 1 ? 's' : ''} • Total: ₹{totals.totalAmount.toFixed(2)}
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="po-form"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : (purchaseOrder ? 'Update PO' : 'Create PO')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PurchaseOrderForm
