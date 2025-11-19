import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QuotationList from '../components/QuotationList'
import QuotationForm from '../components/QuotationForm'
import QuotationDetail from '../components/QuotationDetail'
import QuotationEdit from '../components/QuotationEdit'

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
}

interface QuotationsProps {
  onCreatePO?: (quotation: Quotation) => void
}

const Quotations: React.FC<QuotationsProps> = ({ onCreatePO }) => {
  const navigate = useNavigate()
  const [currentView, setCurrentView] = useState<'list' | 'form' | 'detail' | 'edit'>('list')
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [refreshList, setRefreshList] = useState(0)

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

  return (
    <div className="space-y-6">
      {currentView === 'list' && (
        <QuotationList
          key={refreshList} // Force re-render when refreshList changes
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onView={handleView}
          onCreatePO={handleCreatePO}
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
    </div>
  )
}

export default Quotations