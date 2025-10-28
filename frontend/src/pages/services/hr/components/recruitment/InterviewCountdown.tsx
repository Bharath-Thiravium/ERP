import React from 'react'
import { Timer } from 'lucide-react'
import { calculateTimeRemaining, formatCountdown, getCountdownColor } from '../../utils/interviewUtils'

interface InterviewCountdownProps {
  interviewDate: string
  interviewTime: string
  className?: string
}

const InterviewCountdown: React.FC<InterviewCountdownProps> = ({ 
  interviewDate, 
  interviewTime, 
  className = '' 
}) => {
  const timeRemaining = calculateTimeRemaining(interviewDate, interviewTime)
  const countdownText = formatCountdown(timeRemaining)
  const colorClass = getCountdownColor(timeRemaining)

  // Add pulse animation for interviews starting soon (less than 1 hour)
  const shouldPulse = !timeRemaining.isPast && timeRemaining.totalMinutes <= 60
  const pulseClass = shouldPulse ? 'animate-pulse' : ''

  // Add different background colors based on status
  let bgClass = 'bg-gray-50 dark:bg-gray-800'
  if (timeRemaining.isPast) {
    if (timeRemaining.totalMinutes < 60) {
      bgClass = 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
    } else {
      bgClass = 'bg-gray-50 dark:bg-gray-800'
    }
  } else if (timeRemaining.totalMinutes <= 60) {
    bgClass = 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
  } else if (timeRemaining.totalMinutes <= 1440) { // Less than 24 hours
    bgClass = 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
  }

  return (
    <div className={`flex items-center space-x-2 text-sm font-medium ${colorClass} ${bgClass} p-2 rounded-lg ${pulseClass} ${className}`}>
      <Timer className="h-4 w-4" />
      <span>{countdownText}</span>
    </div>
  )
}

export default InterviewCountdown