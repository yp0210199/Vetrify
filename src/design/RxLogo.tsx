import React, { useState } from 'react';

export interface VetrifyLogoProps {
  variant?: 'primary' | 'symbol' | 'horizontal' | 'compact' | 'appIcon' | 'dark' | 'light';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTagline?: boolean;
}

export const VetrifyLogo: React.FC<VetrifyLogoProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  // Dimension presets for crisp rendering
  const symbolDimensions = {
    xs: { w: 24, h: 24, textScale: 'text-sm', tagSize: 'text-[7px]' },
    sm: { w: 32, h: 32, textScale: 'text-base', tagSize: 'text-[8px]' },
    md: { w: 40, h: 40, textScale: 'text-xl', tagSize: 'text-[9px]' },
    lg: { w: 52, h: 52, textScale: 'text-2xl', tagSize: 'text-[11px]' },
    xl: { w: 68, h: 68, textScale: 'text-3xl', tagSize: 'text-[12px]' },
  };

  const dim = symbolDimensions[size] || symbolDimensions.md;

  // Modern Faceted 'V' Geometric Brand Emblem
  const renderVetrifyEmblem = () => {
    return (
      <div
        className="flex-shrink-0 aspect-square inline-flex items-center justify-center select-none drop-shadow-sm transition-transform duration-200 hover:scale-105"
        style={{ width: `${dim.w}px`, height: `${dim.h}px`, aspectRatio: '1 / 1' }}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="vetrifyGradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5FF" />
              <stop offset="45%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#0369A1" />
            </linearGradient>
            <linearGradient id="vetrifyGradRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2FA36A" />
              <stop offset="60%" stopColor="#0D5C63" />
              <stop offset="100%" stopColor="#073B4C" />
            </linearGradient>
            <linearGradient id="vetrifyGloss" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
            </linearGradient>
            <filter id="vetrifyShadow" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0B1F33" floodOpacity="0.18" />
            </filter>
          </defs>

          {/* Background Rounded Shield */}
          <rect width="48" height="48" rx="12" fill="#0B1F33" />
          <rect width="46" height="46" x="1" y="1" rx="11" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          {/* Dynamic Left Wing of V */}
          <path
            d="M 9 10 L 19 10 L 24 35 L 17 38 L 9 10 Z"
            fill="url(#vetrifyGradLeft)"
            filter="url(#vetrifyShadow)"
          />

          {/* Dynamic Right Wing of V (overlapping) */}
          <path
            d="M 39 10 L 29 10 L 24 35 L 29 37 L 39 10 Z"
            fill="url(#vetrifyGradRight)"
          />

          {/* Center Diamond Prism / Core */}
          <polygon
            points="24,14 28,24 24,35 20,24"
            fill="#FFFFFF"
            fillOpacity="0.92"
          />
          <polygon
            points="24,14 26,24 24,35 22,24"
            fill="url(#vetrifyGloss)"
          />
        </svg>
      </div>
    );
  };

  // App Icon variant
  if (variant === 'appIcon') {
    const iconSize = Math.round(dim.w * 1.5);
    return (
      <div
        className={`inline-flex items-center justify-center flex-shrink-0 aspect-square ${className}`}
        style={{ width: `${iconSize}px`, height: `${iconSize}px`, aspectRatio: '1 / 1' }}
      >
        {renderVetrifyEmblem()}
      </div>
    );
  }

  // Symbol only variant (for collapsed sidebar & compact icons)
  if (variant === 'symbol') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} title="Vetrify">
        {renderVetrifyEmblem()}
      </div>
    );
  }

  const isLightText = variant === 'light' || variant === 'dark';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Vetrify Emblem */}
      {renderVetrifyEmblem()}

      {/* Typography Block matching Vetrify master wordmark */}
      <div className="flex flex-col justify-center">
        <div className="flex items-baseline tracking-normal leading-none">
          {/* "Vetr" with cyan-to-teal gradient styling */}
          <span
            className={`font-black tracking-tight ${dim.textScale} ${
              isLightText
                ? 'text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-[#60A5FA] to-[#93C5FD] drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]'
                : 'text-transparent bg-clip-text bg-gradient-to-r from-[#003B73] via-[#0284C7] to-[#0D5C63]'
            }`}
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            Vetr
          </span>

          {/* "ify" in deep rich navy or crisp white */}
          <span
            className={`font-extrabold tracking-tight ${dim.textScale} ${
              isLightText
                ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]'
                : 'text-[#0B1F33]'
            }`}
            style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
          >
            ify
          </span>
        </div>

        {/* BILLING • INVENTORY • E-COMMERCE Tagline */}
        {showTagline && size !== 'xs' && (
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`font-extrabold tracking-[0.16em] uppercase ${dim.tagSize} ${
                isLightText ? 'text-[#38BDF8]' : 'text-[#0D5C63]'
              }`}
            >
              BILLING
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#4ADE80] to-[#16A34A] flex-shrink-0 shadow-xs border border-[#86EFAC]/40" />
            <span
              className={`font-extrabold tracking-[0.16em] uppercase ${dim.tagSize} ${
                isLightText ? 'text-[#38BDF8]' : 'text-[#0D5C63]'
              }`}
            >
              INVENTORY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-[#4ADE80] to-[#16A34A] flex-shrink-0 shadow-xs border border-[#86EFAC]/40" />
            <span
              className={`font-extrabold tracking-[0.16em] uppercase ${dim.tagSize} ${
                isLightText ? 'text-[#38BDF8]' : 'text-[#0D5C63]'
              }`}
            >
              E-COMMERCE
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Backward-compatible alias
export const RxLogo = VetrifyLogo;
export default VetrifyLogo;
