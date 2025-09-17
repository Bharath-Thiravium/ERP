import React, { useState, useEffect } from 'react'
import {
  X, Edit, Trash2, User, Building2, Mail, Phone, MapPin,
  CreditCard, FileText, Globe, Calendar, DollarSign
} from 'lucide-react'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

import api from '../../../../lib/api'

interface Customer {
  id: number
  customer_code: string
  name: string
  display_name: string
  customer_type: 'individual' | 'business' | 'government' | 'ngo'
  email: string
  phone: string
  mobile: string
  website: string
  full_billing_address: string
  full_shipping_address: string
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
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
  created_by_name: string
}

interface CustomerDetailProps {
  customerId: number
  onClose: () => void
  onEdit: (customer: Customer) => void
  onDelete: (customerId: number) => void
}

const CustomerDetail: React.FC<CustomerDetailProps> = ({
  customerId,
  onClose,
  onEdit,
  onDelete
}) => {
  const { sessionKey } = useServiceUserStore()

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCustomer()
  }, [customerId])

  const fetchCustomer = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/api/finance/customers/${customerId}/`, {
        params: { session_key: sessionKey }
      })
      setCustomer(response.data)
    } catch (error) {
      console.error('Error fetching customer:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = () => {
    if (customer && confirm(`Are you sure you want to delete ${customer.name}?`)) {
      onDelete(customer.id)
      onClose()
    }
  }

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'individual': return <User className="w-5 h-5" />
      case 'business': return <Building2 className="w-5 h-5" />
      default: return <Building2 className="w-5 h-5" />
    }
  }

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'individual': return 'bg-blue-100 text-blue-800'
      case 'business': return 'bg-green-100 text-green-800'
      case 'government': return 'bg-purple-100 text-purple-800'
      case 'ngo': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <p className="text-center text-red-600">Customer not found</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 mx-auto block"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getCustomerTypeIcon(customer.customer_type)}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{customer.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{customer.customer_code}</p>
              </div>
            </div>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getCustomerTypeColor(customer.customer_type)}`}>
              {customer.customer_type}
            </span>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              customer.is_active 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {customer.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(customer)}
              className="text-indigo-600 hover:text-indigo-900 p-2 rounded-lg hover:bg-indigo-50"
              title="Edit Customer"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50"
              title="Delete Customer"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-8">
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Display Name</label>
                  <p className="text-gray-900">{customer.display_name || '-'}</p>
                </div>
                {customer.customer_type === 'business' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Business Type</label>
                      <p className="text-gray-900">{customer.business_type || '-'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Industry</label>
                      <p className="text-gray-900">{customer.industry || '-'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {customer.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <a href={`mailto:${customer.email}`} className="text-blue-600 hover:text-blue-800">
                        {customer.email}
                      </a>
                    </div>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <a href={`tel:${customer.phone}`} className="text-blue-600 hover:text-blue-800">
                        {customer.phone}
                      </a>
                    </div>
                  </div>
                )}
                {customer.mobile && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Mobile</label>
                      <a href={`tel:${customer.mobile}`} className="text-blue-600 hover:text-blue-800">
                        {customer.mobile}
                      </a>
                    </div>
                  </div>
                )}
                {customer.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Website</label>
                      <a href={customer.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        {customer.website}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Address Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Billing Address</label>
                  <p className="text-gray-900">{customer.full_billing_address || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Shipping Address</label>
                  <p className="text-gray-900">{customer.full_shipping_address || '-'}</p>
                </div>
              </div>
            </div>

            {/* Tax & Legal Information */}
            {(customer.gstin || customer.pan_number || customer.aadhar_number) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Tax & Legal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {customer.gstin && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">GSTIN</label>
                      <p className="text-gray-900 font-mono">{customer.gstin}</p>
                    </div>
                  )}
                  {customer.pan_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">PAN Number</label>
                      <p className="text-gray-900 font-mono">{customer.pan_number}</p>
                    </div>
                  )}
                  {customer.aadhar_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Aadhar Number</label>
                      <p className="text-gray-900 font-mono">{customer.aadhar_number}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Banking Information */}
            {(customer.bank_name || customer.bank_account_number) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Banking Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {customer.bank_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Bank Name</label>
                      <p className="text-gray-900">{customer.bank_name}</p>
                    </div>
                  )}
                  {customer.bank_account_number && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Account Number</label>
                      <p className="text-gray-900 font-mono">{customer.bank_account_number}</p>
                    </div>
                  )}
                  {customer.bank_ifsc_code && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">IFSC Code</label>
                      <p className="text-gray-900 font-mono">{customer.bank_ifsc_code}</p>
                    </div>
                  )}
                  {customer.bank_branch && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Branch</label>
                      <p className="text-gray-900">{customer.bank_branch}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Financial Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Credit Limit</label>
                  <p className="text-gray-900">₹{customer.credit_limit.toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Payment Terms</label>
                  <p className="text-gray-900">{customer.payment_terms || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Currency</label>
                  <p className="text-gray-900">{customer.currency}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            {customer.notes && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Record Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created By</label>
                  <p className="text-gray-900">{customer.created_by_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-gray-900">{new Date(customer.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-gray-900">{new Date(customer.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetail
