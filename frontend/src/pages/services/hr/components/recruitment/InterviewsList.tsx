import React, { useState, useEffect } from 'react'
import { Calendar, Clock, User, Video, MapPin, Phone, CheckCircle, X } from 'lucide-react'
import { Button } from '../../../../../components/ui/Button'
import { Card, CardContent } from '../../../../../components/ui/Card'
import { useServiceUserStore } from '../../../../../store/serviceUserStore'
import api from '../../../../../lib/api'
import toast from 'react-hot-toast'
import OfferManagement from './OfferManagement'
import { getButtonState } from '../../utils/interviewUtils'
import { useInterval } from '../../hooks/useInterval'
import InterviewCountdown from './InterviewCountdown'

const InterviewsList: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  const [interviews, setInterviews] = useState<any[]>([])
  const [applications, setApplications] = useState<any[]>([])
  const [selectedApplication, setSelectedApplication] = useState<any>(null)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [loading, setLoading] = useState(false)
  // Removed unused currentTime state

  // Update current time every minute for real-time countdown
  useInterval(() => {
  }, 60000) // Update every minute

  const fetchInterviews = async () => {
    if (!sessionKey) return
    
    setLoading(true)
    try {
      const response = await api.get('/api/hr/interviews/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setInterviews(response.data.results || [])
    } catch (error) {
      console.error('Error fetching interviews:', error)
      toast.error('Failed to load interviews')
    } finally {
      setLoading(false)
    }
  }

  const markInterviewCompleted = async (interviewId: number) => {
    if (!sessionKey) return
    
    try {
      await api.patch(`/api/hr/interviews/${interviewId}/`, {
        status: 'completed',
        session_key: sessionKey
      })
      
      toast.success('Interview marked as completed')
      fetchInterviews()
    } catch (error) {
      console.error('Error marking interview completed:', error)
      toast.error('Failed to mark interview as completed')
    }
  }

  const updateInterviewResult = async (interviewId: number, result: string) => {
    if (!sessionKey) return
    
    try {
      await api.patch(`/api/hr/interviews/${interviewId}/`, {
        recommendation: result,
        session_key: sessionKey
      })
      
      // Update application status
      const interview = interviews.find(i => i.id === interviewId)
      if (interview) {
        await api.patch(`/api/hr/job-applications/${interview.application_id}/`, {
          status: result,
          session_key: sessionKey
        })
      }
      
      toast.success(`Candidate ${result} successfully`)
      fetchInterviews()
    } catch (error) {
      console.error('Error updating interview result:', error)
      toast.error('Failed to update interview result')
    }
  }

  useEffect(() => {
    fetchInterviews()
    fetchApplications()
  }, [sessionKey])

  const fetchApplications = async () => {
    if (!sessionKey) return
    
    try {
      const response = await api.get('/api/hr/job-applications/', {
        headers: { Authorization: `Bearer ${sessionKey}` },
        params: { session_key: sessionKey }
      })
      setApplications(response.data.results || [])
    } catch (error) {
      console.error('Error fetching applications:', error)
    }
  }

  const getInterviewTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />
      case 'phone': return <Phone className="h-4 w-4" />
      case 'in_person': return <MapPin className="h-4 w-4" />
      default: return <Calendar className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Scheduled Interviews</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {interviews.length} total interviews
        </div>
      </div>

      {interviews.length === 0 ? (
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No interviews scheduled</h3>
            <p className="text-gray-500 dark:text-gray-400">Interviews will appear here when you schedule them from applications</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {interviews.map((interview) => (
            <Card key={interview.id} className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-gray-200/50 dark:border-gray-700/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-gray-500" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {interview.candidate_name}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(interview.status)}`}>
                        {interview.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(interview.interview_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4" />
                        <span>{interview.interview_time}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        {getInterviewTypeIcon(interview.interview_type)}
                        <span className="capitalize">{interview.interview_type.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4" />
                        <span>{interview.interviewer_name}</span>
                      </div>
                    </div>

                    {/* Countdown Timer */}
                    <div className="mb-4">
                      <InterviewCountdown 
                        interviewDate={interview.interview_date}
                        interviewTime={interview.interview_time}
                      />
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Position: {interview.job_title}
                      </p>
                      {interview.meeting_link && (
                        <a 
                          href={interview.meeting_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          Join Meeting
                        </a>
                      )}
                      {interview.location && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Location: {interview.location}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {interview.status === 'scheduled' && (() => {
                    const buttonState = getButtonState(interview.interview_date, interview.interview_time)
                    return (
                      <div className="flex items-center space-x-2 mt-4">
                        <Button 
                          size="sm"
                          className={`${buttonState.disabled 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                          onClick={() => !buttonState.disabled && markInterviewCompleted(interview.id)}
                          disabled={buttonState.disabled}
                          title={buttonState.tooltip}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          {buttonState.text}
                        </Button>
                        {buttonState.disabled && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {buttonState.tooltip}
                          </span>
                        )}
                      </div>
                    )
                  })()}
                  
                  {interview.status === 'completed' && !interview.recommendation && (
                    <div className="flex items-center space-x-2 mt-4">
                      <Button 
                        size="sm"
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => updateInterviewResult(interview.id, 'selected')}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Select Candidate
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => updateInterviewResult(interview.id, 'rejected')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                  
                  {interview.recommendation === 'selected' && (
                    <div className="flex items-center space-x-2 mt-4">
                      <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        ✓ Selected
                      </div>
                      <Button 
                        size="sm"
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => {
                          // Find application and open offer modal
                          const app = applications.find(a => a.id === interview.application_id)
                          if (app) {
                            setSelectedApplication(app)
                            setShowOfferModal(true)
                          }
                        }}
                      >
                        Send Job Offer
                      </Button>
                    </div>
                  )}
                  
                  {interview.recommendation === 'rejected' && (
                    <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm mt-4 w-fit">
                      ✗ Rejected
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Offer Management Modal */}
      <OfferManagement
        isOpen={showOfferModal}
        onClose={() => {
          setShowOfferModal(false)
          setSelectedApplication(null)
        }}
        application={selectedApplication}
        onSuccess={() => {
          fetchApplications()
          setShowOfferModal(false)
          setSelectedApplication(null)
        }}
      />
    </div>
  )
}

export default InterviewsList