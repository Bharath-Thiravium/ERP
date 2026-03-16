import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { apiClient } from '../../lib/api'
import { Modal } from '../ui/Modal'

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(12, 'Password must be at least 12 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).+$/,
      'Password must contain uppercase, lowercase, number and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>

interface PasswordChangeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  isForced?: boolean
  title?: string
  message?: string
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isForced = false,
  title,
  message
}) => {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChanging, setIsChanging] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset
  } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema)
  })

  const newPassword = watch('newPassword')

  if (!isOpen) return null

  const onSubmit = async (data: PasswordChangeFormData) => {
    try {
      setIsChanging(true)
      
      await apiClient.changeCompanyUserPassword({
        current_password: data.currentPassword,
        new_password: data.newPassword,
        confirm_password: data.confirmPassword,
        force_logout_all: true
      })

      toast.success('Password changed successfully!')
      reset()
      onSuccess()
    } catch (error: any) {
      console.error('Password change error:', error)
      const data = error.response?.data
      const firstFieldError = data && typeof data === 'object'
        ? Array.isArray(Object.values(data)[0])
          ? (Object.values(data)[0] as any[])[0]
          : Object.values(data)[0]
        : undefined
      const message = data?.error || data?.message || firstFieldError || 'Failed to change password'
      toast.error(message)
    } finally {
      setIsChanging(false)
    }
  }

  const getPasswordStrength = (password: string) => {
    if (!password) return { strength: 0, label: '', color: '' }
    
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[@$!%*?&]/.test(password)) strength++

    const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong']
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
    
    return {
      strength,
      label: labels[strength - 1] || 'Very Weak',
      color: colors[strength - 1] || 'bg-red-500'
    }
  }

  const passwordStrength = getPasswordStrength(newPassword || '')

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      className="max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
      bodyClassName="p-0"
      maskClosable={!isForced}
      disableEsc={isForced}
    >
      <div className="relative w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-xl ${isForced ? 'bg-red-100 dark:bg-red-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}`}>
                {isForced ? (
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                ) : (
                  <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {title || (isForced ? 'Password Change Required' : 'Change Password')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {message || (isForced ? 'You must change your password to continue' : 'Update your account password')}
                </p>
              </div>
            </div>
            {!isForced && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {isForced && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                      Password Reset Required
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {message || 'Your password has been reset by an administrator. Please create a new secure password to continue using the system.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Current Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('currentPassword')}
                    type={showCurrentPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-red-500 text-sm">{errors.currentPassword.message}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('newPassword')}
                    type={showNewPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-red-500 text-sm">{errors.newPassword.message}</p>
                )}
                
                {/* Password Strength Indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Password Strength:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.strength >= 4 ? 'text-green-600' : 
                        passwordStrength.strength >= 3 ? 'text-blue-600' :
                        passwordStrength.strength >= 2 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Password Requirements */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Password Requirements:
                </h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className={`h-3 w-3 ${newPassword?.length >= 8 ? 'text-green-500' : 'text-gray-400'}`} />
                    <span>At least 8 characters</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className={`h-3 w-3 ${/[A-Z]/.test(newPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
                    <span>One uppercase letter</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className={`h-3 w-3 ${/[a-z]/.test(newPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
                    <span>One lowercase letter</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className={`h-3 w-3 ${/\d/.test(newPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
                    <span>One number</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className={`h-3 w-3 ${/[@$!%*?&]/.test(newPassword || '') ? 'text-green-500' : 'text-gray-400'}`} />
                    <span>One special character (@$!%*?&)</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {!isForced && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isChanging}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isChanging}
                  className={`${isForced ? 'w-full' : 'flex-1'} bg-blue-600 hover:bg-blue-700 text-white`}
                >
                  {isChanging ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Changing...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4" />
                      <span>Change Password</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </div>
      </div>
    </Modal>
  )
}

export default PasswordChangeModal
