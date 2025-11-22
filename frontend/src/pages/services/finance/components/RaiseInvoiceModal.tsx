import React, { useState } from 'react'
import { X, Receipt, Percent, Hash, FileText, CreditCard } from 'lucide-react'

interface PurchaseOrder {
  id: number
  internal_po_number: string
  po_number: string
  customer_name: string
  subtotal: string
  total_amount: string
  claim_type?: string
  remaining_proforma_balance: string
  remaining_invoice_balance: string
  proforma_claimed_amount: string
  invoice_claimed_amount: string
  total_claimed_percentage: number
}

interface Quotation {
  id: number
  quotation_number: string
  customer_name: string
  subtotal: string
  total_amount: string
  claim_type?: string
  remaining_proforma_balance: string
  remaining_invoice_balance: string
  proforma_claimed_amount: string
  invoice_claimed_amount: string
  total_claimed_percentage: number
}

interface RaiseInvoiceModalProps {
  purchaseOrder?: PurchaseOrder
  quotation?: Quotation
  onClose: () => void
  onCreateProforma: (data: any) => void
  onCreateTaxInvoice: (data: any) => void
}

const RaiseInvoiceModal: React.FC<RaiseInvoiceModalProps> = ({
  purchaseOrder,
  quotation,
  onClose,
  onCreateProforma,
  onCreateTaxInvoice
}) => {
  // Use either PO or Quotation data
  const sourceData = purchaseOrder || quotation
  const [step, setStep] = useState(sourceData?.claim_type ? 1 : 0)
  const [claimType, setClaimType] = useState(sourceData?.claim_type || 'percentage')
  const [invoiceType, setInvoiceType] = useState('')
  const [loading, setLoading] = useState(false)

  const handleClaimTypeNext = () => {
    setStep(1)
  }

  const handleGenerate = () => {
    if (loading) {
      console.log('Already processing, preventing double click')
      return
    }
    
    setLoading(true)
    
    const invoiceData = {
      ...(purchaseOrder && { purchase_order: purchaseOrder.id }),
      ...(quotation && { quotation: quotation.id }),
      claim_type: claimType,
      invoice_type: invoiceType
    }

    if (invoiceType === 'proforma') {
      onCreateProforma(invoiceData)
    } else {
      onCreateTaxInvoice(invoiceData)
    }
    
    // Reset loading after a short delay to allow modal transition
    setTimeout(() => setLoading(false), 1000)
  }



  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Raise Invoice
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {purchaseOrder?.internal_po_number || quotation?.quotation_number}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 0: Claim Type Selection - Only if not already set */}
          {step === 0 && !sourceData?.claim_type && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Select Claim Type (First Time)
              </h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="claimType"
                    value="percentage"
                    checked={claimType === 'percentage'}
                    onChange={(e) => setClaimType(e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <div className="ml-3 flex items-center">
                    <Percent className="w-5 h-5 text-orange-600 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Percentage-wise
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Claim by percentage of total amount
                      </div>
                    </div>
                  </div>
                </label>
                <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="claimType"
                    value="quantity"
                    checked={claimType === 'quantity'}
                    onChange={(e) => setClaimType(e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <div className="ml-3 flex items-center">
                    <Hash className="w-5 h-5 text-orange-600 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Quantity-wise
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Claim by specific quantities
                      </div>
                    </div>
                  </div>
                </label>
              </div>
              <button
                onClick={handleClaimTypeNext}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Next
              </button>
            </div>
          )}

          {/* Step 1: Invoice Type Selection */}
          {step === 1 && (
            <div className="space-y-4">
              {sourceData?.claim_type && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Using {sourceData.claim_type === 'percentage' ? 'Percentage-wise' : 'Quantity-wise'} claiming for this {purchaseOrder ? 'PO' : 'Quotation'}
                  </p>
                </div>
              )}
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Select Invoice Type
              </h3>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <input
                    type="radio"
                    name="invoiceType"
                    value="proforma"
                    checked={invoiceType === 'proforma'}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <div className="ml-3 flex items-center">
                    <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Proforma Invoice
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Advance bill without tax (from base value)
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
                    className="w-4 h-4 text-orange-600"
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
              <div className="flex space-x-3">
                {!sourceData?.claim_type && (
                  <button
                    onClick={() => setStep(0)}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium transition-colors"
                  >
                    Back
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!invoiceType || loading}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium transition-colors"
                >
                  {loading ? 'Processing...' : `Create ${invoiceType === 'proforma' ? 'Proforma' : 'Tax Invoice'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RaiseInvoiceModal