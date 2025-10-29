import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Eye, FileText, Calendar, User, Upload } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

interface VendorInvoice {
  id: number
  our_reference_number: string
  vendor_invoice_number: string
  vendor_invoice_date: string
  vendor_name: string
  vendor_code: string
  purchase_request_number: string
  due_date: string
  status: string
  payment_status: string
  gst_type: string
  subtotal: number
  total_tax: number
  total_amount: number
  paid_amount: number
  outstanding_amount: number
  item_count: number
  created_at: string
  created_by_name: string
}

interface Vendor {
  id: number
  vendor_code: string
  name: string
  is_active: boolean
}

interface Product {
  id: number
  product_code: string
  name: string
  unit: string
  selling_price: number
  gst_rate: number
}

interface VendorInvoicesProps {
  sessionKey?: string
}

const VendorInvoices: React.FC<VendorInvoicesProps> = ({ sessionKey: propSessionKey }) => {
  const { sessionKey: storeSessionKey } = useServiceUserStore()
  const sessionKey = propSessionKey || storeSessionKey
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<VendorInvoice | null>(null)
  const [formData, setFormData] = useState({
    vendor: '',
    vendor_invoice_number: '',
    vendor_invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    subtotal: 0,
    total_tax: 0,
    total_amount: 0,
    notes: '',
    invoice_file: null as File | null,
    items: [
      {
        product: '',
        quantity: 1,
        unit_price: 0
      }
    ]
  })

  // Fetch data
  const fetchVendorInvoices = async () => {
    if (!sessionKey) return

    try {
      setIsLoading(true)
      const response = await api.get('/api/finance/vendor-invoices/', {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      setVendorInvoices(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching vendor invoices:', error)
      toast.error('Failed to fetch vendor invoices')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchVendors = async () => {
    if (!sessionKey) return

    try {
      const response = await api.get('/api/finance/vendors/dropdown/', {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      setVendors(response.data || [])
    } catch (error: any) {
      console.error('Error fetching vendors:', error)
    }
  }

  const fetchProducts = async () => {
    if (!sessionKey) return

    try {
      const response = await api.get('/api/finance/products/', {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      setProducts(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching products:', error)
    }
  }

  useEffect(() => {
    fetchVendorInvoices()
    fetchVendors()
    fetchProducts()
  }, [sessionKey])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    try {
      const dataToSend = {
        vendor: formData.vendor,
        vendor_invoice_number: formData.vendor_invoice_number,
        vendor_invoice_date: formData.vendor_invoice_date,
        due_date: formData.due_date,
        notes: formData.notes,
        invoice_items: formData.items.map((item, index) => ({
          product: parseInt(item.product),
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_number: index + 1
        }))
      }

      if (editingInvoice) {
        // Update vendor invoice
        await api.put(`/api/finance/vendor-invoices/${editingInvoice.id}/`, dataToSend)
        toast.success('Vendor invoice updated successfully')
      } else {
        // Create vendor invoice
        await api.post('/api/finance/vendor-invoices/', dataToSend, {
          headers: { 
            Authorization: `Bearer ${sessionKey}`,
            'Content-Type': 'application/json'
          }
        })
        toast.success('Vendor invoice created successfully')
      }
      
      setShowForm(false)
      setEditingInvoice(null)
      resetForm()
      fetchVendorInvoices()
    } catch (error: any) {
      console.error('Error saving vendor invoice:', error)
      toast.error(error.response?.data?.message || 'Failed to save vendor invoice')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      vendor: '',
      vendor_invoice_number: '',
      vendor_invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      subtotal: 0,
      total_tax: 0,
      total_amount: 0,
      notes: '',
      invoice_file: null,
      items: [
        {
          product: '',
          quantity: 1,
          unit_price: 0
        }
      ]
    })
  }

  // Handle view
  const handleView = async (invoice: VendorInvoice) => {
    if (!sessionKey) return
    
    try {
      await api.get(`/api/finance/vendor-invoices/${invoice.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      // Show invoice details in a modal or navigate to detail page
      alert(`Viewing invoice: ${invoice.vendor_invoice_number}\nVendor: ${invoice.vendor_name}\nAmount: ₹${invoice.total_amount.toLocaleString()}\nStatus: ${invoice.status}`)
    } catch (error: any) {
      console.error('Error fetching invoice details:', error)
      toast.error('Failed to load invoice details')
    }
  }

  // Handle edit
  const handleEdit = async (invoice: VendorInvoice) => {
    if (!sessionKey) return
    
    try {
      const response = await api.get(`/api/finance/vendor-invoices/${invoice.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      const invoiceData = response.data
      
      // Populate form with existing data
      setFormData({
        vendor: invoiceData.vendor.toString(),
        vendor_invoice_number: invoiceData.vendor_invoice_number,
        vendor_invoice_date: invoiceData.vendor_invoice_date,
        due_date: invoiceData.due_date,
        subtotal: invoiceData.subtotal,
        total_tax: invoiceData.total_tax,
        total_amount: invoiceData.total_amount,
        notes: invoiceData.notes || '',
        invoice_file: null,
        items: invoiceData.invoice_items?.map((item: any) => ({
          product: item.product.toString(),
          quantity: item.quantity,
          unit_price: item.unit_price
        })) || [{ product: '', quantity: 1, unit_price: 0 }]
      })
      
      setEditingInvoice(invoice)
      setShowForm(true)
    } catch (error: any) {
      console.error('Error fetching invoice for edit:', error)
      toast.error('Failed to load invoice for editing')
    }
  }

  // Handle delete
  const handleDelete = async (invoice: VendorInvoice) => {
    if (!sessionKey) return
    if (!confirm(`Are you sure you want to delete vendor invoice "${invoice.vendor_invoice_number}"?`)) return

    try {
      await api.delete(`/api/finance/vendor-invoices/${invoice.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      toast.success('Vendor invoice deleted successfully')
      fetchVendorInvoices()
    } catch (error: any) {
      console.error('Error deleting vendor invoice:', error)
      toast.error('Failed to delete vendor invoice')
    }
  }

  // Add item to form
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unit_price: 0 }]
    }))
  }

  // Remove item from form
  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  // Update item in form
  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => {
      products.find(p => p.id.toString() === item.product)
      const lineTotal = item.quantity * item.unit_price
      return sum + lineTotal
    }, 0)

    const totalTax = formData.items.reduce((sum, item) => {
      const product = products.find(p => p.id.toString() === item.product)
      const lineTotal = item.quantity * item.unit_price
      const tax = product ? (lineTotal * product.gst_rate) / 100 : 0
      return sum + tax
    }, 0)

    const totalAmount = subtotal + totalTax

    setFormData(prev => ({
      ...prev,
      subtotal,
      total_tax: totalTax,
      total_amount: totalAmount
    }))
  }

  // Recalculate totals when items change
  useEffect(() => {
    calculateTotals()
  }, [formData.items, products])

  // Filter vendor invoices
  const filteredInvoices = vendorInvoices.filter(invoice => {
    const matchesSearch = invoice.vendor_invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.our_reference_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         invoice.vendor_code.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || 
                         invoice.status === filterStatus ||
                         invoice.payment_status === filterStatus

    return matchesSearch && matchesFilter
  })

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'received': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'verified': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'paid': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'unpaid': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'partially_paid': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Vendor Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage invoices received from vendors</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setEditingInvoice(null)
            setShowForm(true)
          }}
          className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Invoice
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search vendor invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="received">Received</option>
                <option value="verified">Verified</option>
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Invoices List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{invoice.vendor_invoice_number}</CardTitle>
                    <CardDescription>{invoice.vendor_name}</CardDescription>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleView(invoice)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(invoice)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(invoice)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                  {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.payment_status)}`}>
                  {invoice.payment_status.replace('_', ' ').charAt(0).toUpperCase() + invoice.payment_status.replace('_', ' ').slice(1)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-500 dark:text-gray-400">Our Ref:</span>
                <span className="font-medium">{invoice.our_reference_number}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(invoice.vendor_invoice_date).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-red-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  Due: {new Date(invoice.due_date).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{invoice.created_by_name}</span>
              </div>
              
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Amount:</span>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    ₹{invoice.total_amount.toLocaleString()}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Paid:</span>
                    <span className="text-green-600 dark:text-green-400">₹{invoice.paid_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Outstanding:</span>
                    <span className="text-red-600 dark:text-red-400">₹{invoice.outstanding_amount.toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Payment Progress Bar */}
                <div className="mt-2">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${invoice.total_amount > 0 ? (invoice.paid_amount / invoice.total_amount) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {invoice.total_amount > 0 ? Math.round((invoice.paid_amount / invoice.total_amount) * 100) : 0}% paid
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No vendor invoices found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first vendor invoice'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button
                onClick={() => {
                  resetForm()
                  setEditingInvoice(null)
                  setShowForm(true)
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Invoice
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vendor Invoice Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingInvoice ? 'Edit Vendor Invoice' : 'New Vendor Invoice'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vendor *
                    </label>
                    <select
                      value={formData.vendor}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select Vendor</option>
                      {vendors.map(vendor => (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.vendor_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vendor Invoice Number *
                    </label>
                    <input
                      type="text"
                      value={formData.vendor_invoice_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendor_invoice_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Invoice Date *
                    </label>
                    <input
                      type="date"
                      value={formData.vendor_invoice_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendor_invoice_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* Invoice File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invoice File
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setFormData(prev => ({ ...prev, invoice_file: e.target.files?.[0] || null }))}
                      className="hidden"
                      id="invoice-file"
                    />
                    <label
                      htmlFor="invoice-file"
                      className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </label>
                    {formData.invoice_file && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formData.invoice_file.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Items</h3>
                    <Button type="button" onClick={addItem} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Product *
                            </label>
                            <select
                              value={item.product}
                              onChange={(e) => updateItem(index, 'product', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              required
                            >
                              <option value="">Select Product</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name} ({product.product_code})
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Unit Price (₹) *
                            </label>
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              min="0"
                              step="0.01"
                              required
                            />
                          </div>
                        </div>
                        
                        {formData.items.length > 1 && (
                          <div className="mt-4 flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals Display */}
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Invoice Totals</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-medium">₹{formData.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                      <span className="font-medium">₹{formData.total_tax.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                      <span>Total Amount:</span>
                      <span>₹{formData.total_amount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false)
                      setEditingInvoice(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  >
                    {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VendorInvoices