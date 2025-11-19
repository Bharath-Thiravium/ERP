import React, { useState, useEffect } from 'react'
import { Save, Settings, Shield, Calculator, Percent } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface StatutoryPayrollSettingsData {
  id?: number
  // PF Settings
  pf_establishment_code: string
  pf_extension_code: string
  pf_enabled: boolean
  pf_employee_rate: number
  pf_employer_rate: number
  pf_ceiling: number
  // ESI Settings
  esi_employer_code: string
  esi_local_office: string
  esi_enabled: boolean
  esi_employee_rate: number
  esi_employer_rate: number
  esi_ceiling: number
  // Professional Tax
  pt_registration_number: string
  pt_state: string
  pt_enabled: boolean
  // TDS Settings
  tan_number: string
  tds_circle: string
  tds_enabled: boolean
  // Labor Law Settings
  working_hours_per_day: number
  working_days_per_week: number
  overtime_enabled: boolean
  overtime_rate_multiplier: number
}

const StatutoryPayrollSettings: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<StatutoryPayrollSettingsData>({
    pf_establishment_code: '',
    pf_extension_code: '',
    pf_enabled: true,
    pf_employee_rate: 12.00,
    pf_employer_rate: 12.00,
    pf_ceiling: 15000,
    esi_employer_code: '',
    esi_local_office: '',
    esi_enabled: true,
    esi_employee_rate: 0.75,
    esi_employer_rate: 3.25,
    esi_ceiling: 21000,
    pt_registration_number: '',
    pt_state: 'Maharashtra',
    pt_enabled: true,
    tan_number: '',
    tds_circle: '',
    tds_enabled: true,
    working_hours_per_day: 8,
    working_days_per_week: 6,
    overtime_enabled: true,
    overtime_rate_multiplier: 2.00
  })

  useEffect(() => {
    fetchSettings()
  }, [sessionKey])

  const fetchSettings = async () => {
    if (!sessionKey) return
    
    try {
      setLoading(true)
      const response = await api.get('/api/hr/statutory-settings/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      if (response.data.results && response.data.results.length > 0) {
        setSettings(response.data.results[0])
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!sessionKey) return
    
    try {
      setSaving(true)
      await api.post('/api/hr/statutory-settings/', {
        ...settings,
        session_key: sessionKey
      }, {
        headers: { Authorization: `Bearer ${sessionKey}` }
      })
      toast.success('Statutory & Payroll settings saved successfully')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (field: keyof StatutoryPayrollSettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const stateOptions = [
    'Maharashtra', 'Karnataka', 'West Bengal', 'Assam', 'Gujarat',
    'Tamil Nadu', 'Delhi', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Settings className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Statutory & Payroll Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configure PF, ESI, Professional Tax, TDS and payroll parameters
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-indigo-600">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PF Settings */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-500" />
              <span>Provident Fund (PF)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable PF</span>
              <button
                onClick={() => updateSetting('pf_enabled', !settings.pf_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.pf_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.pf_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PF Establishment Code *
              </label>
              <input
                type="text"
                value={settings.pf_establishment_code}
                onChange={(e) => updateSetting('pf_establishment_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter PF establishment code"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PF Extension Code
              </label>
              <input
                type="text"
                value={settings.pf_extension_code}
                onChange={(e) => updateSetting('pf_extension_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter PF extension code"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employee Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.pf_employee_rate}
                  onChange={(e) => updateSetting('pf_employee_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employer Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.pf_employer_rate}
                  onChange={(e) => updateSetting('pf_employer_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PF Ceiling (₹)
              </label>
              <input
                type="number"
                value={settings.pf_ceiling}
                onChange={(e) => updateSetting('pf_ceiling', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* ESI Settings */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span>Employee State Insurance (ESI)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable ESI</span>
              <button
                onClick={() => updateSetting('esi_enabled', !settings.esi_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.esi_enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.esi_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ESI Employer Code *
              </label>
              <input
                type="text"
                value={settings.esi_employer_code}
                onChange={(e) => updateSetting('esi_employer_code', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter ESI employer code"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ESI Local Office
              </label>
              <input
                type="text"
                value={settings.esi_local_office}
                onChange={(e) => updateSetting('esi_local_office', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter ESI local office"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employee Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.esi_employee_rate}
                  onChange={(e) => updateSetting('esi_employee_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Employer Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.esi_employer_rate}
                  onChange={(e) => updateSetting('esi_employer_rate', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ESI Ceiling (₹)
              </label>
              <input
                type="number"
                value={settings.esi_ceiling}
                onChange={(e) => updateSetting('esi_ceiling', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Tax Settings */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Percent className="h-5 w-5 text-purple-500" />
              <span>Professional Tax (PT)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Professional Tax</span>
              <button
                onClick={() => updateSetting('pt_enabled', !settings.pt_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.pt_enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.pt_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                PT Registration Number
              </label>
              <input
                type="text"
                value={settings.pt_registration_number}
                onChange={(e) => updateSetting('pt_registration_number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter PT registration number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State
              </label>
              <select
                value={settings.pt_state}
                onChange={(e) => updateSetting('pt_state', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {stateOptions.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* TDS & Other Settings */}
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calculator className="h-5 w-5 text-orange-500" />
              <span>TDS & Other Settings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable TDS</span>
              <button
                onClick={() => updateSetting('tds_enabled', !settings.tds_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.tds_enabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.tds_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TAN Number
              </label>
              <input
                type="text"
                value={settings.tan_number}
                onChange={(e) => updateSetting('tan_number', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter TAN number"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TDS Circle
              </label>
              <input
                type="text"
                value={settings.tds_circle}
                onChange={(e) => updateSetting('tds_circle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Enter TDS circle"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Overtime</span>
              <button
                onClick={() => updateSetting('overtime_enabled', !settings.overtime_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.overtime_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.overtime_enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Working Hours/Day
                </label>
                <input
                  type="number"
                  value={settings.working_hours_per_day}
                  onChange={(e) => updateSetting('working_hours_per_day', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Working Days/Week
                </label>
                <input
                  type="number"
                  value={settings.working_days_per_week}
                  onChange={(e) => updateSetting('working_days_per_week', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Overtime Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.overtime_rate_multiplier}
                  onChange={(e) => updateSetting('overtime_rate_multiplier', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Statutory Compliance Information</h4>
        <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
          <li>• PF: Mandatory for employees earning above ₹15,000/month</li>
          <li>• ESI: Applicable for employees earning up to ₹21,000/month</li>
          <li>• Professional Tax: State-specific tax with different slabs</li>
          <li>• TDS: Income tax deducted at source based on annual salary</li>
          <li>• All calculations follow current Indian labor law compliance</li>
        </ul>
      </div>
    </div>
  )
}

export default StatutoryPayrollSettings