import React, { useState, useEffect } from 'react';
import { Plus, FileText, TrendingUp, DollarSign, Calendar, AlertCircle } from 'lucide-react';

import InvoiceList from '../components/InvoiceList';
// import InvoiceForm from '../components/InvoiceForm'; // Removed - using simplified forms
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

interface InvoicesProps {
  sessionKey: string;
}



interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueInvoices: number;
  thisMonthInvoices: number;
}

const Invoices: React.FC<InvoicesProps> = ({ sessionKey }) => {




  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    totalAmount: 0,
    paidAmount: 0,
    outstandingAmount: 0,
    overdueInvoices: 0,
    thisMonthInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchInvoiceStats = async () => {
    if (!sessionKey) return;

    try {
      setLoading(true);
      const response = await api.get('/api/finance/invoices/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { page_size: 1000 } // Get all invoices for stats
      });

      const invoices = response.data.results || [];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const totalAmount = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount || 0), 0);
      const paidAmount = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.paid_amount || 0), 0);
      const outstandingAmount = invoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.outstanding_amount || 0), 0);
      
      const overdueInvoices = invoices.filter((inv: any) => 
        inv.payment_status === 'overdue' || 
        (inv.payment_status !== 'paid' && new Date(inv.due_date) < new Date())
      ).length;

      const thisMonthInvoices = invoices.filter((inv: any) => {
        const invoiceDate = new Date(inv.invoice_date);
        return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
      }).length;

      setStats({
        totalInvoices: invoices.length,
        totalAmount,
        paidAmount,
        outstandingAmount,
        overdueInvoices,
        thisMonthInvoices,
      });
    } catch (error: any) {
      console.error('Error fetching invoice stats:', error);
      toast.error('Failed to fetch invoice statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceStats();
  }, [sessionKey]);

  const handleAddInvoice = () => {
    toast.success('Create invoices via Purchase Orders → Raise Invoice');
  };



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Invoices
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your invoices and track payments
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.totalInvoices}
              </p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-blue-600 dark:text-blue-400">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{loading ? '...' : stats.thisMonthInvoices} this month</span>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{loading ? '...' : stats.totalAmount.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-green-600 dark:text-green-400">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>Total invoiced</span>
          </div>
        </div>

        {/* Paid Amount */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Paid Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{loading ? '...' : stats.paidAmount.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-emerald-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span>Collected</span>
          </div>
        </div>

        {/* Outstanding Amount */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Outstanding</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ₹{loading ? '...' : stats.outstandingAmount.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm text-orange-600 dark:text-orange-400">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span>{loading ? '...' : stats.overdueInvoices} overdue</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => toast.success('Create invoices via Purchase Orders → Raise Invoice')}
            className="flex items-center p-4 bg-gradient-to-r from-athenas-blue to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Create Invoice</div>
              <div className="text-sm opacity-90">From proforma invoice</div>
            </div>
          </button>

          <button
            onClick={() => toast.success('Filter functionality to be implemented')}
            className="flex items-center p-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200"
          >
            <AlertCircle className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">View Overdue</div>
              <div className="text-sm opacity-90">{stats.overdueInvoices} invoices</div>
            </div>
          </button>

          <button
            onClick={() => toast.success('Filter functionality to be implemented')}
            className="flex items-center p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200"
          >
            <DollarSign className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Unpaid Invoices</div>
              <div className="text-sm opacity-90">Collect payments</div>
            </div>
          </button>
        </div>
      </div>

      {/* Invoice List */}
      <InvoiceList
        onAddInvoice={handleAddInvoice}
        sessionKey={sessionKey}
      />

      {/* Note: Invoice Form removed - using simplified forms via PO workflow */}
    </div>
  );
};

export default Invoices;
