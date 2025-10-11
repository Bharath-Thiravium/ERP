import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'outline';
  className?: string;
  color?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '', color }) => {
  const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
  
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    outline: 'border border-gray-300 text-gray-700 bg-white'
  };

  const colorStyles = color ? {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800'
  }[color] : '';

  const finalClasses = color ? `${baseClasses} ${colorStyles}` : `${baseClasses} ${variantClasses[variant]}`;

  return (
    <span className={`${finalClasses} ${className}`}>
      {children}
    </span>
  );
};