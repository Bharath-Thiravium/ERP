import React, { useState, useEffect } from 'react';
import { integrationApi, MobileAppConfig } from '../../../../services/integrationApi';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs';
import { Card } from '../../../../components/ui/Card';

import { Checkbox } from '../../../../components/ui/Checkbox';
import BankIntegrationTab from './BankIntegrationTab';
import ERPConnectorsTab from './ERPConnectorsTab';
import PaymentGatewayTab from './PaymentGatewayTab';
import EmailAutomationTab from './EmailAutomationTab';

const IntegrationManager: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<any>(null);

  const [mobileConfig, setMobileConfig] = useState<MobileAppConfig | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    loadMobileConfig();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await integrationApi.getIntegrationDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
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













  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Integration & Automation</h2>
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
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Bank Integration</h3>
                  <div className="text-3xl font-bold text-blue-600">
                    {dashboardData.bank_integration?.verified_customers || 0}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dashboardData.bank_integration?.total_customers || 0} Total Customers
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">ERP Connectors</h3>
                  <div className="text-3xl font-bold text-green-600">
                    {dashboardData.erp_integration?.connected_integrations || 0}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dashboardData.erp_integration?.total_integrations || 0} Total Connectors
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Payment Gateway</h3>
                  <div className="text-3xl font-bold text-purple-600">
                    {dashboardData.payment_gateway?.verified_gateways || 0}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {dashboardData.payment_gateway?.total_gateways || 0} Total Gateways
                  </p>
                </Card>

                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Email Automation</h3>
                  <div className="text-3xl font-bold text-orange-600">
                    {dashboardData.email_automation?.active_automations || 0}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
          <EmailAutomationTab />
        </TabsContent>

        <TabsContent value="mobile">
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Mobile App Configuration</h3>
            
            {mobileConfig && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Notifications</h4>
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
                  <h4 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Features</h4>
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