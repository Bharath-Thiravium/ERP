import React, { useState, useEffect } from 'react';
import { X, IndianRupee, AlertCircle } from 'lucide-react';
import api from '../../../../lib/api';
import toast from 'react-hot-toast';

interface DirectPaymentModalProps {
  onClose: () => void;
  onSuccess: () => void;
  customerId?: number;
  customerName?: string;
  sessionKey: string;
}

const DirectPaymentModal: React.FC<DirectPaymentModalProps> = ({
  onClose,
  onSuccess,
  customerId: preSelectedCustomerId,
  customerName: preSelectedCustomerName,
  sessionKey,
}) => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(preSelectedCustomerId || null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>(preSelectedCustomerName || '');
  const [formData, setFormData] = useState({
    payment_purpose: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    transaction_id: '',
    bank_name: '',
    tds_applicable: false,
    tds_rate: '0',
    tds_amount: '0',
    net_amount_received: '',
    tds_section: '',
    notes: '',
  });

  // Fetch customers if not pre-selected
  useEffect(() => {
    if (!preSelectedCustomerId) {
      fetchCustomers();
    }
  }, [preSelectedCustomerId]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await api.get('/api/finance/customers/', {
        params: { session_key: sessionKey, page_size: 1000 },
      });
      setCustomers(response.data.results || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Auto-calculate TDS
  useEffect(() => {
    if (formData.amount && formData.tds_applicable && formData.tds_rate) {
      const amount = parseFloat(formData.amount) || 0;
      const tdsRate = parseFloat(formData.tds_rate) || 0;
      const tdsAmount = (amount * tdsRate) / 100;
      const netAmount = amount - tdsAmount;

      setFormData((prev) => ({
        ...prev,
        tds_amount: tdsAmount.toFixed(2),
        net_amount_received: netAmount.toFixed(2),
      }));
    } else if (formData.amount) {
      setFormData((prev) => ({
        ...prev,
        tds_amount: '0',
        net_amount_received: formData.amount,
      }));
    }
  }, [formData.amount, formData.tds_applicable, formData.tds_rate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        '/api/finance/direct-payments/create/',
        {
          ...formData,
          customer_id: selectedCustomerId,
        },
        {
          headers: {
            Authorization: `Bearer ${sessionKey}`,
          },
        }
      );

      toast.success(`Direct payment ${response.data.payment_number} created successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating direct payment:', error);
      toast.error(error.response?.data?.error || 'Failed to create direct payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const customerId = parseInt(e.target.value);
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomerId(customerId);
    setSelectedCustomerName(customer ? customer.name : '');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <IndianRupee className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Direct Customer Payment
              </h2>
              {selectedCustomerName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customer: {selectedCustomerName}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="mx-6 mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Direct Payment:</strong> Record payments without an invoice - for memos, penalties,
            incentives, complimentary, or other purposes.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Selection (if not pre-selected) */}
            {!preSelectedCustomerId && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer *
                </label>
                {loadingCustomers ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <select
                    value={selectedCustomerId || ''}
                    onChange={handleCustomerChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.customer_code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Payment Purpose */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Purpose *
              </label>
              <input
                type="text"
                value={formData.payment_purpose}
                onChange={(e) => setFormData({ ...formData, payment_purpose: e.target.value })}
                placeholder="e.g., Penalty, Incentive, Memo, Complimentary"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Date *
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Method *
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="upi">UPI</option>
                <option value="rtgs">RTGS</option>
                <option value="neft">NEFT</option>
                <option value="imps">IMPS</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Reference Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Transaction reference"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Transaction ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Transaction ID
              </label>
              <input
                type="text"
                value={formData.transaction_id}
                onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                placeholder="Bank transaction ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Bank Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                placeholder="Bank name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* TDS Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="tds_applicable"
                checked={formData.tds_applicable}
                onChange={(e) => setFormData({ ...formData, tds_applicable: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="tds_applicable" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                TDS Applicable
              </label>
            </div>

            {formData.tds_applicable && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    TDS Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.tds_rate}
                    onChange={(e) => setFormData({ ...formData, tds_rate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    TDS Amount
                  </label>
                  <input
                    type="text"
                    value={formData.tds_amount}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Net Amount Received
                  </label>
                  <input
                    type="text"
                    value={formData.net_amount_received}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    TDS Section
                  </label>
                  <input
                    type="text"
                    value={formData.tds_section}
                    onChange={(e) => setFormData({ ...formData, tds_section: e.target.value })}
                    placeholder="e.g., 194C, 194J"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <IndianRupee className="w-4 h-4" />
                  Create Direct Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DirectPaymentModal;
