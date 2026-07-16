import React, { useEffect, useState } from 'react'
import { CalendarDays, Clock, Fingerprint, MapPin, Save, Settings, Smartphone } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface AttendanceSystemConfigProps {
  onSuccess: () => void
}

type AttendanceMode = 'manual' | 'mobile_app' | 'biometric'

const dayOptions = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
]

const modeDetails: Record<AttendanceMode, {
  title: string
  description: string
  icon: React.ReactNode
}> = {
  manual: {
    title: 'Manual Entry',
    description: 'HR/admin records attendance from the web dashboard.',
    icon: <Clock className="h-5 w-5 text-orange-500" />,
  },
  mobile_app: {
    title: 'Mobile App Location Based',
    description: 'Employees check in from the mobile app inside the configured office radius.',
    icon: <Smartphone className="h-5 w-5 text-green-500" />,
  },
  biometric: {
    title: 'Biometric Device',
    description: 'Attendance comes from fingerprint, card, or face scanner devices.',
    icon: <Fingerprint className="h-5 w-5 text-purple-500" />,
  },
}

const AttendanceSystemConfig: React.FC<AttendanceSystemConfigProps> = ({ onSuccess }) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configuredMode, setConfiguredMode] = useState<AttendanceMode | null>(null)
  const [showModeChooser, setShowModeChooser] = useState(true)
  const [config, setConfig] = useState({
    system_type: 'manual' as AttendanceMode,
    enable_biometric: false,
    enable_face_recognition: false,
    enable_mobile_app: false,
    enable_manual_entry: true,
    enable_geo_fencing: false,
    office_latitude: '',
    office_longitude: '',
    geo_fence_radius: 100,
    work_start_time: '09:00',
    work_end_time: '18:00',
    grace_period_minutes: 15,
    face_match_threshold: 0.6,
    require_face_for_checkin: false,
    require_face_for_checkout: false,
  })
  const [policy, setPolicy] = useState({
    weekly_off_days: [6] as number[],
    full_day_min_hours: 8,
    half_day_min_hours: 4,
    overtime_after_hours: 8,
    paid_holiday_payable: true,
    paid_leave_payable: true,
    unpaid_leave_deductible: true,
    exclude_weekoffs_from_leave: true,
    exclude_holidays_from_leave: true,
    lock_attendance_after_payroll: true,
  })

  useEffect(() => {
    fetchConfig()
  }, [sessionKey])

  const normalizeMode = (systemType: string): AttendanceMode => {
    if (systemType === 'mobile_app') return 'mobile_app'
    if (systemType === 'biometric' || systemType === 'face_recognition') return 'biometric'
    return 'manual'
  }

  const applyIncomingConfig = (systemConfig: any) => {
    const mode = normalizeMode(systemConfig.system_type)
    setConfiguredMode(mode)
    setShowModeChooser(false)
    setConfig(prev => ({
      ...prev,
      ...systemConfig,
      system_type: mode,
      enable_biometric: mode === 'biometric',
      enable_face_recognition: mode === 'biometric' && Boolean(systemConfig.enable_face_recognition),
      enable_mobile_app: mode === 'mobile_app',
      enable_manual_entry: mode === 'manual',
      enable_geo_fencing: mode === 'mobile_app',
      office_latitude: systemConfig.office_latitude ? String(systemConfig.office_latitude) : '',
      office_longitude: systemConfig.office_longitude ? String(systemConfig.office_longitude) : '',
      geo_fence_radius: Number(systemConfig.geo_fence_radius || 100),
      require_face_for_checkin: mode === 'mobile_app' && Boolean(systemConfig.require_face_for_checkin),
      require_face_for_checkout: mode === 'mobile_app' && Boolean(systemConfig.require_face_for_checkout),
      work_start_time: String(systemConfig.work_start_time || prev.work_start_time).slice(0, 5),
      work_end_time: String(systemConfig.work_end_time || prev.work_end_time).slice(0, 5),
      grace_period_minutes: Number(systemConfig.grace_period_minutes ?? prev.grace_period_minutes),
    }))
  }

  const applyIncomingPolicy = (attendancePolicy: any) => {
    setPolicy(prev => ({
      ...prev,
      ...attendancePolicy,
      weekly_off_days: Array.isArray(attendancePolicy.weekly_off_days)
        ? attendancePolicy.weekly_off_days.map((day: any) => Number(day)).filter((day: number) => day >= 0 && day <= 6)
        : prev.weekly_off_days,
      full_day_min_hours: Number(attendancePolicy.full_day_min_hours ?? prev.full_day_min_hours),
      half_day_min_hours: Number(attendancePolicy.half_day_min_hours ?? prev.half_day_min_hours),
      overtime_after_hours: Number(attendancePolicy.overtime_after_hours ?? prev.overtime_after_hours),
    }))
  }

  const applyMode = (mode: AttendanceMode) => {
    setConfig(prev => ({
      ...prev,
      system_type: mode,
      enable_biometric: mode === 'biometric',
      enable_face_recognition: mode === 'biometric' ? prev.enable_face_recognition : false,
      enable_mobile_app: mode === 'mobile_app',
      enable_manual_entry: mode === 'manual',
      enable_geo_fencing: mode === 'mobile_app',
      require_face_for_checkin: mode === 'mobile_app' ? prev.require_face_for_checkin : false,
      require_face_for_checkout: mode === 'mobile_app' ? prev.require_face_for_checkout : false,
    }))
  }

  const fetchConfig = async () => {
    if (!sessionKey) return

    setLoading(true)
    try {
      const requestConfig = {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey },
      }

      const [systemResponse, policyResponse] = await Promise.all([
        api.get('/api/hr/attendance/system/', requestConfig),
        api.get('/api/hr/attendance/policy/', requestConfig),
      ])

      if (systemResponse.data.results?.length > 0) {
        applyIncomingConfig(systemResponse.data.results[0])
      } else {
        setConfiguredMode(null)
        setShowModeChooser(true)
      }

      if (policyResponse.data.results?.length > 0) {
        applyIncomingPolicy(policyResponse.data.results[0])
      }
    } catch (error) {
      console.error('Error fetching config:', error)
      toast.error('Failed to load attendance configuration')
    } finally {
      setLoading(false)
    }
  }

  const validateConfig = () => {
    if (config.system_type === 'mobile_app' && config.enable_geo_fencing) {
      if (!config.office_latitude || !config.office_longitude) {
        toast.error('Office latitude and longitude are required for location-based attendance')
        return false
      }
      if (!config.geo_fence_radius || Number(config.geo_fence_radius) <= 0) {
        toast.error('Geo-fence radius must be greater than 0')
        return false
      }
    }
    if (!policy.weekly_off_days.length) {
      toast.error('Select at least one weekly off day')
      return false
    }
    if (Number(policy.half_day_min_hours) <= 0 || Number(policy.full_day_min_hours) <= 0) {
      toast.error('Attendance hours must be greater than 0')
      return false
    }
    if (Number(policy.half_day_min_hours) > Number(policy.full_day_min_hours)) {
      toast.error('Half day hours cannot be greater than full day hours')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!sessionKey || !validateConfig()) return

    setSaving(true)
    try {
      const mode = config.system_type
      const payload = {
        ...config,
        system_type: mode,
        enable_biometric: mode === 'biometric',
        enable_mobile_app: mode === 'mobile_app',
        enable_manual_entry: mode === 'manual',
        enable_geo_fencing: mode === 'mobile_app',
        enable_face_recognition: mode === 'biometric' ? config.enable_face_recognition : false,
        require_face_for_checkin: mode === 'mobile_app' ? config.require_face_for_checkin : false,
        require_face_for_checkout: mode === 'mobile_app' ? config.require_face_for_checkout : false,
        office_latitude: mode === 'mobile_app' && config.office_latitude ? parseFloat(parseFloat(config.office_latitude).toFixed(6)) : null,
        office_longitude: mode === 'mobile_app' && config.office_longitude ? parseFloat(parseFloat(config.office_longitude).toFixed(6)) : null,
        session_key: sessionKey,
      }

      const policyPayload = {
        ...policy,
        full_day_min_hours: Number(policy.full_day_min_hours),
        half_day_min_hours: Number(policy.half_day_min_hours),
        overtime_after_hours: Number(policy.overtime_after_hours),
        session_key: sessionKey,
      }

      const [systemResponse, policyResponse] = await Promise.all([
        api.post('/api/hr/attendance/system/', payload, {
          headers: { Authorization: `Bearer ${sessionKey}` },
        }),
        api.post('/api/hr/attendance/policy/', policyPayload, {
          headers: { Authorization: `Bearer ${sessionKey}` },
        }),
      ])

      applyIncomingConfig(systemResponse.data)
      applyIncomingPolicy(policyResponse.data)
      toast.success('Attendance system configured successfully')
      onSuccess()
    } catch (error: any) {
      console.error('Error saving config:', error)
      toast.error(error.response?.data?.error || error.response?.data?.detail || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setConfig(prev => ({
          ...prev,
          office_latitude: position.coords.latitude.toFixed(6),
          office_longitude: position.coords.longitude.toFixed(6),
        }))
        toast.success('Office location captured')
      },
      (error) => toast.error('Failed to get location: ' + error.message),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleChangeSystem = () => {
    setShowModeChooser(true)
  }

  const handleCancelChangeSystem = () => {
    if (configuredMode) {
      applyMode(configuredMode)
      setShowModeChooser(false)
    }
  }

  const toggleWeeklyOffDay = (day: number) => {
    setPolicy(prev => {
      const weeklyOffDays = prev.weekly_off_days.includes(day)
        ? prev.weekly_off_days.filter(item => item !== day)
        : [...prev.weekly_off_days, day]
      return {
        ...prev,
        weekly_off_days: weeklyOffDays.sort((a, b) => a - b),
      }
    })
  }

  const togglePolicyFlag = (key: keyof typeof policy) => {
    setPolicy(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Attendance Settings
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Select exactly one attendance flow for this company.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {configuredMode && !showModeChooser && (
              <Button onClick={handleChangeSystem} variant="outline">
                Change System
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-indigo-600">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </div>
      </div>

      {showModeChooser ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(Object.keys(modeDetails) as AttendanceMode[]).map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => applyMode(mode)}
                className={`text-left rounded-xl border p-5 transition-all ${
                  config.system_type === mode
                    ? 'border-blue-500 bg-blue-50 shadow-sm dark:bg-blue-900/20'
                    : 'border-gray-200 bg-white hover:border-blue-300 dark:border-gray-700 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">{modeDetails[mode].icon}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{modeDetails[mode].title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{modeDetails[mode].description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {configuredMode && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleCancelChangeSystem}>
                Cancel Change
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/20">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white dark:bg-gray-900">{modeDetails[config.system_type].icon}</div>
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-300">Selected Attendance System</p>
                <h3 className="font-semibold text-gray-900 dark:text-white">{modeDetails[config.system_type].title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{modeDetails[config.system_type].description}</p>
              </div>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-blue-500" />
              <span>{modeDetails[config.system_type].title} Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {config.system_type === 'manual' && 'HR will enter or correct attendance from the dashboard. Employee mobile attendance buttons will be hidden.'}
                {config.system_type === 'mobile_app' && 'Employees can mark attendance from the mobile app. Location radius can be enforced below.'}
                {config.system_type === 'biometric' && 'Attendance is expected from registered biometric devices. Employee mobile attendance buttons will be hidden.'}
              </p>
            </div>

            {config.system_type === 'mobile_app' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Office Location Required</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Mobile check-in/check-out is allowed only inside this radius.</p>
                  </div>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-200">Always On</span>
                </div>

                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Office Latitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={config.office_latitude}
                          onChange={(e) => setConfig({ ...config, office_latitude: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="e.g. 9.981298"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Office Longitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={config.office_longitude}
                          onChange={(e) => setConfig({ ...config, office_longitude: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="e.g. 78.143374"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-end">
                      <Button onClick={getCurrentLocation} variant="outline">
                        <MapPin className="h-4 w-4 mr-2" />
                        Use Current Location
                      </Button>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Allowed Radius (meters)</label>
                        <input
                          type="number"
                          value={config.geo_fence_radius}
                          onChange={(e) => setConfig({ ...config, geo_fence_radius: parseInt(e.target.value) || 100 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          placeholder="100"
                        />
                      </div>
                    </div>
                  </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Require Face Photo</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ask employee to capture face for check-in and check-out.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.require_face_for_checkin && config.require_face_for_checkout}
                      onChange={(e) => setConfig({
                        ...config,
                        require_face_for_checkin: e.target.checked,
                        require_face_for_checkout: e.target.checked,
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {config.system_type === 'biometric' && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/20 p-4">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Configure devices from the Devices tab after saving. Supported device types include fingerprint scanner, card reader, and face scanner.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <span>Work Hours</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Work Start Time</label>
                <input
                  type="time"
                  value={config.work_start_time}
                  onChange={(e) => setConfig({ ...config, work_start_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Work End Time</label>
                <input
                  type="time"
                  value={config.work_end_time}
                  onChange={(e) => setConfig({ ...config, work_end_time: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Grace Period (minutes)</label>
              <input
                type="number"
                value={config.grace_period_minutes}
                onChange={(e) => setConfig({ ...config, grace_period_minutes: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="15"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CalendarDays className="h-5 w-5 text-indigo-500" />
            <span>Work Policy for Leave and Payroll</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Weekly Off Days</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {dayOptions.map(day => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeeklyOffDay(day.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                    policy.weekly_off_days.includes(day.value)
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-200'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Weekly off days will be skipped while counting leave days and payroll payable days when enabled below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Day Minimum Hours</label>
              <input
                type="number"
                step="0.25"
                min="1"
                value={policy.full_day_min_hours}
                onChange={(e) => setPolicy({ ...policy, full_day_min_hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Half Day Minimum Hours</label>
              <input
                type="number"
                step="0.25"
                min="1"
                value={policy.half_day_min_hours}
                onChange={(e) => setPolicy({ ...policy, half_day_min_hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Overtime Starts After Hours</label>
              <input
                type="number"
                step="0.25"
                min="1"
                value={policy.overtime_after_hours}
                onChange={(e) => setPolicy({ ...policy, overtime_after_hours: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              ['paid_holiday_payable', 'Paid Holiday Payable', 'Holiday days count as salary payable days.'],
              ['paid_leave_payable', 'Paid Leave Payable', 'Approved paid leave counts as payable.'],
              ['unpaid_leave_deductible', 'Unpaid Leave Deductible', 'Unpaid leave reduces salary payable days.'],
              ['exclude_weekoffs_from_leave', 'Exclude Weekly Off From Leave', 'Weekly off days are not counted inside leave duration.'],
              ['exclude_holidays_from_leave', 'Exclude Holidays From Leave', 'Company holidays are not counted inside leave duration.'],
              ['lock_attendance_after_payroll', 'Lock Attendance After Payroll', 'Attendance cannot be edited after payroll is generated.'],
            ].map(([key, title, description]) => (
              <button
                key={key}
                type="button"
                onClick={() => togglePolicyFlag(key as keyof typeof policy)}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-left transition-colors hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-800"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
                </div>
                <span className={`ml-4 h-6 w-11 rounded-full p-0.5 transition-colors ${
                  policy[key as keyof typeof policy] ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${
                    policy[key as keyof typeof policy] ? 'translate-x-5' : ''
                  }`} />
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AttendanceSystemConfig
