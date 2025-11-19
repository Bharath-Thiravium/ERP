// Utility functions for common styling patterns

export const gradientCardStyles = (color: string) => ({
  container: `bg-gradient-to-br from-${color}-50 to-${color}-100 dark:from-${color}-900/20 dark:to-${color}-800/20 rounded-xl p-6 border border-${color}-200 dark:border-${color}-700`,
  title: `text-sm font-medium text-${color}-700 dark:text-${color}-300`,
  value: `text-3xl font-bold text-${color}-900 dark:text-${color}-100`,
  subtitle: `text-sm text-${color}-600 dark:text-${color}-400`
})

export const buttonStyles = {
  glassmorphism: 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5',
  gradient: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-0.5'
}

export const statusColors = {
  approved: 'text-green-600 bg-green-100 dark:bg-green-900/20',
  pending: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
  rejected: 'text-red-600 bg-red-100 dark:bg-red-900/20',
  suspended: 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
}

export const cardContainer = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'

export const getStatusColor = (status: string) => {
  return statusColors[status as keyof typeof statusColors] || statusColors.suspended
}

// Severity-based styling for alerts and notifications
export const severityStyles = {
  critical: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
}

export const getSeverityStyle = (severity: string) => {
  return severityStyles[severity as keyof typeof severityStyles] || severityStyles.info
}

// Connection status styling
export const connectionStatus = {
  connected: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800',
  disconnected: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
}

export const getConnectionStatus = (isConnected: boolean) => {
  return isConnected ? connectionStatus.connected : connectionStatus.disconnected
}