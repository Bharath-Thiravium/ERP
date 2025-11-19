import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Eye, FileText, Calendar, User } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

interface PurchaseRequest {
  id: number
  request_number: string
  vendor_name: string
  vendor_code: string
  request_date: string
  required_by_date: string
  status: string
  gst_type: string
  subtotal: number
  total_tax: number
  total_amount: number
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

interface PurchaseRequestsProps {
  sessionKey?: string
}

const PurchaseRequests: React.FC<PurchaseRequestsProps> = ({ sessionKey: propSessionKey }) => {
  const { sessionKey: storeSessionKey } = useServiceUserStore()
  const sessionKey = propSessionKey || storeSessionKey
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingRequest, setEditingRequest] = useState<PurchaseRequest | null>(null)
  const [formData, setFormData] = useState({
    vendor: '',
    request_date: new Date().toISOString().split('T')[0],
    required_by_date: '',
    reference: '',
    notes: '',
    terms_and_conditions: '',
    items: [
      {
        product: '',
        quantity: 1,
        unit_price: 0
      }
    ]
  })

  // Fetch data
  const fetchPurchaseRequests = async () => {
    if (!sessionKey) return

    try {
      setIsLoading(true)
      const response = await api.get('/api/finance/purchase-requests/', {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      setPurchaseRequests(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching purchase requests:', error)
      toast.error('Failed to fetch purchase requests')
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
    fetchPurchaseRequests()
    fetchVendors()
    fetchProducts()
  }, [sessionKey])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    try {
      const requestData = {
        ...formData,
        request_items: formData.items.map((item, index) => ({
          ...item,
          line_number: index + 1
        }))
      }

      if (editingRequest) {
        // Update purchase request
        await api.put(`/api/finance/purchase-requests/${editingRequest.id}/`, requestData)
        toast.success('Purchase request updated successfully')
      } else {
        // Create purchase request
        await api.post('/api/finance/purchase-requests/', requestData, {
          headers: { Authorization: `Bearer ${sessionKey}` }
        })
        toast.success('Purchase request created successfully')
      }
      
      setShowForm(false)
      setEditingRequest(null)
      resetForm()
      fetchPurchaseRequests()
    } catch (error: any) {
      console.error('Error saving purchase request:', error)
      toast.error(error.response?.data?.message || 'Failed to save purchase request')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      vendor: '',
      request_date: new Date().toISOString().split('T')[0],
      required_by_date: '',
      reference: '',
      notes: '',
      terms_and_conditions: '',
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
  const handleView = async (request: PurchaseRequest) => {
    console.log('View clicked for request:', request.id)
    console.log('Session key available:', !!sessionKey)
    
    if (!sessionKey) {
      toast.error('No session key available')
      return
    }

    try {
      console.log('Making API call to view request:', request.id)
      const response = await api.get(`/api/finance/purchase-requests/${request.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      console.log('API response:', response.data)
      // Show detailed view in a modal or alert for now
      const details = response.data
      alert(`Purchase Request Details:\n\nRequest Number: ${details.request_number}\nVendor: ${details.vendor_name}\nStatus: ${details.status}\nTotal Amount: ₹${details.total_amount}\nItems: ${details.item_count}\nCreated: ${new Date(details.created_at).toLocaleDateString()}`)
    } catch (error: any) {
      console.error('Error fetching purchase request details:', error)
      toast.error('Failed to load purchase request details')
    }
  }

  // Handle edit
  const handleEdit = async (request: PurchaseRequest) => {
    console.log('Edit clicked for request:', request.id)
    console.log('Session key available:', !!sessionKey)
    
    if (!sessionKey) {
      toast.error('No session key available')
      return
    }

    try {
      console.log('Making API call to edit request:', request.id)
      const response = await api.get(`/api/finance/purchase-requests/${request.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      console.log('Edit API response:', response.data)
      const details = response.data
      setFormData({
        vendor: details.vendor.toString(),
        request_date: details.request_date,
        required_by_date: details.required_by_date || '',
        reference: details.reference || '',
        notes: details.notes || '',
        terms_and_conditions: details.terms_and_conditions || '',
        items: details.request_items?.map((item: any) => ({
          product: item.product.toString(),
          quantity: item.quantity,
          unit_price: item.unit_price
        })) || [{ product: '', quantity: 1, unit_price: 0 }]
      })
      
      setEditingRequest(request)
      setShowForm(true)
    } catch (error: any) {
      console.error('Error fetching purchase request for edit:', error)
      toast.error('Failed to load purchase request for editing')
    }
  }

  // Handle delete
  const handleDelete = async (request: PurchaseRequest) => {
    if (!sessionKey) return
    if (!confirm(`Are you sure you want to delete purchase request "${request.request_number}"?`)) return

    try {
      await api.delete(`/api/finance/purchase-requests/${request.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      toast.success('Purchase request deleted successfully')
      fetchPurchaseRequests()
    } catch (error: any) {
      console.error('Error deleting purchase request:', error)
      toast.error('Failed to delete purchase request')
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

  // Filter purchase requests
  const filteredRequests = purchaseRequests.filter(request => {
    const matchesSearch = request.request_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.vendor_code.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || request.status === filterStatus

    return matchesSearch && matchesFilter
  })

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'converted': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Requests</h1>
          <p className="text-gray-600 dark:text-gray-400">Send purchase requests to vendors</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setEditingRequest(null)
            setShowForm(true)
          }}
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Request
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
                  placeholder="Search purchase requests..."
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
                <option value="sent">Sent</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="converted">Converted</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Requests List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredRequests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{request.request_number}</CardTitle>
                    <CardDescription>{request.vendor_name}</CardDescription>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('View button clicked!')
                      handleView(request)
                    }}
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('Edit button clicked!')
                      handleEdit(request)
                    }}
                    title="Edit Request"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      console.log('Delete button clicked!')
                      handleDelete(request)
                    }}
                    title="Delete Request"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                  {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {request.item_count} item{request.item_count !== 1 ? 's' : ''}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(request.request_date).toLocaleDateString()}
                </span>
              </div>
              
              {request.required_by_date && (
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-red-400" />
                  <span className="text-gray-600 dark:text-gray-400">
                    Required by: {new Date(request.required_by_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{request.created_by_name}</span>
              </div>
              
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Amount:</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    ₹{request.total_amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                  <span>₹{request.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Tax:</span>
                  <span>₹{request.total_tax.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No purchase requests found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first purchase request'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button
                onClick={() => {
                  resetForm()
                  setEditingRequest(null)
                  setShowForm(true)
                }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Request
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Purchase Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingRequest ? 'Edit Purchase Request' : 'New Purchase Request'}
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
                      Request Date *
                    </label>
                    <input
                      type="date"
                      value={formData.request_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, request_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Required By Date
                    </label>
                    <input
                      type="date"
                      value={formData.required_by_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, required_by_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
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
                      setEditingRequest(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    {editingRequest ? 'Update Request' : 'Create Request'}
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

export default PurchaseRequests