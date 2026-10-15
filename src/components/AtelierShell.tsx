import React, { useState, useEffect, useRef } from 'react';
import { Type } from 'lucide-react';
import { DynamicIslandNotificationCenter } from './notifications/DynamicIslandNotificationCenter';
import { StudioDustMotes } from './StudioDustMotes';
import { FontSelectorModal } from './common/FontSelectorModal';
import { getSelectedFont, FontOption } from '../utils/fontManager';

interface AtelierShellProps {
  id?: string;
  children: React.ReactNode;
  showStatusBar?: boolean;
  className?: string;
  bottomPadding?: string;
  onNavigateToTab?: (tab: string) => void;
  isWideLayout?: boolean;
  headerContent?: React.ReactNode;
}

export const AtelierShell: React.FC<AtelierShellProps> = ({
  id = 'atelier-page-container',
  children,
  showStatusBar = true,
  className = '',
  bottomPadding = 'pb-20 sm:pb-24',
  onNavigateToTab: _onNavigateToTab,
  isWideLayout = false,
  headerContent,
}) => {
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [, setCurrentFont] = useState<FontOption>(() => getSelectedFont());
  
  // Listen for font changes and global open events
  useEffect(() => {
    const handleFontChange = (e: any) => {
      if (e.detail?.font) {
        setCurrentFont(e.detail.font);
      }
    };
    const handleOpenModal = () => setIsFontModalOpen(true);

    window.addEventListener('atelier-font-changed', handleFontChange);
    window.addEventListener('open-font-selector', handleOpenModal);
    return () => {
      window.removeEventListener('atelier-font-changed', handleFontChange);
      window.removeEventListener('open-font-selector', handleOpenModal);
    };
  }, []);
  
  // Detect low-end or mobile screens once
  const isLowEndOrMobile = typeof window !== 'undefined' && (
    window.innerWidth <= 768 || 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const containerSizing = isWideLayout
    ? 'w-full max-w-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl h-[100dvh] sm:border-x sm:border-slate-300/80 sm:shadow-2xl'
    : 'w-full max-w-full sm:max-w-[480px] md:max-w-[500px] lg:max-w-[520px] h-[100dvh] sm:border-x sm:border-stone-200/70 sm:shadow-[0_20px_50px_rgba(15,23,42,0.12)]';

  return (
    <div
      id={id}
      className={`relative w-full ${containerSizing} mx-auto glass-panel-vitality overflow-hidden rounded-none flex flex-col justify-start select-none transition-shadow duration-300 ${className}`}
    >
      {/* ─── Brand Light Gradient Background (Architectural Ivory & Titanium Slate) ─── */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10 bg-gradient-to-b from-white via-[#fafaf9] via-60% to-[#f4f0f2]"
        style={{ contain: 'paint', clipPath: 'inset(0)' }}
      >
        {/* Soft Brand Light Atmospheric Blooms (Apple Dark Cherry & Ivory) */}
        <div className="absolute -top-16 -right-16 w-[420px] h-[420px] rounded-full bg-gradient-to-br from-[#721c24]/5 via-[#f6f2f4]/60 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -left-20 w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-[#d9c5cb]/25 via-white to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[450px] h-[360px] rounded-full bg-gradient-to-t from-[#f6f2f4]/60 via-white/80 to-transparent blur-3xl pointer-events-none" />

        {/* Ambient Floating Dust Motes (Desktop only, auto-skipped on mobile) */}
        {!isLowEndOrMobile && (
          <StudioDustMotes particleCount={24} speedMultiplier={0.4} intensity={0.5} />
        )}

        {/* Crisp Top Ambient Gradient for optimal status bar & header contrast */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-white via-white/70 to-transparent pointer-events-none" />
      </div>

      {/* iOS / Mobile Main Single Header Bar */}
      {showStatusBar && headerContent && (
        <header
          id="ios-status-bar"
          className="relative z-40 px-3 sm:px-5 pt-[max(0.35rem,env(safe-area-inset-top,0px))] pb-1 sm:pb-2 min-h-[40px] sm:min-h-[48px] flex items-center text-stone-800 text-xs font-semibold tracking-tight shrink-0 select-none bg-transparent"
        >
          <div className="w-full">{headerContent}</div>
        </header>
      )}

      <div className={`relative z-20 flex-1 min-h-0 flex flex-col overflow-hidden ${bottomPadding}`}>
        {children}
      </div>

      {/* Font & Typography Selector Modal */}
      <FontSelectorModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
      />
    </div>
  );
};
