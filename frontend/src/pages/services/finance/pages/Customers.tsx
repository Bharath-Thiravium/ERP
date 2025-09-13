import React, { useState } from 'react'
import { useThemeStore } from '../../../../store/themeStore'
import CustomerList from '../components/CustomerList'
import CustomerForm from '../components/CustomerForm'
import CustomerDetail from '../components/CustomerDetail'

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

const Customers: React.FC = () => {
  const { theme } = useThemeStore()
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [refreshList, setRefreshList] = useState(0)

  const handleAddCustomer = () => {
    setSelectedCustomer(null)
    setShowForm(true)
  }

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setShowForm(true)
  }

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id)
    setShowDetail(true)
  }

  const handleDeleteCustomer = async (customerId: number) => {
    // This will be handled by the CustomerDetail component
    // Just refresh the list after deletion
    setRefreshList(prev => prev + 1)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedCustomer(null)
  }

  const handleFormSave = () => {
    setRefreshList(prev => prev + 1)
  }

  const handleDetailClose = () => {
    setShowDetail(false)
    setSelectedCustomerId(null)
  }

  const handleDetailEdit = (customer: Customer) => {
    setShowDetail(false)
    setSelectedCustomer(customer)
    setShowForm(true)
  }

  const handleDetailDelete = (customerId: number) => {
    setRefreshList(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Customers
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your customer database and relationships
        </p>
      </div>

      <CustomerList
        key={refreshList} // Force re-render when refreshList changes
        onAddCustomer={handleAddCustomer}
        onEditCustomer={handleEditCustomer}
        onViewCustomer={handleViewCustomer}
      />

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={selectedCustomer}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}

      {/* Customer Detail Modal */}
      {showDetail && selectedCustomerId && (
        <CustomerDetail
          customerId={selectedCustomerId}
          onClose={handleDetailClose}
          onEdit={handleDetailEdit}
          onDelete={handleDetailDelete}
        />
      )}
    </div>
  )
}

export default Customers
