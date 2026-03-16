import React, { useState, useEffect } from 'react';
import { integrationApi, MobileAppConfig } from '../../../../services/integrationApi';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/Tabs';

import { Checkbox } from '../../../../components/ui/Checkbox';
import FinanceCard from './FinanceCard';
import MetricCard from './MetricCard';
import BankIntegrationTab from './BankIntegrationTab';
import ERPConnectorsTab from './ERPConnectorsTab';
import PaymentGatewayTab from './PaymentGatewayTab';
import EmailAutomationTab from './EmailAutomationTab';
import { Building2, Zap, CreditCard, Mail } from 'lucide-react';

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
      <FinanceCard>
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">Integration & Automation</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage integrations and automation workflows</p>
      </FinanceCard>

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
                <MetricCard
                  title="Bank Integration"
                  value={(dashboardData.bank_integration?.verified_customers || 0).toString()}
                  subtitle={`${dashboardData.bank_integration?.total_customers || 0} Total Customers`}
                  icon={Building2}
                  color="blue"
                />
                <MetricCard
                  title="ERP Connectors"
                  value={(dashboardData.erp_integration?.connected_integrations || 0).toString()}
                  subtitle={`${dashboardData.erp_integration?.total_integrations || 0} Total Connectors`}
                  icon={Zap}
                  color="green"
                />
                <MetricCard
                  title="Payment Gateway"
                  value={(dashboardData.payment_gateway?.verified_gateways || 0).toString()}
                  subtitle={`${dashboardData.payment_gateway?.total_gateways || 0} Total Gateways`}
                  icon={CreditCard}
                  color="purple"
                />
                <MetricCard
                  title="Email Automation"
                  value={(dashboardData.email_automation?.active_automations || 0).toString()}
                  subtitle={`${dashboardData.email_automation?.emails_sent_today || 0} Sent Today`}
                  icon={Mail}
                  color="orange"
                />
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
                <FinanceCard>
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
                </FinanceCard>

                <FinanceCard>
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
                </FinanceCard>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>


    </div>
  );
};

export default IntegrationManager;