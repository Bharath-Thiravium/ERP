import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  User,
  Lock,
  Shield,
  Save,
  Eye,
  EyeOff,
  Settings as SettingsIcon,
  Bell,
  Moon,
  Sun,
  Calendar,
  Filter,
  Sparkles,
  Zap,
  Star,
  Globe,
  Palette,
  Database,
  Activity,
  TrendingUp,
  BarChart3,
  Cpu,
  HardDrive,
  Wifi,
  Smartphone,
  Monitor,
  Volume2,
  Mail,
  MessageSquare,
  Clock,
  Languages,
  MapPin,
  Key,
  Fingerprint,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Edit3,
  Copy,
  Share2
} from 'lucide-react'

import { Link } from 'react-router-dom'
import { apiClient } from '../../lib/api'
import { useThemeStore } from '../../store/themeStore'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import athenasLogo from '../../assets/logo.jpeg'

// Validation schemas
const profileSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  company_name: z.string().min(1, 'Company name is required'),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

const MasterAdminSettings: React.FC = () => {
  const { theme, toggleTheme } = useThemeStore()
  const queryClient = useQueryClient()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [isAnimating, setIsAnimating] = useState(false)

  // Animation effect for tab transitions
  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 300)
    return () => clearTimeout(timer)
  }, [activeTab])

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['master-admin-profile'],
    queryFn: () => apiClient.getMasterAdminProfile(),
  })

  const profileData = profile?.data

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      first_name: profileData?.first_name || '',
      last_name: profileData?.last_name || '',
      company_name: profileData?.company_name || '',
    },
  })

  // Password form
  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => apiClient.updateMasterAdminProfile(data),
    onSuccess: () => {
      toast.success('Profile updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['master-admin-profile'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update profile')
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: PasswordFormData) => apiClient.changeMasterAdminPassword(data),
    onSuccess: () => {
      toast.success('Password changed successfully!')
      passwordForm.reset()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to change password')
    },
  })

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data)
  }

  const onPasswordSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data)
  }

  // Profile Tab Component
  const renderProfileTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
      {/* Profile Information Card */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden group hover:shadow-3xl hover:shadow-blue-500/20 transition-all duration-500">
        <div className="relative p-8">
          {/* Animated Background Pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Profile Information
                </h3>
                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Update your personal information and company details
                </p>
              </div>
            </div>

            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <div className="space-y-6">
                {/* Email Field */}
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={profileData?.email || ''}
                      disabled
                      className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-500 dark:text-gray-400 cursor-not-allowed backdrop-blur-sm"
                    />
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
                    <Shield className="h-3 w-3 text-blue-500" />
                    Email cannot be changed for security reasons
                  </p>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      First Name
                    </label>
                    <input
                      {...profileForm.register('first_name')}
                      className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 backdrop-blur-sm group-hover:border-blue-300 dark:group-hover:border-blue-600"
                      placeholder="Enter your first name"
                    />
                    {profileForm.formState.errors.first_name && (
                      <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {profileForm.formState.errors.first_name.message}
                      </p>
                    )}
                  </div>

                  <div className="group">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                      Last Name
                    </label>
                    <input
                      {...profileForm.register('last_name')}
                      className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 backdrop-blur-sm group-hover:border-blue-300 dark:group-hover:border-blue-600"
                      placeholder="Enter your last name"
                    />
                    {profileForm.formState.errors.last_name && (
                      <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {profileForm.formState.errors.last_name.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Company Name */}
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-purple-500" />
                    Company Name
                  </label>
                  <input
                    {...profileForm.register('company_name')}
                    className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all duration-300 backdrop-blur-sm group-hover:border-purple-300 dark:group-hover:border-purple-600"
                    placeholder="Enter your company name"
                  />
                  {profileForm.formState.errors.company_name && (
                    <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {profileForm.formState.errors.company_name.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-1 disabled:hover:translate-y-0 disabled:hover:shadow-xl flex items-center justify-center gap-3 group"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Updating Profile...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    Save Profile Changes
                    <Sparkles className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Profile Stats & Activity */}
      <div className="space-y-8">
        {/* Account Stats */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Account Overview</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your account statistics and activity</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Member Since</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Account Status</p>
                    <p className="font-bold text-green-600 dark:text-green-400">Active</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Key className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Role</p>
                    <p className="font-bold text-purple-600 dark:text-purple-400">Master Admin</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl border border-orange-200/50 dark:border-orange-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Last Login</p>
                    <p className="font-bold text-orange-600 dark:text-orange-400">Today</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Quick Actions</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Frequently used account actions</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">Export Data</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Download account data</p>
                  </div>
                </div>
              </button>

              <button className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
                    <Copy className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">Copy Profile Link</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Share profile information</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Security Tab Component
  const renderSecurityTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
      {/* Password Change Card */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden group hover:shadow-3xl hover:shadow-red-500/20 transition-all duration-500">
        <div className="relative p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-pink-600/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Lock className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Shield className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Password Security
                </h3>
                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Fingerprint className="h-4 w-4" />
                  Change your password and manage security preferences
                </p>
              </div>
            </div>

            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
              <div className="space-y-6">
                {/* Current Password */}
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Key className="h-4 w-4 text-red-500" />
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      {...passwordForm.register('current_password')}
                      className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all duration-300 backdrop-blur-sm pr-12 group-hover:border-red-300 dark:group-hover:border-red-600"
                      placeholder="Enter your current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.current_password && (
                    <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {passwordForm.formState.errors.current_password.message}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-500" />
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      {...passwordForm.register('new_password')}
                      className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all duration-300 backdrop-blur-sm pr-12 group-hover:border-green-300 dark:group-hover:border-green-600"
                      placeholder="Enter your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.new_password && (
                    <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {passwordForm.formState.errors.new_password.message}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Password must be at least 8 characters long
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="group">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...passwordForm.register('confirm_password')}
                      className="w-full px-5 py-4 bg-gray-50/80 dark:bg-gray-700/50 border border-gray-200/50 dark:border-gray-600/50 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-300 backdrop-blur-sm pr-12 group-hover:border-blue-300 dark:group-hover:border-blue-600"
                      placeholder="Confirm your new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirm_password && (
                    <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {passwordForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Change Password Button */}
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="w-full px-8 py-4 bg-gradient-to-r from-red-600 via-pink-600 to-rose-600 hover:from-red-700 hover:via-pink-700 hover:to-rose-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold rounded-2xl shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/50 transition-all duration-300 hover:-translate-y-1 disabled:hover:translate-y-0 disabled:hover:shadow-xl flex items-center justify-center gap-3 group"
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Changing Password...
                  </>
                ) : (
                  <>
                    <Lock className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    Change Password
                    <Shield className="h-4 w-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Security Status & Settings */}
      <div className="space-y-8">
        {/* Security Status */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Security Status</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your account security overview</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Password Strength</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Strong password detected</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                  SECURE
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Fingerprint className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Enhanced security available</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-full transition-colors">
                  ENABLE
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Login Activity</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Monitor account access</p>
                  </div>
                </div>
                <button className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  VIEW
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security Actions */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Security Actions</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Advanced security management</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl border border-red-200/50 dark:border-red-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500 rounded-lg group-hover:scale-110 transition-transform">
                    <Trash2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">Revoke Sessions</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Sign out all devices</p>
                  </div>
                </div>
              </button>

              <button className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl border border-yellow-200/50 dark:border-yellow-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500 rounded-lg group-hover:scale-110 transition-transform">
                    <Download className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 dark:text-white">Security Report</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Download security audit</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Preferences Tab Component
  const renderPreferencesTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
      {/* Theme & Appearance */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden group hover:shadow-3xl hover:shadow-purple-500/20 transition-all duration-500">
        <div className="relative p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Palette className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Star className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Theme & Appearance
                </h3>
                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Customize your visual experience
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Theme Toggle */}
              <div className="p-6 bg-gradient-to-br from-gray-50/80 to-blue-50/80 dark:from-gray-700/50 dark:to-blue-900/20 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
                      {theme === 'dark' ? (
                        <Moon className="h-6 w-6 text-white" />
                      ) : (
                        <Sun className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        Theme Mode
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Currently using {theme === 'dark' ? 'Dark' : 'Light'} mode
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/50 transition-all duration-300 hover:-translate-y-1 flex items-center gap-3 group"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        Switch to Light
                      </>
                    ) : (
                      <>
                        <Moon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        Switch to Dark
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Display Settings */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-blue-500" />
                  Display Settings
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Animations</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Smooth transitions</p>
                      </div>
                      <div className="w-12 h-6 bg-blue-500 rounded-full relative cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 shadow-sm"></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">Compact Mode</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Reduce spacing</p>
                      </div>
                      <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative cursor-pointer">
                        <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications & Alerts */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden group hover:shadow-3xl hover:shadow-blue-500/20 transition-all duration-500">
        <div className="relative p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-600/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Bell className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">3</span>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Notifications
                </h3>
                <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Manage your notification preferences
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Notification Types */}
              <div className="space-y-4">
                {[
                  { id: 'email', label: 'Email Notifications', desc: 'Receive updates via email', icon: Mail, enabled: true },
                  { id: 'push', label: 'Push Notifications', desc: 'Browser notifications', icon: Smartphone, enabled: true },
                  { id: 'sms', label: 'SMS Alerts', desc: 'Critical alerts via SMS', icon: MessageSquare, enabled: false },
                  { id: 'desktop', label: 'Desktop Notifications', desc: 'System notifications', icon: Monitor, enabled: true }
                ].map((notification) => {
                  const Icon = notification.icon
                  return (
                    <div key={notification.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50/80 to-blue-50/80 dark:from-gray-700/50 dark:to-blue-900/20 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${notification.enabled ? 'bg-blue-500' : 'bg-gray-400'}`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{notification.label}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{notification.desc}</p>
                        </div>
                      </div>
                      <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${notification.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${notification.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Notification Schedule */}
              <div className="p-6 bg-gradient-to-br from-purple-50/80 to-pink-50/80 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">Quiet Hours</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Disable notifications during these hours</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">From</label>
                    <input type="time" value="22:00" className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-600 dark:text-gray-400">To</label>
                    <input type="time" value="08:00" className="w-full mt-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // System Tab Component
  const renderSystemTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
      {/* System Information */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-lg">
              <Cpu className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">System Information</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Current system status and metrics</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">System Status</p>
                    <p className="font-bold text-green-600 dark:text-green-400">Online</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-lg">
                    <HardDrive className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Storage Used</p>
                    <p className="font-bold text-gray-900 dark:text-white">2.4 GB</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <Wifi className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Connection</p>
                    <p className="font-bold text-purple-600 dark:text-purple-400">Stable</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-2xl border border-orange-200/50 dark:border-orange-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Database className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Database</p>
                    <p className="font-bold text-orange-600 dark:text-orange-400">Healthy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Settings */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <SettingsIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">System Settings</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Configure system preferences</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Auto-save Changes', desc: 'Automatically save form changes', enabled: true },
              { label: 'Debug Mode', desc: 'Enable detailed error logging', enabled: false },
              { label: 'Maintenance Mode', desc: 'Put system in maintenance', enabled: false },
              { label: 'API Rate Limiting', desc: 'Enable API request limits', enabled: true }
            ].map((setting, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-br from-gray-50/80 to-blue-50/80 dark:from-gray-700/50 dark:to-blue-900/20 rounded-2xl border border-gray-200/50 dark:border-gray-600/50">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{setting.label}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{setting.desc}</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${setting.enabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${setting.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  // Advanced Tab Component
  const renderAdvancedTab = () => (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
      {/* Developer Tools */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-gray-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Developer Tools</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Advanced configuration options</p>
            </div>
          </div>

          <div className="space-y-4">
            <button className="w-full p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
                  <Database className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Database Console</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Direct database access</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </button>

            <button className="w-full p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl border border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
                  <BarChart3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">API Analytics</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">View API usage statistics</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </button>

            <button className="w-full p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200/50 dark:border-purple-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                  <Edit3 className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">System Logs</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">View application logs</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-2xl rounded-3xl border border-red-200/50 dark:border-red-700/50 shadow-2xl shadow-red-900/10 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Irreversible actions - use with caution</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-red-50/80 to-pink-50/80 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl border border-red-200/50 dark:border-red-700/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400">Reset All Settings</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Restore default configuration</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Reset Settings
              </button>
            </div>

            <div className="p-4 bg-gradient-to-br from-red-50/80 to-pink-50/80 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl border border-red-200/50 dark:border-red-700/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-red-600 dark:text-red-400">Clear All Data</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Permanently delete all data</p>
                </div>
              </div>
              <button className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                <Trash2 className="h-4 w-4" />
                Clear Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-100/40 dark:from-gray-950 dark:via-slate-900 dark:to-indigo-950/30 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Fixed Header with Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Logo and Back Button */}
            <div className="flex items-center gap-6">
              <Link
                to="/master-admin"
                className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:scale-110 transition-transform" />
                <span className="font-semibold">Dashboard</span>
              </Link>

              <div className="flex items-center gap-3">
                <img src={athenasLogo} alt="ᗩTᕼᙓᑎᗩ'𝔖 Logo" className="h-10 w-10 rounded-xl shadow-lg" />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                    ᗩTᕼᙓᑎᗩ'𝔖
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Settings Panel</p>
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group"
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-yellow-500 group-hover:scale-110 transition-transform" />
                ) : (
                  <Moon className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                )}
              </button>

              <div className="px-4 py-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Clock className="h-4 w-4 text-blue-500" />
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 pt-24 pb-8">
        <div className="container mx-auto px-6 max-w-none">
        {/* Main Content Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl blur opacity-60 group-hover:opacity-80 transition duration-300"></div>
              <div className="relative h-16 w-16 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-all duration-300 group-hover:scale-105">
                <SettingsIcon className="h-8 w-8 text-white" />
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-black bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-white dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent mb-2">
                Advanced Settings
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-base flex items-center gap-3">
                <Shield className="h-4 w-4 text-blue-500" />
                Configure system preferences and security
                <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                  <Activity className="h-3 w-3" />
                  Online
                </div>
              </p>
            </div>
          </div>
        </div>

        {/* Modern Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl shadow-gray-900/5 p-3">
            <div className="flex flex-wrap gap-3">
              {[
                { id: 'profile', label: 'Profile', icon: User, color: 'from-blue-500 to-purple-600' },
                { id: 'security', label: 'Security', icon: Lock, color: 'from-red-500 to-pink-600' },
                { id: 'preferences', label: 'Preferences', icon: Palette, color: 'from-purple-500 to-indigo-600' },
                { id: 'system', label: 'System', icon: Cpu, color: 'from-green-500 to-teal-600' },
                { id: 'advanced', label: 'Advanced', icon: Zap, color: 'from-orange-500 to-yellow-600' }
              ].map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex-1 min-w-0 ${
                      isActive
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-lg hover:shadow-xl transform hover:scale-105`
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                    <span className="truncate">{tab.label}</span>
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg"></div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Tab Content with Animation - Full Width */}
        <div className={`transition-all duration-300 w-full ${isAnimating ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
          <div className="w-full max-w-none">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'security' && renderSecurityTab()}
            {activeTab === 'preferences' && renderPreferencesTab()}
            {activeTab === 'system' && renderSystemTab()}
            {activeTab === 'advanced' && renderAdvancedTab()}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

export default MasterAdminSettings
