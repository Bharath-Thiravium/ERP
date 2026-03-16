import { useMemo } from 'react'
import { useServiceUserStore } from '../store/serviceUserStore'

export interface Permission {
  action: string
  resource: string
  conditions?: Record<string, any>
}

export interface RolePermissions {
  [key: string]: Permission[]
}

// Define permissions for each role
const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    { action: 'read', resource: '*' },
    { action: 'write', resource: '*' },
    { action: 'delete', resource: '*' },
    { action: 'export', resource: '*' },
    { action: 'manage_users', resource: 'service' },
    { action: 'view_reports', resource: '*' },
    { action: 'manage_settings', resource: 'service' }
  ],
  manager: [
    { action: 'read', resource: '*' },
    { action: 'write', resource: 'transactions' },
    { action: 'write', resource: 'reports' },
    { action: 'export', resource: 'reports' },
    { action: 'view_reports', resource: '*' },
    { action: 'approve', resource: 'transactions', conditions: { amount: { max: 50000 } } }
  ],
  user: [
    { action: 'read', resource: 'transactions' },
    { action: 'read', resource: 'reports' },
    { action: 'write', resource: 'transactions', conditions: { amount: { max: 10000 } } },
    { action: 'export', resource: 'reports', conditions: { own_data: true } }
  ],
  viewer: [
    { action: 'read', resource: 'transactions' },
    { action: 'read', resource: 'reports' },
    { action: 'view_reports', resource: 'basic' }
  ]
}

// Service-specific permissions
const SERVICE_PERMISSIONS: Record<string, RolePermissions> = {
  finance: {
    admin: [
      ...ROLE_PERMISSIONS.admin,
      { action: 'manage_budgets', resource: 'finance' },
      { action: 'approve_payments', resource: 'finance' },
      { action: 'view_financial_analytics', resource: 'finance' }
    ],
    manager: [
      ...ROLE_PERMISSIONS.manager,
      { action: 'create_budgets', resource: 'finance' },
      { action: 'approve_expenses', resource: 'finance', conditions: { amount: { max: 25000 } } },
      { action: 'view_financial_reports', resource: 'finance' }
    ],
    user: [
      ...ROLE_PERMISSIONS.user,
      { action: 'submit_expenses', resource: 'finance' },
      { action: 'view_budget_status', resource: 'finance' }
    ],
    viewer: [
      ...ROLE_PERMISSIONS.viewer,
      { action: 'view_financial_summary', resource: 'finance' }
    ]
  },
  hr: {
    admin: [
      ...ROLE_PERMISSIONS.admin,
      { action: 'manage_employees', resource: 'hr' },
      { action: 'view_payroll', resource: 'hr' },
      { action: 'manage_benefits', resource: 'hr' }
    ],
    manager: [
      ...ROLE_PERMISSIONS.manager,
      { action: 'view_team_data', resource: 'hr' },
      { action: 'approve_leave', resource: 'hr' },
      { action: 'conduct_reviews', resource: 'hr' }
    ],
    user: [
      ...ROLE_PERMISSIONS.user,
      { action: 'view_own_data', resource: 'hr' },
      { action: 'request_leave', resource: 'hr' },
      { action: 'update_profile', resource: 'hr' }
    ],
    viewer: [
      ...ROLE_PERMISSIONS.viewer,
      { action: 'view_org_chart', resource: 'hr' }
    ]
  },
  inventory: {
    admin: [
      ...ROLE_PERMISSIONS.admin,
      { action: 'manage_suppliers', resource: 'inventory' },
      { action: 'configure_alerts', resource: 'inventory' },
      { action: 'manage_warehouses', resource: 'inventory' }
    ],
    manager: [
      ...ROLE_PERMISSIONS.manager,
      { action: 'approve_orders', resource: 'inventory' },
      { action: 'manage_stock_levels', resource: 'inventory' },
      { action: 'view_analytics', resource: 'inventory' }
    ],
    user: [
      ...ROLE_PERMISSIONS.user,
      { action: 'update_stock', resource: 'inventory' },
      { action: 'create_orders', resource: 'inventory', conditions: { amount: { max: 5000 } } },
      { action: 'scan_items', resource: 'inventory' }
    ],
    viewer: [
      ...ROLE_PERMISSIONS.viewer,
      { action: 'view_stock_levels', resource: 'inventory' }
    ]
  }
}

export const usePermissions = () => {
  const { serviceUser } = useServiceUserStore()

  const permissions = useMemo(() => {
    if (!serviceUser) return []

    const serviceType = serviceUser.service_type
    const role = serviceUser.role

    // Get service-specific permissions or fall back to general permissions
    const servicePerms = SERVICE_PERMISSIONS[serviceType]
    if (servicePerms && servicePerms[role]) {
      return servicePerms[role]
    }

    // Fall back to general role permissions
    return ROLE_PERMISSIONS[role] || []
  }, [serviceUser])

  const hasPermission = (action: string, resource: string, context?: Record<string, any>) => {
    if (!serviceUser) return false

    // Super admin always has access
    if (serviceUser.role === 'admin' && serviceUser.service_type === 'master') {
      return true
    }

    // Check if user has the specific permission
    const permission = permissions.find(p => 
      (p.action === action || p.action === '*') && 
      (p.resource === resource || p.resource === '*')
    )

    if (!permission) return false

    // Check conditions if they exist
    if (permission.conditions && context) {
      return checkConditions(permission.conditions, context)
    }

    return true
  }

  const checkConditions = (conditions: Record<string, any>, context: Record<string, any>): boolean => {
    for (const [key, condition] of Object.entries(conditions)) {
      const contextValue = context[key]

      if (typeof condition === 'object' && condition !== null) {
        // Handle complex conditions like { amount: { max: 10000 } }
        if ('max' in condition && contextValue > condition.max) return false
        if ('min' in condition && contextValue < condition.min) return false
        if ('equals' in condition && contextValue !== condition.equals) return false
      } else {
        // Handle simple equality conditions
        if (contextValue !== condition) return false
      }
    }

    return true
  }

  const canRead = (resource: string, context?: Record<string, any>) => 
    hasPermission('read', resource, context)

  const canWrite = (resource: string, context?: Record<string, any>) => 
    hasPermission('write', resource, context)

  const canDelete = (resource: string, context?: Record<string, any>) => 
    hasPermission('delete', resource, context)

  const canExport = (resource: string, context?: Record<string, any>) => 
    hasPermission('export', resource, context)

  const canManage = (resource: string, context?: Record<string, any>) => 
    hasPermission('manage', resource, context)

  const canApprove = (resource: string, context?: Record<string, any>) => 
    hasPermission('approve', resource, context)

  const getMaxAmount = (action: string, resource: string): number | null => {
    const permission = permissions.find(p => 
      (p.action === action || p.action === '*') && 
      (p.resource === resource || p.resource === '*')
    )

    if (permission?.conditions?.amount?.max) {
      return permission.conditions.amount.max
    }

    return null
  }

  const getUserRole = () => serviceUser?.role || 'viewer'

  const getServiceType = () => serviceUser?.service_type || ''

  const isAdmin = () => serviceUser?.role === 'admin'

  const isManager = () => serviceUser?.role === 'manager'

  const isUser = () => serviceUser?.role === 'user'

  const isViewer = () => serviceUser?.role === 'viewer'

  return {
    permissions,
    hasPermission,
    canRead,
    canWrite,
    canDelete,
    canExport,
    canManage,
    canApprove,
    getMaxAmount,
    getUserRole,
    getServiceType,
    isAdmin,
    isManager,
    isUser,
    isViewer,
    serviceUser
  }
}

export default usePermissions
