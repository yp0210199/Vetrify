import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Pill, AlertCircle } from 'lucide-react';

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: 'emerald' | 'amber' | 'blue' | 'purple' | 'red' | 'slate';
  category?: string;
  sku?: string;
  keywords?: string[];
  disabled?: boolean;
  raw?: any;
}

export interface SearchableSelectProps {
  options: (SearchableOption | { value: string; label: string })[];
  value: string;
  onChange: (value: string, selectedOption?: SearchableOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  helperText?: string;
  clearable?: boolean;
  emptyText?: string;
  id?: string;
  name?: string;
  maxHeight?: string;
  renderOption?: (option: SearchableOption, isSelected: boolean) => React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  placeholder = '-- Select or search --',
  searchPlaceholder = 'Type to search...',
  label,
  required = false,
  disabled = false,
  className = '',
  error,
  helperText,
  clearable = true,
  emptyText = 'No matching items found',
  id,
  name,
  maxHeight = 'max-h-64',
  renderOption,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options to SearchableOption format
  const normalizedOptions: SearchableOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value,
          label: opt.label || opt.value,
          subLabel: (opt as SearchableOption).subLabel,
          badge: (opt as SearchableOption).badge,
          badgeColor: (opt as SearchableOption).badgeColor || 'slate',
          category: (opt as SearchableOption).category,
          sku: (opt as SearchableOption).sku,
          keywords: (opt as SearchableOption).keywords,
          disabled: (opt as SearchableOption).disabled || false,
          raw: (opt as SearchableOption).raw || opt,
        };
      }
      return {
        value: String(opt),
        label: String(opt),
      };
    });
  }, [options]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return normalizedOptions;

    return normalizedOptions.filter((opt) => {
      if (opt.label.toLowerCase().includes(q)) return true;
      if (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) return true;
      if (opt.sku && opt.sku.toLowerCase().includes(q)) return true;
      if (opt.category && opt.category.toLowerCase().includes(q)) return true;
      if (opt.badge && opt.badge.toLowerCase().includes(q)) return true;
      if (opt.keywords && opt.keywords.some((k) => k.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [normalizedOptions, searchQuery]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight on search change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Scroll active item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (opt: SearchableOption) => {
    if (opt.disabled) return;
    onChange(opt.value, opt);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', undefined);
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  };

  const getBadgeClass = (color?: string) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'red':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id ? `${id}-wrapper` : undefined}>
      {label && (
        <label className="text-[11px] font-semibold text-[#475569] block mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Trigger & Search Bar (Merged Component) */}
      <div
        className={`relative flex items-center w-full bg-white border ${
          error ? 'border-red-500 ring-2 ring-red-500/10' : isOpen ? 'border-[#0D5C63] ring-2 ring-[#0D5C63]/15' : 'border-[#CBD5E1] hover:border-[#94A3B8]'
        } rounded-xl text-xs transition-all cursor-pointer ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
      >
        <div className="pl-3 text-slate-400">
          <Search className="w-3.5 h-3.5" />
        </div>

        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            id={id}
            name={name}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedOption ? selectedOption.label : searchPlaceholder}
            className="w-full py-2.5 px-2.5 text-xs text-[#0B1F33] bg-transparent focus:outline-none placeholder:text-slate-400 font-medium"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="w-full py-2.5 px-2.5 text-xs truncate select-none flex items-center justify-between">
            {selectedOption ? (
              <span className="font-semibold text-[#0B1F33] truncate">
                {selectedOption.label}
                {selectedOption.subLabel && (
                  <span className="text-[11px] font-normal text-slate-500 ml-1.5 opacity-90 truncate">
                    ({selectedOption.subLabel})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-1 pr-2.5">
          {clearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'transform rotate-180 text-[#0D5C63]' : ''
            }`}
          />
        </div>
      </div>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150`}
        >
          {/* Quick stats or count banner */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 flex items-center justify-between">
            <span>{filteredOptions.length} available {filteredOptions.length === 1 ? 'match' : 'matches'}</span>
            <span className="text-[9px] text-slate-400">Use ↑↓ keys to navigate</span>
          </div>

          <div ref={listRef} className={`overflow-y-auto divide-y divide-slate-50 p-1 ${maxHeight}`}>
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                <AlertCircle className="w-4 h-4 mx-auto mb-1 text-slate-300" />
                <p>{emptyText}</p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-[11px] text-[#0D5C63] font-semibold hover:underline"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isHighlighted = idx === highlightedIndex;

                if (renderOption) {
                  return (
                    <div
                      key={opt.value || idx}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`cursor-pointer rounded-lg transition-colors ${
                        isHighlighted ? 'bg-slate-50' : ''
                      } ${isSelected ? 'bg-emerald-50/70 text-[#0D5C63]' : ''}`}
                    >
                      {renderOption(opt, isSelected)}
                    </div>
                  );
                }

                return (
                  <div
                    key={opt.value || idx}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-2.5 flex items-center justify-between gap-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      opt.disabled ? 'opacity-40 cursor-not-allowed bg-slate-50' : isHighlighted ? 'bg-[#F0FDF4] text-[#0B1F33]' : 'hover:bg-slate-50 text-slate-700'
                    } ${isSelected ? 'bg-[#ECFDF5] font-bold text-[#0D5C63]' : ''}`}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <Pill className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isSelected ? 'text-[#0D5C63]' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`truncate ${isSelected ? 'font-bold text-[#0D5C63]' : 'font-medium'}`}>
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getBadgeClass(opt.badgeColor)}`}>
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <p className="text-[10.5px] text-slate-500 truncate mt-0.5">
                            {opt.subLabel}
                          </p>
                        )}
                        {opt.sku && (
                          <span className="text-[9.5px] font-mono text-slate-400 mr-2">
                            SKU: {opt.sku}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-[#0D5C63] shrink-0 font-bold" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
      {!error && helperText && (
        <p className="text-[11px] text-[#64748B] mt-1">{helperText}</p>
      )}
    </div>
  );
};
export default SearchableSelect;
