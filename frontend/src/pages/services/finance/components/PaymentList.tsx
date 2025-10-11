import React, { useState, useEffect } from 'react';
import { Plus, Search, CreditCard, User, DollarSign, Eye, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { apiClient } from '../../../../lib/api';
import toast from 'react-hot-toast';

interface Payment {
  id: number;
  payment_number: string;
  payment_date: string;
  amount: string;
  payment_method: string;
  customer_name: string;
  customer_code: string;
  invoice_number: string;
  reference_number: string;
  bank_name: string;
  status: string;
  created_at: string;
  created_by_name: string;
}

interface PaymentListProps {
  onAddPayment: () => void;
  onEditPayment: (payment: Payment) => void;
  sessionKey: string;
}

const PaymentList: React.FC<PaymentListProps> = ({ onAddPayment, onEditPayment, sessionKey }) => {

  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const paymentMethodOptions = [
    { value: '', label: 'All Methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Credit/Debit Card' },
    { value: 'online', label: 'Online Payment' },
    { value: 'other', label: 'Other' },
  ];

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchPayments = async () => {
    if (!sessionKey) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: '10',
      });

      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentMethodFilter) params.append('payment_method', paymentMethodFilter);

      const response = await apiClient.getFinancePayments(Object.fromEntries(params));

      setPayments(response.data.results || []);
      setTotalPages(Math.ceil(response.data.count / 10));
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [sessionKey, currentPage, debouncedSearchTerm, statusFilter, paymentMethodFilter]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this payment?')) return;

    try {
      await apiClient.deleteFinancePayment(id, { session_key: sessionKey });
      toast.success('Payment deleted successfully');
      fetchPayments();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      toast.error('Failed to delete payment');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodLabels = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      upi: 'UPI',
      card: 'Credit/Debit Card',
      online: 'Online Payment',
      other: 'Other',
    };
    return methodLabels[method as keyof typeof methodLabels] || method;
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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600">Record and track customer payments</p>
        </div>
        <button
          onClick={onAddPayment}
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-athenas-blue to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Update Payments
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent"
          >
            {paymentMethodOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              setSearchTerm('');
              setDebouncedSearchTerm('');
              setStatusFilter('');
              setPaymentMethodFilter('');
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Payment List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-600 mb-4">Start by recording your first payment</p>
            <button
              onClick={onAddPayment}
              className="inline-flex items-center px-4 py-2 bg-athenas-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Update Payments
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CreditCard className="w-5 h-5 text-athenas-blue mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payment.payment_number}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(payment.payment_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payment.customer_name}</div>
                          <div className="text-sm text-gray-500">{payment.customer_code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.invoice_number}</div>
                      {payment.reference_number && (
                        <div className="text-sm text-gray-500">Ref: {payment.reference_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900">
                          ₹{parseFloat(payment.amount || '0').toFixed(2)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </div>
                      {payment.bank_name && (
                        <div className="text-sm text-gray-500">{payment.bank_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => navigate(`/services/finance/payments/${payment.id}`)}
                          className="text-athenas-blue hover:text-blue-600 transition-colors"
                          title="View Payment"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditPayment(payment)}
                          className="text-athenas-gold hover:text-yellow-600 transition-colors"
                          title="Edit Payment"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete Payment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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

export default PaymentList;
