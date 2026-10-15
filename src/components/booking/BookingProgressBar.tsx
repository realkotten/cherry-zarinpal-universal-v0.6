import React from 'react';
import { Check } from 'lucide-react';
import { toPersianDigits } from '../../utils/dateUtils';

export type BookingFlowStep = 'services' | 'preference' | 'datetime' | 'checkout' | 'confirmed';

interface BookingProgressBarProps {
  currentStep: BookingFlowStep;
  className?: string;
  showLabels?: boolean;
}

interface StepItem {
  id: string;
  stepNum: number;
  label: string;
}

const STEPS: StepItem[] = [
  { id: 'services', stepNum: 1, label: 'انتخاب خدمات' },
  { id: 'scheduling', stepNum: 2, label: 'زمان‌بندی نوبت' },
  { id: 'checkout', stepNum: 3, label: 'تأیید و پرداخت' },
];

export const BookingProgressBar: React.FC<BookingProgressBarProps> = ({
  currentStep,
  className = '',
  showLabels = true,
}) => {
  let activeStepNum = 1;
  let percent = 33;
  let stepTitle = 'انتخاب خدمات و مراقبت‌ها';

  if (currentStep === 'services') {
    activeStepNum = 1;
    percent = 33;
    stepTitle = 'انتخاب خدمات';
  } else if (currentStep === 'preference') {
    activeStepNum = 2;
    percent = 60;
    stepTitle = 'تعیین زمان ایده‌آل';
  } else if (currentStep === 'datetime') {
    activeStepNum = 2;
    percent = 75;
    stepTitle = 'تأیید اسلات خالی';
  } else if (currentStep === 'checkout') {
    activeStepNum = 3;
    percent = 95;
    stepTitle = 'اطلاعات و صدور نوبت';
  } else if (currentStep === 'confirmed') {
    activeStepNum = 3;
    percent = 100;
    stepTitle = 'تکمیل رزرو';
  }

  return (
    <div
      id="booking-progress-bar"
      className={`w-full px-5 py-2 shrink-0 select-none ${className}`}
      dir="rtl"
      role="progressbar"
      aria-label="پیشرفت فرآیند رزرو نوبت"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* Top Header Row: Step info and % */}
      <div className="flex items-center justify-between text-[11px] mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-stone-800">
            مرحله {toPersianDigits(activeStepNum)} از {toPersianDigits(3)}:
          </span>
          <span className="font-bold text-[#721c24] tracking-tight">{stepTitle}</span>
        </div>
        <span className="text-[10.5px] font-black text-[#721c24] bg-[#f6f2f4] border border-[#d9c5cb] px-1.5 py-0.5 rounded-full tabular-nums shadow-2xs">
          {toPersianDigits(percent)}٪
        </span>
      </div>

      {/* Progress Track & Deep Bordeaux Animated Fill with Subtle Shine */}
      <div className="relative h-2.5 w-full rounded-full bg-stone-100 border border-[#d9c5cb]/60 p-[2px] shadow-inner overflow-hidden">
        <div
          className="relative h-full rounded-full bg-gradient-to-l from-[#721c24] via-[#5c131a] to-[#460910] transition-all duration-500 ease-out shadow-[0_1px_6px_rgba(114,28,36,0.35)] overflow-hidden"
          style={{ width: `${percent}%` }}
        >
          {/* Subtle Shine Animation Effect */}
          <div
            className="absolute inset-0 w-full h-full pointer-events-none animate-progress-shine bg-gradient-to-r from-transparent via-white/45 to-transparent"
            style={{ willChange: 'transform' }}
          ></div>
        </div>
      </div>

      {/* Segmented Labels / Micro-indicators */}
      {showLabels && (
        <div className="grid grid-cols-3 mt-1.5 gap-1 text-[10px] text-center font-medium">
          {STEPS.map((s) => {
            const isCompleted = s.stepNum < activeStepNum || (activeStepNum === 3 && percent === 100);
            const isCurrent = s.stepNum === activeStepNum && percent < 100;
            const isPending = s.stepNum > activeStepNum;

            return (
              <div
                key={s.id}
                className={`flex items-center justify-center gap-1 transition-colors ${
                  isCompleted
                    ? 'text-stone-800 font-bold'
                    : isCurrent
                    ? 'text-[#721c24] font-bold'
                    : 'text-stone-400 font-normal'
                }`}
              >
                {isCompleted ? (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#721c24] text-white shadow-2xs">
                    <Check className="h-2.5 w-2.5 stroke-[3]" />
                  </span>
                ) : (
                  <span
                    className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold transition-all ${
                      isCurrent
                        ? 'bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] shadow-2xs ring-2 ring-[#721c24]/15'
                        : 'bg-stone-100 text-stone-400 border border-stone-200/80'
                    }`}
                  >
                    {toPersianDigits(s.stepNum)}
                  </span>
                )}
                <span className="truncate">{s.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
