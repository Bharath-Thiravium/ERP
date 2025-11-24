import React, { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useServiceUserStore } from '../../../../store/serviceUserStore'

interface RejectInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  invoiceId: number
  invoiceNumber: string
  invoiceType: 'quotation' | 'proforma' | 'tax'
  sessionKey?: string
}

const RejectInvoiceModal: React.FC<RejectInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  invoiceNumber,
  invoiceType,
  sessionKey: propSessionKey
}) => {
  const { sessionKey: storeSessionKey } = useServiceUserStore()
  const sessionKey = propSessionKey || storeSessionKey
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason')
      return
    }

    setIsSubmitting(true)

    try {
      let endpoint: string
      if (invoiceType === 'quotation') {
        endpoint = `/api/finance/quotations/${invoiceId}/reject/`
      } else if (invoiceType === 'proforma') {
        endpoint = `/api/finance/proforma-invoices/${invoiceId}/reject/`
      } else {
        endpoint = `/api/finance/invoices/${invoiceId}/reject/`
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionKey}`
        },
        body: JSON.stringify({
          session_key: sessionKey,
          rejection_reason: rejectionReason.trim()
        })
      })

      if (response.ok) {
        const documentType = invoiceType === 'quotation' ? 'Quotation' : invoiceType === 'proforma' ? 'Proforma invoice' : 'Invoice'
        toast.success(`${documentType} ${invoiceNumber} rejected successfully`)
        onSuccess()
        onClose()
        setRejectionReason('')
      } else {
        const errorData = await response.json()
        const documentType = invoiceType === 'quotation' ? 'quotation' : invoiceType === 'proforma' ? 'proforma invoice' : 'invoice'
        toast.error(errorData.error || `Failed to reject ${documentType}`)
      }
    } catch (error) {
      console.error('Error rejecting document:', error)
      const documentType = invoiceType === 'quotation' ? 'quotation' : invoiceType === 'proforma' ? 'proforma invoice' : 'invoice'
      toast.error(`Failed to reject ${documentType}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Reject {invoiceType === 'quotation' ? 'Quotation' : invoiceType === 'proforma' ? 'Proforma Invoice' : 'Invoice'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              You are about to reject <strong>{invoiceNumber}</strong>. This action will:
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-4">
              <li>Mark the {invoiceType === 'quotation' ? 'quotation' : invoiceType === 'proforma' ? 'proforma invoice' : 'invoice'} as rejected</li>
              {invoiceType !== 'quotation' && <li>Update the related PO/Quotation calculations</li>}
              <li>Save the rejection reason for audit purposes</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>

          <div className="mb-6">
            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejectionReason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={`Please provide a detailed reason for rejecting this ${invoiceType === 'quotation' ? 'quotation' : 'invoice'}...`}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rejectionReason.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isSubmitting ? 'Rejecting...' : `Reject ${invoiceType === 'quotation' ? 'Quotation' : 'Invoice'}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RejectInvoiceModal