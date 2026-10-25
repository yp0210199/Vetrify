import React from 'react';
import {
  Search,
  Bell,
  HelpCircle,
  Building,
  Calendar,
  ChevronDown,
  Menu,
  Sparkles,
  Command,
} from 'lucide-react';
import { StoreContext, UserProfile } from '../types';
import { RxLogo } from '../design/RxLogo';

interface TopbarProps {
  currentStore: StoreContext;
  currentUser: UserProfile;
  unreadNotificationsCount?: number;
  onOpenSearch: () => void;
  onOpenHelp: () => void;
  onOpenNotifications: () => void;
  onOpenStoreSelector: () => void;
  onOpenProfile: () => void;
  onOpenMobileMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentStore,
  currentUser,
  unreadNotificationsCount = 0,
  onOpenSearch,
  onOpenHelp,
  onOpenNotifications,
  onOpenStoreSelector,
  onOpenProfile,
  onOpenMobileMenu,
}) => {
  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-3 sm:px-5 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 select-none z-20 flex-shrink-0">
      {/* Left: Mobile Navigation Drawer Toggle, Logo & Search */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 max-w-2xl">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile navigation menu"
          className="md:hidden p-2 text-[#475569] hover:text-[#0B1F33] hover:bg-[#F1F5F9] rounded-xl cursor-pointer flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="md:hidden flex-shrink-0">
          <RxLogo variant="compact" size="sm" showTagline={false} />
        </div>

        {/* Global Search Bar (Full-width accessible on Mobile, Tablet & Desktop) */}
        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] hover:border-[#94A3B8] rounded-xl text-xs text-[#64748B] transition-all cursor-pointer shadow-2xs group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Search className="w-4 h-4 text-[#0D5C63] group-hover:scale-105 transition-transform flex-shrink-0" />
              <span className="truncate text-[11px] sm:text-xs">
                Search medicines, batches...
              </span>
            </div>
            <kbd className="hidden lg:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-[#64748B] bg-white border border-[#CBD5E1] rounded shadow-2xs font-mono flex-shrink-0">
              Ctrl + K
            </kbd>
          </button>
        </div>
      </div>

      {/* Right: Branch Selector (Desktop/Tablet), Help, Notifications & User Profile */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5 flex-shrink-0">
        {/* Store & Branch Selector Trigger (Hidden on Mobile < md to give full space to Search, visible on Tablet/Desktop) */}
        <button
          type="button"
          onClick={onOpenStoreSelector}
          title={`Switch Branch: ${currentStore.name}`}
          className="hidden md:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#0B1F33] transition-colors cursor-pointer"
        >
          <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D5C63] flex-shrink-0" />
          <span className="max-w-[120px] lg:max-w-[160px] truncate text-xs">
            {currentStore.name}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] flex-shrink-0" />
        </button>

        {/* Date Widget (Desktop only) */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#475569]">
          <Calendar className="w-3.5 h-3.5 text-[#0D5C63]" />
          <span>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>

        {/* Command Palette & Help Trigger */}
        <button
          type="button"
          onClick={onOpenHelp}
          className="p-2 text-[#475569] hover:text-[#0D5C63] hover:bg-[#E6F4F1] rounded-xl transition-colors cursor-pointer"
          title="Command Palette & System Help"
        >
          <HelpCircle className="w-4.5 h-4.5" />
        </button>

        {/* Notification Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 text-[#475569] hover:text-[#0B1F33] hover:bg-[#F1F5F9] rounded-xl transition-colors cursor-pointer"
          title="Notifications & Operational Alerts"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center font-mono-num ring-2 ring-white">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-[#E2E8F0] mx-0.5 hidden sm:block" />

        {/* User Profile Area */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex items-center gap-2 pl-1 sm:pl-1.5 pr-1 sm:pr-2 py-1 rounded-xl hover:bg-[#F1F5F9] transition-colors cursor-pointer group"
          title={`Profile: ${currentUser.name}`}
        >
          <div className="w-8 h-8 rounded-full bg-[#0B1F33] text-white flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0 overflow-hidden border border-[#CBD5E1]">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name || 'User Avatar'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : currentUser.name ? (
              currentUser.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            ) : (
              'U'
            )}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-bold text-[#0B1F33] leading-none group-hover:text-[#0D5C63] transition-colors truncate max-w-[110px] md:max-w-[140px]">
              {currentUser.name || currentUser.email || 'Staff User'}
            </span>
            <span className="text-[10px] font-medium text-[#64748B] mt-0.5">{currentUser.role || 'Staff Member'}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] hidden sm:block flex-shrink-0" />
        </button>
      </div>
    </header>
  );
};
