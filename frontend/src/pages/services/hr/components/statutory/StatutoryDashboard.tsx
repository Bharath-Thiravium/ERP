import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Alert, Tag, Space } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  FileTextOutlined,
  CalendarOutlined,

} from '@ant-design/icons';
import { apiClient } from '../../../../../lib/api';

interface StatutoryDashboardData {
  pf_compliance: {
    enabled: boolean;
    total_employees: number;
    eligible_employees: number;
    monthly_contribution: number;
  };
  esi_compliance: {
    enabled: boolean;
    total_employees: number;
    eligible_employees: number;
    monthly_contribution: number;
  };
  pt_compliance: {
    enabled: boolean;
    state: string;
    total_employees: number;
  };
  tds_compliance: {
    enabled: boolean;
    total_employees: number;
    taxable_employees: number;
  };
  pending_returns: Array<{
    return_type: string;
    period_month: number;
    period_year: number;
    due_date: string;
  }>;
  overdue_returns: Array<{
    return_type: string;
    period_month: number;
    period_year: number;
    due_date: string;
  }>;
  recent_alerts: Array<{
    title: string;
    priority: string;
    due_date: string;
    created_at: string;
  }>;
  compliance_summary: {
    total_items: number;
    compliant_items: number;
    compliance_percentage: number;
    status: string;
  };
}

const StatutoryDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatutoryDashboardData | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getStatutoryDashboard();
      setData(response.data);
    } catch (error) {
      console.error('Error fetching statutory dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <Alert message="Error loading dashboard data" type="error" />;
  }

  return (
    <div className="space-y-8">
      {/* Overview Statistics */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <Row gutter={16}>
          <Col span={6}>
            <Card className="border-0 shadow-lg">
              <Statistic
                title="Compliance Status"
                value={data.compliance_summary.compliance_percentage}
                suffix="%"
                prefix={
                  data.compliance_summary.compliance_percentage === 100 ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                  <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="border-0 shadow-lg">
              <Statistic
                title="Compliant Items"
                value={data.compliance_summary.compliant_items}
                suffix={`/ ${data.compliance_summary.total_items}`}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="border-0 shadow-lg">
              <Statistic
                title="Pending Returns"
                value={data.pending_returns.length}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="border-0 shadow-lg">
              <Statistic
                title="Overdue Returns"
                value={data.overdue_returns.length}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: data.overdue_returns.length > 0 ? '#cf1322' : undefined }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* Statutory Compliance Details */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card title="PF Compliance" size="small" className="border-0 shadow-lg">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  Status: {data.pf_compliance.enabled ? 
                    <Tag color="green">Enabled</Tag> : 
                    <Tag color="red">Disabled</Tag>
                  }
                </div>
                <Statistic
                  title="Eligible Employees"
                  value={data.pf_compliance.eligible_employees}
                  suffix={`/ ${data.pf_compliance.total_employees}`}
                  valueStyle={{ fontSize: 16 }}
                />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card title="ESI Compliance" size="small" className="border-0 shadow-lg">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  Status: {data.esi_compliance.enabled ? 
                    <Tag color="green">Enabled</Tag> : 
                    <Tag color="red">Disabled</Tag>
                  }
                </div>
                <Statistic
                  title="Eligible Employees"
                  value={data.esi_compliance.eligible_employees}
                  suffix={`/ ${data.esi_compliance.total_employees}`}
                  valueStyle={{ fontSize: 16 }}
                />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card title="Professional Tax" size="small" className="border-0 shadow-lg">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  Status: {data.pt_compliance.enabled ? 
                    <Tag color="green">Enabled</Tag> : 
                    <Tag color="red">Disabled</Tag>
                  }
                </div>
                <div>State: <strong>{data.pt_compliance.state}</strong></div>
                <Statistic
                  title="Total Employees"
                  value={data.pt_compliance.total_employees}
                  valueStyle={{ fontSize: 16 }}
                />
              </Space>
            </Card>
          </Col>
          <Col span={6}>
            <Card title="TDS Compliance" size="small" className="border-0 shadow-lg">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                  Status: {data.tds_compliance.enabled ? 
                    <Tag color="green">Enabled</Tag> : 
                    <Tag color="red">Disabled</Tag>
                  }
                </div>
                <Statistic
                  title="Taxable Employees"
                  value={data.tds_compliance.taxable_employees}
                  suffix={`/ ${data.tds_compliance.total_employees}`}
                  valueStyle={{ fontSize: 16 }}
                />
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default StatutoryDashboard;