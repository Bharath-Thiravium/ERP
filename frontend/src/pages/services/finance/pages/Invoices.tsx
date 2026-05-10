import React, { useState, useEffect } from 'react';
import { Plus, FileText, IndianRupee, AlertCircle, List } from 'lucide-react';

import DirectCreateTaxInvoiceModal from '../components/DirectCreateTaxInvoiceModal';

import InvoiceList from '../components/InvoiceList';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';
import FinanceCard from '../components/FinanceCard';
import MetricCard from '../components/MetricCard';
import FinancialYearFilter from '../components/FinancialYearFilter';
import { getCurrentFY } from '../../../../utils/financialYearUtils';


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
  const [showDirectInvoiceModal, setShowDirectInvoiceModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [invoiceFilter, setInvoiceFilter] = useState('');
  const [selectedFY, setSelectedFY] = useState<string>(getCurrentFY());

  const fetchInvoiceStats = async () => {
    if (!sessionKey) return;
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (selectedFY) {
        params.financial_year = selectedFY;
      } else {
        params.financial_year = 'all';
      }
      const response = await api.get('/api/finance/invoices/stats/', { params });
      const d = response.data;
      setStats({
        totalInvoices: d.total_invoices,
        totalAmount: d.total_amount,
        paidAmount: d.paid_amount,
        outstandingAmount: d.outstanding_amount,
        overdueInvoices: d.overdue_invoices,
        thisMonthInvoices: d.this_month_invoices,
      });
    } catch (error: any) {
      toast.error('Failed to fetch invoice statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceStats();
  }, [sessionKey, selectedFY]);



  return (
    <div className="space-y-6 min-w-0 max-w-full">

      
      {/* Page Header */}
      <FinanceCard>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Invoices
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your invoices and track payments
            </p>
          </div>
          <FinancialYearFilter
            selectedYear={selectedFY}
            onYearChange={setSelectedFY}
          />
        </div>
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
          value={loading ? '...' : `₹${stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Total invoiced"
          icon={IndianRupee}
          color="green"
        />
        <MetricCard
          title="Paid Amount"
          value={loading ? '...' : `₹${stats.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Collected"
          icon={IndianRupee}
          color="emerald"
        />
        <MetricCard
          title="Outstanding"
          value={loading ? '...' : `₹${stats.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${loading ? '...' : stats.overdueInvoices} overdue`}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <FinanceCard>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => { setInvoiceFilter(''); setShowDirectInvoiceModal(true); }}
            className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-3 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Direct Invoice</div>
              <div className="text-sm opacity-75">Create invoice directly</div>
            </div>
          </button>

          <button
            onClick={() => setInvoiceFilter('')}
            className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${
              invoiceFilter === ''
                ? 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500 text-gray-900 dark:text-white'
                : 'bg-gray-50 dark:bg-gray-800/20 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/40'
            }`}
          >
            <List className="w-5 h-5 mr-3 shrink-0" />
            <div className="text-left">
              <div className="font-medium">All Invoices</div>
              <div className="text-sm opacity-75">{stats.totalInvoices} total</div>
            </div>
          </button>

          <button
            onClick={() => setInvoiceFilter('overdue')}
            className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${
              invoiceFilter === 'overdue'
                ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40'
            }`}
          >
            <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
            <div className="text-left">
              <div className="font-medium">View Overdue</div>
              <div className="text-sm opacity-75">{stats.overdueInvoices} invoices</div>
            </div>
          </button>

          <button
            onClick={() => setInvoiceFilter('unpaid_or_partial')}
            className={`flex items-center p-4 border rounded-lg transition-all duration-200 ${
              invoiceFilter === 'unpaid_or_partial'
                ? 'bg-orange-100 dark:bg-orange-900/40 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/40'
            }`}
          >
            <IndianRupee className="w-5 h-5 mr-3 shrink-0" />
            <div className="text-left">
              <div className="font-medium">Unpaid Invoices</div>
              <div className="text-sm opacity-75">Unpaid &amp; partial payments</div>
            </div>
          </button>
        </div>
      </FinanceCard>

      {/* Invoice List */}
      <InvoiceList
        key={`${refreshKey}-${invoiceFilter}-${selectedFY}`}
        sessionKey={sessionKey}
        initialPaymentStatus={invoiceFilter}
        selectedFY={selectedFY}
      />

      {/* Direct Invoice Modal */}
      <DirectCreateTaxInvoiceModal
        isOpen={showDirectInvoiceModal}
        onClose={() => setShowDirectInvoiceModal(false)}
        onSuccess={() => {
          setShowDirectInvoiceModal(false);
          setRefreshKey(prev => prev + 1);
          fetchInvoiceStats();
          toast.success('Invoice created successfully!');
        }}
      />
    </div>
  );
};

export default Invoices;
