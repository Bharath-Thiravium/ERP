import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, AlertCircle } from 'lucide-react';

import { useSearchParams } from 'react-router-dom';
import PaymentList from '../components/PaymentList';
import PaymentForm from '../components/PaymentForm';
import { apiClient } from '../../../../lib/api';
import toast from 'react-hot-toast';

interface PaymentStats {
  total_payments: number;
  total_amount: number;
  pending_payments: number;
  pending_amount: number;
  completed_payments: number;
  completed_amount: number;
  failed_payments: number;
  failed_amount: number;
}

interface PaymentsProps {
  sessionKey: string;
}

const Payments: React.FC<PaymentsProps> = ({ sessionKey }) => {

  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [preSelectedInvoice, setPreSelectedInvoice] = useState<{ id: number; number: string; type: 'tax_invoice' | 'proforma_invoice' } | null>(null);
  const [refreshList, setRefreshList] = useState(0);
  const [stats, setStats] = useState<PaymentStats>({
    total_payments: 0,
    total_amount: 0,
    pending_payments: 0,
    pending_amount: 0,
    completed_payments: 0,
    completed_amount: 0,
    failed_payments: 0,
    failed_amount: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchPaymentStats = async () => {
    if (!sessionKey) return;

    try {
      setLoading(true);
      const response = await apiClient.getPaymentStats({ session_key: sessionKey });

      if (response.data) {
        setStats(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching payment stats:', error);
      toast.error('Failed to fetch payment statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentStats();
    
    // Check for URL parameters to pre-select invoice
    const invoiceId = searchParams.get('invoice_id');
    const invoiceNumber = searchParams.get('invoice_number');
    const proformaId = searchParams.get('proforma_id');
    const proformaNumber = searchParams.get('proforma_number');
    
    if (invoiceId && invoiceNumber) {
      setPreSelectedInvoice({
        id: parseInt(invoiceId),
        number: invoiceNumber,
        type: 'tax_invoice'
      });
      setShowForm(true);
    } else if (proformaId && proformaNumber) {
      setPreSelectedInvoice({
        id: parseInt(proformaId),
        number: proformaNumber,
        type: 'proforma_invoice'
      });
      setShowForm(true);
    }
  }, [sessionKey, searchParams]);



  const handleEditPayment = (payment: any) => {
    setSelectedPayment(payment);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedPayment(null);
    setPreSelectedInvoice(null);
    // Clear URL parameters
    window.history.replaceState({}, '', window.location.pathname);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setSelectedPayment(null);
    setPreSelectedInvoice(null);
    setRefreshList(prev => prev + 1);
    fetchPaymentStats(); // Refresh stats
    // Clear URL parameters
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Payments
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Record and track payment transactions
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.total_payments}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ₹{loading ? '...' : parseFloat(stats.total_amount?.toString() || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Completed Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.completed_payments}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ₹{loading ? '...' : parseFloat(stats.completed_amount?.toString() || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Pending Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.pending_payments}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ₹{loading ? '...' : parseFloat(stats.pending_amount?.toString() || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-yellow-500 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Failed Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.failed_payments}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ₹{loading ? '...' : parseFloat(stats.failed_amount?.toString() || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-red-500 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => toast.success('Update payments via Invoice/Proforma Invoice lists → Update Payment button')}
            className="flex items-center justify-center p-4 bg-gradient-to-r from-athenas-blue to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <CreditCard className="w-5 h-5 mr-2" />
            Update Payments
          </button>
          <button
            onClick={() => {
              // Filter for pending payments
              const event = new CustomEvent('filterPayments', { detail: { status: 'pending' } });
              window.dispatchEvent(event);
            }}
            className="flex items-center justify-center p-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <Clock className="w-5 h-5 mr-2" />
            View Pending Payments
          </button>
          <button
            onClick={() => {
              // Filter for failed payments
              const event = new CustomEvent('filterPayments', { detail: { status: 'failed' } });
              window.dispatchEvent(event);
            }}
            className="flex items-center justify-center p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <AlertCircle className="w-5 h-5 mr-2" />
            Review Failed Payments
          </button>
        </div>
      </div>

      {/* Payment Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Success Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Success Rate</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="text-sm font-medium text-green-600">
                {stats.total_payments > 0 
                  ? `${((stats.completed_payments / stats.total_payments) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: stats.total_payments > 0 
                    ? `${(stats.completed_payments / stats.total_payments) * 100}%`
                    : '0%'
                }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pending</span>
              <span className="text-sm font-medium text-yellow-600">
                {stats.total_payments > 0 
                  ? `${((stats.pending_payments / stats.total_payments) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: stats.total_payments > 0 
                    ? `${(stats.pending_payments / stats.total_payments) * 100}%`
                    : '0%'
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Failed</span>
              <span className="text-sm font-medium text-red-600">
                {stats.total_payments > 0 
                  ? `${((stats.failed_payments / stats.total_payments) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: stats.total_payments > 0 
                    ? `${(stats.failed_payments / stats.total_payments) * 100}%`
                    : '0%'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Payment Amount Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Amount Distribution</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Completed</span>
              </div>
              <span className="text-sm font-bold text-green-600">
                ₹{parseFloat(stats.completed_amount?.toString() || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-yellow-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Pending</span>
              </div>
              <span className="text-sm font-bold text-yellow-600">
                ₹{parseFloat(stats.pending_amount?.toString() || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-sm font-medium text-gray-900">Failed</span>
              </div>
              <span className="text-sm font-bold text-red-600">
                ₹{parseFloat(stats.failed_amount?.toString() || '0').toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment List */}
      <PaymentList
        key={refreshList}
        onAddPayment={() => toast.success('Update payments via Invoice/Proforma Invoice lists → Update Payment button')}
        onEditPayment={handleEditPayment}
        sessionKey={sessionKey}
      />

      {/* Payment Form Modal */}
      {showForm && (
        <PaymentForm
          payment={selectedPayment}
          onClose={handleFormClose}
          onSave={handleFormSave}
          sessionKey={sessionKey}
          preSelectedInvoice={preSelectedInvoice || undefined}
        />
      )}
    </div>
  );
};

export default Payments;
