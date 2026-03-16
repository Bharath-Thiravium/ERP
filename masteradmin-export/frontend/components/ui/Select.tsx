import React from 'react';

interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onChange?: (value: string) => void;
  options?: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({ value, onChange, onValueChange, options, placeholder, className = '', children }) => {
  const handleChange = (val: string) => {
    onChange?.(val);
    onValueChange?.(val);
  };

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options?.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}{option.disabled ? ' (Not Available)' : ''}
        </option>
      )) || []}
      {children}
    </select>
  );
};

export const SelectContent: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const SelectItem: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => <option value={value}>{children}</option>;
export const SelectTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;
export const SelectValue: React.FC<{ placeholder?: string }> = ({ placeholder }) => <span>{placeholder}</span>;