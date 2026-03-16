import React from 'react'
import { Button } from '../../../../components/ui/Button'
import { CustomerInteraction } from '../types'
import { formatDate } from '../../../../lib/utils'
import { Modal } from '../../../../components/ui/Modal'

interface InteractionDetailModalProps {
  isOpen: boolean
  onClose: () => void
  interaction: CustomerInteraction | null
}

export const InteractionDetailModal: React.FC<InteractionDetailModalProps> = ({ 
  isOpen, 
  onClose, 
  interaction 
}) => {
  if (!isOpen || !interaction) return null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="lg"
      className="max-w-2xl"
      bodyClassName="p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Interaction Details</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
                <p className="text-gray-900 dark:text-white">{interaction.subject}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <p className="text-gray-900 dark:text-white">{interaction.interaction_type_display}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Account</label>
                <p className="text-gray-900 dark:text-white">{interaction.account_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contact</label>
                <p className="text-gray-900 dark:text-white">{interaction.contact_name}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                <p className="text-gray-900 dark:text-white">{formatDate(interaction.interaction_date)}</p>
              </div>
              {interaction.duration_minutes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                  <p className="text-gray-900 dark:text-white">{interaction.duration_minutes} minutes</p>
                </div>
              )}
            </div>

            {interaction.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  {interaction.description}
                </p>
              </div>
            )}

            {interaction.outcome && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Outcome</label>
                <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                  {interaction.outcome}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
    </Modal>
  )
}
