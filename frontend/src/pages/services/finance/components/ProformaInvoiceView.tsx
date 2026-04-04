import React, { useState, useEffect } from 'react'
import { X, FileText, User, Calendar, IndianRupee, MapPin, Printer } from 'lucide-react'
import api from '../../../../lib/api'
import toast from 'react-hot-toast'

interface ProformaInvoiceViewProps {
  proformaInvoice: any
  onClose: () => void
  sessionKey?: string
}

const ProformaInvoiceView: React.FC<ProformaInvoiceViewProps> = ({ proformaInvoice, onClose, sessionKey }) => {
  const [detailedProforma, setDetailedProforma] = useState<any>(proformaInvoice);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDetailedProforma = async () => {
      if (!sessionKey) return;
      
      try {
        setLoading(true);
        const response = await api.get(`/api/finance/proforma-invoices/${proformaInvoice.id}/`, {
          params: { session_key: sessionKey }
        });
        setDetailedProforma(response.data);
      } catch (error) {
        console.error('Error fetching detailed proforma invoice:', error);
        toast.error('Failed to load detailed proforma invoice data');
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedProforma();
  }, [proformaInvoice.id, sessionKey]);

  const handlePrint = async () => {
    if (!sessionKey) return;
    try {
      const response = await fetch(`/api/finance/proforma-invoices/${detailedProforma.id}/pdf/?session_key=${sessionKey}`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      });
      if (!response.ok) throw new Error('PDF failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) win.onload = () => win.print();
    } catch { toast.error('Failed to generate PDF'); }
  };

  const handleDownload = async () => {
    if (!sessionKey) return;
    try {
      const response = await fetch(`/api/finance/proforma-invoices/${detailedProforma.id}/pdf/?session_key=${sessionKey}`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      });
      if (!response.ok) throw new Error('PDF failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proforma-${detailedProforma.proforma_number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { toast.error('Failed to download PDF'); }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Loading proforma invoice details...</p>
        </div>
      </div>
    );
  }
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
              {detailedProforma.proforma_number}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={handleDownload} className="flex items-center space-x-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">
              <span>⬇ Download</span>
            </button>
            <button onClick={handlePrint} className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">
              <Printer className="w-4 h-4" /><span>Print</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>
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
              <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{detailedProforma.proforma_number}</p>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <Calendar className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">Date</span>
              </div>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                {new Date(detailedProforma.proforma_date).toLocaleDateString()}
              </p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <IndianRupee className="w-4 h-4 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Amount</span>
              </div>
              <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                ₹{parseFloat(detailedProforma.subtotal || detailedProforma.total_amount || '0').toLocaleString()}
              </p>
            </div>
          </div>

          {/* Shipping Address Section */}
          {detailedProforma.effective_shipping_address && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-orange-600 mr-2" />
                  <h3 className="font-medium text-orange-800 dark:text-orange-200">Shipping Address</h3>
                </div>
                <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 rounded-full">
                  {detailedProforma.effective_shipping_address.source}
                </span>
              </div>
              <div className="space-y-2">
                {detailedProforma.effective_shipping_address.label && (
                  <div className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    {detailedProforma.effective_shipping_address.label}
                  </div>
                )}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {detailedProforma.effective_shipping_address.address}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  Source: {detailedProforma.effective_shipping_address.source}
                </div>
              </div>
            </div>
          )}

          {/* Customer Details */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <User className="w-4 h-4 mr-2" />
              Customer Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>
                <p className="font-medium">{detailedProforma.customer_name}</p>
              </div>
              <div>
                <span className="text-gray-500">Code:</span>
                <p className="font-medium">{detailedProforma.customer_code}</p>
              </div>
              {detailedProforma.po_number && (
                <div>
                  <span className="text-gray-500">PO Number:</span>
                  <p className="font-medium">{detailedProforma.po_number}</p>
                </div>
              )}
              {detailedProforma.purchase_order_details && (
                <div>
                  <span className="text-gray-500">PO Number:</span>
                  <p className="font-medium">{detailedProforma.purchase_order_details.internal_po_number}</p>
                </div>
              )}
              {detailedProforma.quotation_details && (
                <div>
                  <span className="text-gray-500">Quotation:</span>
                  <p className="font-medium">{detailedProforma.quotation_details.quotation_number}</p>
                </div>
              )}
              <div>
                <span className="text-gray-500">Status:</span>
                <p className="font-medium capitalize">
                  {detailedProforma.is_rejected ? 'Rejected' : detailedProforma.status}
                </p>
              </div>
              {detailedProforma.is_rejected && detailedProforma.rejection_reason && (
                <div className="col-span-2">
                  <span className="text-gray-500">Rejection Reason:</span>
                  <p className="font-medium text-red-600 dark:text-red-400">{detailedProforma.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {detailedProforma.proforma_items && detailedProforma.proforma_items.length > 0 && (
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
                    {detailedProforma.proforma_items.map((item: any, index: number) => (
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