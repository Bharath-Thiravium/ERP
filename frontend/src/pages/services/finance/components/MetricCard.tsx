import React from 'react'
import { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red'
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-600 shadow-blue-500/25',
    green: 'from-green-500 to-emerald-600 shadow-green-500/25',
    purple: 'from-purple-500 to-violet-600 shadow-purple-500/25',
    orange: 'from-orange-500 to-red-600 shadow-orange-500/25',
    red: 'from-red-500 to-pink-600 shadow-red-500/25'
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[color]} p-6 text-white shadow-xl`}>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-white/20 rounded-xl">
            <Icon className="h-6 w-6" />
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