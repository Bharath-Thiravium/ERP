import React, { useState } from 'react';
import { CheckCircle, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { PaymentRecord, TDSDeposit, fmt } from './types';

interface Props {
  sessionKey: string;
  tdsOutstanding: number;
  payments: PaymentRecord[];
  depositsMap: Record<number, TDSDeposit[]>;
  onChanged: () => void;
}

const today = () => new Date().toISOString().split('T')[0];

const EMPTY_DEP = { deposit_date: today(), amount: '', challan_number: '', form16a_number: '', certificate_received: false, notes: '' };

const TDSTracker: React.FC<Props> = ({ sessionKey, tdsOutstanding, payments, depositsMap, onChanged }) => {
  const [expanded, setExpanded]     = useState<number | null>(null);
  const [depForm, setDepForm]       = useState(EMPTY_DEP);
  const [saving, setSaving]         = useState(false);

  const tdsPayments = payments.filter(p => parseFloat(p.tds_amount || '0') > 0);
  const totalTds    = tdsPayments.reduce((s, p) => s + parseFloat(p.tds_amount || '0'), 0);
  const totalDep    = tdsPayments.reduce((s, p) => {
    return s + (depositsMap[p.id] || []).reduce((ds, d) => ds + parseFloat(d.amount), 0);
  }, 0);
  const totalCert   = tdsPayments.reduce((s, p) => {
    return s + (depositsMap[p.id] || []).filter(d => d.certificate_received).reduce((ds, d) => ds + parseFloat(d.amount), 0);
  }, 0);

  const handleAddDeposit = async (paymentId: number, tdsTotal: number) => {
    const amt = parseFloat(depForm.amount);
    if (!amt || amt <= 0) { const { default: toast } = await import('react-hot-toast'); toast.error('Enter amount'); return; }
    const existing = (depositsMap[paymentId] || []).reduce((s, d) => s + parseFloat(d.amount), 0);
    if (existing + amt > tdsTotal + 0.01) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(`Total ₹${(existing + amt).toFixed(2)} exceeds TDS ₹${tdsTotal.toFixed(2)}`);
      return;
    }
    setSaving(true);
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      await api.post(`/api/finance/payments/${paymentId}/tds-deposits/`, depForm, { params: { session_key: sessionKey } });
      toast.success('TDS deposit recorded');
      setDepForm(EMPTY_DEP);
      setExpanded(null);
      onChanged();
    } catch (err: any) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(err?.response?.data?.non_field_errors?.[0] || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (paymentId: number, depositId: number) => {
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      await api.delete(`/api/finance/payments/${paymentId}/tds-deposits/${depositId}/`, { params: { session_key: sessionKey } });
      toast.success('Deposit removed');
      onChanged();
    } catch { const { default: toast } = await import('react-hot-toast'); toast.error('Failed to delete'); }
  };

  const handleToggleCert = async (paymentId: number, depositId: number, current: boolean) => {
    try {
      const { default: api } = await import('../../../../../lib/api');
      const { default: toast } = await import('react-hot-toast');
      await api.patch(`/api/finance/payments/${paymentId}/tds-deposits/${depositId}/`, { certificate_received: !current }, { params: { session_key: sessionKey } });
      toast.success(!current ? 'Form 16A marked received' : 'Marked pending');
      onChanged();
    } catch { const { default: toast } = await import('react-hot-toast'); toast.error('Failed to update'); }
  };

  if (tdsPayments.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No TDS entries yet.</p>
        <p className="text-xs text-gray-400 mt-1">TDS entries appear once a payment with TDS is recorded.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total TDS',  val: totalTds,  color: 'text-orange-600' },
          { label: 'Deposited',  val: totalDep,  color: 'text-blue-600'   },
          { label: 'Cert Rcvd', val: totalCert, color: totalCert >= totalTds ? 'text-green-600' : 'text-red-500' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg p-2 text-center">
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
            <p className={`text-xs font-bold ${color}`}>₹{fmt(val)}</p>
          </div>
        ))}
      </div>

      {/* TDS outstanding badge */}
      <div className="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
        <span className="text-xs text-gray-600 dark:text-gray-300">TDS Outstanding</span>
        <span className={`text-sm font-bold ${tdsOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
          ₹{fmt(tdsOutstanding)}
        </span>
      </div>

      {/* Per-payment TDS rows */}
      <div className="space-y-3">
        {tdsPayments.map(p => {
          const tdsTotal   = parseFloat(p.tds_amount || '0');
          const deposits   = depositsMap[p.id] || [];
          const deposited  = deposits.reduce((s, d) => s + parseFloat(d.amount), 0);
          const remaining  = parseFloat((tdsTotal - deposited).toFixed(2));
          const isExpanded = expanded === p.id;

          return (
            <div key={p.id} className="border border-orange-200 dark:border-orange-700 rounded-lg overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-orange-50 dark:bg-orange-900/20 text-xs">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">{p.payment_date}</span>
                  <span className="text-gray-400">{p.tds_section} · {p.tds_rate}%</span>
                  <span className="text-gray-400">#{p.payment_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-orange-600">₹{fmt(tdsTotal)}</span>
                  {p.tds_deposited && <CheckCircle className="w-3.5 h-3.5 text-green-500" title="Fully deposited" />}
                  {p.tds_certificate_received && <CheckCircle className="w-3.5 h-3.5 text-blue-500" title="Form 16A received" />}
                </div>
              </div>

              {/* Progress */}
              <div className="px-3 pt-2">
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>Deposited: ₹{fmt(deposited)}</span>
                  <span className={remaining > 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                    {remaining > 0 ? `Remaining: ₹${fmt(remaining)}` : '✓ Fully deposited'}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                  <div className="bg-orange-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, tdsTotal > 0 ? (deposited / tdsTotal) * 100 : 0)}%` }} />
                </div>
              </div>

              {/* Existing deposits */}
              {deposits.length > 0 && (
                <div className="px-3 pb-2 space-y-1.5">
                  {deposits.map(d => (
                    <div key={d.id} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-2.5 py-2 text-xs">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 flex-wrap">
                        <span className="font-medium">{d.deposit_date}</span>
                        {d.challan_number && <span className="text-gray-400">#{d.challan_number}</span>}
                        {d.form16a_number && <span className="text-gray-400">16A: {d.form16a_number}</span>}
                        <button type="button"
                          onClick={() => handleToggleCert(p.id, d.id, d.certificate_received)}
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
                        <button type="button" onClick={() => handleDelete(p.id, d.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add deposit */}
              <div className="px-3 pb-3">
                {remaining > 0 ? (
                  <>
                    <button type="button"
                      onClick={() => { setExpanded(isExpanded ? null : p.id); setDepForm({ ...EMPTY_DEP, amount: String(remaining) }); }}
                      className="flex items-center gap-1.5 text-[11px] text-orange-600 hover:text-orange-700 font-medium"
                    >
                      {isExpanded
                        ? <><ChevronUp className="w-3.5 h-3.5" /> Cancel</>
                        : <><ChevronDown className="w-3.5 h-3.5" /> + Add deposit</>}
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-2 border border-orange-100 dark:border-orange-800 rounded-lg p-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Date *</label>
                            <input type="date" value={depForm.deposit_date}
                              onChange={e => setDepForm(f => ({ ...f, deposit_date: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Amount * (max ₹{fmt(remaining)})</label>
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                              <input type="number" step="0.01" min="0.01" max={remaining}
                                value={depForm.amount}
                                onChange={e => setDepForm(f => ({ ...f, amount: e.target.value }))}
                                className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Challan No.</label>
                            <input type="text" value={depForm.challan_number} placeholder="BSR/Challan"
                              onChange={e => setDepForm(f => ({ ...f, challan_number: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">Form 16A No.</label>
                            <input type="text" value={depForm.form16a_number} placeholder="Certificate no."
                              onChange={e => setDepForm(f => ({ ...f, form16a_number: e.target.value }))}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={depForm.certificate_received}
                            onChange={e => setDepForm(f => ({ ...f, certificate_received: e.target.checked }))}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500"
                          />
                          <span className="text-[11px] text-gray-600 dark:text-gray-300">Form 16A already received</span>
                        </label>
                        <button type="button" disabled={saving}
                          onClick={() => handleAddDeposit(p.id, tdsTotal)}
                          className="w-full py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 font-medium"
                        >
                          {saving ? 'Saving…' : 'Save Deposit'}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[11px] text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> All TDS deposited
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TDSTracker;
