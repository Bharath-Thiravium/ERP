import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Smartphone, Key, AlertTriangle, Shield, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import athenasLogo from '../../assets/logo.jpeg'

const twoFactorSchema = z.object({
  totp_code: z.string().optional(),
  recovery_code: z.string().optional(),
}).refine((data) => data.totp_code || data.recovery_code, {
  message: "Either 2FA code or recovery code is required",
  path: ["totp_code"],
})

type TwoFactorFormData = z.infer<typeof twoFactorSchema>

interface StoredCredentials {
  credentials: { email: string; password: string }
  userType: 'master' | 'company'
}

const TwoFactorPage: React.FC = () => {
  const navigate = useNavigate()
  const [use2FARecovery, setUse2FARecovery] = useState(false)
  const [storedData, setStoredData] = useState<StoredCredentials | null>(null)
  const { login, isLoading, error, isAuthenticated, user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  
  // Redirect if already authenticated (after 2FA completion)
  React.useEffect(() => {
    if (isAuthenticated && user) {
      // Use window.location for reliable navigation after 2FA
      setTimeout(() => {
        if (user.is_master_admin) {
          window.location.replace('/master-admin')
        } else if (user.is_company_user) {
          window.location.replace('/company')
        }
      }, 100)
    }
  }, [isAuthenticated, user])
  
  // Get credentials from sessionStorage
  React.useEffect(() => {
    const stored = sessionStorage.getItem('2fa_credentials')
    if (stored) {
      try {
        const data = JSON.parse(stored) as StoredCredentials
        setStoredData(data)
      } catch (error) {
        navigate('/login')
      }
    } else {
      navigate('/login')
    }
  }, [navigate])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TwoFactorFormData>({
    resolver: zodResolver(twoFactorSchema),
  })

  const onSubmit = async (data: TwoFactorFormData) => {
    if (!storedData?.credentials) return

    const loginData = {
      ...storedData.credentials,
      totp_code: data.totp_code || '',
      recovery_code: data.recovery_code || ''
    }

    const success = await login(loginData, storedData.userType)
    if (success === true) {
      reset()
      // Clear stored credentials
      sessionStorage.removeItem('2fa_credentials')
      
      // Let the auth state change trigger navigation
      // Navigation will be handled by the auth state useEffect
    }
  }

  const handleBack = () => {
    sessionStorage.removeItem('2fa_credentials')
    navigate('/login', { replace: true })
  }

  if (!storedData?.credentials) {
    return null
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/30 to-pink-600/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 group z-50"
      >
        <div className="relative">
          {theme === 'light' ? (
            <div className="text-yellow-300 group-hover:rotate-180 transition-transform duration-500">🌙</div>
          ) : (
            <div className="text-yellow-400 group-hover:rotate-180 transition-transform duration-500">☀️</div>
          )}
        </div>
      </button>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-xl"></div>
            
            <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <img
                    src={athenasLogo}
                    alt="ᗩTᕼᙓᑎᗩ'𝔖 Logo"
                    className="w-12 h-12 rounded-xl object-cover border border-white/20"
                  />
                  <h1 className="text-2xl font-athenas text-white">
                    ᗩTᕼᙓᑎᗩ<span className="text-green-400">'𝔖</span>
                  </h1>
                </div>
                
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/30 rounded-2xl mb-4">
                  <Smartphone className="h-8 w-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Two-Factor Authentication</h3>
                <p className="text-gray-300 text-sm">
                  {use2FARecovery ? 'Enter your recovery code' : 'Enter the 6-digit code from your authenticator app'}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl backdrop-blur-md">
                  <p className="text-red-200 text-sm text-center">{error}</p>
                </div>
              )}

              {/* 2FA Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {!use2FARecovery ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-200">
                      Authenticator Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Smartphone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('totp_code')}
                        type="text"
                        maxLength={6}
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-md transition-all duration-300 text-center text-2xl tracking-widest"
                        placeholder="000000"
                      />
                    </div>
                    {errors.totp_code && (
                      <p className="text-red-400 text-sm">{errors.totp_code.message}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-200">
                      Recovery Code
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Key className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        {...register('recovery_code')}
                        type="text"
                        className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 backdrop-blur-md transition-all duration-300"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                      />
                    </div>
                    {errors.recovery_code && (
                      <p className="text-red-400 text-sm">{errors.recovery_code.message}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setUse2FARecovery(!use2FARecovery)}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {use2FARecovery ? 'Use authenticator app instead' : 'Use recovery code instead'}
                  </button>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 group-hover:scale-[1.02] transform">
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Verifying...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Shield className="h-5 w-5" />
                          <span>Verify & Sign In</span>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full py-3 px-6 bg-white/5 border border-white/20 rounded-2xl text-gray-300 hover:bg-white/10 transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Login</span>
                  </button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-2xl backdrop-blur-md">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-yellow-200 text-sm">
                    <p className="font-medium mb-1">Security Notice:</p>
                    <p>If you've lost access to your authenticator app, use a recovery code. Contact support if you need assistance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TwoFactorPage