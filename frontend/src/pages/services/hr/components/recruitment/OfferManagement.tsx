import React, { useState } from 'react'
import { FileText, X } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'

import { JobApplication } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface OfferManagementProps {
  isOpen: boolean
  onClose: () => void
  application: JobApplication | null
  onSuccess: () => void
}

const OfferManagement: React.FC<OfferManagementProps> = ({ 
  isOpen, 
  onClose, 
  application, 
  onSuccess 
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  
  const [offerData, setOfferData] = useState({
    salary_offered: '',
    joining_date: '',
    offer_valid_until: '',
    benefits: '',
    terms_conditions: '',
    notes: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey || !application) return

    setLoading(true)
    try {
      // Create offer
      await api.post('/api/hr/offers/', {
        application_id: application.id,
        salary_offered: parseFloat(offerData.salary_offered),
        joining_date: offerData.joining_date,
        offer_valid_until: offerData.offer_valid_until,
        benefits: offerData.benefits,
        terms_conditions: offerData.terms_conditions,
        notes: offerData.notes,
        session_key: sessionKey
      })

      // Update application status
      await api.patch(`/api/hr/job-applications/${application.id}/`, {
        status: 'offer_sent',
        session_key: sessionKey
      })

      toast.success('Offer sent successfully')
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error sending offer:', error)
      toast.error(error.response?.data?.detail || 'Failed to send offer')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !application) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Send Job Offer
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {application.first_name} {application.last_name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Salary Offered (₹) *
              </label>
              <input
                type="number"
                value={offerData.salary_offered}
                onChange={(e) => setOfferData({ ...offerData, salary_offered: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g. 800000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Joining Date *
              </label>
              <input
                type="date"
                value={offerData.joining_date}
                onChange={(e) => setOfferData({ ...offerData, joining_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Offer Valid Until *
              </label>
              <input
                type="date"
                value={offerData.offer_valid_until}
                onChange={(e) => setOfferData({ ...offerData, offer_valid_until: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Benefits & Perks
            </label>
            <textarea
              value={offerData.benefits}
              onChange={(e) => setOfferData({ ...offerData, benefits: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Health insurance, PF, gratuity, flexible hours..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Terms & Conditions
            </label>
            <textarea
              value={offerData.terms_conditions}
              onChange={(e) => setOfferData({ ...offerData, terms_conditions: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Employment terms, probation period, notice period..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Additional Notes
            </label>
            <textarea
              value={offerData.notes}
              onChange={(e) => setOfferData({ ...offerData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Any additional information..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {loading ? 'Sending...' : 'Send Offer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OfferManagement