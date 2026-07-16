import React, { useState, useEffect, ErrorInfo, useCallback } from 'react';
import { X, FileText, IndianRupee, Printer, Building, User, MapPin, Calendar, Hash, CreditCard, RefreshCw, CheckCircle, Clock } from 'lucide-react';
import { isOverdue, getOverdueDate } from '../../../../utils/overdueUtils';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import { sanitizeText } from '../../../../utils/sanitize';
import { fmt } from './payment/types';

// Error Boundary Component
class InvoiceViewErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('InvoiceView Error Boundary caught an error:', {
      message: error.message,
      stack: error.stack?.substring(0, 500), // Limit stack trace
      componentStack: errorInfo.componentStack?.substring(0, 500)
    });
    
    if (this.props.onError) {
      this.props.onError();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-4 text-center">
            <div className="text-red-500 mb-4">
              <FileText className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Unable to Load Invoice
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              There was an error displaying the invoice details. This might be due to missing data or a temporary issue.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                if (this.props.onError) this.props.onError();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

interface InvoiceItem {
  id: number;
  product_name: string;
  product_code: string;
  description: string;
  hsn_sac_code: string;
  quantity: number;
  unit: string;
  unit_price: number;
  line_total: number;
  gst_rate: number;
  claim_type?: string;
  is_claimed?: boolean;
  claimed_percentage?: number;
  claimed_quantity_display?: string;
}

interface CustomerDetails {
  id: number;
  name: string;
  customer_code: string;
  email: string;
  phone: string;
  mobile: string;
  gstin: string;
  pan_number: string;
  project_area: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  billing_country: string;
  shipping_address_line1: string;
  shipping_address_line2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  shipping_country: string;
  payment_terms: string;
}

interface EffectiveShippingAddress {
  source: string;
  label: string;
  address: string;
  is_default: boolean;
}

interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  reference: string;
  customer_name: string;
  customer_code: string;
  customer_project_area: string;
  customer_gstin: string;
  company_gstin: string;
  company_name: string;
  company_address: string;
  proforma_number: string;
  purchase_order?: {
    internal_po_number: string;
    po_number: string;
    po_date: string;
  };
  quotation?: {
    quotation_number: string;
    quotation_date: string;
  };
  effective_shipping_address?: EffectiveShippingAddress;
  status: string;
  payment_status: string;
  is_work_completed: boolean;
  gst_type: string;
  subtotal: string;
  total_tax: string;
  total_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  discount_percentage: number;
  discount_amount: string;
  shipping_charges: string;
  other_charges: string;
  item_count: number;
  is_rejected?: boolean;
  rejection_reason?: string;
  is_revised?: boolean;
  revision_count?: number;
  revised_at?: string;
  revised_by_name?: string;
  invoice_items?: InvoiceItem[];
  customer_details?: CustomerDetails;
  notes: string;
  terms_and_conditions: string;
  payment_terms: string;
  created_at: string;
  created_by_name: string;
}

interface InvoiceViewProps {
  invoice: Invoice;
  onClose: () => void;
  onPrint?: (invoice: Invoice) => void;
  onStatusChange?: () => void;
  sessionKey?: string;
}

interface PaymentEntry {
  id: number;
  payment_number: string;
  payment_date: string;
  payment_type: string;
  payment_method: string;
  gross_payment_amount: string;
  net_amount_received: string;
  tds_amount: string;
  tds_rate: string;
  tds_section: string;
  tds_deposited: boolean;
  tds_certificate_received: boolean;
  reference_number: string;
  status: string;
  notes: string;
}

interface TDSDepositEntry {
  id: number;
  deposit_date: string;
  amount: string;
  challan_number: string;
  form16a_number: string;
  certificate_received: boolean;
}

