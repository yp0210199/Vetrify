import React, { useState } from 'react';
import { Pill, Box, ShieldAlert } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  dosageForm?: string;
  schedule?: string;
  className?: string;
  isColdChain?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'Medicine',
  size = 'md',
  dosageForm = 'Tablet',
  schedule,
  className = '',
  isColdChain = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizeClasses = {
    xs: 'w-7 h-7 rounded-md text-[10px]',
    sm: 'w-10 h-10 rounded-lg text-xs',
    md: 'w-14 h-14 rounded-xl text-sm',
    lg: 'w-20 h-20 rounded-xl text-base',
    xl: 'w-32 h-32 rounded-2xl text-lg',
  };

  const getDosageFormBackground = (form: string) => {
    switch (form.toLowerCase()) {
      case 'tablet':
      case 'capsule':
        return 'from-sky-50 to-blue-100 text-sky-700 border-sky-200';
      case 'syrup':
      case 'suspension':
        return 'from-amber-50 to-orange-100 text-amber-700 border-amber-200';
      case 'injection':
        return 'from-emerald-50 to-teal-100 text-teal-700 border-teal-200';
      case 'ointment':
      case 'gel':
        return 'from-purple-50 to-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'from-slate-50 to-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden border bg-white flex-shrink-0 select-none ${
        sizeClasses[size]
      } ${className}`}
    >
      {src && !hasError ? (
        <>
          {isLoading && <div className="absolute inset-0 bg-slate-100 animate-pulse" />}
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
            className={`w-full h-full object-contain p-1 transition-opacity duration-200 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
          />
        </>
      ) : (
        /* Professional Pharmaceutical Fallback Icon */
        <div
          className={`w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-1 border ${getDosageFormBackground(
            dosageForm
          )}`}
        >
          <Pill className={size === 'xs' ? 'w-3.5 h-3.5' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} />
          {size !== 'xs' && size !== 'sm' && (
            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 truncate max-w-full px-1">
              {dosageForm}
            </span>
          )}
        </div>
      )}

      {/* Schedule Warning Tag (e.g. Schedule H / H1) */}
      {schedule && schedule !== 'OTC' && (
        <span
          className="absolute top-0.5 right-0.5 px-1 py-0.2 bg-red-600 text-white font-bold text-[8px] rounded uppercase shadow-xs tracking-tighter"
          title={`Schedule ${schedule} Restricted Drug`}
        >
          {schedule}
        </span>
      )}

      {/* Cold Chain Indicator (Ice Blue Dot) */}
      {isColdChain && (
        <span
          className="absolute bottom-0.5 left-0.5 w-2 h-2 rounded-full bg-cyan-500 ring-1 ring-white shadow-xs"
          title="2°C - 8°C Cold Chain Required"
        />
      )}
    </div>
  );
};
