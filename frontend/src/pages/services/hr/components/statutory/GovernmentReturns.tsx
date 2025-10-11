import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Row, Col, Select, message, Modal, Form, Tag } from 'antd';
import { FileTextOutlined, DownloadOutlined, SendOutlined } from '@ant-design/icons';
import api from '../../../../../lib/api';
import dayjs from 'dayjs';

const { Option } = Select;


interface GovernmentReturn {
  id: number;
  return_type: string;
  return_type_display: string;
  period_month: number;
  period_year: number;
  generated_date: string | null;
  filed_date: string | null;
  due_date: string;
  status: string;
  status_display: string;
  total_employees: number;
  total_wages: number;
  total_contribution: number;
  acknowledgment_number: string;
}

const GovernmentReturns: React.FC = () => {
  const [returns, setReturns] = useState<GovernmentReturn[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [generateForm] = Form.useForm();
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/hr/government-returns/');
      setReturns(response.data.results || []);
    } catch (error) {
      console.error('Error fetching government returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReturn = async (values: any) => {
    try {
      setGenerating(true);
      const { return_type, period_month, period_year } = values;
      
      let endpoint = '';
      switch (return_type) {
        case 'pf_ecr':
          endpoint = '/api/hr/statutory/pf-ecr/';
          break;
        case 'esi_return':
          endpoint = '/api/hr/statutory/esi-return/';
          break;
        default:
          throw new Error('Invalid return type');
      }
      
      const response = await api.post(endpoint, {
        period_month,
        period_year
      });
      
      message.success(response.data.message);
      setGenerateModalVisible(false);
      generateForm.resetFields();
      fetchReturns();
    } catch (error) {
      console.error('Error generating return:', error);
      message.error('Failed to generate return');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'orange',
      'generated': 'blue',
      'filed': 'green',
      'overdue': 'red',
      'rejected': 'red'
    };
    return colors[status] || 'default';
  };

  const columns = [
    {
      title: 'Return Type',
      dataIndex: 'return_type_display',
      key: 'return_type_display'
    },
    {
      title: 'Period',
      key: 'period',
      render: (record: GovernmentReturn) => 
        `${record.period_month.toString().padStart(2, '0')}/${record.period_year}`
    },
    {
      title: 'Due Date',
      dataIndex: 'due_date',
      key: 'due_date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY')
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: GovernmentReturn) => (
        <Tag color={getStatusColor(status)}>
          {record.status_display}
        </Tag>
      )
    },
    {
      title: 'Employees',
      dataIndex: 'total_employees',
      key: 'total_employees'
    },
    {
      title: 'Total Wages',
      dataIndex: 'total_wages',
      key: 'total_wages',
      render: (amount: number) => `₹${amount.toLocaleString()}`
    },
    {
      title: 'Total Contribution',
      dataIndex: 'total_contribution',
      key: 'total_contribution',
      render: (amount: number) => `₹${amount.toLocaleString()}`
    },
    {
      title: 'Generated Date',
      dataIndex: 'generated_date',
      key: 'generated_date',
      render: (date: string | null) => date ? dayjs(date).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: GovernmentReturn) => (
        <div>
          {record.status === 'pending' && (
            <Button
              type="primary"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => {
                generateForm.setFieldsValue({
                  return_type: record.return_type,
                  period_month: record.period_month,
                  period_year: record.period_year
                });
                setGenerateModalVisible(true);
              }}
            >
              Generate
            </Button>
          )}
          {record.status === 'generated' && (
            <>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                style={{ marginRight: 8 }}
              >
                Download
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
              >
                Submit
              </Button>
            </>
          )}
          {record.acknowledgment_number && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              ACK: {record.acknowledgment_number}
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Government Returns
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Generate and manage statutory returns
            </p>
          </div>
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            onClick={() => setGenerateModalVisible(true)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 border-0 shadow-lg"
          >
            Generate Return
          </Button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <Card className="border-0 bg-transparent">
          <Table
            dataSource={returns}
            columns={columns}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} of ${total} returns`
            }}
          />
        </Card>
      </div>

      <Modal
        title="Generate Government Return"
        open={generateModalVisible}
        onCancel={() => {
          setGenerateModalVisible(false);
          generateForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={generateForm}
          layout="vertical"
          onFinish={handleGenerateReturn}
        >
          <Form.Item
            name="return_type"
            label="Return Type"
            rules={[{ required: true, message: 'Please select return type' }]}
          >
            <Select placeholder="Select return type">
              <Option value="pf_ecr">PF ECR</Option>
              <Option value="esi_return">ESI Return</Option>
              <Option value="pt_return">Professional Tax Return</Option>
              <Option value="tds_24q">TDS 24Q Return</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="period_month"
                label="Month"
                rules={[{ required: true, message: 'Please select month' }]}
              >
                <Select placeholder="Select month">
                  {Array.from({ length: 12 }, (_, i) => (
                    <Option key={i + 1} value={i + 1}>
                      {dayjs().month(i).format('MMMM')}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="period_year"
                label="Year"
                rules={[{ required: true, message: 'Please select year' }]}
              >
                <Select placeholder="Select year">
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = dayjs().year() - 2 + i;
                    return (
                      <Option key={year} value={year}>
                        {year}
                      </Option>
                    );
                  })}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Row justify="end" gutter={8}>
              <Col>
                <Button onClick={() => setGenerateModalVisible(false)}>
                  Cancel
                </Button>
              </Col>
              <Col>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={generating}
                  icon={<FileTextOutlined />}
                >
                  Generate Return
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default GovernmentReturns;