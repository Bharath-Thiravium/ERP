import React, { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api'
import { useServiceUserStore } from '../../../../store/serviceUserStore'
import QuotationForm from './QuotationForm'
import toast from 'react-hot-toast'

interface QuotationEditProps {
  quotationId: number
  onClose: () => void
  onSuccess: () => void
}

const QuotationEdit: React.FC<QuotationEditProps> = ({ quotationId, onClose, onSuccess }) => {
  const { sessionKey } = useServiceUserStore()
  const [quotation, setQuotation] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Load quotation details for editing
  useEffect(() => {
    if (quotationId && sessionKey) {
      loadQuotationDetails()
    }
  }, [quotationId, sessionKey])

  const loadQuotationDetails = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getFinanceQuotation(quotationId, { session_key: sessionKey })

      console.log('Loaded quotation for editing:', response.data)
      setQuotation(response.data)
    } catch (error) {
      console.error('Error loading quotation details:', error)
      toast.error('Failed to load quotation details')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateSuccess = () => {
    // Don't show toast here - QuotationForm already shows success message
    onSuccess()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-900 dark:text-white">Loading quotation...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!quotation) {
    return null
  }

  return (
    <QuotationForm
      quotation={quotation}
      onClose={onClose}
      onSuccess={handleUpdateSuccess}
    />
  )
}

export default QuotationEdit
