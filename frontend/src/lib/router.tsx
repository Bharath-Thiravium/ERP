import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'

// Lazy load components
const LoginPage = React.lazy(() => import('../pages/auth/LoginPage'))
const ServiceUserLogin = React.lazy(() => import('../pages/auth/ServiceUserLogin'))
const MasterAdminDashboard = React.lazy(() => import('../pages/master-admin/EnhancedDashboard'))
const MasterAdminSettings = React.lazy(() => import('../pages/master-admin/Settings'))
const CompanyDashboard = React.lazy(() => import('../pages/company/Dashboard'))
const DetailedInfoForm = React.lazy(() => import('../pages/company/DetailedInfoForm'))
const ServiceSelection = React.lazy(() => import('../pages/company/ServiceSelection'))
const FinanceDashboard = React.lazy(() => import('../pages/services/finance/pages/Dashboard'))
const PurchaseOrders = React.lazy(() => import('../pages/services/finance/pages/PurchaseOrders'))
const HRDashboard = React.lazy(() => import('../pages/services/hr/pages/Dashboard'))
const InventoryDashboard = React.lazy(() => import('../pages/services/inventory/pages/Dashboard'))
const WaitingApproval = React.lazy(() => import('../pages/company/WaitingApproval'))
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'))

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode
  requireMasterAdmin?: boolean
  requireCompanyUser?: boolean
  requireApproved?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireMasterAdmin = false,
  requireCompanyUser = false,
  requireApproved = false,
}) => {
  const { isAuthenticated, user, firstLoginRequired, approvalPending } = useAuthStore()

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

  console.log('🔍 DEBUG: PublicRoute render', {
    isAuthenticated,
    user: user ? {
      email: user.email,
      is_master_admin: user.is_master_admin,
      is_company_user: user.is_company_user
    } : null,
    firstLoginRequired,
    approvalPending
  })

  if (isAuthenticated && user) {
    console.log('🔍 DEBUG: User is authenticated, redirecting...')
    // Redirect based on user type and status
    if (user.is_master_admin) {
      console.log('🔍 DEBUG: Redirecting to master-admin dashboard')
      return <Navigate to="/master-admin" replace />
    }
    
    if (user.is_company_user) {
      console.log('🔍 DEBUG: Company user detected')
      console.log('🔍 DEBUG: firstLoginRequired:', firstLoginRequired)
      console.log('🔍 DEBUG: approvalPending:', approvalPending)

      if (firstLoginRequired) {
        console.log('🔍 DEBUG: Redirecting to /company/detailed-info')
        return <Navigate to="/company/detailed-info" replace />
      }

      if (approvalPending) {
        console.log('🔍 DEBUG: Redirecting to /company/waiting-approval')
        return <Navigate to="/company/waiting-approval" replace />
      }

      // For approved company users, redirect to dashboard
      // The dashboard will handle checking if services are assigned
      console.log('🔍 DEBUG: Company approved, redirecting to dashboard')
      return <Navigate to="/company" replace />
    }

    console.log('🔍 DEBUG: User type not recognized or missing flags:', {
      is_master_admin: user.is_master_admin,
      is_company_user: user.is_company_user,
      user
    })
  }

  console.log('🔍 DEBUG: Showing login page (not authenticated)')
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
              <MasterAdminSettings />
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



      {/* Service Dashboards */}
      <Route
        path="/services/finance/dashboard"
        element={
          <SuspenseWrapper>
            <FinanceDashboard />
          </SuspenseWrapper>
        }
      />

      <Route
        path="/services/finance/purchase-orders"
        element={
          <SuspenseWrapper>
            <PurchaseOrders />
          </SuspenseWrapper>
        }
      />



      <Route
        path="/services/hr/dashboard"
        element={
          <SuspenseWrapper>
            <HRDashboard />
          </SuspenseWrapper>
        }
      />

      <Route
        path="/services/inventory/dashboard"
        element={
          <SuspenseWrapper>
            <InventoryDashboard service={{ name: 'Inventory Management', service_type: 'inventory' }} />
          </SuspenseWrapper>
        }
      />

      {/* Other Service Dashboards - Placeholder for now */}
      <Route
        path="/services/crm/dashboard"
        element={
          <SuspenseWrapper>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-green-600 mb-4">CRM Dashboard</h1>
                <p className="text-gray-600">Customer Relations Dashboard coming soon!</p>
              </div>
            </div>
          </SuspenseWrapper>
        }
      />

      <Route
        path="/services/procurement/dashboard"
        element={
          <SuspenseWrapper>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-orange-600 mb-4">Procurement Dashboard</h1>
                <p className="text-gray-600">Procurement Dashboard coming soon!</p>
              </div>
            </div>
          </SuspenseWrapper>
        }
      />

      <Route
        path="/services/analytics/dashboard"
        element={
          <SuspenseWrapper>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-indigo-600 mb-4">Analytics Dashboard</h1>
                <p className="text-gray-600">Business Analytics Dashboard coming soon!</p>
              </div>
            </div>
          </SuspenseWrapper>
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
