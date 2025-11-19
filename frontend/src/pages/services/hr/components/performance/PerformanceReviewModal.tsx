import React, { useState, useEffect } from 'react'
import { X, Star, Target } from 'lucide-react'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'

interface Employee {
  id: number
  employee_id: string
  full_name: string
  department: string
  designation: string
}

interface PerformanceReviewModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  review?: any
}

export const PerformanceReviewModal: React.FC<PerformanceReviewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  review
}) => {
  const { sessionKey } = useServiceUserStore()
  const [loading, setLoading] = useState(false)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [formData, setFormData] = useState({
    employee: review?.employee || '',
    review_period_start: review?.review_period_start || '',
    review_period_end: review?.review_period_end || '',
    goals_achievement: review?.goals_achievement || 0,
    quality_score: review?.quality_score || 0,
    productivity_score: review?.productivity_score || 0,
    collaboration_score: review?.collaboration_score || 0,
    overall_rating: review?.overall_rating || 0,
    strengths: review?.strengths || '',
    areas_for_improvement: review?.areas_for_improvement || '',
    goals_for_next_period: review?.goals_for_next_period || '',
    status: review?.status || 'draft'
  })

  useEffect(() => {
    if (isOpen) {
      fetchEmployees()
    }
  }, [isOpen, sessionKey])

  const fetchEmployees = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/employees/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setEmployees(response.data.results || [])
    } catch (error) {
      console.error('Error fetching employees:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sessionKey) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        session_key: sessionKey
      }

      if (review) {
        await api.put(`/api/hr/performance/${review.id}/`, payload)
        toast.success('Performance review updated successfully!')
      } else {
        await api.post('/api/hr/performance/create_review/', payload, {
          headers: { Authorization: `Bearer ${sessionKey}` }
        })
        toast.success('Performance review created successfully!')
      }
      
      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error saving review:', error)
      toast.error(error.response?.data?.error || 'Failed to save performance review')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('score') || name.includes('rating') || name === 'goals_achievement' 
        ? parseFloat(value) || 0 
        : value
    }))
  }

  const renderStarRating = (fieldName: string, value: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, [fieldName]: star }))}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= value
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          {value}/5
        </span>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Target className="h-6 w-6 text-purple-500 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {review ? 'Edit Performance Review' : 'New Performance Review'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Employee *
              </label>
              <select
                name="employee"
                value={formData.employee}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} - {emp.employee_id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Period Start *
              </label>
              <input
                type="date"
                name="review_period_start"
                value={formData.review_period_start}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Review Period End *
              </label>
              <input
                type="date"
                name="review_period_end"
                value={formData.review_period_end}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Performance Ratings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Performance Ratings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Goals Achievement (%)
                </label>
                <input
                  type="number"
                  name="goals_achievement"
                  value={formData.goals_achievement}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Overall Rating
                </label>
                {renderStarRating('overall_rating', formData.overall_rating)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality Score
                </label>
                {renderStarRating('quality_score', formData.quality_score)}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Productivity Score
                </label>
                {renderStarRating('productivity_score', formData.productivity_score)}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Collaboration Score
                </label>
                {renderStarRating('collaboration_score', formData.collaboration_score)}
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Review Comments</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Strengths
              </label>
              <textarea
                name="strengths"
                value={formData.strengths}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Highlight employee's key strengths and achievements..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Areas for Improvement
              </label>
              <textarea
                name="areas_for_improvement"
                value={formData.areas_for_improvement}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Identify areas where employee can improve..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Goals for Next Period
              </label>
              <textarea
                name="goals_for_next_period"
                value={formData.goals_for_next_period}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Set goals and objectives for the next review period..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 rounded-md disabled:opacity-50"
            >
              {loading ? 'Saving...' : review ? 'Update Review' : 'Create Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}