import React, { useState } from 'react';
import { X, Mail, Send } from 'lucide-react';
import { apiClient } from '../../../../lib/api';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import toast from 'react-hot-toast';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: number;
  invoiceNumber: string;
  invoiceType: 'tax_invoice' | 'proforma_invoice' | 'quotation' | 'purchase_order';
  customerEmail?: string;
  onSuccess?: () => void;
}

const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  invoiceId,
  invoiceNumber,
  invoiceType,
  customerEmail = '',
  onSuccess
}) => {
  const { sessionKey } = useServiceUserStore();
  const [email, setEmail] = useState(customerEmail);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error('Please enter recipient email');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!sessionKey) {
      toast.error('Session expired. Please refresh the page.');
      return;
    }

    setLoading(true);
    try {
      console.log('🔍 DEBUG: Sending email with:', {
        invoiceId,
        invoiceType,
        email: email.trim(),
        sessionKey: sessionKey?.substring(0, 10) + '...'
      });

      const payload = {
        email: email.trim(),
        message: message.trim(),
        session_key: sessionKey
      };

      let response;
      if (invoiceType === 'tax_invoice') {
        response = await apiClient.sendInvoiceEmail(invoiceId, payload);
      } else if (invoiceType === 'proforma_invoice') {
        response = await apiClient.sendProformaEmail(invoiceId, payload);
      } else if (invoiceType === 'quotation') {
        response = await apiClient.sendQuotationEmail(invoiceId, payload);
      } else if (invoiceType === 'purchase_order') {
        response = await apiClient.sendPurchaseOrderEmail(invoiceId, payload);
      }

      console.log('✅ Email API Response:', response?.data);
      toast.success(response?.data?.message || 'Email sent successfully!');
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('❌ Error sending email:', error);
      console.error('❌ Error response:', error.response?.data);
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Send {invoiceType === 'tax_invoice' ? 'Invoice' : invoiceType === 'proforma_invoice' ? 'Proforma Invoice' : invoiceType === 'quotation' ? 'Quotation' : 'Purchase Order'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Send {invoiceNumber} via email with PDF attachment
            </p>
          </div>

          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Recipient Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="customer@example.com"
              required
            />
          </div>

          {/* Message Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Add any additional message for the customer..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={loading || !email.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{loading ? 'Sending...' : 'Send Email'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SendEmailModal;