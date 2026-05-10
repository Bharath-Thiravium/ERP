import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, IndianRupee, TrendingUp, TrendingDown, FileText, CreditCard, AlertCircle, Users, Download, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import { apiClient } from '../../../../lib/api';
import FinanceCard from './FinanceCard';
import MetricCard from './MetricCard';
import toast from 'react-hot-toast';

interface Customer {
  id: number;
  name: string;
  customer_code: string;
  email: string;
  phone: string;
}

interface LedgerEntry {
  id: number;
  date: string;
  document_type: string;
  document_number: string;
  description: string;
  debit_amount: number;
  credit_amount: number;
  balance: number;
  status: string;
}

interface CustomerLedgerData {
  customer: Customer;
  opening_balance: number;
  opening_balance_date: string | null;
  total_invoiced: number;
  total_paid: number;
  outstanding_amount: number;
  credit_limit: number;
  entries: LedgerEntry[];
}

interface CustomerLedgerProps {
  sessionKey: string;
}

const CustomerLedger: React.FC<CustomerLedgerProps> = ({ sessionKey }) => {

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [ledgerData, setLedgerData] = useState<CustomerLedgerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [overallMetrics, setOverallMetrics] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalOutstanding: 0,
    totalCreditLimit: 0
  });
  const [activeTab, setActiveTab] = useState<'ledger' | 'pending'>('ledger');
  const [pendingData, setPendingData] = useState<any>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [includeTDS, setIncludeTDS] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingLedgerPDF, setDownloadingLedgerPDF] = useState(false);

  // Fetch customers and overall metrics
  const fetchCustomers = async () => {
    if (!sessionKey) return;

    try {
      const response = await apiClient.getFinanceCustomers({ page_size: 1000 });

      const customerData = response.data.results || [];
      setCustomers(customerData);
      
      // Calculate overall metrics
      const totalCustomers = customerData.length;
      const activeCustomers = customerData.filter((c: any) => c.is_active).length;
      const totalCreditLimit = customerData.reduce((sum: number, c: any) => sum + (c.credit_limit || 0), 0);
      
      setOverallMetrics({
        totalCustomers,
        activeCustomers,
        totalOutstanding: 0,
        totalCreditLimit
      });
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      if (error?.response?.status !== 401) {
        toast.error('Failed to fetch customers');
      }
    }
  };

  // Fetch customer ledger data
  const fetchLedgerData = async () => {
    if (!selectedCustomer || !sessionKey) return;

    try {
      setLoading(true);
      const params: any = {
        customer_id: selectedCustomer,
      };

      if (dateRange.start_date) params.start_date = dateRange.start_date;
      if (dateRange.end_date) params.end_date = dateRange.end_date;

      const response = await apiClient.getCustomerLedger(params);

      setLedgerData(response.data);
    } catch (error: any) {
      console.error('Error fetching ledger data:', error);
      if (error?.response?.status !== 401) {
        toast.error('Failed to fetch ledger data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [sessionKey]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchLedgerData();
      fetchPendingData();
    }
  }, [selectedCustomer, dateRange]);

  useEffect(() => {
    if (selectedCustomer && activeTab === 'pending') {
      fetchPendingData();
    }
  }, [includeTDS]);

  const fetchPendingData = async () => {
    if (!selectedCustomer || !sessionKey) return;
    try {
      setPendingLoading(true);
      const response = await apiClient.getCustomerPendingStatement({
        customer_id: selectedCustomer,
        include_tds: includeTDS,
      });
      setPendingData(response.data);
    } catch (error: any) {
      if (error?.response?.status !== 401) toast.error('Failed to fetch pending payments');
    } finally {
      setPendingLoading(false);
    }
  };

  const downloadPendingPDF = async () => {
    if (!selectedCustomer) return;
    try {
      setDownloadingPDF(true);
      const response = await apiClient.downloadCustomerPendingStatementPDF({
        customer_id: selectedCustomer,
        include_tds: includeTDS,
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Pending_Statement_${pendingData?.customer?.name || 'Customer'}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded successfully');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const downloadLedgerPDF = async () => {
    if (!selectedCustomer) return;
    try {
      setDownloadingLedgerPDF(true);
      const params: any = { customer_id: selectedCustomer };
      if (dateRange.start_date) params.start_date = dateRange.start_date;
      if (dateRange.end_date) params.end_date = dateRange.end_date;

      const response = await apiClient.downloadCustomerLedgerPDF(params);
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Customer_Ledger_${ledgerData?.customer?.name || 'Customer'}_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Ledger PDF downloaded successfully');
    } catch {
      toast.error('Failed to download ledger PDF');
    } finally {
      setDownloadingLedgerPDF(false);
    }
  };

  const getDocumentIcon = (documentType: string) => {
    switch (documentType.toLowerCase()) {
      case 'invoice':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-green-500" />;
      case 'tds':
        return <IndianRupee className="w-4 h-4 text-purple-500" />;
      case 'credit_note':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'debit_note':
        return <TrendingUp className="w-4 h-4 text-orange-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-red-100 text-red-800',
      partially_paid: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
    };
    return statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800';
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <FinanceCard>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Customer Ledger
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              View customer account statements and transaction history
            </p>
          </div>
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('ledger')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'ledger' ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-1" />Full Ledger
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'pending' ? 'bg-white dark:bg-gray-600 shadow text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Clock className="w-4 h-4 inline mr-1" />Pending Payments
            </button>
          </div>
        </div>
      </FinanceCard>

      {/* Overall Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Customers"
          value={overallMetrics.totalCustomers}
          subtitle={`${overallMetrics.totalCustomers} customers in system`}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Active Customers"
          value={overallMetrics.activeCustomers}
          subtitle={`${overallMetrics.activeCustomers} active accounts`}
          icon={User}
          color="green"
        />
        <MetricCard
          title="Total Credit Limit"
          value={overallMetrics.totalCreditLimit > 0 ? `₹${overallMetrics.totalCreditLimit.toLocaleString('en-IN')}` : '₹0'}
          subtitle="Combined credit limits"
          icon={CreditCard}
          color="purple"
        />
        <MetricCard
          title="Outstanding Amount"
          value={ledgerData ? `₹${ledgerData.outstanding_amount.toLocaleString('en-IN')}` : '₹0'}
          subtitle={ledgerData ? 'Selected customer' : 'Select customer to view'}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Customer Selection and Filters */}
      <FinanceCard>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Customer Search and Selection */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Customer
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 mb-2"
              />
            </div>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a customer</option>
              {filteredCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customer_code} - {customer.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              From Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="date"
                value={dateRange.start_date}
                onChange={(e) => setDateRange(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              To Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="date"
                value={dateRange.end_date}
                onChange={(e) => setDateRange(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </FinanceCard>

      {/* Customer Summary */}
      {activeTab === 'ledger' && ledgerData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Opening Balance"
            value={`₹${ledgerData.opening_balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            subtitle={ledgerData.opening_balance_date ? `As of ${new Date(ledgerData.opening_balance_date).toLocaleDateString()}` : ''}
            icon={TrendingUp}
            color="indigo"
          />
          <MetricCard
            title="Total Invoiced"
            value={`₹${ledgerData.total_invoiced.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            subtitle=""
            icon={FileText}
            color="blue"
          />
          <MetricCard
            title="Total Paid"
            value={`₹${ledgerData.total_paid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            subtitle=""
            icon={CreditCard}
            color="green"
          />
          <MetricCard
            title="Outstanding"
            value={`₹${ledgerData.outstanding_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            subtitle=""
            icon={AlertCircle}
            color="red"
          />
          <MetricCard
            title="Credit Limit"
            value={`₹${ledgerData.credit_limit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            subtitle={`Available: ₹${(ledgerData.credit_limit - ledgerData.outstanding_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`}
            icon={IndianRupee}
            color="purple"
          />
        </div>
      )}

      {activeTab === 'ledger' && selectedCustomer && ledgerData && (
        <FinanceCard>
          <div className="flex items-center justify-end">
            <button
              onClick={downloadLedgerPDF}
              disabled={downloadingLedgerPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloadingLedgerPDF ? 'Generating...' : 'Download Complete Ledger PDF'}
            </button>
          </div>
        </FinanceCard>
      )}

      {/* Customer Information */}
      {activeTab === 'ledger' && ledgerData && (
        <FinanceCard className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 border-blue-200 dark:border-gray-600">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer Name</p>
              <p className="font-medium text-gray-900 dark:text-white">{ledgerData.customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Customer Code</p>
              <p className="font-medium text-gray-900 dark:text-white">{ledgerData.customer.customer_code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Contact</p>
              <p className="font-medium text-gray-900 dark:text-white">{ledgerData.customer.email}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{ledgerData.customer.phone}</p>
            </div>
          </div>
        </FinanceCard>
      )}

      {/* Ledger Entries */}
      {activeTab === 'ledger' && (loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-athenas-blue"></div>
        </div>
      ) : ledgerData ? (
        <FinanceCard>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h3>
          </div>
          
          {ledgerData.entries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No transactions found</h3>
              <p className="text-gray-600 dark:text-gray-400">No transactions found for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Debit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Credit</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {ledgerData.entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(entry.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getDocumentIcon(entry.document_type)}
                          <div className="ml-2">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{entry.document_number}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{entry.document_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 dark:text-white">{entry.description}</div>
                        {entry.document_type.toLowerCase() === 'payment' && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {entry.credit_amount > 0 && (
                              <span className="text-purple-600 dark:text-purple-400">💡 Check if TDS was deducted</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-red-600">
                          {entry.debit_amount > 0 ? `₹${entry.debit_amount.toFixed(2)}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {entry.credit_amount > 0 ? `₹${entry.credit_amount.toFixed(2)}` : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${entry.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{entry.balance.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(entry.status)}`}>
                          {entry.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </FinanceCard>
      ) : selectedCustomer ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-athenas-blue mx-auto"></div>
        </div>
      ) : (
        <div className="text-center py-12">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Customer</h3>
          <p className="text-gray-600 dark:text-gray-400">Choose a customer to view their ledger and transaction history</p>
        </div>
      ))}

      {/* ── PENDING PAYMENTS TAB ── */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {/* Controls */}
          {selectedCustomer && (
            <FinanceCard>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Include TDS Deduction</span>
                  <button onClick={() => setIncludeTDS(!includeTDS)} className="focus:outline-none">
                    {includeTDS
                      ? <ToggleRight className="w-8 h-8 text-blue-600" />
                      : <ToggleLeft className="w-8 h-8 text-gray-400" />}
                  </button>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    includeTDS ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {includeTDS ? 'TDS Included' : 'Excluding TDS'}
                  </span>
                </div>
                {pendingData && (
                  <button
                    onClick={downloadPendingPDF}
                    disabled={downloadingPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {downloadingPDF ? 'Generating...' : 'Download PDF Statement'}
                  </button>
                )}
              </div>
            </FinanceCard>
          )}

          {pendingLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : pendingData ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard title="Pending Invoices" value={pendingData.pending_count} subtitle="Unpaid / Partial" icon={FileText} color="orange" />
                <MetricCard title="Pending from Payment" value={`₹${pendingData.total_pending_payment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} subtitle="Customer yet to pay" icon={AlertCircle} color="red" />
                <MetricCard title="Pending from TDS" value={`₹${pendingData.total_pending_tds.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`} subtitle="TDS deducted, to deposit" icon={IndianRupee} color="purple" />
              </div>

              {/* Pending Invoices Table */}
              <FinanceCard>
                <div className="px-2 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Pending Payment Details
                    <span className="text-sm font-normal text-gray-500">— {pendingData.customer.name}</span>
                  </h3>
                  {pendingData.invoices.length === 0 ? (
                    <div className="text-center py-10">
                      <AlertCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                      <p className="text-gray-600 dark:text-gray-400 font-medium">No pending payments! All invoices are cleared.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No.</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Invoice Amt</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending (Payment)</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pending (TDS)</th>
                            {includeTDS && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TDS on Balance</th>}
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Payable</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {pendingData.invoices.map((inv: any) => (
                            <tr key={inv.invoice_id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              inv.days_overdue > 0 ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                            }`}>
                              <td className="px-4 py-3 font-medium text-blue-600">{inv.invoice_number}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                                {inv.days_overdue > 0 && <span className="ml-1 text-xs text-red-600 font-medium">({inv.days_overdue}d overdue)</span>}
                              </td>
                              <td className="px-4 py-3 text-right">₹{inv.invoice_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                              <td className="px-4 py-3 text-right text-green-600">₹{inv.paid_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>

                              {/* Pending from Payment */}
                              <td className="px-4 py-3 text-right">
                                {inv.pending_from_payment > 0 ? (
                                  <div>
                                    <div className="font-medium text-red-600">₹{inv.pending_from_payment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                    <div className="text-xs text-gray-400">from payment</div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>

                              {/* Pending from TDS */}
                              <td className="px-4 py-3 text-right">
                                {inv.pending_from_tds > 0 ? (
                                  <div>
                                    <div className="font-medium text-purple-600">₹{inv.pending_from_tds.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                    <div className="text-xs text-gray-400">
                                      {inv.tds_section} @ {inv.tds_rate}% — deducted, to deposit
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">—</span>
                                )}
                              </td>

                              {/* TDS on remaining balance (only if genuine payment pending) */}
                              {includeTDS && (
                                <td className="px-4 py-3 text-right">
                                  {inv.tds_applicable && inv.tds_on_outstanding > 0 ? (
                                    <div>
                                      <div className="font-medium text-orange-600">₹{inv.tds_on_outstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                      <div className="text-xs text-gray-400">{inv.tds_section} @ {inv.tds_rate}%</div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                              )}

                              {/* Net Payable */}
                              <td className="px-4 py-3 text-right">
                                <div className="font-bold text-blue-700 dark:text-blue-400">₹{inv.net_payable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                                {inv.pending_from_tds > 0 && inv.pending_from_payment === 0 && (
                                  <div className="text-xs text-purple-500">TDS only</div>
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  inv.pending_from_tds > 0 && inv.pending_from_payment === 0
                                    ? 'bg-purple-100 text-purple-800'
                                    : inv.days_overdue > 0 ? 'bg-red-100 text-red-800'
                                    : inv.payment_status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {inv.pending_from_tds > 0 && inv.pending_from_payment === 0
                                    ? 'TDS PENDING'
                                    : inv.days_overdue > 0 ? 'OVERDUE'
                                    : inv.payment_status.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                          <tr>
                            <td colSpan={4} className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">Totals</td>
                            <td className="px-4 py-3 text-right text-green-600">₹{pendingData.invoices.reduce((s: number, i: any) => s + i.paid_amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right text-red-600">₹{pendingData.total_pending_payment.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-4 py-3 text-right text-purple-600">₹{pendingData.total_pending_tds.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            {includeTDS && <td className="px-4 py-3 text-right text-orange-600">₹{pendingData.total_tds_on_outstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>}
                            <td className="px-4 py-3 text-right text-blue-700 dark:text-blue-400 text-base">₹{pendingData.total_net_payable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </FinanceCard>
            </>
          ) : selectedCustomer ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Select a Customer</h3>
              <p className="text-gray-600 dark:text-gray-400">Choose a customer to view their pending payments</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerLedger;
