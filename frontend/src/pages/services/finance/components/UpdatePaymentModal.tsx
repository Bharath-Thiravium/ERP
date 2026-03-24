import React, { useState, useEffect, useCallback } from 'react';
import { X, Calculator, CheckCircle, Clock, Plus, Building, Banknote } from 'lucide-react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

interface Payment {
  id: number;
  payment_number: string;
  payment_date: string;
  // CA-Level TDS Fields (Professional Accounting)
  gross_payment_amount: string;  // What customer is paying (before TDS)
  tds_applicable: boolean;       // Whether TDS applies to this payment
  tds_rate: string;             // TDS percentage rate
  tds_amount: string;           // TDS amount deducted
  net_amount_received: string;  // Amount company actually receives (gross - TDS)
  tds_deposited: boolean;       // Whether TDS has been paid to government
  tds_certificate_received: boolean; // Whether Form 16A certificate received
  tds_section: string;          // TDS section (194C, 194J, etc.)
  payment_method: string;
  reference_number: string;
  status: string;
  // CA-level compliance tracking
  ca_name?: string;
  ca_firm?: string;
  ca_membership_number?: string;
  submitted_to_ca_date?: string;
  ca_acknowledgment_number?: string;
  ca_submission_status?: 'not_submitted' | 'submitted' | 'acknowledged' | 'returned';
  ca_notes?: string;
}

interface UpdatePaymentModalProps {
  invoice: {
    id: number;
    invoice_number: string;
    total_amount: string;
    outstanding_amount: string;
    subtotal?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
  sessionKey: string;
  invoiceType?: 'tax_invoice' | 'proforma_invoice';
}

const fmt = (v: string | number) => parseFloat(String(v) || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TDS_SECTIONS = [
  { value: '194C', label: '194C - Work/Contract Payments (2%)', rate: '2' },
  { value: '194J', label: '194J - Professional/Technical Services (10%)', rate: '10' },
  { value: '194I', label: '194I - Rent Payments (2%/10%)', rate: '2' },
  { value: '194H', label: '194H - Commission/Brokerage (5%)', rate: '5' },
  { value: '194A', label: '194A - Interest Payments (10%)', rate: '10' },
  { value: 'other', label: 'Other TDS Section', rate: '0' },
];

const UpdatePaymentModal: React.FC<UpdatePaymentModalProps> = ({
  invoice,
  onClose,
  onSuccess,
  sessionKey,
  invoiceType = 'tax_invoice'
}) => {
  const [history, setHistory] = useState<Payment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    gross_payment_amount: '',     // What customer is paying
    tds_applicable: false,        // TDS applies?
    tds_rate: '0',               // TDS percentage
    tds_amount: '0.00',          // TDS amount
    net_amount_received: '',     // Amount received after TDS
    tds_deposited: false,        // TDS paid to govt?
    tds_certificate_received: false, // Form 16A received?
    tds_section: '',             // TDS section
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
    // CA-level tracking
    ca_name: '',
    ca_firm: '',
    ca_membership_number: '',
    submitted_to_ca_date: '',
    ca_acknowledgment_number: '',
    ca_submission_status: 'not_submitted' as 'not_submitted' | 'submitted' | 'acknowledged' | 'returned',
    ca_notes: '',
  });

