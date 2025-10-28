import React from 'react';

interface CheckboxProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ 
  checked = false, 
  onChange, 
  onCheckedChange, 
  label, 
  className = '', 
  disabled = false,
  id 
}) => {
  const handleChange = (newChecked: boolean) => {
    onChange?.(newChecked);
    onCheckedChange?.(newChecked);
  };

  return (
    <label className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => handleChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
      />
      {label && <span className="ml-2 text-sm text-gray-900 dark:text-white">{label}</span>}
    </label>
  );
};