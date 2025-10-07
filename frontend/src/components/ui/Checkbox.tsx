import React from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ checked, onChange, label, className = '' }) => {
  return (
    <label className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />
      {label && <span className="ml-2 text-sm text-gray-900">{label}</span>}
    </label>
  );
};