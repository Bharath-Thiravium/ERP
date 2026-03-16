import React, { useState } from 'react'
import { Plus, Users, Copy, Trash2, User, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Modal } from '../ui/Modal'

interface ServiceUserManagementProps {
  serviceUsersData: any[]
  usersLoading: boolean
  onCreateUser: () => void
  onCopyToClipboard: (text: string) => void
  onDeleteUser: (userId: number) => void
}

const ServiceUserManagement: React.FC<ServiceUserManagementProps> = ({
  serviceUsersData,
  usersLoading,
  onCreateUser,
  onCopyToClipboard,
  onDeleteUser
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<{show: boolean, user: any}>({show: false, user: null})
  const [viewUser, setViewUser] = useState<any>(null)

  const handleDeleteClick = (user: any) => {
    setDeleteConfirm({show: true, user})
  }

  const confirmDelete = () => {
    if (deleteConfirm.user) {
      onDeleteUser(deleteConfirm.user.id)
      setDeleteConfirm({show: false, user: null})
    }
  }
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
                        onClick={() => handleDeleteClick(user)}
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
                            onClick={() => setViewUser(user)}
                          >
                            <User className="h-4 w-4" />
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


                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirm.show}
        onClose={() => setDeleteConfirm({show: false, user: null})}
        title="Delete Service User"
        size="md"
      >
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This action cannot be undone
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            Are you sure you want to delete <strong>{deleteConfirm.user?.full_name}</strong>?
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This will permanently remove their access to {deleteConfirm.user?.service_name}.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setDeleteConfirm({show: false, user: null})}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete User
          </Button>
        </div>
      </Modal>

      {/* View User Modal */}
      <Modal
        isOpen={!!viewUser}
        onClose={() => setViewUser(null)}
        title="Service User Details"
        size="lg"
        className="p-0"
      >
        {viewUser && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <p className="text-gray-900 dark:text-white">{viewUser.full_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <p className="text-gray-900 dark:text-white">{viewUser.username}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <p className="text-gray-900 dark:text-white">{viewUser.email}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service
                </label>
                <p className="text-gray-900 dark:text-white">{viewUser.service_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <p className="text-gray-900 dark:text-white capitalize">{viewUser.role}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  viewUser.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {viewUser.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Created
                </label>
                <p className="text-gray-900 dark:text-white text-sm">
                  {viewUser.created_at ? new Date(viewUser.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ServiceUserManagement