  const outstanding = parseFloat(invoice.outstanding_amount || '0');

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/api/finance/payments/?invoice=${invoice.id}&session_key=${sessionKey}`);
      setHistory(res.data.results ?? res.data);
    } catch {
      // silently ignore
    } finally {
      setLoadingHistory(false);
    }
  }, [invoice.id, sessionKey]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // CA-Level TDS Calculation Logic
  const calculateTds = (grossAmount: string, tdsRate: string, tdsApplicable: boolean) => {
    const gross = parseFloat(grossAmount) || 0;
    const rate = parseFloat(tdsRate) || 0;

    if (!tdsApplicable || gross <= 0 || rate <= 0) {
      return {
        tdsAmount: '0.00',
        netAmount: gross.toFixed(2)
      };
    }

    const tdsAmount = (gross * rate) / 100;
    const netAmount = gross - tdsAmount;

    return {
      tdsAmount: tdsAmount.toFixed(2),
      netAmount: netAmount.toFixed(2)
    };
  };

  const handleGrossAmountChange = (val: string) => {
    const { tdsAmount, netAmount } = calculateTds(val, form.tds_rate, form.tds_applicable);
    setForm(p => ({
      ...p,
      gross_payment_amount: val,
      tds_amount: tdsAmount,
      net_amount_received: netAmount
    }));
  };

  const handleTdsApplicableChange = (applicable: boolean) => {
    const { tdsAmount, netAmount } = calculateTds(form.gross_payment_amount, form.tds_rate, applicable);
    setForm(p => ({
      ...p,
      tds_applicable: applicable,
      tds_amount: tdsAmount,
      net_amount_received: netAmount,
      tds_rate: applicable ? form.tds_rate : '0'
    }));
  };

  const handleTdsSectionChange = (section: string) => {
    const selectedSection = TDS_SECTIONS.find(s => s.value === section);
    const rate = selectedSection ? selectedSection.rate : '0';
    const { tdsAmount, netAmount } = calculateTds(form.gross_payment_amount, rate, form.tds_applicable);

    setForm(p => ({
      ...p,
      tds_section: section,
      tds_rate: rate,
      tds_amount: tdsAmount,
      net_amount_received: netAmount
    }));
  };

  const handleTdsRateChange = (rate: string) => {
    const { tdsAmount, netAmount } = calculateTds(form.gross_payment_amount, rate, form.tds_applicable);
    setForm(p => ({
      ...p,
      tds_rate: rate,
      tds_amount: tdsAmount,
      net_amount_received: netAmount
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const grossAmt = parseFloat(form.gross_payment_amount);
    if (!grossAmt || grossAmt <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (grossAmt > outstanding + 0.01) {
      toast.error(`Payment amount exceeds outstanding ₹${fmt(outstanding)}`);
      return;
    }

    // Validate TDS logic
    if (form.tds_applicable) {
      if (!form.tds_section) {
        toast.error('Select TDS section when TDS is applicable');
        return;
      }
      const tdsAmt = parseFloat(form.tds_amount);
      if (tdsAmt <= 0) {
        toast.error('TDS amount must be greater than zero');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        payment_date: form.payment_date,
        // CA-Level TDS Fields
        gross_payment_amount: grossAmt,
        tds_applicable: form.tds_applicable,
        tds_rate: parseFloat(form.tds_rate) || 0,
        tds_amount: parseFloat(form.tds_amount) || 0,
        net_amount_received: parseFloat(form.net_amount_received) || grossAmt,
        tds_deposited: form.tds_deposited,
        tds_certificate_received: form.tds_certificate_received,
        tds_section: form.tds_section,
        payment_method: form.payment_method,
        reference_number: form.reference_number,
        notes: form.notes,
        status: 'completed',
        session_key: sessionKey,
        // CA-level compliance tracking
        ca_name: form.ca_name || null,
        ca_firm: form.ca_firm || null,
        ca_membership_number: form.ca_membership_number || null,
        submitted_to_ca_date: form.submitted_to_ca_date || null,
        ca_acknowledgment_number: form.ca_acknowledgment_number || null,
        ca_submission_status: form.ca_submission_status,
        ca_notes: form.ca_notes || null,
      };
      payload[invoiceType === 'proforma_invoice' ? 'proforma_invoice' : 'invoice'] = invoice.id;

      await api.post('/api/finance/payments/', payload);
      toast.success('Payment recorded with TDS compliance!');

      // Reset form
      setForm({
        payment_date: new Date().toISOString().split('T')[0],
        gross_payment_amount: '',
        tds_applicable: false,
        tds_rate: '0',
        tds_amount: '0.00',
        net_amount_received: '',
        tds_deposited: false,
        tds_certificate_received: false,
        tds_section: '',
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: '',
        ca_name: '',
        ca_firm: '',
        ca_membership_number: '',
        submitted_to_ca_date: '',
        ca_acknowledgment_number: '',
        ca_submission_status: 'not_submitted',
        ca_notes: '',
      });

      await fetchHistory();
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.non_field_errors?.[0] ||
                  err?.response?.data?.gross_payment_amount?.[0] ||
                  err?.response?.data?.detail ||
                  'Failed to record payment';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // CA-Level Compliance Calculations
  const pendingTdsPayments = history.filter(p => parseFloat(p.tds_amount) > 0 && !p.tds_certificate_received);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Banknote className="w-5 h-5 text-green-600" />
              CA-Level Payment & TDS Tracking
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {invoice.invoice_number} &nbsp;•&nbsp; Outstanding: <span className="font-medium text-red-600">₹{fmt(outstanding)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-6">

          {/* ── Payment History ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Payment History
            </h3>
            {loadingHistory ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No payments recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map(p => {
                  const total = parseFloat(p.gross_payment_amount) || 0;
                  const tds = parseFloat(p.tds_amount) || 0;
                  const cash = parseFloat(p.net_amount_received) || (total - tds);
                  const cashPct = total > 0 ? (cash / total) * 100 : 100;
                  const tdsPct = total > 0 ? (tds / total) * 100 : 0;
                  const hasTds = tds > 0;

                  return (
                    <div key={p.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
                      {/* Top row: date + method + amount */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{p.payment_date}</span>
                          <span className="text-xs text-gray-400 capitalize px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {p.payment_method?.replace('_', ' ')}
                          </span>
                          {p.reference_number && (
                            <span className="text-xs text-gray-400">#{p.reference_number}</span>
                          )}
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{fmt(total)}</span>
                      </div>

                      {/* Split bar */}
                      <div className="flex rounded-full overflow-hidden h-4 mb-2 bg-gray-100 dark:bg-gray-700">
                        <div
                          className="bg-green-500 flex items-center justify-center transition-all"
                          style={{ width: `${cashPct}%` }}
                          title={`Cash received: ₹${fmt(cash)}`}
                        >
                          {cashPct > 20 && (
                            <span className="text-white text-[10px] font-medium px-1 truncate">₹{fmt(cash)}</span>
                          )}
                        </div>
                        {hasTds && (
                          <div
                            className={`flex items-center justify-center transition-all ${p.tds_certificate_received ? 'bg-blue-400' : 'bg-yellow-400'}`}
                            style={{ width: `${tdsPct}%` }}
                            title={`TDS ${p.tds_certificate_received ? '(cert received)' : '(pending cert)'}: ₹${fmt(tds)}`}
                          >
                            {tdsPct > 10 && (
                              <span className="text-white text-[10px] font-medium px-1 truncate">₹{fmt(tds)}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Legend row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1">
                            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-green-500" />
                            <span className="text-gray-600 dark:text-gray-400">Cash ₹{fmt(cash)}</span>
                          </span>
                          {hasTds && (
                            <span className="flex items-center gap-1">
                              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${p.tds_certificate_received ? 'bg-blue-400' : 'bg-yellow-400'}`} />
                              <span className="text-gray-600 dark:text-gray-400">
                                TDS ₹{fmt(tds)}{p.tds_rate ? ` (${p.tds_rate}%)` : ''}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* TDS cert status */}
                        {hasTds && (
                          p.tds_certificate_received ? (
                            <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                              <CheckCircle className="w-3.5 h-3.5" /> Cert received
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                              <Clock className="w-3.5 h-3.5" /> Cert pending
                            </span>
                          )
                        )}
                      </div>

                      {/* CA-Level TDS Tracking Info */}
                      {hasTds && p.ca_name && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                          <div className="font-medium text-blue-800 dark:text-blue-200 mb-1">CA Submission Details</div>
                          <div className="grid grid-cols-2 gap-2 text-blue-700 dark:text-blue-300">
                            <span>CA: {p.ca_name}</span>
                            {p.ca_firm && <span>Firm: {p.ca_firm}</span>}
                            {p.ca_membership_number && <span>Membership: {p.ca_membership_number}</span>}
                            {p.submitted_to_ca_date && <span>Submitted: {p.submitted_to_ca_date}</span>}
                            {p.ca_acknowledgment_number && <span>Ack: {p.ca_acknowledgment_number}</span>}
                            <span className={`capitalize ${p.ca_submission_status === 'acknowledged' ? 'text-green-600' : p.ca_submission_status === 'returned' ? 'text-red-600' : 'text-yellow-600'}`}>
                              Status: {p.ca_submission_status?.replace('_', ' ')}
                            </span>
                          </div>
                          {p.ca_notes && <div className="mt-1 text-blue-600 dark:text-blue-400 italic">Notes: {p.ca_notes}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pending TDS summary with CA tracking */}
            {pendingTdsPayments.length > 0 && (
              <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-xs text-yellow-800 dark:text-yellow-300">
                <div className="font-medium mb-1">Pending TDS certificates: ₹{fmt(pendingTdsPayments.reduce((s, p) => s + parseFloat(p.tds_amount), 0))} across {pendingTdsPayments.length} payment(s)</div>
                <div className="space-y-1">
                  {pendingTdsPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <span>{p.payment_number} - ₹{fmt(p.tds_amount)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        p.ca_submission_status === 'acknowledged' ? 'bg-green-100 text-green-800' :
                        p.ca_submission_status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                        p.ca_submission_status === 'returned' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {p.ca_submission_status ? p.ca_submission_status.replace('_', ' ') : 'Not submitted to CA'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── New Payment Form ── */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4" /> Record New Payment with TDS Compliance
            </h3>
            <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Gross Payment Amount */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Gross Payment Amount <span className="text-red-500">*</span>
                    <span className="text-gray-400 ml-1">(max ₹{fmt(outstanding)})</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={outstanding}
                    value={form.gross_payment_amount}
                    onChange={e => handleGrossAmountChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Amount customer is paying"
                    required
                  />
                </div>
              </div>

              {/* TDS Section */}
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">TDS (Tax Deducted at Source) Details</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
                      <input
                        type="checkbox"
                        checked={form.tds_applicable}
                        onChange={e => handleTdsApplicableChange(e.target.checked)}
                        className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                      />
                      TDS Applicable to this Payment
                    </label>
                  </div>

                  {form.tds_applicable && (
                    <div>
                      <label className="block text-xs text-orange-700 dark:text-orange-300 mb-1">TDS Section</label>
                      <select
                        value={form.tds_section}
                        onChange={e => handleTdsSectionChange(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-orange-300 dark:border-orange-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500"
                      >
                        <option value="">Select TDS Section</option>
                        {TDS_SECTIONS.map(section => (
                          <option key={section.value} value={section.value}>
                            {section.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {form.tds_applicable && (
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-orange-700 dark:text-orange-300 mb-1">TDS Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={form.tds_rate}
                        onChange={e => handleTdsRateChange(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-orange-300 dark:border-orange-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-red-700 dark:text-red-300 mb-1">TDS Amount</label>
                      <input
                        readOnly
                        value={`₹${fmt(form.tds_amount)}`}
                        className="w-full px-2 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-800 dark:text-red-200 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-green-700 dark:text-green-300 mb-1">Net Amount Received</label>
                      <input
                        readOnly
                        value={`₹${fmt(form.net_amount_received)}`}
                        className="w-full px-2 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded text-green-800 dark:text-green-200 font-medium"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300 mb-1">
                      <input
                        type="checkbox"
                        checked={form.tds_deposited}
                        onChange={e => setForm(p => ({ ...p, tds_deposited: e.target.checked }))}
                        className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                      />
                      TDS Deposited to Government
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300 mb-1">
                      <input
                        type="checkbox"
                        checked={form.tds_certificate_received}
                        onChange={e => setForm(p => ({ ...p, tds_certificate_received: e.target.checked }))}
                        className="rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                      />
                      TDS Certificate (Form 16A) Received
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Method */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                  <select
                    value={form.payment_method}
                    onChange={e => setForm(p => ({ ...p, payment_method: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                {/* Reference */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reference Number</label>
                  <input
                    type="text"
                    value={form.reference_number}
                    onChange={e => setForm(p => ({ ...p, reference_number: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Txn ID / Cheque no."
                  />
                </div>
              </div>

              {/* CA-Level TDS Tracking Section */}
              {form.tds_applicable && parseFloat(form.tds_amount) > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Building className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">CA-Level TDS Compliance Tracking</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">CA Name</label>
                      <input
                        type="text"
                        value={form.ca_name}
                        onChange={e => setForm(p => ({ ...p, ca_name: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                        placeholder="Chartered Accountant Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">CA Firm</label>
                      <input
                        type="text"
                        value={form.ca_firm}
                        onChange={e => setForm(p => ({ ...p, ca_firm: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                        placeholder="CA Firm Name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">CA Membership No.</label>
                      <input
                        type="text"
                        value={form.ca_membership_number}
                        onChange={e => setForm(p => ({ ...p, ca_membership_number: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                        placeholder="ICAI Membership Number"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">Submission Status</label>
                      <select
                        value={form.ca_submission_status}
                        onChange={e => setForm(p => ({ ...p, ca_submission_status: e.target.value as any }))}
                        className="w-full px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="not_submitted">Not Submitted</option>
                        <option value="submitted">Submitted to CA</option>
                        <option value="acknowledged">Acknowledged by CA</option>
                        <option value="returned">Returned by CA</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">Submitted to CA Date</label>
                      <input
                        type="date"
                        value={form.submitted_to_ca_date}
                        onChange={e => setForm(p => ({ ...p, submitted_to_ca_date: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">CA Acknowledgment No.</label>
                      <input
                        type="text"
                        value={form.ca_acknowledgment_number}
                        onChange={e => setForm(p => ({ ...p, ca_acknowledgment_number: e.target.value }))}
                        className="w-full px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                        placeholder="Acknowledgment Number"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs text-blue-700 dark:text-blue-300 mb-1">CA Notes</label>
                    <textarea
                      rows={2}
                      value={form.ca_notes}
                      onChange={e => setForm(p => ({ ...p, ca_notes: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-blue-300 dark:border-blue-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                      placeholder="Notes about CA submission, follow-ups, quarterly filings, etc."
                    />
                  </div>
                  <p className="mt-2 text-xs text-blue-700 dark:text-blue-400">
                    Track TDS certificate submission to your Chartered Accountant for quarterly/annual compliance.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional payment notes"
                />
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
          >
            Close
          </button>
          <button
            type="submit"
            form="payment-form"
            disabled={submitting || !form.gross_payment_amount}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdatePaymentModal;
