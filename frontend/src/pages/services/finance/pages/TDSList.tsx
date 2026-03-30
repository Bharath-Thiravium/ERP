import React, { useState, useEffect, useMemo } from 'react';
import { useServiceUserStore } from '@/store/serviceUserStore';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Download, FileText, Eye, Printer } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import PaymentDetailModal from '../components/PaymentDetailModal';

interface TDSPayment {
  id: number;
  payment_number: string;
  payment_date: string;
  customer_name: string;
  customer_pan: string;
  invoice_number: string;
  amount: number;
  tds_section_code: string;
  tds_rate_applied: number;
  tds_amount: number;
  net_amount_received: number;
  tds_certificate_issued: boolean;
  form16a_number?: string;
  ca_submission_status?: string;
  quarter: string;
  financial_year: string;
}

const TDSList: React.FC = () => {
  const { sessionKey } = useServiceUserStore();
  const [payments, setPayments] = useState<TDSPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const getCurrentQuarter = (): 'Q1' | 'Q2' | 'Q3' | 'Q4' => {
    const m = new Date().getMonth() + 1;
    if (m >= 4 && m <= 6) return 'Q1';
    if (m >= 7 && m <= 9) return 'Q2';
    if (m >= 10 && m <= 12) return 'Q3';
    return 'Q4';
  };

  const [currentQuarter, setCurrentQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(getCurrentQuarter);
  const [filters, setFilters] = useState({ tdsSection: '', form16aPending: false, customerSearch: '' });
  const [stats, setStats] = useState({ totalTDS: 0, totalPayments: 0, pending16a: 0, caPending: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const quarters = [
    { value: 'Q1', label: 'Q1 (Apr-Jun)' },
    { value: 'Q2', label: 'Q2 (Jul-Sep)' },
    { value: 'Q3', label: 'Q3 (Oct-Dec)' },
    { value: 'Q4', label: 'Q4 (Jan-Mar)' },
  ];

  const getCurrentFinancialYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  const loadPayments = async () => {
    if (!sessionKey) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        quarter: currentQuarter,
        session_key: sessionKey,
        page: page.toString(),
        limit: '25',
      });
      if (filters.tdsSection) params.append('tds_section', filters.tdsSection);
      if (filters.form16aPending) params.append('form16a_pending', 'true');
      if (filters.customerSearch) params.append('customer', filters.customerSearch);

      const response = await apiClient.get(`/api/finance/tds/?${params}`);
      const results = response.data.results ?? response.data;
      setPayments(Array.isArray(results) ? results : []);
      setStats({
        totalTDS: response.data.total_tds || 0,
        totalPayments: response.data.count || 0,
        pending16a: response.data.pending_16a || 0,
        caPending: response.data.ca_pending || 0,
      });
    } catch (error) {
      toast.error('Failed to load TDS payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPayments(); }, [currentQuarter, filters, page, sessionKey]);

  const filteredPayments = useMemo(() => {
    if (!filters.customerSearch) return payments;
    return payments.filter(p =>
      p.customer_name.toLowerCase().includes(filters.customerSearch.toLowerCase())
    );
  }, [payments, filters.customerSearch]);

  const handleExportCSV = () => {
    if (!sessionKey) return;
    const fy = getCurrentFinancialYear();
    const params = new URLSearchParams({ quarter: currentQuarter, financial_year: fy, session_key: sessionKey });
    if (filters.tdsSection) params.append('tds_section', filters.tdsSection);
    const link = document.createElement('a');
    link.href = `/api/finance/tds/export/?${params}`;
    link.download = `TDS_Report_${fy}_${currentQuarter}.csv`;
    link.click();
    toast.success('CSV export started');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

  const formatDate = (d: string) => format(new Date(d), 'dd MMM yyyy');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">TDS Management Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track TDS deductions, Form 16A certificates & CA submissions (26Q compliant)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Quarter + Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Quarter Selection</CardTitle></CardHeader>
          <CardContent>
            <Tabs value={currentQuarter} onValueChange={(q) => { setCurrentQuarter(q as any); setPage(1); }}>
              <TabsList className="grid w-full grid-cols-4">
                {quarters.map((q) => (
                  <TabsTrigger key={q.value} value={q.value}>{q.label}</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium block mb-1">TDS Section</label>
                <Select
                  value={filters.tdsSection}
                  onValueChange={(v) => setFilters({ ...filters, tdsSection: v })}
                >
                  <SelectTrigger><SelectValue placeholder="All Sections" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Sections</SelectItem>
                    <SelectItem value="194C">194C (Contractors)</SelectItem>
                    <SelectItem value="194J">194J (Professional)</SelectItem>
                    <SelectItem value="194H">194H (Commission)</SelectItem>
                    <SelectItem value="194I">194I (Rent)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-1 cursor-pointer text-sm pb-1">
                <input
                  type="checkbox"
                  checked={filters.form16aPending}
                  onChange={(e) => setFilters({ ...filters, form16aPending: e.target.checked })}
                  className="rounded"
                />
                Form 16A Pending
              </label>
            </div>
            <Input
              placeholder="Search customer / PAN..."
              value={filters.customerSearch}
              onChange={(e) => setFilters({ ...filters, customerSearch: e.target.value })}
            />
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalTDS)}</div>
            <p className="text-sm text-gray-500 mt-1">Total TDS ({currentQuarter})</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-green-600">{stats.totalPayments}</div>
            <p className="text-sm text-gray-500 mt-1">Payments Processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-orange-600">{stats.pending16a}</div>
            <p className="text-sm text-gray-500 mt-1">Form 16A Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Badge variant={stats.caPending > 0 ? 'error' : 'success'}>
              {stats.caPending > 0 ? `${stats.caPending} CA Pending` : 'All Submitted'}
            </Badge>
            <p className="text-sm text-gray-500 mt-1">CA Submission</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>TDS Payments Register</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {['Date', 'Payment #', 'Customer', 'PAN', 'Invoice', 'Gross (₹)', 'Section', 'Rate', 'TDS (₹)', 'Net (₹)', 'Form 16A', 'CA Status', ''].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                      Loading TDS payments...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-3 py-8 text-center text-gray-500">
                      No TDS payments found for {currentQuarter}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(payment.payment_date)}</td>
                      <td className="px-3 py-2 font-mono font-semibold whitespace-nowrap">{payment.payment_number}</td>
                      <td className="px-3 py-2">{payment.customer_name}</td>
                      <td className="px-3 py-2 font-mono">{payment.customer_pan || '—'}</td>
                      <td className="px-3 py-2">{payment.invoice_number || '—'}</td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(payment.amount)}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">{payment.tds_section_code || '—'}</Badge>
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {payment.tds_rate_applied ? `${payment.tds_rate_applied}%` : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono font-semibold text-red-600">
                        {formatCurrency(payment.tds_amount)}
                      </td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(payment.net_amount_received)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={payment.tds_certificate_issued ? 'success' : 'warning'}>
                          {payment.tds_certificate_issued ? 'Received' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={
                          payment.ca_submission_status === 'submitted' ? 'success' :
                          payment.ca_submission_status === 'pending' ? 'warning' : 'default'
                        }>
                          {payment.ca_submission_status || 'Not Assigned'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPayment(payment)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-3 mt-2">
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPayment && (
        <PaymentDetailModal
          payment={{
            ...selectedPayment,
            tds_percentage: selectedPayment.tds_rate_applied,
          }}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </div>
  );
};

export default TDSList;
