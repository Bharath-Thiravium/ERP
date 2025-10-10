import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Tag, Switch, Modal, Form, Input, Select, Alert } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  SettingOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import api from '../../../../../lib/api';

interface ScheduledTask {
  name: string;
  schedule: string;
  last_run: string;
  next_run: string;
  status: string;
}

interface TaskStatus {
  task_id: string;
  status: string;
  result: any;
}

const AutomationCenter: React.FC = () => {
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<TaskStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchScheduledTasks();
  }, []);

  const fetchScheduledTasks = async () => {
    try {
      const response = await api.get('/api/hr/automation/scheduled_tasks/');
      setScheduledTasks(response.data);
    } catch (error) {
      console.error('Error fetching scheduled tasks:', error);
    }
  };

  const triggerTask = async (taskType: string) => {
    try {
      setLoading(true);
      let response;
      
      switch (taskType) {
        case 'ecr':
          response = await api.post('/api/hr/automation/trigger_ecr_generation/');
          break;
        case 'compliance':
          response = await api.post('/api/hr/automation/trigger_compliance_check/');
          break;
        default:
          return;
      }
      
      // Monitor task status
      if (response.data.task_id) {
        monitorTaskStatus(response.data.task_id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error triggering task:', error);
      setLoading(false);
    }
  };

  const monitorTaskStatus = async (taskId: string) => {
    try {
      const response = await api.get(`/api/hr/automation/task_status/?task_id=${taskId}`);
      const newStatus = response.data;
      
      setTaskStatuses(prev => {
        const existing = prev.find(t => t.task_id === taskId);
        if (existing) {
          return prev.map(t => t.task_id === taskId ? newStatus : t);
        } else {
          return [...prev, newStatus];
        }
      });
      
      // Continue monitoring if task is still running
      if (newStatus.status === 'PENDING' || newStatus.status === 'STARTED') {
        setTimeout(() => monitorTaskStatus(taskId), 2000);
      }
    } catch (error) {
      console.error('Error monitoring task status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'green';
      case 'Inactive': return 'red';
      case 'SUCCESS': return 'green';
      case 'FAILURE': return 'red';
      case 'PENDING': return 'orange';
      case 'STARTED': return 'blue';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <CheckCircleOutlined />;
      case 'Inactive': return <PauseCircleOutlined />;
      case 'SUCCESS': return <CheckCircleOutlined />;
      case 'FAILURE': return <ExclamationCircleOutlined />;
      case 'PENDING': case 'STARTED': return <ClockCircleOutlined />;
      default: return null;
    }
  };

  const scheduledTaskColumns = [
    {
      title: 'Task Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Schedule',
      dataIndex: 'schedule',
      key: 'schedule'
    },
    {
      title: 'Last Run',
      dataIndex: 'last_run',
      key: 'last_run',
      render: (date: string) => new Date(date).toLocaleString()
    },
    {
      title: 'Next Run',
      dataIndex: 'next_run',
      key: 'next_run',
      render: (date: string) => new Date(date).toLocaleString()
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
      title: 'Actions',
      key: 'actions',
      render: (record: ScheduledTask) => (
        <div>
          <Button size="small" icon={<SettingOutlined />} style={{ marginRight: '8px' }}>
            Configure
          </Button>
          <Switch 
            checked={record.status === 'Active'} 
            size="small"
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
        </div>
      )
    }
  ];

  const taskStatusColumns = [
    {
      title: 'Task ID',
      dataIndex: 'task_id',
      key: 'task_id',
      render: (id: string) => id.substring(0, 8) + '...'
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
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      render: (result: any) => result ? JSON.stringify(result).substring(0, 50) + '...' : '-'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Automation Center
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Automated compliance tasks and monitoring
            </p>
          </div>
          <Button 
            type="primary" 
            onClick={() => setModalVisible(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0 shadow-lg"
          >
            Create New Task
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
        <Card title="Quick Actions" className="border-0 bg-transparent">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" className="border-0 shadow-lg">
                <div style={{ textAlign: 'center' }}>
                  <h4>Generate ECR</h4>
                  <p>Generate monthly ECR report for PF compliance</p>
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />}
                    onClick={() => triggerTask('ecr')}
                    loading={loading}
                  >
                    Generate Now
                  </Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" className="border-0 shadow-lg">
                <div style={{ textAlign: 'center' }}>
                  <h4>Compliance Check</h4>
                  <p>Run comprehensive compliance validation</p>
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />}
                    onClick={() => triggerTask('compliance')}
                    loading={loading}
                  >
                    Run Check
                  </Button>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card size="small" className="border-0 shadow-lg">
                <div style={{ textAlign: 'center' }}>
                  <h4>Sync Portals</h4>
                  <p>Synchronize data with government portals</p>
                  <Button 
                    type="primary" 
                    icon={<PlayCircleOutlined />}
                    disabled
                  >
                    Sync All
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </Card>
      </div>

      {/* Scheduled Tasks */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <Card title="Scheduled Tasks" className="border-0 bg-transparent">
          <Table
            dataSource={scheduledTasks}
            columns={scheduledTaskColumns}
            rowKey="name"
            pagination={false}
          />
        </Card>
      </div>

      {/* Task Status Monitor */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl overflow-hidden">
        <Card title="Task Status Monitor" className="border-0 bg-transparent">
          {taskStatuses.length > 0 ? (
            <Table
              dataSource={taskStatuses}
              columns={taskStatusColumns}
              rowKey="task_id"
              pagination={false}
            />
          ) : (
            <Alert
              message="No Active Tasks"
              description="No tasks are currently running."
              type="info"
              showIcon
            />
          )}
        </Card>
      </div>

      {/* Create Task Modal */}
      <Modal
        title="Create New Automated Task"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Task Name"
            rules={[{ required: true, message: 'Please enter task name' }]}
          >
            <Input placeholder="Enter task name" />
          </Form.Item>
          
          <Form.Item
            name="type"
            label="Task Type"
            rules={[{ required: true, message: 'Please select task type' }]}
          >
            <Select placeholder="Select task type">
              <Select.Option value="compliance_check">Compliance Check</Select.Option>
              <Select.Option value="ecr_generation">ECR Generation</Select.Option>
              <Select.Option value="esi_return">ESI Return</Select.Option>
              <Select.Option value="backup">Data Backup</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item
            name="schedule"
            label="Schedule"
            rules={[{ required: true, message: 'Please select schedule' }]}
          >
            <Select placeholder="Select schedule">
              <Select.Option value="daily">Daily</Select.Option>
              <Select.Option value="weekly">Weekly</Select.Option>
              <Select.Option value="monthly">Monthly</Select.Option>
              <Select.Option value="quarterly">Quarterly</Select.Option>
            </Select>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ marginRight: '8px' }}>
              Create Task
            </Button>
            <Button onClick={() => setModalVisible(false)}>
              Cancel
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AutomationCenter;