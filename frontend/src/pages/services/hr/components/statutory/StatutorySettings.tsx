import React, { useState, useEffect } from 'react';
import { Form, Input, Switch, Select, Button, Card, Row, Col, message, Divider } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import api from '../../../../../lib/api';

const { Option } = Select;

interface StatutorySettingsData {
  id?: number;
  pf_establishment_code: string;
  pf_extension_code: string;
  pf_enabled: boolean;
  pf_employee_rate: number;
  pf_employer_rate: number;
  pf_ceiling: number;
  esi_employer_code: string;
  esi_local_office: string;
  esi_enabled: boolean;
  esi_employee_rate: number;
  esi_employer_rate: number;
  esi_ceiling: number;
  pt_registration_number: string;
  pt_state: string;
  pt_enabled: boolean;
  tan_number: string;
  tds_circle: string;
  tds_enabled: boolean;
  working_hours_per_day: number;
  working_days_per_week: number;
  overtime_rate_multiplier: number;
}

const StatutorySettings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/hr/statutory-settings/');
      if (response.data.results && response.data.results.length > 0) {
        form.setFieldsValue(response.data.results[0]);
      }
    } catch (error) {
      console.error('Error fetching statutory settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: StatutorySettingsData) => {
    try {
      setSaving(true);
      await api.post('/api/hr/statutory-settings/', values);
      message.success('Statutory settings saved successfully');
    } catch (error) {
      console.error('Error saving statutory settings:', error);
      message.error('Failed to save statutory settings');
    } finally {
      setSaving(false);
    }
  };

  const stateOptions = [
    'Maharashtra',
    'Karnataka',
    'West Bengal',
    'Assam',
    'Gujarat',
    'Tamil Nadu',
    'Delhi',
    'Uttar Pradesh',
    'Rajasthan',
    'Madhya Pradesh'
  ];

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl">
      <div className="mb-6">
        <h3 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Statutory Settings
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure PF, ESI, Professional Tax, and TDS settings
        </p>
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          pf_enabled: true,
          pf_employee_rate: 12.00,
          pf_employer_rate: 12.00,
          pf_ceiling: 15000,
          esi_enabled: true,
          esi_employee_rate: 0.75,
          esi_employer_rate: 3.25,
          esi_ceiling: 21000,
          pt_enabled: true,
          pt_state: 'Maharashtra',
          tds_enabled: true,
          working_hours_per_day: 8,
          working_days_per_week: 6,
          overtime_rate_multiplier: 2.00
        }}
      >
        <Row gutter={[24, 0]}>
          <Col span={12}>
            <Card title="PF (Provident Fund) Settings" size="small">
              <Form.Item name="pf_enabled" valuePropName="checked">
                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
              </Form.Item>
              
              <Form.Item
                name="pf_establishment_code"
                label="PF Establishment Code"
                rules={[{ required: true, message: 'Please enter PF establishment code' }]}
              >
                <Input placeholder="Enter PF establishment code" />
              </Form.Item>
              
              <Form.Item name="pf_extension_code" label="PF Extension Code">
                <Input placeholder="Enter PF extension code" />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="pf_employee_rate" label="Employee Rate (%)">
                    <Input type="number" step="0.01" min="0" max="100" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="pf_employer_rate" label="Employer Rate (%)">
                    <Input type="number" step="0.01" min="0" max="100" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item name="pf_ceiling" label="PF Ceiling (₹)">
                <Input type="number" min="0" />
              </Form.Item>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="ESI (Employee State Insurance) Settings" size="small">
              <Form.Item name="esi_enabled" valuePropName="checked">
                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
              </Form.Item>
              
              <Form.Item
                name="esi_employer_code"
                label="ESI Employer Code"
                rules={[{ required: true, message: 'Please enter ESI employer code' }]}
              >
                <Input placeholder="Enter ESI employer code" />
              </Form.Item>
              
              <Form.Item name="esi_local_office" label="ESI Local Office">
                <Input placeholder="Enter ESI local office" />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="esi_employee_rate" label="Employee Rate (%)">
                    <Input type="number" step="0.01" min="0" max="100" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="esi_employer_rate" label="Employer Rate (%)">
                    <Input type="number" step="0.01" min="0" max="100" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item name="esi_ceiling" label="ESI Ceiling (₹)">
                <Input type="number" min="0" />
              </Form.Item>
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[24, 0]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="Professional Tax Settings" size="small">
              <Form.Item name="pt_enabled" valuePropName="checked">
                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
              </Form.Item>
              
              <Form.Item name="pt_registration_number" label="PT Registration Number">
                <Input placeholder="Enter PT registration number" />
              </Form.Item>
              
              <Form.Item name="pt_state" label="State">
                <Select placeholder="Select state">
                  {stateOptions.map(state => (
                    <Option key={state} value={state}>{state}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Card>
          </Col>
          
          <Col span={12}>
            <Card title="TDS (Tax Deducted at Source) Settings" size="small">
              <Form.Item name="tds_enabled" valuePropName="checked">
                <Switch checkedChildren="Enabled" unCheckedChildren="Disabled" />
              </Form.Item>
              
              <Form.Item
                name="tan_number"
                label="TAN Number"
                rules={[
                  { pattern: /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, message: 'Invalid TAN format' }
                ]}
              >
                <Input placeholder="Enter TAN number (e.g., ABCD12345E)" />
              </Form.Item>
              
              <Form.Item name="tds_circle" label="TDS Circle">
                <Input placeholder="Enter TDS circle" />
              </Form.Item>
            </Card>
          </Col>
        </Row>
        
        <Row gutter={[24, 0]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card title="Labor Law Settings" size="small">
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="working_hours_per_day" label="Working Hours per Day">
                    <Input type="number" min="1" max="24" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="working_days_per_week" label="Working Days per Week">
                    <Input type="number" min="1" max="7" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="overtime_rate_multiplier" label="Overtime Rate Multiplier">
                    <Input type="number" step="0.1" min="1" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
        
        <Divider />
        
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saving}
            size="large"
            className="bg-gradient-to-r from-green-500 to-emerald-600 border-0 shadow-lg"
          >
            Save Settings
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default StatutorySettings;