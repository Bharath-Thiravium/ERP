import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { PaymentRecord, PAYMENT_METHODS, fmt } from './types';

interface Props {
  invoiceId: number;
  invoiceType: 'tax_invoice' | 'proforma_invoice';
  sessionKey: string;
  cashOutstanding: number;
  tdsApplicable: boolean;
  tdsSection: string;
  tdsRate: number;
  subtotal: number;
  totalAmount: number;
  payments: PaymentRecord[];
  onRecorded: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

const CashPaymentForm: React.FC<Props> = ({
  invoiceId, invoiceType, sessionKey,
  cashOutstanding, tdsApplicable, tdsSection, tdsRate,
  subtotal, totalAmount, payments, onRecorded,
}) => {
  const [date, setDate]     = useState(today());
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');
  const [ref, setRef]       = useState('');
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const net = parseFloat(amount) || 0;

  // Back-calculate TDS from net cash received
  const tdsAmt = (() => {
    if (!tdsApplicable || tdsRate <= 0 || net <= 0) return 0;
    if (subtotal > 0 && totalAmount > 0) {
      const basicRatio = subtotal / totalAmount;
      const gross = net / (1 - basicRatio * tdsRate / 100);
      return parseFloat((gross * basicRatio * tdsRate / 100).toFixed(2));
    }
    return parseFloat((net * tdsRate / (100 - tdsRate)).toFixed(2));
  })();
  const gross = parseFloat((net + tdsAmt).toFixed(2));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (net <= 0) return;
    if (gross > cashOutstanding + tdsAmt + 0.01) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(`Amount ₹${fmt(gross)} exceeds cash outstanding ₹${fmt(cashOutstanding)}`);
      return;
    }
    setSaving(true);
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      const payload: Record<string, any> = {
        payment_date: date,
        amount: gross,
        gross_payment_amount: gross,
        net_amount_received: net,
        tds_applicable: tdsApplicable,
        tds_section: tdsSection,
        tds_rate: tdsRate,
        tds_amount: tdsAmt,
        tds_deposited: false,
        tds_certificate_received: false,
        payment_method: method,
        reference_number: ref,
        notes,
        status: 'completed',
      };
      payload[invoiceType === 'proforma_invoice' ? 'proforma_invoice' : 'invoice'] = invoiceId;
      await api.post(`/api/finance/payments/`, payload, { params: { session_key: sessionKey } });
      toast.success('Payment recorded');
      setAmount(''); setRef(''); setNotes(''); setDate(today());
      onRecorded();
    } catch (err: any) {
      const { default: toast } = await import('react-hot-toast');
      const d = err?.response?.data;
      toast.error(d?.non_field_errors?.[0] || d?.amount?.[0] || d?.detail || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const cashHistory = payments.filter(p => parseFloat(p.net_amount_received || '0') > 0);
  const totalCash   = cashHistory.reduce((s, p) => s + parseFloat(p.net_amount_received || '0'), 0);

  return (
    <div className="space-y-4">

      {/* History */}
      {cashHistory.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Cash Received</span>
            <span className="text-xs font-bold text-green-600">₹{fmt(totalCash)}</span>
          </div>
          <div className="space-y-1">
            {cashHistory.map(p => (
              <div key={p.id} className="flex justify-between items-center px-3 py-2 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-lg text-xs">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="font-medium">{p.payment_date}</span>
                  <span className="text-gray-400 capitalize">{p.payment_method?.replace('_', ' ')}</span>
                  {p.reference_number && <span className="text-gray-400">#{p.reference_number}</span>}
                </div>
                <span className="font-semibold text-green-700 dark:text-green-400">₹{fmt(p.net_amount_received)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outstanding badge */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
        <span className="text-xs text-gray-600 dark:text-gray-300">Cash Outstanding</span>
        <span className={`text-sm font-bold ${cashOutstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
          ₹{fmt(cashOutstanding)}
        </span>
      </div>

      {/* New entry */}
      {cashOutstanding > 0 && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Payment
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Amount Received *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input type="number" step="0.01" min="0.01" value={amount}
                  onChange={e => setAmount(e.target.value)} required placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* TDS split preview */}
          {tdsApplicable && tdsRate > 0 && net > 0 && (
            <div className="grid grid-cols-3 gap-2 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 rounded-lg p-2.5 text-center">
              <div>
                <p className="text-[10px] text-gray-500">Cash Received</p>
                <p className="text-xs font-semibold text-green-600">₹{fmt(net)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">TDS ({tdsRate}%)</p>
                <p className="text-xs font-semibold text-orange-600">₹{fmt(tdsAmt)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500">Covers Invoice</p>
                <p className="text-xs font-semibold text-blue-600">₹{fmt(gross)}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reference No.</label>
              <input type="text" value={ref} onChange={e => setRef(e.target.value)} placeholder="UTR / Cheque no."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          <button type="submit" disabled={saving || net <= 0}
            className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 font-medium"
          >
            {saving ? 'Recording…' : 'Record Payment'}
          </button>
        </form>
      )}

      {cashOutstanding <= 0 && (
        <p className="text-xs text-green-600 font-medium text-center py-2">✓ Cash fully received</p>
      )}
    </div>
  );
};

export default CashPaymentForm;
