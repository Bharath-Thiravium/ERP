import React, { useState } from 'react'
import { X, Key, Download, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { apiClient } from '../../lib/api'
import { Modal } from '../ui/Modal'

interface CompanyPasswordResetModalProps {
  isOpen: boolean
  onClose: () => void
  company: any
}

const CompanyPasswordResetModal: React.FC<CompanyPasswordResetModalProps> = ({
  isOpen,
  onClose,
  company
}) => {
  const [isResetting, setIsResetting] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const [credentialsData, setCredentialsData] = useState<any>(null)

  if (!isOpen || !company) return null

  const handleResetPassword = async () => {
    try {
      setIsResetting(true)
      
      const response = await apiClient.resetCompanyPassword(company.id)
      
      // Backend returns data directly in response.data
      if (response.data) {
        setCredentialsData(response.data)
        setResetComplete(true)
        toast.success('Password reset successfully! New credentials generated.')
      } else {
        toast.error('Failed to reset password')
      }
    } catch (error: any) {
      console.error('Password reset error:', error)
      const message = error.response?.data?.error || error.response?.data?.message || 'Failed to reset password'
      toast.error(message)
    } finally {
      setIsResetting(false)
    }
  }

  const handleDownloadCredentials = () => {
    if (!credentialsData) return

    const credentialsText = `Company Login Credentials
========================

Company: ${company.name}
Email: ${company.email}
Username: ${credentialsData.credentials?.username}
New Password: ${credentialsData.credentials?.password}

IMPORTANT SECURITY NOTICE:
- This password is temporary and must be changed on first login
- Please store this information securely
- Delete this file after the password has been changed
- Generated on: ${new Date().toLocaleString()}

ᗩTᕼᙓᑎᗩ'𝔖 Enterprise System
`

    const blob = new Blob([credentialsText], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = credentialsData.credentials_file || `${company.name.replace(/\s+/g, '_')}_credentials_${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    toast.success('Credentials file downloaded successfully')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
                <Key className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Reset Company Password
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {company.name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!resetComplete ? (
              <div className="space-y-6">
                {/* Warning */}
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-2">
                        Security Warning
                      </h3>
                      <ul className="text-sm text-orange-700 dark:text-orange-400 space-y-1">
                        <li>• This will generate a new temporary password</li>
                        <li>• The company will be forced to change password on next login</li>
                        <li>• Current sessions will remain active until logout</li>
                        <li>• A credentials file will be generated for download</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Company Info */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Company Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{company.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Email:</span>
                      <span className="font-medium text-gray-900 dark:text-white">{company.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Status:</span>
                      <span className="font-medium text-green-600 dark:text-green-400 capitalize">
                        {company.approval_status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                    disabled={isResetting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleResetPassword}
                    disabled={isResetting}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isResetting ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Resetting...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Key className="h-4 w-4" />
                        <span>Reset Password</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success Message */}
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Password Reset Complete
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    New temporary password has been generated for {company.name}
                  </p>
                </div>

                {/* Credentials Info */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-3">
                    New Credentials
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-400">Email:</span>
                      <span className="font-mono text-green-900 dark:text-green-200">{company.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700 dark:text-green-400">Password:</span>
                      <span className="font-mono text-green-900 dark:text-green-200 bg-green-100 dark:bg-green-800/30 px-2 py-1 rounded">
                        {credentialsData?.credentials?.password}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Important Notes */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Important Notes
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• Company must change password on next login</li>
                    <li>• Download credentials file for secure sharing</li>
                    <li>• Current sessions remain active until logout</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleDownloadCredentials}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <div className="flex items-center space-x-2">
                      <Download className="h-4 w-4" />
                      <span>Download Credentials</span>
                    </div>
                  </Button>
                </div>
              </div>
            )}
          </div>
    </Modal>
  )
}

export default CompanyPasswordResetModal