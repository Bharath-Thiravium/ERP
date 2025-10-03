import React from 'react'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray'
  trend?: {
    value: number
    label: string
    direction: 'up' | 'down'
  }
  description?: string
  onClick?: () => void
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  description,
  onClick
}) => {
  const colorClasses = {
    blue: {
      icon: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600'
    },
    green: {
      icon: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600'
    },
    orange: {
      icon: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-600'
    },
    purple: {
      icon: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      text: 'text-purple-600'
    },
    red: {
      icon: 'text-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600'
    },
    gray: {
      icon: 'text-gray-600',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      text: 'text-gray-600'
    }
  }

  const classes = colorClasses[color]

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className={`text-2xl font-bold ${classes.text}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              {trend.direction === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.value}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${classes.bg}`}>
          <Icon className={`h-6 w-6 ${classes.icon}`} />
        </div>
      </div>
    </div>
  )
}

export default StatsCard