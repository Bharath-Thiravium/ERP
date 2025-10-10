import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useServiceUserStore } from '../store/serviceUserStore'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

// Lazy load components
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'))
const TwoFactorPage = React.lazy(() => import('../pages/auth/TwoFactorPage'))
const ServiceUserLogin = React.lazy(() => import('../pages/auth/ServiceUserLogin'))
const MasterAdminDashboard = React.lazy(() => import('../pages/master-admin/EnhancedDashboard'))
const UltraSecureMasterAdminSettings = React.lazy(() => import('../pages/master-admin/UltraSecureSettings'))
const CompanyDashboard = React.lazy(() => import('../pages/company/Dashboard'))
const DetailedInfoForm = React.lazy(() => import('../pages/company/DetailedInfoForm'))
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
  const { isAuthenticated, user, firstLoginRequired, approvalPending } = useAuthStore()
  const { isAuthenticated: isServiceUserAuthenticated, serviceUser } = useServiceUserStore()

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
  const { isAuthenticated, user, firstLoginRequired, approvalPending } = useAuthStore()

  // Only redirect if user is authenticated and NOT on login or 2FA pages
  if (isAuthenticated && user && 
      !window.location.pathname.includes('/login') && 
      !window.location.pathname.includes('/2fa')) {
    
    // Redirect based on user type and status
    if (user.is_master_admin) {
      return <Navigate to="/master-admin" replace />
    }
    
    if (user.is_company_user) {
      if (firstLoginRequired) {
        return <Navigate to="/company/detailed-info" replace />
      }

      if (approvalPending) {
        return <Navigate to="/company/waiting-approval" replace />
      }

      // For approved company users, redirect to dashboard
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
          <SuspenseWrapper>
            <TwoFactorPage />
          </SuspenseWrapper>
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
            <SuspenseWrapper>
              <CompanyDashboard />
            </SuspenseWrapper>
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
        path="/jobs/:jobId/apply"
        element={
          <SuspenseWrapper>
            <JobApplication />
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
