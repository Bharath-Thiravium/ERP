import React, { useState } from 'react';
import { X, Calculator } from 'lucide-react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

interface UpdatePaymentModalProps {
  invoice: {
    id: number;
    invoice_number: string;
    total_amount: string;
    outstanding_amount: string;
  };
  onClose: () => void;
  onSuccess: () => void;
  sessionKey: string;
  invoiceType?: 'tax_invoice' | 'proforma_invoice';
}

const UpdatePaymentModal: React.FC<UpdatePaymentModalProps> = ({
  invoice,
  onClose,
  onSuccess,
  sessionKey,
  invoiceType = 'tax_invoice'
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount_received: '',
    tds_percentage: '10',
    tds_amount: '',
    net_amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const calculateTDS = (amount: number, percentage: number) => {
    return (amount * percentage) / 100;
  };

  const handleAmountChange = (amount: string) => {
    const amountNum = parseFloat(amount) || 0;
    const tdsPercentage = parseFloat(formData.tds_percentage) || 0;
    const tdsAmount = calculateTDS(amountNum, tdsPercentage);
    const netAmount = amountNum - tdsAmount;

    setFormData(prev => ({
      ...prev,
      amount_received: amount,
      tds_amount: tdsAmount.toFixed(2),
      net_amount: netAmount.toFixed(2)
    }));
  };

  const handleTDSPercentageChange = (percentage: string) => {
    const percentageNum = parseFloat(percentage) || 0;
    const amount = parseFloat(formData.amount_received) || 0;
    const tdsAmount = calculateTDS(amount, percentageNum);
    const netAmount = amount - tdsAmount;

    setFormData(prev => ({
      ...prev,
      tds_percentage: percentage,
      tds_amount: tdsAmount.toFixed(2),
      net_amount: netAmount.toFixed(2)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use the correct payment creation endpoint based on invoice type
      const paymentData: any = {
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount_received),
        tds_amount: parseFloat(formData.tds_amount) || 0,
        tds_percentage: parseFloat(formData.tds_percentage) || 0,
        net_amount_received: parseFloat(formData.net_amount),
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        notes: formData.notes,
        status: 'completed',
        session_key: sessionKey
      };

      // Set the correct invoice field based on type
      if (invoiceType === 'proforma_invoice') {
        paymentData.proforma_invoice = invoice.id;
      } else {
        paymentData.invoice = invoice.id;
      }

      await api.post('/api/finance/payments/', paymentData);

      toast.success('Payment updated successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Update Payment
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {invoice.invoice_number} • Outstanding: ₹{parseFloat(invoice.outstanding_amount).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Date
            </label>
            <input
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Amount Received */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Amount Received
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amount_received}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter amount received"
              required
            />
          </div>

          {/* TDS Calculation */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <div className="flex items-center mb-2">
              <Calculator className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">TDS Calculation</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-yellow-700 dark:text-yellow-300 mb-1">TDS %</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.tds_percentage}
                  onChange={(e) => handleTDSPercentageChange(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-yellow-300 dark:border-yellow-600 rounded focus:ring-1 focus:ring-yellow-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-yellow-700 dark:text-yellow-300 mb-1">TDS Amount</label>
                <input
                  type="text"
                  value={formData.tds_amount}
                  readOnly
                  className="w-full px-2 py-1 text-sm bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-600 rounded text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="mt-2">
              <label className="block text-xs text-green-700 dark:text-green-300 mb-1">Net Amount Received</label>
              <input
                type="text"
                value={formData.net_amount}
                readOnly
                className="w-full px-2 py-1 text-sm bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded text-gray-900 dark:text-white font-medium"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Method
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
            </select>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reference Number
            </label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Transaction ID, Cheque number, etc."
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Additional notes"
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount_received}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdatePaymentModal;