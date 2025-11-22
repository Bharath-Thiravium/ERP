import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuotationList from '../components/QuotationList'
import QuotationForm from '../components/QuotationForm'
import QuotationDetail from '../components/QuotationDetail'
import QuotationEdit from '../components/QuotationEdit'
import RaiseInvoiceModal from '../components/RaiseInvoiceModal'
import SimpleProformaForm from '../components/SimpleProformaForm'
import SimpleTaxInvoiceForm from '../components/SimpleTaxInvoiceForm'

import { useServiceUserStore } from '../../../../store/serviceUserStore'
import toast from 'react-hot-toast'

interface Quotation {
  id: number
  quotation_number: string
  customer_name: string
  customer_code: string
  quotation_date: string
  valid_until: string
  status: string
  gst_type: string
  subtotal: string
  total_tax: string
  total_amount: string
  item_count: number
  created_at: string
  created_by_name: string
  po_created?: boolean
  po_created_at?: string
  invoice_created?: boolean
  invoice_created_at?: string
  proforma_created?: boolean
}

interface QuotationsProps {
  onCreatePO?: (quotation: Quotation) => void
}

const Quotations: React.FC<QuotationsProps> = ({ onCreatePO }) => {
  const navigate = useNavigate()
  const { sessionKey } = useServiceUserStore()
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'detail' | 'edit'>('list')
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [refreshList, setRefreshList] = useState(0)
  
  // Invoice creation states
  const [showRaiseInvoiceModal, setShowRaiseInvoiceModal] = useState(false)
  const [showProformaForm, setShowProformaForm] = useState(false)
  const [showTaxInvoiceForm, setShowTaxInvoiceForm] = useState(false)
  const [invoiceQuotation, setInvoiceQuotation] = useState<any>(null)
  const [invoiceData, setInvoiceData] = useState<any>(null)

  // Check for refresh flag after PO creation or deletion
  React.useEffect(() => {
    const shouldRefreshAfterPO = sessionStorage.getItem('refreshQuotationsAfterPO')
    const shouldRefreshAfterPODelete = sessionStorage.getItem('refreshQuotationsAfterPODelete')

    if (shouldRefreshAfterPO === 'true') {
      setRefreshList(prev => prev + 1)
      sessionStorage.removeItem('refreshQuotationsAfterPO')
    }

    if (shouldRefreshAfterPODelete === 'true') {
      setRefreshList(prev => prev + 1)
      sessionStorage.removeItem('refreshQuotationsAfterPODelete')
    }
  }, [])

  const handleCreateNew = () => {
    setCurrentView('form')
  }

  const handleView = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
    setCurrentView('detail')
  }

  const handleEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
    setCurrentView('edit')
  }

  const handleFormClose = () => {
    setCurrentView('list')
  }

  const handleFormSuccess = () => {
    setCurrentView('list')
    // Refresh the quotation list
    setRefreshList(prev => prev + 1)
  }

  const handleDetailClose = () => {
    setSelectedQuotation(null)
    setCurrentView('list')
  }

  const handleDetailEdit = () => {
    if (selectedQuotation) {
      setCurrentView('edit')
    }
  }

  const handleCreatePO = (quotation: Quotation) => {
    if (onCreatePO) {
      // Use callback from Dashboard
      onCreatePO(quotation)
    } else {
      // Fallback: Store quotation data and navigate to dashboard PO/WO tab
      sessionStorage.setItem('quotationForPO', JSON.stringify(quotation))
      sessionStorage.setItem('refreshQuotationsAfterPO', 'true')
      navigate('/services/finance/dashboard?tab=purchase-orders&action=create')
    }
  }

  const handleRaiseInvoice = async (quotation: Quotation) => {
    try {
      // Fetch full quotation details with items
      const params = new URLSearchParams({ session_key: sessionKey || '' })
      const response = await fetch(`/api/finance/quotations/${quotation.id}/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch quotation details')
      }
      
      const fullQuotationData = await response.json()
      
      // Add balance tracking fields if not present
      if (!fullQuotationData.available_proforma_percentage) {
        fullQuotationData.available_proforma_percentage = '100'
      }
      if (!fullQuotationData.available_invoice_percentage) {
        fullQuotationData.available_invoice_percentage = '100'
      }
      if (!fullQuotationData.remaining_proforma_balance) {
        fullQuotationData.remaining_proforma_balance = fullQuotationData.subtotal
      }
      if (!fullQuotationData.remaining_invoice_balance) {
        fullQuotationData.remaining_invoice_balance = fullQuotationData.total_amount
      }
      
      setInvoiceQuotation(fullQuotationData)
      setShowRaiseInvoiceModal(true)
    } catch (error) {
      console.error('Error fetching quotation details:', error)
      toast.error('Failed to load quotation details')
    }
  }

  const handleCreateProforma = (data: any) => {
    setInvoiceData(data)
    setShowRaiseInvoiceModal(false)
    setShowProformaForm(true)
  }

  const handleCreateTaxInvoice = (data: any) => {
    setInvoiceData(data)
    setShowRaiseInvoiceModal(false)
    setShowTaxInvoiceForm(true)
  }

  const handleInvoiceSuccess = () => {
    setShowProformaForm(false)
    setShowTaxInvoiceForm(false)
    setInvoiceQuotation(null)
    setInvoiceData(null)
    setRefreshList(prev => prev + 1)
    // Success message is already shown by the individual forms
  }

  const handleInvoiceClose = () => {
    setShowRaiseInvoiceModal(false)
    setShowProformaForm(false)
    setShowTaxInvoiceForm(false)
    setInvoiceQuotation(null)
    setInvoiceData(null)
  }

  return (
    <div className="space-y-6">
      {currentView === 'list' && (
        <QuotationList
          key={refreshList} // Force re-render when refreshList changes
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onView={handleView}
          onCreatePO={handleCreatePO}
          onRaiseInvoice={handleRaiseInvoice}
        />
      )}

      {currentView === 'form' && (
        <QuotationForm
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}

      {currentView === 'detail' && selectedQuotation && (
        <QuotationDetail
          quotationId={selectedQuotation.id}
          onClose={handleDetailClose}
          onEdit={handleDetailEdit}
        />
      )}

      {currentView === 'edit' && selectedQuotation && (
        <QuotationEdit
          quotationId={selectedQuotation.id}
          onClose={() => {
            setSelectedQuotation(null)
            setCurrentView('list')
          }}
          onSuccess={() => {
            setSelectedQuotation(null)
            setCurrentView('list')
            setRefreshList(prev => prev + 1)
          }}
        />
      )}
      
      {/* Raise Invoice Modal */}
      {showRaiseInvoiceModal && invoiceQuotation && (
        <RaiseInvoiceModal
          quotation={invoiceQuotation}
          onClose={handleInvoiceClose}
          onCreateProforma={handleCreateProforma}
          onCreateTaxInvoice={handleCreateTaxInvoice}
        />
      )}
      
      {/* Proforma Form */}
      {showProformaForm && invoiceQuotation && invoiceData && (
        <SimpleProformaForm
          quotation={invoiceQuotation}
          invoiceData={invoiceData}
          onClose={handleInvoiceClose}
          onSuccess={handleInvoiceSuccess}
        />
      )}
      
      {/* Tax Invoice Form */}
      {showTaxInvoiceForm && invoiceQuotation && invoiceData && (
        <SimpleTaxInvoiceForm
          quotation={invoiceQuotation}
          invoiceData={invoiceData}
          onClose={handleInvoiceClose}
          onSuccess={handleInvoiceSuccess}
        />
      )}
    </div>
  )
}

export default Quotations