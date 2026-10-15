import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AtelierShell } from './AtelierShell';
import { useAtelier, useBranding } from '../store/AtelierContext';
import { Accoutrement, BeverageOption, Reservation, Service, Appointment, ClientProfile } from '../types';
import { PriceSummary } from './booking/PriceSummary';
import { BookingProgressBar } from './booking/BookingProgressBar';
import { PriceDisplay } from './common/PriceDisplay';
import { addMinutes, calculateBookingTotals, generateUpcomingDays, isSlotExpired, hasActiveUpcomingBooking } from '../utils/bookingUtils';
import { formatPrice } from '../utils/formatUtils';
import { toPersianDigits, getPersianDateForDay, getCurrentSolarDateInfo, toEnglishDigits } from '../utils/dateUtils';
import { validateFullName, normalizePhoneNumber } from '../utils/customerUtils';
import { getDeterministicAvatar } from '../data/avatars';
import { calculateAppointmentTotals, checkAppointmentConflict } from '../utils/appointmentUtils';
import { calculateBookingTotal } from '../utils/pricingUtils';
import { addStoredUserBookingId, saveStoredBrowserProfile } from '../utils/browserStorage';
import { API_BASE, getJson, postJson } from '../api/paymentApi';
import { getDeviceFingerprint } from '../utils/deviceFingerprint';
import { getDeviceUuid } from '../utils/deviceIdentity';
import { hapticLight, hapticSelection, hapticSuccess, hapticWarning, triggerHaptic } from '../utils/hapticUtils';
import { ArrowRight, Check, Coffee, Phone, ShieldCheck, User, VolumeX, Sparkles, CreditCard, RotateCcw, Store, Lock, LogOut, Ban, Leaf, GlassWater, UtensilsCrossed } from 'lucide-react';
import { EnamadBadge } from './common/EnamadBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface BookCheckoutViewProps {
  service: Service | null;
  selectedDay: number;
  selectedTime: string;
  accoutrements: Accoutrement[];
  onBack: () => void;
  onConfirmBooking: (confirmedRes: Reservation) => void;
  onOpenProfile?: () => void;
}

