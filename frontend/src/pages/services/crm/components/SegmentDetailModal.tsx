import React from 'react'
import { Button } from '../../../../components/ui/Button'
import { CustomerSegment } from '../types'
import { Modal } from '../../../../components/ui/Modal'

interface SegmentDetailModalProps {
  isOpen: boolean
  onClose: () => void
  segment: CustomerSegment | null
}

export const SegmentDetailModal: React.FC<SegmentDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  segment 
}) => {
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
    </Modal>
  )
}
