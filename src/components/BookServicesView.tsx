import React, { useMemo, useState } from 'react';
import { AtelierShell } from './AtelierShell';
import { useAtelier } from '../store/AtelierContext';
import { Accoutrement, Service } from '../types';
import { PriceSummary } from './booking/PriceSummary';
import { BookingProgressBar } from './booking/BookingProgressBar';
import { PriceDisplay } from './common/PriceDisplay';
import { formatDuration, formatPrice } from '../utils/formatUtils';
import { toPersianDigits } from '../utils/dateUtils';
import { hapticLight, hapticSelection } from '../utils/hapticUtils';
import { Check, Clock, Gift, Plus, Sparkles, User, ShieldCheck } from 'lucide-react';
import { SpatialTilt } from './common/SpatialTilt';

interface BookServicesViewProps {
  selectedService: Service | null;
  onSelectService: (service: Service) => void;
  accoutrements: Accoutrement[];
  onToggleAccoutrement: (id: string) => void;
  onContinue: () => void;
  onOpenProfile?: () => void;
}

export const BookServicesView: React.FC<BookServicesViewProps> = ({
  selectedService,
  onSelectService,
  accoutrements,
  onToggleAccoutrement,
  onContinue,
  onOpenProfile,
}) => {
  const { servicesByCategory, activeChair, activeBarber, settings } = useAtelier();
  const barberName = settings?.profile?.masterName?.trim() || activeBarber?.name || 'استاد پیرایش';

  const displayedGroups = useMemo(() => {
    return servicesByCategory
      .map((group) => ({
        ...group,
        items: group.items.filter((s) => s.isActive),
      }))
      .filter((group) => group.items.length > 0);
  }, [servicesByCategory]);

  // Active accoutrements available for customer booking
  const activeAccoutrements = useMemo(() => {
    return accoutrements.filter((a) => a.isActive !== false);
  }, [accoutrements]);

  const selectedAccoutrementsCount = useMemo(() => {
    return accoutrements.filter((a) => a.selected).length;
  }, [accoutrements]);

  return (
    <AtelierShell id="book-services-container">
      {/* Top Header */}
      <header
        id="services-header"
        className="relative z-30 flex shrink-0 items-center justify-between px-6 pt-1"
        dir="rtl"
      >
        <div className="w-8 h-8" />

        <div className="text-center">
          <span className="block text-[9px] font-bold text-[#721c24]">مرحله اول</span>
          <h1 className="font-serif text-sm font-bold text-stone-900">
            انتخاب خدمات و مراقبت‌ها
          </h1>
        </div>

        {onOpenProfile ? (
          <button
            type="button"
            onClick={onOpenProfile}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white/80 shadow-2xs transition-transform active:scale-95"
            title="پروفایل کاربری"
          >
            <User className="h-4 w-4 text-stone-700" />
          </button>
        ) : (
          <div className="h-8 w-8" />
        )}
      </header>

      {/* Booking Flow Progress Bar */}
      <BookingProgressBar currentStep="services" />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-4 pb-36 pt-3" dir="rtl">
        {/* Section 1: Main Services Header */}
        <div className="mb-2 px-1">
          <span className="text-xs font-black text-stone-900">۱. انتخاب خدمت اصلی</span>
        </div>

        {/* Services Grouped by Category */}
        <div className="space-y-4">
          {displayedGroups.length === 0 ? (
            <div className="rounded-2xl clay-card-subtle p-6 text-center">
              <p className="text-xs text-stone-500">خدمت فعالی وجود ندارد</p>
            </div>
          ) : (
            displayedGroups.map(({ category, items }) => (
              <section key={category.id} className="space-y-2">
                <div className="px-1">
                  <h2 className="text-xs font-bold text-[#721c24]">{category.name}</h2>
                </div>

                <div className="space-y-2.5">
                  {items.map((s) => {
                    const isSelected = selectedService?.id === s.id;
                    return (
                      <SpatialTilt
                        key={s.id}
                        as="button"
                        maxTilt={7}
                        glareOpacity={isSelected ? 0.15 : 0.38}
                        scaleOnHover={1.018}
                        onClick={() => {
                          hapticSelection();
                          onSelectService(s);
                        }}
                        className={`w-full min-h-[92px] shrink-0 rounded-[24px] p-3.5 text-right transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#721c24] text-white border border-[#5c131a] shadow-[0_16px_36px_-6px_rgba(114,28,36,0.42),0_6px_16px_-2px_rgba(114,28,36,0.24)]'
                            : 'apple-glass-card'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 w-full">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-black ${isSelected ? 'text-white' : 'text-stone-900'}`}
                              >
                                {s.name}
                              </span>
                              {s.tag && (
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold shadow-2xs ${
                                    isSelected
                                      ? 'bg-white/20 border border-white/30 text-white'
                                      : 'bg-[#f6f2f4] border border-[#d9c5cb] text-[#721c24]'
                                  }`}
                                >
                                  {s.tag}
                                </span>
                              )}
                            </div>
                            {s.description && (
                              <p className={`mt-1 line-clamp-2 text-xs leading-5 font-medium ${isSelected ? 'text-white/90' : 'text-stone-600'}`}>
                                {s.description}
                              </p>
                            )}
                            <div className={`mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] min-h-[22px] ${isSelected ? 'text-white' : 'text-stone-700'}`}>
                              <span className="flex items-center gap-1 font-medium shrink-0">
                                <Clock className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-stone-500'}`} />
                                {formatDuration(s.durationMinutes)}
                              </span>
                              <PriceDisplay service={s} size="sm" inverted={isSelected} className="shrink-0" />
                            </div>
                          </div>

                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ml-2 mt-[13px] ${
                              isSelected
                                ? 'bg-white text-[#721c24] shadow-xs'
                                : 'tactile-tile-3d text-transparent border border-[#721c24]'
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5 stroke-[2.5]" />}
                          </div>
                        </div>
                      </SpatialTilt>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Section 2: Integrated Additional Services (Accoutrements) */}
        {activeAccoutrements.length > 0 && (
          <div className="mt-6 pt-5 border-t border-stone-200/70 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-black text-stone-900">
                  <Sparkles className="h-4 w-4 text-[#721c24]" />
                  <span>۲. افزودن خدمات تکمیلی و مراقبتی (اختیاری)</span>
                </h3>
                <p className="text-[11px] text-stone-600 mt-0.5 font-medium">
                  می‌توانید هر تعداد خدمت مکمل و اسپا را همزمان به نوبت خود بیفزایید.
                </p>
              </div>
              {selectedAccoutrementsCount > 0 && (
                <span className="shrink-0 rounded-full bg-[#f6f2f4] border border-[#d9c5cb] px-2.5 py-0.5 text-[10px] font-black text-[#721c24] shadow-2xs">
                  {toPersianDigits(selectedAccoutrementsCount)} مورد انتخاب شد
                </span>
              )}
            </div>

            <div className="space-y-2">
              {activeAccoutrements.map((acc) => {
                const isSelected = Boolean(acc.selected);
                return (
                  <SpatialTilt
                    key={acc.id}
                    as="button"
                    maxTilt={6}
                    glareOpacity={0.3}
                    scaleOnHover={1.015}
                    onClick={() => {
                      hapticSelection();
                      onToggleAccoutrement(acc.id);
                    }}
                    className={`w-full rounded-[22px] p-3 text-right transition-colors cursor-pointer ${
                      isSelected
                        ? 'apple-glass-card ring-2 ring-[#721c24] shadow-[0_8px_20px_-4px_rgba(114,28,36,0.2),inset_0_1px_2px_rgba(255,255,255,1)]'
                        : 'apple-glass-subtle'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-stone-900">{acc.name}</span>
                          {acc.tag && (
                            <span className="rounded-full bg-[#f6f2f4] border border-[#d9c5cb] px-2 py-0.5 text-[9px] font-bold text-[#721c24] shadow-2xs">
                              {acc.tag}
                            </span>
                          )}
                          <span className="rounded-full clay-pill-3d px-2 py-0.5 text-[9px] font-bold text-stone-700">
                            +{toPersianDigits(acc.durationMinutes)} دقیقه
                          </span>
                        </div>

                        {acc.description && (
                          <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                            {acc.description}
                          </p>
                        )}

                        <div className="mt-1.5 flex items-center gap-2">
                          {acc.isComplimentary ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600">
                              <Gift className="h-3 w-3" />
                              رایگان (هدیه سالن)
                            </span>
                          ) : (
                            <span className="text-xs font-black text-stone-900">
                              {formatPrice(acc.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                          isSelected
                            ? 'border-[#721c24] bg-[#721c24] text-white shadow-2xs'
                            : 'border-stone-300 bg-white/80 text-stone-400'
                        }`}
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      </div>
                    </div>
                  </SpatialTilt>
                );
              })}
            </div>
          </div>
        )}

        {/* Assurance Banner */}
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/80 bg-white/60 p-2.5 text-[10px] text-stone-600 backdrop-blur-md shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#721c24]" />
            <span>مدت زمان نوبت بر اساس کلیه خدمات انتخابی به طور هوشمند محاسبه می‌شود</span>
          </div>
        </div>
      </main>

      {/* Floating Live Action Button (Price hidden in Step 1) */}
      <PriceSummary
        service={selectedService}
        accoutrements={accoutrements}
        showPrice={false}
        ctaLabel={
          selectedService
            ? selectedAccoutrementsCount > 0
              ? 'تأیید و انتخاب زمان نوبت'
              : 'ادامه به انتخاب زمان نوبت'
            : 'انتخاب خدمت اصلی'
        }
        onCta={onContinue}
        ctaDisabled={!selectedService}
        disabledHint="لطفاً ابتدا یک خدمت اصلی را انتخاب کنید"
      />
    </AtelierShell>
  );
};

