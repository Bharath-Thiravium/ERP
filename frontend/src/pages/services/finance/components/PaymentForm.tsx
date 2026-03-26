import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, IndianRupee, Info } from 'lucide-react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Invoice {
  id: number;
  invoice_number: string;
  customer_details: { id: number; name: string; customer_code: string };
  total_amount: string;
  outstanding_amount: string;
  payment_status: string;
}

interface ProformaInvoice {
  id: number;
  proforma_number: string;
  customer_details: { id: number; name: string; customer_code: string };
  total_amount: string;
  outstanding_amount: string;
  payment_status: string;
}

interface TdsSection {
  code: string;
  description: string;
  rate: number;
  threshold: number;
}

interface PaymentFormData {
  // Invoice linkage
  invoice_type: 'tax_invoice' | 'proforma_invoice' | '';
  invoice: string;
  proforma_invoice: string;
  // Core payment
  payment_date: string;
  gross_payment_amount: string;   // what customer pays (net + TDS)
  payment_method: string;
  reference_number: string;
  bank_name: string;
  notes: string;
  status: string;
  // TDS
  tds_applicable: boolean;
  tds_section: string;
  tds_rate: string;               // auto-filled from section
  tds_amount: string;             // auto-calculated
  net_amount_received: string;    // auto-calculated
  tds_deposited: boolean;         // has customer deposited TDS to govt?
  tds_certificate_received: boolean;
  form16a_number: string;
}