const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, onClose, onPrint, sessionKey }) => {
  const [activeTab, setActiveTab] = useState<'invoice' | 'payments'>('invoice');
  const [detailedInvoice, setDetailedInvoice] = useState<Invoice>(invoice);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [depositsMap, setDepositsMap] = useState<Record<number, TDSDepositEntry[]>>({});
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const headerActionButtonClass = 'inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border transition-colors';
  const neutralActionButtonClass = `${headerActionButtonClass} bg-white/85 hover:bg-white text-gray-700 border-gray-200 dark:bg-gray-800/80 dark:hover:bg-gray-800 dark:text-gray-200 dark:border-gray-600`;
  const primaryActionButtonClass = `${headerActionButtonClass} bg-blue-600 hover:bg-blue-700 text-white border-blue-600`;

  const fetchPayments = useCallback(async () => {
    if (!sessionKey) return;
    setPaymentsLoading(true);
    try {
      const res = await api.get(`/api/finance/payments/`, {
        params: { session_key: sessionKey, invoice: invoice.id, financial_year: 'all' }
      });
      const pmts: PaymentEntry[] = res.data.results ?? res.data;
      setPayments(pmts);
      // fetch deposits for each completed payment
      const map: Record<number, TDSDepositEntry[]> = {};
      await Promise.all(pmts.filter(p => p.status === 'completed').map(async p => {
        try {
          const r = await api.get(`/api/finance/payment-tds/${p.id}/deposits/`, { params: { session_key: sessionKey } });
          map[p.id] = r.data.results ?? r.data;
        } catch { map[p.id] = []; }
      }));
      setDepositsMap(map);
    } catch { /* silent */ }
    finally { setPaymentsLoading(false); }
  }, [invoice.id, sessionKey]);

  const fetchDetailedInvoice = async () => {
      if (!sessionKey) {
        console.error('No sessionKey provided to InvoiceView');
        setError('Session expired. Please login again.');
        toast.error('Session expired. Please login again.');
        return;
      }
      
      if (!invoice?.id) {
        console.error('No invoice ID provided');
        setError('Invalid invoice data provided.');
        toast.error('Invalid invoice data provided.');
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching detailed invoice:', sanitizeText(invoice.id?.toString() || ''), 'with sessionKey:', sessionKey ? 'Present' : 'Missing');
        
        const response = await api.get(`/api/finance/invoices/${invoice.id}/`, {
          params: { session_key: sessionKey }
        });
        
        if (!response.data) {
          throw new Error('No data received from server');
        }
        
        console.log('Invoice API response received successfully');
        // Merge: keep flat fields from prop (customer_name, purchase_order, status)
        // that the detail serializer doesn't return, but override everything else
        const merged = {
          ...invoice,           // base: has customer_name, purchase_order, status
          ...response.data,     // override with full detail data
          // Restore flat fields the detail serializer omits
          customer_name: response.data.customer_details?.name || invoice.customer_name,
          customer_code: response.data.customer_details?.customer_code || invoice.customer_code,
          customer_gstin: response.data.customer_gstin || invoice.customer_gstin,
          customer_project_area: response.data.customer_details?.project_area || invoice.customer_project_area,
          // purchase_order_details → purchase_order for source display
          purchase_order: response.data.purchase_order_details ? {
            internal_po_number: response.data.purchase_order_details.internal_po_number,
            po_number: response.data.purchase_order_details.po_number,
            po_date: response.data.purchase_order_details.po_date,
          } : invoice.purchase_order,
          // status is not in detail serializer — keep from prop
          status: invoice.status,
          is_rejected: response.data.is_rejected ?? invoice.is_rejected,
        };
        setDetailedInvoice(merged);
      } catch (error: any) {
        console.error('Error fetching detailed invoice - Status:', error.response?.status || 'Unknown');
        console.error('Error details:', error.response?.data?.message || 'No additional details');
        
        const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.response?.data?.detail ||
                            'Failed to load detailed invoice data';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    fetchDetailedInvoice();
    fetchPayments();
  }, [invoice.id, sessionKey]);

  const handlePrint = async () => {
    if (onPrint) { onPrint(detailedInvoice); return; }
    if (!sessionKey) return;
    try {
      const response = await fetch(`/api/finance/invoices/${detailedInvoice.id}/pdf/?session_key=${sessionKey}`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) win.onload = () => win.print();
    } catch (e) {
      toast.error('Failed to generate PDF for printing');
    }
  };

  const handleDownload = async () => {
    if (!sessionKey) return;
    try {
      const response = await fetch(`/api/finance/invoices/${detailedInvoice.id}/pdf/?session_key=${sessionKey}`, {
        headers: { 'Authorization': `Bearer ${sessionKey}` }
      });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${detailedInvoice.invoice_number}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      toast.error('Failed to download PDF');
    }
  };

  const formatAddress = (details: CustomerDetails | undefined, type: 'billing' | 'shipping') => {
    if (!details) return 'N/A';
    
    const addressParts = [];
    if (type === 'billing') {
      if (details.billing_address_line1) addressParts.push(details.billing_address_line1);
      if (details.billing_address_line2) addressParts.push(details.billing_address_line2);
      if (details.billing_city) addressParts.push(details.billing_city);
      if (details.billing_state) addressParts.push(details.billing_state);
      if (details.billing_pincode) addressParts.push(details.billing_pincode);
      if (details.billing_country) addressParts.push(details.billing_country);
    } else {
      if (details.shipping_address_line1) addressParts.push(details.shipping_address_line1);
      if (details.shipping_address_line2) addressParts.push(details.shipping_address_line2);
      if (details.shipping_city) addressParts.push(details.shipping_city);
      if (details.shipping_state) addressParts.push(details.shipping_state);
      if (details.shipping_pincode) addressParts.push(details.shipping_pincode);
      if (details.shipping_country) addressParts.push(details.shipping_country);
    }
    
    return addressParts.length > 0 ? addressParts.join(', ') : 'N/A';
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-4 text-center">
          <div className="text-red-500 mb-4">
            <FileText className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Invoice
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {error}
          </p>
          <div className="flex space-x-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                setLoading(false);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md mx-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Loading invoice details...</p>
          <p className="text-center mt-2 text-sm text-gray-500 dark:text-gray-500">Invoice #{invoice.invoice_number}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tax Invoice
              </h2>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {detailedInvoice.invoice_number}
              </p>
              {detailedInvoice.is_revised && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 mt-1">
                  Revised ({detailedInvoice.revision_count} times)
                </span>
              )}
            </div>
          </div>
            <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDetailedInvoice()}
              className={neutralActionButtonClass}
              title="Refresh invoice status"
            >
              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className={`${neutralActionButtonClass} px-3`}
              title="Close"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0 px-6">
          <button onClick={() => setActiveTab('invoice')}
            className={`flex items-center gap-2 py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'invoice'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" /> Invoice
          </button>
          <button onClick={() => { setActiveTab('payments'); fetchPayments(); }}
            className={`flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Payments
            {parseFloat(detailedInvoice.outstanding_amount || '0') > 0 && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                ₹{fmt(detailedInvoice.outstanding_amount)}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'payments' ? (
            <div className="p-6 space-y-5">
              {/* Payment summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Invoice Total</p>
                  <p className="text-base font-bold text-blue-600">₹{fmt(detailedInvoice.total_amount)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-700 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Paid</p>
                  <p className="text-base font-bold text-green-600">₹{fmt(detailedInvoice.paid_amount)}</p>
                </div>
                <div className={`border rounded-lg p-3 text-center ${
                  parseFloat(detailedInvoice.outstanding_amount || '0') > 0
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-700'
                    : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-700'
                }`}>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Outstanding</p>
                  <p className={`text-base font-bold ${
                    parseFloat(detailedInvoice.outstanding_amount || '0') > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>₹{fmt(detailedInvoice.outstanding_amount)}</p>
                </div>
              </div>

              {paymentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No payments recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.filter(p => p.status === 'completed').map(p => {
                    const isTdsOnly = p.payment_type === 'tds_only';
                    const deposits = depositsMap[p.id] || [];
                    const net = parseFloat(p.net_amount_received || '0');
                    const tds = parseFloat(p.tds_amount || '0');
                    return (
                      <div key={p.id} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* Payment row */}
                        <div className={`flex items-center justify-between px-4 py-3 ${
                          isTdsOnly ? 'bg-orange-50 dark:bg-orange-900/10' : 'bg-white dark:bg-gray-800'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              isTdsOnly ? 'bg-orange-400' : 'bg-green-400'
                            }`} />
                            <div>
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{p.payment_number}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {p.payment_date} · {p.payment_method?.replace(/_/g, ' ')}
                                {p.reference_number && ` · #${p.reference_number}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            {isTdsOnly ? (
                              <p className="text-sm font-bold text-orange-600">TDS ₹{fmt(tds)}</p>
                            ) : (
                              <>
                                <p className="text-sm font-bold text-green-600">₹{fmt(net)}</p>
                                {tds > 0 && <p className="text-xs text-orange-500">+TDS ₹{fmt(tds)}</p>}
                              </>
                            )}
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isTdsOnly
                                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            }`}>
                              {isTdsOnly ? 'TDS Only' : 'Cash'}
                            </span>
                          </div>
                        </div>
                        {/* TDS deposit entries */}
                        {deposits.length > 0 && (
                          <div className="border-t border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                            {deposits.map(d => (
                              <div key={d.id} className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/40 text-xs">
                                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                  <span className="text-orange-400">↳</span>
                                  <span>Deposit {d.deposit_date}</span>
                                  {d.challan_number && <span className="text-gray-400">#{d.challan_number}</span>}
                                  {d.form16a_number && <span className="text-blue-500">16A: {d.form16a_number}</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-orange-600">₹{fmt(d.amount)}</span>
                                  {d.certificate_received
                                    ? <span className="flex items-center gap-0.5 text-green-600"><CheckCircle className="w-3 h-3" /> 16A</span>
                                    : <span className="flex items-center gap-0.5 text-amber-500"><Clock className="w-3 h-3" /> Pending</span>
                                  }
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {p.notes && (
                          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 italic">{p.notes}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
          <div className="p-6 space-y-8">
            {/* Company & Customer Info - Invoice Header Style */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Company Details */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Building className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">From (Company)</h3>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {detailedInvoice.company_name || 'Company Name'}
                    </div>
                    {detailedInvoice.company_address && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {detailedInvoice.company_address}
                      </div>
                    )}
                    {detailedInvoice.company_gstin && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">GSTIN:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{detailedInvoice.company_gstin}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Details */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-3">
                  <User className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">To (Customer)</h3>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {sanitizeText(detailedInvoice.customer_name) || 'Unknown Customer'}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Code:</span>
                      <span className="ml-2 text-gray-600 dark:text-gray-400">{detailedInvoice.customer_code}</span>
                    </div>
                    {detailedInvoice.customer_details?.email && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{detailedInvoice.customer_details.email}</span>
                      </div>
                    )}
                    {detailedInvoice.customer_details?.phone && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Phone:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{detailedInvoice.customer_details.phone}</span>
                      </div>
                    )}
                    {detailedInvoice.customer_gstin && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">GSTIN:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{detailedInvoice.customer_gstin}</span>
                      </div>
                    )}
                    {detailedInvoice.customer_project_area && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Project:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">{detailedInvoice.customer_project_area}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Billing Address */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-purple-600" />
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Billing Address</h4>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {formatAddress(detailedInvoice.customer_details, 'billing')}
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5 text-orange-600" />
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Shipping Address</h4>
                  {detailedInvoice.effective_shipping_address?.source && (
                    <span className="text-xs px-2 py-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 rounded-full">
                      {detailedInvoice.effective_shipping_address.source}
                    </span>
                  )}
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="space-y-2">
                    {detailedInvoice.effective_shipping_address?.label && (
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-300">
                        {detailedInvoice.effective_shipping_address.label}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {detailedInvoice.effective_shipping_address?.address || formatAddress(detailedInvoice.customer_details, 'shipping')}
                    </div>
                    {detailedInvoice.effective_shipping_address?.source && (
                      <div className="text-xs text-orange-600 dark:text-orange-400">
                        Source: {detailedInvoice.effective_shipping_address.source}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Invoice Date</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {detailedInvoice?.invoice_date ? new Date(detailedInvoice.invoice_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</span>
                </div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {detailedInvoice?.due_date ? new Date(detailedInvoice.due_date).toLocaleDateString() : 'N/A'}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Hash className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Source</span>
                </div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {detailedInvoice.purchase_order ? 
                    `PO: ${detailedInvoice.purchase_order.internal_po_number}` : 
                    detailedInvoice.quotation ? 
                      `Quotation: ${detailedInvoice.quotation.quotation_number}` :
                      detailedInvoice.proforma_number ? 
                        `Proforma: ${detailedInvoice.proforma_number}` : 
                        'Direct Invoice'
                  }
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
                </div>
                <div className="flex flex-col space-y-1">
                  {detailedInvoice.is_rejected ? (
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                      REJECTED
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isOverdue(detailedInvoice.invoice_date, detailedInvoice.payment_status)
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                    }`}>
                      {isOverdue(detailedInvoice.invoice_date, detailedInvoice.payment_status)
                        ? 'OVERDUE'
                        : `DUE ${getOverdueDate(detailedInvoice.invoice_date)?.toLocaleDateString()}`}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    detailedInvoice.payment_status === 'paid'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : detailedInvoice.payment_status === 'partially_paid'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {(detailedInvoice.payment_status === 'overdue' ? 'UNPAID' : (detailedInvoice.payment_status || 'UNPAID')).replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection Reason */}
            {detailedInvoice.is_rejected && detailedInvoice.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <h4 className="text-md font-semibold text-red-800 dark:text-red-300 mb-2">Rejection Reason</h4>
                <p className="text-sm text-red-700 dark:text-red-400">{detailedInvoice.rejection_reason}</p>
              </div>
            )}

            {/* Items Table */}
            {detailedInvoice.invoice_items && detailedInvoice.invoice_items.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span>Invoice Items</span>
                </h3>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            S.No
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Product Details
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            HSN/SAC
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Unit Price
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            GST %
                          </th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {detailedInvoice.invoice_items.map((item, index) => (
                          <tr key={item.id || index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                              <div className="font-medium">{item.product_name}</div>
                              {item.product_code && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">Code: {item.product_code}</div>
                              )}
                              {item.description && (
                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.description}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              {item.hsn_sac_code || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <span>
                                  {item.claimed_quantity_display || `${parseFloat(item.quantity.toString()).toFixed(2)} ${item.unit}`}
                                </span>
                                {item.is_claimed && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                    ✓ CLAIMED
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                              ₹{parseFloat(item.unit_price.toString()).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                              {parseFloat(item.gst_rate?.toString() || '0').toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                              ₹{parseFloat(item.line_total.toString()).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Amount Summary - Invoice Style */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6 border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                <IndianRupee className="w-5 h-5 text-green-600" />
                <span>Amount Summary</span>
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Breakdown */}
                <div className="space-y-3">
                  <div className="flex justify-between py-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      ₹{parseFloat(detailedInvoice.subtotal || '0').toFixed(2)}
                    </span>
                  </div>
                  
                  {parseFloat(detailedInvoice.discount_amount || '0') > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Discount {detailedInvoice.discount_percentage > 0 ? `(${detailedInvoice.discount_percentage}%)` : ''}:
                      </span>
                      <span className="text-sm font-semibold text-red-600">
                        -₹{parseFloat(detailedInvoice.discount_amount || '0').toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {detailedInvoice.gst_type === 'cgst_sgst' ? (
                    <>
                      <div className="flex justify-between py-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CGST:</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          ₹{parseFloat(detailedInvoice.cgst_amount || '0').toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">SGST:</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          ₹{parseFloat(detailedInvoice.sgst_amount || '0').toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : detailedInvoice.gst_type === 'igst' ? (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">IGST:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{parseFloat(detailedInvoice.igst_amount || '0').toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tax:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{parseFloat(detailedInvoice.total_tax || '0').toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {parseFloat(detailedInvoice.shipping_charges || '0') > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Charges:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{parseFloat(detailedInvoice.shipping_charges || '0').toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {parseFloat(detailedInvoice.other_charges || '0') > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Other Charges:</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{parseFloat(detailedInvoice.other_charges || '0').toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Right Column - Totals */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount:</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ₹{parseFloat(detailedInvoice.total_amount || '0').toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">Paid Amount:</span>
                      <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                        ₹{parseFloat(detailedInvoice.paid_amount || '0').toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className={`p-4 rounded-lg border ${
                    parseFloat(detailedInvoice.outstanding_amount || '0') > 0 
                      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${
                        parseFloat(detailedInvoice.outstanding_amount || '0') > 0 
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                        Outstanding:
                      </span>
                      <span className={`text-lg font-semibold ${
                        parseFloat(detailedInvoice.outstanding_amount || '0') > 0 
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}>
                        ₹{parseFloat(detailedInvoice.outstanding_amount || '0').toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Notes */}
              {detailedInvoice.notes && (
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Notes</h4>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{detailedInvoice.notes}</p>
                  </div>
                </div>
              )}
              
              {/* Terms & Conditions */}
              {detailedInvoice.terms_and_conditions && (
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white">Terms & Conditions</h4>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-gray-700 dark:text-gray-300">{detailedInvoice.terms_and_conditions}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Terms */}
            {detailedInvoice.payment_terms && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <h4 className="text-md font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Payment Terms</h4>
                <p className="text-sm text-indigo-700 dark:text-indigo-400">{detailedInvoice.payment_terms}</p>
              </div>
            )}

            {/* Footer Info */}
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Created By:</span> {detailedInvoice.created_by_name}
                </div>
                <div>
                  <span className="font-medium">Created On:</span> {new Date(detailedInvoice.created_at).toLocaleString()}
                </div>
                {detailedInvoice.is_revised && (
                  <div className="md:col-span-2">
                    <span className="font-medium">Last Revised:</span> {detailedInvoice.revised_at ? new Date(detailedInvoice.revised_at).toLocaleString() : 'N/A'} by {detailedInvoice.revised_by_name || 'N/A'}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Invoice #{detailedInvoice.invoice_number} • {detailedInvoice.invoice_items?.length || 0} items
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className={neutralActionButtonClass}
            >
              <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={handlePrint}
              className={primaryActionButtonClass}
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className={neutralActionButtonClass}
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapped component with error boundary
const InvoiceViewWithErrorBoundary: React.FC<InvoiceViewProps> = (props) => {
  return (
    <InvoiceViewErrorBoundary onError={props.onClose}>
      <InvoiceView {...props} />
    </InvoiceViewErrorBoundary>
  );
};

export default InvoiceViewWithErrorBoundary;
