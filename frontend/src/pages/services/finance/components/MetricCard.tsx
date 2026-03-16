import React from 'react'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'emerald' | 'indigo' | 'teal'
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'from-blue-50 via-blue-100 to-blue-200 shadow-blue-200/30 border-blue-300',
    green: 'from-green-50 via-green-100 to-green-200 shadow-green-200/30 border-green-300',
    purple: 'from-purple-50 via-purple-100 to-purple-200 shadow-purple-200/30 border-purple-300',
    orange: 'from-orange-50 via-orange-100 to-orange-200 shadow-orange-200/30 border-orange-300',
    red: 'from-red-50 via-red-100 to-red-200 shadow-red-200/30 border-red-300',
    emerald: 'from-emerald-50 via-emerald-100 to-emerald-200 shadow-emerald-200/30 border-emerald-300',
    indigo: 'from-indigo-50 via-indigo-100 to-indigo-200 shadow-indigo-200/30 border-indigo-300',
    teal: 'from-teal-50 via-teal-100 to-teal-200 shadow-teal-200/30 border-teal-300'
  }

  const iconColors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
    emerald: 'text-emerald-600',
    indigo: 'text-indigo-600',
    teal: 'text-teal-600'
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[color]} p-6 text-gray-800 shadow-lg border border-gray-300 dark:border-transparent`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-white/60 rounded-xl">
            <Icon className={`h-6 w-6 ${iconColors[color]}`} />
          </div>
          <div className="text-right">
            <div className="text-xs opacity-80">{title}</div>
            <div className="text-2xl font-bold">{value}</div>
          </div>
        </div>
        <div className="text-sm opacity-90">{subtitle}</div>
      </div>
    </div>
  )
}

export default MetricCard