import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Shield, Lock, Key, Eye, EyeOff, RefreshCw, Copy, Download, 
  AlertTriangle, CheckCircle2, Activity, Clock, Fingerprint,
  Smartphone, QrCode, ArrowLeft,
  Zap, TrendingUp, Globe, 
  User, Mail, Calendar, Settings, Save
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import athenasLogo from '../../assets/logo.jpeg'
import { QRCodeSVG } from 'qrcode.react'
import IPRestrictionManager from '../../components/security/IPRestrictionManager'
import DeviceFingerprintManager from '../../components/security/DeviceFingerprintManager'
import LoginNotificationSettings from '../../components/security/LoginNotificationSettings'
import CaptchaSettings from '../../components/security/CaptchaSettings'

// Ultra-secure password validation
const ultraSecurePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(16, 'Password must be at least 16 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/, 'Password must contain special character'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

const apiKeySchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
})

const recoveryCodesSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
})

const twoFactorSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  totp_code: z.string().optional(),
})

type UltraSecurePasswordFormData = z.infer<typeof ultraSecurePasswordSchema>
type ApiKeyFormData = z.infer<typeof apiKeySchema>
type RecoveryCodesFormData = z.infer<typeof recoveryCodesSchema>
type TwoFactorFormData = z.infer<typeof twoFactorSchema>

