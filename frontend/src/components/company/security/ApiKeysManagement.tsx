import React, { useState } from 'react'
import { Code, Plus, Eye, EyeOff, Copy, Trash2, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card'
import { Button } from '../../ui/Button'

const ApiKeysManagement: React.FC = () => {
  const [apiKeys] = useState([
    {
      id: 1,
      name: 'Production API',
      key: 'ak_live_1234567890abcdef',
      permissions: ['read', 'write'],
      lastUsed: '2024-01-15T10:30:00Z',
      created: '2024-01-01T00:00:00Z'
    }
  ])
  const [showKeys, setShowKeys] = useState<{[key: number]: boolean}>({})

  const toggleKeyVisibility = (keyId: number) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // toast.success('API key copied to clipboard!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span>API Keys Management</span>
          </div>
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No API Keys</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create API keys to integrate with external services
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" />
                Create First API Key
              </Button>
            </div>
          ) : (
            apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{apiKey.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Created: {new Date(apiKey.created).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleKeyVisibility(apiKey.id)}
                    >
                      {showKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(apiKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 mb-3">
                  <code className="text-sm font-mono">
                    {showKeys[apiKey.id] ? apiKey.key : '••••••••••••••••••••••••••••••••'}
                  </code>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span>Permissions: {apiKey.permissions.join(', ')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ApiKeysManagement