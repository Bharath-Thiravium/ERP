import React, { useState, useEffect } from 'react'
import { useThemeStore } from '../../../../store/themeStore'
import PurchaseOrderList from '../components/PurchaseOrderList'
import PurchaseOrderForm from '../components/PurchaseOrderForm'
import PurchaseOrderView from '../components/PurchaseOrderView'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
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

interface PurchaseOrdersProps {
  quotationForPO?: Quotation | null
  initialAction?: string | null
  onActionComplete?: () => void
  onPOCreated?: () => void
}

const PurchaseOrders: React.FC<PurchaseOrdersProps> = ({ quotationForPO, initialAction, onActionComplete, onPOCreated }) => {
  const { theme } = useThemeStore()
  const { sessionKey } = useServiceUserStore()
  const [showForm, setShowForm] = useState(false)
  const [showView, setShowView] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [selectedPOId, setSelectedPOId] = useState<number | null>(null)
  const [refreshList, setRefreshList] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [quotationData, setQuotationData] = useState<Quotation | null>(quotationForPO || null)

  // Handle initial action from dashboard
  useEffect(() => {
    if (initialAction === 'create' && quotationForPO) {
      setQuotationData(quotationForPO)
      setSelectedPO(null)
      setIsEditing(false)
      setShowForm(true)
    }
  }, [initialAction, quotationForPO])

  const handleAddPO = () => {
    setSelectedPO(null)
    setQuotationData(null)
    setIsEditing(false)
    setShowForm(true)
  }

  const handleEditPO = async (po: PurchaseOrder) => {
    if (!sessionKey) return

    try {
      // Load full PO details for editing
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/purchase-orders/${po.id}/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })

      setSelectedPO(response.data)
      setQuotationData(null)
      setIsEditing(true)
      setShowForm(true)
    } catch (error) {
      console.error('Error loading PO details:', error)
      toast.error('Failed to load purchase order details')
    }
  }

  const handleViewPO = async (po: PurchaseOrder) => {
    if (!sessionKey) return

    try {
      // Load full PO details for viewing
      const response = await axios.get(`http://127.0.0.1:8000/api/finance/purchase-orders/${po.id}/`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      })

      setSelectedPO(response.data)
      setSelectedPOId(po.id)
      setShowView(true)
    } catch (error) {
      console.error('Error loading PO details:', error)
      toast.error('Failed to load purchase order details')
    }
  }

  const handleFormClose = () => {
    setShowForm(false)
    setSelectedPO(null)
    setQuotationData(null)
    setIsEditing(false)
    
    // Call the callback to clear dashboard state
    if (onActionComplete) {
      onActionComplete()
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setSelectedPO(null)
    setQuotationData(null)
    setIsEditing(false)
    setRefreshList(prev => prev + 1)

    // Set flag to refresh quotations list (quotation status changed to approved)
    sessionStorage.setItem('refreshQuotationsAfterPO', 'true')

    // Call the PO created callback
    if (onPOCreated) {
      onPOCreated()
    }

    // Call the callback to clear dashboard state
    if (onActionComplete) {
      onActionComplete()
    }
  }

  const handleViewClose = () => {
    setShowView(false)
    setSelectedPO(null)
    setSelectedPOId(null)
  }

  const handleViewEdit = (po: PurchaseOrder) => {
    setShowView(false)
    setSelectedPO(po)
    setIsEditing(true)
    setShowForm(true)
  }

  const handleViewDelete = (poId: number) => {
    setRefreshList(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Purchase Orders / Work Orders
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your purchase orders and work orders from client quotations
        </p>
      </div>

      {/* PO List */}
      <PurchaseOrderList
        key={refreshList} // Force re-render when refreshList changes
        onCreateNew={handleAddPO}
        onEdit={handleEditPO}
        onView={handleViewPO}
      />

      {/* PO Form Modal */}
      {showForm && (
        <PurchaseOrderForm
          purchaseOrder={isEditing ? selectedPO : null}
          quotation={quotationData}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* PO View Modal */}
      {showView && selectedPO && (
        <PurchaseOrderView
          purchaseOrder={selectedPO}
          onClose={handleViewClose}
        />
      )}
    </div>
  )
}

export default PurchaseOrders
