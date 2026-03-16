import React, { useState, useEffect } from 'react';
import { Plus, Search, FileText, User, IndianRupee, Eye, Edit, XCircle, Download, Mail, RotateCcw } from 'lucide-react';

import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import InvoiceView from './InvoiceView';
import DirectCreateTaxInvoiceModal from './DirectCreateTaxInvoiceModal';
import EditInvoiceModal from './EditInvoiceModal';
import UpdatePaymentModal from './UpdatePaymentModal';
import SendEmailModal from './SendEmailModal';
import RejectInvoiceModal from './RejectInvoiceModal';
import CreateNewInvoiceModal from './CreateNewInvoiceModal';


interface Invoice {
  id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  reference?: string;
  customer_name: string;
  customer_code: string;
  customer_project_area: string;
  customer_gstin?: string;
  customer_shipping_addresses?: Array<{
    type: string;
    address: string;
    is_default?: boolean;
  }>;
  company_gstin?: string;
  company_name?: string;
  company_address?: string;
  shipping_address?: string;
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
  status: string;
  payment_status: string;
  gst_type: string;
  subtotal: string;
  total_tax: string;
  total_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  cgst_amount?: string;
  sgst_amount?: string;
  igst_amount?: string;
  discount_percentage?: number;
  discount_amount?: string;
  shipping_charges?: string;
  other_charges?: string;
  item_count: number;
  invoice_items?: Array<{
    id?: number;
    product_name: string;
    product_code?: string;
    description?: string;
    hsn_sac_code?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    line_total: number;
    gst_rate?: number;
  }>;
  customer_details?: {
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
  };
  is_rejected?: boolean;
  rejection_reason?: string;
  is_revised?: boolean;
  revision_count?: number;
  revised_at?: string;
  revised_by_name?: string;
  notes?: string;
  terms_and_conditions?: string;
  payment_terms?: string;
  created_at: string;
  created_by_name: string;
  // Optional customer and address fields for edit forms
  customer?: number;
  customer_email?: string;
  customer_phone?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_city?: string;
  billing_state?: string;
  billing_pincode?: string;
  billing_country?: string;
  shipping_address_details?: any;
}

