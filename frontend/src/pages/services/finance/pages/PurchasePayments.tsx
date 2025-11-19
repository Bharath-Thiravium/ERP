import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Edit, Trash2, Eye, CreditCard, Calendar, User, Receipt } from 'lucide-react'
import { Button } from '../../../../components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/Card'
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

interface PurchasePayment {
  id: number
  payment_number: string
  payment_date: string
  amount: number
  payment_method: string
  vendor_name: string
  vendor_code: string
  vendor_invoice_number: string
  our_reference_number: string
  tds_amount: number
  tds_percentage: number
  net_amount_paid: number
  reference_number: string
  bank_name: string
  status: string
  created_at: string
  created_by_name: string
}

interface Vendor {
  id: number
  vendor_code: string
  name: string
  is_active: boolean
}

interface VendorInvoice {
  id: number
  our_reference_number: string
  vendor_invoice_number: string
  vendor_name: string
  total_amount: number
  outstanding_amount: number
  payment_status: string
}

const PurchasePayments: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [purchasePayments, setPurchasePayments] = useState<PurchasePayment[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [vendorInvoices, setVendorInvoices] = useState<VendorInvoice[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PurchasePayment | null>(null)
  const [formData, setFormData] = useState({
    vendor: '',
    vendor_invoice: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'bank_transfer',
    tds_percentage: 0,
    tds_section: '',
    reference_number: '',
    transaction_id: '',
    bank_name: '',
    notes: ''
  })

  // Fetch data
  const fetchPurchasePayments = async () => {
    if (!sessionKey) return

    try {
      setIsLoading(true)
      const response = await api.get('/api/finance/purchase-payments/', {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      setPurchasePayments(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching purchase payments:', error)
      toast.error('Failed to fetch purchase payments')
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

  const fetchVendorInvoices = async () => {
    if (!sessionKey) return

    try {
      const response = await api.get('/api/finance/vendor-invoices/', {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      setVendorInvoices(response.data.results || [])
    } catch (error: any) {
      console.error('Error fetching vendor invoices:', error)
    }
  }

  useEffect(() => {
    fetchPurchasePayments()
    fetchVendors()
    fetchVendorInvoices()
  }, [sessionKey])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    try {
      if (editingPayment) {
        // Update purchase payment
        await api.put(`/api/finance/purchase-payments/${editingPayment.id}/`, formData)
        toast.success('Purchase payment updated successfully')
      } else {
        // Create purchase payment
        await api.post('/api/finance/purchase-payments/', formData, {
          headers: { Authorization: `Bearer ${sessionKey}` }
        })
        toast.success('Purchase payment created successfully')
      }
      
      setShowForm(false)
      setEditingPayment(null)
      resetForm()
      fetchPurchasePayments()
    } catch (error: any) {
      console.error('Error saving purchase payment:', error)
      toast.error(error.response?.data?.message || 'Failed to save purchase payment')
    }
  }

  // Reset form
  const resetForm = () => {
    setFormData({
      vendor: '',
      vendor_invoice: '',
      payment_date: new Date().toISOString().split('T')[0],
      amount: 0,
      payment_method: 'bank_transfer',
      tds_percentage: 0,
      tds_section: '',
      reference_number: '',
      transaction_id: '',
      bank_name: '',
      notes: ''
    })
  }

  // Handle edit
  const handleEdit = (payment: PurchasePayment) => {
    setEditingPayment(payment)
    setFormData({
      vendor: '', // Will need to fetch from vendor invoice
      vendor_invoice: '', // Will need to fetch
      payment_date: payment.payment_date,
      amount: payment.amount,
      payment_method: payment.payment_method,
      tds_percentage: payment.tds_percentage,
      tds_section: '',
      reference_number: payment.reference_number || '',
      transaction_id: '',
      bank_name: payment.bank_name || '',
      notes: ''
    })
    setShowForm(true)
  }

  // Handle delete
  const handleDelete = async (payment: PurchasePayment) => {
    if (!sessionKey) return
    if (!confirm(`Are you sure you want to delete payment "${payment.payment_number}"?`)) return

    try {
      await api.delete(`/api/finance/purchase-payments/${payment.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      toast.success('Purchase payment deleted successfully')
      fetchPurchasePayments()
    } catch (error: any) {
      console.error('Error deleting purchase payment:', error)
      toast.error('Failed to delete purchase payment')
    }
  }

  // Calculate TDS amount
  const calculateTDS = () => {
    const tdsAmount = (formData.amount * formData.tds_percentage) / 100
    return {
      tdsAmount,
      netAmount: formData.amount - tdsAmount
    }
  }

  // Filter vendor invoices by selected vendor
  const filteredVendorInvoices = vendorInvoices.filter(invoice => 
    formData.vendor ? invoice.vendor_name === vendors.find(v => v.id.toString() === formData.vendor)?.name : true
  )

  // Filter purchase payments
  const filteredPayments = purchasePayments.filter(payment => {
    const matchesSearch = payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.vendor_invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.reference_number.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || 
                         payment.status === filterStatus ||
                         payment.payment_method === filterStatus

    return matchesSearch && matchesFilter
  })

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  // Get payment method color
  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'bank_transfer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'cheque': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'cash': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'upi': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Purchase Payments</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage payments made to vendors</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setEditingPayment(null)
            setShowForm(true)
          }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Payment
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
                  placeholder="Search payments..."
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
                <option value="all">All Payments</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Payments List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPayments.map((payment) => (
          <Card key={payment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{payment.payment_number}</CardTitle>
                    <CardDescription>{payment.vendor_name}</CardDescription>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(payment)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                  {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentMethodColor(payment.payment_method)}`}>
                  {payment.payment_method.replace('_', ' ').charAt(0).toUpperCase() + payment.payment_method.replace('_', ' ').slice(1)}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Receipt className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  Invoice: {payment.vendor_invoice_number}
                </span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">
                  {new Date(payment.payment_date).toLocaleDateString()}
                </span>
              </div>
              
              {payment.reference_number && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Ref:</span>
                  <span className="text-gray-600 dark:text-gray-400">{payment.reference_number}</span>
                </div>
              )}
              
              {payment.bank_name && (
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Bank:</span>
                  <span className="text-gray-600 dark:text-gray-400">{payment.bank_name}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{payment.created_by_name}</span>
              </div>
              
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Payment Amount:</span>
                  <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{payment.amount.toLocaleString()}
                  </span>
                </div>
                
                {payment.tds_amount > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">TDS ({payment.tds_percentage}%):</span>
                      <span className="text-red-600 dark:text-red-400">₹{payment.tds_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-500 dark:text-gray-400">Net Paid:</span>
                      <span className="text-green-600 dark:text-green-400">₹{payment.net_amount_paid.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPayments.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No purchase payments found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || filterStatus !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by recording your first payment'
              }
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <Button
                onClick={() => {
                  resetForm()
                  setEditingPayment(null)
                  setShowForm(true)
                }}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Your First Payment
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Purchase Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingPayment ? 'Edit Purchase Payment' : 'New Purchase Payment'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vendor *
                    </label>
                    <select
                      value={formData.vendor}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value, vendor_invoice: '' }))}
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
                      Vendor Invoice *
                    </label>
                    <select
                      value={formData.vendor_invoice}
                      onChange={(e) => setFormData(prev => ({ ...prev, vendor_invoice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                      disabled={!formData.vendor}
                    >
                      <option value="">Select Invoice</option>
                      {filteredVendorInvoices.map(invoice => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.vendor_invoice_number} - ₹{invoice.outstanding_amount.toLocaleString()} outstanding
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Amount (₹) *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method *
                    </label>
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="rtgs">RTGS</option>
                      <option value="neft">NEFT</option>
                      <option value="imps">IMPS</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      TDS Percentage (%)
                    </label>
                    <input
                      type="number"
                      value={formData.tds_percentage}
                      onChange={(e) => setFormData(prev => ({ ...prev, tds_percentage: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      TDS Section
                    </label>
                    <input
                      type="text"
                      value={formData.tds_section}
                      onChange={(e) => setFormData(prev => ({ ...prev, tds_section: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., 194C, 194J"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Reference Number
                    </label>
                    <input
                      type="text"
                      value={formData.reference_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Cheque number, transaction ID, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* TDS Calculation Display */}
                {formData.tds_percentage > 0 && formData.amount > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">TDS Calculation</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Payment Amount:</span>
                        <span>₹{formData.amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">TDS ({formData.tds_percentage}%):</span>
                        <span className="text-red-600 dark:text-red-400">₹{calculateTDS().tdsAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t border-gray-200 dark:border-gray-700 pt-1">
                        <span>Net Amount Paid:</span>
                        <span className="text-green-600 dark:text-green-400">₹{calculateTDS().netAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
                
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
                      setEditingPayment(null)
                      resetForm()
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                  >
                    {editingPayment ? 'Update Payment' : 'Record Payment'}
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

export default PurchasePayments