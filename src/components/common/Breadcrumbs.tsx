import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { BreadcrumbItem } from '../../types';

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center space-x-1.5 text-xs text-[#64748B] select-none ${className}`} aria-label="Breadcrumb">
      <div className="flex items-center text-[#94A3B8] hover:text-[#0B1F33] transition-colors cursor-pointer">
        <Home className="w-3.5 h-3.5" />
      </div>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-3 h-3 text-[#CBD5E1] flex-shrink-0" />
          {item.isCurrent || index === items.length - 1 ? (
            <span className="font-semibold text-[#0B1F33] truncate max-w-[160px] sm:max-w-none">
              {item.label}
            </span>
          ) : (
            <button
              onClick={item.onClick}
              className="hover:text-[#0D5C63] transition-colors truncate max-w-[120px] sm:max-w-none cursor-pointer"
            >
              {item.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};
