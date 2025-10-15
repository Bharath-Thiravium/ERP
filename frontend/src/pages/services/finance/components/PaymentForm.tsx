import React, { useState, useEffect } from 'react';
import { X, Save, CreditCard, DollarSign } from 'lucide-react';

import api from '../../../../lib/api';
import toast from 'react-hot-toast';

interface Invoice {
  id: number;
  invoice_number: string;
  customer_details: {
    id: number;
    name: string;
    customer_code: string;
  };
  total_amount: string;
  outstanding_amount: string;
  payment_status: string;
}

interface ProformaInvoice {
  id: number;
  proforma_number: string;
  customer_details: {
    id: number;
    name: string;
    customer_code: string;
  };
  total_amount: string;
  outstanding_amount: string;
  payment_status: string;
}

interface PaymentFormData {
  invoice_type?: 'tax_invoice' | 'proforma_invoice' | '';
  invoice?: string | number;
  proforma_invoice?: string | number;
  payment_date: string;
  amount: string;
  payment_method: string;
  reference_number: string;
  bank_name: string;
  notes: string;
  status: string;
  // World-Class TDS Fields
  tds_amount: string;
  tds_percentage: string;
  tds_section: string;
  net_amount_received: string;
  tds_certificate_number: string;
  tds_certificate_date: string;
  is_tds_received: boolean;
}

interface PaymentFormProps {
  payment?: any;
  onClose: () => void;
  onSave: () => void;
  sessionKey: string;
  preSelectedInvoice?: { id: number; number: string; type: 'tax_invoice' | 'proforma_invoice' };
}

