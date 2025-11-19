import React, { useState, useEffect } from 'react';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import { apiClient } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { 
  Plus, TestTube, Edit, Trash2, 
  CheckCircle, Clock, AlertCircle, CreditCard,
  DollarSign, TrendingUp, Link, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentGateway {
  id: number;
  gateway_type: string;
  gateway_name: string;
  merchant_id?: string;
  webhook_url?: string;
  auto_gst_payment: boolean;
  auto_tds_payment: boolean;
  payment_threshold: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  customer_name: string;
  customer_id: number;
  total_amount: string;
  outstanding_amount: string;
  payment_status: string;
  due_date?: string;
}

const PaymentGatewayTab: React.FC = () => {
  const { sessionKey } = useServiceUserStore();
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const [formData, setFormData] = useState({
    gateway_type: 'razorpay',
    gateway_name: '',
    merchant_id: '',
    webhook_url: '',
    auto_gst_payment: false,
    auto_tds_payment: false,
    payment_threshold: 0,
    is_active: true,
    credentials: {
      key_id: '',
      key_secret: '',
      merchant_key: '',
      salt: ''
    }
  });

  const [paymentData, setPaymentData] = useState({
    gateway_id: '',
    invoice_id: '',
    amount: '',
    payment_method: 'online'
  });

  useEffect(() => {
    loadGateways();
    loadDashboard();
    loadInvoices();
  }, []);

  const loadGateways = async () => {
    if (!sessionKey) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get('/api/finance/integration/payment-gateways/', {
        headers: { Authorization: `Bearer ${sessionKey}` }
      });
      setGateways(response.data.results || []);
    } catch (error: any) {
      toast.error('Failed to load payment gateways');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.get('/api/finance/integration/payment-gateway-dashboard/', {
        params: { session_key: sessionKey }
      });
      setDashboardData(response.data);
    } catch (error: any) {
      console.error('Failed to load dashboard data');
    }
  };

  const loadInvoices = async () => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.get('/api/finance/integration/invoices-for-payment/', {
        params: { session_key: sessionKey }
      });
      setInvoices(response.data.invoices || []);
    } catch (error: any) {
      console.error('Failed to load invoices');
    }
  };

  const handleCreateGateway = async () => {
    if (!sessionKey) return;
    
    try {
      await apiClient.post('/api/finance/integration/payment-gateways/', {
        ...formData,
        session_key: sessionKey
      });
      toast.success('Payment gateway created successfully');
      setShowCreateModal(false);
      resetForm();
      loadGateways();
      loadDashboard();
    } catch (error: any) {
      toast.error('Failed to create payment gateway');
    }
  };

  const handleUpdateGateway = async () => {
    if (!sessionKey || !selectedGateway) return;
    
    try {
      await apiClient.put(`/api/finance/integration/payment-gateways/${selectedGateway.id}/`, {
        ...formData,
        session_key: sessionKey
      });
      toast.success('Payment gateway updated successfully');
      setShowEditModal(false);
      resetForm();
      loadGateways();
    } catch (error: any) {
      toast.error('Failed to update payment gateway');
    }
  };

  const handleDeleteGateway = async (gateway: PaymentGateway) => {
    if (!sessionKey || !confirm('Are you sure you want to delete this payment gateway?')) return;
    
    try {
      await apiClient.delete(`/api/finance/integration/payment-gateways/${gateway.id}/?session_key=${sessionKey}`);
      toast.success('Payment gateway deleted successfully');
      loadGateways();
      loadDashboard();
    } catch (error: any) {
      toast.error('Failed to delete payment gateway');
    }
  };

  const handleTestGateway = async (gateway: PaymentGateway) => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.post(`/api/finance/integration/payment-gateways/${gateway.id}/test/`, {
        session_key: sessionKey
      });
      
      if (response.data.success) {
        toast.success('Gateway connection test successful');
      } else {
        toast.error(`Connection test failed: ${response.data.message}`);
      }
      loadGateways();
    } catch (error: any) {
      toast.error('Connection test failed');
    }
  };

  const handleProcessPayment = async () => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.post('/api/finance/integration/process-payment/', {
        ...paymentData,
        session_key: sessionKey
      });
      
      if (response.data.success) {
        toast.success('Payment processed successfully');
        setShowPaymentModal(false);
        loadInvoices();
      } else {
        toast.error(`Payment failed: ${response.data.message}`);
      }
    } catch (error: any) {
      toast.error('Payment processing failed');
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!sessionKey || !selectedInvoice) return;
    
    try {
      const response = await apiClient.post('/api/finance/integration/generate-payment-link/', {
        gateway_id: paymentData.gateway_id,
        invoice_id: selectedInvoice.id,
        amount: paymentData.amount,
        session_key: sessionKey
      });
      
      if (response.data.success) {
        toast.success('Payment link generated successfully');
        // Copy link to clipboard
        navigator.clipboard.writeText(response.data.payment_link);
        toast.success('Payment link copied to clipboard');
        setShowLinkModal(false);
      } else {
        toast.error(`Link generation failed: ${response.data.message}`);
      }
    } catch (error: any) {
      toast.error('Failed to generate payment link');
    }
  };

  const openEditModal = (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
    setFormData({
      gateway_type: gateway.gateway_type,
      gateway_name: gateway.gateway_name,
      merchant_id: gateway.merchant_id || '',
      webhook_url: gateway.webhook_url || '',
      auto_gst_payment: gateway.auto_gst_payment,
      auto_tds_payment: gateway.auto_tds_payment,
      payment_threshold: gateway.payment_threshold,
      is_active: gateway.is_active,
      credentials: {
        key_id: '',
        key_secret: '',
        merchant_key: '',
        salt: ''
      }
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      gateway_type: 'razorpay',
      gateway_name: '',
      merchant_id: '',
      webhook_url: '',
      auto_gst_payment: false,
      auto_tds_payment: false,
      payment_threshold: 0,
      is_active: true,
      credentials: {
        key_id: '',
        key_secret: '',
        merchant_key: '',
        salt: ''
      }
    });
    setSelectedGateway(null);
  };

  const getStatusBadge = (gateway: PaymentGateway) => {
    if (!gateway.is_active) {
      return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Inactive</Badge>;
    }
    if (gateway.is_verified) {
      return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
    }
    return <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1" />Unverified</Badge>;
  };

  const getGatewayIcon = (type: string) => {
    switch (type) {
      case 'razorpay': return '💳';
      case 'payu': return '🏦';
      case 'hdfc': return '🏛️';
      case 'icici': return '🏢';
      case 'government': return '🏛️';
      default: return '💰';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Payment Gateway</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowPaymentModal(true)}
            disabled={gateways.filter(g => g.is_active && g.is_verified).length === 0}
          >
            <Zap className="h-4 w-4 mr-2" />
            Process Payment
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowLinkModal(true)}
            disabled={gateways.filter(g => g.is_active && g.is_verified).length === 0}
          >
            <Link className="h-4 w-4 mr-2" />
            Generate Link
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Gateway
          </Button>
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.gateway_stats?.total_gateways || 0}</div>
                <div className="text-sm text-gray-600">Total Gateways</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.gateway_stats?.verified_gateways || 0}</div>
                <div className="text-sm text-gray-600">Verified</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">{dashboardData.payment_stats?.total_payments || 0}</div>
                <div className="text-sm text-gray-600">Payments (30d)</div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <div className="text-2xl font-bold">₹{(dashboardData.payment_stats?.total_amount || 0).toLocaleString()}</div>
                <div className="text-sm text-gray-600">Amount (30d)</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Payment Gateways List */}
      {gateways.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No payment gateways configured</p>
          <p className="text-sm text-gray-400 mb-4">
            Add payment gateways to process online payments and automate tax payments
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Gateway
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {gateways.map((gateway) => (
            <Card key={gateway.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-2xl">{getGatewayIcon(gateway.gateway_type)}</span>
                    <div>
                      <h3 className="text-lg font-semibold">{gateway.gateway_name}</h3>
                      <p className="text-sm text-gray-600">{gateway.gateway_type.toUpperCase()}</p>
                    </div>
                    {getStatusBadge(gateway)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Merchant ID:</span>
                      <p className="font-medium">{gateway.merchant_id || 'Not configured'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Auto GST:</span>
                      <p className="font-medium">{gateway.auto_gst_payment ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Auto TDS:</span>
                      <p className="font-medium">{gateway.auto_tds_payment ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Threshold:</span>
                      <p className="font-medium">₹{gateway.payment_threshold.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-3">
                    {gateway.auto_gst_payment && <Badge variant="outline">Auto GST</Badge>}
                    {gateway.auto_tds_payment && <Badge variant="outline">Auto TDS</Badge>}
                    {gateway.is_active && <Badge variant="outline">Active</Badge>}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestGateway(gateway)}
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(gateway)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteGateway(gateway)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Gateway Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        title={showEditModal ? 'Edit Payment Gateway' : 'Add Payment Gateway'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Gateway Type</label>
              <select
                value={formData.gateway_type}
                onChange={(e) => setFormData({...formData, gateway_type: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                disabled={showEditModal}
              >
                <option value="razorpay">Razorpay</option>
                <option value="payu">PayU</option>
                <option value="hdfc">HDFC Payment Gateway</option>
                <option value="icici">ICICI Payment Gateway</option>
                <option value="government">Government Portal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Gateway Name</label>
              <input
                type="text"
                value={formData.gateway_name}
                onChange={(e) => setFormData({...formData, gateway_name: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="e.g., Razorpay Production"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Merchant ID</label>
              <input
                type="text"
                value={formData.merchant_id}
                onChange={(e) => setFormData({...formData, merchant_id: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Webhook URL</label>
              <input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({...formData, webhook_url: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Gateway-specific credentials */}
          {formData.gateway_type === 'razorpay' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Key ID</label>
                <input
                  type="text"
                  value={formData.credentials.key_id}
                  onChange={(e) => setFormData({
                    ...formData, 
                    credentials: {...formData.credentials, key_id: e.target.value}
                  })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Key Secret</label>
                <input
                  type="password"
                  value={formData.credentials.key_secret}
                  onChange={(e) => setFormData({
                    ...formData, 
                    credentials: {...formData.credentials, key_secret: e.target.value}
                  })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
          )}

          {formData.gateway_type === 'payu' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Merchant Key</label>
                <input
                  type="text"
                  value={formData.credentials.merchant_key}
                  onChange={(e) => setFormData({
                    ...formData, 
                    credentials: {...formData.credentials, merchant_key: e.target.value}
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Salt</label>
                <input
                  type="password"
                  value={formData.credentials.salt}
                  onChange={(e) => setFormData({
                    ...formData, 
                    credentials: {...formData.credentials, salt: e.target.value}
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Payment Threshold (₹)</label>
              <input
                type="number"
                value={formData.payment_threshold}
                onChange={(e) => setFormData({...formData, payment_threshold: parseFloat(e.target.value) || 0})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={formData.auto_gst_payment}
                onChange={(e) => setFormData({...formData, auto_gst_payment: e.target.checked})}
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              />
              Auto GST Payment
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.auto_tds_payment}
                onChange={(e) => setFormData({...formData, auto_tds_payment: e.target.checked})}
                className="mr-2"
              />
              Auto TDS Payment
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                className="mr-2"
              />
              Active
            </label>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={showEditModal ? handleUpdateGateway : handleCreateGateway}
            >
              {showEditModal ? 'Update' : 'Create'} Gateway
            </Button>
          </div>
        </div>
      </Modal>

      {/* Process Payment Modal */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Process Payment"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Gateway</label>
            <select
              value={paymentData.gateway_id}
              onChange={(e) => setPaymentData({...paymentData, gateway_id: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select Gateway</option>
              {gateways.filter(g => g.is_active && g.is_verified).map(gateway => (
                <option key={gateway.id} value={gateway.id}>
                  {gateway.gateway_name} ({gateway.gateway_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Invoice</label>
            <select
              value={paymentData.invoice_id}
              onChange={(e) => {
                const invoice = invoices.find(inv => inv.id.toString() === e.target.value);
                setSelectedInvoice(invoice || null);
                setPaymentData({
                  ...paymentData, 
                  invoice_id: e.target.value,
                  amount: invoice?.outstanding_amount || ''
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select Invoice</option>
              {invoices.map(invoice => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - {invoice.customer_name} (₹{parseFloat(invoice.outstanding_amount).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
            {selectedInvoice && (
              <p className="text-sm text-gray-600 mt-1">
                Outstanding: ₹{parseFloat(selectedInvoice.outstanding_amount).toLocaleString()}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessPayment}>
              Process Payment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Generate Payment Link Modal */}
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        title="Generate Payment Link"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Gateway</label>
            <select
              value={paymentData.gateway_id}
              onChange={(e) => setPaymentData({...paymentData, gateway_id: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select Gateway</option>
              {gateways.filter(g => g.is_active && g.is_verified).map(gateway => (
                <option key={gateway.id} value={gateway.id}>
                  {gateway.gateway_name} ({gateway.gateway_type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Invoice</label>
            <select
              onChange={(e) => {
                const invoice = invoices.find(inv => inv.id.toString() === e.target.value);
                setSelectedInvoice(invoice || null);
                setPaymentData({
                  ...paymentData,
                  amount: invoice?.outstanding_amount || ''
                });
              }}
              className="w-full p-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select Invoice</option>
              {invoices.map(invoice => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - {invoice.customer_name} (₹{parseFloat(invoice.outstanding_amount).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={paymentData.amount}
              onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="secondary" onClick={() => setShowLinkModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGeneratePaymentLink}>
              Generate Link
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PaymentGatewayTab;