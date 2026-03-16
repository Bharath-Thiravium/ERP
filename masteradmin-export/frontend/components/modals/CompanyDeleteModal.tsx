import React, { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'
import { Modal } from '../ui/Modal'

interface CompanyDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  company: any
  onDelete: (companyId: string) => Promise<void>
}

const CompanyDeleteModal: React.FC<CompanyDeleteModalProps> = ({
  isOpen,
  onClose,
  company,
  onDelete
}) => {
  const [loading, setLoading] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (confirmText !== company.name) {
      setError('Company name does not match')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      await onDelete(company.id)
      onClose()
    } catch (error) {
      console.error('Error deleting company:', error)
      setError('Failed to delete company. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setConfirmText('')
    setError('')
    onClose()
  }

  const isConfirmValid = confirmText === company?.name

  const modalFooter = (
    <div className="flex justify-end space-x-3">
      <Button variant="outline" onClick={handleClose} disabled={loading}>
        Cancel
      </Button>
      <Button
        onClick={handleDelete}
        disabled={loading || !isConfirmValid}
        className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" />
            Deleting...
          </>
        ) : (
          <>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Company
          </>
        )}
      </Button>
    </div>
  )

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Delete Company"
      footer={modalFooter}
      size="md"
    >
      {/* Enhanced Company Info */}
      <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-6 mb-6 border border-red-200/50 dark:border-red-700/50">
        <div className="flex items-start space-x-4">
          <div className="relative">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              {company?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
              <AlertTriangle className="h-3 w-3 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{company?.name}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Email</p>
                <p className="font-medium text-gray-900 dark:text-white">{company?.email}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Company ID</p>
                <p className="font-medium text-gray-900 dark:text-white">{company?.id}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Status</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  company?.approval_status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                  company?.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                  {company?.approval_status}
                </span>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Created</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {company?.created_at ? new Date(company.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
              {company?.phone && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{company.phone}</p>
                </div>
              )}
              {company?.services && (
                <div>
                  <p className="text-gray-500 dark:text-gray-400">Services</p>
                  <p className="font-medium text-gray-900 dark:text-white">{company.services.length} assigned</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
              Warning: This action is irreversible
            </h4>
            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
              <li>• All company data will be permanently deleted</li>
              <li>• All associated users will lose access</li>
              <li>• All service subscriptions will be cancelled</li>
              <li>• This action cannot be undone</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Confirmation Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Type the company name <span className="font-bold">"{company?.name}"</span> to confirm deletion:
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value)
            if (error) setError('')
          }}
          className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
          }`}
          placeholder={`Type "${company?.name}" here`}
          disabled={loading}
        />
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>

      {/* Impact Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Deletion Impact Summary
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Company Data</span>
            <span className="font-medium text-red-600 dark:text-red-400">Will be deleted</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">User Accounts</span>
            <span className="font-medium text-red-600 dark:text-red-400">Will be removed</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Service Access</span>
            <span className="font-medium text-red-600 dark:text-red-400">Will be revoked</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 dark:text-gray-400">Documents</span>
            <span className="font-medium text-red-600 dark:text-red-400">Will be deleted</span>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default CompanyDeleteModal
