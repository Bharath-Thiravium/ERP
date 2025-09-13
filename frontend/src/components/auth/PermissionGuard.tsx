import React from 'react'
import { Shield, Lock, AlertTriangle } from 'lucide-react'
import { usePermissions } from '../../hooks/usePermissions'

interface PermissionGuardProps {
  action: string
  resource: string
  context?: Record<string, any>
  children: React.ReactNode
  fallback?: React.ReactNode
  showFallback?: boolean
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  action,
  resource,
  context,
  children,
  fallback,
  showFallback = true
}) => {
  const { hasPermission, getUserRole, getServiceType } = usePermissions()

  const hasAccess = hasPermission(action, resource, context)

  if (hasAccess) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (!showFallback) {
    return null
  }

  // Default fallback UI
  return (
    <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="text-center">
        <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full inline-block mb-4">
          <Lock className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Access Restricted
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          You don't have permission to {action} {resource}.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-500">
          Current role: <span className="font-medium capitalize">{getUserRole()}</span>
          {getServiceType() && (
            <>
              {' • '}
              Service: <span className="font-medium capitalize">{getServiceType()}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Higher-order component for permission checking
export const withPermissions = (
  action: string,
  resource: string,
  context?: Record<string, any>
) => {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function PermissionWrappedComponent(props: P) {
      return (
        <PermissionGuard action={action} resource={resource} context={context}>
          <Component {...props} />
        </PermissionGuard>
      )
    }
  }
}

// Specific permission components for common use cases
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { isAdmin } = usePermissions()

  if (isAdmin()) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="flex items-center justify-center p-6 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
      <div className="text-center">
        <Shield className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
        <p className="text-amber-800 dark:text-amber-200 font-medium">
          Administrator access required
        </p>
      </div>
    </div>
  )
}

export const ManagerOrAbove: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback
}) => {
  const { isAdmin, isManager } = usePermissions()

  if (isAdmin() || isManager()) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="flex items-center justify-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="text-center">
        <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
        <p className="text-blue-800 dark:text-blue-200 font-medium">
          Manager or Administrator access required
        </p>
      </div>
    </div>
  )
}

export const ReadOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { canWrite } = usePermissions()

  if (canWrite('*')) {
    return <>{children}</>
  }

  // Disable all interactive elements for read-only users
  return (
    <div className="pointer-events-none opacity-75 relative">
      {children}
      <div className="absolute top-2 right-2 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs text-gray-600 dark:text-gray-400 border">
        <AlertTriangle className="h-3 w-3 inline mr-1" />
        Read Only
      </div>
    </div>
  )
}

// Hook for conditional rendering based on permissions
export const useConditionalRender = () => {
  const permissions = usePermissions()

  const renderIf = (
    condition: boolean,
    component: React.ReactNode,
    fallback?: React.ReactNode
  ) => {
    return condition ? component : (fallback || null)
  }

  const renderIfPermission = (
    action: string,
    resource: string,
    component: React.ReactNode,
    context?: Record<string, any>,
    fallback?: React.ReactNode
  ) => {
    const hasAccess = permissions.hasPermission(action, resource, context)
    return renderIf(hasAccess, component, fallback)
  }

  const renderIfRole = (
    roles: string | string[],
    component: React.ReactNode,
    fallback?: React.ReactNode
  ) => {
    const userRole = permissions.getUserRole()
    const allowedRoles = Array.isArray(roles) ? roles : [roles]
    const hasRole = allowedRoles.includes(userRole)
    return renderIf(hasRole, component, fallback)
  }

  return {
    renderIf,
    renderIfPermission,
    renderIfRole,
    ...permissions
  }
}

export default PermissionGuard
