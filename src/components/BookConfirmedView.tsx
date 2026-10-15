import React, { useState } from 'react';
import { Reservation } from '../types';
import { AtelierShell } from './AtelierShell';
import { ArrowRight, User, Scissors, Check, Calendar, MapPin, CheckCircle, MessageSquare, ShieldCheck, QrCode, Receipt } from 'lucide-react';
import { hapticLight, hapticStepAdvance } from '../utils/hapticUtils';
import { formatPrice } from '../utils/formatUtils';
import { toPersianDigits, formatAppointmentDate } from '../utils/dateUtils';
import { PriceDisplay } from './common/PriceDisplay';
import { Button } from '@/components/ui/button';
import { useAtelier, useBranding } from '../store/AtelierContext';

interface BookConfirmedViewProps {
  reservation: Reservation | null;
  onReturnHome: () => void;
  onOpenConcierge?: () => void;
  onOpenProfile: () => void;
}

export const BookConfirmedView: React.FC<BookConfirmedViewProps> = ({
  reservation,
  onReturnHome,
  onOpenConcierge,
  onOpenProfile,
}) => {
  const { studio, settings, activeBarber } = useAtelier();
  const branding = useBranding();
  const liveShopName = branding.salonName || settings?.profile?.name?.trim() || studio?.name || 'سالن زیبایی';
  const liveBarberName = branding.barberName || settings?.profile?.masterName?.trim() || activeBarber?.name || reservation?.artisan || 'آرایشگر';
  const liveLocation = branding.address
    ? `${branding.salonName || liveShopName} · ${branding.address}`
    : (branding.salonName || liveShopName);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    hapticLight();
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleConcierge = () => {
    if (onOpenConcierge) {
      onOpenConcierge();
    } else {
      triggerToast('کانسیرج آرایشگاه آماده راهنمایی شماست');
    }
  };

  if (!reservation) {
    return (
      <AtelierShell id="book-confirmed-empty-container">
        <header className="relative z-30 px-6 pt-1 flex items-center justify-between shrink-0" dir="rtl">
          <button
            type="button"
            onClick={onReturnHome}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-white/50 text-stone-800 text-xs font-medium"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>خانه</span>
          </button>
        </header>
        <section className="relative z-20 mx-auto w-[346px] bg-white/30 backdrop-blur-2xl rounded-[38px] p-6 text-center mt-8">
          <p className="text-sm font-serif font-bold text-stone-900">نوبتی یافت نشد</p>
          <button
            type="button"
            onClick={onReturnHome}
            className="mt-4 px-4 py-2 bg-gradient-to-b from-white to-[#f1f5f9] hover:from-white hover:to-[#e2e8f0] text-[#0f172a] border border-white rounded-xl text-xs font-black cursor-pointer transition-all shadow-xs ring-1 ring-white/80"
          >
            بازگشت به خانه سالن
          </button>
        </section>
      </AtelierShell>
    );
  }

  return (
    <AtelierShell id="book-confirmed-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#151517] text-white shadow-2xl backdrop-blur-xl flex items-center gap-2 border border-white/20 animate-fade-in" dir="rtl">
          <CheckCircle className="w-3.5 h-3.5 text-[#fbdcd9]" />
          <span className="text-xs font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header
        id="confirmed-header"
        className="relative z-30 px-6 pt-1 flex items-center justify-between shrink-0"
        dir="rtl"
      >
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onReturnHome();
          }}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/80 hover:bg-white backdrop-blur-md border border-white text-stone-800 text-xs font-medium transition-all shadow-2xs"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>خانه</span>
        </button>

        <div className="text-center">
          <h1 className="text-sm font-serif font-bold text-stone-900">
            کارت دیجیتال ورود
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            onOpenProfile();
          }}
          className="w-8 h-8 rounded-full bg-white/80 border border-white text-stone-700 flex items-center justify-center hover:bg-white transition-colors shadow-2xs"
          title="پروفایل مراجع"
        >
          <User className="w-4 h-4 text-[#0f172a]" />
        </button>
      </header>

      {/* Main Floating Glass Container */}
      <section
        id="confirmed-glass-card"
        className="relative z-20 mx-auto w-[350px] clay-card rounded-[34px] p-3.5 flex flex-col justify-between mt-1 max-h-[660px] overflow-hidden"
        dir="rtl"
      >
        {/* Upper Window: Luminous Status Pill */}
        <div className="clay-card-subtle rounded-[24px] p-3 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-[#f6f2f4] border border-[#d9c5cb] flex items-center justify-center shadow-2xs">
              <Check className="w-5 h-5 text-[#721c24] stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[9px] font-bold text-[#721c24] block">
                نوبت تایید شد · {liveShopName}
              </span>
              <h2 className="text-sm font-serif font-black text-stone-900" dir="ltr">
                #{reservation.reservationNumber}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => triggerToast('کارت به کیف پول افزوده شد')}
            className="px-3 py-1 rounded-full bg-[#721c24] text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs hover:bg-[#5c131a] transition-all cursor-pointer"
          >
            <span>کیف پول</span>
          </button>
        </div>

        {/* Middle Section (Scrollable): Digital Boarding Pass Ticket */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 my-1.5 max-h-[290px]">
          {/* Tactile Boarding Pass */}
          <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0b111e] text-white rounded-[24px] p-4 shadow-lg space-y-3 relative overflow-hidden text-right border-t border-white/20">
            {/* Ambient watermarking */}
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-[#721c24]/15 blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between border-b border-white/10 pb-2.5">
              <div>
                <p className="text-[9px] text-[#d9c5cb] font-bold">
                  کارت ورود انحصاری {liveShopName}
                </p>
                <h3 className="text-base font-serif font-black text-white mt-0.5">
                  {reservation.service.name}
                </h3>
                <div className="mt-1">
                  <PriceDisplay service={reservation.service} size="xs" />
                </div>
              </div>
              <Scissors className="w-4 h-4 text-[#fedecb]" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-[9px] text-stone-400">تاریخ و ساعت نوبت</p>
                <p className="text-white font-medium text-[11px] mt-0.5">
                  {formatAppointmentDate(reservation)} · {toPersianDigits(reservation.selectedTime || reservation.startTime)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-stone-400">استاد پیرایشگر</p>
                <p className="text-white font-medium text-[11px] mt-0.5">
                  {liveBarberName}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-stone-400">مکان سالن</p>
                <p className="text-white font-medium text-[11px] mt-0.5">
                  {liveLocation}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-stone-400">پذیرایی اختصاصی</p>
                <p className="text-[#fedecb] font-medium text-[11px] mt-0.5 truncate">
                  {reservation.beverage.name}
                </p>
              </div>
            </div>

            {/* Price Snapshot Itemized Breakdown */}
            <div className="pt-2 border-t border-stone-800 text-[10px]">
              <div className="flex items-center justify-between text-stone-400 mb-1">
                <span className="flex items-center gap-1">
                  <Receipt className="w-3 h-3 text-[#fedecb]" />
                  <span>رسید تاییدشده نوبت</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {reservation.priceSummary?.hasDiscount && reservation.priceSummary.originalTotal && (
                    <span className="line-through text-stone-400 text-[9px] tabular-nums">
                      {formatPrice(reservation.priceSummary.originalTotal)}
                    </span>
                  )}
                  <span className="font-bold text-white tabular-nums">
                    {reservation.priceSummary 
                      ? formatPrice(reservation.priceSummary.total) 
                      : formatPrice(reservation.totalAmount || reservation.service.price)}
                  </span>
                </div>
              </div>
              {reservation.priceSummary && (
                <div className="space-y-0.5 text-[9px] text-stone-400">
                  {reservation.priceSummary.lines.map((l, idx) => (
                    <div key={idx} className={`flex justify-between ${l.kind === 'discount' ? 'text-emerald-400 font-bold' : ''}`}>
                      <span className="truncate max-w-[170px]">{l.label}</span>
                      <span className="tabular-nums">
                        {l.kind === 'discount'
                          ? `- ${formatPrice(l.discountAmount || Math.abs(l.amount))}`
                          : l.amount > 0 ? formatPrice(l.amount) : 'رایگان'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {reservation.priceSummary?.hasDiscount && reservation.priceSummary.discountAmount && (
                <div className="mt-1 pt-1 border-t border-stone-800/80 flex justify-between text-[9px] text-emerald-400 font-bold">
                  <span>سود شما از این رزرو:</span>
                  <span className="tabular-nums">{formatPrice(reservation.priceSummary.discountAmount)}</span>
                </div>
              )}
            </div>

            {/* Quiet Session or Customer Notes Badges */}
            {(reservation.isQuietSession || reservation.customerNotes) && (
              <div className="pt-2 border-t border-stone-800 space-y-1">
                {reservation.isQuietSession && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#fedecb] bg-white/10 px-2.5 py-1 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#fedecb]" />
                    <span>آیین سکوت و تمرکز ذهن (Quiet Session)</span>
                  </div>
                )}
                {reservation.customerNotes && (
                  <p className="text-[9px] text-stone-400 italic bg-black/30 px-2 py-1 rounded-lg">
                    یادداشت مراجع: «{reservation.customerNotes}»
                  </p>
                )}
              </div>
            )}

            {/* ZarinPal Payment Confirmation & RefId */}
            {reservation.paymentRefId && (
              <div className="pt-2 border-t border-stone-800 space-y-1 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-xl text-emerald-300">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>پیش‌پرداخت زرین‌پال تأیید شد</span>
                  </span>
                  <span className="text-[9px] text-emerald-400 font-bold">پرداخت‌شده</span>
                </div>
                <div className="text-center font-mono font-bold text-xs text-[#fedecb] pt-0.5">
                  کد رهگیری پرداخت: {toPersianDigits(reservation.paymentRefId)}
                </div>
              </div>
            )}

            {/* Simulated Digital Barcode Strip for private suite door NFC */}
            <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QrCode className="w-7 h-7 text-white/80" />
                <div>
                  <p className="text-[8px] text-stone-400">کلید دیجیتال ورود سالن</p>
                  <p className="text-[10px] font-mono text-[#fedecb]">TAP-TO-ENTER-ROYAL</p>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 font-medium">
                فعال
              </span>
            </div>
          </div>
        </div>

        {/* Card Lower Section: Clean Action Buttons - One Clear Primary Action */}
        <div className="w-full space-y-2 mt-1 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="glass"
              size="md"
              onClick={() => triggerToast('به تقویم شخصی افزوده شد')}
              className="w-full text-stone-800 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-[#0f172a]" />
              <span>افزودن به تقویم</span>
            </Button>
            <Button
              type="button"
              variant="glass"
              size="md"
              onClick={handleConcierge}
              className="w-full text-stone-800 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#0f172a]" />
              <span>پشتیبانی نوبت</span>
            </Button>
          </div>

          <Button
            id="confirmed-home-btn"
            type="button"
            variant="accent"
            size="lg"
            glass={{ radius: 18 }}
            onClick={() => {
              hapticStepAdvance();
              onReturnHome();
            }}
            className="w-full py-3.5 px-4 rounded-[18px] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>بازگشت به صفحه اصلی</span>
          </Button>
        </div>
      </section>

      {/* Sanctuary Status Strip */}
      <section className="relative z-20 px-6 mt-2 shrink-0" dir="rtl">
        <div className="p-2.5 rounded-2xl clay-card-subtle flex items-center justify-between text-stone-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#f6f2f4] border border-[#d9c5cb] flex items-center justify-center text-[#721c24] shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-stone-900 leading-tight">
                نوبت با موفقیت در سامانه ثبت شد
              </p>
              <p className="text-[9px] text-stone-500">
                پیامک تأیید و جزئیات نوبت برای شما ارسال گردید
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[#721c24] bg-[#f6f2f4] border border-[#d9c5cb] px-2.5 py-0.5 rounded-lg">
            آماده پذیرش
          </span>
        </div>
      </section>
    </AtelierShell>
  );
};
