import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, ChevronUp, Clock, Sparkles } from 'lucide-react';
import { Accoutrement, Service } from '../../types';
import { calculateBookingTotals } from '../../utils/bookingUtils';
import { formatPrice } from '../../utils/formatUtils';
import { toPersianDigits } from '../../utils/dateUtils';
import { hapticLight, hapticStepAdvance } from '../../utils/hapticUtils';
import { Button } from '@/components/ui/button';

interface PriceSummaryProps {
  service: Service | null;
  accoutrements: Accoutrement[];
  beverage?: { name: string; price: number } | null;
  showPrice?: boolean;
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
  disabledHint?: string;
  depositAmount?: number;
}

export const PriceSummary: React.FC<PriceSummaryProps> = ({
  service,
  accoutrements,
  beverage,
  showPrice = true,
  ctaLabel,
  onCta,
  ctaDisabled = false,
  disabledHint,
  depositAmount,
}) => {
  const [expanded, setExpanded] = useState(false);
  const totals = useMemo(() => calculateBookingTotals(service, accoutrements), [service, accoutrements]);

  const beveragePrice = beverage?.price || 0;
  const grandTotal = totals.total + beveragePrice;
  const grandOriginalTotal = totals.originalTotal + beveragePrice;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[26px] nav-dock-3d shadow-2xl">
        {/* Breakdown toggle */}
        {showPrice ? (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setExpanded((e) => !e);
            }}
            className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-bold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#721c24]" />
                مدت کل: {toPersianDigits(totals.totalDuration)} دقیقه
              </span>
              {totals.hasDiscount && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 font-black border border-emerald-300/60 shadow-2xs">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-700" />
                  {toPersianDigits(totals.discountPercent)}٪ تخفیف
                </span>
              )}
            </div>
            <span className="flex items-center gap-1">
              {expanded ? 'بستن جزئیات' : 'مشاهده جزئیات'}
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          </button>
        ) : (
          <div className="flex w-full items-center justify-between px-4 py-2 text-[11px] font-bold text-stone-600">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#721c24]" />
              مدت کل: {toPersianDigits(totals.totalDuration)} دقیقه
            </span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {expanded && showPrice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-stone-200/70"
            >
              <div className="space-y-1.5 px-4 py-3 text-xs bg-stone-50/70">
                <div className="flex items-center justify-between">
                  <span className="text-stone-700">{service?.name ?? 'خدمتی انتخاب نشده'}</span>
                  <div className="flex items-center gap-1.5">
                    {totals.hasDiscount && (
                      <span className="line-through text-stone-400 text-[10px] tabular-nums">
                        {formatPrice(totals.serviceRealPrice)}
                      </span>
                    )}
                    <span className={`font-bold tabular-nums ${totals.hasDiscount ? 'text-emerald-800' : 'text-stone-900'}`}>
                      {formatPrice(totals.servicePrice)}
                    </span>
                  </div>
                </div>

                {/* Dedicated Discount Savings Row */}
                {totals.hasDiscount && (
                  <div className="flex items-center justify-between text-emerald-700 font-bold bg-emerald-50/80 px-2 py-1 rounded-lg border border-emerald-200/60">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      تخفیف ویژه اعمال‌شده ({toPersianDigits(totals.discountPercent)}٪)
                    </span>
                    <span className="tabular-nums">- {formatPrice(totals.discountAmount)}</span>
                  </div>
                )}

                {totals.selectedExtras.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-stone-600">
                    <span>+ {a.name}</span>
                    <span className="font-medium text-stone-800 tabular-nums">{formatPrice(a.price)}</span>
                  </div>
                ))}
                {beverage && beverage.name && beverage.name !== 'بدون پذیرایی' && (
                  <div className="flex items-center justify-between text-stone-600">
                    <span>+ پذیرایی: {beverage.name}</span>
                    <span className={beverage.price > 0 ? 'font-bold text-stone-800 tabular-nums' : 'text-emerald-700 font-bold'}>
                      {beverage.price > 0 ? formatPrice(beverage.price) : 'رایگان'}
                    </span>
                  </div>
                )}
                {depositAmount !== undefined && depositAmount > 0 ? (
                  <div className="flex items-center justify-between text-[#721c24] font-bold bg-[#f6f2f4] px-2 py-1 rounded-lg border border-[#d9c5cb]">
                    <span>پیش‌پرداخت</span>
                    <span className="tabular-nums font-mono font-bold">
                      پیش‌پرداخت: {toPersianDigits(depositAmount.toLocaleString())} تومان
                    </span>
                  </div>
                ) : null}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Total + CTA */}
        <div className="flex flex-row-reverse items-center justify-between gap-2.5 sm:gap-3 border-t border-stone-200/70 px-3 sm:px-4 py-2.5 sm:py-3 w-full">
          {showPrice && (
            <div className="shrink-0 max-w-[34%] text-right flex flex-col justify-center leading-tight">
              {depositAmount !== undefined && depositAmount > 0 ? (
                <>
                  <p className="text-[10px] font-black text-[#721c24] leading-none mb-1">پیش‌پرداخت</p>
                  <p className="text-xs sm:text-sm font-black tabular-nums leading-tight text-[#721c24] whitespace-nowrap">
                    {toPersianDigits(depositAmount.toLocaleString())} <span className="text-[9px] font-normal text-stone-600">تومان</span>
                  </p>
                  <p className="text-[9px] font-medium text-stone-500 mt-0.5 whitespace-nowrap">
                    کل: {formatPrice(grandTotal)}
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-[10px] font-bold text-stone-500 leading-none">مبلغ نهایی</p>
                    {totals.hasDiscount && (
                      <span className="text-[8px] font-black text-emerald-800 bg-emerald-100 px-1 py-0.2 rounded-full whitespace-nowrap">
                        {toPersianDigits(totals.discountPercent)}٪-
                      </span>
                    )}
                  </div>
                  {totals.hasDiscount && (
                    <span className="line-through text-stone-400 text-[10px] font-medium tabular-nums whitespace-nowrap leading-none mb-0.5">
                      {formatPrice(grandOriginalTotal)}
                    </span>
                  )}
                  <p className={`text-xs sm:text-sm font-black tabular-nums leading-tight whitespace-nowrap ${totals.hasDiscount ? 'text-emerald-900' : 'text-stone-950'}`}>
                    {formatPrice(grandTotal)}
                  </p>
                </>
              )}
            </div>
          )}
          <Button
            variant="accent"
            size="lg"
            onClick={() => {
              hapticStepAdvance();
              onCta();
            }}
            disabled={ctaDisabled}
            title={ctaDisabled ? disabledHint : undefined}
            className={`flex-1 min-w-0 max-w-full h-auto min-h-[52px] sm:min-h-[56px] rounded-[18px] py-3.5 sm:py-4 px-3 sm:px-4 text-[13px] sm:text-[15px] font-black leading-snug tracking-tight transition-all cursor-pointer text-center break-words bg-gradient-to-r from-[#721c24] via-[#5c131a] to-[#460910] text-white hover:brightness-110 active:scale-[0.98] border border-[#8a222c]/60 shadow-[0_12px_24px_-4px_rgba(114,28,36,0.45),inset_0_1px_1.5px_rgba(255,255,255,0.35)] disabled:opacity-50 disabled:grayscale ${showPrice ? 'flex-1' : 'w-full'}`}
          >
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
