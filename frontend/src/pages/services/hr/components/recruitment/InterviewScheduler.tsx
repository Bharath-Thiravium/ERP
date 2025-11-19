import React, { useState, useEffect } from 'react'
import { Calendar, X } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { JobApplication } from '../../types/hrTypes'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface InterviewSchedulerProps {
  isOpen: boolean
  onClose: () => void
  application: JobApplication | null
  onSuccess: () => void
}

const InterviewScheduler: React.FC<InterviewSchedulerProps> = ({ 
  isOpen, 
  onClose, 
  application, 
  onSuccess 
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [interviewers, setInterviewers] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    interview_date: '',
    interview_time: '',
    interviewer: '',
    interview_type: 'video',
    interview_round: 1,
    location: '',
    meeting_link: '',
    notes: ''
  })

  useEffect(() => {
    if (isOpen && sessionKey) {
      fetchInterviewers()
    }
  }, [isOpen, sessionKey])

  const fetchInterviewers = async () => {
    try {
      const response = await api.get('/api/hr/employees/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey, status: 'active' }
      })
      const employees = response.data.results || []
      
      // Add current service user as default interviewer
      const currentUser = {
        id: 'service_user',
        first_name: 'Current',
        last_name: 'User',
        designation_title: 'HR Manager'
      }
      
      setInterviewers([currentUser, ...employees])
      
      // Set current user as default
      if (!formData.interviewer) {
        setFormData(prev => ({ ...prev, interviewer: 'service_user' }))
      }
    } catch (error) {
      console.error('Error fetching interviewers:', error)
      // Fallback: just add current user
      const currentUser = {
        id: 'service_user',
        first_name: 'Current',
        last_name: 'User',
        designation_title: 'HR Manager'
      }
      setInterviewers([currentUser])
      setFormData(prev => ({ ...prev, interviewer: 'service_user' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey || !application) return

    setLoading(true)
    try {
      // Schedule interview
      const interviewerValue = formData.interviewer === 'service_user' ? null : parseInt(formData.interviewer)
      
      const response = await api.post('/api/hr/interviews/', {
        application_id: application.id,
        interviewer_id: interviewerValue,
        interview_date: formData.interview_date,
        interview_time: formData.interview_time,
        interview_type: formData.interview_type,
        interview_round: formData.interview_round,
        location: formData.location,
        meeting_link: formData.meeting_link,
        notes: formData.notes,
        session_key: sessionKey
      })

      // Update application status
      const interviewerForApp = formData.interviewer === 'service_user' ? null : parseInt(formData.interviewer)
      
      await api.patch(`/api/hr/job-applications/${application.id}/`, {
        status: 'interview_scheduled',
        interview_date: `${formData.interview_date}T${formData.interview_time}`,
        interviewer: interviewerForApp,
        session_key: sessionKey
      })

      // Check email status
      if (response.data.email_success) {
        toast.success('Interview scheduled and invitation email sent successfully')
      } else if (response.data.email_warning) {
        toast.success('Interview scheduled successfully')
        toast.error(`Email issue: ${response.data.email_warning}`, { duration: 6000 })
      } else {
        toast.success('Interview scheduled successfully')
      }
      
      onSuccess()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error('Error scheduling interview:', error)
      toast.error(error.response?.data?.detail || 'Failed to schedule interview')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      interview_date: '',
      interview_time: '',
      interviewer: '',
      interview_type: 'video',
      interview_round: 1,
      location: '',
      meeting_link: '',
      notes: ''
    })
  }

  if (!isOpen || !application) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Schedule Interview
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interview Date *
              </label>
              <input
                type="date"
                value={formData.interview_date}
                onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interview Time *
              </label>
              <input
                type="time"
                value={formData.interview_time}
                onChange={(e) => setFormData({ ...formData, interview_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interviewer *
              </label>
              <select
                value={formData.interviewer}
                onChange={(e) => setFormData({ ...formData, interviewer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="">Select Interviewer</option>
                {interviewers.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} - {emp.designation_title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Interview Type
              </label>
              <select
                value={formData.interview_type}
                onChange={(e) => setFormData({ ...formData, interview_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="video">Video Call</option>
                <option value="phone">Phone Call</option>
                <option value="in_person">In Person</option>
              </select>
            </div>
          </div>

          {formData.interview_type === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Meeting Link
              </label>
              <input
                type="url"
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
              />
            </div>
          )}

          {formData.interview_type === 'in_person' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Office address or meeting room"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="Additional notes for the interview..."
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            >
              {loading ? 'Scheduling...' : 'Schedule Interview'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InterviewScheduler