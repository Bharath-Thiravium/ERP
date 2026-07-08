import React, { useEffect, useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { CustomerSegment } from '../types'
import { Modal } from '../../../../components/ui/Modal'
import { crmApi } from '../utils/api'

interface SegmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  segment: CustomerSegment | null
  sessionKey: string
}

interface SegmentAccount {
  id: number
  name: string
  account_type: string
  industry: string
  added_at: string
}

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  segment,
  sessionKey
}) => {
  const [accounts, setAccounts] = useState<SegmentAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  useEffect(() => {
    if (!isOpen || !segment) return

    const loadSegmentAccounts = async () => {
      setLoadingAccounts(true)
      try {
        const response = await crmApi.getSegmentAccounts(sessionKey, segment.id)
        setAccounts(response.data || [])
      } catch (error) {
        console.error('Error loading segment accounts:', error)
        setAccounts([])
      } finally {
        setLoadingAccounts(false)
      }
    }

    loadSegmentAccounts()
  }, [isOpen, segment, sessionKey])

  if (!isOpen || !segment) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      className="max-w-md"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Segment Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <p className="text-gray-900 dark:text-white font-medium">{segment.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                {segment.description || 'No description provided'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-gray-900 dark:text-white">{segment.color}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account Count</label>
              <p className="text-gray-900 dark:text-white">{segment.account_count} accounts</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Accounts</label>
              <div className="mt-2 max-h-44 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
                {loadingAccounts ? (
                  <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">Loading accounts...</p>
                ) : accounts.length > 0 ? (
                  accounts.map((account) => (
                    <div
                      key={account.id}
                      className="border-b border-gray-100 px-3 py-2 last:border-b-0 dark:border-gray-700"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{account.name}</p>
                      <p className="text-xs capitalize text-gray-500 dark:text-gray-400">
                        {account.account_type} • {account.industry}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">No accounts added.</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
    </Modal>
  )
}
