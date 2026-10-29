import React, { useState } from 'react';
import { Layers, Grid, Box, Sparkles } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  dosageForm?: string; // Kept for interface backward compatibility, maps to Finish / Category
  schedule?: string;   // Maps to Quality Grade (Premium / Standard)
  className?: string;
  isColdChain?: boolean;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = 'Tile Catalog Item',
  size = 'md',
  dosageForm = 'Tile',
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

  const getFinishBackground = (finish: string) => {
    const f = (finish || '').toLowerCase();
    if (f.includes('gloss') || f.includes('polish')) {
      return 'from-teal-50 to-emerald-100 text-[#0D5C63] border-teal-200';
    }
    if (f.includes('matt') || f.includes('satin')) {
      return 'from-slate-50 to-slate-200 text-slate-700 border-slate-300';
    }
    if (f.includes('rustic') || f.includes('stone') || f.includes('carving')) {
      return 'from-amber-50 to-orange-100 text-amber-800 border-amber-200';
    }
    if (f.includes('sanitary') || f.includes('basin') || f.includes('closet')) {
      return 'from-sky-50 to-blue-100 text-sky-800 border-sky-200';
    }
    if (f.includes('faucet') || f.includes('fitting') || f.includes('chrome')) {
      return 'from-cyan-50 to-teal-100 text-teal-800 border-teal-200';
    }
    return 'from-slate-50 to-slate-100 text-slate-600 border-slate-200';
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
        /* Tiles & Sanitaryware Architectural Visual Fallback */
        <div
          className={`w-full h-full bg-gradient-to-br flex flex-col items-center justify-center p-1 border ${getFinishBackground(
            dosageForm
          )}`}
        >
          <Grid className={size === 'xs' ? 'w-3.5 h-3.5' : size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} />
          {size !== 'xs' && size !== 'sm' && (
            <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5 truncate max-w-full px-1">
              {dosageForm || 'Tile'}
            </span>
          )}
        </div>
      )}

      {/* Grade Badge */}
      {schedule && schedule !== 'OTC' && (
        <span
          className="absolute top-0.5 right-0.5 px-1 py-0.2 bg-[#0D5C63] text-white font-bold text-[8px] rounded uppercase shadow-xs tracking-tighter"
          title={`Grade: ${schedule}`}
        >
          {schedule}
        </span>
      )}
    </div>
  );
};
