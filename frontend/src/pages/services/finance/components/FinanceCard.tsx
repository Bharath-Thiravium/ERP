import React from 'react'

interface FinanceCardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

const FinanceCard: React.FC<FinanceCardProps> = ({ 
  children, 
  className = '', 
  padding = 'md' 
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  return (
    <div className={`bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-300 dark:border-gray-700/50 shadow-xl ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  )
}

export default FinanceCard