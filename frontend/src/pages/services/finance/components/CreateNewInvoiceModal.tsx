import React, { useState } from 'react'
import { X, Plus, FileText, CreditCard } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface CreateNewInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  rejectedInvoice: {
    id: number
    invoice_number: string
    purchase_order?: {
      id: number
      internal_po_number: string
    }
    quotation?: {
      id: number
      quotation_number: string
    }
  }
  sessionKey: string
}

const CreateNewInvoiceModal: React.FC<CreateNewInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  rejectedInvoice,
  sessionKey
}) => {
  const [invoiceType, setInvoiceType] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!invoiceType) {
      toast.error('Please select an invoice type')
      return
    }

    setIsSubmitting(true)

    try {
      // First, fetch the source document details to get customer and item information
      let sourceData: any
      if (rejectedInvoice.purchase_order) {
        const response = await fetch(`/api/finance/purchase-orders/${rejectedInvoice.purchase_order.id}/?session_key=${sessionKey}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to fetch purchase order details: ${errorText}`)
        }
        sourceData = await response.json()
      } else if (rejectedInvoice.quotation) {
        const response = await fetch(`/api/finance/quotations/${rejectedInvoice.quotation.id}/?session_key=${sessionKey}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to fetch quotation details: ${errorText}`)
        }
        sourceData = await response.json()
      } else {
        throw new Error('No source document found')
      }

      console.log('Source data fetched:', sourceData) // Debug log
      
      // Get items from source data
      const items = sourceData.quotation_items || sourceData.po_items || []
      console.log('Source items:', items) // Debug log
      
      if (!items.length) {
        throw new Error('No items found in source document')
      }

      let response
      if (invoiceType === 'proforma') {
        // Prepare proforma invoice data with special handling for rejected invoice replacement
        const proformaData = {
          customer: sourceData.customer_details?.id || sourceData.customer,
          ...(rejectedInvoice.purchase_order && { purchase_order: rejectedInvoice.purchase_order.id }),
          ...(rejectedInvoice.quotation && { quotation: rejectedInvoice.quotation.id }),
          proforma_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          notes: `New proforma invoice created to replace rejected invoice ${rejectedInvoice.invoice_number}`,
          terms_and_conditions: 'Payment terms: Net 30 days. Late payments may incur additional charges.',
          is_advance_bill: true,
          proforma_items: items.map((item: any) => ({
            product: item.product?.id || item.product,
            product_name: item.product_name || item.product?.name,
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'Nos',
            unit_price: parseFloat(item.unit_price) || 0,
            line_total: (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 1)
          })),
          // Add flag to indicate this is replacing a rejected invoice
          replacing_rejected_invoice: rejectedInvoice.id,
          // Force override balance validation for rejected invoice replacement
          force_balance_override: true,
          // Add claim type and percentage to help with validation
          claim_type: 'percentage',
          claim_percentage: 100
        }

        console.log('Proforma data to send:', JSON.stringify(proformaData, null, 2))

        response = await fetch(`/api/finance/proforma-invoices/?session_key=${sessionKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(proformaData)
        })
      } else {
        // Prepare tax invoice data with special handling for rejected invoice replacement
        const taxInvoiceData = {
          customer: sourceData.customer_details?.id || sourceData.customer,
          ...(rejectedInvoice.purchase_order && { purchase_order: rejectedInvoice.purchase_order.id }),
          ...(rejectedInvoice.quotation && { quotation: rejectedInvoice.quotation.id }),
          claim_type: 'percentage',
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'draft',
          notes: `New tax invoice created to replace rejected invoice ${rejectedInvoice.invoice_number}`,
          terms_and_conditions: 'Payment terms: Net 30 days. Late payments may incur additional charges.',
          invoice_type: 'tax_invoice',
          // Create item_percentages object with 100% for each item
          item_percentages: items.reduce((acc: any, item: any) => {
            acc[item.id] = 100 // 100% of each item
            return acc
          }, {}),
          // Add flag to indicate this is replacing a rejected invoice
          replacing_rejected_invoice: rejectedInvoice.id,
          // Force override balance validation for rejected invoice replacement
          force_balance_override: true,
          // Add claim percentage to help with validation
          claim_percentage: 100
        }

        console.log('Tax invoice data to send:', JSON.stringify(taxInvoiceData, null, 2))

        response = await fetch(`/api/finance/invoices/?session_key=${sessionKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(taxInvoiceData)
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        console.error('API Error Response:', errorData)
        console.error('Response Status:', response.status)
        console.error('Response Headers:', Object.fromEntries(response.headers.entries()))
        
        // Handle specific error cases
        if (response.status === 400) {
          if (errorData.error?.includes('percentage') || errorData.error?.includes('balance')) {
            throw new Error(`Invoice creation failed: ${errorData.error}\n\nThis error occurs because the rejected invoice still counts toward the Purchase Order's claimed amounts. To resolve this:\n1. Contact your system administrator to reset the PO balance\n2. Or create the invoice manually from the PO with remaining percentage\n3. The rejected invoice needs to be properly handled in the system to free up the balance.`)
          } else if (errorData.item_percentages) {
            throw new Error(`Item validation failed: ${JSON.stringify(errorData.item_percentages)}`)
          } else if (errorData.customer) {
            throw new Error(`Customer validation failed: ${JSON.stringify(errorData.customer)}`)
          } else if (errorData.claim_percentage) {
            throw new Error(`Claim percentage validation failed: ${JSON.stringify(errorData.claim_percentage)}\n\nThe Purchase Order may have insufficient available balance. This happens when rejected invoices still count toward claimed amounts.`)
          }
        }
        
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}: Failed to create invoice`)
      }

      const responseData = await response.json()
      console.log('API Response:', responseData) // Debug log
      
      const documentType = invoiceType === 'proforma' ? 'Proforma invoice' : 'Tax invoice'
      toast.success(`New ${documentType} created successfully`)
      onSuccess()
      onClose()
      setInvoiceType('')
    } catch (error: any) {
      console.error('Error creating new invoice:', error)
      console.error('Error message:', error.message)
      
      // Show user-friendly error message with better formatting
      let errorMessage = error.message || 'Failed to create new invoice'
      
      // For balance-related errors, show a more helpful message
      if (errorMessage.includes('percentage') || errorMessage.includes('balance')) {
        errorMessage = `❌ Cannot create new invoice\n\n${errorMessage}\n\n💡 Tip: Try creating the invoice directly from the Purchase Order list instead.`
      }
      
      toast.error(errorMessage, {
        duration: 8000, // Show longer for complex messages
        style: {
          maxWidth: '500px',
          whiteSpace: 'pre-line' // Allow line breaks in toast
        }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setInvoiceType('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Plus className="w-6 h-6 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create New Invoice
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
              Create a new invoice to replace the rejected invoice <strong>{rejectedInvoice.invoice_number}</strong>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Source: {rejectedInvoice.purchase_order 
                ? `PO ${rejectedInvoice.purchase_order.internal_po_number}` 
                : rejectedInvoice.quotation 
                ? `Quotation ${rejectedInvoice.quotation.quotation_number}`
                : 'Direct Invoice'}
            </p>
            {rejectedInvoice.purchase_order && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Note:</strong> If you encounter balance validation errors, the rejected invoice may still be counting toward the PO's claimed amounts. In this case, please create the new invoice directly from the Purchase Order list.
                </p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Invoice Type <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="invoiceType"
                  value="proforma"
                  checked={invoiceType === 'proforma'}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-4 h-4 text-green-600"
                  disabled={isSubmitting}
                />
                <div className="ml-3 flex items-center">
                  <FileText className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Proforma Invoice
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Advance bill without tax
                    </div>
                  </div>
                </div>
              </label>
              <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <input
                  type="radio"
                  name="invoiceType"
                  value="tax"
                  checked={invoiceType === 'tax'}
                  onChange={(e) => setInvoiceType(e.target.value)}
                  className="w-4 h-4 text-green-600"
                  disabled={isSubmitting}
                />
                <div className="ml-3 flex items-center">
                  <CreditCard className="w-5 h-5 text-green-600 mr-2" />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      Tax Invoice
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Final bill with tax included
                    </div>
                  </div>
                </div>
              </label>
            </div>
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
              disabled={isSubmitting || !invoiceType}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isSubmitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{isSubmitting ? 'Creating...' : `Create ${invoiceType === 'proforma' ? 'Proforma' : 'Tax'} Invoice`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateNewInvoiceModal