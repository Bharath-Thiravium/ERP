import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, DatePicker, Select, Table, Tag, Progress, Statistic } from 'antd';
import { 
  DownloadOutlined, 
  FileTextOutlined, 
  BarChartOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../../../../../lib/api';
import dayjs from 'dayjs';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const { RangePicker } = DatePicker;
const { Option } = Select;

interface TrendsData {
  monthly_scores: Array<{ month: string; score: number }>;
  category_scores: { [key: string]: number };
  alert_trends: Array<{ month: string; alerts: number }>;
}

const AdvancedReports: React.FC = () => {
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrendsData();
  }, []);

  const fetchTrendsData = async () => {
    try {
      const response = await api.get('/api/hr/advanced-reports/compliance_trends/');
      setTrendsData(response.data);
    } catch (error) {
      console.error('Error fetching trends data:', error);
    }
  };

  const downloadReport = async (reportType: string) => {
    try {
      setLoading(true);
      let url = '';
      let filename = '';
      
      switch (reportType) {
        case 'statutory_summary':
          url = `/api/hr/advanced-reports/statutory_summary/?month=${selectedMonth}&year=${selectedYear}`;
          filename = `statutory_summary_${selectedMonth}_${selectedYear}.pdf`;
          break;
        case 'audit_trail':
          if (!dateRange) {
            alert('Please select date range for audit trail report');
            setLoading(false);
            return;
          }
          const startDate = dateRange[0].format('YYYY-MM-DD');
          const endDate = dateRange[1].format('YYYY-MM-DD');
          url = `/api/hr/advanced-reports/audit_trail/?start_date=${startDate}&end_date=${endDate}`;
          filename = `audit_trail_${startDate}_${endDate}.pdf`;
          break;
        default:
          setLoading(false);
          return;
      }
      
      const response = await api.get(url, { responseType: 'blob' });
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      setLoading(false);
    } catch (error) {
      console.error('Error downloading report:', error);
      setLoading(false);
    }
  };

  const complianceScoreChart = {
    labels: trendsData?.monthly_scores.map(item => item.month) || [],
    datasets: [{
      label: 'Compliance Score',
      data: trendsData?.monthly_scores.map(item => item.score) || [],
      borderColor: '#1890ff',
      backgroundColor: 'rgba(24, 144, 255, 0.1)',
      tension: 0.4
    }]
  };

  const categoryScoreChart = {
    labels: trendsData ? Object.keys(trendsData.category_scores) : [],
    datasets: [{
      data: trendsData ? Object.values(trendsData.category_scores) : [],
      backgroundColor: [
        '#52c41a',
        '#1890ff', 
        '#faad14',
        '#f5222d',
        '#722ed1'
      ]
    }]
  };

  const alertTrendsChart = {
    labels: trendsData?.alert_trends.map(item => item.month) || [],
    datasets: [{
      label: 'Compliance Alerts',
      data: trendsData?.alert_trends.map(item => item.alerts) || [],
      backgroundColor: '#ff4d4f',
      borderColor: '#ff4d4f',
      borderWidth: 1
    }]
  };

  const reportTemplates = [
    {
      title: 'Statutory Summary Report',
      description: 'Monthly summary of all statutory compliance activities',
      icon: <FileTextOutlined />,
      type: 'statutory_summary',
      params: ['month', 'year']
    },
    {
      title: 'Audit Trail Report',
      description: 'Detailed audit trail of compliance activities',
      icon: <BarChartOutlined />,
      type: 'audit_trail',
      params: ['date_range']
    },
    {
      title: 'Compliance Scorecard',
      description: 'Comprehensive compliance performance scorecard',
      icon: <BarChartOutlined />,
      type: 'scorecard',
      params: []
    },
    {
      title: 'Government Returns Summary',
      description: 'Summary of all government return submissions',
      icon: <AlertOutlined />,
      type: 'returns_summary',
      params: ['quarter', 'year']
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '24px' }}>Advanced Compliance Reports</h2>

      {/* Report Generation */}
      <Card title="Generate Reports" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <div style={{ marginBottom: '16px' }}>
              <label>Month/Year for Statutory Reports:</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Select 
                  value={selectedMonth} 
                  onChange={setSelectedMonth}
                  style={{ width: '120px' }}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <Option key={i + 1} value={i + 1}>
                      {dayjs().month(i).format('MMMM')}
                    </Option>
                  ))}
                </Select>
                <Select 
                  value={selectedYear} 
                  onChange={setSelectedYear}
                  style={{ width: '100px' }}
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <Option key={2024 - i} value={2024 - i}>
                      {2024 - i}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <div style={{ marginBottom: '16px' }}>
              <label>Date Range for Audit Reports:</label>
              <RangePicker 
                value={dateRange}
                onChange={setDateRange}
                style={{ width: '100%', marginTop: '8px' }}
              />
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <div style={{ marginBottom: '16px' }}>
              <label>Quick Actions:</label>
              <div style={{ marginTop: '8px' }}>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  onClick={() => downloadReport('statutory_summary')}
                  loading={loading}
                  style={{ marginRight: '8px' }}
                >
                  Monthly Report
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Report Templates */}
      <Card title="Report Templates" style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {reportTemplates.map((template, index) => (
            <Col xs={24} sm={12} md={6} key={index}>
              <Card size="small" hoverable>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }}>
                    {template.icon}
                  </div>
                  <h4>{template.title}</h4>
                  <p style={{ fontSize: '12px', color: '#666' }}>{template.description}</p>
                </div>
                <Button 
                  type="primary" 
                  size="small" 
                  block
                  icon={<DownloadOutlined />}
                  onClick={() => downloadReport(template.type)}
                  loading={loading}
                >
                  Generate
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Compliance Trends */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} md={12}>
          <Card title="Compliance Score Trends">
            <div style={{ height: '300px' }}>
              {trendsData && <Line data={complianceScoreChart} />}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={12}>
          <Card title="Category-wise Compliance">
            <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {trendsData && <Doughnut data={categoryScoreChart} />}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Alert Trends and Statistics */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card title="Alert Trends">
            <div style={{ height: '250px' }}>
              {trendsData && <Bar data={alertTrendsChart} />}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} md={8}>
          <Card title="Key Metrics">
            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Statistic
                  title="Average Compliance Score"
                  value={trendsData ? 
                    trendsData.monthly_scores.reduce((sum, item) => sum + item.score, 0) / trendsData.monthly_scores.length 
                    : 0
                  }
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="Total Alerts (Last 6 months)"
                  value={trendsData ? 
                    trendsData.alert_trends.reduce((sum, item) => sum + item.alerts, 0)
                    : 0
                  }
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="Improvement Rate"
                  value={12.5}
                  suffix="%"
                  precision={1}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdvancedReports;