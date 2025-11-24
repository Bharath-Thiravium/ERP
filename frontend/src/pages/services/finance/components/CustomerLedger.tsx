import React, { useState, useEffect } from 'react';
import { Search, User, Calendar, DollarSign, TrendingUp, TrendingDown, FileText, CreditCard, AlertCircle, Users } from 'lucide-react';
import api from '../../../../lib/api';
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

  // Fetch customers and overall metrics
  const fetchCustomers = async () => {
    if (!sessionKey) return;

    try {
      const response = await api.get('/api/finance/customers/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { page_size: 1000 }
      });

      const customerData = response.data.results || [];
      setCustomers(customerData);
      
      // Calculate overall metrics
      const totalCustomers = customerData.length;
      const activeCustomers = customerData.filter((c: any) => c.is_active).length;
      const totalCreditLimit = customerData.reduce((sum: number, c: any) => sum + (c.credit_limit || 0), 0);
      
      setOverallMetrics({
        totalCustomers,
        activeCustomers,
        totalOutstanding: 0, // Will be updated when ledger data is fetched
        totalCreditLimit
      });
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to fetch customers');
    }
  };

  // Fetch customer ledger data
  const fetchLedgerData = async () => {
    if (!selectedCustomer || !sessionKey) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        customer_id: selectedCustomer,
      });

      if (dateRange.start_date) params.append('start_date', dateRange.start_date);
      if (dateRange.end_date) params.append('end_date', dateRange.end_date);

      const response = await api.get(`/api/finance/customer-ledger/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      });

      setLedgerData(response.data);
    } catch (error: any) {
      console.error('Error fetching ledger data:', error);
      toast.error('Failed to fetch ledger data');
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
    }
  }, [selectedCustomer, dateRange]);

  const getDocumentIcon = (documentType: string) => {
    switch (documentType.toLowerCase()) {
      case 'invoice':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'payment':
        return <CreditCard className="w-4 h-4 text-green-500" />;
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
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Customer Ledger
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          View customer account statements and transaction history
        </p>
      </div>

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
          value={`₹${overallMetrics.totalCreditLimit.toLocaleString()}`}
          subtitle="Combined credit limits"
          icon={CreditCard}
          color="purple"
        />
        <MetricCard
          title="Outstanding Amount"
          value={ledgerData ? `₹${ledgerData.outstanding_amount.toLocaleString()}` : '₹0'}
          subtitle={ledgerData ? 'Selected customer' : 'Select customer to view'}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Customer Selection and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
      </div>

      {/* Customer Summary */}
      {ledgerData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Opening Balance */}
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Opening Balance</p>
                <p className="text-2xl font-bold">
                  ₹{ledgerData.opening_balance.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                {ledgerData.opening_balance_date && (
                  <p className="text-indigo-100 text-xs">
                    As of {new Date(ledgerData.opening_balance_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="bg-indigo-400 bg-opacity-30 rounded-lg p-3">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Total Invoiced */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Invoiced</p>
                <p className="text-2xl font-bold">
                  ₹{ledgerData.total_invoiced.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 rounded-lg p-3">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Total Paid */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Paid</p>
                <p className="text-2xl font-bold">
                  ₹{ledgerData.total_paid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-green-400 bg-opacity-30 rounded-lg p-3">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Outstanding Amount */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Outstanding</p>
                <p className="text-2xl font-bold">
                  ₹{ledgerData.outstanding_amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-red-400 bg-opacity-30 rounded-lg p-3">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Credit Limit */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Credit Limit</p>
                <p className="text-2xl font-bold">
                  ₹{ledgerData.credit_limit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
                <p className="text-purple-100 text-xs">
                  Available: ₹{(ledgerData.credit_limit - ledgerData.outstanding_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-purple-400 bg-opacity-30 rounded-lg p-3">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Information */}
      {ledgerData && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-blue-200 dark:border-gray-600 p-6">
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
        </div>
      )}

      {/* Ledger Entries */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-athenas-blue"></div>
        </div>
      ) : ledgerData ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
        </div>
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
      )}
    </div>
  );
};

export default CustomerLedger;
