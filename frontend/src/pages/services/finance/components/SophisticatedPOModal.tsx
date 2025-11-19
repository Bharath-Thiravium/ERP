import React, { useState, useEffect } from 'react';
import { X, DollarSign, Receipt, CreditCard, AlertCircle } from 'lucide-react';
import { apiClient } from '../../../../lib/api';
import toast from 'react-hot-toast';

interface PODetailsModalProps {
  poId: number;
  onClose: () => void;
  sessionKey: string;
}





const PODetailsModal: React.FC<PODetailsModalProps> = ({ poId, onClose, sessionKey }) => {
  const [loading, setLoading] = useState(true);
  const [poData, setPOData] = useState<any>(null);
  const [proformaInvoices, setProformaInvoices] = useState<any[]>([]);
  const [taxInvoices, setTaxInvoices] = useState<any[]>([]);

  useEffect(() => {
    fetchPODetails();
  }, [poId]);

  const fetchPODetails = async () => {
    try {
      setLoading(true);
      
      // Fetch PO details
      const poResponse = await apiClient.getFinancePurchaseOrder(poId, { session_key: sessionKey });
      setPOData(poResponse.data);
      
      // Fetch proforma invoices
      const proformaResponse = await apiClient.getFinanceProformaInvoices({ purchase_order: poId, session_key: sessionKey });
      setProformaInvoices(proformaResponse.data.results || []);
      
      // Fetch tax invoices
      const invoiceResponse = await apiClient.getFinanceInvoices({ purchase_order: poId, session_key: sessionKey });
      setTaxInvoices(invoiceResponse.data.results || []);
      
    } catch (error: any) {
      console.error('Error fetching PO details:', error);
      toast.error('Failed to fetch PO details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-300">Loading PO details...</p>
        </div>
      </div>
    );
  }

  if (!poData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <p className="text-center text-red-600">Failed to load PO details</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg mx-auto block">
            Close
          </button>
        </div>
      </div>
    );
  }

  const totalProformaAmount = proformaInvoices.reduce((sum, p) => sum + parseFloat(p.total_amount || '0'), 0);
  const totalProformaPaid = proformaInvoices.reduce((sum, p) => sum + parseFloat(p.paid_amount || '0'), 0);
  const totalProformaOutstanding = proformaInvoices.reduce((sum, p) => {
    const amount = parseFloat(p.total_amount || '0');
    const paid = parseFloat(p.paid_amount || '0');
    return sum + (amount - paid);
  }, 0);
  
  const totalInvoiceAmount = taxInvoices.reduce((sum, i) => sum + parseFloat(i.total_amount || '0'), 0);
  const totalInvoicePaid = taxInvoices.reduce((sum, i) => sum + parseFloat(i.paid_amount || '0'), 0);
  const totalInvoiceOutstanding = taxInvoices.reduce((sum, i) => sum + parseFloat(i.outstanding_amount || '0'), 0);
  
  const poTotalAmount = parseFloat(poData.total_amount || '0');
  const totalGenerated = totalProformaAmount + totalInvoiceAmount;
  const remainingToGenerate = poTotalAmount - totalGenerated;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              PO Details
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {poData.internal_po_number} • {poData.customer_name}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>



        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* PO Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl">
            <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-4 text-lg">Purchase Order Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <span className="text-blue-700 dark:text-blue-300 text-sm font-medium">Total PO Amount</span>
                <p className="font-bold text-xl text-blue-900 dark:text-blue-100">₹{poTotalAmount.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <span className="text-green-700 dark:text-green-300 text-sm font-medium">Bills Generated</span>
                <p className="font-bold text-xl text-green-900 dark:text-green-100">₹{totalGenerated.toLocaleString()}</p>
                <p className="text-xs text-green-600">{((totalGenerated / poTotalAmount) * 100).toFixed(1)}% of PO</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <span className="text-orange-700 dark:text-orange-300 text-sm font-medium">Remaining Balance</span>
                <p className="font-bold text-xl text-orange-900 dark:text-orange-100">₹{remainingToGenerate.toLocaleString()}</p>
                <p className="text-xs text-orange-600">{((remainingToGenerate / poTotalAmount) * 100).toFixed(1)}% pending</p>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                <span className="text-purple-700 dark:text-purple-300 text-sm font-medium">Total Payments</span>
                <p className="font-bold text-xl text-purple-900 dark:text-purple-100">₹{(totalProformaPaid + totalInvoicePaid).toLocaleString()}</p>
                <p className="text-xs text-purple-600">Received so far</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">PO Completion Progress</span>
                <span className="font-bold">{((totalGenerated / poTotalAmount) * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((totalGenerated / poTotalAmount) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Proforma Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center">
                <Receipt className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Proforma Invoices ({proformaInvoices.length})</h3>
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Total: ₹{totalProformaAmount.toLocaleString()}
              </div>
            </div>
            {proformaInvoices.length > 0 ? (
              <div className="divide-y">
                {proformaInvoices.map((proforma) => (
                  <div key={`proforma-${proforma.id}`} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{proforma.proforma_number}</h4>
                        <p className="text-sm text-gray-600">{new Date(proforma.proforma_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{parseFloat(proforma.total_amount || '0').toLocaleString()}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          proforma.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          proforma.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {proforma.payment_status?.replace('_', ' ').toUpperCase() || 'UNPAID'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Paid:</span>
                        <p className="font-medium text-green-600">₹{parseFloat(proforma.paid_amount || '0').toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Outstanding:</span>
                        <p className="font-medium text-red-600">₹{(parseFloat(proforma.total_amount || '0') - parseFloat(proforma.paid_amount || '0')).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">TDS Deducted:</span>
                        <p className="font-medium text-yellow-600">₹{parseFloat(proforma.total_tds_deducted || '0').toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium">
                    <div>Total: ₹{totalProformaAmount.toLocaleString()}</div>
                    <div className="text-green-600">Paid: ₹{totalProformaPaid.toLocaleString()}</div>
                    <div className="text-red-600">Outstanding: ₹{totalProformaOutstanding.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No proforma invoices generated</p>
              </div>
            )}
          </div>

          {/* Tax Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center">
                <CreditCard className="w-5 h-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-green-900 dark:text-green-100">Tax Invoices ({taxInvoices.length})</h3>
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">
                Total: ₹{totalInvoiceAmount.toLocaleString()}
              </div>
            </div>
            {taxInvoices.length > 0 ? (
              <div className="divide-y">
                {taxInvoices.map((invoice) => (
                  <div key={`invoice-${invoice.id}`} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">{invoice.invoice_number}</h4>
                        <p className="text-sm text-gray-600">{new Date(invoice.invoice_date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{parseFloat(invoice.total_amount || '0').toLocaleString()}</p>
                        <span className={`text-xs px-2 py-1 rounded ${
                          invoice.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          invoice.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {invoice.payment_status?.replace('_', ' ').toUpperCase() || 'UNPAID'}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Paid:</span>
                        <p className="font-medium text-green-600">₹{parseFloat(invoice.paid_amount || '0').toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Outstanding:</span>
                        <p className="font-medium text-red-600">₹{parseFloat(invoice.outstanding_amount || '0').toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">TDS Deducted:</span>
                        <p className="font-medium text-yellow-600">₹{parseFloat(invoice.total_tds_deducted || '0').toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-green-50 dark:bg-green-900/20">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium">
                    <div>Total: ₹{totalInvoiceAmount.toLocaleString()}</div>
                    <div className="text-green-600">Paid: ₹{totalInvoicePaid.toLocaleString()}</div>
                    <div className="text-red-600">Outstanding: ₹{totalInvoiceOutstanding.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No tax invoices generated</p>
              </div>
            )}
          </div>

          {/* Balance Summary */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6 rounded-xl">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Balance Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Outstanding Amounts</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Proforma Outstanding:</span>
                    <span className="font-medium text-red-600">₹{totalProformaOutstanding.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Invoice Outstanding:</span>
                    <span className="font-medium text-red-600">₹{totalInvoiceOutstanding.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium text-gray-700">Total Outstanding:</span>
                    <span className="font-bold text-red-700">₹{(totalProformaOutstanding + totalInvoiceOutstanding).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">Next Actions Required</h4>
                <div className="space-y-2">
                  {remainingToGenerate > 0 && (
                    <div className="flex items-center text-sm">
                      <AlertCircle className="w-4 h-4 text-orange-500 mr-2" />
                      <span>Generate bills for ₹{remainingToGenerate.toLocaleString()}</span>
                    </div>
                  )}
                  {totalProformaOutstanding > 0 && (
                    <div className="flex items-center text-sm">
                      <DollarSign className="w-4 h-4 text-red-500 mr-2" />
                      <span>Collect ₹{totalProformaOutstanding.toLocaleString()} from proformas</span>
                    </div>
                  )}
                  {totalInvoiceOutstanding > 0 && (
                    <div className="flex items-center text-sm">
                      <DollarSign className="w-4 h-4 text-red-500 mr-2" />
                      <span>Collect ₹{totalInvoiceOutstanding.toLocaleString()} from invoices</span>
                    </div>
                  )}
                  {remainingToGenerate === 0 && totalProformaOutstanding === 0 && totalInvoiceOutstanding === 0 && (
                    <div className="flex items-center text-sm text-green-600">
                      <Receipt className="w-4 h-4 mr-2" />
                      <span>PO fully completed and collected!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PODetailsModal;