interface InvoiceListProps {
  sessionKey: string;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ sessionKey }) => {
  console.log('🔍 InvoiceList - Component initialized with sessionKey:', sessionKey ? 'Present' : 'Missing');
  console.log('🔍 InvoiceList - sessionKey length:', sessionKey?.length || 0);

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
  const [showCreateNewModal, setShowCreateNewModal] = useState(false);
  const [selectedForNewInvoice, setSelectedForNewInvoice] = useState<Invoice | null>(null);
  const [hoveredInvoice, setHoveredInvoice] = useState<number | string | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showDirectInvoiceForm, setShowDirectInvoiceForm] = useState(false);
  const [invoiceItemsCache, setInvoiceItemsCache] = useState<{ [key: number]: any[] }>({});


  const statusOptions = [
    { value: '', label: 'All Invoice Status' },
    { value: 'active', label: 'Active' },
    { value: 'partially_completed', label: 'Partially Completed' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' },
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
    if (!sessionKey) {
      console.log('🔍 InvoiceList - No sessionKey available');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 InvoiceList - Making API call with sessionKey');
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '10',
        session_key: sessionKey
      });

      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentStatusFilter) params.append('payment_status', paymentStatusFilter);

      console.log('🔍 InvoiceList - API URL:', `/api/finance/invoices/?${params.toString()}`);
      
      const response = await api.get(`/api/finance/invoices/?${params.toString()}`);
      
      console.log('🔍 InvoiceList - API response:', response.data);

      const invoices = response.data.results || [];
      
      // Add safety checks for invoice data and derive status from available fields
      const safeInvoices = invoices.map((invoice: any) => {
        // Derive status from available fields
        let derivedStatus = 'active'; // default status
        
        if (invoice.is_rejected) {
          derivedStatus = 'rejected';
        } else if (invoice.payment_status === 'paid') {
          derivedStatus = 'completed';
        } else if (invoice.payment_status === 'partially_paid') {
          derivedStatus = 'partially_completed';
        }
        
        return {
          ...invoice,
          status: derivedStatus, // Use derived status
          payment_status: invoice.payment_status || 'unpaid',
          customer_name: invoice.customer_name || 'Unknown Customer',
          invoice_number: invoice.invoice_number || 'No Number',
          total_amount: invoice.total_amount || '0',
          outstanding_amount: invoice.outstanding_amount || '0'
        };
      });
      
      // Debug: Check if customer_shipping_addresses is in the response
      console.log('First Invoice customer data:', safeInvoices[0] ? {
        customer_name: safeInvoices[0].customer_name,
        customer_shipping_addresses: safeInvoices[0].customer_shipping_addresses,
        hasAddresses: safeInvoices[0].customer_shipping_addresses && safeInvoices[0].customer_shipping_addresses.length > 0
      } : 'No invoices found');
      
      setInvoices(safeInvoices);
      setTotalPages(Math.ceil(response.data.count / 10));
    } catch (error: any) {
      console.error('🔍 InvoiceList - Error fetching invoices:', error);
      console.error('🔍 InvoiceList - Error response:', error.response?.data);
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [sessionKey, currentPage, debouncedSearchTerm, statusFilter, paymentStatusFilter]);

  const fetchInvoiceItems = async (invoiceId: number) => {
    if (invoiceItemsCache[invoiceId]) {
      return invoiceItemsCache[invoiceId];
    }
    
    try {
      const response = await api.get(`/api/finance/invoices/${invoiceId}/`, {
        params: { session_key: sessionKey }
      });
      
      const items = response.data.invoice_items || [];
      setInvoiceItemsCache(prev => ({ ...prev, [invoiceId]: items }));
      return items;
    } catch (error) {
      console.error('Error fetching invoice items:', error);
      return [];
    }
  };

  const handleUpdatePayment = (invoice: Invoice) => {
    setSelectedForPayment(invoice);
    setShowPaymentModal(true);
  };



  const handleReject = (invoice: Invoice) => {
    setSelectedForReject(invoice);
    setShowRejectModal(true);
  };

  const handleCreateNewInvoice = (invoice: Invoice) => {
    setSelectedForNewInvoice(invoice);
    setShowCreateNewModal(true);
  };

  const handleReviseInvoice = async (invoice: Invoice) => {
    if (!confirm(`Are you sure you want to revise invoice ${invoice.invoice_number}? This will allow you to edit it once more.`)) {
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
        throw new Error('Failed to revise invoice')
      }

      toast.success('Invoice revised successfully! You can now edit it.');
      fetchInvoices();
    } catch (error) {
      console.error('Error reversing invoice:', error);
      toast.error('Failed to revise invoice');
    }
  };

  const handleDownloadPDF = async (id: number, invoiceNumber: string) => {
    try {
      const response = await api.get(`/api/finance/invoices/${id}/pdf/`, {
        params: { session_key: sessionKey },
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
      active: 'bg-green-100 text-green-800',
      partially_completed: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-blue-100 text-blue-800',
      rejected: 'bg-red-100 text-red-800',
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
      {/* Tooltip Portal - Render at root level */}
      {hoveredInvoice !== null && (
        <div 
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl p-3 max-w-2xl pointer-events-none"
          style={{
            left: `${Math.min(mousePosition.x + 15, window.innerWidth - 600)}px`,
            top: `${Math.max(mousePosition.y - 50, 10)}px`,
          }}
        >
          {/* Customer Address Tooltip */}
          {typeof hoveredInvoice === 'string' && hoveredInvoice.startsWith('customer-') && (() => {
            const invoiceId = parseInt(hoveredInvoice.replace('customer-', ''))
            const currentInvoice = invoices.find(inv => inv.id === invoiceId)
            if (currentInvoice?.customer_shipping_addresses && currentInvoice.customer_shipping_addresses.length > 0) {
              return (
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-600">
                    {currentInvoice.customer_name}
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {currentInvoice.customer_shipping_addresses.map((addr, index) => (
                      <div key={index} className="text-xs">
                        <div className={`font-semibold mb-1 flex items-center gap-1 ${
                          addr.type === 'Billing' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'
                        }`}>
                          {addr.type === 'Billing' ? '🏠' : '🏢'} {addr.type}
                          {addr.is_default && (
                            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1 py-0.5 rounded text-xs font-medium">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed pl-4">
                          {addr.address}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return null
          })()}
          
          {/* Items Tooltip */}
          {typeof hoveredInvoice === 'number' && (() => {
            if (invoiceItemsCache[hoveredInvoice] && invoiceItemsCache[hoveredInvoice].length > 0) {
              return (
                <div>
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items in this invoice:</div>
                  <div className="space-y-1 max-h-96 overflow-y-auto">
                    {invoiceItemsCache[hoveredInvoice].map((item, index) => (
                      <div key={index} className="text-xs">
                        <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
                        {item.description && (
                          <div className="text-gray-500 dark:text-gray-400 text-xs">{item.description}</div>
                        )}
                        <div className="text-gray-500 dark:text-gray-400">
                          {parseFloat(item.quantity || 0).toFixed(2)} {item.unit} x ₹{parseFloat(item.unit_price || 0).toFixed(2)} = ₹{parseFloat(item.line_total || 0).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            } else if (invoiceItemsCache[hoveredInvoice]) {
              return <div className="text-xs text-gray-500 dark:text-gray-400">No items found</div>
            } else {
              return <div className="text-xs text-gray-500 dark:text-gray-400">Loading items...</div>
            }
          })()}
        </div>
      )}
      {/* Filters */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-200"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-200"
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
            className="px-4 py-2 bg-gray-100/50 dark:bg-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-500/50 transition-colors backdrop-blur-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        {invoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No invoices found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first invoice</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDirectInvoiceForm(true)}
                className="inline-flex items-center px-4 py-2 bg-athenas-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Direct Invoice
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/50 dark:divide-gray-700/50">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors duration-200">
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
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(invoice.invoice_date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">From: {invoice.purchase_order ? `PO/WO: ${invoice.purchase_order.internal_po_number || invoice.purchase_order.po_number}` : invoice.proforma_number ? `Proforma: ${invoice.proforma_number}` : invoice.quotation ? `Quotation: ${invoice.quotation.quotation_number}` : 'Direct Invoice'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          {/* Customer Name with Tooltip */}
                          {invoice.customer_shipping_addresses && invoice.customer_shipping_addresses.length > 0 ? (
                            <div 
                              className="text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer border-b border-dotted border-blue-600 dark:border-blue-400 hover:text-blue-800 dark:hover:text-blue-300 relative group"
                              onMouseEnter={(e) => {
                                setHoveredInvoice(`customer-${invoice.id}`)
                                setMousePosition({ x: e.clientX, y: e.clientY })
                              }}
                              onMouseLeave={() => setHoveredInvoice(null)}
                              onMouseMove={(e) => {
                                if (hoveredInvoice === `customer-${invoice.id}`) {
                                  setMousePosition({ x: e.clientX, y: e.clientY })
                                }
                              }}
                            >
                              {invoice.customer_name ? invoice.customer_name.replace(/[<>"'&]/g, '') : ''}
                            </div>
                          ) : (
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {invoice.customer_name ? invoice.customer_name.replace(/[<>"'&]/g, '') : ''}
                            </div>
                          )}
                          {/* Show shipping address from multiple sources */}
                          {(invoice.shipping_address || 
                            (invoice.customer_details?.shipping_address_line1 && 
                             `${invoice.customer_details.shipping_address_line1}, ${invoice.customer_details.shipping_city}, ${invoice.customer_details.shipping_state}`)) && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              <span className="inline-block w-3 h-3 mr-1">📍</span>
                              {invoice.shipping_address || 
                               `${invoice.customer_details?.shipping_address_line1}, ${invoice.customer_details?.shipping_city}, ${invoice.customer_details?.shipping_state}`}
                            </div>
                          )}
                          {invoice.customer_project_area && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Project: {invoice.customer_project_area}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className="text-sm text-gray-500 dark:text-gray-400 cursor-help relative"
                        onMouseEnter={(e) => {
                          setHoveredInvoice(invoice.id)
                          setMousePosition({ x: e.clientX, y: e.clientY })
                          if (!invoiceItemsCache[invoice.id]) {
                            fetchInvoiceItems(invoice.id).catch(err => {
                              console.error('Failed to fetch items:', err)
                              toast.error('Failed to load invoice items')
                            })
                          }
                        }}
                        onMouseLeave={() => setHoveredInvoice(null)}
                        onMouseMove={(e) => {
                          if (hoveredInvoice === invoice.id) {
                            setMousePosition({ x: e.clientX, y: e.clientY })
                          }
                        }}
                      >
                        <span className="inline-block w-3 h-3 mr-1">📋</span>
                        {invoice.item_count} item{invoice.item_count !== 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Due: {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <IndianRupee className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            ₹{parseFloat(invoice.subtotal || '0').toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Outstanding: ₹{parseFloat(invoice.outstanding_amount || '0').toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(invoice.status || 'unknown')}`}>
                        {(invoice.status || 'unknown').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadge(invoice.payment_status || 'unknown')}`}>
                        {(invoice.payment_status || 'unknown').replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {invoice.is_rejected ? (
                          // Show view and create new invoice buttons for rejected invoices
                          <>
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
                              onClick={() => handleCreateNewInvoice(invoice)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Create New Invoice"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </>
                        ) : (invoice.status === 'completed' && invoice.payment_status === 'paid') ? (
                          // For COMPLETED+PAID invoices, only show view and download buttons
                          <>
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
                              onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                              className="text-orange-600 hover:text-orange-800 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          // Show all buttons for non-rejected, non-completed invoices
                          <>
                            <button
                              onClick={() => handleUpdatePayment(invoice)}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Update Payment"
                            >
                              <IndianRupee className="w-4 h-4" />
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

                            {/* Send Email - Only show for active status */}
                            {invoice.status === 'active' && (
                              <button
                                onClick={() => handleSendEmail(invoice)}
                                className="text-blue-600 hover:text-blue-800 transition-colors"
                                title="Send Email"
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            )}
                            
                            <button
                              onClick={() => handleDownloadPDF(invoice.id, invoice.invoice_number)}
                              className="text-orange-600 hover:text-orange-800 transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {/* Active status buttons */}
                            {invoice.status === 'active' && (
                              <button
                                onClick={async () => {
                                  try {
                                    console.log('Fetching invoice details for edit:', invoice.id)
                                    // Fetch complete invoice data with items
                                    const response = await api.get(`/api/finance/invoices/${invoice.id}/`, {
                                      params: { session_key: sessionKey }
                                    })
                                    
                                    console.log('Invoice API response:', response.data)
                                    
                                    if (response.status === 200 && response.data) {
                                      // Ensure the data has required fields
                                      const invoiceData = {
                                        ...response.data,
                                        id: response.data.id || invoice.id,
                                        invoice_number: response.data.invoice_number || invoice.invoice_number,
                                        customer_name: response.data.customer_name || invoice.customer_name
                                      }
                                      
                                      console.log('Setting invoice data for edit:', invoiceData)
                                      setSelectedForEdit(invoiceData)
                                      setShowEditForm(true)
                                    } else {
                                      console.error('Invalid API response:', response)
                                      toast.error('Failed to load invoice details')
                                    }
                                  } catch (error) {
                                    console.error('Error fetching invoice details:', error)
                                    toast.error('Failed to load invoice details')
                                  }
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            
                            {/* Partially completed/completed status buttons */}
                            {(invoice.status === 'partially_completed' || invoice.status === 'completed') && invoice.payment_status !== 'paid' && (
                              <>
                                {/* Only allow revise if not already revised */}
                                {!invoice.is_revised && (
                                  <button
                                    onClick={() => handleReviseInvoice(invoice)}
                                    className="text-orange-600 hover:text-orange-800 transition-colors"
                                    title="Revise Invoice (Edit Once)"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                            
                            {/* Reject button - only show if not paid */}
                            {invoice.payment_status !== 'paid' && (
                              <button
                                onClick={() => handleReject(invoice)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Reject Invoice"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
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
          invoice={selectedInvoice as any}
          sessionKey={sessionKey}
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
            total_amount: selectedForPayment.total_amount || '0',
            outstanding_amount: selectedForPayment.outstanding_amount || '0',
            subtotal: selectedForPayment.subtotal || '0'
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

      {/* Create New Invoice Modal */}
      {showCreateNewModal && selectedForNewInvoice && (
        <CreateNewInvoiceModal
          isOpen={showCreateNewModal}
          onClose={() => {
            setShowCreateNewModal(false);
            setSelectedForNewInvoice(null);
          }}
          onSuccess={() => {
            setShowCreateNewModal(false);
            setSelectedForNewInvoice(null);
            fetchInvoices();
          }}
          rejectedInvoice={{
            id: selectedForNewInvoice.id,
            invoice_number: selectedForNewInvoice.invoice_number,
            purchase_order: selectedForNewInvoice.purchase_order ? {
              id: selectedForNewInvoice.purchase_order.internal_po_number ? parseInt(selectedForNewInvoice.purchase_order.internal_po_number.split('/')[0]) : 0,
              internal_po_number: selectedForNewInvoice.purchase_order.internal_po_number
            } : undefined,
            quotation: selectedForNewInvoice.quotation ? {
              id: parseInt(selectedForNewInvoice.quotation.quotation_number.split('/')[0]),
              quotation_number: selectedForNewInvoice.quotation.quotation_number
            } : undefined
          }}
          sessionKey={sessionKey}
        />
      )}



      {/* Direct Invoice Form */}
      <DirectCreateTaxInvoiceModal
        isOpen={showDirectInvoiceForm}
        onClose={() => setShowDirectInvoiceForm(false)}
        onSuccess={() => {
          setShowDirectInvoiceForm(false);
          fetchInvoices();
        }}
      />

      {/* Edit Invoice Modal */}
      {showEditForm && selectedForEdit && (
        <EditInvoiceModal
          invoice={selectedForEdit}
          onClose={() => {
            setShowEditForm(false);
            setSelectedForEdit(null);
          }}
          onSave={() => {
            setShowEditForm(false);
            setSelectedForEdit(null);
            fetchInvoices();
          }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white/50 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all duration-200"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-white/50 dark:bg-gray-700/50 border border-gray-300/50 dark:border-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50/50 dark:hover:bg-gray-600/50 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm transition-all duration-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
