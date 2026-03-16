import React, { useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { Input } from '../../../../components/ui/Input'
import { crmApi } from '../utils/api'
import { CustomerSegment } from '../types'
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
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (segment) {
        await crmApi.updateCustomerSegment(sessionKey, segment.id, formData)
      } else {
        await crmApi.createCustomerSegment(sessionKey, formData)
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
