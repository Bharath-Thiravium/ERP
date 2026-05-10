// Utility function to display user-friendly error messages
// Place this in: frontend/src/utils/errorHandler.ts

import toast from 'react-hot-toast'

interface ApiError {
  response?: {
    data?: unknown
    status?: number
  }
}

export const handleApiError = (error: unknown, defaultMessage: string = 'Operation failed') => {
  console.error('API Error:', error)
  
  const axiosError = error as ApiError
  
  if (axiosError.response?.data) {
    const errorData = axiosError.response.data
    
    if (typeof errorData === 'object' && errorData !== null) {
      const errorMessages: string[] = []
      
      Object.entries(errorData).forEach(([key, value]) => {
        let errorMsg = ''
        
        if (Array.isArray(value)) {
          errorMsg = String(value[0])
        } else if (typeof value === 'string') {
          errorMsg = value
        } else if (typeof value === 'object') {
          errorMsg = JSON.stringify(value)
        } else {
          errorMsg = String(value)
        }
        
        // Create user-friendly field names
        const fieldName = key
          .replace(/_/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
        
        errorMessages.push(`${fieldName}: ${errorMsg}`)
      })
      
      if (errorMessages.length > 0) {
        // Show detailed error with list
        const errorContent = (
          <div>
            <strong>{defaultMessage}:</strong>
            <ul style={{ marginTop: '8px', paddingLeft: '20px', listStyle: 'disc' }}>
              {errorMessages.map((msg, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{msg}</li>
              ))}
            </ul>
          </div>
        )
        
        toast.error(errorContent, { duration: 6000 })
        return errorMessages
      }
    } else if (typeof errorData === 'string') {
      toast.error(`${defaultMessage}: ${errorData}`, { duration: 5000 })
      return [errorData]
    }
  }
  
  // Generic error
  toast.error(`${defaultMessage}. Please check your connection.`, { duration: 4000 })
  return []
}

// Extract field errors for form validation
export const extractFieldErrors = (error: unknown): Record<string, string> => {
  const axiosError = error as ApiError
  const fieldErrors: Record<string, string> = {}
  
  if (axiosError.response?.data && typeof axiosError.response.data === 'object') {
    Object.entries(axiosError.response.data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        fieldErrors[key] = String(value[0])
      } else if (typeof value === 'string') {
        fieldErrors[key] = value
      } else {
        fieldErrors[key] = JSON.stringify(value)
      }
    })
  }
  
  return fieldErrors
}
