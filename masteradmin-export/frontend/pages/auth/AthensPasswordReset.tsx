import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Save } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import toast from 'react-hot-toast'

const AthensPasswordReset: React.FC = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (formData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)

    try {
      const athensSession = sessionStorage.getItem('athens_admin_session')
      if (!athensSession) {
        toast.error('Session expired. Please login again.')
        navigate('/athens-login')
        return
      }

      const sessionData = JSON.parse(athensSession)
      console.log('Session data:', sessionData)
      
      const requestBody = {
        username: sessionData.username,
        old_password: formData.oldPassword,
        new_password: formData.newPassword
      }
      console.log('Request body:', requestBody)
      
      const response = await fetch('/api/athens-sust/auth/first-login-reset/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        toast.success('Password updated successfully!')
        // Update session to mark password as reset
        const updatedSession = { ...sessionData, must_reset_password: false }
        sessionStorage.setItem('athens_admin_session', JSON.stringify(updatedSession))
        // Redirect to Athens admin dashboard since password is now reset
        window.location.href = '/athens-admin'
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update password')
      }
    } catch (error) {
      toast.error('Password update failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-2xl shadow-lg mx-auto mb-4">
              🌱
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">Please change your temporary password</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPasswords.old ? 'text' : 'password'}
                  value={formData.oldPassword}
                  onChange={(e) => handleInputChange('oldPassword', e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder-gray-400"
                  placeholder="Enter current password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('old')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.old ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder-gray-400"
                  placeholder="Enter new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-10 border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all placeholder-gray-400"
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
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
                  <span>Updating...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Save className="h-5 w-5" />
                  <span>Update Password</span>
                </div>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Password must be at least 8 characters long
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AthensPasswordReset