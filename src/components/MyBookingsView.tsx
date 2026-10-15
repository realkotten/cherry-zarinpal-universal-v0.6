import React, { useState, useMemo } from 'react';
import { Appointment, Reservation, Service } from '../types';
import { useAtelier, useBranding } from '../store/AtelierContext';
import { AtelierShell } from './AtelierShell';
import { DigitalBoardingPassModal } from './DigitalBoardingPassModal';
import { CancelAppointmentModal } from './CancelAppointmentModal';
import { 
  Calendar, 
  Clock, 
  Scissors, 
  User, 
  CheckCircle, 
  RotateCcw, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  CalendarCheck,
  QrCode,
  CreditCard
} from 'lucide-react';
import { toPersianDigits, formatAppointmentDate } from '../utils/dateUtils';
import { isTodayDayNumber, isTomorrowDayNumber } from '../utils/bookingUtils';
import { formatPrice } from '../utils/formatUtils';
import { isAppointmentForUser, getStoredUserBookingIds, addStoredUserBookingId, removeStoredUserBookingId } from '../utils/browserStorage';
import { API_BASE, postJson, getJson } from '../api/paymentApi';
import { getDeviceUuid } from '../utils/deviceIdentity';

interface MyBookingsViewProps {
  currentReservation?: Reservation;
  onViewPass?: () => void;
  onRebook: (service?: Service) => void;
  onOpenProfile: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  onRebook,
  onOpenProfile,
}) => {
  const {
    appointments,
    setAppointments,
    pastAppointments,
    currentCustomer,
    cancelAppointment,
    activeBarber,
    settings,
  } = useAtelier();

  // Auto-sync device bookings before displaying list
  React.useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const uuid = await getDeviceUuid();
        const res = await getJson<{ ok: boolean; bookings?: any[] }>(
          `${API_BASE}/my-bookings.php?device=${encodeURIComponent(uuid)}`
        );
        if (res && res.ok === true) {
          const serverBookings: Appointment[] = Array.isArray(res.bookings) ? res.bookings : [];
          const serverBookingIds = new Set<string>(serverBookings.map((b) => b.id).filter(Boolean));

          let storedList: Appointment[] = [];
          try {
            const raw = localStorage.getItem('atelier_appointments_v1');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) storedList = parsed;
            }
          } catch (e) {
            console.warn('[LocalStorage] Error reading appointments in MyBookingsView:', e);
          }

          let mergedList = [...storedList];
          for (const serverBooking of serverBookings) {
            const idx = mergedList.findIndex((a) => a.id === serverBooking.id);
            if (idx >= 0) {
              mergedList[idx] = serverBooking;
            } else {
              mergedList.unshift(serverBooking);
            }
            if (serverBooking.id) addStoredUserBookingId(serverBooking.id);
            if (serverBooking.appointmentNumber) addStoredUserBookingId(serverBooking.appointmentNumber);
          }

          // Reconcile: filter out stale orphans
          const reconciledList = mergedList.filter((apt) => {
            if (!apt || !apt.id) return false;
            const isOnline =
              apt.bookingSource === 'online' ||
              (typeof apt.id === 'string' && apt.id.startsWith('apt-online'));
            const hasServerCreatedAt = Boolean(apt.serverCreatedAt);
            const isMissingFromServer = !serverBookingIds.has(apt.id);
            const isUnpaid = apt.paymentStatus !== 'paid';

            if (isOnline && hasServerCreatedAt && isMissingFromServer && isUnpaid) {
              removeStoredUserBookingId(apt.id);
              if (apt.appointmentNumber) {
                removeStoredUserBookingId(apt.appointmentNumber);
              }
              return false;
            }
            return true;
          });

          try {
            localStorage.setItem('atelier_appointments_v1', JSON.stringify(reconciledList));
          } catch (e) {
            console.warn('[LocalStorage] Error saving reconciled appointments in MyBookingsView:', e);
          }

          if (isMounted) {
            setAppointments(reconciledList);
          }
        }
      } catch (err) {
        console.warn('MyBookingsView reconciliation notice (server unreachable):', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const branding = useBranding();
  const defaultBarber = branding.barberName || settings?.profile?.masterName?.trim() || activeBarber?.name || 'آرایشگر';

  // Modals state
  const [selectedPassAppointment, setSelectedPassAppointment] = useState<Appointment | null>(null);
  const [selectedCancelAppointment, setSelectedCancelAppointment] = useState<Appointment | null>(null);
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPayingId, setIsPayingId] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // Separate Active / Upcoming vs History
  const { activeBookings, historyBookings } = useMemo(() => {
    const localBookingIds = getStoredUserBookingIds();

    const userAppointments = appointments.filter((apt) =>
      isAppointmentForUser(apt, currentCustomer, localBookingIds)
    );

    const active = userAppointments
      .filter((apt) => apt.status === 'confirmed' || apt.status === 'in_progress' || apt.status === 'reserved')
      .sort((a, b) => {
        if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
        return a.startTime.localeCompare(b.startTime);
      });

    const historyFromLive = userAppointments.filter(
      (apt) => apt.status === 'completed' || apt.status === 'cancelled'
    );

    const existingIds = new Set(historyFromLive.map((a) => a.id));
    const historyCombined = [...historyFromLive];

    pastAppointments.forEach((pastApt) => {
      if (!existingIds.has(pastApt.id) && isAppointmentForUser(pastApt, currentCustomer, localBookingIds)) {
        historyCombined.push(pastApt);
        existingIds.add(pastApt.id);
      }
    });

    historyCombined.sort((a, b) => {
      if (a.dayNumber !== b.dayNumber) return b.dayNumber - a.dayNumber;
      return b.startTime.localeCompare(a.startTime);
    });

    return {
      activeBookings: active,
      historyBookings: historyCombined,
    };
  }, [appointments, pastAppointments, currentCustomer]);

  // Handle cancellation execution
  const handleConfirmCancel = (aptId: string) => {
    const result = cancelAppointment(aptId);
    setSelectedCancelAppointment(null);
    if (result.success) {
      triggerToast('نوبت شما لغو شد و ساعت انتخابی در تقویم آزاد گردید.');
    } else {
      triggerToast(result.message || 'خطا در لغو نوبت');
    }
  };

  // Handle rebook execution
  const handleRebookAppointment = (apt: Appointment) => {
    triggerToast(`سرویس «${apt.service?.name || 'پیرایش'}» برای رزرو مجدد انتخاب شد.`);
    setTimeout(() => {
      onRebook(apt.service);
    }, 400);
  };

  return (
    <AtelierShell id="my-bookings-container">
      {/* Toast Feedback */}
      {toastMessage && (
        <div 
          className="fixed top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-[#22262e] text-white shadow-2xl backdrop-blur-xl flex items-center gap-2 border border-white/20 text-xs font-medium animate-fade-in" 
          dir="rtl"
        >
          <CheckCircle className="w-3.5 h-3.5 text-[#fedecb]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header with Customer Identity */}
      <header
        id="my-bookings-header"
        className="relative z-30 px-6 pt-1 flex items-center justify-between shrink-0"
        dir="rtl"
      >
        <div
          className="flex items-center gap-1.5 py-1 px-3 rounded-full clay-pill-3d text-stone-800 text-[11px] font-medium"
        >
          <User className="w-3.5 h-3.5 text-[#0f172a]" />
          <span className="max-w-[100px] truncate">{currentCustomer.name}</span>
        </div>

        <div className="text-center">
          <h1 className="text-sm font-serif font-bold text-stone-900">
            رزروهای من
          </h1>
          <p className="text-[9px] text-stone-600 font-medium">
            مدیریت نوبت‌ها و سوابق مراجعه
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenProfile}
          className="w-8 h-8 rounded-full tactile-tile-3d text-stone-700 flex items-center justify-center cursor-pointer hover:border-slate-300"
          title="پروفایل کاربر"
        >
          <User className="w-3.5 h-3.5 text-[#0f172a]" />
        </button>
      </header>

      {/* Main Glass Shell Container */}
      <section
        id="my-bookings-card"
        className="relative z-20 mx-auto w-full max-w-[350px] clay-card rounded-[34px] p-3.5 flex flex-col justify-between mt-1 max-h-[660px] overflow-hidden"
        dir="rtl"
      >
        {/* Appointments List */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-0.5 my-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-stone-900">
              سوابق و نوبت‌های ثبت‌شده
            </span>
            <span className="text-[9px] text-stone-600 font-mono font-bold">
              {toPersianDigits(activeBookings.length + historyBookings.length)} رکورد
            </span>
          </div>

          {activeBookings.length === 0 && historyBookings.length === 0 ? (
            <div className="p-5 rounded-2xl clay-card-subtle text-center space-y-2.5">
              <CalendarCheck className="w-8 h-8 text-[#721c24] mx-auto opacity-70" />
              <p className="text-xs font-bold text-stone-800">هنوز نوبتی ثبت نشده است</p>
              <button
                type="button"
                onClick={() => onRebook()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl clay-button-primary text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#d9c5cb]" />
                <span>رزرو نوبت جدید</span>
              </button>
            </div>
          ) : (
            [...activeBookings, ...historyBookings].map((apt) => {
              const isCancelled = apt.status === 'cancelled';
              const isCompleted = apt.status === 'completed';
              const isExpanded = expandedNotesId === apt.id;
              const hasNotes = !!(apt.stylingNotes || apt.customerNotes);

              return (
                <div
                  key={apt.id}
                  className={`rounded-2xl p-3 space-y-2 transition-all ${
                    isCancelled
                      ? 'bg-gradient-to-b from-rose-50 to-rose-100/50 border border-white opacity-85 shadow-2xs'
                      : isCompleted
                      ? 'clay-card-subtle'
                      : 'clay-card'
                  }`}
                >
                  {/* Row 1: Service Name & Status Badges */}
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-[#721c24]" />
                      <span className="text-xs font-bold text-stone-900">
                        {apt.service?.name || 'سرویس پیرایش'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Payment Status Badge */}
                      {apt.paymentStatus && (
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                          apt.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : apt.paymentStatus === 'pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : apt.paymentStatus === 'failed'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-stone-200 text-stone-700 border-stone-300'
                        }`}>
                          {apt.paymentStatus === 'paid'
                            ? 'پرداخت شده'
                            : apt.paymentStatus === 'pending'
                            ? 'در انتظار پرداخت'
                            : apt.paymentStatus === 'failed'
                            ? 'پرداخت ناموفق'
                            : 'لغو شده'}
                        </span>
                      )}

                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        isCancelled
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : isCompleted
                          ? 'clay-pill-3d text-stone-700'
                          : apt.paymentStatus === 'pending'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-gradient-to-b from-emerald-100 to-emerald-200 text-emerald-800 border border-white shadow-2xs'
                      }`}>
                        {isCancelled 
                          ? 'لغو شده' 
                          : isCompleted 
                          ? 'تکمیل شده' 
                          : apt.paymentStatus === 'pending'
                          ? 'در انتظار پرداخت'
                          : 'رزرو تایید شده'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Barber & Suite & Cost */}
                  <div className="flex items-center justify-between text-[10px] text-stone-600 pt-1 border-t border-stone-200/70">
                    <span className="font-medium">
                      {apt.barberName || defaultBarber} · {apt.chairName || 'صندلی اختصاصی'}
                    </span>
                    {(() => {
                      const effectiveServicePrice = apt.service?.price ?? apt.servicePrice ?? 0;
                      const effectiveRealPrice = (apt.service?.realPrice && apt.service.realPrice > 0)
                        ? apt.service.realPrice
                        : (apt.originalServicePrice || effectiveServicePrice);
                      const extrasTotal = (apt.additionalAccoutrements && apt.additionalAccoutrements.length > 0)
                        ? apt.additionalAccoutrements.reduce((sum, a) => sum + (a.price || 0), 0)
                        : (apt.accoutrementsPrice || 0);

                      const hasDiscount = Boolean(effectiveRealPrice > effectiveServicePrice && effectiveServicePrice > 0);
                      const payableTotal = apt.priceSummary?.total ?? (effectiveServicePrice + extrasTotal);
                      const originalTotal = apt.priceSummary?.originalTotal ?? (effectiveRealPrice + extrasTotal);

                      return (
                        <div className="flex items-center gap-1.5 tabular-nums">
                          {hasDiscount && originalTotal > payableTotal && (
                            <span className="line-through text-stone-400 text-[9px] font-normal">
                              {formatPrice(originalTotal)}
                            </span>
                          )}
                          <span className="font-bold text-stone-900">
                            {formatPrice(payableTotal)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Optional Technical Styling Notes Accordion */}
                  {hasNotes && (
                    <div className="text-[9px] pt-1 border-t border-stone-200/70">
                      <button
                        type="button"
                        onClick={() => setExpandedNotesId(isExpanded ? null : apt.id)}
                        className="flex items-center gap-1 text-[#721c24] hover:text-[#5c131a] font-bold transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                        <span>{isExpanded ? 'بستن یادداشت‌های فنی' : 'مشاهده یادداشت‌های فنی'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-1 p-2 rounded-xl bg-stone-50 space-y-1 text-stone-700 leading-relaxed">
                          {apt.stylingNotes && (
                            <div>
                              <span className="font-bold text-stone-900">دستور فنی: </span>
                              <span>{apt.stylingNotes}</span>
                            </div>
                          )}
                          {apt.customerNotes && (
                            <div>
                              <span className="font-bold text-stone-900">یادداشت مشتری: </span>
                              <span>{apt.customerNotes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Amount Strip */}
                  {typeof apt.depositAmount === 'number' && apt.depositAmount > 0 && (
                    <div className="flex items-center justify-between text-[9px] px-2.5 py-1 bg-stone-50 text-stone-700 rounded-xl border border-stone-200/60 font-mono">
                      <span className="font-sans font-medium text-stone-600">
                        پیش‌پرداخت:
                      </span>
                      <span className="font-bold text-stone-900">{formatPrice(apt.depositAmount)}</span>
                    </div>
                  )}

                  {/* Payment Reference ID Strip */}
                  {apt.paymentRefId && (
                    <div className="flex items-center justify-between text-[9px] px-2.5 py-1 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200/60 font-mono">
                      <span className="font-sans font-medium text-emerald-800">کد رهگیری زرین‌پال:</span>
                      <span className="font-bold tracking-wider">{toPersianDigits(apt.paymentRefId)}</span>
                    </div>
                  )}

                  {/* Row 3: Date, Time & Quick Action Buttons */}
                  <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-[10px] text-stone-700">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1" title="تاریخ مراجعه به سالن">
                        <Calendar className="w-3 h-3 text-[#721c24]" />
                        <span className="font-bold text-stone-900">{formatAppointmentDate(apt)}</span>
                        {isTodayDayNumber(apt.dayNumber) && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb]">
                            امروز
                          </span>
                        )}
                        {isTomorrowDayNumber(apt.dayNumber) && (
                          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-[#0f172a] border border-slate-200">
                            فردا
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1" title="ساعت حضور">
                        <Clock className="w-3 h-3 text-[#721c24]" />
                        <span className="font-bold text-stone-900">{toPersianDigits(apt.startTime)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Pay deposit if pending */}
                      {apt.paymentStatus === 'pending' && !isCancelled && (
                        <button
                          type="button"
                          disabled={isPayingId === apt.id}
                          onClick={async () => {
                            if (isPayingId) return;
                            setIsPayingId(apt.id);
                            try {
                              const payData = await postJson<{ ok: boolean; appointment?: Appointment; redirectUrl?: string; error?: string }>(
                                `${API_BASE}/create.php`,
                                { ...apt, status: 'pending', paymentStatus: 'pending' }
                              );
                              if (payData?.ok && payData.redirectUrl) {
                                try {
                                  const raw = localStorage.getItem('atelier_appointments_v1');
                                  const list: Appointment[] = raw ? JSON.parse(raw) : [];
                                  const pendingApt: Appointment = {
                                    ...(payData.appointment || apt),
                                    status: 'pending',
                                    paymentStatus: 'pending',
                                  };
                                  const filtered = list.filter((a) => a.id !== pendingApt.id);
                                  filtered.unshift(pendingApt);
                                  localStorage.setItem('atelier_appointments_v1', JSON.stringify(filtered));
                                } catch (e) {
                                  console.warn('[LocalStorage] Error saving pending appointment:', e);
                                }
                                window.location.href = payData.redirectUrl;
                                return;
                              } else {
                                triggerToast(payData?.error || 'خطا در اتصال به درگاه پرداخت');
                              }
                            } catch {
                              triggerToast('خطا در برقراری ارتباط با سرور');
                            } finally {
                              setIsPayingId(null);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#721c24] to-[#5c131a] text-white text-[9px] font-bold shadow-2xs hover:brightness-105 transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="w-2.5 h-2.5" />
                          <span>{isPayingId === apt.id ? 'در حال اتصال...' : 'پرداخت بیعانه'}</span>
                        </button>
                      )}

                      {/* View Boarding Pass for upcoming/active */}
                      {!isCancelled && (
                        <button
                          type="button"
                          onClick={() => setSelectedPassAppointment(apt)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#721c24] to-[#5c131a] hover:from-[#5c131a] hover:to-[#460910] text-white text-[9px] font-bold shadow-2xs border border-white/20 transition-all cursor-pointer"
                        >
                          <QrCode className="w-2.5 h-2.5 text-white/90" />
                          <span>بلیت دیجیتال</span>
                        </button>
                      )}

                      {/* Cancel button for active upcoming */}
                      {!isCancelled && !isCompleted && (
                        <button
                          type="button"
                          onClick={() => setSelectedCancelAppointment(apt)}
                          className="p-1 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors cursor-pointer"
                          title="لغو نوبت"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Rebook for completed / cancelled */}
                      {(isCompleted || isCancelled) && (
                        <button
                          type="button"
                          onClick={() => handleRebookAppointment(apt)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#721c24] to-[#5c131a] hover:from-[#5c131a] hover:to-[#460910] text-white text-[9px] font-bold shadow-2xs transition-all cursor-pointer hover:brightness-110"
                        >
                          <RotateCcw className="w-2.5 h-2.5 text-white" />
                          <span>رزرو مجدد</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom CTA / Action Bar */}
        <div className="shrink-0 pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => onRebook()}
            className="clay-button-primary w-full py-3 px-3 rounded-[18px] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.985]"
          >
            <Plus className="w-3.5 h-3.5 text-white" />
            <span>رزرو نوبت جدید در آرایشگاه</span>
          </button>
        </div>
      </section>

      {/* Digital Boarding Pass Modal */}
      <DigitalBoardingPassModal
        appointment={selectedPassAppointment}
        isOpen={!!selectedPassAppointment}
        onClose={() => setSelectedPassAppointment(null)}
      />

      {/* Cancel Confirmation Dialog */}
      <CancelAppointmentModal
        appointment={selectedCancelAppointment}
        isOpen={!!selectedCancelAppointment}
        onClose={() => setSelectedCancelAppointment(null)}
        onConfirmCancel={handleConfirmCancel}
      />
    </AtelierShell>
  );
};