interface PaymentFormProps {
  payment?: any;
  onClose: () => void;
  onSave: () => void;
  sessionKey: string;
  preSelectedInvoice?: { id: number; number: string; type: 'tax_invoice' | 'proforma_invoice' };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM: PaymentFormData = {
  invoice_type: '',
  invoice: '',
  proforma_invoice: '',
  payment_date: new Date().toISOString().split('T')[0],
  gross_payment_amount: '',
  payment_method: 'bank_transfer',
  reference_number: '',
  bank_name: '',
  notes: '',
  status: 'completed',
  tds_applicable: false,
  tds_section: '',
  tds_rate: '',
  tds_amount: '0.00',
  net_amount_received: '',
  tds_deposited: false,
  tds_certificate_received: false,
  form16a_number: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

const PaymentForm: React.FC<PaymentFormProps> = ({
  payment, onClose, onSave, sessionKey, preSelectedInvoice,
}) => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedProforma, setSelectedProforma] = useState<ProformaInvoice | null>(null);
  const [tdsSections, setTdsSections] = useState<TdsSection[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<PaymentFormData>(EMPTY_FORM);

  // ── Data fetching ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchInvoices();
    fetchProformaInvoices();
    fetchTdsSections();
    if (payment?.id) {
      loadPaymentData();
    }
  }, [payment]);

  useEffect(() => {
    if (!preSelectedInvoice || payment?.id) return;
    setFormData(prev => ({
      ...prev,
      invoice_type: preSelectedInvoice.type,
      invoice: preSelectedInvoice.type === 'tax_invoice' ? preSelectedInvoice.id.toString() : '',
      proforma_invoice: preSelectedInvoice.type === 'proforma_invoice' ? preSelectedInvoice.id.toString() : '',
    }));
  }, [preSelectedInvoice]);

  // When invoice list loads and preSelectedInvoice is set, auto-select it
  useEffect(() => {
    if (!preSelectedInvoice || payment?.id) return;
    if (preSelectedInvoice.type === 'tax_invoice' && invoices.length > 0) {
      const inv = invoices.find(i => i.id === preSelectedInvoice.id);
      if (inv) {
        setSelectedInvoice(inv);
        setFormData(prev => ({ ...prev, gross_payment_amount: inv.outstanding_amount }));
      }
    }
    if (preSelectedInvoice.type === 'proforma_invoice' && proformaInvoices.length > 0) {
      const pf = proformaInvoices.find(p => p.id === preSelectedInvoice.id);
      if (pf) {
        setSelectedProforma(pf);
        setFormData(prev => ({ ...prev, gross_payment_amount: pf.outstanding_amount }));
      }
    }
  }, [invoices, proformaInvoices, preSelectedInvoice]);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/api/finance/invoices/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { payment_status: 'unpaid,partial', page_size: 200 },
      });
      setInvoices(res.data.results || []);
    } catch {
      toast.error('Failed to fetch invoices');
    }
  };

  const fetchProformaInvoices = async () => {
    try {
      const res = await api.get('/api/finance/proforma-invoices/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { payment_status: 'unpaid,partial', page_size: 200 },
      });
      setProformaInvoices(res.data.results || []);
    } catch {
      toast.error('Failed to fetch proforma invoices');
    }
  };

  const fetchTdsSections = async () => {
    try {
      const res = await api.get('/api/finance/tds-sections/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
      });
      const raw = res.data.tds_sections || res.data || {};
      const sections: TdsSection[] = Object.entries(raw).map(([code, info]: [string, any]) => ({
        code,
        description: info.description,
        rate: info.rate,
        threshold: info.threshold,
      }));
      setTdsSections(sections);
    } catch {
      // fallback hardcoded
      setTdsSections([
        { code: '194C', description: 'Payment to Contractors', rate: 1.0, threshold: 30000 },
        { code: '194J', description: 'Professional or Technical Services', rate: 10.0, threshold: 30000 },
        { code: '194I', description: 'Rent', rate: 10.0, threshold: 180000 },
        { code: '194H', description: 'Commission or Brokerage', rate: 5.0, threshold: 15000 },
        { code: '194A', description: 'Interest other than Securities', rate: 10.0, threshold: 5000 },
      ]);
    }
  };

  const loadPaymentData = async () => {
    if (!payment?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/finance/payments/${payment.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
      });
      const d = res.data;
      const grossAmt = d.gross_payment_amount || d.amount || '';
      setFormData({
        invoice_type: d.invoice ? 'tax_invoice' : d.proforma_invoice ? 'proforma_invoice' : '',
        invoice: d.invoice?.toString() || '',
        proforma_invoice: d.proforma_invoice?.toString() || '',
        payment_date: d.payment_date || '',
        gross_payment_amount: grossAmt?.toString() || '',
        payment_method: d.payment_method || 'bank_transfer',
        reference_number: d.reference_number || '',
        bank_name: d.bank_name || '',
        notes: d.notes || '',
        status: d.status || 'completed',
        tds_applicable: d.tds_applicable || false,
        tds_section: d.tds_section || '',
        tds_rate: d.tds_rate?.toString() || '',
        tds_amount: d.tds_amount?.toString() || '0.00',
        net_amount_received: d.net_amount_received?.toString() || '',
        tds_deposited: d.tds_deposited || false,
        tds_certificate_received: d.tds_certificate_received || false,
        form16a_number: d.form16a_number || '',
      });
    } catch {
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  // ── TDS Calculation ──────────────────────────────────────────────────────
  // Gross = net + TDS  →  net = gross - TDS  →  TDS = gross * rate / (100 + rate)
  // (because gross already includes TDS deducted by customer)
  const recalcTds = (gross: string, rate: string) => {
    const g = parseFloat(gross) || 0;
    const r = parseFloat(rate) || 0;
    if (g <= 0 || r <= 0) {
      setFormData(prev => ({ ...prev, tds_amount: '0.00', net_amount_received: gross || '0.00' }));
      return;
    }
    // gross = net_received + tds_amount
    // gross = net_received + (net_received * r/100)
    // gross = net_received * (1 + r/100)
    // net_received = gross / (1 + r/100)
    const net = g / (1 + r / 100);
    const tds = g - net;
    setFormData(prev => ({
      ...prev,
      tds_amount: tds.toFixed(2),
      net_amount_received: net.toFixed(2),
    }));
  };

  // ── Invoice selection handlers ─────────────────────────────────────────────
  const handleInvoiceTypeChange = (type: 'tax_invoice' | 'proforma_invoice' | '') => {
    setSelectedInvoice(null);
    setSelectedProforma(null);
    setFormData(prev => ({ ...prev, invoice_type: type, invoice: '', proforma_invoice: '', gross_payment_amount: '' }));
  };

  const handleInvoiceChange = (id: string) => {
    const inv = invoices.find(i => i.id.toString() === id) || null;
    setSelectedInvoice(inv);
    setFormData(prev => ({
      ...prev,
      invoice: id,
      gross_payment_amount: inv ? inv.outstanding_amount : '',
      net_amount_received: inv ? inv.outstanding_amount : '',
      tds_amount: '0.00',
    }));
  };

  const handleProformaChange = (id: string) => {
    const pf = proformaInvoices.find(p => p.id.toString() === id) || null;
    setSelectedProforma(pf);
    setFormData(prev => ({
      ...prev,
      proforma_invoice: id,
      gross_payment_amount: pf ? pf.outstanding_amount : '',
      net_amount_received: pf ? pf.outstanding_amount : '',
      tds_amount: '0.00',
    }));
  };

  // ── TDS toggle ─────────────────────────────────────────────────────────────
  const handleTdsToggle = (checked: boolean) => {
    if (!checked) {
      setFormData(prev => ({
        ...prev,
        tds_applicable: false,
        tds_section: '',
        tds_rate: '',
        tds_amount: '0.00',
        net_amount_received: prev.gross_payment_amount,
      }));
    } else {
      setFormData(prev => ({ ...prev, tds_applicable: true }));
    }
  };

  const handleSectionChange = (code: string) => {
    const section = tdsSections.find(s => s.code === code);
    const rate = section ? section.rate.toString() : '';
    setFormData(prev => ({ ...prev, tds_section: code, tds_rate: rate }));
    recalcTds(formData.gross_payment_amount, rate);
  };

  const handleGrossAmountChange = (val: string) => {
    setFormData(prev => ({ ...prev, gross_payment_amount: val }));
    if (formData.tds_applicable && formData.tds_rate) {
      recalcTds(val, formData.tds_rate);
    } else {
      setFormData(prev => ({ ...prev, net_amount_received: val, tds_amount: '0.00' }));
    }
    if (errors.gross_payment_amount) setErrors(prev => ({ ...prev, gross_payment_amount: '' }));
  };

  const handleRateChange = (val: string) => {
    setFormData(prev => ({ ...prev, tds_rate: val }));
    recalcTds(formData.gross_payment_amount, val);
  };

  const handleFieldChange = (field: keyof PaymentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as string]) setErrors(prev => ({ ...prev, [field as string]: '' }));
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const gross = parseFloat(formData.gross_payment_amount) || 0;
    const outstanding = parseFloat(
      selectedInvoice?.outstanding_amount || selectedProforma?.outstanding_amount || '0'
    );

    if (!payment?.id) {
      if (!formData.invoice_type) e.invoice_type = 'Select invoice type';
      if (formData.invoice_type === 'tax_invoice' && !formData.invoice) e.invoice = 'Select a tax invoice';
      if (formData.invoice_type === 'proforma_invoice' && !formData.proforma_invoice) e.proforma_invoice = 'Select a proforma invoice';
    }

    if (!formData.payment_date) e.payment_date = 'Payment date is required';
    if (gross <= 0) e.gross_payment_amount = 'Enter a valid amount';
    if (!payment?.id && outstanding > 0 && gross > outstanding + 1)
      e.gross_payment_amount = `Amount cannot exceed outstanding ₹${outstanding.toLocaleString('en-IN')}`;
    if (!formData.payment_method) e.payment_method = 'Select payment method';
    if (['bank_transfer', 'upi', 'cheque'].includes(formData.payment_method) && !formData.reference_number)
      e.reference_number = 'Reference number is required';
    if (['bank_transfer', 'cheque'].includes(formData.payment_method) && !formData.bank_name)
      e.bank_name = 'Bank name is required';
    if (formData.tds_applicable && !formData.tds_section) e.tds_section = 'Select TDS section';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) { toast.error('Please fix the errors before submitting'); return; }

    setLoading(true);
    try {
      const gross = parseFloat(formData.gross_payment_amount) || 0;
      const tdsAmt = parseFloat(formData.tds_amount) || 0;
      const net = parseFloat(formData.net_amount_received) || gross;

      const payload: Record<string, any> = {
        payment_date: formData.payment_date,
        amount: gross,                          // backend `amount` = gross
        gross_payment_amount: gross,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        bank_name: formData.bank_name,
        notes: formData.notes,
        status: formData.status,
        // TDS
        tds_applicable: formData.tds_applicable,
        tds_section: formData.tds_section,
        tds_rate: parseFloat(formData.tds_rate) || 0,
        tds_amount: tdsAmt,
        net_amount_received: net,
        tds_deposited: formData.tds_deposited,
        tds_certificate_received: formData.tds_certificate_received,
        form16a_number: formData.form16a_number,
        // CA fields (blank defaults)
        ca_name: '',
        ca_firm: '',
        ca_membership_number: '',
        ca_acknowledgment_number: '',
        ca_notes: '',
        ca_submission_status: 'not_submitted',
      };

      if (!payment?.id) {
        if (formData.invoice_type === 'tax_invoice') {
          payload.invoice = parseInt(formData.invoice);
        } else {
          payload.proforma_invoice = parseInt(formData.proforma_invoice);
        }
      }

      const url = payment?.id ? `/api/finance/payments/${payment.id}/` : '/api/finance/payments/';
      const method = payment?.id ? 'put' : 'post';

      await api[method](url, payload, { headers: { Authorization: `Bearer ${sessionKey}` } });
      toast.success(payment?.id ? 'Payment updated!' : 'Payment recorded!');
      onSave();
    } catch (err: any) {
      const data = err.response?.data;
      if (data && typeof data === 'object') {
        const fieldErrors: Record<string, string> = {};
        Object.keys(data).forEach(k => {
          fieldErrors[k] = Array.isArray(data[k]) ? data[k][0] : data[k];
        });
        setErrors(fieldErrors);
        toast.error('Please fix the errors below');
      } else {
        toast.error('Failed to record payment');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && payment?.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 flex items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-athenas-blue" />
          <span className="text-gray-600 dark:text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  const outstanding = parseFloat(
    selectedInvoice?.outstanding_amount || selectedProforma?.outstanding_amount || '0'
  );
  const gross = parseFloat(formData.gross_payment_amount) || 0;
  const selectedSection = tdsSections.find(s => s.code === formData.tds_section);
  const isPartPayment = outstanding > 0 && gross > 0 && gross < outstanding;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-athenas-blue" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {payment?.id ? 'Edit Payment' : preSelectedInvoice ? `Record Payment — ${preSelectedInvoice.number}` : 'Record Payment'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* ── Section 1: Invoice linkage ── */}
            {!payment?.id && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Invoice</h3>
                {preSelectedInvoice ? (
                  <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm font-medium text-blue-800 dark:text-blue-200">
                    {preSelectedInvoice.type === 'tax_invoice' ? 'Tax Invoice' : 'Proforma Invoice'} — {preSelectedInvoice.number}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice Type *</label>
                      <select
                        value={formData.invoice_type}
                        onChange={e => handleInvoiceTypeChange(e.target.value as any)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">Select type</option>
                        <option value="tax_invoice">Tax Invoice</option>
                        <option value="proforma_invoice">Proforma Invoice</option>
                      </select>
                      {errors.invoice_type && <p className="text-red-500 text-xs mt-1">{errors.invoice_type}</p>}
                    </div>
                    <div>
                      {formData.invoice_type === 'tax_invoice' && (
                        <>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Invoice *</label>
                          <select
                            value={formData.invoice}
                            onChange={e => handleInvoiceChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="">Select invoice</option>
                            {invoices.map(inv => (
                              <option key={inv.id} value={inv.id}>
                                {inv.invoice_number} — {inv.customer_details.name} (₹{parseFloat(inv.outstanding_amount).toLocaleString('en-IN')})
                              </option>
                            ))}
                          </select>
                          {errors.invoice && <p className="text-red-500 text-xs mt-1">{errors.invoice}</p>}
                        </>
                      )}
                      {formData.invoice_type === 'proforma_invoice' && (
                        <>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Proforma Invoice *</label>
                          <select
                            value={formData.proforma_invoice}
                            onChange={e => handleProformaChange(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="">Select invoice</option>
                            {proformaInvoices.map(pf => (
                              <option key={pf.id} value={pf.id}>
                                {pf.proforma_number} — {pf.customer_details.name} (₹{parseFloat(pf.outstanding_amount).toLocaleString('en-IN')})
                              </option>
                            ))}
                          </select>
                          {errors.proforma_invoice && <p className="text-red-500 text-xs mt-1">{errors.proforma_invoice}</p>}
                        </>
                      )}
                    </div>
                  </div>
                )}
                {outstanding > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Outstanding: <span className="font-semibold text-gray-800 dark:text-gray-200">₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </span>
                    {isPartPayment && (
                      <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">Part Payment</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Section 2: Payment details ── */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Payment Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={e => handleFieldChange('payment_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  {errors.payment_date && <p className="text-red-500 text-xs mt-1">{errors.payment_date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount Received (Gross) *
                    <span className="ml-1 text-xs text-gray-400 font-normal">incl. TDS</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={formData.gross_payment_amount}
                      onChange={e => handleGrossAmountChange(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  {errors.gross_payment_amount && <p className="text-red-500 text-xs mt-1">{errors.gross_payment_amount}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method *</label>
                  <select
                    value={formData.payment_method}
                    onChange={e => handleFieldChange('payment_method', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  >
                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  {errors.payment_method && <p className="text-red-500 text-xs mt-1">{errors.payment_method}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Reference No {['bank_transfer','upi','cheque'].includes(formData.payment_method) && '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={e => handleFieldChange('reference_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    placeholder="UTR / Cheque no."
                  />
                  {errors.reference_number && <p className="text-red-500 text-xs mt-1">{errors.reference_number}</p>}
                </div>

                {['bank_transfer','cheque'].includes(formData.payment_method) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={e => handleFieldChange('bank_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      placeholder="e.g. HDFC Bank"
                    />
                    {errors.bank_name && <p className="text-red-500 text-xs mt-1">{errors.bank_name}</p>}
                  </div>
                )}

                <div className={['bank_transfer','cheque'].includes(formData.payment_method) ? '' : 'col-span-2'}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => handleFieldChange('notes', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm resize-none"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>

            {/* ── Section 3: TDS ── */}
            <div className="border border-amber-200 dark:border-amber-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/20">
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">TDS (Tax Deducted at Source)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-amber-700 dark:text-amber-300">Applicable</span>
                  <div
                    onClick={() => handleTdsToggle(!formData.tds_applicable)}
                    className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                      formData.tds_applicable ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      formData.tds_applicable ? 'translate-x-5' : ''
                    }`} />
                  </div>
                </label>
              </div>

              {formData.tds_applicable && (
                <div className="px-4 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TDS Section *</label>
                      <select
                        value={formData.tds_section}
                        onChange={e => handleSectionChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      >
                        <option value="">Select section</option>
                        {tdsSections.map(s => (
                          <option key={s.code} value={s.code}>{s.code} — {s.description}</option>
                        ))}
                      </select>
                      {errors.tds_section && <p className="text-red-500 text-xs mt-1">{errors.tds_section}</p>}
                      {selectedSection && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Threshold: ₹{selectedSection.threshold.toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TDS Rate (%)</label>
                      <input
                        type="number" step="0.01" min="0"
                        value={formData.tds_rate}
                        onChange={e => handleRateChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        placeholder="Auto-filled from section"
                      />
                    </div>
                  </div>

                  {gross > 0 && (
                    <div className="grid grid-cols-3 gap-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg p-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Gross Amount</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">₹{gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">TDS Deducted</p>
                        <p className="text-sm font-semibold text-red-600">₹{parseFloat(formData.tds_amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Net Received</p>
                        <p className="text-sm font-semibold text-green-600">₹{parseFloat(formData.net_amount_received || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tds_deposited}
                        onChange={e => handleFieldChange('tds_deposited', e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">TDS Deposited by Customer</span>
                        <p className="text-xs text-gray-400">Customer has deposited TDS to government (can update later)</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.tds_certificate_received}
                        onChange={e => handleFieldChange('tds_certificate_received', e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Form 16A Received</span>
                        <p className="text-xs text-gray-400">TDS certificate (Form 16A) received from customer</p>
                      </div>
                    </label>
                  </div>

                  {formData.tds_certificate_received && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Form 16A Number</label>
                      <input
                        type="text"
                        value={formData.form16a_number}
                        onChange={e => handleFieldChange('form16a_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                        placeholder="Enter Form 16A certificate number"
                      />
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 rounded p-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>TDS is back-calculated from gross: Net = Gross ÷ (1 + Rate%). You can update deposit status once you verify the customer acknowledgment.</span>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm bg-gradient-to-r from-athenas-blue to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Saving...</>
                : <><Save className="w-4 h-4" />{payment?.id ? 'Update Payment' : 'Record Payment'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
