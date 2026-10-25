import React from 'react';
import { Search, Barcode, Calendar, AlertCircle } from 'lucide-react';

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  hint,
  children,
  className = '',
  id,
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`} id={id}>
      {label && (
        <label className="text-xs font-semibold text-[#0B1F33] flex items-center justify-between">
          <span>
            {label} {required && <span className="text-[#EF4444]">*</span>}
          </span>
          {hint && <span className="text-[11px] font-normal text-[#64748B]">{hint}</span>}
        </label>
      )}
      {children}
      {error && (
        <span className="text-[11px] font-medium text-[#EF4444] flex items-center gap-1 mt-0.5">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, hint, icon, required, className = '', ...props }) => {
  return (
    <FormField label={label} required={required} error={error} hint={hint}>
      <TextInput icon={icon} hasError={!!error} className={className} {...props} />
    </FormField>
  );
};

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  hasError?: boolean;
}

function cleanInputProps<T extends React.InputHTMLAttributes<HTMLInputElement>>(props: T): T {
  const cleaned: Record<string, any> = { ...props };
  if (typeof cleaned.max === 'number' && Number.isNaN(cleaned.max)) {
    delete cleaned.max;
  }
  if (typeof cleaned.min === 'number' && Number.isNaN(cleaned.min)) {
    delete cleaned.min;
  }
  if (typeof cleaned.step === 'number' && Number.isNaN(cleaned.step)) {
    delete cleaned.step;
  }
  if (typeof cleaned.maxLength === 'number' && Number.isNaN(cleaned.maxLength)) {
    delete cleaned.maxLength;
  }
  if (typeof cleaned.minLength === 'number' && Number.isNaN(cleaned.minLength)) {
    delete cleaned.minLength;
  }
  if (typeof cleaned.value === 'number' && Number.isNaN(cleaned.value)) {
    cleaned.value = '';
  }
  return cleaned as T;
}

export const TextInput: React.FC<TextInputProps> = ({
  icon,
  iconPosition = 'left',
  hasError = false,
  className = '',
  ...props
}) => {
  const safeProps = cleanInputProps(props);
  const renderIcon = (iconNode: React.ReactNode) => {
    if (!iconNode) return null;
    if (React.isValidElement(iconNode)) return iconNode;
    if (typeof iconNode === 'function' || typeof iconNode === 'object') {
      const IconComp = iconNode as React.ElementType;
      return <IconComp className="w-4 h-4" />;
    }
    return iconNode;
  };

  return (
    <div className="relative flex items-center w-full">
      {icon && iconPosition === 'left' && (
        <div className="absolute left-3 text-[#64748B] pointer-events-none flex items-center justify-center">
          {renderIcon(icon)}
        </div>
      )}
      <input
        className={`w-full bg-white border ${
          hasError ? 'border-[#EF4444] focus:ring-[#EF4444]/20' : 'border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-[#0D5C63]/20'
        } rounded-lg text-sm text-[#0B1F33] placeholder-[#94A3B8] transition-all duration-150 focus:outline-none focus:ring-3 disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed ${
          icon && iconPosition === 'left' ? 'pl-9.5' : 'pl-3.5'
        } ${icon && iconPosition === 'right' ? 'pr-9.5' : 'pr-3.5'} py-2 h-9.5 ${className}`}
        {...safeProps}
      />
      {icon && iconPosition === 'right' && (
        <div className="absolute right-3 text-[#64748B] pointer-events-none flex items-center justify-center">
          {renderIcon(icon)}
        </div>
      )}
    </div>
  );
};

export const CurrencyInput: React.FC<TextInputProps> = ({ className = '', ...props }) => {
  const safeProps = cleanInputProps(props);
  return (
    <div className="relative flex items-center w-full">
      <div className="absolute left-3 text-sm font-bold text-[#0D5C63] pointer-events-none">
        ₹
      </div>
      <input
        type="number"
        step="0.01"
        className={`w-full bg-white border border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-3 focus:ring-[#0D5C63]/20 rounded-lg text-sm font-mono-num text-[#0B1F33] placeholder-[#94A3B8] pl-7 pr-3 py-2 h-9.5 focus:outline-none ${className}`}
        {...safeProps}
      />
    </div>
  );
};

export const SearchInput: React.FC<TextInputProps & { onClear?: () => void; shortcutHint?: string }> = ({
  shortcutHint,
  className = '',
  ...props
}) => {
  return (
    <div className="relative flex items-center w-full">
      <Search className="absolute left-3 w-4 h-4 text-[#64748B] pointer-events-none" />
      <input
        type="text"
        className={`w-full bg-white border border-[#CBD5E1] hover:border-[#94A3B8] focus:border-[#0D5C63] focus:ring-3 focus:ring-[#0D5C63]/20 rounded-lg text-sm text-[#0B1F33] placeholder-[#64748B] pl-9.5 pr-14 py-2 h-9.5 focus:outline-none transition-all ${className}`}
        {...props}
      />
      {shortcutHint && (
        <div className="absolute right-2.5 flex items-center gap-1">
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] border border-[#CBD5E1] rounded shadow-2xs font-mono">
            {shortcutHint}
          </kbd>
        </div>
      )}
    </div>
  );
};

export const BarcodeInput: React.FC<TextInputProps> = ({ className = '', ...props }) => {
  return (
    <div className="relative flex items-center w-full">
      <Barcode className="absolute left-3 w-4 h-4 text-[#0D5C63] pointer-events-none" />
      <input
        type="text"
        placeholder="Scan barcode or type code..."
        className={`w-full bg-white border border-[#CBD5E1] focus:border-[#0D5C63] focus:ring-3 focus:ring-[#0D5C63]/20 rounded-lg text-sm font-mono-num text-[#0B1F33] placeholder-[#94A3B8] pl-9.5 pr-3.5 py-2 h-9.5 focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string }[];
  hasError?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  options = [],
  children,
  hasError = false,
  className = '',
  ...props
}) => {
  return (
    <select
      className={`w-full bg-white border ${
        hasError ? 'border-[#EF4444]' : 'border-[#CBD5E1] focus:border-[#0D5C63]'
      } focus:ring-3 focus:ring-[#0D5C63]/20 rounded-lg text-sm text-[#0B1F33] px-3 py-2 h-9.5 focus:outline-none transition-all cursor-pointer ${className}`}
      {...props}
    >
      {options.length > 0
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );
};

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}> = ({ checked, onChange, label, description, disabled = false }) => {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      {(label || description) && (
        <div className="flex flex-col">
          {label && <span className="text-xs font-semibold text-[#0B1F33]">{label}</span>}
          {description && <span className="text-[11px] text-[#64748B]">{description}</span>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-5.5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0D5C63] focus:ring-offset-2 ${
          checked ? 'bg-[#2FA36A]' : 'bg-[#CBD5E1]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-4.5' : 'translate-x-0'
          }`}
        />
      </button>
    </label>
  );
};

export { SearchableSelect, type SearchableOption, type SearchableSelectProps } from './SearchableSelect';

