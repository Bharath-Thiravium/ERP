import React, { useState } from 'react';
import { CheckCircle, Clock, Plus, Trash2 } from 'lucide-react';
import { fmt } from './types';

interface TDSEntry {
  id: number;
  deposit_date: string;
  amount: string;
  challan_number: string;
  form16a_number: string;
  certificate_received: boolean;
  notes: string;
}

interface Payment {
  id: number;
  payment_number: string;
  payment_date: string;
  tds_amount: string;
  tds_rate: string;
  tds_section: string;
  tds_applicable: boolean;
  tds_certificate_received: boolean;
  tds_deposited: boolean;
  status: string;
}

interface Props {
  sessionKey: string;
  invoiceId: number;
  invoiceType: 'tax_invoice' | 'proforma_invoice';
  tdsMax: number;           // subtotal × rate/100 — total TDS for the invoice
  tdsOutstanding: number;   // tdsMax - cert-received so far
  tdsSection: string;
  tdsRate: number;
  payments: Payment[];
  depositsMap: Record<number, TDSEntry[]>;
  onChanged: () => void;
}

const today = () => new Date().toISOString().split('T')[0];
const EMPTY = { deposit_date: today(), amount: '', challan_number: '', form16a_number: '', certificate_received: false, notes: '' };

const TDSTracker: React.FC<Props> = ({ sessionKey, invoiceId, invoiceType, tdsMax, tdsOutstanding, tdsSection, tdsRate, payments, depositsMap, onChanged }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);

  // All TDS entries across all payments (flattened)
  const allEntries: Array<TDSEntry & { paymentId: number }> = [];
  payments.forEach(p => {
    (depositsMap[p.id] || []).forEach(d => allEntries.push({ ...d, paymentId: p.id }));
  });

  const totalDeposited = allEntries.reduce((s, d) => s + parseFloat(d.amount || '0'), 0);
  const totalCertReceived = allEntries
    .filter(d => d.certificate_received)
    .reduce((s, d) => s + parseFloat(d.amount || '0'), 0);
  const remaining = Math.max(0, parseFloat((tdsMax - totalDeposited).toFixed(2)));

  // Use the first TDS-applicable payment as the parent for new deposits
  const tdsPayment = payments.find(p => p.tds_applicable)
    ?? payments.find(p => p.status === 'completed');

  const handleDeleteTdsPayment = async (paymentId: number) => {
    if (!window.confirm('Delete this TDS entry? This will update the invoice outstanding amount.')) return;
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      await api.delete(`/api/finance/payments/${paymentId}/`, { params: { session_key: sessionKey } });
      toast.success('TDS entry deleted');
      onChanged();
    } catch {
      const { default: toast } = await import('react-hot-toast');
      toast.error('Failed to delete TDS entry');
    }
  };

  const handleMarkCertReceived = async (paymentId: number, current: boolean) => {
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      await api.patch(
        `/api/finance/payment-tds/${paymentId}/mark-cert-received/`,
        { certificate_received: !current },
        { params: { session_key: sessionKey } }
      );
      toast.success(!current ? 'TDS certificate marked received' : 'Marked pending');
      onChanged();
    } catch {
      const { default: toast } = await import('react-hot-toast');
      toast.error('Failed to update');
    }
  };

  const handleAdd = async () => {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      const { default: toast } = await import('react-hot-toast');
      toast.error('Enter a valid amount'); return;
    }
    if (amt > remaining + 0.01) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(`₹${fmt(amt)} exceeds TDS outstanding ₹${fmt(remaining)}`); return;
    }
    
    setSaving(true);
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      
      // Record TDS-only payment directly
      const endpoint = invoiceType === 'proforma_invoice'
        ? `/api/finance/proforma-invoices/${invoiceId}/payment/`
        : `/api/finance/invoices/${invoiceId}/payment/`;
      
      await api.post(
        endpoint,
        {
          payment_date: form.deposit_date,
          amount_received: 0,
          tds_amount: amt,
          tds_percentage: tdsRate,
          net_amount: 0,
          payment_method: 'bank_transfer',
          reference_number: form.challan_number,
          notes: form.notes || 'TDS payment',
        },
        {
          headers: {
            'Authorization': `Bearer ${sessionKey}`
          },
          params: {}  // Override interceptor params
        }
      );
      
      toast.success('TDS payment recorded');
      setForm(EMPTY); setShowForm(false);
      onChanged();
    } catch (err: any) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(err?.response?.data?.non_field_errors?.[0] || err?.response?.data?.detail || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (paymentId: number, depositId: number) => {
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      // Check if parent payment is tds_only — if so, delete the payment itself (cascade deletes deposit)
      const parentPayment = payments.find(p => p.id === paymentId);
      if (parentPayment?.payment_type === 'tds_only') {
        if (!window.confirm('Delete this TDS entry? This will update the invoice outstanding amount.')) return;
        await api.delete(`/api/finance/payments/${paymentId}/`, { params: { session_key: sessionKey } });
      } else {
        await api.delete(`/api/finance/payment-tds/${paymentId}/deposits/${depositId}/`, { params: { session_key: sessionKey } });
      }
      toast.success('Entry removed'); onChanged();
    } catch {
      const { default: toast } = await import('react-hot-toast');
      toast.error('Failed to delete');
    }
  };

  const handleToggleCert = async (paymentId: number, depositId: number, current: boolean) => {
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      await api.patch(
        `/api/finance/payment-tds/${paymentId}/deposits/${depositId}/`,
        { certificate_received: !current },
        { params: { session_key: sessionKey } }
      );
      toast.success(!current ? 'Form 16A marked received' : 'Marked pending');
      onChanged();
    } catch {
      const { default: toast } = await import('react-hot-toast');
      toast.error('Failed to update');
    }
  };

  return (
    <div className="space-y-4">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-600 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-400">TDS Max</p>
          <p className="text-xs font-bold text-gray-700 dark:text-gray-200">₹{fmt(tdsMax)}</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Deposited</p>
          <p className="text-xs font-bold text-blue-600">₹{fmt(totalDeposited)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-700 rounded-lg p-2 text-center">
          <p className="text-[10px] text-gray-500 dark:text-gray-400">Remaining</p>
          <p className={`text-xs font-bold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>₹{fmt(remaining)}</p>
        </div>
      </div>
      {/* Cert received sub-row */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-800 rounded-lg">
        <span className="text-[11px] text-gray-500 dark:text-gray-400">Form 16A / Cert Received</span>
        <span className={`text-xs font-bold ${totalCertReceived >= tdsMax && tdsMax > 0 ? 'text-green-600' : 'text-amber-600'}`}>
          ₹{fmt(totalCertReceived)}
        </span>
      </div>

      {/* Per-payment cert received — for payments with no deposit entries */}
      {payments.filter(p => p.status === 'completed' && parseFloat(p.tds_amount || '0') > 0).map(p => {
        const hasDeposits = (depositsMap[p.id] || []).length > 0;
        if (hasDeposits) return null; // handled via deposit toggle above
        return (
          <div key={p.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <span className="font-medium">{p.payment_number}</span>
              <span className="text-gray-400">TDS ₹{fmt(p.tds_amount)}</span>
            </div>
            <button type="button"
              onClick={() => handleMarkCertReceived(p.id, p.tds_certificate_received)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                p.tds_certificate_received
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              {p.tds_certificate_received
                ? <><CheckCircle className="w-3 h-3" /> 16A Received</>
                : <><Clock className="w-3 h-3" /> Mark 16A Received</>}
            </button>
          </div>
        );
      })}

      {/* TDS-only payment entries */}
      {payments.filter(p => p.payment_type === 'tds_only' && p.status === 'completed').map(p => (
        <div key={p.id} className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-700 rounded-lg px-3 py-2 text-xs">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 flex-wrap">
            <span className="font-medium">{p.payment_date}</span>
            <span className="text-gray-400">{p.payment_number}</span>
            {p.reference_number && <span className="text-gray-400">#{p.reference_number}</span>}
            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-1.5 py-0.5 rounded text-[10px] font-medium">TDS Entry</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-orange-600">₹{fmt(p.tds_amount)}</span>
            <button type="button" onClick={() => handleDeleteTdsPayment(p.id)}
              className="text-gray-300 hover:text-red-500 transition-colors" title="Delete TDS entry">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Existing deposit entries */}
      {allEntries.length > 0 && (
        <div className="space-y-1.5">
          {allEntries.map(d => (
            <div key={d.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 flex-wrap">
                <span className="font-medium">{d.deposit_date}</span>
                {d.challan_number && <span className="text-gray-400">#{d.challan_number}</span>}
                {d.form16a_number && <span className="text-gray-400">16A: {d.form16a_number}</span>}
                <button type="button"
                  onClick={() => handleToggleCert(d.paymentId, d.id, d.certificate_received)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    d.certificate_received
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 hover:bg-yellow-50 hover:text-yellow-700'
                  }`}
                >
                  {d.certificate_received
                    ? <><CheckCircle className="w-3 h-3" /> 16A Received</>
                    : <><Clock className="w-3 h-3" /> 16A Pending</>}
                </button>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-orange-600">₹{fmt(d.amount)}</span>
                <button type="button" onClick={() => handleDelete(d.paymentId, d.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add TDS entry */}
      {tdsOutstanding > 0 ? (
        <>
          {!showForm ? (
            <button type="button" onClick={() => { setShowForm(true); setForm({ ...EMPTY, amount: String(remaining) }); }}
              className="flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add TDS Entry (max ₹{fmt(remaining)})
            </button>
          ) : (
            <div className="border border-orange-100 dark:border-orange-800 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Date *</label>
                  <input type="date" value={form.deposit_date}
                    onChange={e => setForm(f => ({ ...f, deposit_date: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Amount * (max ₹{fmt(remaining)})</label>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                    <input type="number" step="0.01" min="0.01" max={remaining}
                      value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Challan No.</label>
                  <input type="text" value={form.challan_number} placeholder="BSR/Challan"
                    onChange={e => setForm(f => ({ ...f, challan_number: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Form 16A No.</label>
                  <input type="text" value={form.form16a_number} placeholder="Certificate no."
                    onChange={e => setForm(f => ({ ...f, form16a_number: e.target.value }))}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.certificate_received}
                  onChange={e => setForm(f => ({ ...f, certificate_received: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500"
                />
                <span className="text-[11px] text-gray-600 dark:text-gray-300">Form 16A already received</span>
              </label>
              <div className="flex gap-2">
                <button type="button" disabled={saving} onClick={handleAdd}
                  className="flex-1 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving…' : 'Save TDS Entry'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-green-600 font-medium text-center py-2 flex items-center justify-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" /> TDS fully settled
        </p>
      )}
    </div>
  );
};

export default TDSTracker;
