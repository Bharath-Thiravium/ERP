import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Progress, Alert, Button, Table, Tag, Statistic } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 

  TrophyOutlined,
  FileTextOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);
import api from '../../../../../lib/api';

interface ComplianceData {
  total_employees: number;
  pf_enrolled: number;
  esi_enrolled: number;
  pt_applicable: number;
  tds_applicable: number;
  compliance_score: number;
  pending_returns: any[];
  recent_alerts: any[];
}

interface ComplianceAlert {
  id: number;
  type: string;
  severity: string;
  title: string;
  description: string;
  due_date: string;
  employee?: string;
}

const ComplianceDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<ComplianceData | null>(null);
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([]);
  const [scorecard, setScorecard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchAlerts();
    fetchScorecard();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/hr/compliance/dashboard/');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await api.get('/api/hr/compliance/alerts/');
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const fetchScorecard = async () => {
    try {
      const response = await api.get('/api/hr/compliance/scorecard/');
      setScorecard(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching scorecard:', error);
      setLoading(false);
    }
  };

  const runComplianceCheck = async () => {
    try {
      setLoading(true);
      await api.post('/api/hr/compliance/run_checks/');
      await fetchAlerts();
      setLoading(false);
    } catch (error) {
      console.error('Error running compliance check:', error);
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: number, notes: string) => {
    try {
      await api.post(`/api/hr/compliance/${alertId}/resolve_alert/`, { notes });
      await fetchAlerts();
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'yellow';
      case 'LOW': return 'blue';
      default: return 'default';
    }
  };

  const complianceScoreData = {
    labels: ['PF', 'ESI', 'PT', 'TDS', 'Labor Law'],
    datasets: [{
      data: scorecard ? [
        scorecard.pf_compliance,
        scorecard.esi_compliance,
        scorecard.pt_compliance,
        scorecard.tds_compliance,
        scorecard.labor_law_compliance
      ] : [],
      backgroundColor: [
        '#52c41a',
        '#1890ff',
        '#faad14',
        '#f5222d',
        '#722ed1'
      ]
    }]
  };

  const alertColumns = [
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type.replace('_', ' ')}</Tag>
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{severity}</Tag>
      )
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title'
    },
    {
      title: 'Employee',
      dataIndex: 'employee',
      key: 'employee',
      render: (employee: string) => employee || '-'
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: ComplianceAlert) => (
        <Button 
          size="small" 
          onClick={() => resolveAlert(record.id, 'Resolved from dashboard')}
        >
          Resolve
        </Button>
      )
    }
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Premium Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Compliance Dashboard
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Real-time compliance monitoring and alerts
            </p>
          </div>
          <Button 
            type="primary" 
            icon={<SyncOutlined />}
            onClick={runComplianceCheck}
            loading={loading}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0 shadow-lg"
          >
            Run Compliance Check
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card className="border-0 shadow-lg">
              <Statistic
                title="Overall Compliance Score"
                value={scorecard?.overall_score || 0}
                suffix="%"
                valueStyle={{ color: scorecard?.overall_score >= 90 ? '#3f8600' : '#cf1322' }}
                prefix={<TrophyOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="border-0 shadow-lg">
              <Statistic
                title="Total Employees"
                value={dashboardData?.total_employees || 0}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="border-0 shadow-lg">
              <Statistic
                title="Active Alerts"
                value={alerts.length}
                valueStyle={{ color: alerts.length > 0 ? '#cf1322' : '#3f8600' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card className="border-0 shadow-lg">
              <Statistic
                title="Pending Returns"
                value={dashboardData?.pending_returns?.length || 0}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Compliance Breakdown */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title="Statutory Enrollment Status" className="border-0 shadow-lg">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>PF Enrolled</span>
                  <span>{dashboardData?.pf_enrolled}/{dashboardData?.total_employees}</span>
                </div>
                <Progress 
                  percent={dashboardData ? (dashboardData.pf_enrolled / dashboardData.total_employees) * 100 : 0}
                  strokeColor="#52c41a"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>ESI Enrolled</span>
                  <span>{dashboardData?.esi_enrolled}/{dashboardData?.total_employees}</span>
                </div>
                <Progress 
                  percent={dashboardData ? (dashboardData.esi_enrolled / dashboardData.total_employees) * 100 : 0}
                  strokeColor="#1890ff"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>PT Applicable</span>
                  <span>{dashboardData?.pt_applicable}/{dashboardData?.total_employees}</span>
                </div>
                <Progress 
                  percent={dashboardData ? (dashboardData.pt_applicable / dashboardData.total_employees) * 100 : 0}
                  strokeColor="#faad14"
                />
              </div>
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Compliance Score Breakdown" className="border-0 shadow-lg">
              <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {scorecard && <Doughnut data={complianceScoreData} />}
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Active Alerts */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <Card title="Active Compliance Alerts" className="border-0 bg-transparent">
          {alerts.length > 0 ? (
            <Table
              dataSource={alerts}
              columns={alertColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Alert
              message="No Active Alerts"
              description="All compliance requirements are currently met."
              type="success"
              showIcon
            />
          )}
        </Card>
      </div>

      {/* Pending Returns */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <Card title="Pending Government Returns" className="border-0 bg-transparent">
          {dashboardData?.pending_returns && dashboardData.pending_returns.length > 0 ? (
            <div>
              {dashboardData?.pending_returns?.map((returnItem, index) => (
                <Alert
                  key={index}
                  message={`${returnItem.type} - Due: ${returnItem.due_date}`}
                  type="warning"
                  showIcon
                  style={{ marginBottom: '8px' }}
                  action={
                    <Button size="small" type="primary">
                      Generate
                    </Button>
                  }
                />
              ))}
            </div>
          ) : (
            <Alert
              message="No Pending Returns"
              description="All government returns are up to date."
              type="success"
              showIcon
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default ComplianceDashboard;