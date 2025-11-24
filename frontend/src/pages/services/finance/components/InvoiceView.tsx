import React from 'react';
import { X, FileText, User, Calendar, DollarSign } from 'lucide-react';

interface InvoiceItem {
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  customer_name: string;
  customer_code: string;
  customer_project_area: string;
  proforma_number: string;
  status: string;
  payment_status: string;
  gst_type: string;
  subtotal: string;
  total_tax: string;
  total_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  item_count: number;
  is_rejected?: boolean;
  rejection_reason?: string;
  invoice_items?: InvoiceItem[];
  created_at: string;
  created_by_name: string;
}

interface InvoiceViewProps {
  invoice: Invoice;
  onClose: () => void;
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Invoice Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {invoice.invoice_number}
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Invoice Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Invoice Number
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.invoice_number}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Invoice Date
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(invoice.invoice_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Due Date
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <User className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Customer
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.customer_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {invoice.customer_code} • {invoice.customer_project_area}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      From Proforma
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {invoice.proforma_number}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Status
                    </div>
                    <div className="flex space-x-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        invoice.is_rejected 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {invoice.is_rejected ? 'REJECTED' : invoice.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                        {invoice.payment_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    {invoice.is_rejected && invoice.rejection_reason && (
                      <div className="mt-2">
                        <div className="text-xs font-medium text-red-600 dark:text-red-400">
                          Rejection Reason:
                        </div>
                        <div className="text-xs text-red-600 dark:text-red-400">
                          {invoice.rejection_reason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            {invoice.invoice_items && invoice.invoice_items.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Invoice Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {invoice.invoice_items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.product_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            ₹{item.unit_price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            ₹{item.line_total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Amount Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Amount Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ₹{parseFloat(invoice.subtotal || '0').toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Tax ({invoice.gst_type}):</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ₹{parseFloat(invoice.total_tax || '0').toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                  <div className="flex justify-between">
                    <span className="text-base font-medium text-gray-900 dark:text-white">Total Amount:</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">
                      ₹{parseFloat(invoice.total_amount || '0').toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Paid Amount:</span>
                  <span className="text-sm font-medium text-green-600">
                    ₹{parseFloat(invoice.paid_amount || '0').toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Outstanding:</span>
                  <span className="text-sm font-medium text-red-600">
                    ₹{parseFloat(invoice.outstanding_amount || '0').toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
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
  );
};

export default InvoiceView;