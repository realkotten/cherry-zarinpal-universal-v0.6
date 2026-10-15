import React, { useState } from 'react';
import { Appointment } from '../../types';
import { 
  Clock, 
  User, 
  Scissors, 
  Sparkles, 
  CheckCircle2, 
  Play, 
  ChevronLeft, 
  VolumeX, 
  Armchair,
  CalendarClock,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { toPersianDigits, addMinutesToTime } from '../../utils/dateUtils';
import { formatPrice } from '../../utils/formatUtils';
import { getAppointmentStatusBadge, getBookingSourceLabel } from '../../utils/statusUtils';
import { PriceDisplay } from '../common/PriceDisplay';
import { QuickContactButtons } from './QuickContactButtons';
import { RescheduleModal } from './RescheduleModal';
import { useAtelier } from '../../store/AtelierContext';

interface TodayTimelineProps {
  appointments: Appointment[];
  onSelectAppointment: (appointment: Appointment) => void;
  onStartAppointment: (aptId: string) => void;
  onCompleteAppointment: (aptId: string) => void;
}

export const TodayTimeline: React.FC<TodayTimelineProps> = ({
  appointments,
  onSelectAppointment,
  onStartAppointment,
  onCompleteAppointment,
}) => {
  const { cancelAppointment } = useAtelier();
  const [rescheduleTargetApt, setRescheduleTargetApt] = useState<Appointment | null>(null);
  const [cancelTargetApt, setCancelTargetApt] = useState<Appointment | null>(null);

  if (appointments.length === 0) {
    return (
      <div className="apple-glass-card rounded-[26px] p-8 text-center">
        <div className="w-11 h-11 rounded-2xl bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] flex items-center justify-center mx-auto mb-2.5 shadow-2xs">
          <Clock className="w-5 h-5" />
        </div>
        <p className="text-sm font-bold text-stone-900">نوبتی برای امروز ثبت نشده است</p>
        <p className="text-xs text-stone-500 mt-1">از طریق دکمه «پذیرش فوری» می‌توانید مراجعین حضوری جدید را ثبت نمایید.</p>
      </div>
    );
  }

  const handleConfirmCancel = () => {
    if (cancelTargetApt) {
      cancelAppointment(cancelTargetApt.id);
      setCancelTargetApt(null);
    }
  };

  return (
    <div className="space-y-3 w-full" dir="rtl">
      {appointments.map((apt, index) => {
        const isBlocked = apt.status === 'blocked';
        const isCancelled = apt.status === 'cancelled';
        const isInProgress = apt.status === 'in_progress';
        const isCompleted = apt.status === 'completed';
        const duration = apt.durationMinutes || 45;
        const endTimeStr = apt.endTime || addMinutesToTime(apt.startTime, duration);
        const statusMeta = getAppointmentStatusBadge(apt.status, apt.paymentStatus);
        const sourceMeta = getBookingSourceLabel(apt.bookingSource);
        const canManageBooking = !isCompleted && !isCancelled && !isBlocked;

        return (
          <div
            key={apt.id || index}
            onClick={() => onSelectAppointment(apt)}
            className={`group rounded-[24px] p-3.5 sm:p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isInProgress
                ? 'bg-gradient-to-r from-[#0b111e] via-[#0f172a] to-[#1e293b] text-white border border-[#721c24]/40 shadow-lg ring-1 ring-[#721c24]/25'
                : isCompleted
                ? 'apple-glass-subtle text-stone-700 opacity-90'
                : isBlocked
                ? 'bg-stone-100/75 backdrop-blur-md border border-stone-300/80 border-dashed text-stone-600'
                : isCancelled
                ? 'bg-stone-100/50 border border-stone-200 text-stone-400 opacity-60'
                : 'apple-glass-card hover:bg-white/95 text-stone-900'
            }`}
          >
            {/* Left/Main Information */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Time Block Badge */}
              <div
                className={`px-3 py-2 rounded-2xl text-center shrink-0 flex flex-col items-center justify-center min-w-[72px] ${
                  isInProgress
                    ? 'bg-white/10 text-[#d9c5cb] border border-white/15'
                    : isCompleted
                    ? 'bg-stone-100 text-stone-600 border border-stone-200/70'
                    : 'bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-1 font-mono text-xs font-black">
                  <Clock className={`w-3 h-3 ${isInProgress ? 'text-[#d9c5cb]' : 'text-[#721c24]'}`} />
                  <span style={{ fontFamily: 'var(--app-font)', fontSize: '13px' }}>
                    {toPersianDigits(apt.startTime)}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 font-mono mt-0.5">
                  تا {toPersianDigits(endTimeStr)}
                </span>
              </div>

              {/* Customer & Service Info */}
              <div className="text-right min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-black truncate ${isInProgress ? 'text-white' : 'text-stone-900'}`}>
                    {apt.customerName}
                  </span>

                  {apt.isQuietSession && (
                    <span className="inline-flex items-center gap-1 text-[9px] bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] px-2 py-0.5 rounded-full font-bold">
                      <VolumeX className="w-2.5 h-2.5" />
                      <span>سکوت</span>
                    </span>
                  )}

                  {sourceMeta?.label && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                      isInProgress ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {sourceMeta.label}
                    </span>
                  )}
                </div>

                {/* Service Details & Pricing */}
                <div className="flex items-center gap-2.5 flex-wrap text-xs">
                  <span className={`flex items-center gap-1 font-medium ${isInProgress ? 'text-slate-300' : 'text-stone-700'}`}>
                    <Scissors className={`w-3.5 h-3.5 shrink-0 ${isInProgress ? 'text-[#d9c5cb]' : 'text-[#721c24]'}`} />
                    <span className="truncate">{apt.service?.name || 'سرویس اصلاح و پیرایش'}</span>
                  </span>

                  {/* Price display with discount support */}
                  <div className="mr-auto sm:mr-0">
                    <PriceDisplay
                      service={apt.service}
                      price={apt.servicePrice}
                      realPrice={apt.originalServicePrice}
                      size="xs"
                      showBadge={true}
                    />
                  </div>
                </div>

                {/* Barber and Chair Note */}
                <div className={`text-[10px] flex items-center gap-2 ${isInProgress ? 'text-slate-400' : 'text-stone-500'}`}>
                  <span>{apt.barberName || 'آرایشگر شیفت'}</span>
                  {apt.chairName && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Armchair className="w-3 h-3 opacity-70" />
                        <span>{apt.chairName}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right/Action Buttons & Status Badge */}
            <div
              className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200/40 flex-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Quick Contact Buttons */}
              {apt.customerPhone && !isBlocked && (
                <QuickContactButtons
                  phone={apt.customerPhone}
                  customerName={apt.customerName}
                  appointmentTime={apt.startTime}
                  appointmentDate={apt.date}
                  serviceName={apt.service?.name}
                  size="xs"
                  variant={isInProgress ? 'dark' : 'light'}
                />
              )}

              {/* Payment Badge */}
              {apt.paymentStatus && (
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                    apt.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : apt.paymentStatus === 'pending'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : apt.paymentStatus === 'failed'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : 'bg-stone-200 text-stone-600 border-stone-300'
                  }`}
                >
                  {apt.paymentStatus === 'paid'
                    ? 'پرداخت شده'
                    : apt.paymentStatus === 'pending'
                    ? 'در انتظار پرداخت'
                    : apt.paymentStatus === 'failed'
                    ? 'پرداخت ناموفق'
                    : 'لغو شده'}
                </span>
              )}

              {/* Status Badge */}
              <span
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold shadow-2xs ${
                  isInProgress
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : isCompleted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : isBlocked
                    ? 'bg-stone-200 text-stone-700'
                    : isCancelled
                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                    : 'bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb]'
                }`}
              >
                {statusMeta.label}
              </span>

              {/* Direct Barber Actions: Reschedule & Cancel */}
              {canManageBooking && (
                <div className="flex items-center gap-1">
                  {/* Reschedule Button */}
                  <button
                    type="button"
                    onClick={() => setRescheduleTargetApt(apt)}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer ${
                      isInProgress
                        ? 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15'
                        : 'apple-3d-tile text-stone-800'
                    }`}
                    title="تغییر زمان نوبت"
                  >
                    <CalendarClock className="w-3 h-3 text-[#721c24]" />
                    <span className="hidden sm:inline">انتقال</span>
                  </button>

                  {/* Cancel Button */}
                  <button
                    type="button"
                    onClick={() => setCancelTargetApt(apt)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                    title="لغو نوبت"
                  >
                    <XCircle className="w-3 h-3 text-rose-600" />
                    <span className="hidden sm:inline">لغو</span>
                  </button>
                </div>
              )}

              {/* Interactive Lifecycle Actions */}
              {isInProgress ? (
                <button
                  type="button"
                  onClick={() => onCompleteAppointment(apt.id)}
                  className="text-xs font-black bg-[#721c24] hover:bg-[#5c131a] text-white px-3.5 py-1.5 rounded-2xl shadow-sm hover:shadow transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>تکمیل نوبت</span>
                </button>
              ) : apt.status === 'confirmed' || apt.status === 'reserved' ? (
                <button
                  type="button"
                  onClick={() => onStartAppointment(apt.id)}
                  className="text-xs font-black bg-gradient-to-r from-[#721c24] to-[#5c131a] hover:from-[#5c131a] hover:to-[#460910] text-white px-3 py-1.5 rounded-2xl shadow-sm hover:shadow transition-transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3 h-3 fill-current text-white/90" />
                  <span>شروع سرویس</span>
                </button>
              ) : null}

              {/* Detail Open Chevron */}
              <div
                onClick={() => onSelectAppointment(apt)}
                className="w-7 h-7 rounded-xl flex items-center justify-center apple-3d-tile text-stone-600 transition-colors cursor-pointer"
                title="مشاهده جزئیات کامل نوبت"
              >
                <ChevronLeft className="w-4 h-4 text-stone-600" />
              </div>
            </div>
          </div>
        );
      })}

      {/* Reschedule Modal */}
      <RescheduleModal
        isOpen={!!rescheduleTargetApt}
        onClose={() => setRescheduleTargetApt(null)}
        appointment={rescheduleTargetApt}
      />

      {/* Cancel Confirmation Dialog */}
      {cancelTargetApt && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in"
          onClick={() => setCancelTargetApt(null)}
          dir="rtl"
        >
          <div
            className="w-full max-w-[320px] bg-white rounded-[26px] p-4 shadow-2xl border border-stone-200 space-y-3 animate-in zoom-in-95 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-900">
                لغو نوبت {cancelTargetApt.customerName}
              </h4>
              <p className="text-[10px] text-stone-500 mt-1">
                ساعت {toPersianDigits(cancelTargetApt.startTime)} · {cancelTargetApt.service?.name}
              </p>
              <p className="text-[11px] text-rose-700 font-semibold mt-2">
                آیا از لغو این نوبت اطمینان دارید؟
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                بله، نوبت لغو شود
              </button>
              <button
                type="button"
                onClick={() => setCancelTargetApt(null)}
                className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
