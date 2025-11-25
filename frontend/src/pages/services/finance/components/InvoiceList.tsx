import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, Calendar, User, DollarSign, Eye, Edit, XCircle, Download, Mail, CheckCircle, Clock, TrendingUp, RotateCcw } from 'lucide-react';

import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import InvoiceView from './InvoiceView';
import SimpleTaxInvoiceForm from './SimpleTaxInvoiceForm';
import UpdatePaymentModal from './UpdatePaymentModal';
import SendEmailModal from './SendEmailModal';
import RejectInvoiceModal from './RejectInvoiceModal';
import MetricCard from './MetricCard';


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
  is_revised?: boolean;
  revision_count?: number;
  revised_at?: string;
  revised_by_name?: string;
  created_at: string;
  created_by_name: string;
  // Optional customer and address fields for edit forms
  customer_details?: any;
  customer?: number;
  customer_email?: string;
  customer_phone?: string;
  customer_gstin?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  billing_country?: string;
  shipping_address_details?: any;
}

interface InvoiceListProps {
  onAddInvoice: () => void;
  sessionKey: string;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ onAddInvoice, sessionKey }) => {

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<Invoice | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedForEmail, setSelectedForEmail] = useState<Invoice | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedForReject, setSelectedForReject] = useState<Invoice | null>(null);
  const [metrics, setMetrics] = useState({
    total: 0,
    paid: 0,
    outstanding: 0,
    rejected: 0,
    totalAmount: 0,
    paymentRate: 0
  });


  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent to Customer' },
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const paymentStatusOptions = [
    { value: '', label: 'All Payment Status' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' },
  ];

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchInvoices = async () => {
    if (!sessionKey) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '10',
      });

      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentStatusFilter) params.append('payment_status', paymentStatusFilter);

      const response = await api.get(`/api/finance/invoices/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      });

      const invoices = response.data.results || [];
      setInvoices(invoices);
      setTotalPages(Math.ceil(response.data.count / 10));
      
      // Calculate metrics
      const total = invoices.length;
      const paid = invoices.filter((inv: Invoice) => inv.payment_status === 'paid').length;
      const rejected = invoices.filter((inv: Invoice) => inv.is_rejected).length;
      const totalAmount = invoices.reduce((sum: number, inv: Invoice) => sum + parseFloat(inv.total_amount || '0'), 0);
      const paidAmount = invoices.reduce((sum: number, inv: Invoice) => sum + parseFloat(inv.paid_amount || '0'), 0);
      const outstandingAmount = invoices.reduce((sum: number, inv: Invoice) => sum + parseFloat(inv.outstanding_amount || '0'), 0);
      const paymentRate = totalAmount > 0 ? ((paidAmount / totalAmount) * 100) : 0;
      
      setMetrics({ total, paid, outstanding: outstandingAmount, rejected, totalAmount, paymentRate });
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [sessionKey, currentPage, debouncedSearchTerm, statusFilter, paymentStatusFilter]);

  const handleUpdatePayment = (invoice: Invoice) => {
    setSelectedForPayment(invoice);
    setShowPaymentModal(true);
  };



  const handleReject = (invoice: Invoice) => {
    setSelectedForReject(invoice);
    setShowRejectModal(true);
  };

  const handleReverseInvoice = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to reverse invoice ${invoice.invoice_number}? This will allow you to edit it once more.`)) {
      return;
    }

    try {
      // Create mutable copy of request data
      const requestData = {
        status: 'draft',
        is_revised: true,
        revision_count: (invoice.revision_count || 0) + 1,
        revised_at: new Date().toISOString(),
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date
      }

      const response = await fetch(`/api/finance/invoices/${invoice.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionKey}`
        },
        body: JSON.stringify({ ...requestData, session_key: sessionKey })
      })

      if (!response.ok) {
        throw new Error('Failed to reverse invoice')
      }

      toast.success('Invoice reversed successfully! You can now edit it.');
      fetchInvoices();
    } catch (error) {
      console.error('Error reversing invoice:', error);
      toast.error('Failed to reverse invoice');
    }
  };

  const handleDownloadPDF = async (id: number, invoiceNumber: string) => {
    try {
      const response = await api.get(`/api/finance/invoices/${id}/pdf/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleSendEmail = (invoice: Invoice) => {
    setSelectedForEmail(invoice);
    setShowEmailModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusBadge = (paymentStatus: string) => {
    const statusConfig = {
      unpaid: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return statusConfig[paymentStatus as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-athenas-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your invoices and track payments</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAddInvoice}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-athenas-blue to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            From Purchase Order
          </button>

        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Invoices"
          value={metrics.total}
          subtitle={`${metrics.total} invoices created`}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="Paid Invoices"
          value={metrics.paid}
          subtitle={`${metrics.paid} invoices paid`}
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Outstanding"
          value={`₹${metrics.outstanding.toLocaleString()}`}
          subtitle="Amount pending collection"
          icon={Clock}
          color="orange"
        />
        <MetricCard
          title="Rejected"
          value={metrics.rejected}
          subtitle={`${metrics.rejected} invoices rejected`}
          icon={XCircle}
          color="red"
        />
        <MetricCard
          title="Payment Rate"
          value={`${metrics.paymentRate.toFixed(1)}%`}
          subtitle={`₹${metrics.totalAmount.toLocaleString()} total value`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {paymentStatusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setDebouncedSearchTerm('');
              setStatusFilter('');
              setPaymentStatusFilter('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first invoice</p>
            <div className="flex gap-2">
              <button
                onClick={onAddInvoice}
                className="inline-flex items-center px-4 py-2 bg-athenas-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                From Purchase Order
              </button>

            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="w-5 h-5 text-athenas-blue mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center space-x-2">
                            <span 
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowInvoiceView(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 cursor-pointer"
                            >
                              {invoice.invoice_number}
                            </span>
                            {invoice.is_revised && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                                Revised
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">From: {invoice.proforma_number}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{invoice.customer_name ? invoice.customer_name.replace(/[<>"'&]/g, '') : ''}</div>
                          <div className="text-sm text-gray-500">{invoice.customer_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500">
                            Due: {new Date(invoice.due_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            ₹{parseFloat(invoice.subtotal || '0').toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Outstanding: ₹{parseFloat(invoice.outstanding_amount || '0').toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(invoice.status)}`}>
                        {invoice.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadge(invoice.payment_status)}`}>
                        {invoice.payment_status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {invoice.is_rejected ? (
                          // Only show view button for rejected invoices
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowInvoiceView(true);
                            }}
                            className="text-athenas-blue hover:text-blue-600 transition-colors"
                            title="View Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        ) : (
                          // Show all buttons for non-rejected invoices
                          <>
                            <button
                              onClick={() => handleUpdatePayment(invoice)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Update Payment"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowInvoiceView(true);
                              }}
                              className="text-athenas-blue hover:text-blue-600 transition-colors"
                              title="View Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleSendEmail(invoice)}
                              className="text-blue-600 hover:text-blue-800 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                              className="text-orange-600 hover:text-orange-800 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {/* Draft status buttons */}
                            {invoice.status === 'draft' && (
                              <button
                                onClick={async () => {
                                  try {
                                    // Fetch complete invoice data with customer details
                                    const response = await fetch(`/api/finance/invoices/${invoice.id}/`, {
                                      headers: {
                                        'Authorization': `Bearer ${sessionKey}`
                                      }
                                    })
                                    
                                    if (response.ok) {
                                      const completeData = await response.json()
                                      setSelectedForEdit(completeData)
                                    } else {
                                      setSelectedForEdit(invoice)
                                    }
                                  } catch (error) {
                                    console.error('Error fetching complete invoice data:', error)
                                    setSelectedForEdit(invoice)
                                  }
                                  setShowEditForm(true)
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Sent/Active status buttons */}
                            {(invoice.status === 'sent' || invoice.status === 'active') && (
                              <>
                                {/* Only allow reverse if not already revised */}
                                {!invoice.is_revised && (
                                  <button
                                    onClick={() => handleReverseInvoice(invoice)}
                                    className="text-orange-600 hover:text-orange-800 transition-colors"
                                    title="Reverse Invoice (Edit Once)"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                            <button
                              onClick={() => handleReject(invoice)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Reject Invoice"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice View Modal */}
      {showInvoiceView && selectedInvoice && (
        <InvoiceView
          invoice={selectedInvoice}
          onClose={() => {
            setShowInvoiceView(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Update Payment Modal */}
      {showPaymentModal && selectedForPayment && (
        <UpdatePaymentModal
          invoice={{
            id: selectedForPayment.id,
            invoice_number: selectedForPayment.invoice_number,
            total_amount: selectedForPayment.subtotal || '0',
            outstanding_amount: selectedForPayment.outstanding_amount || '0'
          }}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedForPayment(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedForPayment(null);
            fetchInvoices();
          }}
          sessionKey={sessionKey}
        />
      )}

      {/* Send Email Modal */}
      {showEmailModal && selectedForEmail && (
        <SendEmailModal
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedForEmail(null);
          }}
          invoiceId={selectedForEmail.id}
          invoiceNumber={selectedForEmail.invoice_number}
          invoiceType="tax_invoice"
          customerEmail=""
          onSuccess={() => {
            setShowEmailModal(false);
            setSelectedForEmail(null);
            fetchInvoices();
          }}
        />
      )}

      {/* Reject Invoice Modal */}
      {showRejectModal && selectedForReject && (
        <RejectInvoiceModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedForReject(null);
          }}
          onSuccess={() => {
            setShowRejectModal(false);
            setSelectedForReject(null);
            fetchInvoices();
          }}
          invoiceId={selectedForReject.id}
          invoiceNumber={selectedForReject.invoice_number}
          invoiceType="tax"
          sessionKey={sessionKey}
        />
      )}



      {/* Tax Invoice Edit Form */}
      {showEditForm && selectedForEdit && (
        <SimpleTaxInvoiceForm
          editingInvoice={selectedForEdit}
          invoiceData={{
            claim_type: 'percentage',
            claim_percentage: 100
          }}
          quotation={{
            id: selectedForEdit.id,
            quotation_number: selectedForEdit.invoice_number,
            customer_details: selectedForEdit.customer_details || {
              id: selectedForEdit.customer || selectedForEdit.id,
              name: selectedForEdit.customer_name,
              customer_code: selectedForEdit.customer_code,
              email: selectedForEdit.customer_email || '',
              phone: selectedForEdit.customer_phone || '',
              gstin: selectedForEdit.customer_gstin || '',
              project_area: selectedForEdit.customer_project_area,
              billing_address_line1: selectedForEdit.billing_address_line1 || '',
              billing_address_line2: selectedForEdit.billing_address_line2 || '',
              billing_city: selectedForEdit.billing_city || '',
              billing_state: selectedForEdit.billing_state || '',
              billing_pincode: selectedForEdit.billing_pincode || '',
              billing_country: selectedForEdit.billing_country || 'India'
            },
            shipping_address_details: selectedForEdit.shipping_address_details || 
              (selectedForEdit.customer_details?.shipping_address_line1 ? {
                address_line1: selectedForEdit.customer_details.shipping_address_line1,
                address_line2: selectedForEdit.customer_details.shipping_address_line2 || '',
                city: selectedForEdit.customer_details.shipping_city || '',
                state: selectedForEdit.customer_details.shipping_state || '',
                pincode: selectedForEdit.customer_details.shipping_pincode || '',
                country: selectedForEdit.customer_details.shipping_country || 'India'
              } : null),
            quotation_items: [{
              id: Math.random(),
              product: 'Service',
              product_name: 'Tax Invoice Service',
              quantity: 1,
              unit: 'NOS',
              unit_price: selectedForEdit.subtotal,
              gst_rate: '18'
            }],
            subtotal: selectedForEdit.subtotal,
            total_amount: selectedForEdit.total_amount,
            available_invoice_percentage: '100',
            remaining_invoice_balance: selectedForEdit.total_amount
          }}
          onClose={() => {
            setShowEditForm(false);
            setSelectedForEdit(null);
          }}
          onSuccess={() => {
            setShowEditForm(false);
            setSelectedForEdit(null);
            fetchInvoices();
          }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-6 py-3 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
