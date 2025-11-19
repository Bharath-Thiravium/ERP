// Interview utility functions for countdown and completion logic

export interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  totalMinutes: number
  isOverdue: boolean
  isPast: boolean
}

export const calculateTimeRemaining = (interviewDate: string, interviewTime: string): TimeRemaining => {
  const now = new Date()
  const interviewDateTime = new Date(`${interviewDate} ${interviewTime}`)
  
  const diffMs = interviewDateTime.getTime() - now.getTime()
  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  
  if (totalMinutes < 0) {
    // Interview has passed
    const pastMinutes = Math.abs(totalMinutes)
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      totalMinutes: pastMinutes,
      isOverdue: pastMinutes > 60, // More than 1 hour past
      isPast: true
    }
  }
  
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  
  return {
    days,
    hours,
    minutes,
    totalMinutes,
    isOverdue: false,
    isPast: false
  }
}

export const canMarkComplete = (interviewDate: string, interviewTime: string): boolean => {
  const timeRemaining = calculateTimeRemaining(interviewDate, interviewTime)
  return timeRemaining.isPast && timeRemaining.totalMinutes >= 60
}

export const formatCountdown = (timeRemaining: TimeRemaining): string => {
  if (timeRemaining.isPast) {
    if (timeRemaining.totalMinutes < 60) {
      return `Interview in progress: Started ${timeRemaining.totalMinutes} minutes ago`
    } else {
      const hoursAgo = Math.floor(timeRemaining.totalMinutes / 60)
      const minutesAgo = timeRemaining.totalMinutes % 60
      return `Interview completed: Started ${hoursAgo}h ${minutesAgo}m ago`
    }
  }
  
  const { days, hours, minutes } = timeRemaining
  
  if (days > 0) {
    return `Interview in: ${days} days, ${hours} hours, ${minutes} minutes`
  } else if (hours > 0) {
    return `Interview in: ${hours} hours, ${minutes} minutes`
  } else {
    return `Interview in: ${minutes} minutes`
  }
}

export const getCountdownColor = (timeRemaining: TimeRemaining): string => {
  if (timeRemaining.isPast) {
    if (timeRemaining.totalMinutes < 60) {
      return 'text-red-600 dark:text-red-400' // In progress
    } else {
      return 'text-gray-600 dark:text-gray-400' // Completed
    }
  }
  
  if (timeRemaining.totalMinutes > 1440) { // More than 1 day
    return 'text-green-600 dark:text-green-400'
  } else if (timeRemaining.totalMinutes > 60) { // More than 1 hour
    return 'text-yellow-600 dark:text-yellow-400'
  } else {
    return 'text-red-600 dark:text-red-400' // Less than 1 hour
  }
}

export const getButtonState = (interviewDate: string, interviewTime: string) => {
  const timeRemaining = calculateTimeRemaining(interviewDate, interviewTime)
  
  if (!timeRemaining.isPast) {
    return {
      disabled: true,
      text: 'Mark Completed',
      tooltip: 'Interview not started yet'
    }
  }
  
  if (timeRemaining.totalMinutes < 60) {
    return {
      disabled: true,
      text: 'Mark Completed',
      tooltip: 'Please wait minimum 1 hour'
    }
  }
  
  return {
    disabled: false,
    text: 'Mark Completed',
    tooltip: 'Ready to mark as completed'
  }
}