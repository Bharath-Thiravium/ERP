import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, FileText, User, IndianRupee, Eye, Edit, XCircle, Download, Mail, ChevronUp, ChevronDown, RefreshCw, AlertTriangle } from 'lucide-react';

import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import InvoiceView from './InvoiceView';
import DirectCreateTaxInvoiceModal from './DirectCreateTaxInvoiceModal';
import EditInvoiceModal from './EditInvoiceModal';
import UpdatePaymentModal from './UpdatePaymentModal';
import SendEmailModal from './SendEmailModal';
import RejectInvoiceModal from './RejectInvoiceModal';
import CreateNewInvoiceModal from './CreateNewInvoiceModal';
import { isOverdue, getOverdueDate } from '../../../../utils/overdueUtils';
import { filterByFY } from '../../../../utils/financialYearUtils';


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
  tds_pending_certificate?: string;
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
  initialPaymentStatus?: string;
  selectedFY?: string;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ sessionKey, initialPaymentStatus = '', selectedFY }) => {
  console.log('🔍 InvoiceList - Component initialized with sessionKey:', sessionKey ? 'Present' : 'Missing');
  console.log('🔍 InvoiceList - sessionKey length:', sessionKey?.length || 0);
  console.log('🔍 InvoiceList - selectedFY:', selectedFY);
  console.log('🔍 InvoiceList - initialPaymentStatus:', initialPaymentStatus);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('-invoice_date');

  const handleSort = (field: string) => {
    setSortBy(prev => prev === `-${field}` ? field : `-${field}`);
    setCurrentPage(1);
  };
  const SortIcon = ({ field }: { field: string }) => (
    sortBy === field ? <ChevronUp className="w-3 h-3 inline ml-1" /> :
    sortBy === `-${field}` ? <ChevronDown className="w-3 h-3 inline ml-1" /> :
    <ChevronUp className="w-3 h-3 inline ml-1 opacity-30" />
  );
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(initialPaymentStatus);

  useEffect(() => {
    setPaymentStatusFilter(initialPaymentStatus);
    setCurrentPage(1);
  }, [initialPaymentStatus]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showInvoiceView, setShowInvoiceView] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<Invoice | null>(null);
  const [paymentModalInitialTab, setPaymentModalInitialTab] = useState<'cash' | 'tds'>('cash');
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

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices(currentPage);
    setRefreshing(false);
  };

  const paymentStatusOptions = [
    { value: '', label: 'All' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'unpaid_or_partial', label: 'Unpaid & Partial' },
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' },
  ];

  // Debounce — exact same pattern as PurchaseOrderList
  useEffect(() => {
    if (searchTerm !== debouncedSearchTerm) {
      setSearching(true)
    }
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1)
      setSearching(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm, debouncedSearchTerm])

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1)
  }, [paymentStatusFilter, selectedFY])

  const fetchInvoices = useCallback(async (page: number) => {
    if (!sessionKey) return;
    if (invoices.length === 0) setLoading(true);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        page_size: '10',
        ordering: sortBy,
      };
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter;
      
      // Add FY filter - backend expects 'financial_year' parameter
      if (selectedFY) {
        params.financial_year = selectedFY;
        console.log(`[InvoiceList] Fetching with FY filter: ${selectedFY}`);
      } else {
        // If no FY selected, show all
        params.financial_year = 'all';
      }
      
      const response = await api.get('/api/finance/invoices/', { params });
      const results = response.data.results || [];
      const safeInvoices = results.map((invoice: any) => ({
        ...invoice,
        customer_name: invoice.customer_name || 'Unknown Customer',
        invoice_number: invoice.invoice_number || 'No Number',
        total_amount: invoice.total_amount || '0',
        outstanding_amount: invoice.outstanding_amount || '0',
      }));
      setInvoices(safeInvoices);
      setTotalPages(Math.ceil(response.data.count / 10));
    } catch (error: any) {
      toast.error('Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [sessionKey, debouncedSearchTerm, paymentStatusFilter, sortBy, selectedFY]);

  useEffect(() => {
    fetchInvoices(currentPage);
  }, [currentPage, fetchInvoices]);

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
    setPaymentModalInitialTab('cash');
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
    <div className="space-y-6 min-w-0 max-w-full">
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
            if (!currentInvoice) return null
            const addrs = currentInvoice.customer_shipping_addresses || []
            return (
              <div className="min-w-[220px] max-w-[340px]">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
                  {currentInvoice.customer_name}
                </div>
                <div className="space-y-2">
                  {addrs.map((addr, index) => (
                    <div key={index} className="text-xs">
                      <div className={`font-semibold mb-0.5 flex items-center gap-1 ${
                        addr.type === 'Billing Address' ? 'text-gray-400 dark:text-gray-500' :
                        addr.type === 'Reference'       ? 'text-purple-600 dark:text-purple-400' :
                        addr.type === 'PO Shipping'     ? 'text-orange-600 dark:text-orange-400' :
                        addr.type === 'Shipping Address' ? 'text-green-600 dark:text-green-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`}>
                        {addr.type === 'Billing Address'  ? '🏠' :
                         addr.type === 'Reference'        ? '📋' :
                         addr.type === 'PO Shipping'      ? '🏭' :
                         addr.type === 'Shipping Address' ? '📦' : '📍'} {addr.type}
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 leading-relaxed pl-4 break-words">
                        {addr.address}
                      </div>
                    </div>
                  ))}
                  {addrs.length === 0 && (
                    <div className="text-xs text-gray-400">No details available</div>
                  )}
                </div>
              </div>
            )
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
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by invoice number, customer, PO number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-athenas-blue"></div>
              </div>
            )}
          </div>

          {/* Payment Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300/50 dark:border-gray-600/50 rounded-xl focus:ring-2 focus:ring-athenas-blue/50 focus:border-athenas-blue/50 bg-white/50 dark:bg-gray-800/50 text-gray-900 dark:text-white backdrop-blur-sm transition-all duration-200"
            >
              {paymentStatusOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors backdrop-blur-sm flex items-center gap-2 disabled:opacity-50"
            title="Refresh invoice statuses"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={() => {
              setSearchTerm('');
              setDebouncedSearchTerm('');
              setPaymentStatusFilter('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-100/50 dark:bg-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200/50 dark:hover:bg-gray-500/50 transition-colors backdrop-blur-sm whitespace-nowrap"
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
          <div className="overflow-x-auto max-w-full">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    <span onClick={() => handleSort('invoice_number')} className="cursor-pointer hover:text-gray-700 dark:hover:text-white select-none">Invoice# <SortIcon field="invoice_number" /></span>
                    <span className="mx-1 text-gray-300">|</span>
                    <span onClick={() => handleSort('invoice_date')} className="cursor-pointer hover:text-gray-700 dark:hover:text-white select-none">Date <SortIcon field="invoice_date" /></span>
                  </th>
                  <th onClick={() => handleSort('customer_name')} className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Customer <SortIcon field="customer_name" /></th>
                  <th className="w-[14%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                  <th onClick={() => handleSort('total_amount')} className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Amount <SortIcon field="total_amount" /></th>
                  <th onClick={() => handleSort('payment_status')} className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none">Payment Status <SortIcon field="payment_status" /></th>
                  <th className="w-[14%] px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white/50 dark:bg-gray-800/50 divide-y divide-gray-200/50 dark:divide-gray-700/50">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-white/80 dark:hover:bg-gray-700/80 transition-colors duration-200">
                    <td className="px-6 py-4 align-top">
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
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="min-w-0">
                          {/* Customer Name — always hoverable */}
                          <div
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer border-b border-dotted border-blue-600 dark:border-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
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
                          {/* Show shipping address inline only when explicitly set on this invoice (type !== Billing Address and type !== Reference) */}
                          {(() => {
                            const shippingEntry = invoice.customer_shipping_addresses?.find(
                              a => a.type !== 'Billing Address' && a.type !== 'Reference'
                            )
                            if (!shippingEntry) return null
                            return (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[200px]">
                                <span className="mr-1">📦</span>
                                {shippingEntry.address}
                              </div>
                            )
                          })()}
                          {invoice.customer_project_area && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                              {invoice.customer_project_area}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
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
                        Due: {(() => {
                          const overdueDate = getOverdueDate(invoice.due_date);
                          return overdueDate ? overdueDate.toLocaleDateString() : 'N/A';
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center">
                        <IndianRupee className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            ₹{parseFloat(invoice.total_amount || '0').toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">
                            Base: ₹{parseFloat(invoice.subtotal || '0').toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Outstanding: ₹{parseFloat(invoice.outstanding_amount || '0').toFixed(2)}
                          </div>
                          {(() => {
                            const tdsPending = parseFloat(invoice.tds_pending_certificate || '0');
                            if (tdsPending <= 0) return null;
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedForPayment(invoice);
                                  setPaymentModalInitialTab('tds');
                                  setShowPaymentModal(true);
                                }}
                                className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded px-1.5 py-0.5 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                                title="TDS certificate pending — click to confirm receipt"
                              >
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                TDS ₹{tdsPending.toFixed(2)} pending cert — Mark Received
                              </button>
                            );
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex flex-col gap-1">
                        {/* Badge 1: Due date tracker */}
                        {invoice.is_rejected ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300">
                            REJECTED
                          </span>
                        ) : (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            isOverdue(invoice.due_date, invoice.payment_status)
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}>
                            {isOverdue(invoice.due_date, invoice.payment_status) ? `OVERDUE (Due: ${getOverdueDate(invoice.due_date)?.toLocaleDateString()})` : `DUE ${getOverdueDate(invoice.due_date)?.toLocaleDateString()}`}
                          </span>
                        )}
                        {/* Badge 2: Payment status — only for non-rejected, never shows OVERDUE */}
                        {!invoice.is_rejected && (() => {
                          const displayStatus = invoice.payment_status === 'overdue' ? 'unpaid' : (invoice.payment_status || 'unpaid');
                          return (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusBadge(displayStatus)}`}>
                              {displayStatus.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium align-top">
                      <div className="flex items-center justify-end space-x-2">
                        {(() => {
                          const paymentStarted = parseFloat(invoice.paid_amount || '0') > 0;
                          const fullyPaid = invoice.payment_status === 'paid';

                          // REJECTED — view + create new only
                          if (invoice.is_rejected) {
                            return (
                              <>
                                <button
                                  onClick={() => { setSelectedInvoice(invoice); setShowInvoiceView(true); }}
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
                            );
                          }

                          // FULLY PAID — view + download only
                          if (fullyPaid) {
                            return (
                              <>
                                <button
                                  onClick={() => { setSelectedInvoice(invoice); setShowInvoiceView(true); }}
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
                            );
                          }

                          // PAYMENT STARTED (partially paid) — update payment + view + download + email only
                          if (paymentStarted) {
                            return (
                              <>
                                <button
                                  onClick={() => handleUpdatePayment(invoice)}
                                  className="text-green-600 hover:text-green-800 transition-colors"
                                  title="Update Payment"
                                >
                                  <IndianRupee className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => { setSelectedInvoice(invoice); setShowInvoiceView(true); }}
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
                              </>
                            );
                          }

                          // NO PAYMENT YET (unpaid / active) — full action set
                          return (
                            <>
                              <button
                                onClick={() => handleUpdatePayment(invoice)}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Update Payment"
                              >
                                <IndianRupee className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setSelectedInvoice(invoice); setShowInvoiceView(true); }}
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
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await api.get(`/api/finance/invoices/${invoice.id}/`, {
                                      params: { session_key: sessionKey }
                                    });
                                    if (response.status === 200 && response.data) {
                                      setSelectedForEdit({
                                        ...response.data,
                                        id: response.data.id || invoice.id,
                                        invoice_number: response.data.invoice_number || invoice.invoice_number,
                                        customer_name: response.data.customer_name || invoice.customer_name,
                                      });
                                      setShowEditForm(true);
                                    } else {
                                      toast.error('Failed to load invoice details');
                                    }
                                  } catch (error) {
                                    toast.error('Failed to load invoice details');
                                  }
                                }}
                                className="text-green-600 hover:text-green-800 transition-colors"
                                title="Edit Invoice"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(invoice)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Reject Invoice"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          );
                        })()}
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
          onStatusChange={() => fetchInvoices(currentPage)}
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
            subtotal: selectedForPayment.subtotal || '0',
            tds_applicable: selectedForPayment.tds_applicable,
            tds_section: selectedForPayment.tds_section || '',
            tds_rate: selectedForPayment.tds_rate || '0',
          }}
          initialTab={paymentModalInitialTab}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedForPayment(null);
            setPaymentModalInitialTab('cash');
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedForPayment(null);
            setPaymentModalInitialTab('cash');
            fetchInvoices(currentPage);
          }}
          onRefresh={() => fetchInvoices(currentPage)}
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
            fetchInvoices(currentPage);
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
            fetchInvoices(currentPage);
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
            fetchInvoices(currentPage);
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
          fetchInvoices(currentPage);
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
            fetchInvoices(currentPage);
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
