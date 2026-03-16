import React from 'react'
import { X, Copy, Download, Key, Shield, AlertCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Modal } from '../ui/Modal'
import toast from 'react-hot-toast'

interface ServiceCredential {
  service_id: number
  service_name: string
  service_type: string
  password: string
}

interface ServiceCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  companyName: string
  userEmail: string
  serviceCredentials: ServiceCredential[]
  credentialsFile?: string
}

export const ServiceCredentialsModal: React.FC<ServiceCredentialsModalProps> = ({
  isOpen,
  onClose,
  companyName,
  userEmail,
  serviceCredentials,
  credentialsFile
}) => {
  if (!isOpen) return null

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`)
    }).catch(() => {
      toast.error('Failed to copy to clipboard')
    })
  }

  const copyAllCredentials = () => {
    const allCredentials = serviceCredentials.map(cred => 
      `Service: ${cred.service_name}\nType: ${cred.service_type}\nPassword: ${cred.password}`
    ).join('\n\n')
    
    const fullText = `SERVICE CREDENTIALS FOR ${companyName.toUpperCase()}
==================================================

Company: ${companyName}
User Email: ${userEmail}
Generated on: ${new Date().toLocaleString()}

SERVICE PASSWORDS:
--------------------

${allCredentials}

NOTE: These passwords expire in 90 days.
You can change them after logging into each service.`

    copyToClipboard(fullText, 'All credentials')
  }

  const downloadCredentials = () => {
    const allCredentials = serviceCredentials.map(cred => 
      `Service: ${cred.service_name}\nType: ${cred.service_type}\nPassword: ${cred.password}`
    ).join('\n\n')
    
    const content = `SERVICE CREDENTIALS FOR ${companyName.toUpperCase()}
==================================================

Company: ${companyName}
User Email: ${userEmail}
Generated on: ${new Date().toLocaleString()}

SERVICE PASSWORDS:
--------------------

${allCredentials}

NOTE: These passwords expire in 90 days.
You can change them after logging into each service.`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `service_credentials_${companyName.toLowerCase().replace(/\s+/g, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Credentials file downloaded!')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" className="max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Service Credentials Generated
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Company: {companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800 dark:text-amber-200">
                  Important Security Notice
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  These service passwords are shown only once. Please save them securely and share them with the company user through a secure channel.
                </p>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Company Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Company Name:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{companyName}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">User Email:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{userEmail}</span>
              </div>
            </div>
          </div>

          {/* Service Credentials */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">Service Passwords</h3>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyAllCredentials}
                  className="flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy All</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadCredentials}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {serviceCredentials.map((credential) => (
                <Card key={credential.service_id} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                          <Key className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{credential.service_name}</CardTitle>
                          <CardDescription>Type: {credential.service_type}</CardDescription>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(credential.password, `${credential.service_name} password`)}
                        className="flex items-center space-x-2"
                      >
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Password:</span>
                        <span className="font-bold text-gray-900 dark:text-white tracking-wider">
                          {credential.password}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* File Info */}
          {credentialsFile && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Credentials File Saved
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                A backup file has been saved on the server: <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded">{credentialsFile}</code>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
    </Modal>
  )
}
