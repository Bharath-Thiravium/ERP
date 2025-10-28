import React, { useState, useEffect } from 'react'
import { Save, Settings, Shield, FileText, Calculator } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { Button } from '../../../../../components/ui/Button'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface StatutorySettingsData {
  id?: number
  pf_establishment_code: string
  pf_extension_code: string
  pf_enabled: boolean
  pf_employee_rate: number
  pf_employer_rate: number
  pf_ceiling: number
  esi_employer_code: string
  esi_local_office: string
  esi_enabled: boolean
  esi_employee_rate: number
  esi_employer_rate: number
  esi_ceiling: number
  pt_registration_number: string
  pt_state: string
  pt_enabled: boolean
  tan_number: string
  tds_circle: string
  tds_enabled: boolean
  working_hours_per_day: number
  working_days_per_week: number
  overtime_rate_multiplier: number
}

const StatutorySettings: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<StatutorySettingsData>({
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
      console.error('Error fetching statutory settings:', error)
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
      toast.success('Statutory settings saved successfully')
    } catch (error) {
      console.error('Error saving statutory settings:', error)
      toast.error('Failed to save statutory settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (field: keyof StatutorySettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  const stateOptions = [
    'Maharashtra', 'Karnataka', 'West Bengal', 'Assam', 'Gujarat',
    'Tamil Nadu', 'Delhi', 'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh'
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Statutory Settings</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Configure PF, ESI, Professional Tax, and TDS settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PF Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-green-500" />
              PF (Provident Fund) Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable PF</label>
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
                  min="0"
                  max="100"
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
                  min="0"
                  max="100"
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
                min="0"
                value={settings.pf_ceiling}
                onChange={(e) => updateSetting('pf_ceiling', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* ESI Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-500" />
              ESI (Employee State Insurance) Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable ESI</label>
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
                  min="0"
                  max="100"
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
                  min="0"
                  max="100"
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
                min="0"
                value={settings.esi_ceiling}
                onChange={(e) => updateSetting('esi_ceiling', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Tax Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2 text-yellow-500" />
              Professional Tax Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Professional Tax</label>
              <button
                onClick={() => updateSetting('pt_enabled', !settings.pt_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.pt_enabled ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'
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

        {/* TDS Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-purple-500" />
              TDS (Tax Deducted at Source) Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable TDS</label>
              <button
                onClick={() => updateSetting('tds_enabled', !settings.tds_enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.tds_enabled ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
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
                placeholder="Enter TAN number (e.g., ABCD12345E)"
                pattern="[A-Z]{4}[0-9]{5}[A-Z]{1}"
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
          </CardContent>
        </Card>
      </div>

      {/* Labor Law Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2 text-gray-500" />
            Labor Law Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Working Hours per Day
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.working_hours_per_day}
                onChange={(e) => updateSetting('working_hours_per_day', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Working Days per Week
              </label>
              <input
                type="number"
                min="1"
                max="7"
                value={settings.working_days_per_week}
                onChange={(e) => updateSetting('working_days_per_week', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Overtime Rate Multiplier
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={settings.overtime_rate_multiplier}
                onChange={(e) => updateSetting('overtime_rate_multiplier', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StatutorySettings