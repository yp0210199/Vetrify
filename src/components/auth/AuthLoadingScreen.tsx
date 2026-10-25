import React from 'react';
import { RxLogo } from '../../design/RxLogo';
import { ShieldCheck } from 'lucide-react';

interface AuthLoadingScreenProps {
  message?: string;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  message = 'Initializing secure pharmacy session...',
}) => {
  return (
    <div
      id="rx-auth-loading-screen"
      className="min-h-screen w-full bg-[#0B1F33] flex flex-col items-center justify-center p-6 text-white select-none relative overflow-hidden"
    >
      {/* Background Subtle Gradient Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0D5C63]/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#2FA36A]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Content Box */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full animate-fade-in">
        {/* Vetrify High-Definition Emblem */}
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#132C46]/80 border border-[#1E3A5F] flex items-center justify-center shadow-xl shadow-black/40">
            <RxLogo variant="symbol" size="lg" />
          </div>
          {/* Animated Spinner Ring */}
          <div className="absolute -inset-2 border-2 border-t-[#00E5FF] border-r-transparent border-b-[#2FA36A] border-l-transparent rounded-2xl animate-spin" />
        </div>

        {/* Wordmark */}
        <div className="mb-2">
          <span className="text-2xl font-black tracking-tight text-white">Vetr</span>
          <span className="text-2xl font-bold tracking-tight text-[#00E5FF]">ify</span>
        </div>

        <p className="text-xs text-[#94A3B8] font-medium tracking-wide mb-6">
          Billing, Inventory &amp; E-commerce Platform
        </p>

        {/* Status Message */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#132C46]/80 border border-[#1E3A5F] text-xs font-semibold text-[#CBD5E1]">
          <ShieldCheck className="w-4 h-4 text-[#2FA36A] animate-pulse" />
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
};
