import React from 'react'
import { X, FileText, User, Calendar, DollarSign } from 'lucide-react'

interface ProformaInvoiceViewProps {
  proformaInvoice: any
  onClose: () => void
}

const ProformaInvoiceView: React.FC<ProformaInvoiceViewProps> = ({ proformaInvoice, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Proforma Invoice Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {proformaInvoice.proforma_number}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <FileText className="w-4 h-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Proforma Number</span>
              </div>
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{proformaInvoice.proforma_number}</p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Calendar className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Date</span>
              </div>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                {new Date(proformaInvoice.proforma_date).toLocaleDateString()}
              </p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <DollarSign className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Amount</span>
              </div>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                ₹{parseFloat(proformaInvoice.subtotal || proformaInvoice.total_amount || '0').toLocaleString()}
              </p>
            </div>
          </div>

          {/* Customer Details */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Customer Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium">{proformaInvoice.customer_name}</p>
              </div>
              <div>
                <span className="text-gray-500">Code:</span>
                <p className="font-medium">{proformaInvoice.customer_code}</p>
              </div>
              {proformaInvoice.po_number && (
                <div>
                  <span className="text-gray-500">PO Number:</span>
                  <p className="font-medium">{proformaInvoice.po_number}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Status:</span>
                <p className="font-medium capitalize">
                  {proformaInvoice.is_rejected ? 'Rejected' : proformaInvoice.status}
                </p>
              </div>
              {proformaInvoice.is_rejected && proformaInvoice.rejection_reason && (
                <div className="col-span-2">
                  <span className="text-gray-500">Rejection Reason:</span>
                  <p className="font-medium text-red-600 dark:text-red-400">{proformaInvoice.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {proformaInvoice.proforma_items && proformaInvoice.proforma_items.length > 0 && (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white">Items</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Quantity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {proformaInvoice.proforma_items.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.product_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.quantity} {item.unit}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">₹{item.unit_price}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">₹{item.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProformaInvoiceView