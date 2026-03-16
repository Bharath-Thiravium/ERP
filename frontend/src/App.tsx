import React from 'react'
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import { AppRouter } from './lib/router'
import { useAuthStore } from './store/authStore'
// import { useServiceUserStore } from './store/serviceUserStore' // Removed unused import
import { useThemeStore } from './store/themeStore'
import ErrorBoundary from './components/ui/ErrorBoundary'
import AuthWrapper from './components/auth/AuthWrapper'

import './index.css'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error: any) => {
        if (error?.status === 401) return false
        return failureCount < 2 // Reduced retries
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
})

function App() {
  const { theme } = useThemeStore()
  const { initializeAuth, isLoading } = useAuthStore()
  const [isInitializing, setIsInitializing] = React.useState(true)

  React.useEffect(() => {
    const initialize = async () => {
      try {
        await initializeAuth()
        // Remove artificial delay that causes timing issues
      } catch (error) {
        console.error('Auth initialization error:', error)
      } finally {
        setIsInitializing(false)
      }
    }
    initialize()
  }, [initializeAuth])

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])



  // Show loading screen during initialization
  if (isInitializing || isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-gray-900 text-white'
          : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">ᗩTᕼᙓᑎᗩ'𝔖</h2>
          <p className="text-gray-500 dark:text-gray-400">Loading your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthWrapper>
            <div
              className={`h-screen flex flex-col transition-colors duration-300 ${
                theme === 'dark'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-50 text-gray-900'
              }`}
            >
              <div className="flex flex-1">
                <main id="main-content" className="flex-1">
                  <AppRouter />
                </main>
              </div>
              <div id="content-modal-root" className="shrink-0"></div>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: theme === 'dark' ? '#374151' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#374151',
                    border: theme === 'dark' ? '1px solid #4B5563' : '1px solid #E5E7EB',
                  },
                }}
              />
            </div>
          </AuthWrapper>
        </Router>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
