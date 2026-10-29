import React, { useState } from 'react';

export interface VetrifyLogoProps {
  variant?: 'light' | 'dark' | 'symbol' | 'compact' | 'primary';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
  useImage?: boolean;
}

export const VetrifyLogo: React.FC<VetrifyLogoProps> = ({
  variant = 'primary',
  size = 'md',
  showTagline = false,
  className = '',
  useImage = false,
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeMap = {
    sm: {
      height: 28,
      imgHeight: 'h-7',
      text: 'text-base',
      tagline: 'text-[8px]',
      gap: 'gap-2',
      iconWidth: 26,
      iconHeight: 26,
    },
    md: {
      height: 36,
      imgHeight: 'h-9',
      text: 'text-xl',
      tagline: 'text-[9.5px]',
      gap: 'gap-2.5',
      iconWidth: 34,
      iconHeight: 34,
    },
    lg: {
      height: 48,
      imgHeight: 'h-12',
      text: 'text-2xl',
      tagline: 'text-[11px]',
      gap: 'gap-3',
      iconWidth: 44,
      iconHeight: 44,
    },
    xl: {
      height: 64,
      imgHeight: 'h-16',
      text: 'text-3xl',
      tagline: 'text-xs',
      gap: 'gap-3.5',
      iconWidth: 58,
      iconHeight: 58,
    },
  }[size];

  const isDarkBg = variant === 'dark' || variant === 'light';
  const primaryTextColor = isDarkBg ? 'text-white' : 'text-[#0B1F33]';
  const taglineColor = isDarkBg ? 'text-[#94A3B8]' : 'text-[#64748B]';

  // Primary Vetrify Icon asset
  const vetrifyIconAssetPath = '/assets/aistudio/Vetrify_Icon_ba7d5726.png';
  const imageAssetPath = '/assets/aistudio/Vetrify_Icon_ba7d5726.png';

  // Direct Vetrify Icon replacement from user attached artwork
  const BrandIcon = !imgError ? (
    <img
      src={vetrifyIconAssetPath}
      alt="Vetrify Icon"
      width={sizeMap.iconWidth}
      height={sizeMap.iconHeight}
      onError={() => setImgError(true)}
      className={`${sizeMap.imgHeight} w-auto object-contain rounded-lg flex-shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-sm`}
    />
  ) : (
    <svg
      width={sizeMap.iconWidth}
      height={sizeMap.iconHeight}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
    >
      <defs>
        <linearGradient id="vGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0B1F33" />
          <stop offset="35%" stopColor="#0052CC" />
          <stop offset="100%" stopColor="#0066FF" />
        </linearGradient>
        <linearGradient id="vGradRight" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="50%" stopColor="#00D2FF" />
          <stop offset="100%" stopColor="#00C9A7" />
        </linearGradient>
      </defs>
      <path
        d="M12 20L44 86C45.5 89 49.5 89 51 86L72 45L58 45L47.5 68L26 20H12Z"
        fill="url(#vGradLeft)"
      />
      <path
        d="M45 55L50 67C51 69 54 69 55 67L84 25C86 22 83 18 79 19L60 25C57 26 55 28 54 31L45 55Z"
        fill="url(#vGradRight)"
      />
      <rect x="74" y="8" width="7" height="7" rx="1.5" fill="#00C9A7" />
      <rect x="67" y="16" width="6" height="6" rx="1.5" fill="#00E5FF" />
      <rect x="76" y="18" width="5.5" height="5.5" rx="1" fill="#0066FF" />
    </svg>
  );

  // If variant is symbol only
  if (variant === 'symbol') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} title="Vetrify">
        {BrandIcon}
      </div>
    );
  }

  // If explicitly requested to render the crisp master brand image asset
  if (useImage && !imgError) {
    return (
      <div className={`inline-flex items-center select-none ${className}`}>
        <img
          src={imageAssetPath}
          alt="Vetrify - All-in-One Business Software"
          className={`${sizeMap.imgHeight} w-auto object-contain rounded-lg`}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center ${sizeMap.gap} select-none group ${className}`}>
      {BrandIcon}

      <div className="flex flex-col leading-none">
        <div className="flex items-baseline tracking-tight font-sans">
          <span className={`font-black ${sizeMap.text} ${primaryTextColor} tracking-tight`}>
            Vetr
          </span>
          <span className={`font-extrabold ${sizeMap.text} text-[#0066FF]`}>
            ify
          </span>
        </div>
        {showTagline && (
          <span className={`font-semibold uppercase tracking-wider ${sizeMap.tagline} ${taglineColor} mt-0.5`}>
            All-In-One Business Software
          </span>
        )}
      </div>
    </div>
  );
};

export default VetrifyLogo;
