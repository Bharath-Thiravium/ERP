import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';

interface SimpleInvoiceListProps {
  sessionKey: string;
}

const SimpleInvoiceList: React.FC<SimpleInvoiceListProps> = ({ sessionKey }) => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        console.log('🔍 SimpleInvoiceList - Starting fetch with sessionKey:', sessionKey ? 'Present' : 'Missing');
        
        if (!sessionKey) {
          throw new Error('No session key provided');
        }

        const response = await fetch(`/api/finance/invoices/?session_key=${sessionKey}&page_size=10`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🔍 SimpleInvoiceList - Data received:', data);
        
        setInvoices(data.results || []);
        setError(null);
      } catch (err: any) {
        console.error('🔍 SimpleInvoiceList - Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [sessionKey]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Loading invoices...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold">Error Loading Invoices</h3>
        <p className="text-red-600 mt-2">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Simple Invoice List</h2>
        <p className="text-gray-600">Found {invoices.length} invoices</p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {invoices.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No invoices found</p>
          </div>
        ) : (
          invoices.map((invoice, index) => (
            <div key={invoice.id || index} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {invoice.invoice_number || 'No Number'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {invoice.customer_name || 'No Customer'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'No Date'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    ₹{invoice.total_amount ? parseFloat(invoice.total_amount).toLocaleString() : '0'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {invoice.payment_status || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SimpleInvoiceList;