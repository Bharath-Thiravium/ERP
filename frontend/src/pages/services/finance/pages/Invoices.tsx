import React, { useState, useEffect } from 'react';
import { Plus, FileText, IndianRupee, AlertCircle } from 'lucide-react';

import InvoiceList from '../components/InvoiceList';
// import InvoiceForm from '../components/InvoiceForm'; // Removed - using simplified forms
import { apiClient } from '../../../../lib/api';
import toast from 'react-hot-toast';
import FinanceCard from '../components/FinanceCard';
import MetricCard from '../components/MetricCard';
import DebugAuth from '../../../../components/DebugAuth';

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
  console.log('🔍 Invoices component - sessionKey:', sessionKey ? 'Present' : 'Missing');
  console.log('🔍 Invoices component - sessionKey length:', sessionKey?.length || 0);




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
    if (!sessionKey) {
      console.log('🔍 fetchInvoiceStats - No sessionKey available');
      return;
    }

    try {
      setLoading(true);
      console.log('🔍 fetchInvoiceStats - Making API call with sessionKey');
      
      // Use apiClient which handles authentication correctly
      const response = await apiClient.getFinanceInvoices({ 
        session_key: sessionKey,
        page_size: 1000 // Get all invoices for stats
      });

      console.log('🔍 fetchInvoiceStats - API response:', response.data);

      const invoices = response.data.results || [];
      
      // Derive status from available fields since invoices don't have a status field
      const processedInvoices = invoices.map((inv: any) => {
        let derivedStatus = 'active';
        if (inv.is_rejected) {
          derivedStatus = 'rejected';
        } else if (inv.payment_status === 'paid') {
          derivedStatus = 'completed';
        } else if (inv.payment_status === 'partially_paid') {
          derivedStatus = 'partially_completed';
        }
        return { ...inv, status: derivedStatus };
      });
      
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const totalAmount = processedInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.total_amount || 0), 0);
      const paidAmount = processedInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.paid_amount || 0), 0);
      const outstandingAmount = processedInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.outstanding_amount || 0), 0);
      
      const overdueInvoices = processedInvoices.filter((inv: any) => 
        (inv.payment_status === 'overdue') || 
        ((inv.payment_status !== 'paid' && inv.payment_status !== undefined) && inv.due_date && new Date(inv.due_date) < new Date())
      ).length;

      const thisMonthInvoices = processedInvoices.filter((inv: any) => {
        const invoiceDate = new Date(inv.invoice_date);
        return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear;
      }).length;

      setStats({
        totalInvoices: processedInvoices.length,
        totalAmount,
        paidAmount,
        outstandingAmount,
        overdueInvoices,
        thisMonthInvoices,
      });
    } catch (error: any) {
      console.error('🔍 Error fetching invoice stats:', error);
      console.error('🔍 Error response:', error.response?.data);
      toast.error('Failed to fetch invoice statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceStats();
  }, [sessionKey]);



  return (
    <div className="space-y-6">
      {/* Debug Authentication State */}
      <DebugAuth />
      
      {/* Page Header */}
      <FinanceCard>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
          Invoices
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your invoices and track payments
        </p>
      </FinanceCard>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Invoices"
          value={loading ? '...' : stats.totalInvoices}
          subtitle={`${loading ? '...' : stats.thisMonthInvoices} this month`}
          icon={FileText}
          color="blue"
        />
        <MetricCard
          title="Total Amount"
          value={loading ? '...' : `₹${stats.totalAmount.toLocaleString()}`}
          subtitle="Total invoiced"
          icon={IndianRupee}
          color="green"
        />
        <MetricCard
          title="Paid Amount"
          value={loading ? '...' : `₹${stats.paidAmount.toLocaleString()}`}
          subtitle="Collected"
          icon={IndianRupee}
          color="emerald"
        />
        <MetricCard
          title="Outstanding"
          value={loading ? '...' : `₹${stats.outstandingAmount.toLocaleString()}`}
          subtitle={`${loading ? '...' : stats.overdueInvoices} overdue`}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <FinanceCard>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => toast.success('Create invoices directly using the Direct Invoice button')}
            className="flex items-center p-4 bg-gradient-to-r from-athenas-blue to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Create Invoice</div>
              <div className="text-sm opacity-90">Direct invoice creation</div>
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
            <IndianRupee className="w-5 h-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Unpaid Invoices</div>
              <div className="text-sm opacity-90">Collect payments</div>
            </div>
          </button>
        </div>
      </FinanceCard>

      {/* Invoice List */}
      <InvoiceList
        sessionKey={sessionKey}
      />

      {/* Note: Invoice Form removed - using simplified forms via PO workflow */}
    </div>
  );
};

export default Invoices;
