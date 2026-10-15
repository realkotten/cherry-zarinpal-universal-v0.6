import React, { useState, useEffect } from 'react';
import { Appointment } from '../../types';
import { 
  CheckCircle2, 
  Sparkles, 
  Scissors, 
  Coffee, 
  User,
} from 'lucide-react';
import { toPersianDigits, addMinutesToTime } from '../../utils/dateUtils';
import { QuickContactButtons } from './QuickContactButtons';
import { SpatialTilt } from '../common/SpatialTilt';
import { Button } from '@/components/ui/button';

interface ActiveSessionCardProps {
  activeAppointment?: Appointment;
  onCompleteAppointment: (aptId: string) => void;
  onOpenCustomerDossier?: (customerId?: string) => void;
  onQuickWalkIn?: () => void;
}

export const ActiveSessionCard: React.FC<ActiveSessionCardProps> = ({
  activeAppointment,
  onCompleteAppointment,
  onOpenCustomerDossier,
  onQuickWalkIn,
}) => {
  const [nowDate, setNowDate] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!activeAppointment) {
    return (
      <SpatialTilt
        as="div"
        maxTilt={4}
        glareOpacity={0.22}
        scaleOnHover={1.01}
        className="apple-glass-card liquid-glass-3d rounded-[28px] p-4 text-stone-900"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] shadow-xs flex items-center justify-center shrink-0">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-[#721c24]">
                  صندلی آماده پذیرش
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 mt-0.5">
                نوبت فعالی در حال انجام نیست
              </h3>
            </div>
          </div>

          {onQuickWalkIn && (
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={onQuickWalkIn}
              className="rounded-2xl px-3.5 py-2 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span>پذیرش فوری</span>
            </Button>
          )}
        </div>
      </SpatialTilt>
    );
  }

  // Calculate live countdown
  const totalDuration = activeAppointment.durationMinutes || 45;
  const startTimeStr = activeAppointment.startTime || '14:15';
  const endTimeStr = activeAppointment.endTime || addMinutesToTime(startTimeStr, totalDuration);

  const [startHour, startMin] = startTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const startTimeObj = new Date();
  startTimeObj.setHours(startHour, startMin, 0, 0);

  const [endHour, endMin] = endTimeStr.split(':').map((v) => parseInt(v, 10) || 0);
  const endTimeObj = new Date();
  endTimeObj.setHours(endHour, endMin, 0, 0);

  const totalSeconds = totalDuration * 60;
  const elapsedSecondsRaw = Math.max(0, Math.floor((nowDate.getTime() - startTimeObj.getTime()) / 1000));
  const remainingSecondsRaw = Math.max(0, Math.floor((endTimeObj.getTime() - nowDate.getTime()) / 1000));
  const progressPercent = Math.min(100, Math.max(0, (elapsedSecondsRaw / totalSeconds) * 100));

  const remainingMin = Math.floor(remainingSecondsRaw / 60);
  const remainingSec = remainingSecondsRaw % 60;

  return (
    <div className="rounded-[28px] bg-gradient-to-r from-[#0b111e] via-[#0f172a] to-[#1e293b] text-white shadow-[0_24px_50px_-8px_rgba(11,17,30,0.65),0_10px_24px_-4px_rgba(11,17,30,0.4),0_1px_0_1px_rgba(255,255,255,0.12)_inset] border border-[#721c24]/35 ring-1 ring-[#721c24]/25 p-4 relative overflow-hidden">
      {/* Upper header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] text-[#d9c5cb] font-bold">
              نوبت در حال انجام
            </span>
          </div>
          <h2
            onClick={() => onOpenCustomerDossier && onOpenCustomerDossier(activeAppointment.customerId)}
            className="text-sm font-bold text-white mt-0.5 hover:text-[#d9c5cb] cursor-pointer transition-colors"
          >
            {activeAppointment.customerName}
          </h2>
          <p className="text-[11px] text-slate-300 mt-0.5">
            {activeAppointment.service?.name} · {toPersianDigits(totalDuration)} دقیقه
          </p>
        </div>

        {/* Dark Cherry Bordeaux Badge */}
        <div className="w-10 h-10 rounded-2xl bg-[#721c24]/25 border border-[#721c24]/50 flex items-center justify-center shrink-0 shadow-xs">
          <Scissors className="w-4 h-4 text-[#d9c5cb]" />
        </div>
      </div>

      {/* Countdown Timer Display */}
      <div className="mt-3 bg-[#1e293b]/80 rounded-2xl p-3 border border-white/10">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="text-slate-300 font-medium">زمان باقی‌مانده:</span>
          <span className="font-mono font-bold text-[#d9c5cb] tracking-wider text-xs">
            {toPersianDigits(remainingMin)}:{toPersianDigits(remainingSec < 10 ? `۰${remainingSec}` : remainingSec)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#721c24] to-[#d9c5cb] rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Beverage / Technical Notes */}
      {activeAppointment.beverage && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-slate-200 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
          <Coffee className="w-3.5 h-3.5 text-[#d9c5cb] shrink-0" />
          <span className="truncate">پذیرایی: {activeAppointment.beverage.name}</span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenCustomerDossier && onOpenCustomerDossier(activeAppointment.customerId)}
            className="text-[10px] font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 border border-white/15 cursor-pointer"
          >
            <User className="w-3 h-3" />
            <span>پرونده مشتری</span>
          </button>

          {activeAppointment.customerPhone && (
            <QuickContactButtons
              phone={activeAppointment.customerPhone}
              customerName={activeAppointment.customerName}
              appointmentTime={activeAppointment.startTime}
              serviceName={activeAppointment.service?.name}
              size="xs"
              variant="dark"
            />
          )}
        </div>

        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={() => onCompleteAppointment(activeAppointment.id)}
          className="text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
          <span>تکمیل نوبت</span>
        </Button>
      </div>
    </div>
  );
};
