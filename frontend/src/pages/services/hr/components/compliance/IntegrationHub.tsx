import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Tag, Progress, Alert, Modal, Form, Input, Select } from 'antd';
import { 
  LinkOutlined, 
  DisconnectOutlined, 
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import api from '../../../../../lib/api';

interface PortalStatus {
  status: string;
  last_sync: string;
  next_sync: string;
}

interface PortalStatuses {
  epfo: PortalStatus;
  esic: PortalStatus;
  income_tax: PortalStatus;
  professional_tax: PortalStatus;
}

interface Submission {
  date: string;
  type: string;
  portal: string;
  status: string;
  reference: string;
}

const IntegrationHub: React.FC = () => {
  const [portalStatuses, setPortalStatuses] = useState<PortalStatuses | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<string>('');
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPortalStatuses();
    fetchSubmissionHistory();
  }, []);

  const fetchPortalStatuses = async () => {
    try {
      const response = await api.get('/api/hr/integration/portal_status/');
      setPortalStatuses(response.data);
    } catch (error) {
      console.error('Error fetching portal statuses:', error);
    }
  };

  const fetchSubmissionHistory = async () => {
    try {
      const response = await api.get('/api/hr/integration/submission_history/');
      setSubmissions(response.data);
    } catch (error) {
      console.error('Error fetching submission history:', error);
    }
  };

  const syncPortal = async (portal: string) => {
    try {
      setLoading(true);
      await api.post('/api/hr/integration/sync_portal/', { portal });
      await fetchPortalStatuses();
      setLoading(false);
    } catch (error) {
      console.error('Error syncing portal:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Connected': return 'green';
      case 'Disconnected': return 'red';
      case 'Syncing': return 'blue';
      case 'Error': return 'red';
      case 'Submitted': return 'green';
      case 'Failed': return 'red';
      case 'Pending': return 'orange';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Connected': return <CheckCircleOutlined />;
      case 'Disconnected': return <DisconnectOutlined />;
      case 'Syncing': return <SyncOutlined spin />;
      case 'Error': return <ExclamationCircleOutlined />;
      case 'Submitted': return <CheckCircleOutlined />;
      case 'Failed': return <ExclamationCircleOutlined />;
      case 'Pending': return <ClockCircleOutlined />;
      default: return null;
    }
  };

  const openConfigModal = (portal: string) => {
    setSelectedPortal(portal);
    setConfigModalVisible(true);
  };

  const submissionColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: 'Portal',
      dataIndex: 'portal',
      key: 'portal'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference'
    }
  ];

  const renderPortalCard = (portalName: string, portalData: PortalStatus, displayName: string) => (
    <Col xs={24} sm={12} md={6} key={portalName}>
      <Card size="small">
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h4>{displayName}</h4>
          <Tag 
            color={getStatusColor(portalData.status)} 
            icon={getStatusIcon(portalData.status)}
            style={{ marginBottom: '8px' }}
          >
            {portalData.status}
          </Tag>
        </div>
        
        <div style={{ fontSize: '12px', marginBottom: '12px' }}>
          <div>Last Sync: {new Date(portalData.last_sync).toLocaleString()}</div>
          <div>Next Sync: {portalData.next_sync}</div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            size="small" 
            type="primary"
            icon={<SyncOutlined />}
            onClick={() => syncPortal(portalName)}
            loading={loading}
            disabled={portalData.status === 'Disconnected'}
          >
            Sync
          </Button>
          <Button 
            size="small"
            icon={<SettingOutlined />}
            onClick={() => openConfigModal(portalName)}
          >
            Config
          </Button>
        </div>
      </Card>
    </Col>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Government Portal Integration
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Real-time synchronization with government portals
            </p>
          </div>
          <Button 
            type="primary" 
            onClick={() => syncPortal('all')} 
            loading={loading}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0 shadow-lg"
          >
            Sync All Portals
          </Button>
        </div>
      </div>

      {/* Portal Status Overview */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <Card title="Portal Connection Status" className="border-0 bg-transparent">
          <Row gutter={[16, 16]}>
            {portalStatuses && (
              <>
                {renderPortalCard('epfo', portalStatuses.epfo, 'EPFO Portal')}
                {renderPortalCard('esic', portalStatuses.esic, 'ESIC Portal')}
                {renderPortalCard('income_tax', portalStatuses.income_tax, 'Income Tax Portal')}
                {renderPortalCard('professional_tax', portalStatuses.professional_tax, 'Professional Tax Portal')}
              </>
            )}
          </Row>
        </Card>
      </div>

      {/* Integration Health */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Integration Health" className="border-0 shadow-lg">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Overall Health</span>
                  <span>85%</span>
                </div>
                <Progress percent={85} strokeColor="#52c41a" />
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Data Sync Rate</span>
                  <span>92%</span>
                </div>
                <Progress percent={92} strokeColor="#1890ff" />
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Error Rate</span>
                  <span>3%</span>
                </div>
                <Progress percent={3} strokeColor="#f5222d" />
              </div>
            </Card>
          </Col>
          
          <Col xs={24} md={12}>
            <Card title="Recent Activities" className="border-0 shadow-lg">
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#f6ffed', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#52c41a' }}>✓ EPFO Sync Completed</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>2 minutes ago</div>
                </div>
                
                <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#e6f7ff', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#1890ff' }}>↻ ESIC Data Syncing</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>5 minutes ago</div>
                </div>
                
                <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#fff2e8', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', color: '#fa8c16' }}>⚠ PT Portal Connection Issue</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>1 hour ago</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Submission History */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <Card title="Recent Submissions" className="border-0 bg-transparent">
          <Table
            dataSource={submissions}
            columns={submissionColumns}
            rowKey={(record) => `${record.date}-${record.type}-${record.portal}`}
            pagination={{ pageSize: 10 }}
          />
        </Card>
      </div>

      {/* Configuration Modal */}
      <Modal
        title={`Configure ${selectedPortal.toUpperCase()} Integration`}
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="api_endpoint"
            label="API Endpoint"
            rules={[{ required: true, message: 'Please enter API endpoint' }]}
          >
            <Input placeholder="Enter API endpoint URL" />
          </Form.Item>
          
          <Form.Item
            name="client_id"
            label="Client ID"
            rules={[{ required: true, message: 'Please enter client ID' }]}
          >
            <Input placeholder="Enter client ID" />
          </Form.Item>
          
          <Form.Item
            name="client_secret"
            label="Client Secret"
            rules={[{ required: true, message: 'Please enter client secret' }]}
          >
            <Input.Password placeholder="Enter client secret" />
          </Form.Item>
          
          <Form.Item
            name="sync_frequency"
            label="Sync Frequency"
            rules={[{ required: true, message: 'Please select sync frequency' }]}
          >
            <Select placeholder="Select sync frequency">
              <Select.Option value="hourly">Hourly</Select.Option>
              <Select.Option value="daily">Daily</Select.Option>
              <Select.Option value="weekly">Weekly</Select.Option>
              <Select.Option value="manual">Manual Only</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: '8px' }}>
              Save Configuration
            </Button>
            <Button onClick={() => setConfigModalVisible(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IntegrationHub;