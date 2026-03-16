import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useServiceUserStore } from '../store/serviceUserStore'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import AthensAccessGuard from '../components/auth/AthensAccessGuard'

// Lazy load components
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'))
const TwoFactorPage = React.lazy(() => import('../pages/auth/TwoFactorPage'))
const ServiceUserLogin = React.lazy(() => import('../pages/auth/ServiceUserLogin'))
const AthensServiceLogin = React.lazy(() => import('../pages/auth/AthensServiceLogin'))
const AthensPasswordReset = React.lazy(() => import('../pages/auth/AthensPasswordReset'))
const MasterAdminDashboard = React.lazy(() => import('../pages/master-admin/EnhancedDashboard'))
const UltraSecureMasterAdminSettings = React.lazy(() => import('../pages/master-admin/UltraSecureSettings'))
const CompanyDashboard = React.lazy(() => import('../pages/company/Dashboard'))
const DetailedInfoForm = React.lazy(() => import('../pages/company/DetailedInfoForm'))
const AthensFirstLoginPasswordReset = React.lazy(() => import('../pages/company/AthensFirstLoginPasswordReset'))
const AthensProfileCompletion = React.lazy(() => import('../pages/company/AthensProfileCompletion'))
const AthensPendingApproval = React.lazy(() => import('../pages/company/AthensPendingApproval'))
const AthensInductionPending = React.lazy(() => import('../pages/company/AthensInductionPending'))
const ServiceSelection = React.lazy(() => import('../pages/company/ServiceSelection'))
const FinanceDashboard = React.lazy(() => import('../pages/services/finance/pages/Dashboard'))
const PurchaseOrders = React.lazy(() => import('../pages/services/finance/pages/PurchaseOrders'))
const HRDashboard = React.lazy(() => import('../pages/services/hr/pages/Dashboard'))
const InventoryDashboard = React.lazy(() => import('../pages/services/inventory/pages/Dashboard'))
const CRMRoutes = React.lazy(() => import('../pages/services/crm/index'))
const WaitingApproval = React.lazy(() => import('../pages/company/WaitingApproval'))
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'))
const EmployeeApp = React.lazy(() => import('../pages/EmployeeApp'))
const JobPortal = React.lazy(() => import('../pages/public/JobPortal'))
const JobApplication = React.lazy(() => import('../pages/public/JobApplication'))
const PublicJobDetail = React.lazy(() => import('../pages/public/PublicJobDetail'))
const AthensAdminDashboard = React.lazy(() => import('../pages/athens-admin/AthensAdminDashboard'))


// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode
  requireMasterAdmin?: boolean
  requireCompanyUser?: boolean
  requireApproved?: boolean
  requireServiceUser?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireMasterAdmin = false,
  requireCompanyUser = false,
  requireApproved = false,
  requireServiceUser = false,
}) => {
  const { isAuthenticated, user, firstLoginRequired, approvalPending, isLoading } = useAuthStore()
  const { isAuthenticated: isServiceUserAuthenticated, serviceUser } = useServiceUserStore()
  
  // Show loading while authentication is being processed
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  // Enhanced authentication check with session validation
  React.useEffect(() => {
    if (requireServiceUser) {
      const sessionKey = sessionStorage.getItem('service_session_key')
      if (!sessionKey) {
        // Try to restore from store before redirecting
        try {
          const storeData = localStorage.getItem('service-user-storage')
          if (storeData) {
            const parsed = JSON.parse(storeData)
            const storeSessionKey = parsed?.state?.sessionKey
            if (storeSessionKey) {
              sessionStorage.setItem('service_session_key', storeSessionKey)
              return // Don't redirect if we restored the session
            }
          }
        } catch (error) {
          console.warn('Failed to restore session in ProtectedRoute:', error)
        }
        window.location.replace('/service-login')
      }
    }
  }, [requireServiceUser])

  // For service user routes, check service user authentication
  if (requireServiceUser) {
    if (!isServiceUserAuthenticated || !serviceUser) {
      // Try to restore session before redirecting
      const sessionKey = sessionStorage.getItem('service_session_key')
      if (!sessionKey) {
        try {
          const storeData = localStorage.getItem('service-user-storage')
          if (storeData) {
            const parsed = JSON.parse(storeData)
            const storeSessionKey = parsed?.state?.sessionKey
            if (storeSessionKey && parsed?.state?.serviceUser) {
              sessionStorage.setItem('service_session_key', storeSessionKey)
              // Allow component to render while store rehydrates
              return <>{children}</>
            }
          }
        } catch (error) {
          console.warn('Failed to restore session in ProtectedRoute render:', error)
        }
      }
      return <Navigate to="/service-login" replace />
    }
    return <>{children}</>
  }

  // For regular routes, check main authentication
  if (!isAuthenticated || !user) {
    // Don't redirect if we're still loading or if user just completed 2FA
    const has2FACredentials = sessionStorage.getItem('2fa_credentials')
    if (has2FACredentials) {
      return <Navigate to="/2fa" replace />
    }
    return <Navigate to="/login" replace />
  }

  // Master admin route protection
  if (requireMasterAdmin && !user.is_master_admin) {
    return <Navigate to="/unauthorized" replace />
  }

  // Company user route protection
  if (requireCompanyUser && !user.is_company_user) {
    return <Navigate to="/unauthorized" replace />
  }

  // First login check for company users - only redirect if NOT on the detailed-info page
  if (user.is_company_user && firstLoginRequired && window.location.pathname !== '/company/detailed-info') {
    return <Navigate to="/company/detailed-info" replace />
  }

  // Approval check for company users - only redirect if NOT on the waiting-approval page
  if (user.is_company_user && approvalPending && requireApproved && window.location.pathname !== '/company/waiting-approval') {
    return <Navigate to="/company/waiting-approval" replace />
  }

  return <>{children}</>
}

// Public Route Component (redirect if authenticated)
interface PublicRouteProps {
  children: React.ReactNode
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()

  // Only handle 2FA page specifically
  if (window.location.pathname === '/2fa') {
    return <>{children}</>
  }

  // For login page, don't interfere
  if (window.location.pathname === '/login') {
    return <>{children}</>
  }

  // Only redirect if user is authenticated and on root path
  if (isAuthenticated && user && window.location.pathname === '/') {
    if (user.is_master_admin) {
      return <Navigate to="/master-admin" replace />
    }
    
    if (user.is_company_user) {
      return <Navigate to="/company" replace />
    }
  }

  return <>{children}</>
}

