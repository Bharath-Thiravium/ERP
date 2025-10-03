import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import CRMLayout from './CRMLayout'
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner'
import { useServiceUserStore } from '../../../store/serviceUserStore'

// Lazy load all CRM pages for better performance
const CRMDashboard = React.lazy(() => import('./components/CRMDashboard').then(m => ({ default: m.CRMDashboard })))
const LeadsPage = React.lazy(() => import('./pages/LeadsPage').then(m => ({ default: m.LeadsPage })))
const ContactsPage = React.lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })))
const AccountsPage = React.lazy(() => import('./pages/AccountsPage').then(m => ({ default: m.AccountsPage })))
const OpportunitiesPage = React.lazy(() => import('./pages/OpportunitiesPage').then(m => ({ default: m.OpportunitiesPage })))
const ActivitiesPage = React.lazy(() => import('./pages/ActivitiesPage').then(m => ({ default: m.ActivitiesPage })))
const CampaignsPage = React.lazy(() => import('./pages/CampaignsPage').then(m => ({ default: m.CampaignsPage })))
const CustomerSupport = React.lazy(() => import('./pages/CustomerSupport'))
const LeadScoringDashboard = React.lazy(() => import('./pages/LeadScoringDashboard'))
const SalesPipeline = React.lazy(() => import('./pages/SalesPipeline').then(m => ({ default: m.SalesPipeline })))
const CustomerAnalytics = React.lazy(() => import('./pages/CustomerAnalytics').then(m => ({ default: m.CustomerAnalytics })))
const MarketingAutomation = React.lazy(() => import('./pages/MarketingAutomation').then(m => ({ default: m.MarketingAutomation })))
const AdvancedReporting = React.lazy(() => import('./pages/AdvancedReporting').then(m => ({ default: m.AdvancedReporting })))
const IntegrationManagement = React.lazy(() => import('./pages/IntegrationManagement'))
const SecurityCompliance = React.lazy(() => import('./pages/SecurityCompliance'))
const SettingsPage = React.lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

// Loading component for suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <LoadingSpinner size="lg" />
  </div>
)

// CRM Router Component
const CRMRouter: React.FC = () => {
  const { sessionKey } = useServiceUserStore()
  
  return (
    <Routes>
      {/* Dashboard Route */}
      <Route 
        path="/" 
        element={
          <CRMLayout currentPage="overview">
            <Suspense fallback={<PageLoader />}>
              <CRMDashboard />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      {/* Sales Management Routes */}
      <Route 
        path="/leads" 
        element={
          <CRMLayout currentPage="leads">
            <Suspense fallback={<PageLoader />}>
              <LeadsPage />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/opportunities" 
        element={
          <CRMLayout currentPage="opportunities">
            <Suspense fallback={<PageLoader />}>
              <OpportunitiesPage />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/pipeline" 
        element={
          <CRMLayout currentPage="pipeline">
            <Suspense fallback={<PageLoader />}>
              <SalesPipeline sessionKey={sessionKey || ''} />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/lead-scoring" 
        element={
          <CRMLayout currentPage="lead-scoring">
            <Suspense fallback={<PageLoader />}>
              <LeadScoringDashboard />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      {/* Customer Management Routes */}
      <Route 
        path="/accounts" 
        element={
          <CRMLayout currentPage="accounts">
            <Suspense fallback={<PageLoader />}>
              <AccountsPage />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/contacts" 
        element={
          <CRMLayout currentPage="contacts">
            <Suspense fallback={<PageLoader />}>
              <ContactsPage />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/analytics" 
        element={
          <CRMLayout currentPage="analytics">
            <Suspense fallback={<PageLoader />}>
              <CustomerAnalytics sessionKey={sessionKey || ''} />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/support" 
        element={
          <CRMLayout currentPage="support">
            <Suspense fallback={<PageLoader />}>
              <CustomerSupport />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      {/* Marketing & Automation Routes */}
      <Route 
        path="/campaigns" 
        element={
          <CRMLayout currentPage="campaigns">
            <Suspense fallback={<PageLoader />}>
              <CampaignsPage />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/marketing" 
        element={
          <CRMLayout currentPage="marketing">
            <Suspense fallback={<PageLoader />}>
              <MarketingAutomation />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/activities" 
        element={
          <CRMLayout currentPage="activities">
            <Suspense fallback={<PageLoader />}>
              <ActivitiesPage />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      {/* Analytics & Reports Routes */}
      <Route 
        path="/reporting" 
        element={
          <CRMLayout currentPage="reporting">
            <Suspense fallback={<PageLoader />}>
              <AdvancedReporting />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      {/* System Management Routes */}
      <Route 
        path="/integration" 
        element={
          <CRMLayout currentPage="integration">
            <Suspense fallback={<PageLoader />}>
              <IntegrationManagement />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/security" 
        element={
          <CRMLayout currentPage="security">
            <Suspense fallback={<PageLoader />}>
              <SecurityCompliance />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      <Route 
        path="/settings" 
        element={
          <CRMLayout currentPage="settings">
            <Suspense fallback={<PageLoader />}>
              <SettingsPage />
            </Suspense>
          </CRMLayout>
        } 
      />
      
      {/* Fallback route */}
      <Route 
        path="*" 
        element={
          <CRMLayout>
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400">The requested CRM page could not be found.</p>
            </div>
          </CRMLayout>
        } 
      />
    </Routes>
  )
}

export default CRMRouter