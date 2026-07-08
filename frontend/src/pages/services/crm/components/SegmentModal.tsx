import React, { useEffect, useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { crmApi } from '../utils/api'
import { Account, CustomerSegment } from '../types'
import { Modal } from '../../../../components/ui/Modal'

interface SegmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  sessionKey: string
  segment?: CustomerSegment | null
}

export const SegmentModal: React.FC<SegmentModalProps> = ({ isOpen, onClose, onSave, sessionKey, segment }) => {
  const [formData, setFormData] = useState({
    name: segment?.name || '',
    description: segment?.description || '',
    color: segment?.color || '#3B82F6'
  })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    setFormData({
      name: segment?.name || '',
      description: segment?.description || '',
      color: segment?.color || '#3B82F6'
    })
    setSelectedAccountIds([])
    loadAccounts()
  }, [isOpen, segment])

  const loadAccounts = async () => {
    try {
      const response = await crmApi.getAccounts(sessionKey)
      setAccounts(response.data.results || response.data)
    } catch (error) {
      console.error('Error loading accounts:', error)
    }
  }

  const toggleAccount = (accountId: number) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let segmentId = segment?.id
      if (segment) {
        await crmApi.updateCustomerSegment(sessionKey, segment.id, formData)
      } else {
        const response = await crmApi.createCustomerSegment(sessionKey, formData)
        segmentId = response.data.id
      }
      if (segmentId && selectedAccountIds.length > 0) {
        await crmApi.addAccountsToSegment(sessionKey, segmentId, selectedAccountIds)
      }
      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving segment:', error)
    } finally {
      setLoading(false)
    }
  }

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
  ]

  if (!isOpen) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="sm"
      className="max-w-md"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{segment ? 'Edit Segment' : 'Create Customer Segment'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Segment Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter segment name"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe this customer segment"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Color</label>
            <div className="flex gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Accounts</label>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {selectedAccountIds.length} selected
              </span>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-md border border-gray-200 dark:border-gray-700">
              {accounts.length > 0 ? (
                accounts.map((account) => (
                  <label
                    key={account.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-3 py-2 last:border-b-0 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAccountIds.includes(account.id)}
                      onChange={() => toggleAccount(account.id)}
                      className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{account.name}</p>
                      <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{account.account_type}</p>
                    </div>
                  </label>
                ))
              ) : (
                <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400">No accounts available.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : segment ? 'Update Segment' : 'Create Segment'}
            </Button>
          </div>
      </form>
    </Modal>
  )
}
