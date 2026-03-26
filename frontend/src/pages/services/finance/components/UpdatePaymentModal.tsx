import React, { useState, useEffect, useCallback } from 'react';
import { X, Banknote, FileText, AlertTriangle } from 'lucide-react';
import api from '../../../../lib/api';
import { InvoiceProp, PaymentRecord, TDSDeposit, fmt } from './payment/types';
import TDSConfigPanel from './payment/TDSConfigPanel';
import CashPaymentForm from './payment/CashPaymentForm';
import TDSTracker from './payment/TDSTracker';

interface Props {
  invoice: InvoiceProp;
  onClose: () => void;
  onSuccess: () => void;
  sessionKey: string;
  invoiceType?: 'tax_invoice' | 'proforma_invoice';
  initialTab?: 'cash' | 'tds';
}

const UpdatePaymentModal: React.FC<Props> = ({
  invoice, onClose, onSuccess, sessionKey,
  invoiceType = 'tax_invoice',
  initialTab = 'cash',
}) => {
  const [tab, setTab]           = useState<'cash' | 'tds'>(initialTab);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [depositsMap, setDepositsMap] = useState<Record<number, TDSDeposit[]>>({});
  const [loading, setLoading]   = useState(true);

  // Invoice-level TDS config (editable, one-time declaration)
  const [tdsApplicable, setTdsApplicable] = useState(!!invoice.tds_applicable);
  const [tdsSection, setTdsSection]       = useState(invoice.tds_section || '');
  const [tdsRate, setTdsRate]             = useState(parseFloat(String(invoice.tds_rate || 0)));

  // Derived outstanding values
  const totalOutstanding = parseFloat(invoice.outstanding_amount || '0');
  const totalAmount      = parseFloat(invoice.total_amount || '0');
  const subtotal         = parseFloat(invoice.subtotal || '0');

  // Cash outstanding = total - all TDS portions - all cash received
  // TDS outstanding  = sum of TDS on payments where cert not received
  const cashOutstanding = (() => {
    const cashPaid = payments.filter(p => p.status === 'completed')
      .reduce((s, p) => s + parseFloat(p.net_amount_received || '0'), 0);
    const tdsPortion = payments.filter(p => p.status === 'completed' && p.tds_applicable)
      .reduce((s, p) => s + parseFloat(p.tds_amount || '0'), 0);
    return Math.max(0, totalAmount - tdsPortion - cashPaid);
  })();

  const tdsOutstanding = payments
    .filter(p => p.status === 'completed' && p.tds_applicable && !p.tds_certificate_received)
    .reduce((s, p) => s + parseFloat(p.tds_amount || '0'), 0);

  const hasTdsPayments = payments.some(p => parseFloat(p.tds_amount || '0') > 0);

  const fetchDeposits = useCallback(async (pmts: PaymentRecord[]) => {
    const withTds = pmts.filter(p => parseFloat(p.tds_amount || '0') > 0);
    const map: Record<number, TDSDeposit[]> = {};
    await Promise.all(withTds.map(async p => {
      try {
        const res = await api.get(`/api/finance/payments/${p.id}/tds-deposits/`, { params: { session_key: sessionKey } });
        map[p.id] = res.data.results ?? res.data;
      } catch { map[p.id] = []; }
    }));
    setDepositsMap(map);
  }, [sessionKey]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = invoiceType === 'proforma_invoice'
        ? `/api/finance/payments/?proforma_invoice=${invoice.id}`
        : `/api/finance/payments/?invoice=${invoice.id}`;
      const res = await api.get(endpoint, { params: { session_key: sessionKey } });
      const pmts: PaymentRecord[] = res.data.results ?? res.data;
      setPayments(pmts);
      await fetchDeposits(pmts);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [invoice.id, sessionKey, invoiceType, fetchDeposits]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleTdsSaved = (applicable: boolean, section: string, rate: number) => {
    setTdsApplicable(applicable);
    setTdsSection(section);
    setTdsRate(rate);
  };

  const handleRecorded = () => { fetchPayments(); onSuccess(); };

  // Status label
  const statusLabel = (() => {
    if (cashOutstanding <= 0 && tdsOutstanding <= 0) return { text: 'PAID', cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' };
    if (payments.length === 0) return { text: 'UNPAID', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
    return { text: 'PARTIAL', cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' };
  })();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">Payment Manager</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusLabel.cls}`}>
                {statusLabel.text}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {invoice.invoice_number}
            </p>
            {/* Overall outstanding */}
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Overall outstanding:&nbsp;
                <span className={`font-semibold ${totalOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{fmt(totalOutstanding)}
                </span>
              </span>
              {tdsApplicable && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Cash:&nbsp;<span className={`font-semibold ${cashOutstanding > 0 ? 'text-red-500' : 'text-green-600'}`}>₹{fmt(cashOutstanding)}</span>
                  </span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    TDS:&nbsp;<span className={`font-semibold ${tdsOutstanding > 0 ? 'text-orange-500' : 'text-green-600'}`}>₹{fmt(tdsOutstanding)}</span>
                  </span>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg mt-0.5">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* ── TDS Config (always visible, above tabs) ── */}
        <div className="px-5 pt-3 shrink-0">
          <TDSConfigPanel
            invoiceId={invoice.id}
            sessionKey={sessionKey}
            tdsApplicable={tdsApplicable}
            tdsSection={tdsSection}
            tdsRate={tdsRate}
            onSaved={handleTdsSaved}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 shrink-0 mt-3">
          <button
            onClick={() => setTab('cash')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
              tab === 'cash'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Banknote className="w-4 h-4" />
            Payment
            {cashOutstanding > 0 && (
              <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                ₹{fmt(cashOutstanding)}
              </span>
            )}
          </button>

          {tdsApplicable && (
            <button
              onClick={() => setTab('tds')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                tab === 'tds'
                  ? 'border-b-2 border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              TDS
              {tdsOutstanding > 0 && (
                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> ₹{fmt(tdsOutstanding)}
                </span>
              )}
            </button>
          )}
        </div>

        {/* ── Tab content ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'cash' ? (
            <CashPaymentForm
              invoiceId={invoice.id}
              invoiceType={invoiceType}
              sessionKey={sessionKey}
              cashOutstanding={cashOutstanding}
              tdsApplicable={tdsApplicable}
              tdsSection={tdsSection}
              tdsRate={tdsRate}
              subtotal={subtotal}
              totalAmount={totalAmount}
              payments={payments}
              onRecorded={handleRecorded}
            />
          ) : (
            <TDSTracker
              sessionKey={sessionKey}
              tdsOutstanding={tdsOutstanding}
              payments={payments}
              depositsMap={depositsMap}
              onChanged={() => { fetchPayments(); onSuccess(); }}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end px-5 py-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default UpdatePaymentModal;
