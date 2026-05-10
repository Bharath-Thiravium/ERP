import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Search, Trash2, DollarSign, FileText } from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8004';

interface Customer {
  id: number;
  name: string;
  customer_code: string;
}

interface DirectPayment {
  id: number;
  payment_number: string;
  payment_date: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  payment_purpose: string;
  amount: number;
  gross_payment_amount: number;
  tds_applicable: boolean;
  tds_amount: number;
  tds_rate: number;
  net_amount_received: number;
  payment_method: string;
  reference_number: string;
  status: string;
  notes: string;
  created_at: string;
}

const DirectCustomerPayment: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<DirectPayment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
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

  const sessionKey = localStorage.getItem('session_key');

  useEffect(() => {
    fetchCustomers();
    fetchPayments();
  }, []);

  useEffect(() => {
    if (formData.amount && formData.tds_applicable && formData.tds_rate) {
      const amount = parseFloat(formData.amount) || 0;
      const tdsRate = parseFloat(formData.tds_rate) || 0;
      const tdsAmount = (amount * tdsRate) / 100;
      const netAmount = amount - tdsAmount;
      
      setFormData(prev => ({
        ...prev,
        tds_amount: tdsAmount.toFixed(2),
        net_amount_received: netAmount.toFixed(2),
      }));
    } else if (formData.amount) {
      setFormData(prev => ({
        ...prev,
        tds_amount: '0',
        net_amount_received: formData.amount,
      }));
    }
  }, [formData.amount, formData.tds_applicable, formData.tds_rate]);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/finance/customers/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
      });
      setCustomers(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const fetchPayments = async (customerId?: number) => {
    try {
      setLoading(true);
      const url = customerId
        ? `${API_BASE_URL}/api/finance/direct-payments/?customer_id=${customerId}`
        : `${API_BASE_URL}/api/finance/direct-payments/`;
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${sessionKey}` },
      });
      setPayments(response.data.payments || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      setError('Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/finance/direct-payments/create/`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${sessionKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSuccess(`Payment ${response.data.payment_number} created successfully!`);
      setShowForm(false);
      resetForm();
      fetchPayments(selectedCustomer || undefined);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (paymentId: number) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/finance/direct-payments/${paymentId}/delete/`, {
        headers: { Authorization: `Bearer ${sessionKey}` },
      });
      setSuccess('Payment deleted successfully');
      fetchPayments(selectedCustomer || undefined);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete payment');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
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
  };

  const filterByCustomer = (customerId: number | null) => {
    setSelectedCustomer(customerId);
    if (customerId) {
      fetchPayments(customerId);
    } else {
      fetchPayments();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Direct Customer Payments</h1>
          <p className="text-gray-600 mt-1">
            Record payments from customers for memos, penalties, incentives, or other purposes
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Direct Payment
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Direct Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer_id">Customer *</Label>
                  <Select
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.customer_code} - {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="payment_purpose">Payment Purpose *</Label>
                  <Input
                    id="payment_purpose"
                    value={formData.payment_purpose}
                    onChange={(e) => setFormData({ ...formData, payment_purpose: e.target.value })}
                    placeholder="e.g., Memo, Penalty, Incentive, Complimentary"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="payment_date">Payment Date *</Label>
                  <Input
                    id="payment_date"
                    type="date"
                    value={formData.payment_date}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="rtgs">RTGS</SelectItem>
                      <SelectItem value="neft">NEFT</SelectItem>
                      <SelectItem value="imps">IMPS</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reference_number">Reference Number</Label>
                  <Input
                    id="reference_number"
                    value={formData.reference_number}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Transaction reference"
                  />
                </div>

                <div>
                  <Label htmlFor="transaction_id">Transaction ID</Label>
                  <Input
                    id="transaction_id"
                    value={formData.transaction_id}
                    onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                    placeholder="Bank transaction ID"
                  />
                </div>

                <div>
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    placeholder="Bank name"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="checkbox"
                    id="tds_applicable"
                    checked={formData.tds_applicable}
                    onChange={(e) => setFormData({ ...formData, tds_applicable: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="tds_applicable">TDS Applicable</Label>
                </div>

                {formData.tds_applicable && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="tds_rate">TDS Rate (%)</Label>
                      <Input
                        id="tds_rate"
                        type="number"
                        step="0.01"
                        value={formData.tds_rate}
                        onChange={(e) => setFormData({ ...formData, tds_rate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tds_amount">TDS Amount</Label>
                      <Input id="tds_amount" value={formData.tds_amount} readOnly className="bg-gray-50" />
                    </div>
                    <div>
                      <Label htmlFor="net_amount_received">Net Amount Received</Label>
                      <Input
                        id="net_amount_received"
                        value={formData.net_amount_received}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tds_section">TDS Section</Label>
                      <Input
                        id="tds_section"
                        value={formData.tds_section}
                        onChange={(e) => setFormData({ ...formData, tds_section: e.target.value })}
                        placeholder="e.g., 194C, 194J"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Payment'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Payment History</CardTitle>
            <div className="flex gap-2">
              <Select
                value={selectedCustomer?.toString() || 'all'}
                onValueChange={(value) => filterByCustomer(value === 'all' ? null : parseInt(value))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Filter by customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.customer_code} - {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No direct payments found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>TDS</TableHead>
                  <TableHead>Net Received</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{payment.payment_number}</TableCell>
                    <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{payment.customer_name}</div>
                        <div className="text-sm text-gray-500">{payment.customer_code}</div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.payment_purpose}</TableCell>
                    <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      {payment.tds_applicable ? `₹${payment.tds_amount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      ₹{payment.net_amount_received.toLocaleString()}
                    </TableCell>
                    <TableCell className="capitalize">{payment.payment_method.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DirectCustomerPayment;
