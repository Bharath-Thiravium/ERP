import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'

const AthensServiceLogin: React.FC = () => {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username || !formData.password) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      const result = await login(formData, 'athens')
      
      if (result === true) {
        toast.success('Login successful!')
        const sessionRaw = sessionStorage.getItem('athens_admin_session')
        const session = sessionRaw ? JSON.parse(sessionRaw) : null
        if (session?.must_reset_password) {
          navigate('/athens-password-reset', { replace: true })
          return
        }
        // Navigate to Athens admin dashboard
        navigate('/athens-admin', { replace: true })
      } else if (typeof result === 'object' && result.requires_2fa) {
        // Handle 2FA if needed
        toast.error('2FA required')
      }
    } catch (error: any) {
      console.error('Athens login error:', error)
      toast.error(error.response?.data?.error || 'Login failed. Please try again.')
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/service-login')}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Services</span>
        </button>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-2xl shadow-lg mx-auto mb-4">
              🌱
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Athens Sustainability</h1>
            <p className="text-gray-600">Project Admin Login</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder-gray-400"
                  placeholder="Enter your username"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder-gray-400"
                  placeholder="Enter your password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <LogIn className="h-5 w-5" />
                  <span>Sign In</span>
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Use your Athens project admin credentials
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AthensServiceLogin
