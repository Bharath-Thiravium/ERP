import React, { useState } from 'react'
import { Smartphone, QrCode, Key, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'

const TwoFactorAuth: React.FC = () => {
  const [step, setStep] = useState<'setup' | 'verify' | 'enabled'>('setup')
  const [verificationCode, setVerificationCode] = useState('')
  const [qrCodeUrl] = useState('') // Will be populated from backend

  const handleEnable2FA = () => {
    // API call to enable 2FA
    setStep('verify')
  }

  const handleVerify = () => {
    // API call to verify code
    if (verificationCode.length === 6) {
      setStep('enabled')
    }
  }

  const handleDisable2FA = () => {
    // API call to disable 2FA
    setStep('setup')
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
                <Button size="sm" variant="outline">Generate Codes</Button>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2">Trusted Devices</h4>
                <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">Manage devices that skip 2FA</p>
                <Button size="sm" variant="outline">Manage Devices</Button>
              </div>
            </div>

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

  if (step === 'verify') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Key className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>Verify Two-Factor Authentication</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Enter the 6-digit code from your authenticator app
              </p>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-32 text-center text-2xl font-mono px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={() => setStep('setup')}>
                Back
              </Button>
              <Button 
                onClick={handleVerify}
                disabled={verificationCode.length !== 6}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Verify & Enable
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
            <div className="mb-6">
              <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-lg mx-auto flex items-center justify-center mb-4">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code" className="w-28 h-28" />
                ) : (
                  <QrCode className="h-16 w-16 text-gray-400" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan this QR code with your authenticator app
              </p>
            </div>

            <div className="space-y-4">
              <div className="text-left">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Download an authenticator app (Google Authenticator, Authy, etc.)</li>
                  <li>Scan the QR code above with your app</li>
                  <li>Enter the 6-digit code from your app to verify</li>
                </ol>
              </div>

              <Button onClick={handleEnable2FA} className="bg-blue-600 hover:bg-blue-700">
                <Smartphone className="h-4 w-4 mr-2" />
                Setup 2FA
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default TwoFactorAuth