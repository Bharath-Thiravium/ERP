import React, { useState, useEffect } from 'react';
import { useServiceUserStore } from '../store/serviceUserStore';

const TestInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { sessionKey } = useServiceUserStore();

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        console.log('🔍 TestInvoices - Starting fetch');
        console.log('🔍 TestInvoices - Session key:', sessionKey ? 'Present' : 'Missing');
        
        if (!sessionKey) {
          setError('No session key available');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/finance/invoices/?session_key=${sessionKey}`);
        console.log('🔍 TestInvoices - Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('🔍 TestInvoices - Data received:', data);
        
        setInvoices(data.results || []);
        setError(null);
      } catch (err: any) {
        console.error('🔍 TestInvoices - Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [sessionKey]);

  if (loading) {
    return <div className="p-4 bg-blue-100 rounded">Loading invoices...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-100 rounded">Error: {error}</div>;
  }

  return (
    <div className="p-4 bg-green-100 rounded">
      <h3 className="font-bold mb-2">Test Invoices Component</h3>
      <p>Successfully loaded {invoices.length} invoices</p>
      {invoices.slice(0, 3).map((invoice, index) => (
        <div key={index} className="mt-2 p-2 bg-white rounded">
          <strong>{invoice.invoice_number}</strong> - {invoice.customer_name} - ₹{invoice.total_amount}
        </div>
      ))}
    </div>
  );
};

export default TestInvoices;