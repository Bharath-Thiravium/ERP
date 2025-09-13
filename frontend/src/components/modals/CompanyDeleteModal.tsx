import React, { useState } from 'react'
import { X, AlertTriangle, Trash2, Building2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { LoadingSpinner } from '../ui/LoadingSpinner'

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

  if (!isOpen || !company) return null

  const isConfirmValid = confirmText === company.name

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
        
        <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Delete Company
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Company Info */}
            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-6">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                {company.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{company.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{company.email}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Created: {new Date(company.created_at).toLocaleDateString()}
                </p>
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
                Type the company name <span className="font-bold">"{company.name}"</span> to confirm deletion:
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
                placeholder={`Type "${company.name}" here`}
                disabled={loading}
              />
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </p>
              )}
            </div>

            {/* Additional Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              <p>Company ID: {company.id}</p>
              <p>Status: {company.approval_status}</p>
              {company.services && (
                <p>Services: {company.services.length} assigned</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
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
        </div>
      </div>
    </div>
  )
}

export default CompanyDeleteModal
