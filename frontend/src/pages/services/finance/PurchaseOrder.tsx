import React, { useState, useEffect } from 'react'
import { useServiceUserStore } from '../../../store/serviceUserStore'
import PurchaseOrderList from './components/PurchaseOrderList'
import PurchaseOrderForm from './components/PurchaseOrderForm'
import PurchaseOrderView from './components/PurchaseOrderView'
import axios from 'axios'
import toast from 'react-hot-toast'

interface PurchaseOrder {
  id: number
  internal_po_number: string
  po_number: string
  po_date: string
  po_file?: string
  quotation: number
  quotation_details: {
    quotation_number: string
    quotation_date: string
    valid_until: string
  }
  customer: number
  customer_details: {
    name: string
    customer_code: string
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
    project_area?: string
  }
  shipping_address: number | null
  shipping_address_details?: {
    address_line1: string
    address_line2: string
    city: string
    state: string
    pincode: string
    country: string
  }
  po_items: Array<{
    id: number
    product: number
    product_name: string
    product_code: string
    description: string
    hsn_sac_code: string
    quantity: number
    unit: string
    unit_price: number
    line_total: number
    gst_rate: number
  }>
  status: string
  gst_type: string
  subtotal: number
  total_tax: number
  total_amount: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  discount_percentage: number
  discount_amount: number
  shipping_charges: number
  other_charges: number
  notes: string
  terms_and_conditions: string
  created_at: string
  created_by_name: string
}

interface Quotation {
  id: number
  quotation_number: string
  customer: number
  customer_details?: any
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

interface PurchaseOrderProps {
  quotationForPO?: Quotation | null
  initialAction?: string | null
  onActionComplete?: () => void
}

const PurchaseOrder: React.FC<PurchaseOrderProps> = ({ quotationForPO: propQuotationForPO, initialAction, onActionComplete }) => {
  const { sessionKey } = useServiceUserStore()
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'view'>('list')
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [quotationForPO, setQuotationForPO] = useState<Quotation | null>(propQuotationForPO || null)
  const [refreshList, setRefreshList] = useState(0)

  // Handle initial action from dashboard
  useEffect(() => {
    if (initialAction === 'create' && propQuotationForPO) {
      setQuotationForPO(propQuotationForPO)
      setCurrentView('create')
    }
  }, [initialAction, propQuotationForPO])

  // Check if we're coming from quotation with a quotation ID in URL params (for direct route access)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const quotationId = urlParams.get('quotation')

    if (quotationId && sessionKey && !propQuotationForPO) {
      loadQuotationForPO(parseInt(quotationId))
    }
  }, [sessionKey, propQuotationForPO])

  const loadQuotationForPO = async (quotationId: number) => {
    if (!sessionKey) return

    try {
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/quotations/${quotationId}/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })

      setQuotationForPO(response.data)
      setCurrentView('create')
      
      // Clear URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    } catch (error) {
      console.error('Error loading quotation:', error)
      toast.error('Failed to load quotation details')
    }
  }

  const handleCreateNew = () => {
    setSelectedPO(null)
    setQuotationForPO(null)
    setCurrentView('create')
  }

  const handleEdit = async (po: PurchaseOrder) => {
    if (!sessionKey) return

    try {
      // Load full PO details for editing
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/purchase-orders/${po.id}/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })

      setSelectedPO(response.data)
      setQuotationForPO(null)
      setCurrentView('edit')
    } catch (error) {
      console.error('Error loading PO details:', error)
      toast.error('Failed to load purchase order details')
    }
  }

  const handleView = async (po: PurchaseOrder) => {
    if (!sessionKey) return

    try {
      // Load full PO details for viewing
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/purchase-orders/${po.id}/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })

      setSelectedPO(response.data)
      setCurrentView('view')
    } catch (error) {
      console.error('Error loading PO details:', error)
      toast.error('Failed to load purchase order details')
    }
  }

  const handleFormSuccess = () => {
    setCurrentView('list')
    setSelectedPO(null)
    setQuotationForPO(null)
    setRefreshList(prev => prev + 1)

    // Call the callback to clear dashboard state
    if (onActionComplete) {
      onActionComplete()
    }
  }

  const handleFormClose = () => {
    setCurrentView('list')
    setSelectedPO(null)
    setQuotationForPO(null)

    // Call the callback to clear dashboard state
    if (onActionComplete) {
      onActionComplete()
    }
  }

  const handleViewClose = () => {
    setCurrentView('list')
    setSelectedPO(null)
  }

  if (!sessionKey) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Authentication Required</h3>
          <p className="text-gray-600 dark:text-gray-400">Please log in to access purchase orders.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'list' && (
          <PurchaseOrderList
            key={refreshList}
            onCreateNew={handleCreateNew}
            onEdit={handleEdit}
            onView={handleView}
          />
        )}

        {(currentView === 'create' || currentView === 'edit') && (
          <PurchaseOrderForm
            purchaseOrder={currentView === 'edit' ? selectedPO : null}
            quotation={quotationForPO}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        )}

        {currentView === 'view' && selectedPO && (
          <PurchaseOrderView
            purchaseOrder={selectedPO}
            onClose={handleViewClose}
          />
        )}
      </div>
    </div>
  )
}

export default PurchaseOrder
