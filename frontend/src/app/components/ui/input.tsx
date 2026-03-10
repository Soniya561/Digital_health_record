import React from 'react';

interface InputProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  icon?: React.ReactNode;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  accept?: string;
}

export function Input({
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  icon,
  label,
  required = false,
  disabled = false,
  accept,
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          accept={accept}
          className={`w-full px-4 py-3 ${icon ? 'pl-10' : ''} bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${className}`}
        />
      </div>
    </div>
  );
}
