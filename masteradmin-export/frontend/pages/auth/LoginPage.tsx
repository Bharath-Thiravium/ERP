import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Shield, Building2, Mail, Lock, ExternalLink, Sparkles, Zap, Globe, ArrowRight, Users } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import SecurityAlerts from '../../components/auth/SecurityAlerts'
import AccountLockoutWarning from '../../components/auth/AccountLockoutWarning'
import PasswordExpiryWarning from '../../components/auth/PasswordExpiryWarning'
import TrustedDeviceOption from '../../components/auth/TrustedDeviceOption'
import athenasLogo from '../../assets/logo.jpeg'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const [userType, setUserType] = useState<'master' | 'company' | 'service'>('master')
  const [showPassword, setShowPassword] = useState(false)
  const [isAnimating, setIsAnimating] = useState(true)
  const [rememberDevice, setRememberDevice] = useState(false)
  const [hasFailedAttempt, setHasFailedAttempt] = useState(false)

  // Check for Athens service parameter and auto-select company user type
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('service') === 'athens_sustainability') {
      setUserType('company')
    }
  }, [])

  const { 
    login, 
    isLoading, 
    error, 
    accountLocked, 
    remainingAttempts, 
    lockoutExpiresAt,
    passwordExpiresInDays,
    passwordExpiresAt,
    securityAlerts,
    isAuthenticated,
    user
  } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Auto-redirect when authentication state changes (only for successful login, not 2FA)
  useEffect(() => {
    console.log('🔍 Auth state changed:', { isAuthenticated, user, isLoading })
    if (isAuthenticated && user && !isLoading) {
      console.log('🔍 Redirecting user:', user)
      // Force immediate navigation
      if (user.is_master_admin) {
        window.location.href = '/master-admin'
      } else if (user.is_company_user) {
        window.location.href = '/company'
      }
    }
  }, [isAuthenticated, user, isLoading])

  useEffect(() => {
    setTimeout(() => setIsAnimating(false), 500)
  }, [])

  const onSubmit = async (data: LoginFormData) => {
    if (userType === 'service') {
      navigate('/service-login')
      return
    }

    const result = await login(data, userType as 'master' | 'company', rememberDevice)
    
    if (result === true) {
      reset()
      setHasFailedAttempt(false)
      // Navigation will be handled by useEffect when auth state updates
    } else if (result && typeof result === 'object' && 'requires_2fa' in result && result.requires_2fa === true) {
      setHasFailedAttempt(false)
      sessionStorage.setItem('2fa_credentials', JSON.stringify({
        credentials: data,
        userType: userType as 'master' | 'company'
      }))
      // Force immediate navigation to 2FA page
      window.location.replace('/2fa')
    } else {
      setHasFailedAttempt(true)
    }
  }



  const handleServiceUserAccess = () => {
    navigate('/service-login') // This will show service selection first
  }

  const handleUserTypeChange = (type: 'master' | 'company' | 'service') => {
    setUserType(type)
    reset()
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 dark:from-black dark:via-purple-950 dark:to-black">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/30 to-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/30 to-pink-600/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            ></div>
          ))}
        </div>
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
        <div className={`w-full max-w-6xl grid lg:grid-cols-2 gap-12 items-center transition-all duration-1000 ${isAnimating ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
          
          {/* Left Side - Branding & Info */}
          <div className="text-center lg:text-left space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-center lg:justify-start space-x-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-600 rounded-2xl blur-lg opacity-75 animate-pulse"></div>
                  <img
                    src={athenasLogo}
                    alt="ᗩTᕼᙓᑎᗩ'𝔖 Logo"
                    className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-2xl object-cover border-2 border-white/20 shadow-2xl"
                  />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-6xl font-athenas tracking-wider leading-none">
                    <span className="text-white text-shadow-lg">ᗩTᕼᙓᑎᗩ</span>
                    <span className="text-green-400 text-shadow-lg athenas-glow">'𝔖</span>
                  </h1>
                  <p className="text-lg lg:text-xl text-blue-200 font-medium mt-2">Enterprise Solutions</p>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl lg:text-4xl font-bold text-white leading-tight">
                  Next-Generation
                  <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Enterprise Solutions
                  </span>
                </h2>
                <p className="text-lg text-gray-300 max-w-lg mx-auto lg:mx-0">
                  Empowering businesses with cutting-edge enterprise technology and intelligent automation for the digital future.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0">
                <div className="flex items-center space-x-2 text-blue-200">
                  <Zap className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-medium">Lightning Fast</span>
                </div>
                <div className="flex items-center space-x-2 text-purple-200">
                  <Shield className="h-5 w-5 text-purple-400" />
                  <span className="text-sm font-medium">Ultra Secure</span>
                </div>
                <div className="flex items-center space-x-2 text-pink-200">
                  <Sparkles className="h-5 w-5 text-pink-400" />
                  <span className="text-sm font-medium">AI Powered</span>
                </div>
              </div>

              <div className="pt-4">
                <a 
                  href="https://athenas.co.in" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-white/20 rounded-2xl text-white hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-300 group"
                >
                  <Globe className="h-5 w-5 text-blue-400" />
                  <span className="font-medium">Visit ᗩTᕼᙓᑎᗩ'𝔖.co.in</span>
                  <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 rounded-3xl blur-xl"></div>
              
              <div className="relative bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 shadow-2xl">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-2xl border border-white/20 mb-4">
                    <Shield className="h-5 w-5 text-blue-400" />
                    <span className="text-white font-medium">Secure Access Portal</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">Welcome Back</h3>
                  <p className="text-gray-300">
                    {new URLSearchParams(window.location.search).get('service') === 'athens_sustainability' 
                      ? 'Sign in to Athens Sustainability Management'
                      : 'Sign in to access your workspace'
                    }
                  </p>
                  {new URLSearchParams(window.location.search).get('service') === 'athens_sustainability' && (
                    <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1 bg-green-600/20 border border-green-500/30 rounded-xl">
                      <span className="text-lg">🌱</span>
                      <span className="text-green-200 text-sm font-medium">Athens Sustainability</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                  <button
                    onClick={() => handleUserTypeChange('master')}
                    className={`relative p-4 rounded-2xl border transition-all duration-300 group ${
                      userType === 'master'
                        ? 'border-blue-400 bg-gradient-to-r from-blue-600/30 to-purple-600/30 text-white shadow-lg shadow-blue-500/25'
                        : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        userType === 'master' 
                          ? 'bg-blue-500/30' 
                          : 'bg-white/10 group-hover:bg-white/20'
                      }`}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-semibold">Master Admin</div>
                      <div className="text-xs opacity-75">System Control</div>
                    </div>
                    {userType === 'master' && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-pulse"></div>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleUserTypeChange('company')}
                    className={`relative p-4 rounded-2xl border transition-all duration-300 group ${
                      userType === 'company'
                        ? 'border-purple-400 bg-gradient-to-r from-purple-600/30 to-pink-600/30 text-white shadow-lg shadow-purple-500/25'
                        : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        userType === 'company' 
                          ? 'bg-purple-500/30' 
                          : 'bg-white/10 group-hover:bg-white/20'
                      }`}>
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-semibold">Company User</div>
                      <div className="text-xs opacity-75">Business Access</div>
                    </div>
                    {userType === 'company' && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-400/20 to-pink-400/20 animate-pulse"></div>
                    )}
                  </button>

                  <button
                    onClick={() => handleUserTypeChange('service')}
                    className={`relative p-4 rounded-2xl border transition-all duration-300 group ${
                      userType === 'service'
                        ? 'border-green-400 bg-gradient-to-r from-green-600/30 to-emerald-600/30 text-white shadow-lg shadow-green-500/25'
                        : 'border-white/20 bg-white/5 text-gray-300 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`p-2 rounded-xl transition-all duration-300 ${
                        userType === 'service'
                          ? 'bg-green-500/30'
                          : 'bg-white/10 group-hover:bg-white/20'
                      }`}>
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="text-sm font-semibold">Service User</div>
                      <div className="text-xs opacity-75">Service Access</div>
                    </div>
                    {userType === 'service' && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400/20 to-emerald-400/20 animate-pulse"></div>
                    )}
                  </button>
                </div>

                {/* Phase 2: Security Components */}
                <SecurityAlerts alerts={securityAlerts} />
                {/* Only show lockout warning after failed attempts or if actually locked */}
                {(hasFailedAttempt || accountLocked) && (
                  <AccountLockoutWarning 
                    isLocked={accountLocked}
                    remainingAttempts={remainingAttempts || undefined}
                    lockoutExpiresAt={lockoutExpiresAt || undefined}
                  />
                )}
                <PasswordExpiryWarning 
                  expiresInDays={passwordExpiresInDays || undefined}
                  expiresAt={passwordExpiresAt || undefined}
                />

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-2xl backdrop-blur-md">
                    <p className="text-red-200 text-sm text-center">{error}</p>
                  </div>
                )}

                {/* Login Content */}
                {userType === 'service' ? (
                  <div className="space-y-6">
                    <div className="p-6 bg-green-500/20 border border-green-500/30 rounded-2xl backdrop-blur-md text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/30 rounded-2xl mb-4">
                        <Users className="h-8 w-8 text-green-400" />
                      </div>
                      <h3 className="text-xl font-bold text-green-200 mb-2">Service User Access</h3>
                      <p className="text-green-200/80 text-sm">
                        Access specialized dashboards for Finance, HR, Inventory, and other business services.
                      </p>
                    </div>

                    <button
                      onClick={handleServiceUserAccess}
                      className="w-full relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 group-hover:scale-[1.02] transform">
                        <Users className="h-5 w-5" />
                        <span>Access Service Login Portal</span>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                      </div>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('email')}
                          type="email"
                          autoComplete="email"
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-md transition-all duration-300"
                          placeholder="Enter your email"
                        />
                      </div>
                      {errors.email && (
                        <p className="text-red-400 text-sm">{errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-200">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          {...register('password')}
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/20 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-md transition-all duration-300"
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-white transition-colors duration-200"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-red-400 text-sm">{errors.password.message}</p>
                      )}
                    </div>

                    {/* Trusted Device Option - for both master admin and company users */}
                    {(userType === 'master' || userType === 'company') && (
                      <TrustedDeviceOption
                        isTrustedDevice={rememberDevice}
                        onToggleTrustedDevice={setRememberDevice}
                        disabled={isLoading || accountLocked}
                      />
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || accountLocked}
                      className="w-full relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl blur-lg opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center space-x-2 group-hover:scale-[1.02] transform">
                        {isLoading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Signing In...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span>Sign In</span>
                            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                          </div>
                        )}
                      </div>
                    </button>
                  </form>
                )}

                {/* Additional Info */}
                <div className="mt-8 text-center">
                  <p className="text-gray-400 text-sm">
                    {userType === 'master' && 'System Administrator Access'}
                    {userType === 'company' && 'Company User Access'}
                    {userType === 'service' && 'Service-Specific User Access'}
                  </p>
                  {userType === 'service' && (
                    <p className="text-gray-500 text-xs mt-2">
                      Access specialized dashboards for Finance, HR, Inventory, and more
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-center space-x-2 text-xs text-gray-500">
                    <Shield className="h-3 w-3" />
                    <span>Secured with enterprise-grade encryption</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center">
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span>© 2025 ᗩTᕼᙓᑎᗩ'𝔖 Technologies</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>Powered by ᗩTᕼᙓᑎᗩ'𝔖</span>
            <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>All rights reserved</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
