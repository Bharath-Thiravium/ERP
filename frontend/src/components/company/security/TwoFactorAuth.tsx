import React, { useState, useEffect } from 'react'
import { Smartphone, QrCode, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { apiClient } from '../../../lib/api'
import toast from 'react-hot-toast'

interface TwoFactorAuthProps {
  onNavigateToTab?: (tabId: string) => void
}

const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ onNavigateToTab }) => {
  const [step, setStep] = useState<'setup' | 'verify' | 'enabled'>('setup')
  const [verificationCode, setVerificationCode] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [recoveryCodesVisible, setRecoveryCodesVisible] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  // Removed unused useAuthStore import

  useEffect(() => {
    checkTwoFactorStatus()
  }, [])

  const checkTwoFactorStatus = async () => {
    try {
      const response = await apiClient.get('/api/company-dashboard/security/2fa/status/')
      if (response.data.two_factor_enabled) {
        setStep('enabled')
      }
    } catch (error) {
      console.error('Error checking 2FA status:', error)
    }
  }

  const handleEnable2FA = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post('/api/company-dashboard/security/2fa/setup/')
      console.log('2FA Setup Response:', response.data)
      setQrCodeUrl(response.data.qr_code)
      toast.success('QR code generated! Scan it with your authenticator app.')
    } catch (error: any) {
      console.error('2FA Setup Error:', error)
      toast.error(error.response?.data?.error || 'Failed to setup 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit code')
      return
    }
    
    setLoading(true)
    try {
      const response = await apiClient.post('/api/company-dashboard/security/2fa/verify/', {
        code: verificationCode
      })
      setRecoveryCodes(response.data.recovery_codes || [])
      setRecoveryCodesVisible(true)
      setStep('enabled')
      toast.success('2FA enabled successfully!')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    const password = prompt('Enter your password to disable 2FA:')
    if (!password) return
    
    setLoading(true)
    try {
      await apiClient.post('/api/company-dashboard/security/2fa/disable/', {
        password
      })
      setStep('setup')
      setQrCodeUrl('')
      setVerificationCode('')
      toast.success('2FA disabled successfully')
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'enabled') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span>Two-Factor Authentication Enabled</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">2FA is Active</p>
                  <p className="text-sm text-green-700 dark:text-green-300">Your account is protected with two-factor authentication</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Backup Codes</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">Generate backup codes for emergency access</p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => onNavigateToTab?.('recovery')}
                >
                  Generate Codes
                </Button>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Trusted Devices</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">Manage devices that skip 2FA</p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    onNavigateToTab?.('advanced')
                    // Set advanced security to devices tab
                    setTimeout(() => {
                      const advancedSecurityElement = document.querySelector('[data-tab="devices"]')
                      if (advancedSecurityElement) {
                        (advancedSecurityElement as HTMLElement).click()
                      }
                    }, 100)
                  }}
                >
                  Manage Devices
                </Button>
              </div>
            </div>

            {recoveryCodesVisible && recoveryCodes.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-3">Recovery Codes - Save These Securely!</h4>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {recoveryCodes.map((code, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border font-mono text-sm">
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(recoveryCodes.join('\n'))
                    toast.success('Recovery codes copied to clipboard!')
                  }}>
                    Copy All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRecoveryCodesVisible(false)}>
                    Hide Codes
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" onClick={handleDisable2FA} className="text-red-600 border-red-300 hover:bg-red-50">
                Disable 2FA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Smartphone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span>Enable Two-Factor Authentication</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Enhanced Security</p>
                <p>Two-factor authentication adds an extra layer of security to your account by requiring a code from your mobile device.</p>
              </div>
            </div>
          </div>

          <div className="text-center">
            {qrCodeUrl ? (
              <div className="mb-6">
                <div className="w-64 h-64 bg-white dark:bg-gray-800 rounded-lg mx-auto flex items-center justify-center mb-4 border border-gray-200 dark:border-gray-600">
                  <img src={qrCodeUrl} alt="QR Code" className="w-60 h-60 object-contain" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Scan this QR code with your authenticator app
                </p>
                <div className="mb-4">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-32 text-center text-2xl font-mono px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="000000"
                    maxLength={6}
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
                <div className="flex justify-center space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setQrCodeUrl('')
                      setVerificationCode('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleVerify}
                    disabled={verificationCode.length !== 6 || loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enable'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="w-64 h-64 bg-gray-100 dark:bg-gray-800 rounded-lg mx-auto flex items-center justify-center mb-4">
                  <QrCode className="h-16 w-16 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Click the button below to generate your QR code
                </p>
              </div>
            )}

            {!qrCodeUrl && (
              <div className="space-y-4">
                <div className="text-left">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Setup Instructions:</h4>
                  <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                    <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                    <li>Click "Setup 2FA" to generate your QR code</li>
                    <li>Scan the QR code with your app</li>
                    <li>Enter the 6-digit code from your app to verify</li>
                  </ol>
                </div>

                <Button 
                  onClick={handleEnable2FA} 
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  {loading ? 'Setting up...' : 'Setup 2FA'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TwoFactorAuth