import React, { useState } from 'react';
import { useAtelier } from '../../store/AtelierContext';
import { 
  getTodayAppointments 
} from '../../utils/appointmentUtils';
import { Appointment } from '../../types';

// Child components
import { TodayTimeline } from './TodayTimeline';
import { VisualDayCalendarView } from './VisualDayCalendarView';
import { WalkInModal } from './WalkInModal';
import { QuickBookingModal } from './QuickBookingModal';
import { AppointmentDetailsModal } from './AppointmentDetailsModal';

import { Calendar, LayoutGrid, ListFilter, RefreshCw } from 'lucide-react';
import { toPersianDigits, getCurrentSolarDateInfo } from '../../utils/dateUtils';
import { useLiveClock } from '../../hooks/useLiveClock';

interface TodayViewProps {
  onOpenDossier: (customerId?: string) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onOpenDossier }) => {
  const { 
    appointments, 
    activeChair,
    startAppointment, 
    completeAppointment,
    setSelectedClientForDossier,
    customers,
    refreshDatabaseData,
    isRefreshing
  } = useAtelier();

  const liveClock = useLiveClock(1000);
  const currentDay = liveClock.dayNumber;
  const todayInfo = getCurrentSolarDateInfo();

  // Mode and Modals state
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [showQuickBooking, setShowQuickBooking] = useState(false);
  const [quickBookingTime, setQuickBookingTime] = useState('15:30');
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<{ startTime: string } | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Derive today's schedule dynamically from real-time today
  const todayAppointments = getTodayAppointments(appointments, currentDay);

  const handleStartAppointment = (aptId: string) => {
    startAppointment(aptId);
  };

  const handleCompleteAppointment = (aptId: string) => {
    completeAppointment(aptId);
  };

  const handleOpenClientDossier = (customerId?: string) => {
    if (customerId) {
      const client = customers.find((c) => c.id === customerId);
      if (client) {
        setSelectedClientForDossier(client);
      }
    }
    onOpenDossier(customerId);
  };

  const handleEmptySlotClick = (slotStartTime: string) => {
    setQuickBookingTime(slotStartTime);
    setShowQuickBooking(true);
  };

  return (
    <div className="space-y-4 w-full" dir="rtl">
      {/* Today's Continuous Schedule */}
      <div className="space-y-3 pt-0.5">
        <div className="apple-glass-subtle rounded-[24px] p-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] flex items-center justify-center shadow-2xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900">
                برنامه زمانی و نوبت‌های امروز
              </h3>
              <span className="text-[10px] text-stone-500 font-medium">
                {todayInfo.dateString} · {toPersianDigits(todayAppointments.length)} نوبت
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 5-Min Sync Button */}
            <button
              type="button"
              onClick={() => refreshDatabaseData()}
              disabled={isRefreshing}
              className={`p-1.5 px-2.5 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer apple-3d-tile ${
                isRefreshing
                  ? 'text-[#721c24] animate-pulse'
                  : 'text-stone-700 hover:text-stone-900'
              }`}
              title="همگام‌سازی خودکار هر ۵ دقیقه. کلیک برای به‌روزرسانی فوری"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#721c24] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'همگام‌سازی...' : 'به‌روزرسانی'}</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className={`py-1.5 px-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'timeline'
                    ? 'bg-white text-stone-900 shadow-xs border border-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="نمای لیست"
              >
                <ListFilter className={`w-3.5 h-3.5 ${viewMode === 'timeline' ? 'text-[#721c24]' : ''}`} />
                <span>لیست</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`py-1.5 px-3 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-stone-900 shadow-xs border border-white'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
                title="تقویم بصری"
              >
                <LayoutGrid className={`w-3.5 h-3.5 ${viewMode === 'calendar' ? 'text-[#721c24]' : ''}`} />
                <span>تقویم بصری</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'timeline' ? (
          <TodayTimeline
            appointments={todayAppointments}
            onSelectAppointment={(apt) => setSelectedAppointment(apt)}
            onStartAppointment={handleStartAppointment}
            onCompleteAppointment={handleCompleteAppointment}
          />
        ) : (
          <VisualDayCalendarView
            dayNumber={currentDay}
            dateString={todayInfo.dateString}
            appointments={todayAppointments}
            activeChair={activeChair}
            onSelectAppointment={(apt) => setSelectedAppointment(apt)}
          />
        )}
      </div>

      {/* Modals Styled to Match Customer Panel Glass/Slide-up */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => {
          setIsWalkInOpen(false);
          setSelectedSlotForBooking(null);
        }}
        initialStartTime={selectedSlotForBooking?.startTime}
      />

      <QuickBookingModal
        isOpen={showQuickBooking}
        onClose={() => setShowQuickBooking(false)}
        initialStartTime={quickBookingTime}
        initialDayNumber={currentDay}
        initialDate={todayInfo.dateString}
      />

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onOpenDossier={handleOpenClientDossier}
      />
    </div>
  );
};

