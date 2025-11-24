import React, { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import { Users, Building2, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import CustomerList from '../components/CustomerList'
import CustomerForm from '../components/CustomerForm'
import CustomerDetail from '../components/CustomerDetail'
import MetricCard from '../components/MetricCard'

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

  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null)
  const [refreshList, setRefreshList] = useState(0)
  const [metrics, setMetrics] = useState({
    total: 0,
    active: 0,
    business: 0,
    totalCreditLimit: 0
  })

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

  const handleDetailDelete = async (customerId: number) => {
    try {
      const sessionKey = useServiceUserStore.getState().sessionKey
      
      if (!sessionKey) {
        toast.error('Session expired. Please login again.')
        return
      }

      await apiClient.deleteFinanceCustomer(customerId, { session_key: sessionKey })
      
      toast.success('Customer deleted successfully!')
      
      setRefreshList(prev => prev + 1)
      setShowDetail(false)
      setSelectedCustomerId(null)
    } catch (error: any) {
      console.error('Error deleting customer:', error)
      toast.error('Failed to delete customer. Please try again.')
    }
  }

  // Fetch customer metrics
  const fetchMetrics = async () => {
    try {
      const sessionKey = useServiceUserStore.getState().sessionKey
      if (!sessionKey) return

      const response = await apiClient.getFinanceCustomers({ session_key: sessionKey, page_size: 1000 })
      const customers = response.data.results || []
      
      const total = customers.length
      const active = customers.filter((c: any) => c.is_active).length
      const business = customers.filter((c: any) => c.customer_type === 'business').length
      const totalCreditLimit = customers.reduce((sum: number, c: any) => sum + (c.credit_limit || 0), 0)
      
      setMetrics({ total, active, business, totalCreditLimit })
    } catch (error) {
      console.error('Error fetching customer metrics:', error)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [refreshList])

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

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Customers"
          value={metrics.total}
          subtitle={`${metrics.total} customers in database`}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Active Customers"
          value={metrics.active}
          subtitle={`${metrics.active} active customers`}
          icon={Users}
          color="green"
        />
        <MetricCard
          title="Business Customers"
          value={metrics.business}
          subtitle={`${metrics.business} business accounts`}
          icon={Building2}
          color="purple"
        />
        <MetricCard
          title="Total Credit Limit"
          value={`₹${metrics.totalCreditLimit.toLocaleString()}`}
          subtitle="Combined credit limits"
          icon={CreditCard}
          color="orange"
        />
      </div>

      <CustomerList
        key={refreshList} // Force re-render when refreshList changes
        onAddCustomer={handleAddCustomer}
        onEditCustomer={(customer: any) => handleEditCustomer(customer)}
        onViewCustomer={(customer: any) => handleViewCustomer(customer)}
      />

      {/* Customer Form Modal */}
      {showForm && (
        <CustomerForm
          customer={selectedCustomer as any}
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
