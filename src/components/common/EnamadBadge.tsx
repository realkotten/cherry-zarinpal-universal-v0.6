import React, { useState } from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface EnamadBadgeProps {
  className?: string;
  variant?: 'banner' | 'badge';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const EnamadBadge: React.FC<EnamadBadgeProps> = ({
  className = '',
  variant = 'banner',
  size = 'md',
  showText = true,
}) => {
  const [imageError, setImageError] = useState(false);

  const enamadUrl =
    'https://trustseal.enamad.ir/?id=7924701&Code=hF89YEkBi8Ejb8HmLWWdMWqh774YebTK';
  const enamadImgSrc =
    'https://trustseal.enamad.ir/logo.aspx?id=7924701&Code=hF89YEkBi8Ejb8HmLWWdMWqh774YebTK';

  const openEnamadPopup = (e: React.MouseEvent<HTMLAnchorElement>) => {
    try {
      window.open(
        enamadUrl,
        'EnamadPopup',
        'toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=450, height=650, top=60, left=120'
      );
      e.preventDefault();
    } catch {
      // fallback to normal link navigation
    }
  };

  // Authentic eNamad SVG logo reproducing the official certificate badge
  const renderEnamadLogo = (imgClassName: string) => {
    if (!imageError) {
      return (
        <img
          referrerPolicy="origin"
          src={enamadImgSrc}
          alt=""
          loading="lazy"
          decoding="async"
          style={{ cursor: 'pointer' }}
          // @ts-expect-error enamad official code attribute
          code="hF89YEkBi8Ejb8HmLWWdMWqh774YebTK"
          className={`${imgClassName} object-contain cursor-pointer transition-transform duration-200 hover:scale-105`}
          onError={() => setImageError(true)}
        />
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-0.5 select-none text-center overflow-hidden">
        {/* Top curved 'e' monogram in official Enamad blue */}
        <div className="relative flex items-center justify-center">
          <svg
            className="w-5 h-5 text-[#0d47a1]"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M50 10C27.9 10 10 27.9 10 50C10 72.1 27.9 90 50 90C65.5 90 78.9 81.2 85.5 68.5C86.5 66.5 85.2 64 83 64H68C66.5 64 65.2 64.9 64.5 66.2C61.5 72.2 55.2 76 50 76C35.6 76 24 64.4 24 50C24 35.6 35.6 24 50 24C60.5 24 69.5 30.2 73.5 39H42C39.8 39 38 40.8 38 43V47C38 49.2 39.8 51 42 51H86C88.2 51 90 49.2 90 47C90 26.6 72.1 10 50 10Z"
              fill="currentColor"
            />
            <circle cx="50" cy="50" r="11" fill="#1565c0" />
          </svg>
        </div>

        {/* eNAMAD.ir branding */}
        <span className="text-[6.5px] font-black tracking-tight text-[#0d47a1] leading-none mt-0.5">
          eNAMAD
        </span>
      </div>
    );
  };

  // BANNER VARIANT — Compact, low-profile footer trust seal
  if (variant === 'banner') {
    return (
      <section
        id="enamad-trust-seal-banner"
        className={`rounded-2xl py-2 px-3 relative overflow-hidden backdrop-blur-sm bg-white/45 border border-stone-200/60 shadow-2xs opacity-75 hover:opacity-100 transition-opacity ${className}`}
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-2.5">
          {/* Right Side: Compact info & inquiry link */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded-xl bg-stone-100/80 text-stone-500 border border-stone-200/70 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600/80" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h4 className="font-semibold text-[10px] text-stone-600 tracking-tight">
                  نماد اعتماد الکترونیکی (اینماد)
                </h4>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[8.5px] font-medium bg-amber-50/80 text-amber-800/80 border border-amber-200/60">
                  <span className="text-amber-500 text-[9px]">★</span>
                  <span>معتبر</span>
                </span>
              </div>

              <a
                referrerPolicy="origin"
                target="_blank"
                rel="noreferrer"
                href={enamadUrl}
                onClick={openEnamadPopup}
                className="inline-flex items-center gap-1 text-[9.5px] font-medium text-stone-500 hover:text-stone-800 transition-colors group cursor-pointer mt-0.5"
              >
                <ExternalLink className="w-2.5 h-2.5 text-stone-400 group-hover:text-stone-700" />
                <span>استعلام پروانه کسب الکترونیکی</span>
              </a>
            </div>
          </div>

          {/* Left Side: Small Emblem Container with Enamad Logo */}
          <div className="flex items-center justify-center shrink-0">
            <div className="w-10 h-10 bg-white/90 rounded-xl border border-stone-200/70 p-0.5 flex items-center justify-center transition-transform active:scale-95">
              <a
                referrerPolicy="origin"
                target="_blank"
                rel="noreferrer"
                href={enamadUrl}
                onClick={openEnamadPopup}
                title="مشاهده و استعلام نماد اعتماد الکترونیکی (اینماد)"
                className="w-full h-full flex items-center justify-center relative"
              >
                {renderEnamadLogo('w-full h-full')}
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // COMPACT BADGE VARIANT — For Checkout & Profile Views
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  }[size];

  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 select-none ${className}`}
      dir="rtl"
    >
      <div className="p-1.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:shadow-md transition-all active:scale-95 inline-flex items-center justify-center">
        <a
          referrerPolicy="origin"
          target="_blank"
          rel="noreferrer"
          href={enamadUrl}
          onClick={openEnamadPopup}
          title="نماد اعتماد الکترونیکی (اینماد)"
          className="inline-block relative"
        >
          <div className={sizeClasses}>{renderEnamadLogo('w-full h-full')}</div>
        </a>
      </div>
      {showText && (
        <a
          referrerPolicy="origin"
          target="_blank"
          rel="noreferrer"
          href={enamadUrl}
          onClick={openEnamadPopup}
          className="text-[10px] font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 transition-colors"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>دارای نماد اعتماد الکترونیکی (اینماد)</span>
        </a>
      )}
    </div>
  );
};