const PaymentForm: React.FC<PaymentFormProps> = ({ payment, onClose, onSave, sessionKey, preSelectedInvoice }) => {

  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedProformaInvoice, setSelectedProformaInvoice] = useState<ProformaInvoice | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<PaymentFormData>({
    invoice_type: '',
    invoice: '',
    proforma_invoice: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    bank_name: '',
    notes: '',
    status: 'completed',
    // World-Class TDS Fields
    tds_amount: '',
    tds_percentage: '',
    tds_section: '',
    net_amount_received: '',
    tds_certificate_number: '',
    tds_certificate_date: '',
    is_tds_received: false,
  });

  const paymentMethods = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' },
  ];

  const tdsOptions = [
    { value: '', label: 'No TDS' },
    { value: '194C', label: '194C - Payments to contractors' },
    { value: '194J', label: '194J - Professional/technical services' },
    { value: '194I', label: '194I - Rent payments' },
    { value: '194H', label: '194H - Commission/brokerage' },
    { value: '194', label: '194 - Other payments' },
  ];

  // World-Class TDS Calculation
  const calculateTDS = (amount: string, percentage: string) => {
    const amt = parseFloat(amount) || 0;
    const pct = parseFloat(percentage) || 0;
    const tdsAmount = (amt * pct) / 100;
    const netAmount = amt - tdsAmount;

    setFormData(prev => ({
      ...prev,
      tds_amount: tdsAmount.toFixed(2),
      net_amount_received: netAmount.toFixed(2)
    }));
  };

  useEffect(() => {
    fetchInvoices();
    fetchProformaInvoices();
    if (payment?.id) {
      loadPaymentData();
    }
    // Handle pre-selected invoice from URL parameters
    if (preSelectedInvoice && !payment?.id) {
      setFormData(prev => ({
        ...prev,
        invoice_type: preSelectedInvoice.type,
        [preSelectedInvoice.type === 'tax_invoice' ? 'invoice' : 'proforma_invoice']: preSelectedInvoice.id.toString()
      }));
      
      // Auto-select the invoice and load its data
      if (preSelectedInvoice.type === 'tax_invoice') {
        setTimeout(() => {
          const invoice = invoices.find(inv => inv.id === preSelectedInvoice.id);
          if (invoice) {
            handleInvoiceChange(preSelectedInvoice.id.toString());
          }
        }, 500);
      } else {
        setTimeout(() => {
          const proforma = proformaInvoices.find(pf => pf.id === preSelectedInvoice.id);
          if (proforma) {
            handleProformaInvoiceChange(preSelectedInvoice.id.toString());
          }
        }, 500);
      }
    }
  }, [payment, preSelectedInvoice]);

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/api/finance/invoices/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { payment_status: 'unpaid,partial', page_size: 100 }
      });
      setInvoices(response.data.results || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to fetch invoices');
    }
  };

  const fetchProformaInvoices = async () => {
    try {
      const response = await api.get('/api/finance/proforma-invoices/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { payment_status: 'unpaid,partial', page_size: 100 }
      });
      setProformaInvoices(response.data.results || []);
    } catch (error) {
      console.error('Error fetching proforma invoices:', error);
      toast.error('Failed to fetch proforma invoices');
    }
  };

  const loadPaymentData = async () => {
    if (!payment?.id) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/api/finance/payments/${payment.id}/`, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      });
      
      const paymentData = response.data;
      setFormData({
        invoice_type: paymentData.invoice ? 'tax_invoice' : paymentData.proforma_invoice ? 'proforma_invoice' : '',
        invoice: paymentData.invoice?.toString() || '',
        proforma_invoice: paymentData.proforma_invoice?.toString() || '',
        payment_date: paymentData.payment_date || '',
        amount: paymentData.amount?.toString() || '',
        payment_method: paymentData.payment_method || 'cash',
        reference_number: paymentData.reference_number || '',
        bank_name: paymentData.bank_name || '',
        notes: paymentData.notes || '',
        status: paymentData.status || 'completed',
        // World-Class TDS Fields
        tds_amount: paymentData.tds_amount?.toString() || '',
        tds_percentage: paymentData.tds_percentage?.toString() || '',
        tds_section: paymentData.tds_section || '',
        net_amount_received: paymentData.net_amount_received?.toString() || '',
        tds_certificate_number: paymentData.tds_certificate_number || '',
        tds_certificate_date: paymentData.tds_certificate_date || '',
        is_tds_received: paymentData.is_tds_received || false,
      });
    } catch (error) {
      console.error('Error loading payment:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceTypeChange = (type: 'tax_invoice' | 'proforma_invoice' | '') => {
    setFormData(prev => ({
      ...prev,
      invoice_type: type,
      invoice: '',
      proforma_invoice: '',
      amount: ''
    }));
    setSelectedInvoice(null);
    setSelectedProformaInvoice(null);
  };

  const handleInvoiceChange = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id.toString() === invoiceId);
    setSelectedInvoice(invoice || null);
    setFormData(prev => ({
      ...prev,
      invoice: invoiceId,
      amount: invoice ? invoice.outstanding_amount : ''
    }));
  };

  const handleProformaInvoiceChange = (proformaId: string) => {
    const proforma = proformaInvoices.find(pf => pf.id.toString() === proformaId);
    setSelectedProformaInvoice(proforma || null);
    setFormData(prev => ({
      ...prev,
      proforma_invoice: proformaId,
      amount: proforma ? proforma.outstanding_amount : ''
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.invoice_type) {
      newErrors.invoice_type = 'Please select invoice type';
    }

    if (formData.invoice_type === 'tax_invoice' && !formData.invoice) {
      newErrors.invoice = 'Please select a tax invoice';
    }

    if (formData.invoice_type === 'proforma_invoice' && !formData.proforma_invoice) {
      newErrors.proforma_invoice = 'Please select a proforma invoice';
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    }

    // Check outstanding amount based on invoice type
    if (formData.invoice_type === 'tax_invoice' && selectedInvoice && parseFloat(formData.amount) > parseFloat(selectedInvoice.outstanding_amount)) {
      newErrors.amount = 'Amount cannot exceed outstanding amount';
    }

    if (formData.invoice_type === 'proforma_invoice' && selectedProformaInvoice && parseFloat(formData.amount) > parseFloat(selectedProformaInvoice.outstanding_amount)) {
      newErrors.amount = 'Amount cannot exceed outstanding amount';
    }

    if (!formData.payment_method) {
      newErrors.payment_method = 'Please select a payment method';
    }

    if (['bank_transfer', 'upi', 'cheque'].includes(formData.payment_method) && !formData.reference_number) {
      newErrors.reference_number = 'Reference number is required for this payment method';
    }

    if (['bank_transfer', 'cheque'].includes(formData.payment_method) && !formData.bank_name) {
      newErrors.bank_name = 'Bank name is required for this payment method';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);
    // Clean form data - only send the relevant invoice field
    const cleanFormData: any = { ...formData };
    
    try {
      const url = payment?.id 
        ? `/api/finance/payments/${payment.id}/`
        : '/api/finance/payments/';
      
      const method = payment?.id ? 'put' : 'post';
      
      // Remove invoice_type field as it's not needed by backend
      delete cleanFormData.invoice_type;
      
      // Only send the relevant invoice field based on invoice type
      if (formData.invoice_type === 'tax_invoice') {
        // For tax invoice payments, remove proforma_invoice field completely
        delete cleanFormData.proforma_invoice;
        // Ensure invoice is a number, not string, and not empty
        if (cleanFormData.invoice && cleanFormData.invoice !== '' && cleanFormData.invoice !== '0') {
          cleanFormData.invoice = parseInt(cleanFormData.invoice.toString());
        } else {
          // If no valid invoice ID, this is an error
          toast.error('Please select a valid tax invoice');
          setLoading(false);
          return;
        }
      } else if (formData.invoice_type === 'proforma_invoice') {
        // For proforma invoice payments, remove invoice field completely
        delete cleanFormData.invoice;
        // Ensure proforma_invoice is a number, not string, and not empty
        if (cleanFormData.proforma_invoice && cleanFormData.proforma_invoice !== '' && cleanFormData.proforma_invoice !== '0') {
          cleanFormData.proforma_invoice = parseInt(cleanFormData.proforma_invoice.toString());
        } else {
          // If no valid proforma invoice ID, this is an error
          toast.error('Please select a valid proforma invoice');
          setLoading(false);
          return;
        }
      } else {
        // If no invoice type selected, this is an error
        toast.error('Please select an invoice type');
        setLoading(false);
        return;
      }
      
      console.log('Form data before cleaning:', formData);
      console.log('Sending payment data:', cleanFormData);
      console.log('Invoice type:', formData.invoice_type);
      console.log('Invoice ID:', formData.invoice);
      console.log('Proforma Invoice ID:', formData.proforma_invoice);
      
      await api[method](url, cleanFormData, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      });

      toast.success(payment?.id ? 'Payment updated successfully!' : 'Payment recorded successfully!');
      onSave();
    } catch (error: any) {
      console.error('Error saving payment:', error);
      console.error('Request data was:', cleanFormData);
      if (error.response?.data) {
        const errorData = error.response.data;
        if (typeof errorData === 'object') {
          const newErrors: Record<string, string> = {};
          Object.keys(errorData).forEach(key => {
            if (Array.isArray(errorData[key])) {
              newErrors[key] = errorData[key][0];
            } else {
              newErrors[key] = errorData[key];
            }
          });
          setErrors(newErrors);
        }
      }
      toast.error('Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Trigger TDS calculation when amount changes
    if (field === 'amount' && formData.tds_percentage) {
      calculateTDS(value as string, formData.tds_percentage);
    }
  };

  if (loading && payment?.id) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-athenas-blue"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-300">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {payment?.id ? 'Edit Payment' : preSelectedInvoice ? `Record Payment - ${preSelectedInvoice.number}` : 'Record Payment'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Payment Information */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <CreditCard className="w-5 h-5 text-athenas-blue mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Invoice Type Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Invoice Type *
                  </label>
                  {preSelectedInvoice ? (
                    <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        {preSelectedInvoice.type === 'tax_invoice' ? 'Tax Invoice' : 'Proforma Invoice'} - {preSelectedInvoice.number}
                      </span>
                    </div>
                  ) : (
                    <select
                      value={formData.invoice_type}
                      onChange={(e) => handleInvoiceTypeChange(e.target.value as 'tax_invoice' | 'proforma_invoice' | '')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={!!payment?.id}
                    >
                      <option value="">Select Invoice Type</option>
                      <option value="tax_invoice">Tax Invoice</option>
                      <option value="proforma_invoice">Proforma Invoice</option>
                    </select>
                  )}
                  {errors.invoice_type && (
                    <p className="text-red-500 text-sm mt-1">{errors.invoice_type}</p>
                  )}
                </div>

                {/* Tax Invoice Selection */}
                {formData.invoice_type === 'tax_invoice' && !preSelectedInvoice && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tax Invoice *
                    </label>
                    <select
                      value={formData.invoice}
                      onChange={(e) => handleInvoiceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={!!payment?.id}
                    >
                      <option value="">Select Tax Invoice</option>
                      {invoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>
                          {invoice.invoice_number} - {invoice.customer_details.name} (Outstanding: ₹{parseFloat(invoice.outstanding_amount).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    {errors.invoice && (
                      <p className="text-red-500 text-sm mt-1">{errors.invoice}</p>
                    )}
                  </div>
                )}

                {/* Proforma Invoice Selection */}
                {formData.invoice_type === 'proforma_invoice' && !preSelectedInvoice && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Proforma Invoice *
                    </label>
                    <select
                      value={formData.proforma_invoice}
                      onChange={(e) => handleProformaInvoiceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={!!payment?.id}
                    >
                      <option value="">Select Proforma Invoice</option>
                      {proformaInvoices.map((proforma) => (
                        <option key={proforma.id} value={proforma.id}>
                          {proforma.proforma_number} - {proforma.customer_details.name} (Outstanding: ₹{parseFloat(proforma.outstanding_amount).toLocaleString()})
                        </option>
                      ))}
                    </select>
                    {errors.proforma_invoice && (
                      <p className="text-red-500 text-sm mt-1">{errors.proforma_invoice}</p>
                    )}
                  </div>
                )}

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => handleInputChange('payment_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  {errors.payment_date && (
                    <p className="text-red-500 text-sm mt-1">{errors.payment_date}</p>
                  )}
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                  {errors.amount && (
                    <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                  )}
                  {selectedInvoice && formData.invoice_type === 'tax_invoice' && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Outstanding: ₹{parseFloat(selectedInvoice.outstanding_amount).toLocaleString()}
                    </p>
                  )}
                  {selectedProformaInvoice && formData.invoice_type === 'proforma_invoice' && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Outstanding: ₹{parseFloat(selectedProformaInvoice.outstanding_amount).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method *
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => handleInputChange('payment_method', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                  {errors.payment_method && (
                    <p className="text-red-500 text-sm mt-1">{errors.payment_method}</p>
                  )}
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reference Number {['bank_transfer', 'upi', 'cheque'].includes(formData.payment_method) && '*'}
                  </label>
                  <input
                    type="text"
                    value={formData.reference_number}
                    onChange={(e) => handleInputChange('reference_number', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter reference number"
                  />
                  {errors.reference_number && (
                    <p className="text-red-500 text-sm mt-1">{errors.reference_number}</p>
                  )}
                </div>

                {/* Bank Name */}
                {['bank_transfer', 'cheque'].includes(formData.payment_method) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={formData.bank_name}
                      onChange={(e) => handleInputChange('bank_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="Enter bank name"
                    />
                    {errors.bank_name && (
                      <p className="text-red-500 text-sm mt-1">{errors.bank_name}</p>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-athenas-blue focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter any additional notes"
                  />
                </div>
              </div>
            </div>

            {/* World-Class TDS Section */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center mb-4">
                <DollarSign className="w-5 h-5 text-yellow-600 mr-2" />
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">TDS (Tax Deducted at Source)</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TDS Section */}
                <div>
                  <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                    TDS Section
                  </label>
                  <select
                    value={formData.tds_section}
                    onChange={(e) => handleInputChange('tds_section', e.target.value)}
                    className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {tdsOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TDS Percentage */}
                <div>
                  <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                    TDS Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tds_percentage}
                    onChange={(e) => {
                      handleInputChange('tds_percentage', e.target.value);
                      calculateTDS(formData.amount, e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                {/* TDS Amount */}
                <div>
                  <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                    TDS Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tds_amount}
                    onChange={(e) => {
                      handleInputChange('tds_amount', e.target.value);
                      const netAmount = (parseFloat(formData.amount) || 0) - (parseFloat(e.target.value) || 0);
                      setFormData(prev => ({ ...prev, net_amount_received: netAmount.toFixed(2) }));
                    }}
                    className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                {/* Net Amount Received */}
                <div>
                  <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                    Net Amount Received (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.net_amount_received}
                    readOnly
                    className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 text-gray-900 dark:text-white cursor-not-allowed"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    Calculated automatically (Amount - TDS)
                  </p>
                </div>

                {/* TDS Certificate Details */}
                <div>
                  <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                    TDS Certificate Number
                  </label>
                  <input
                    type="text"
                    value={formData.tds_certificate_number}
                    onChange={(e) => handleInputChange('tds_certificate_number', e.target.value)}
                    className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    placeholder="Enter certificate number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                    TDS Certificate Date
                  </label>
                  <input
                    type="date"
                    value={formData.tds_certificate_date}
                    onChange={(e) => handleInputChange('tds_certificate_date', e.target.value)}
                    className="w-full px-3 py-2 border border-yellow-300 dark:border-yellow-600 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* TDS Received Status */}
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_tds_received}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_tds_received: e.target.checked }))}
                      className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="ml-2 text-sm font-medium text-yellow-700 dark:text-yellow-300">
                      TDS Certificate/Refund Received
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-athenas-blue to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {payment?.id ? 'Update Payment' : 'Record Payment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentForm;
