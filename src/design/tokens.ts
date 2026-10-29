export const TOKENS = {
  colors: {
    brand: {
      primary: '#0066FF',     // Electric Blue
      primaryHover: '#0052CC',
      primaryLight: '#EFF6FF',
      secondary: '#0B1F33',   // Deep Navy Blue
      secondaryLight: '#183654',
      accent: '#00C9A7',      // Vibrant Teal
      accentHover: '#00A88B',
      accentLight: '#E6FAF6',
      tealDark: '#0D5C63',    // Deep Teal
      electricCyan: '#00E5FF',// Electric Cyan
    },
    surface: {
      page: '#F6F8FA',        // Cool Off-White background
      card: '#FFFFFF',
      elevated: '#FFFFFF',
      subtle: '#F1F5F9',
      border: '#E2E8F0',
      borderStrong: '#CBD5E1',
    },
    text: {
      primary: '#0B1F33',     // High-contrast Dark Navy
      secondary: '#475569',   // Slate-600
      muted: '#94A3B8',       // Slate-400
      inverse: '#FFFFFF',
    },
    status: {
      success: {
        text: '#15803D',
        bg: '#DCFCE7',
        border: '#86EFAC',
        solid: '#22C55E',
      },
      warning: {
        text: '#B45309',
        bg: '#FEF3C7',
        border: '#FCD34D',
        solid: '#F59E0B',
      },
      critical: {
        text: '#B91C1C',
        bg: '#FEE2E2',
        border: '#FCA5A5',
        solid: '#EF4444',
      },
      info: {
        text: '#1D4ED8',
        bg: '#DBEAFE',
        border: '#93C5FD',
        solid: '#3B82F6',
      },
    },
  },
  typography: {
    fontFamily: {
      sans: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      display: '2.25rem', // 36px
      h1: '1.75rem',      // 28px
      h2: '1.25rem',      // 20px
      h3: '1.125rem',     // 18px
      bodyLarge: '1rem',  // 16px
      body: '0.875rem',   // 14px
      bodySmall: '0.75rem',// 12px
      caption: '0.6875rem',// 11px
    },
  },
  borderRadius: {
    sm: '0.375rem',  // 6px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
    full: '9999px',
  },
  shadows: {
    card: '0 1px 3px 0 rgba(11, 31, 51, 0.05), 0 1px 2px 0 rgba(11, 31, 51, 0.03)',
    dropdown: '0 10px 15px -3px rgba(11, 31, 51, 0.08), 0 4px 6px -2px rgba(11, 31, 51, 0.04)',
    modal: '0 20px 25px -5px rgba(11, 31, 51, 0.12), 0 10px 10px -5px rgba(11, 31, 51, 0.06)',
  },
  breakpoints: {
    mobile: '390px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1440px',
  },
} as const;
