import React from 'react';
import { Breadcrumbs } from './Breadcrumbs';
import { BreadcrumbItem } from '../../types';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  filters?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  badge,
  primaryAction,
  secondaryActions,
  filters,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-3 pb-5 border-b border-[#E2E8F0] ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B1F33] tracking-tight">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="text-xs sm:text-sm text-[#64748B] mt-0.5">{subtitle}</p>}
        </div>

        {(primaryAction || secondaryActions) && (
          <div className="flex items-center flex-wrap gap-2.5">
            {secondaryActions}
            {primaryAction}
          </div>
        )}
      </div>

      {filters && <div className="pt-2">{filters}</div>}
    </div>
  );
};
