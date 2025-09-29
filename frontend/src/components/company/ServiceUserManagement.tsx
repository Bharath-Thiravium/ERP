import React from 'react'
import { Plus, Users, Eye, EyeOff, Copy, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

interface ServiceUserManagementProps {
  serviceUsersData: any[]
  usersLoading: boolean
  showCredentials: {[key: string]: boolean}
  onCreateUser: () => void
  onToggleCredentials: (userId: string) => void
  onCopyToClipboard: (text: string) => void
  onDeleteUser: (userId: number) => void
}

const ServiceUserManagement: React.FC<ServiceUserManagementProps> = ({
  serviceUsersData,
  usersLoading,
  showCredentials,
  onCreateUser,
  onToggleCredentials,
  onCopyToClipboard,
  onDeleteUser
}) => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Service Users Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage users for your services
          </p>
        </div>
        <Button
          onClick={onCreateUser}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Service User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span>Service Users</span>
          </CardTitle>
          <CardDescription>
            Users created for accessing specific services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" text="Loading service users..." />
            </div>
          ) : serviceUsersData.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Service Users Created
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Create service users to give them access to specific services
              </p>
              <Button
                onClick={onCreateUser}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First User
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {serviceUsersData.map((user: any) => (
                <Card key={user.id} className="border-2 border-gray-200 dark:border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {user.full_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user.username}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Email:</strong> {user.email}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Service:</strong> {user.service_name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Role:</strong> {user.role}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>

                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onToggleCredentials(user.id)}
                          >
                            {showCredentials[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          {user.password && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onCopyToClipboard(user.password)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {showCredentials[user.id] && user.password && (
                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                          <strong>Password:</strong> {user.password}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ServiceUserManagement