import React, { useState, useEffect } from 'react';
import { integrationApi, BankAccount, PaymentGateway, EmailAutomation, MobileAppConfig } from '../../../../services/integrationApi';
import { DataTable } from '../../../../components/ui/DataTable';
import { Button } from '../../../../components/ui/Button';
import { Modal } from '../../../../components/ui/Modal';
import { Input } from '../../../../components/ui/Input';
import { Select } from '../../../../components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Checkbox } from '../../../../components/ui/Checkbox';
import BankIntegrationTab from './BankIntegrationTab';
import ERPConnectorsTab from './ERPConnectorsTab';
import PaymentGatewayTab from './PaymentGatewayTab';

const IntegrationManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(false);



  // Payment Gateway State
  const [paymentGateways, setPaymentGateways] = useState<PaymentGateway[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    gateway_type: 'razorpay',
    gateway_name: '',
    merchant_id: '',
    webhook_url: '',
    auto_gst_payment: false,
    auto_tds_payment: false,
    payment_threshold: 0,
    is_active: true
  });

  // Email Automation State
  const [emailAutomations, setEmailAutomations] = useState<EmailAutomation[]>([]);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({
    email_type: 'gst_filing',
    title: '',
    recipient_emails: [] as string[],
    include_company_admin: true,
    include_finance_users: true,
    frequency: 'weekly',
    send_days_before: 3,
    send_time: '09:00:00',
    subject_template: '',
    body_template: '',
    is_active: true
  });

  // Mobile App State
  const [mobileConfig, setMobileConfig] = useState<MobileAppConfig | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'payment') {
      loadPaymentGateways();
    } else if (activeTab === 'email') {
      loadEmailAutomations();
    } else if (activeTab === 'mobile') {
      loadMobileConfig();
    }
  }, [activeTab]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const data = await integrationApi.getIntegrationDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };





  const loadPaymentGateways = async () => {
    try {
      const response = await integrationApi.getPaymentGateways();
      setPaymentGateways(response.results);
    } catch (error) {
      console.error('Error loading payment gateways:', error);
    }
  };

  const loadEmailAutomations = async () => {
    try {
      const response = await integrationApi.getEmailAutomations();
      setEmailAutomations(response.results);
    } catch (error) {
      console.error('Error loading email automations:', error);
    }
  };

  const loadMobileConfig = async () => {
    try {
      const config = await integrationApi.getMobileAppConfig();
      setMobileConfig(config);
    } catch (error) {
      console.error('Error loading mobile config:', error);
    }
  };









  const paymentColumns = [
    { key: 'gateway_name', header: 'Gateway Name' },
    { key: 'gateway_type', header: 'Type' },
    { 
      key: 'is_verified', 
      header: 'Verified',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'warning'}>
          {value ? 'Verified' : 'Pending'}
        </Badge>
      )
    },
    { 
      key: 'auto_gst_payment', 
      header: 'Auto GST',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Enabled' : 'Disabled'}
        </Badge>
      )
    },
    { 
      key: 'auto_tds_payment', 
      header: 'Auto TDS',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'default'}>
          {value ? 'Enabled' : 'Disabled'}
        </Badge>
      )
    }
  ];

  const emailColumns = [
    { key: 'title', header: 'Title' },
    { key: 'email_type', header: 'Type' },
    { key: 'frequency', header: 'Frequency' },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (value: boolean) => (
        <Badge variant={value ? 'success' : 'error'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
    { key: 'last_sent', header: 'Last Sent' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Integration & Automation</h2>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="bank">Bank Integration</TabsTrigger>
          <TabsTrigger value="erp">ERP Connectors</TabsTrigger>
          <TabsTrigger value="payment">Payment Gateway</TabsTrigger>
          <TabsTrigger value="email">Email Automation</TabsTrigger>
          <TabsTrigger value="mobile">Mobile App</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dashboardData && (
              <>
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Bank Integration</h3>
                  <div className="text-3xl font-bold text-blue-600">
                    {dashboardData.bank_integration?.verified_customers || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    {dashboardData.bank_integration?.total_customers || 0} Total Customers
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2">ERP Connectors</h3>
                  <div className="text-3xl font-bold text-green-600">
                    {dashboardData.erp_integration?.connected_integrations || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    {dashboardData.erp_integration?.total_integrations || 0} Total Connectors
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Payment Gateway</h3>
                  <div className="text-3xl font-bold text-purple-600">
                    {dashboardData.payment_gateway?.verified_gateways || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    {dashboardData.payment_gateway?.total_gateways || 0} Total Gateways
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2">Email Automation</h3>
                  <div className="text-3xl font-bold text-orange-600">
                    {dashboardData.email_automation?.active_automations || 0}
                  </div>
                  <p className="text-sm text-gray-600">
                    {dashboardData.email_automation?.emails_sent_today || 0} Sent Today
                  </p>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="bank">
          <BankIntegrationTab />
        </TabsContent>

        <TabsContent value="erp">
          <ERPConnectorsTab />
        </TabsContent>

        <TabsContent value="payment">
          <PaymentGatewayTab />
        </TabsContent>

        <TabsContent value="email">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Email Automation</h3>
              <Button onClick={() => setShowEmailModal(true)}>
                Add Email Automation
              </Button>
            </div>

            <DataTable
              data={emailAutomations}
              columns={emailColumns}
            />
          </div>
        </TabsContent>

        <TabsContent value="mobile">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Mobile App Configuration</h3>
            
            {mobileConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="text-lg font-semibold mb-4">Notifications</h4>
                  <div className="space-y-3">
                    <Checkbox
                      checked={mobileConfig.push_notifications_enabled}
                      onChange={(checked) => setMobileConfig({...mobileConfig, push_notifications_enabled: checked})}
                      label="Push Notifications"
                    />
                    <Checkbox
                      checked={mobileConfig.gst_filing_alerts}
                      onChange={(checked) => setMobileConfig({...mobileConfig, gst_filing_alerts: checked})}
                      label="GST Filing Alerts"
                    />
                    <Checkbox
                      checked={mobileConfig.payment_due_alerts}
                      onChange={(checked) => setMobileConfig({...mobileConfig, payment_due_alerts: checked})}
                      label="Payment Due Alerts"
                    />
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="text-lg font-semibold mb-4">Features</h4>
                  <div className="space-y-3">
                    <Checkbox
                      checked={mobileConfig.offline_mode_enabled}
                      onChange={(checked) => setMobileConfig({...mobileConfig, offline_mode_enabled: checked})}
                      label="Offline Mode"
                    />
                    <Checkbox
                      checked={mobileConfig.biometric_auth_enabled}
                      onChange={(checked) => setMobileConfig({...mobileConfig, biometric_auth_enabled: checked})}
                      label="Biometric Authentication"
                    />
                    <Checkbox
                      checked={mobileConfig.quick_invoice_enabled}
                      onChange={(checked) => setMobileConfig({...mobileConfig, quick_invoice_enabled: checked})}
                      label="Quick Invoice"
                    />
                  </div>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>


    </div>
  );
};

export default IntegrationManager;