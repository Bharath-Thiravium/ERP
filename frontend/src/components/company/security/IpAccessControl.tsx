import React, { useState } from 'react'
import { Globe, Plus, Trash2, Shield, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'

const IpAccessControl: React.FC = () => {
  const [ipRestrictions] = useState([
    {
      id: 1,
      ipAddress: '192.168.1.0/24',
      type: 'allow',
      description: 'Office Network',
      created: '2024-01-01T00:00:00Z'
    }
  ])
  const [isEnabled, setIsEnabled] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span>IP Access Control</span>
          </div>
          <div className="flex items-center space-x-2">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium">Enable IP Restrictions</span>
            </label>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {!isEnabled && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  <p className="font-medium mb-1">IP Restrictions Disabled</p>
                  <p>Enable IP restrictions to control access based on IP addresses. This adds an extra layer of security to your account.</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h4 className="font-medium text-gray-900 dark:text-white">IP Address Rules</h4>
            <Button size="sm" disabled={!isEnabled} className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add IP Rule
            </Button>
          </div>

          <div className="space-y-3">
            {ipRestrictions.length === 0 ? (
              <div className="text-center py-8">
                <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No IP Rules</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Add IP addresses or ranges to control access to your account
                </p>
              </div>
            ) : (
              ipRestrictions.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${
                      rule.type === 'allow' 
                        ? 'bg-green-100 dark:bg-green-900/20' 
                        : 'bg-red-100 dark:bg-red-900/20'
                    }`}>
                      <Shield className={`h-4 w-4 ${
                        rule.type === 'allow' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{rule.ipAddress}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{rule.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      rule.type === 'allow'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                    }`}>
                      {rule.type.toUpperCase()}
                    </span>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">IP Restriction Guidelines:</p>
                <ul className="space-y-1">
                  <li>• Use CIDR notation for IP ranges (e.g., 192.168.1.0/24)</li>
                  <li>• Allow rules grant access, deny rules block access</li>
                  <li>• Rules are processed in order of creation</li>
                  <li>• Your current IP: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">203.0.113.1</code></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default IpAccessControl