const UltraSecureMasterAdminSettings: React.FC = () => {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    email: false
  })
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)
  const [generatedRecoveryCodes, setGeneratedRecoveryCodes] = useState<string[] | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  
  // Email Settings State
  const [emailSettings, setEmailSettings] = useState({
    provider: 'gmail',
    email_address: '',
    email_password: '',
    from_name: 'SAP System Security',
    is_active: false
  })
  const [testEmail, setTestEmail] = useState('')
  
  // Phase 3: Enhanced Security State
  const [securitySettings, setSecuritySettings] = useState({
    ip_restrictions_enabled: false,
    device_fingerprinting_enabled: false,
    login_notifications_enabled: false,
    captcha_after_failed_attempts: 3,
    max_failed_attempts: 5,
    lockout_duration_minutes: 15
  })

  // Fetch ultra-secure settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['master-admin-ultra-settings'],
    queryFn: () => apiClient.getMasterAdminUltraSettings(),
  })

  // Fetch 2FA status separately to handle pending setup
  const { data: twoFactorStatus, refetch: refetchTwoFactor } = useQuery({
    queryKey: ['master-admin-two-factor'],
    queryFn: () => apiClient.getMasterAdminTwoFactor(),
  })

  // Set QR code URL from 2FA status if pending setup
  React.useEffect(() => {
    if (twoFactorStatus?.data?.pending_setup && twoFactorStatus?.data?.qr_code_url) {
      setQrCodeUrl(twoFactorStatus.data.qr_code_url)
    }
  }, [twoFactorStatus])

  // Debug logging
  React.useEffect(() => {
    if (settings?.data) {
      console.log('🔍 DEBUG: Settings data:', settings.data)
      console.log('🔍 DEBUG: Security features:', settings.data.security_features)
      console.log('🔍 DEBUG: 2FA status:', settings.data.security_features?.two_factor_authentication)
      console.log('🔍 DEBUG: Recovery codes count:', settings.data.security_stats?.recovery_codes_count)
    }
  }, [settings])

  const { data: securityStatus } = useQuery({
    queryKey: ['master-admin-security-status'],
    queryFn: () => apiClient.getMasterAdminSecurityStatus(),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const { data: securityLog } = useQuery({
    queryKey: ['master-admin-security-log'],
    queryFn: () => apiClient.getMasterAdminSecurityLog(),
  })

  // Fetch master admin profile for password expiry
  const { data: masterAdminProfile } = useQuery({
    queryKey: ['master-admin-profile'],
    queryFn: () => apiClient.getMasterAdminProfile(),
    enabled: true,
    staleTime: 0,
  })

  // Phase 3: Enhanced Security Queries
  const { data: enhancedSecuritySettings } = useQuery({
    queryKey: ['enhanced-security-settings'],
    queryFn: () => apiClient.getSecuritySettings()
  })

  // Update security settings when data is fetched
  React.useEffect(() => {
    if (enhancedSecuritySettings?.data) {
      setSecuritySettings(enhancedSecuritySettings.data)
    }
  }, [enhancedSecuritySettings])

  const { data: ipRestrictions } = useQuery({
    queryKey: ['ip-restrictions'],
    queryFn: () => apiClient.getIPRestrictions()
  })

  const { data: deviceFingerprints } = useQuery({
    queryKey: ['device-fingerprints'],
    queryFn: () => apiClient.getDeviceFingerprints()
  })

  const { data: loginNotifications } = useQuery({
    queryKey: ['login-notifications'],
    queryFn: () => apiClient.getLoginNotifications()
  })

  // Email Settings Queries
  const { data: masterAdminEmailSettings } = useQuery({
    queryKey: ['master-admin-email-settings'],
    queryFn: () => apiClient.getMasterAdminEmailSettings()
  })

  // Removed unused emailProviders query

  const { data: emailUsage } = useQuery({
    queryKey: ['email-usage'],
    queryFn: () => apiClient.getMasterAdminEmailUsage()
  })

  // Update email settings when data is fetched (like Company Dashboard)
  React.useEffect(() => {
    console.log('🔍 Email settings data:', masterAdminEmailSettings)
    if (masterAdminEmailSettings?.data) {
      // Merge with existing settings like Company Dashboard does
      setEmailSettings(prevSettings => ({
        ...prevSettings,
        ...masterAdminEmailSettings.data
      }))
    }
  }, [masterAdminEmailSettings])

  // Forms
  const passwordForm = useForm<UltraSecurePasswordFormData>({
    resolver: zodResolver(ultraSecurePasswordSchema),
  })

  const apiKeyForm = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
  })

  const recoveryCodesForm = useForm<RecoveryCodesFormData>({
    resolver: zodResolver(recoveryCodesSchema),
  })

  const twoFactorForm = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  })

  // Mutations
  const changePasswordMutation = useMutation({
    mutationFn: (data: UltraSecurePasswordFormData) => 
      apiClient.changeMasterAdminUltraPassword(data),
    onSuccess: () => {
      toast.success('🛡️ Password changed with military-grade security!')
      passwordForm.reset()
      // Force refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
      queryClient.invalidateQueries({ queryKey: ['master-admin-profile'] })
      queryClient.invalidateQueries({ queryKey: ['master-admin-security-status'] })
      queryClient.refetchQueries({ queryKey: ['master-admin-profile'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to change password')
    },
  })

  const regenerateApiKeyMutation = useMutation({
    mutationFn: (data: ApiKeyFormData) => 
      apiClient.regenerateMasterAdminApiKey(data),
    onSuccess: (response) => {
      setGeneratedApiKey(response.data.new_api_key)
      toast.success('🔑 Ultra-secure API key regenerated!')
      queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to regenerate API key')
    },
  })

  const regenerateRecoveryCodesMutation = useMutation({
    mutationFn: (data: RecoveryCodesFormData) => 
      apiClient.regenerateMasterAdminRecoveryCodes(data),
    onSuccess: (response) => {
      setGeneratedRecoveryCodes(response.data.recovery_codes)
      toast.success('🆘 Recovery codes regenerated!')
      queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to regenerate recovery codes')
    },
  })

  const toggleTwoFactorMutation = useMutation({
    mutationFn: (data: TwoFactorFormData & { action: 'enable' | 'disable' | 'reset' }) => 
      apiClient.toggleMasterAdminTwoFactor(data),
    onSuccess: (response, variables) => {
      if (variables.action === 'enable') {
        if (response.data.pending_verification) {
          setQrCodeUrl(response.data.qr_code_url)
          toast.success('📱 Scan QR code with your authenticator app')
        } else if (response.data.two_factor_enabled) {
          toast.success('🔐 Two-factor authentication enabled!')
          setQrCodeUrl(null)
          twoFactorForm.reset()
        }
      } else if (variables.action === 'disable') {
        toast.success('2FA disabled')
        setQrCodeUrl(null)
      } else if (variables.action === 'reset') {
        toast.success('2FA setup reset')
        setQrCodeUrl(null)
      }
      // Force refresh all related queries
      queryClient.invalidateQueries({ queryKey: ['master-admin-ultra-settings'] })
      queryClient.invalidateQueries({ queryKey: ['master-admin-two-factor'] })
      queryClient.invalidateQueries({ queryKey: ['master-admin-security-status'] })
      refetchTwoFactor()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to toggle 2FA')
    },
  })

  // Phase 3: Enhanced Security Mutations
  const updateSecuritySettingsMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateSecuritySettings(data),
    onSuccess: () => {
      toast.success('Security settings updated!')
      queryClient.invalidateQueries({ queryKey: ['enhanced-security-settings'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update settings')
    }
  })

  const addIPRestrictionMutation = useMutation({
    mutationFn: (data: { ip_address: string; description: string }) => 
      apiClient.addIPRestriction(data),
    onSuccess: () => {
      toast.success('IP address added successfully!')
      queryClient.invalidateQueries({ queryKey: ['ip-restrictions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add IP address')
    }
  })

  const removeIPRestrictionMutation = useMutation({
    mutationFn: (id: number) => apiClient.removeIPRestriction(id),
    onSuccess: () => {
      toast.success('IP address removed successfully!')
      queryClient.invalidateQueries({ queryKey: ['ip-restrictions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove IP address')
    }
  })

  const toggleIPRestrictionMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) => 
      apiClient.toggleIPRestriction(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ip-restrictions'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update IP restriction')
    }
  })

  const removeDeviceMutation = useMutation({
    mutationFn: (deviceId: string) => apiClient.removeDeviceFingerprint(deviceId),
    onSuccess: () => {
      toast.success('Device removed successfully!')
      queryClient.invalidateQueries({ queryKey: ['device-fingerprints'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to remove device')
    }
  })

  const toggleDeviceTrustMutation = useMutation({
    mutationFn: ({ deviceId, is_trusted }: { deviceId: string; is_trusted: boolean }) => 
      apiClient.toggleDeviceTrust(deviceId, { is_trusted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['device-fingerprints'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update device trust')
    }
  })

  // Email Settings Mutations
  const updateEmailSettingsMutation = useMutation({
    mutationFn: (data: any) => apiClient.updateMasterAdminEmailSettings(data),
    onSuccess: (response) => {
      toast.success('Email settings saved successfully!')
      console.log('🎉 Save response:', response)
      
      // Update local state with saved data (like Company Dashboard)
      if (response?.data) {
        setEmailSettings(prevSettings => ({
          ...prevSettings,
          ...response.data
        }))
      }
      
      // Refresh usage stats
      queryClient.invalidateQueries({ queryKey: ['email-usage'] })
    },
    onError: (error: any) => {
      console.error('❌ Save error:', error)
      toast.error(error.response?.data?.error || 'Failed to save email settings')
    }
  })

  const testEmailMutation = useMutation({
    mutationFn: (data: { test_email?: string }) => apiClient.testMasterAdminEmail(data),
    onSuccess: () => {
      toast.success('Test email sent successfully!')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send test email')
    }
  })

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard!`)
  }

  const downloadRecoveryCodes = () => {
    if (!generatedRecoveryCodes) return
    
    const content = `ULTRA-SECURE RECOVERY CODES\n============================\n\n${generatedRecoveryCodes.map((code, i) => `${(i + 1).toString().padStart(2, ' ')}. ${code}`).join('\n')}\n\nIMPORTANT:\n- Save these codes in a secure location\n- Each code can only be used once\n- Use these if you lose access to your 2FA device\n- Generate new codes if compromised\n\nGenerated: ${new Date().toISOString()}`
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recovery-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Security Score Component
  const SecurityScoreCard = () => {
    const score = securityStatus?.data?.security_score || 0
    const level = securityStatus?.data?.security_level || 'LOW_SECURITY'
    
    const getScoreColor = (score: number) => {
      if (score >= 90) return 'from-green-500 to-emerald-600'
      if (score >= 75) return 'from-blue-500 to-indigo-600'
      if (score >= 60) return 'from-yellow-500 to-orange-600'
      return 'from-red-500 to-pink-600'
    }

    const getLevelBadge = (level: string) => {
      const badges = {
        'ULTRA_SECURE': { color: 'bg-green-500', text: '🛡️ ULTRA SECURE' },
        'HIGH_SECURITY': { color: 'bg-blue-500', text: '🔒 HIGH SECURITY' },
        'MEDIUM_SECURITY': { color: 'bg-yellow-500', text: '⚠️ MEDIUM SECURITY' },
        'LOW_SECURITY': { color: 'bg-red-500', text: '🚨 LOW SECURITY' }
      }
      return badges[level as keyof typeof badges] || badges.LOW_SECURITY
    }

    const badge = getLevelBadge(level)

    return (
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-4 bg-gradient-to-br ${getScoreColor(score)} rounded-2xl shadow-lg`}>
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Security Score</h3>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-white text-sm font-bold ${badge.color}`}>
                {badge.text}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-3xl font-black text-gray-900 dark:text-white">{score}/100</span>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full bg-gradient-to-r ${getScoreColor(score)} transition-all duration-1000`}
                style={{ width: `${score}%` }}
              ></div>
            </div>
          </div>

          {securityStatus?.data?.recommendations && (
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 dark:text-white">Security Recommendations:</h4>
              {securityStatus.data.recommendations.map((rec: any, index: number) => (
                <div key={index} className={`p-3 rounded-xl border ${
                  rec.priority === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' :
                  rec.priority === 'high' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
                  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
                }`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      rec.priority === 'critical' ? 'text-red-500' :
                      rec.priority === 'high' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{rec.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Overview Tab
  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <SecurityScoreCard />
      
      {/* Profile Summary */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <User className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h3>
              <p className="text-gray-600 dark:text-gray-400">Master Admin Account</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <Mail className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-900 dark:text-white">{settings?.data?.profile?.email}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <Globe className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-900 dark:text-white">{settings?.data?.profile?.company_name}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-900 dark:text-white">
                Created: {settings?.data?.profile?.created_at ? new Date(settings.data.profile.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <RefreshCw className="h-4 w-4 text-orange-500" />
              <div className="flex-1">
                <span className="text-sm text-gray-900 dark:text-white">
                  Recovery Codes: {settings?.data?.security_stats?.recovery_codes_count || 0} available
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Codes are encrypted for security. Generate new ones to view.
                </p>
              </div>
            </div>
            {(masterAdminProfile?.data?.days_until_expiry !== undefined || settings?.data?.profile?.days_until_expiry !== undefined) && (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${
                (masterAdminProfile?.data?.days_until_expiry || settings?.data?.profile?.days_until_expiry || 60) <= 7
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : (masterAdminProfile?.data?.days_until_expiry || settings?.data?.profile?.days_until_expiry || 60) <= 30
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : 'bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <Clock className={`h-4 w-4 ${
                  (masterAdminProfile?.data?.days_until_expiry || settings?.data?.profile?.days_until_expiry || 60) <= 7
                    ? 'text-red-500'
                    : (masterAdminProfile?.data?.days_until_expiry || settings?.data?.profile?.days_until_expiry || 60) <= 30
                    ? 'text-yellow-500'
                    : 'text-blue-500'
                }`} />
                <span className={`text-sm font-medium ${
                  (masterAdminProfile?.data?.days_until_expiry || settings?.data?.profile?.days_until_expiry || 60) <= 7
                    ? 'text-red-700 dark:text-red-300'
                    : (masterAdminProfile?.data?.days_until_expiry || settings?.data?.profile?.days_until_expiry || 60) <= 30
                    ? 'text-yellow-700 dark:text-yellow-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  Password expires in {masterAdminProfile?.data?.days_until_expiry || settings?.data?.profile?.days_until_expiry || 60} days
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Features */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-lg">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Security Features</h3>
              <p className="text-gray-600 dark:text-gray-400">Ultra-secure protection</p>
            </div>
          </div>

          <div className="space-y-3">
            {settings?.data?.security_features && Object.entries(settings.data.security_features).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {key.replace(/_/g, ' ')}
                </span>
                {enabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Password Tab
  const renderPasswordTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Ultra-Secure Password</h3>
              <p className="text-gray-600 dark:text-gray-400">Military-grade password security</p>
            </div>
          </div>

          <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-6">
            {/* Current Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  {...passwordForm.register('current_password')}
                  className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all duration-300 pr-12"
                  placeholder="Enter your current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordForm.formState.errors.current_password && (
                <p className="text-red-500 text-xs mt-2">{passwordForm.formState.errors.current_password.message}</p>
              )}
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                New Ultra-Secure Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  {...passwordForm.register('new_password')}
                  className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-300 pr-12"
                  placeholder="Enter ultra-secure password (16+ chars)"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordForm.formState.errors.new_password && (
                <p className="text-red-500 text-xs mt-2">{passwordForm.formState.errors.new_password.message}</p>
              )}
              <div className="mt-3 space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Ultra-Secure Requirements:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>16+ characters</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>Uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>Lowercase letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span>Special character</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  {...passwordForm.register('confirm_password')}
                  className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 pr-12"
                  placeholder="Confirm your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {passwordForm.formState.errors.confirm_password && (
                <p className="text-red-500 text-xs mt-2">{passwordForm.formState.errors.confirm_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="w-full px-8 py-4 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300 hover:-translate-y-1 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5" />
                  Change Ultra-Secure Password
                  <Shield className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  // API Key Management Tab
  const renderApiKeyTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl shadow-lg">
              <Key className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">API Key Management</h3>
              <p className="text-gray-600 dark:text-gray-400">Ultra-secure API access keys</p>
            </div>
          </div>

          {/* Current API Key Display */}
          <div className="mb-8 p-6 bg-gray-50/80 dark:bg-gray-700/50 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Current API Key</h4>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl font-mono text-sm text-gray-700 dark:text-gray-300">
                {settings?.data?.profile?.api_key || '••••••••••••••••••••••••••••••••'}
              </div>
              <button
                onClick={() => copyToClipboard(settings?.data?.profile?.api_key || '', 'API Key')}
                className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <p>• Created: {settings?.data?.profile?.created_at ? new Date(settings.data.profile.created_at).toLocaleDateString() : 'N/A'}</p>
              <p>• Format: 64-character ultra-secure key</p>
              <p>• Security: Full key never displayed after generation</p>
            </div>
          </div>

          {/* Generated API Key Display */}
          {generatedApiKey && (
            <div className="mb-8 p-6 bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <h4 className="text-lg font-bold text-green-700 dark:text-green-300">New API Key Generated!</h4>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-600 rounded-xl font-mono text-sm text-gray-700 dark:text-gray-300 break-all">
                  {generatedApiKey}
                </div>
                <button
                  onClick={() => copyToClipboard(generatedApiKey, 'New API Key')}
                  className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Save this key securely! It will not be shown again.</span>
              </div>
            </div>
          )}

          {/* Regenerate API Key Form */}
          <form onSubmit={apiKeyForm.handleSubmit((data) => regenerateApiKeyMutation.mutate(data))} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Current Password (Required for Security)
              </label>
              <div className="relative">
                <input
                  type="password"
                  {...apiKeyForm.register('current_password')}
                  className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-300"
                  placeholder="Enter your current password"
                />
              </div>
              {apiKeyForm.formState.errors.current_password && (
                <p className="text-red-500 text-xs mt-2">{apiKeyForm.formState.errors.current_password.message}</p>
              )}
            </div>

            <div className="p-4 bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">Security Warning</span>
              </div>
              <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                <li>• Regenerating will immediately invalidate the current API key</li>
                <li>• Update all applications using the current key</li>
                <li>• The new key will only be displayed once</li>
                <li>• Store the new key in a secure location</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={regenerateApiKeyMutation.isPending}
              className="w-full px-8 py-4 bg-gradient-to-r from-green-600 via-teal-600 to-emerald-600 hover:from-green-700 hover:via-teal-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl shadow-xl shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-300 hover:-translate-y-1 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
            >
              {regenerateApiKeyMutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Regenerating API Key...
                </>
              ) : (
                <>
                  <Key className="h-5 w-5" />
                  Regenerate Ultra-Secure API Key
                  <Shield className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  // Recovery Codes Tab
  const renderRecoveryTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-2xl shadow-lg">
              <RefreshCw className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Recovery Codes</h3>
              <p className="text-gray-600 dark:text-gray-400">Emergency backup codes</p>
            </div>
          </div>

          {/* Current Recovery Codes Status */}
          <div className="mb-8 p-6 bg-gray-50/80 dark:bg-gray-700/50 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Current Recovery Codes</h4>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {settings?.data?.security_stats?.recovery_codes_count || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Codes</div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {settings?.data?.security_stats?.recovery_codes_count || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Available</div>
              </div>
            </div>
            
            {/* Show message if no codes exist */}
            {(!settings?.data?.security_stats?.recovery_codes_count || settings.data.security_stats.recovery_codes_count === 0) ? (
              <div className="p-4 bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">No Recovery Codes Generated</span>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  Generate recovery codes to ensure you can access your account if you lose your 2FA device.
                </p>
              </div>
            ) : (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Format: XXXX-XXXX-XXXX-XXXX (16 characters each)</p>
                <p>• Usage: Each code can only be used once</p>
                <p>• Purpose: Emergency access if 2FA device is lost</p>
                <p>• Security: Codes are encrypted and not displayed for security</p>
              </div>
            )}
          </div>

          {/* Generated Recovery Codes Display */}
          {generatedRecoveryCodes && (
            <div className="mb-8 p-6 bg-orange-50/80 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-orange-500" />
                  <h4 className="text-lg font-bold text-orange-700 dark:text-orange-300">New Recovery Codes Generated!</h4>
                </div>
                <button
                  onClick={downloadRecoveryCodes}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {generatedRecoveryCodes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-600 rounded-xl">
                    <span className="text-xs font-bold text-orange-600 w-6">{index + 1}.</span>
                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300 flex-1">{code}</span>
                    <button
                      onClick={() => copyToClipboard(code, `Recovery Code ${index + 1}`)}
                      className="p-1 text-orange-500 hover:text-orange-600 transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="font-semibold">Save these codes securely! They will not be shown again.</span>
              </div>
            </div>
          )}

          {/* Generate Recovery Codes Form */}
          <form onSubmit={recoveryCodesForm.handleSubmit((data) => regenerateRecoveryCodesMutation.mutate(data))} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Current Password (Required for Security)
              </label>
              <input
                type="password"
                {...recoveryCodesForm.register('current_password')}
                className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all duration-300"
                placeholder="Enter your current password"
              />
              {recoveryCodesForm.formState.errors.current_password && (
                <p className="text-red-500 text-xs mt-2">{recoveryCodesForm.formState.errors.current_password.message}</p>
              )}
            </div>

            <div className="p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">Recovery Code Instructions</span>
              </div>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Store codes in a secure location (password manager recommended)</li>
                <li>• Each code can only be used once for emergency access</li>
                <li>• Use these if you lose access to your 2FA device</li>
                <li>• Generate new codes if you suspect they are compromised</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={regenerateRecoveryCodesMutation.isPending}
              className="w-full px-8 py-4 bg-gradient-to-r from-orange-600 via-yellow-600 to-amber-600 hover:from-orange-700 hover:via-yellow-700 hover:to-amber-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 hover:-translate-y-1 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
            >
              {regenerateRecoveryCodesMutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  Generating Recovery Codes...
                </>
              ) : (
                <>
                  <RefreshCw className="h-5 w-5" />
                  Generate New Recovery Codes
                  <Shield className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  // Two-Factor Authentication Tab
  const renderTwoFactorTab = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg">
              <Fingerprint className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Two-Factor Authentication</h3>
              <p className="text-gray-600 dark:text-gray-400">Enhanced account security</p>
            </div>
          </div>

          {/* 2FA Status */}
          <div className="mb-8 p-6 bg-gray-50/80 dark:bg-gray-700/50 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Current Status</h4>
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                (settings?.data?.security_features?.two_factor_authentication === true) 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {(settings?.data?.security_features?.two_factor_authentication === true) ? '✅ Enabled' : '❌ Disabled'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                <Smartphone className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Authenticator App</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {(settings?.data?.security_features?.two_factor_authentication === true) ? 'Configured' : 'Not Setup'}
                </div>
              </div>
              <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600">
                <RefreshCw className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Backup Codes</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">{settings?.data?.security_stats?.recovery_codes_count || 0} Available</div>
              </div>
            </div>
          </div>

          {/* QR Code Display - Show if pending setup or QR code exists */}
          {(qrCodeUrl || (twoFactorStatus?.data?.pending_setup && twoFactorStatus?.data?.qr_code_url)) && (
            <div className="mb-8 p-6 bg-purple-50/80 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <QrCode className="h-6 w-6 text-purple-500" />
                  <h4 className="text-lg font-bold text-purple-700 dark:text-purple-300">Setup Authenticator App</h4>
                </div>
                <button
                  onClick={() => {
                    toggleTwoFactorMutation.mutate({ 
                      current_password: '', 
                      action: 'reset' 
                    })
                  }}
                  className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Reset Setup
                </button>
              </div>
              <div className="text-center mb-4">
                <div className="inline-block p-4 bg-white rounded-xl border border-purple-200">
                  <QRCodeSVG 
                    value={qrCodeUrl || twoFactorStatus?.data?.qr_code_url || ''}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300 space-y-2">
                <p className="font-semibold">Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Install Google Authenticator or similar TOTP app</li>
                  <li>Scan the QR code above with your app</li>
                  <li>Enter the 6-digit code from your app below to verify</li>
                  <li>Save your recovery codes in a secure location</li>
                </ol>
              </div>
            </div>
          )}

          {/* 2FA Toggle Form */}
          <form onSubmit={twoFactorForm.handleSubmit((data) => {
            const action = (settings?.data?.security_features?.two_factor_authentication === true) ? 'disable' : 'enable'
            toggleTwoFactorMutation.mutate({ ...data, action })
          })} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                Current Password (Required for Security)
              </label>
              <input
                type="password"
                {...twoFactorForm.register('current_password')}
                className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300"
                placeholder="Enter your current password"
              />
              {twoFactorForm.formState.errors.current_password && (
                <p className="text-red-500 text-xs mt-2">{twoFactorForm.formState.errors.current_password.message}</p>
              )}
            </div>

            {/* Show TOTP code field for verification during setup or for disabling */}
            {((settings?.data?.security_features?.two_factor_authentication === true) || 
              (twoFactorStatus?.data?.pending_setup)) && (
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  {(settings?.data?.security_features?.two_factor_authentication === true) 
                    ? '2FA Code (Required to Disable)' 
                    : 'Verification Code (Complete Setup)'}
                </label>
                <input
                  type="text"
                  {...twoFactorForm.register('totp_code')}
                  className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300"
                  placeholder="Enter 6-digit code from your app"
                  maxLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={toggleTwoFactorMutation.isPending}
              className={`w-full px-8 py-4 font-bold rounded-2xl shadow-xl transition-all duration-300 hover:-translate-y-1 disabled:hover:translate-y-0 flex items-center justify-center gap-3 ${
                (settings?.data?.security_features?.two_factor_authentication === true)
                  ? 'bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/50'
                  : twoFactorStatus?.data?.pending_setup
                  ? 'bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 text-white shadow-green-500/30 hover:shadow-2xl hover:shadow-green-500/50'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/50'
              }`}
            >
              {toggleTwoFactorMutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  {(settings?.data?.security_features?.two_factor_authentication === true) 
                    ? 'Disabling 2FA...' 
                    : twoFactorStatus?.data?.pending_setup 
                    ? 'Verifying Setup...' 
                    : 'Starting Setup...'}
                </>
              ) : (
                <>
                  <Fingerprint className="h-5 w-5" />
                  {(settings?.data?.security_features?.two_factor_authentication === true) 
                    ? 'Disable Two-Factor Auth' 
                    : twoFactorStatus?.data?.pending_setup 
                    ? 'Complete 2FA Setup' 
                    : 'Enable Two-Factor Auth'}
                  <Shield className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  // Enhanced Security Tab (Phase 3)
  const renderEnhancedSecurityTab = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-2xl border border-cyan-500/30 mb-4">
          <Settings className="h-6 w-6 text-cyan-500" />
          <span className="text-gray-900 dark:text-white font-bold text-lg">Phase 3: Enhanced Security</span>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Advanced security features including IP restrictions, device fingerprinting, login notifications, and captcha protection.
        </p>
      </div>

      <IPRestrictionManager
        restrictions={ipRestrictions?.data || []}
        isEnabled={securitySettings.ip_restrictions_enabled}
        onToggleEnabled={(enabled) => {
          setSecuritySettings(prev => ({ ...prev, ip_restrictions_enabled: enabled }))
          updateSecuritySettingsMutation.mutate({ ip_restrictions_enabled: enabled })
        }}
        onAddIP={async (data) => {
          await addIPRestrictionMutation.mutateAsync(data)
        }}
        onRemoveIP={async (id) => {
          await removeIPRestrictionMutation.mutateAsync(id)
        }}
        onToggleIP={async (id, active) => {
          await toggleIPRestrictionMutation.mutateAsync({ id, is_active: active })
        }}
        isLoading={updateSecuritySettingsMutation.isPending || addIPRestrictionMutation.isPending}
      />

      <DeviceFingerprintManager
        devices={deviceFingerprints?.data || []}
        isEnabled={securitySettings.device_fingerprinting_enabled}
        onToggleEnabled={(enabled) => {
          setSecuritySettings(prev => ({ ...prev, device_fingerprinting_enabled: enabled }))
          updateSecuritySettingsMutation.mutate({ device_fingerprinting_enabled: enabled })
        }}
        onRemoveDevice={async (deviceId) => {
          await removeDeviceMutation.mutateAsync(deviceId)
        }}
        onToggleTrust={async (deviceId, trusted) => {
          await toggleDeviceTrustMutation.mutateAsync({ deviceId, is_trusted: trusted })
        }}
        isLoading={updateSecuritySettingsMutation.isPending || removeDeviceMutation.isPending}
      />

      <LoginNotificationSettings
        isEnabled={securitySettings.login_notifications_enabled}
        onToggleEnabled={(enabled) => {
          setSecuritySettings(prev => ({ ...prev, login_notifications_enabled: enabled }))
          updateSecuritySettingsMutation.mutate({ login_notifications_enabled: enabled })
        }}
        recentNotifications={loginNotifications?.data || []}
        isLoading={updateSecuritySettingsMutation.isPending}
      />

      <CaptchaSettings
        captchaAfterFailedAttempts={securitySettings.captcha_after_failed_attempts}
        maxFailedAttempts={securitySettings.max_failed_attempts}
        lockoutDurationMinutes={securitySettings.lockout_duration_minutes}
        onUpdateSettings={async (settings) => {
          setSecuritySettings(prev => ({ ...prev, ...settings }))
          await updateSecuritySettingsMutation.mutateAsync(settings)
        }}
        isLoading={updateSecuritySettingsMutation.isPending}
      />
    </div>
  )

  // Email Settings Tab
  const renderEmailSettingsTab = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-pink-500/20 to-rose-600/20 rounded-2xl border border-pink-500/30 mb-4">
          <Mail className="h-6 w-6 text-pink-500" />
          <span className="text-gray-900 dark:text-white font-bold text-lg">Master Admin Email Settings</span>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Configure email settings for sending login notifications and security alerts.
        </p>
      </div>

      {/* Email Configuration */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-lg">
              <Settings className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Email Configuration</h3>
              <p className="text-gray-600 dark:text-gray-400">Configure SMTP settings for sending emails</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Provider Selection */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Email Provider
                </label>
                <select
                  value={emailSettings.provider}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, provider: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-300"
                >
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook/Hotmail</option>
                  <option value="yahoo">Yahoo Mail</option>
                  <option value="hostinger">Hostinger</option>
                  <option value="godaddy">GoDaddy</option>
                  <option value="custom">Custom SMTP</option>
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  💡 {emailSettings.provider === 'gmail' ? 'Use your Gmail address and App Password (not regular password)' :
                      emailSettings.provider === 'outlook' ? 'Use your Outlook/Hotmail address and password' :
                      emailSettings.provider === 'yahoo' ? 'Use your Yahoo address and App Password' :
                      emailSettings.provider === 'hostinger' ? 'Use your Hostinger email address and password' :
                      emailSettings.provider === 'godaddy' ? 'Use your GoDaddy email address and password' :
                      'Enter your custom SMTP server details'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailSettings.email_address}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, email_address: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-300"
                  placeholder="your-email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  Email Password / App Password
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.email ? 'text' : 'password'}
                    value={emailSettings.email_password || ''}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, email_password: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-300 pr-12"
                    placeholder="Enter password or app password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(prev => ({ ...prev, email: !prev.email }))}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.email ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                  From Name
                </label>
                <input
                  type="text"
                  value={emailSettings.from_name}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, from_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500 transition-all duration-300"
                  placeholder="SAP System Security"
                />
              </div>
            </div>

            {/* Status and Actions */}
            <div className="space-y-6">
              <div className="p-6 bg-gray-50/80 dark:bg-gray-700/50 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Current Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Configuration Status</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      emailSettings.is_active 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {emailSettings.is_active ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </div>
                  {emailUsage?.data && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Emails Today</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {emailUsage.data.emails_sent_today}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total Emails</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {emailUsage.data.total_emails_sent}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Test Email */}
              <div className="p-6 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl">
                <h4 className="text-lg font-bold text-blue-700 dark:text-blue-300 mb-4">Test Email</h4>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300"
                    placeholder="test@example.com (optional)"
                  />
                  <button
                    onClick={() => {
                      if (!testEmailMutation.isPending) {
                        testEmailMutation.mutate({ test_email: testEmail || undefined })
                      }
                    }}
                    disabled={testEmailMutation.isPending || !emailSettings.is_active}
                    className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {testEmailMutation.isPending ? 'Sending...' : 'Send Test Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-200/50 dark:border-gray-600/50">
            <button
              onClick={() => {
                const updatedSettings = {
                  ...emailSettings,
                  is_active: true
                }
                setEmailSettings(updatedSettings)
                updateEmailSettingsMutation.mutate(updatedSettings)
              }}
              disabled={updateEmailSettingsMutation.isPending || !emailSettings.email_address || !emailSettings.email_password}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 hover:from-pink-700 hover:via-rose-700 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-xl shadow-xl shadow-pink-500/30 hover:shadow-2xl hover:shadow-pink-500/50 transition-all duration-300 hover:-translate-y-1 disabled:hover:translate-y-0 flex items-center justify-center gap-3"
            >
              <Save className="h-5 w-5" />
              {updateEmailSettingsMutation.isPending ? 'Saving...' : 'Save & Activate'}
            </button>
            
            <button
              onClick={() => {
                const updatedSettings = {
                  ...emailSettings,
                  is_active: false
                }
                setEmailSettings(updatedSettings)
                updateEmailSettingsMutation.mutate(updatedSettings)
              }}
              disabled={updateEmailSettingsMutation.isPending}
              className="px-6 py-3 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
            >
              Deactivate
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Security Log Tab
  const renderSecurityLogTab = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-gradient-to-br from-gray-500 to-slate-600 rounded-2xl shadow-lg">
              <Activity className="h-8 w-8 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Security Activity Log</h3>
              <p className="text-gray-600 dark:text-gray-400">Real-time security monitoring</p>
            </div>
          </div>

          {/* Security Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {securityLog?.data?.security_summary?.total_logins || 0}
              </div>
              <div className="text-sm text-green-700 dark:text-green-300">Successful Logins</div>
            </div>
            <div className="text-center p-4 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {securityLog?.data?.security_summary?.failed_attempts || 0}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">Failed Attempts</div>
            </div>
            <div className="text-center p-4 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {securityLog?.data?.security_summary?.password_changes || 0}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Password Changes</div>
            </div>
            <div className="text-center p-4 bg-yellow-50/80 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {securityLog?.data?.security_summary?.suspicious_activities || 0}
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">Suspicious Activities</div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity (30 days)</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                Auto-refresh every 30s
              </div>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {securityLog?.data?.logs?.length > 0 ? (
                securityLog?.data?.logs?.map((log: any, index: number) => (
                  <div key={index} className={`p-4 rounded-xl border ${
                    log.severity === 'high' ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-700' :
                    log.severity === 'medium' ? 'bg-yellow-50/80 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700' :
                    'bg-gray-50/80 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-2 h-2 rounded-full ${
                            log.severity === 'high' ? 'bg-red-500' :
                            log.severity === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}></div>
                          <span className="font-semibold text-gray-900 dark:text-white">{log.event_type.replace(/_/g, ' ')}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            log.severity === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                            log.severity === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                            'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          }`}>
                            {log.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{log.details}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          <span>📅 {new Date(log.timestamp).toLocaleString()}</span>
                          <span>🌐 {log.ip_address}</span>
                          <span>💻 {log.user_agent}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No security events recorded yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950/30 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                to="/master-admin"
                className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="font-semibold">Dashboard</span>
              </Link>

              <div className="flex items-center gap-3">
                <img src={athenasLogo} alt="ᗩTᕼᙓᑎᗩ'𝔖 Logo" className="h-10 w-10 rounded-xl shadow-lg" />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    🛡️ ULTRA-SECURE SETTINGS
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Military-Grade Security</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-xl border border-green-200 dark:border-green-700 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Shield className="h-4 w-4" />
                  SECURE MODE
                </div>
              </div>
              {masterAdminProfile?.data?.days_until_expiry !== undefined && (
                <div className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${
                  masterAdminProfile.data.days_until_expiry <= 7
                    ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700'
                    : masterAdminProfile.data.days_until_expiry <= 30
                    ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700'
                    : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                }`}>
                  <Clock className="h-4 w-4" />
                  Password expires in {masterAdminProfile.data.days_until_expiry} days
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 pt-24 pb-8">
        <div className="container mx-auto px-6">
          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl p-3">
              <div className="flex flex-wrap gap-3">
                {[
                  { id: 'overview', label: 'Security Overview', icon: Shield, color: 'from-blue-500 to-purple-600' },
                  { id: 'password', label: 'Ultra-Secure Password', icon: Lock, color: 'from-red-500 to-pink-600' },
                  { id: 'api-key', label: 'API Key Management', icon: Key, color: 'from-green-500 to-teal-600' },
                  { id: 'recovery', label: 'Recovery Codes', icon: RefreshCw, color: 'from-orange-500 to-yellow-600' },
                  { id: '2fa', label: 'Two-Factor Auth', icon: Fingerprint, color: 'from-purple-500 to-indigo-600' },
                  { id: 'enhanced', label: 'Enhanced Security', icon: Settings, color: 'from-cyan-500 to-blue-600' },
                  { id: 'email', label: 'Email Settings', icon: Mail, color: 'from-pink-500 to-rose-600' },
                  { id: 'activity', label: 'Security Log', icon: Activity, color: 'from-gray-500 to-slate-600' }
                ].map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      data-tab={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="w-full">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'password' && renderPasswordTab()}
            {activeTab === 'api-key' && renderApiKeyTab()}
            {activeTab === 'recovery' && renderRecoveryTab()}
            {activeTab === '2fa' && renderTwoFactorTab()}
            {activeTab === 'enhanced' && renderEnhancedSecurityTab()}
            {activeTab === 'email' && renderEmailSettingsTab()}
            {activeTab === 'activity' && renderSecurityLogTab()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UltraSecureMasterAdminSettings