export const BookCheckoutView: React.FC<BookCheckoutViewProps> = ({
  service,
  selectedDay,
  selectedTime,
  accoutrements,
  onBack,
  onConfirmBooking: _onConfirmBooking,
  onOpenProfile,
}) => {
  const { 
    services,
    currentCustomer, 
    setCurrentCustomer,
    customers,
    beverageOptions, 
    activeBarber, 
    activeChair, 
    addNewAppointment,
    appointments,
    settings,
    studio,
    authUser,
    isUserAuthenticated,
    openClientAuthModal,
    signOutUser
  } = useAtelier();
  const branding = useBranding();
  const defaultBarber = branding.barberName || settings?.profile?.masterName?.trim() || activeBarber?.name || 'آرایشگر اختصاصی';

  // Hydrated service object from context state (synced from store.php)
  const hydratedService = useMemo(() => {
    if (!service) return null;
    const found = services.find((s) => s.id === service.id);
    return found ? { ...service, ...found } : service;
  }, [services, service]);

  const mainScrollRef = useRef<HTMLElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const [customerName, setCustomerName] = useState(currentCustomer?.name || '');
  const [customerPhone, setCustomerPhone] = useState(currentCustomer?.phone || '');
  const [customerNotes, setCustomerNotes] = useState('');
  const [selectedBeverageId, setSelectedBeverageId] = useState<string>('none');
  const [isQuietSession, setIsQuietSession] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'onsite'>('online');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [highlightMissingInfo, setHighlightMissingInfo] = useState(false);
  const isSubmittingRef = useRef(false);

  // Deposit amount: initialized with fallback 15000, then fetched from GET ${API_BASE}/settings.php on mount
  const [depositAmount, setDepositAmount] = useState<number>(() => {
    const policyDeposit = settings?.policies?.depositAmount;
    if (typeof policyDeposit === 'number' && policyDeposit >= 0) {
      return policyDeposit < 1000 && policyDeposit > 0 ? policyDeposit * 1000 : policyDeposit;
    }
    return 15000;
  });

  // On mount fetch GET ${API_BASE}/settings.php
  useEffect(() => {
    let isMounted = true;
    getJson<{ ok: boolean; depositAmount?: number }>(`${API_BASE}/settings.php`)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.ok && typeof res.depositAmount === 'number' && res.depositAmount >= 0) {
          setDepositAmount(res.depositAmount);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync inputs if customer profile or auth updates
  useEffect(() => {
    if (currentCustomer?.name && customerName === '') {
      setCustomerName(currentCustomer.name);
    }
    if (currentCustomer?.phone && customerPhone === '') {
      setCustomerPhone(currentCustomer.phone);
    }
  }, [currentCustomer, customerName, customerPhone]);

  const days = useMemo(() => generateUpcomingDays(14), []);
  const activeDay = days.find((d) => d.dayNumber === selectedDay) ?? days[0];
  const totals = useMemo(() => calculateBookingTotals(service, accoutrements), [service, accoutrements]);

  const isHospitalityEnabled = settings?.hospitalityEnabled !== false;

  const availableBeverages = useMemo(
    () => beverageOptions.filter((b) => b.isAvailable !== false),
    [beverageOptions]
  );

  const selectedBeverage = useMemo(() => {
    if (selectedBeverageId === 'none') return null;
    return availableBeverages.find((b) => b.id === selectedBeverageId) || null;
  }, [selectedBeverageId, availableBeverages]);

  const endTime = useMemo(() => {
    if (!selectedTime) return '';
    return addMinutes(selectedTime, totals.totalDuration);
  }, [selectedTime, totals.totalDuration]);

  if (!service) return null;

  const isSelectedSlotExpired = useMemo(
    () => isSlotExpired(selectedDay, selectedTime),
    [selectedDay, selectedTime]
  );

  const slotIsoDatetime = useMemo(() => {
    try {
      if (!selectedTime) return null;
      let targetDay = days.find((d) => d.dayNumber === selectedDay);
      if (!targetDay) {
        const ext = generateUpcomingDays(31);
        targetDay = ext.find((d) => d.dayNumber === selectedDay);
      }
      if (!targetDay?.dateKey) return null;

      const cleanTime = toEnglishDigits(selectedTime).trim();
      const parts = cleanTime.split(':');
      if (parts.length < 2) return null;
      const hh = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;

      const formattedTime = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}:00`;
      const isoString = `${targetDay.dateKey}T${formattedTime}+03:30`;

      const d = new Date(isoString);
      if (isNaN(d.getTime())) return null;

      return isoString;
    } catch {
      return null;
    }
  }, [days, selectedDay, selectedTime]);

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    // Check for active upcoming booking guard
    const blockingBooking = hasActiveUpcomingBooking();
    if (blockingBooking) {
      hapticWarning();
      setErrorMessage(
        `شما یک نوبت فعال دارید. تا گذشتن تاریخ و ساعت نوبت فعلی («${blockingBooking.date} ساعت ${toPersianDigits(blockingBooking.startTime)}») امکان رزرو نوبت جدید وجود ندارد.`
      );
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    if (!slotIsoDatetime) {
      hapticWarning();
      setErrorMessage('محاسبه زمان استاندارد نوبت با خطا مواجه شد. لطفاً دوباره زمان یا روز را انتخاب فرمایید.');
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (isSelectedSlotExpired) {
      hapticWarning();
      setErrorMessage('تاریخ یا ساعت انتخابی شما سپری شده است و امکان رزرو ندارد. لطفاً بازگردید و ساعت آینده را انتخاب فرمایید.');
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const nameValidation = validateFullName(customerName);
    if (!nameValidation.isValid) {
      hapticWarning();
      setErrorMessage(nameValidation.error || 'لطفاً نام و نام‌خانوادگی کامل خود را وارد کنید (شامل نام و نام خانوادگی با فاصله بین آن‌ها).');
      setHighlightMissingInfo(true);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 200);
      return;
    }
    const cleanPhone = normalizePhoneNumber(customerPhone);
    if (!cleanPhone || cleanPhone.length < 7) {
      hapticWarning();
      setErrorMessage('لطفاً شماره تماس معتبر (حداقل ۱۰ رقم) وارد کنید');
      setHighlightMissingInfo(true);
      mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 200);
      return;
    }

    // Live conflict validation
    const conflict = checkAppointmentConflict(
      appointments,
      activeChair.id,
      selectedDay,
      selectedTime,
      totals.totalDuration
    );
    if (conflict.hasConflict) {
      hapticWarning();
      setErrorMessage('این زمان به‌تازگی رزرو شده است. لطفاً زمان دیگری را انتخاب نمایید.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    setErrorMessage(null);
    setHighlightMissingInfo(false);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const trimmedName = customerName.trim();
      let customer = customers.find((c) => {
        const cPhone = normalizePhoneNumber(c.phone);
        return cPhone === cleanPhone || cPhone.endsWith(cleanPhone) || cleanPhone.endsWith(cPhone);
      });

      const NONE_BEVERAGE: BeverageOption = {
        id: 'none',
        name: 'بدون پذیرایی',
        icon: 'ban',
        price: 0,
        description: 'بدون پذیرایی',
        category: 'other',
        isAvailable: true,
      };

      const targetBeverage = selectedBeverage || NONE_BEVERAGE;

      if (!customer) {
        customer = {
          id: `client-${Date.now()}`,
          name: trimmedName,
          avatarUrl: getDeterministicAvatar(trimmedName),
          phone: customerPhone.trim(),
          email: `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@client.atelier`,
          memberId: `#AV-${Math.floor(1000 + Math.random() * 9000)}`,
          memberTier: 'عضو آنلاین آرایشگاه',
          isVip: false,
          isPermanentClient: false,
          joinedDate: 'مهر ۱۴۰۳',
          totalVisits: 0,
          preferredSuite: activeChair.name,
          preferredBarberId: activeBarber.id,
          hospitality: {
            beveragePreference: targetBeverage.name,
            conversationLevel: isQuietSession ? 'minimal' : 'customary',
          },
        };
      } else {
        if (isQuietSession && customer.hospitality) {
          customer.hospitality.conversationLevel = 'minimal';
        }
      }

      const selectedAccs = totals.selectedExtras;
      const appointmentTotals = calculateAppointmentTotals(
        service,
        selectedAccs,
        0,
        0,
        targetBeverage
      );
      const pricingSummary = calculateBookingTotal(service, selectedAccs);
      const todaySolar = getCurrentSolarDateInfo();
      const selectedDayOption = days.find((d) => d.dayNumber === selectedDay) ?? days[0];
      const targetDateString = selectedDayOption
        ? `${selectedDayOption.weekday}، ${toPersianDigits(selectedDayOption.dayNumber)} ${selectedDayOption.label.split(' ')[1] || ''}`
        : getPersianDateForDay(selectedDay);

      // Build Appointment object exactly as createOnlineBooking does
      const appointmentPayload: Appointment = {
        id: `apt-online-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        slotIsoDatetime,
        deviceFingerprint: getDeviceFingerprint(),
        deviceUuid: await getDeviceUuid(),
        appointmentNumber: `AV-${Math.floor(8000 + Math.random() * 1999)}`,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        isVip: customer.isVip,
        serviceId: service.id,
        service: {
          id: service.id,
          categoryId: service.categoryId,
          name: service.name,
          price: service.price,
          realPrice: service.realPrice,
          discountedPrice: service.discountedPrice,
          durationMinutes: service.durationMinutes,
          description: service.description,
          isActive: service.isActive,
          sortOrder: service.sortOrder,
          tag: service.tag,
          isSpecialty: service.isSpecialty,
        },
        barberId: activeBarber.id,
        barberName: branding.barberName || activeBarber.name,
        location: branding.address ? `${branding.salonName} · ${branding.address}` : branding.salonName,
        chairId: activeChair.id,
        chairName: activeChair.name,
        date: targetDateString,
        dayNumber: selectedDay,
        startTime: selectedTime,
        endTime: endTime,
        durationMinutes: totals.totalDuration,
        servicePrice: appointmentTotals.servicePrice,
        originalServicePrice: appointmentTotals.serviceRealPrice,
        discountAmount: appointmentTotals.discountAmount,
        discountPercent: appointmentTotals.discountPercent,
        accoutrementsPrice: appointmentTotals.accoutrementsPrice,
        tipPercentage: 0,
        tipAmount: 0,
        totalAmount: pricingSummary.total,
        depositAmount: depositAmount,
        additionalAccoutrements: selectedAccs,
        beverage: targetBeverage,
        customerNotes: customerNotes.trim(),
        isQuietSession: !!isQuietSession,
        stylingNotes: isQuietSession 
          ? 'درخواست آیین سکوت و آرامش ذهن (Quiet Session)' 
          : 'رزرو آنلاین مراجع',
        status: 'pending',
        paymentStatus: 'pending',
        bookingSource: 'online',
        createdAt: todaySolar.dateString,
        bookingTimestamp: `${targetDateString} · ساعت ${selectedTime}`,
        priceSummary: {
          total: pricingSummary.total,
          originalTotal: pricingSummary.originalTotal,
          discountAmount: pricingSummary.discountAmount,
          hasDiscount: pricingSummary.hasDiscount,
          lines: pricingSummary.lines,
        },
      };

      // POST the appointment object to /payment/create.php
      const res = await postJson<{
        ok: boolean;
        appointment?: Appointment;
        redirectUrl?: string;
        error?: string;
      }>(`${API_BASE}/create.php`, appointmentPayload);

      if (res && res.ok && res.redirectUrl) {
        hapticSuccess();
        const finalApt: Appointment = res.appointment || appointmentPayload;

        // Synchronously: read localStorage "atelier_appointments_v1", unshift response.appointment, write back
        try {
          const raw = localStorage.getItem('atelier_appointments_v1');
          const list: Appointment[] = raw ? JSON.parse(raw) : [];
          const filtered = list.filter((a) => a.id !== finalApt.id);
          filtered.unshift(finalApt);
          localStorage.setItem('atelier_appointments_v1', JSON.stringify(filtered));
        } catch (e) {
          console.warn('[LocalStorage] Error saving appointment:', e);
        }

        // addStoredUserBookingId(id) and (appointmentNumber)
        if (finalApt.id) {
          addStoredUserBookingId(finalApt.id);
        }
        if (finalApt.appointmentNumber) {
          addStoredUserBookingId(finalApt.appointmentNumber);
        }

        // save browser profile
        if (customer) {
          setCurrentCustomer(customer);
          saveStoredBrowserProfile(customer);
        }

        // THEN window.location.href = response.redirectUrl
        window.location.href = res.redirectUrl;
        return;
      }

      // ok === false: show response.error in red error UI + «تلاش دوباره» resubmit button
      hapticWarning();
      setErrorMessage(res?.error || 'خطا در ثبت نوبت و اتصال به درگاه پرداخت. لطفاً دوباره تلاش فرمایید.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    } catch (e: any) {
      hapticWarning();
      setErrorMessage(e?.message || 'خطا در برقراری ارتباط با سرور. لطفاً دوباره تلاش فرمایید.');
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <AtelierShell id="book-checkout-container">
      {/* Top Header */}
      <header id="checkout-header" className="relative z-30 flex shrink-0 items-center justify-between px-6 pt-1" dir="rtl">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onBack();
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white/80 shadow-2xs transition-transform active:scale-95 cursor-pointer"
          title="بازگشت به انتخاب زمان"
        >
          <ArrowRight className="h-4 w-4 text-stone-700" />
        </button>

        <div className="text-center">
          <span className="block text-[9px] font-bold text-[#721c24]">مرحله نهایی</span>
          <h1 className="font-serif text-sm font-bold text-stone-900">تأیید و صدور کارت ورود</h1>
        </div>

        {onOpenProfile ? (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onOpenProfile();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white bg-white/80 shadow-2xs transition-transform active:scale-95 cursor-pointer"
            title="پروفایل کاربری"
          >
            <User className="h-4 w-4 text-stone-700" />
          </button>
        ) : (
          <div className="h-8 w-8" />
        )}
      </header>

      {/* Booking Flow Progress Bar */}
      <BookingProgressBar currentStep="checkout" />

      {/* Main Content Area */}
      <main ref={mainScrollRef} className="flex-1 overflow-y-auto px-4 pb-36 pt-3 scroll-smooth" dir="rtl">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-3 rounded-2xl border border-rose-300 bg-rose-50/95 p-3 text-xs font-bold text-rose-900 shadow-sm animate-shake space-y-2">
            <p>{errorMessage}</p>
            <Button
              type="button"
              variant="accent"
              size="md"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full mt-2 py-2 px-3 rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
              <span>{isSubmitting ? 'در حال ارسال مجدد...' : 'تلاش دوباره'}</span>
            </Button>
          </div>
        )}

        {/* 1st Section: Customer Information Inputs */}
        <section
          id="checkout-customer-section"
          className={`mb-3 space-y-2.5 clay-card rounded-[26px] p-4 transition-all duration-300 ${
            highlightMissingInfo ? 'ring-2 ring-rose-400 bg-rose-50/20 shadow-md' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-xs font-black text-stone-900">
              <User className="h-4 w-4 text-[#721c24]" />
              مشخصات مراجع (الزامی)
            </h3>
            {isUserAuthenticated && authUser ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-800 font-bold max-w-[120px] truncate">
                  {authUser.displayName || 'متصل به حساب'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    hapticLight();
                    await signOutUser();
                  }}
                  title="خروج از حساب"
                  className="text-[10px] text-rose-600 hover:text-rose-700 font-bold hover:underline flex items-center gap-0.5 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-lg shadow-2xs border border-stone-200 cursor-pointer"
                >
                  <LogOut className="w-2.5 h-2.5" />
                  <span>خروج</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openClientAuthModal('login')}
                className="text-[10px] text-[#721c24] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>ورود به حساب</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-stone-700">نام و نام‌خانوادگی کامل <span className="text-rose-500">*</span></label>
                <span className="text-[9px] text-stone-500">حداقل ۲ کلمه با فاصله</span>
              </div>
              <Input
                ref={nameInputRef}
                type="text"
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                  if (highlightMissingInfo) setHighlightMissingInfo(false);
                }}
                placeholder="مثال: دایان صالحی"
                className={`w-[432px] max-w-full h-[55px] rounded-[25px] input-3d px-3.5 py-2.5 text-[15px] font-bold text-center text-stone-900 transition-all ${
                  (customerName.trim() && !validateFullName(customerName).isValid) || (highlightMissingInfo && !customerName.trim())
                    ? 'border-rose-400 bg-rose-50/30'
                    : ''
                }`}
              />
              {customerName.trim() && !validateFullName(customerName).isValid && (
                <p className="mt-1 text-[10px] text-amber-700 flex items-center gap-1 font-medium">
                  <span>* لطفاً نام و نام‌خانوادگی کامل را با فاصله وارد فرمایید (مثال: دایان صالحی)</span>
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-stone-700">شماره موبایل (جهت ارسال پیامک نوبت) <span className="text-rose-500">*</span></label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <Input
                  ref={phoneInputRef}
                  type="tel"
                  dir="ltr"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                    if (highlightMissingInfo) setHighlightMissingInfo(false);
                  }}
                  placeholder="09123456789"
                  style={{ fontFamily: 'system-ui', fontSize: '15px' }}
                  className={`w-full h-[55px] rounded-[25px] input-3d py-2.5 pl-9 pr-[36px] text-center text-[15px] font-bold text-stone-900 placeholder:text-stone-400 transition-all ${
                    highlightMissingInfo && (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 10)
                      ? 'border-rose-400 bg-rose-50/30'
                      : ''
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-stone-700">یادداشت یا درخواست ویژه (اختیاری)</label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={2}
                placeholder="توضیحات مدل مو، حساسیت یا زمان‌بندی..."
                style={{ fontSize: '12px' }}
                className="w-full resize-none rounded-2xl input-3d px-3.5 py-2 text-[12px] text-stone-900"
              />
            </div>
          </div>
        </section>

        {/* 2nd Section: Appointment Recap Card */}
        <section className="mb-3 overflow-hidden clay-card rounded-[26px] p-4">
          <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
            <div>
              <span className="text-[10px] font-bold text-[#4e3b6e]">خدمت اصلی</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-sm font-black text-stone-900">{(hydratedService || service).name}</h2>
              </div>
              <div className="mt-1">
                <PriceDisplay service={hydratedService || service} size="xs" />
              </div>
            </div>
            <div className="text-left">
              <span className="text-[10px] text-stone-500 block font-medium">{activeBarber?.name}</span>
              <span className="text-xs font-bold text-stone-900">{activeChair?.name}</span>
            </div>
          </div>

          {totals.hasDiscount && (
            <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50/90 border border-emerald-200 flex items-center justify-between text-[11px] shadow-2xs">
              <span className="flex items-center gap-1.5 font-bold text-emerald-900">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>تخفیف ویژه اعمال‌شده ({toPersianDigits(totals.discountPercent)}٪):</span>
              </span>
              <span className="font-bold text-emerald-800 tabular-nums">
                سود شما: {formatPrice(totals.discountAmount)}
              </span>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-2xl clay-card-subtle p-2.5">
              <span className="block text-[10px] text-stone-500 font-medium">تاریخ حضور</span>
              <span className="font-bold text-stone-900">{activeDay.weekday}، {activeDay.label}</span>
            </div>
            <div className="rounded-2xl clay-card-subtle p-2.5">
              <span className="block text-[10px] text-stone-500 font-medium">ساعت و مدت زمان</span>
              <span className="font-bold text-stone-900">
                {toPersianDigits(selectedTime)} ({toPersianDigits(totals.totalDuration)} دقیقه)
              </span>
            </div>
          </div>

          {totals.selectedExtras.length > 0 && (
            <div className="mt-3 border-t border-stone-200/70 pt-2.5">
              <span className="text-[10px] font-bold text-stone-600 block mb-1">خدمات تکمیلی:</span>
              <div className="flex flex-wrap gap-1.5">
                {totals.selectedExtras.map((a) => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1 rounded-xl clay-pill-3d px-2.5 py-1 text-[11px] font-medium text-stone-800"
                  >
                    <Check className="h-3 w-3 text-[#4e3b6e]" />
                    {a.name} ({formatPrice(a.price)})
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Hospitality & Quiet Session Preferences */}
        {isHospitalityEnabled ? (
          <section className="mb-3 space-y-3 clay-card rounded-[26px] p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-black text-stone-800">
                <Coffee className="h-4 w-4 text-[#4e3b6e]" />
                سفارشی‌سازی میزبانی و منوی پذیرایی
              </h3>
              <span className="text-[10px] font-semibold text-stone-500">اختیاری</span>
            </div>

            <div className="space-y-2.5">
              <div>
                <span className="mb-1.5 block text-[10px] font-bold text-stone-700">
                  انتخاب نوشیدنی یا میان‌وعده بدو ورود:
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {/* Always Available "Nothing / No Refreshment" Option */}
                  <button
                    type="button"
                    onClick={() => {
                      hapticSelection();
                      setSelectedBeverageId('none');
                    }}
                    className={`flex items-center justify-between rounded-2xl p-2.5 text-right transition-all cursor-pointer ${
                      selectedBeverageId === 'none'
                        ? 'clay-card ring-2 ring-[#4e3b6e] shadow-md font-bold text-stone-900'
                        : 'tactile-tile-3d text-stone-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${
                        selectedBeverageId === 'none' ? 'bg-stone-200 text-stone-800' : 'bg-stone-100 text-stone-500'
                      }`}>
                        <Ban className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="block text-[11px] font-bold">هیچ‌کدام (میل ندارم)</span>
                        <span className="text-[9px] text-stone-500">بدون سفارش پذیرایی</span>
                      </div>
                    </div>
                    <span className="rounded-lg clay-pill-3d px-2 py-0.5 text-[10px] font-bold text-stone-700">
                      رایگان
                    </span>
                  </button>

                  {/* Configured Beverage / Hospitality Items */}
                  {availableBeverages.map((b) => {
                    const isSelected = selectedBeverageId === b.id;
                    const isPriced = b.price > 0;

                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          hapticSelection();
                          setSelectedBeverageId(b.id);
                        }}
                        className={`flex items-center justify-between rounded-2xl p-2.5 text-right transition-all cursor-pointer ${
                          isSelected
                            ? 'clay-card ring-2 ring-[#721c24] shadow-md font-bold text-stone-900'
                            : 'tactile-tile-3d text-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${
                            isSelected ? 'bg-[#721c24] text-white shadow-2xs' : 'bg-[#f6f2f4] text-[#721c24]'
                          }`}>
                            {b.icon === 'tea' ? (
                              <Leaf className="h-4 w-4" />
                            ) : b.icon === 'water' || b.icon === 'juice' ? (
                              <GlassWater className="h-4 w-4" />
                            ) : b.icon === 'croissant' ? (
                              <UtensilsCrossed className="h-4 w-4" />
                            ) : (
                              <Coffee className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-[11px] font-bold truncate">{b.name}</span>
                            {b.description && (
                              <span className="block text-[9px] text-stone-500 truncate max-w-[140px]">
                                {b.description}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-left">
                          {isPriced ? (
                            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold ${
                              isSelected ? 'bg-[#f6f2f4] border border-[#d9c5cb] text-[#721c24]' : 'clay-pill-3d text-stone-800'
                            }`}>
                              +{toPersianDigits(b.price.toLocaleString())}
                            </span>
                          ) : (
                            <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              رایگان
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quiet Session Toggle */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('toggle');
                  setIsQuietSession((q) => !q);
                }}
                className={`flex w-full items-center justify-between rounded-2xl p-3 transition-all cursor-pointer ${
                  isQuietSession
                    ? 'clay-card ring-2 ring-[#721c24] bg-[#f6f2f4]/60 text-stone-900'
                    : 'tactile-tile-3d text-stone-700'
                }`}
              >
                <span className="flex items-center gap-2 text-xs font-bold">
                  <VolumeX className="h-4 w-4 text-[#721c24]" />
                  سشن سکوت (عدم مکالمه غیرضروری برای تمرکز و آرامش)
                </span>
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-lg transition-all ${
                    isQuietSession ? 'bg-[#721c24] text-white shadow-2xs' : 'border border-stone-300 bg-white'
                  }`}
                >
                  {isQuietSession && <Check className="h-3 w-3" />}
                </div>
              </button>
            </div>
          </section>
        ) : (
          /* Quiet Session Only if Hospitality is disabled */
          <section className="mb-3 clay-card rounded-[26px] p-3.5">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('toggle');
                setIsQuietSession((q) => !q);
              }}
              className={`flex w-full items-center justify-between rounded-2xl p-3 transition-all cursor-pointer ${
                isQuietSession
                  ? 'clay-card ring-2 ring-[#721c24] bg-[#f6f2f4]/60 text-stone-900'
                  : 'tactile-tile-3d text-stone-700'
              }`}
            >
              <span className="flex items-center gap-2 text-xs font-bold">
                <VolumeX className="h-4 w-4 text-[#721c24]" />
                سشن سکوت (عدم مکالمه غیرضروری برای تمرکز و آرامش)
              </span>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-lg transition-all ${
                  isQuietSession ? 'bg-[#721c24] text-white shadow-2xs' : 'border border-stone-300 bg-white'
                }`}
              >
                {isQuietSession && <Check className="h-3 w-3" />}
              </div>
            </button>
          </section>
        )}

        {/* Studio Policy Notice */}
        {(settings?.policies?.cancellationPolicyText || settings?.policies?.noShowPolicyText) && (
          <div className="mb-3 rounded-2xl bg-[#f6f2f4] border border-[#d9c5cb] p-3 text-[10px] text-[#721c24] leading-relaxed space-y-1">
            <div className="font-bold flex items-center justify-between">
              <span>قوانین پذیرش {branding.salonName || studio?.name || 'سالن زیبایی'}</span>
              {typeof settings?.policies?.lateArrivalGraceMinutes === 'number' && (
                <span>مهلت تاخیر مجاز: {toPersianDigits(settings.policies.lateArrivalGraceMinutes)} دقیقه</span>
              )}
            </div>
            {settings?.policies?.cancellationPolicyText && (
              <p>{settings.policies.cancellationPolicyText}</p>
            )}
          </div>
        )}

        {/* Security and Guarantee */}
        <div className="clay-card-subtle flex items-center justify-between rounded-2xl p-3 text-[11px] text-stone-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#0f172a]" />
            <span>تضمین رضایت و حریم خصوصی مراجعین {branding.salonName || studio?.name || 'سالن زیبایی'}</span>
          </div>
          <span className="font-bold text-[#721c24]">تأیید آنی</span>
        </div>

        {/* Official Electronic Trust Seal */}
        <div className="pt-1 pb-2 flex justify-center">
          <EnamadBadge variant="badge" size="sm" />
        </div>
      </main>

      {/* Floating Price Summary & Confirm Button */}
      <PriceSummary
        service={hydratedService || service}
        accoutrements={accoutrements}
        beverage={isHospitalityEnabled ? selectedBeverage : null}
        depositAmount={depositAmount}
        ctaLabel={
          isSelectedSlotExpired
            ? 'ساعت انتخابی گذشته است'
            : isSubmitting
            ? 'در حال اتصال به درگاه پرداخت...'
            : 'تأیید و پرداخت بیعانه با زرین‌پال'
        }
        onCta={handleSubmit}
        ctaDisabled={isSubmitting || isSelectedSlotExpired || !slotIsoDatetime}
        disabledHint={
          isSelectedSlotExpired
            ? 'ساعت انتخابی سپری شده است؛ لطفاً بازگردید و ساعت آینده را انتخاب کنید'
            : !slotIsoDatetime
            ? 'تاریخ یا ساعت انتخابی معتبر نیست'
            : undefined
        }
      />
    </AtelierShell>
  );
};