// Loading wrapper
const SuspenseWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  }>
    {children}
  </Suspense>
)

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <SuspenseWrapper>
              <LoginPage />
            </SuspenseWrapper>
          </PublicRoute>
        }
      />

      <Route
        path="/2fa"
        element={
          <PublicRoute>
            <SuspenseWrapper>
              <TwoFactorPage />
            </SuspenseWrapper>
          </PublicRoute>
        }
      />

      {/* Master Admin Routes */}
      <Route
        path="/master-admin"
        element={
          <ProtectedRoute requireMasterAdmin>
            <SuspenseWrapper>
              <MasterAdminDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/master-admin/settings"
        element={
          <ProtectedRoute requireMasterAdmin>
            <SuspenseWrapper>
              <UltraSecureMasterAdminSettings />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Company User Routes */}
      <Route
        path="/company/detailed-info"
        element={
          <ProtectedRoute requireCompanyUser>
            <SuspenseWrapper>
              <DetailedInfoForm />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/waiting-approval"
        element={
          <ProtectedRoute requireCompanyUser>
            <SuspenseWrapper>
              <WaitingApproval />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/services"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <SuspenseWrapper>
              <ServiceSelection />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <CompanyDashboard />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/athens/password-reset"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <AthensFirstLoginPasswordReset />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/athens/profile"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <AthensProfileCompletion />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/athens/pending-approval"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <AthensPendingApproval />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/company/athens/induction"
        element={
          <ProtectedRoute requireCompanyUser requireApproved>
            <AthensAccessGuard>
              <SuspenseWrapper>
                <AthensInductionPending />
              </SuspenseWrapper>
            </AthensAccessGuard>
          </ProtectedRoute>
        }
      />

      {/* Service User Login */}
      <Route
        path="/service-login"
        element={
          <SuspenseWrapper>
            <ServiceUserLogin />
          </SuspenseWrapper>
        }
      />

      {/* Athens Service Login */}
      <Route
        path="/athens-login"
        element={
          <SuspenseWrapper>
            <AthensServiceLogin />
          </SuspenseWrapper>
        }
      />

      {/* Athens Password Reset */}
      <Route
        path="/athens-password-reset"
        element={
          <SuspenseWrapper>
            <AthensPasswordReset />
          </SuspenseWrapper>
        }
      />

      {/* Athens Admin Dashboard - Special Route */}
      <Route
        path="/athens-admin"
        element={
          <SuspenseWrapper>
            <AthensAdminDashboard />
          </SuspenseWrapper>
        }
      />


      {/* Employee Mobile App */}
      <Route
        path="/employee"
        element={
          <SuspenseWrapper>
            <EmployeeApp />
          </SuspenseWrapper>
        }
      />

      {/* Public Job Portal Routes */}
      <Route
        path="/jobs"
        element={
          <SuspenseWrapper>
            <JobPortal />
          </SuspenseWrapper>
        }
      />
      
      <Route
        path="/jobs/:jobId"
        element={
          <SuspenseWrapper>
            <PublicJobDetail />
          </SuspenseWrapper>
        }
      />
      
      <Route
        path="/jobs/:jobId/apply"
        element={
          <SuspenseWrapper>
            <JobApplication />
          </SuspenseWrapper>
        }
      />
      
      <Route
        path="/public/jobs/:jobId"
        element={
          <SuspenseWrapper>
            <PublicJobDetail />
          </SuspenseWrapper>
        }
      />





      {/* Service Dashboards - Protected */}
      <Route
        path="/services/finance/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <FinanceDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/finance/purchase-orders"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <PurchaseOrders />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/hr/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <HRDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/inventory/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <InventoryDashboard />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* CRM Service Routes - Protected */}
      <Route
        path="/services/crm/*"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <CRMRoutes />
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Athens Sustainability Routes - Company User Access */}
      <Route
        path="/services/athens_sustainability/*"
        element={
          <Navigate to="/login?redirect=athens" replace />
        }
      />

      {/* Athens Sustainability Dashboard */}
      <Route
        path="/services/sustainability/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-green-600 mb-4">Athens Sustainability Dashboard</h1>
                  <p className="text-gray-600">Athens Sustainability Dashboard coming soon!</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Generic Services Dashboard - redirect to appropriate service */}
      <Route
        path="/services/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-blue-600 mb-4">Service Dashboard</h1>
                  <p className="text-gray-600">Please select a specific service from your dashboard.</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/procurement/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-orange-600 mb-4">Procurement Dashboard</h1>
                  <p className="text-gray-600">Procurement Dashboard coming soon!</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/services/analytics/dashboard"
        element={
          <ProtectedRoute requireServiceUser>
            <SuspenseWrapper>
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-indigo-600 mb-4">Analytics Dashboard</h1>
                  <p className="text-gray-600">Business Analytics Dashboard coming soon!</p>
                </div>
              </div>
            </SuspenseWrapper>
          </ProtectedRoute>
        }
      />

      {/* Default Routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      <Route
        path="/unauthorized"
        element={
          <SuspenseWrapper>
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-4">Unauthorized</h1>
                <p className="text-gray-600">You don't have permission to access this page.</p>
              </div>
            </div>
          </SuspenseWrapper>
        }
      />

      <Route
        path="*"
        element={
          <SuspenseWrapper>
            <NotFoundPage />
          </SuspenseWrapper>
        }
      />
    </Routes>
  )
}
