import React, { Suspense, memo } from 'react'
import { LoadingSpinner } from './LoadingSpinner'

interface LazyDashboardProps {
  children: React.ReactNode
  title?: string
}

const LazyDashboard = memo<LazyDashboardProps>(({ children, title }) => {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            {title && (
              <p className="mt-4 text-gray-600 dark:text-gray-400">
                Loading {title}...
              </p>
            )}
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  )
})

LazyDashboard.displayName = 'LazyDashboard'

export default LazyDashboard