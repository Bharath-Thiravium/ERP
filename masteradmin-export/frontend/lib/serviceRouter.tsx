import React from 'react'
import { Routes, Route } from 'react-router-dom'
import LazyDashboard from '../components/ui/LazyDashboard'

// Lazy load service dashboards with better chunking
const FinanceDashboard = React.lazy(() => 
  import('../pages/services/finance/pages/Dashboard').then(module => ({
    default: module.default
  }))
)

const HRDashboard = React.lazy(() => 
  import('../pages/services/hr/pages/Dashboard').then(module => ({
    default: module.default
  }))
)

const InventoryDashboard = React.lazy(() => 
  import('../pages/services/inventory/pages/Dashboard').then(module => ({
    default: module.default
  }))
)

const PurchaseOrders = React.lazy(() => 
  import('../pages/services/finance/pages/PurchaseOrders').then(module => ({
    default: module.default
  }))
)

const CRMRoutes = React.lazy(() => 
  import('../pages/services/crm/index').then(module => ({
    default: module.default
  }))
)

const AthensSustainabilityDashboard = React.lazy(() => 
  import('../pages/services/athens-sustainability/Dashboard').then(module => ({
    default: module.default
  }))
)

export const ServiceRouter: React.FC = () => {
  return (
    <Routes>
      {/* Finance Service */}
      <Route
        path="/services/finance/dashboard"
        element={
          <LazyDashboard title="Finance Dashboard">
            <FinanceDashboard />
          </LazyDashboard>
        }
      />
      <Route
        path="/services/finance/purchase-orders"
        element={
          <LazyDashboard title="Purchase Orders">
            <PurchaseOrders />
          </LazyDashboard>
        }
      />

      {/* HR Service */}
      <Route
        path="/services/hr/dashboard"
        element={
          <LazyDashboard title="HR Dashboard">
            <HRDashboard />
          </LazyDashboard>
        }
      />

      {/* Inventory Service */}
      <Route
        path="/services/inventory/dashboard"
        element={
          <LazyDashboard title="Inventory Dashboard">
            <InventoryDashboard />
          </LazyDashboard>
        }
      />

      {/* CRM Service */}
      <Route
        path="/services/crm/*"
        element={
          <LazyDashboard title="CRM">
            <CRMRoutes />
          </LazyDashboard>
        }
      />

      {/* Athens Sustainability Service */}
      <Route
        path="/services/athens-sustainability/*"
        element={<AthensSustainabilityDashboard />}
      />
    </Routes>
  )
}