import React, { useState } from 'react'
import { Key, Download, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'

const RecoveryCodes: React.FC = () => {
  const [codes, setCodes] = useState<string[]>([])
  const [isGenerated, setIsGenerated] = useState(false)
  const [usedCodes] = useState<string[]>([]) // Will track used codes

  const generateCodes = () => {
    // Generate 10 random recovery codes
    const newCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    )
    setCodes(newCodes)
    setIsGenerated(true)
  }

  const downloadCodes = () => {
    const codesText = `
ATHENA'S SAP SYSTEM - RECOVERY CODES
====================================

Company: Your Company
Generated: ${new Date().toLocaleString()}

IMPORTANT: Keep these codes secure and confidential!

Recovery Codes:
${codes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Instructions:
- Each code can only be used once
- Use these codes if you lose access to your 2FA device
- Store these codes in a secure location
- Generate new codes if you suspect they are compromised

====================================
ATHENA'S SAP Enterprise System
Website: https://athenas.co.in
====================================
`.trim()

    const blob = new Blob([codesText], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `recovery-codes-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  const regenerateCodes = () => {
    if (confirm('Are you sure you want to regenerate recovery codes? This will invalidate all existing codes.')) {
      generateCodes()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Key className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <span>Recovery Codes</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!isGenerated ? (
            <div className="text-center py-8">
              <Key className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Generate Recovery Codes</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create backup codes that can be used to access your account if you lose your 2FA device
              </p>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    <p className="font-medium mb-1">Important Security Notes:</p>
                    <ul className="space-y-1 text-left">
                      <li>• Each code can only be used once</li>
                      <li>• Store codes in a secure location</li>
                      <li>• Don't share codes with anyone</li>
                      <li>• Generate new codes if compromised</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button onClick={generateCodes} className="bg-yellow-600 hover:bg-yellow-700">
                <Key className="h-4 w-4 mr-2" />
                Generate Recovery Codes
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-medium text-green-900 dark:text-green-100">Recovery Codes Generated</p>
                    <p className="text-sm text-green-700 dark:text-green-300">Save these codes in a secure location</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <div className="grid grid-cols-2 gap-3">
                  {codes.map((code, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg font-mono text-center ${
                        usedCodes.includes(code)
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 line-through'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {index + 1}. {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <p className="font-medium mb-1">Critical Security Warning:</p>
                    <p>These codes will only be shown once. Download and store them securely before leaving this page.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button onClick={downloadCodes} className="bg-blue-600 hover:bg-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Download Codes
                </Button>
                <Button onClick={regenerateCodes} variant="outline" className="text-yellow-600 border-yellow-300 hover:bg-yellow-50">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate Codes
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Remaining codes: <span className="font-medium">{codes.length - usedCodes.length}</span> of {codes.length}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default RecoveryCodes