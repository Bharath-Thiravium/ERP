import React, { useState, useEffect } from 'react';
import { useServiceUserStore } from '../../../../store/serviceUserStore';
import { apiClient } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { Modal } from '../../../../components/ui/Modal';
import { LoadingSpinner } from '../../../../components/ui/LoadingSpinner';
import { 
  Plus, Mail, Clock, Edit, Trash2, TestTube, Play,
  CheckCircle, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface EmailAutomation {
  id: number;
  email_type: string;
  title: string;
  recipient_emails: string[];
  include_company_admin: boolean;
  include_finance_users: boolean;
  frequency: string;
  send_days_before: number;
  send_time: string;
  subject_template: string;
  body_template: string;
  is_active: boolean;
  last_sent: string | null;
  next_send: string | null;
  created_at: string;
}

const EmailAutomationTab: React.FC = () => {
  const { sessionKey } = useServiceUserStore();
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<EmailAutomation | null>(null);

  const [formData, setFormData] = useState({
    email_type: 'gst_filing',
    title: '',
    recipient_emails: [] as string[],
    include_company_admin: true,
    include_finance_users: true,
    frequency: 'monthly',
    send_days_before: 3,
    send_time: '09:00',
    subject_template: '',
    body_template: '',
    is_active: true
  });

  const emailTypes = [
    { value: 'gst_filing', label: 'GST Filing Reminder' },
    { value: 'tds_filing', label: 'TDS Filing Reminder' },
    { value: 'payment_due', label: 'Payment Due Reminder' },
    { value: 'invoice_overdue', label: 'Invoice Overdue' },
    { value: 'compliance_alert', label: 'Compliance Alert' },
    { value: 'custom', label: 'Custom Reminder' }
  ];

  const frequencies = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' }
  ];

  const defaultTemplates = {
    gst_filing: {
      subject: 'GST Filing Reminder - Due {due_date}',
      body: `Dear Team,

This is a reminder that GST filing for {filing_period} is due on {due_date}.

Days remaining: {days_remaining}

Please ensure all invoices are properly recorded and GST returns are filed on time.

Best regards,
{company_name} Finance Team`
    },
    tds_filing: {
      subject: 'TDS Filing Reminder - {quarter} Due {due_date}',
      body: `Dear Team,

This is a reminder that TDS filing for {quarter} is due on {due_date}.

Days remaining: {days_remaining}

Please ensure all TDS deductions are properly recorded and returns are filed on time.

Best regards,
{company_name} Finance Team`
    },
    payment_due: {
      subject: 'Payment Due Reminder - {invoice_count} Invoices',
      body: `Dear Team,

You have {invoice_count} invoices with payments due soon.

Total Outstanding: {total_outstanding}

Please follow up with customers for timely payments.

Best regards,
{company_name} Finance Team`
    },
    invoice_overdue: {
      subject: 'Overdue Invoice Alert - Action Required',
      body: `Dear Team,

You have overdue invoices requiring immediate attention.

Please review and take necessary action for collection.

Best regards,
{company_name} Finance Team`
    },
    compliance_alert: {
      subject: 'Compliance Alert - {company_name}',
      body: `Dear Team,

This is a compliance alert for {company_name}.

Please review compliance status and take necessary actions.

Best regards,
{company_name} Finance Team`
    },
    custom: {
      subject: 'Custom Reminder - {company_name}',
      body: `Dear Team,

This is a custom reminder from {company_name}.

Date: {current_date}

Best regards,
{company_name} Finance Team`
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    if (!sessionKey) return;
    
    setLoading(true);
    try {
      const response = await apiClient.get('/api/finance/integration/email-automations/');
      setAutomations(response.data.results);
    } catch (error: any) {
      toast.error('Failed to load email automations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAutomation = async () => {
    if (!sessionKey) return;
    
    try {
      await apiClient.post('/api/finance/integration/email-automations/', {
        ...formData,
        session_key: sessionKey
      });
      toast.success('Email automation created successfully');
      setShowCreateModal(false);
      resetForm();
      loadAutomations();
    } catch (error: any) {
      toast.error('Failed to create email automation');
    }
  };

  const handleUpdateAutomation = async () => {
    if (!sessionKey || !selectedAutomation) return;
    
    try {
      await apiClient.put(`/api/finance/integration/email-automations/${selectedAutomation.id}/`, {
        ...formData,
        session_key: sessionKey
      });
      toast.success('Email automation updated successfully');
      setShowEditModal(false);
      resetForm();
      loadAutomations();
    } catch (error: any) {
      toast.error('Failed to update email automation');
    }
  };

  const handleDeleteAutomation = async (automation: EmailAutomation) => {
    if (!sessionKey || !confirm('Are you sure you want to delete this email automation?')) return;
    
    try {
      await apiClient.delete(`/api/finance/integration/email-automations/${automation.id}/`);
      toast.success('Email automation deleted successfully');
      loadAutomations();
    } catch (error: any) {
      toast.error('Failed to delete email automation');
    }
  };

  const handleTestAutomation = async (automation: EmailAutomation) => {
    if (!sessionKey) return;
    
    try {
      const response = await apiClient.post(`/api/finance/integration/email-automations/${automation.id}/test/`, {
        session_key: sessionKey
      });
      
      if (response.data.success) {
        toast.success(`Test email sent to ${response.data.recipients.join(', ')}`);
      } else {
        toast.error(response.data.message);
      }
    } catch (error: any) {
      toast.error('Failed to send test email');
    }
  };

  const handleTriggerAutomation = async (automation: EmailAutomation) => {
    if (!sessionKey) return;
    
    try {
      await apiClient.post(`/api/finance/integration/email-automations/${automation.id}/trigger/`, {
        session_key: sessionKey
      });
      toast.success('Email automation triggered successfully');
      loadAutomations();
    } catch (error: any) {
      toast.error('Failed to trigger email automation');
    }
  };

  const openEditModal = (automation: EmailAutomation) => {
    setSelectedAutomation(automation);
    setFormData({
      email_type: automation.email_type,
      title: automation.title,
      recipient_emails: automation.recipient_emails,
      include_company_admin: automation.include_company_admin,
      include_finance_users: automation.include_finance_users,
      frequency: automation.frequency,
      send_days_before: automation.send_days_before,
      send_time: automation.send_time,
      subject_template: automation.subject_template,
      body_template: automation.body_template,
      is_active: automation.is_active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      email_type: 'gst_filing',
      title: '',
      recipient_emails: [],
      include_company_admin: true,
      include_finance_users: true,
      frequency: 'monthly',
      send_days_before: 3,
      send_time: '09:00',
      subject_template: '',
      body_template: '',
      is_active: true
    });
    setSelectedAutomation(null);
  };

  const handleEmailTypeChange = (emailType: string) => {
    setFormData(prev => ({
      ...prev,
      email_type: emailType,
      subject_template: defaultTemplates[emailType as keyof typeof defaultTemplates]?.subject || '',
      body_template: defaultTemplates[emailType as keyof typeof defaultTemplates]?.body || ''
    }));
  };

  const getStatusBadge = (automation: EmailAutomation) => {
    if (!automation.is_active) {
      return <Badge variant="default"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
    }
    
    if (automation.last_sent) {
      return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
    }
    
    return <Badge variant="warning"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const getEmailTypeLabel = (type: string) => {
    return emailTypes.find(t => t.value === type)?.label || type;
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
        <h2 className="text-2xl font-bold">Email Automation</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Email Automation
        </Button>
      </div>

      {automations.length === 0 ? (
        <Card className="p-8 text-center">
          <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No email automations configured</p>
          <p className="text-sm text-gray-400 mb-4">
            Set up automated reminders for GST filing, TDS compliance, and payment notifications
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Automation
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {automations.map((automation) => (
            <Card key={automation.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <h3 className="text-lg font-semibold">{automation.title}</h3>
                      <p className="text-sm text-gray-600">{getEmailTypeLabel(automation.email_type)}</p>
                    </div>
                    {getStatusBadge(automation)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-500">Frequency:</span>
                      <p className="font-medium capitalize">{automation.frequency}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Send Time:</span>
                      <p className="font-medium">{automation.send_time}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Days Before:</span>
                      <p className="font-medium">{automation.send_days_before} days</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Recipients:</span>
                      <div className="flex gap-1">
                        {automation.include_company_admin && <Badge variant="outline">Admin</Badge>}
                        {automation.include_finance_users && <Badge variant="outline">Finance</Badge>}
                        {automation.recipient_emails.length > 0 && <Badge variant="outline">+{automation.recipient_emails.length}</Badge>}
                      </div>
                    </div>
                  </div>
                  
                  {automation.last_sent && (
                    <p className="text-xs text-gray-500">
                      Last sent: {new Date(automation.last_sent).toLocaleString()}
                    </p>
                  )}
                  
                  {automation.next_send && (
                    <p className="text-xs text-gray-500">
                      Next send: {new Date(automation.next_send).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTestAutomation(automation)}
                  >
                    <TestTube className="h-4 w-4 mr-1" />
                    Test
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTriggerAutomation(automation)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Trigger
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(automation)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteAutomation(automation)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        title={showEditModal ? 'Edit Email Automation' : 'Add Email Automation'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email Type</label>
              <select
                value={formData.email_type}
                onChange={(e) => handleEmailTypeChange(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {emailTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="e.g., Monthly GST Filing Reminder"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                {frequencies.map(freq => (
                  <option key={freq.value} value={freq.value}>{freq.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Days Before</label>
              <input
                type="number"
                value={formData.send_days_before}
                onChange={(e) => setFormData({...formData, send_days_before: parseInt(e.target.value) || 0})}
                className="w-full p-2 border border-gray-300 rounded-lg"
                min="0"
                max="30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Send Time</label>
              <input
                type="time"
                value={formData.send_time}
                onChange={(e) => setFormData({...formData, send_time: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Recipients</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.include_company_admin}
                  onChange={(e) => setFormData({...formData, include_company_admin: e.target.checked})}
                  className="mr-2"
                />
                Include Company Admin
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.include_finance_users}
                  onChange={(e) => setFormData({...formData, include_finance_users: e.target.checked})}
                  className="mr-2"
                />
                Include Finance Users
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Subject Template</label>
            <input
              type="text"
              value={formData.subject_template}
              onChange={(e) => setFormData({...formData, subject_template: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Use variables like {company_name}, {due_date}, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Body Template</label>
            <textarea
              value={formData.body_template}
              onChange={(e) => setFormData({...formData, body_template: e.target.value})}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg h-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Use variables like {company_name}, {due_date}, {days_remaining}, etc."
            />
          </div>

          <div className="flex items-center">
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
              onClick={showEditModal ? handleUpdateAutomation : handleCreateAutomation}
            >
              {showEditModal ? 'Update' : 'Create'} Automation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmailAutomationTab;