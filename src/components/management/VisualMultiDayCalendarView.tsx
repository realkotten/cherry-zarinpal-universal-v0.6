import React, { useMemo, useRef, useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { Appointment, Chair } from '../../types';
import { toPersianDigits } from '../../utils/dateUtils';

interface VisualMultiDayCalendarViewProps {
  days: {
    dayNumber: number;
    dayName: string;
    dayNumberPersian: string;
    isToday: boolean;
    dateString: string;
  }[];
  selectedDayNumber: number;
  onSelectDay: (dayNumber: number) => void;
  appointments: Appointment[];
  activeChair: Chair;
  onSelectAppointment: (appointment: Appointment) => void;
}

const START_HOUR = 9;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR + 1;
const HOUR_HEIGHT_PX = 58;

export const VisualMultiDayCalendarView: React.FC<VisualMultiDayCalendarViewProps> = ({
  days,
  selectedDayNumber,
  onSelectDay,
  appointments,
  activeChair,
  onSelectAppointment,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const internalClickRef = useRef(false);

  const maxStart = Math.max(0, days.length - 3);

  const selectedIdx = useMemo(() => {
    const idx = days.findIndex((d) => d.dayNumber === selectedDayNumber);
    return idx >= 0 ? idx : 0;
  }, [days, selectedDayNumber]);

  const [windowStart, setWindowStart] = useState<number>(() =>
    Math.min(Math.max(0, selectedIdx), maxStart)
  );

  // Sync the 3-day window whenever user selects a day from the 7-day strip or switches weeks
  useEffect(() => {
    if (internalClickRef.current) {
      internalClickRef.current = false;
      return;
    }
    setWindowStart(Math.min(Math.max(0, selectedIdx), maxStart));
  }, [selectedIdx, maxStart, days]);

  const visibleDays = useMemo(
    () => days.slice(windowStart, windowStart + 3),
    [days, windowStart]
  );

  const handleShiftWindow = (delta: number) => {
    const nextStart = Math.min(Math.max(0, windowStart + delta), maxStart);
    if (nextStart === windowStart) return;
    setWindowStart(nextStart);
    const nextSlice = days.slice(nextStart, nextStart + 3);
    if (nextSlice.length > 0 && !nextSlice.some((d) => d.dayNumber === selectedDayNumber)) {
      internalClickRef.current = true;
      onSelectDay(nextSlice[0].dayNumber);
    }
  };

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      slots.push({
        hour: h,
        label: `${h.toString().padStart(2, '0')}:00`,
      });
    }
    return slots;
  }, []);

  const timeToMinutesFromStart = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return Math.max(0, (h - START_HOUR) * 60 + (m || 0));
  };

  return (
    <div className="space-y-2.5 w-full select-none font-sans" dir="rtl">
      {/* Visual Multi-Day Header */}
      <div className="apple-glass-card rounded-[24px] p-2.5">
        <div className="grid grid-cols-[3.5rem_repeat(3,1fr)] gap-1.5 text-center items-center">
          {/* 3-Day Window Shift Controls */}
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-0.5 bg-slate-100/90 rounded-lg p-0.5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => handleShiftWindow(-1)}
                disabled={windowStart <= 0}
                title="روز قبل"
                aria-label="روز قبل"
                className="w-5 h-5 rounded-md flex items-center justify-center text-stone-600 hover:bg-white hover:text-[#721c24] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleShiftWindow(1)}
                disabled={windowStart >= maxStart}
                title="روز بعد"
                aria-label="روز بعد"
                className="w-5 h-5 rounded-md flex items-center justify-center text-stone-600 hover:bg-white hover:text-[#721c24] disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
            <span className="text-[9px] font-mono font-bold text-stone-400">ساعت</span>
          </div>

          {visibleDays.map((day) => {
            const isSelected = day.dayNumber === selectedDayNumber;
            const dayApts = appointments.filter(
              (a) => a.status !== 'cancelled' && a.dayNumber === day.dayNumber && (!a.chairId || a.chairId === activeChair.id)
            );
            return (
              <button
                key={day.dayNumber}
                type="button"
                onClick={() => {
                  internalClickRef.current = true;
                  onSelectDay(day.dayNumber);
                }}
                className={`py-2 px-1.5 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#721c24] to-[#5c131a] text-white shadow-[0_10px_20px_-4px_rgba(114,28,36,0.35)] border border-[#721c24]'
                    : 'apple-3d-tile text-stone-700 hover:bg-white'
                }`}
              >
                <span className="block text-[10px] font-bold opacity-85">{day.dayName}</span>
                <span className="text-xs font-mono font-bold">{toPersianDigits(day.dayNumber)}</span>
                {dayApts.length > 0 && (
                  <span className={`block text-[9px] font-mono rounded-full mx-auto w-fit px-2 mt-0.5 font-bold ${
                    isSelected ? 'bg-white/20 text-white' : day.isToday ? 'bg-[#721c24] text-white' : 'bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb]'
                  }`}>
                    {toPersianDigits(dayApts.length)} نوبت
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Canvas */}
      <div
        ref={containerRef}
        className="relative apple-glass-card rounded-[28px] overflow-y-auto max-h-[560px] custom-scrollbar"
      >
        <div 
          className="relative min-h-[812px] w-full"
          style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT_PX}px` }}
        >
          {/* Background Horizontal Guide Lines */}
          {timeSlots.map((slot, index) => {
            const topPx = index * HOUR_HEIGHT_PX;
            return (
              <div
                key={slot.hour}
                className="absolute w-full border-t border-stone-200/50 flex items-start pointer-events-none"
                style={{ top: `${topPx}px`, height: `${HOUR_HEIGHT_PX}px` }}
              >
                <div className="w-14 shrink-0 -mt-2 pr-2 text-right">
                  <span className="text-[10px] font-mono font-bold text-stone-400">
                    {slot.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 flex-1 h-full border-r border-stone-200/40">
                  <div className="border-l border-stone-100 h-full" />
                  <div className="border-l border-stone-100 h-full" />
                  <div className="h-full" />
                </div>
              </div>
            );
          })}

          {/* 3 Day Columns */}
          <div className="absolute inset-0 grid grid-cols-[3.5rem_repeat(3,1fr)] pointer-events-none">
            <div className="w-14 shrink-0" />
            {visibleDays.map((day) => {
              const dayApts = appointments.filter(
                (a) => a.status !== 'cancelled' && a.dayNumber === day.dayNumber && (!a.chairId || a.chairId === activeChair.id)
              );

              return (
                <div 
                  key={day.dayNumber} 
                  className="relative h-full border-r border-stone-200/40 pointer-events-auto"
                >
                  {dayApts.map((apt) => {
                    const startMin = timeToMinutesFromStart(apt.startTime);
                    const duration = apt.durationMinutes || 45;
                    const topPx = (startMin / 60) * HOUR_HEIGHT_PX;
                    const heightPx = Math.max(34, (duration / 60) * HOUR_HEIGHT_PX - 3);

                    const isInProgress = apt.status === 'in_progress';
                    const isCompleted = apt.status === 'completed';
                    const isBlocked = apt.status === 'blocked';

                    return (
                      <div
                        key={apt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAppointment(apt);
                        }}
                        className={`absolute left-1 right-1 rounded-xl p-1.5 transition-all cursor-pointer overflow-hidden border shadow-2xs hover:shadow-md hover:scale-[1.02] z-10 ${
                          isInProgress
                            ? 'bg-[#0f172a] text-white border-[#721c24]'
                            : isCompleted
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                            : isBlocked
                            ? 'bg-stone-100 text-stone-600 border-dashed border-stone-300'
                            : 'bg-white/95 text-stone-900 border-[#d9c5cb] hover:border-[#721c24]'
                        }`}
                        style={{
                          top: `${topPx}px`,
                          height: `${heightPx}px`,
                        }}
                      >
                        <div className="flex flex-col justify-between h-full text-[10px] min-w-0">
                          <div className="flex items-center justify-between gap-1 font-bold">
                            <span className="truncate">{apt.customerName || 'Block'}</span>
                            <span className="font-mono text-[9px] opacity-80">{apt.startTime}</span>
                          </div>
                          {heightPx > 38 && (
                            <span className="truncate opacity-75 text-[8px] font-medium">{apt.service?.name}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
