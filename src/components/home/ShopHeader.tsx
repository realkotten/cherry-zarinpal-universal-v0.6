import React, { useMemo } from 'react';
import { Scissors, Phone, MapPin } from 'lucide-react';
import { Studio } from '../../types';
import { SpatialTilt } from '../common/SpatialTilt';
import { useAtelier, useBranding } from '../../store/AtelierContext';
import { getCurrentSolarDateInfo, matchDayConfig, normalizeWeekday, toPersianDigits } from '../../utils/dateUtils';

interface ShopHeaderProps {
  studio?: Studio;
  onOpenManagement: () => void;
  onOpenMap: () => void;
}

export const ShopHeader: React.FC<ShopHeaderProps> = ({
  studio,
  onOpenManagement,
  onOpenMap,
}) => {
  const { activeBarber, settings } = useAtelier();
  const branding = useBranding();
  const shopName = branding.salonName || settings?.profile?.name?.trim() || studio?.name || 'سالن زیبایی';
  const shopPhone = branding.phone || settings?.profile?.phone?.trim() || studio?.phone || '';

  const liveHoursStatus = useMemo(() => {
    if (settings?.profile?.operationalStatus === 'closed') {
      return { isOpen: false, text: 'مجموعه موقتاً تعطیل است' };
    }
    if (activeBarber?.isAvailableToday === false) {
      return { isOpen: false, text: 'امروز تعطیل · عدم حضور آرایشگر' };
    }
    const todayInfo = getCurrentSolarDateInfo();
    const hoursList =
      activeBarber?.workingHours && activeBarber.workingHours.length > 0
        ? activeBarber.workingHours
        : settings?.operatingHours || [];
    const todayConfig = matchDayConfig(hoursList, todayInfo.dayName);
    const workingDays = activeBarber?.workingDays || [];
    const isDayInWorkingDays =
      workingDays.length === 0 ||
      workingDays.some((d) => normalizeWeekday(d) === normalizeWeekday(todayInfo.dayName));

    if (todayConfig?.isClosed || !isDayInWorkingDays) {
      return { isOpen: false, text: `امروز (${todayInfo.dayName}) تعطیل است` };
    }

    const openStr = toPersianDigits(todayConfig?.openTime || '10:00');
    const closeStr = toPersianDigits(todayConfig?.closeTime || '20:30');
    const breakText =
      todayConfig?.breakStart && todayConfig?.breakEnd
        ? ` · استراحت ${toPersianDigits(todayConfig.breakStart)}-${toPersianDigits(todayConfig.breakEnd)}`
        : '';
    return {
      isOpen: true,
      text: `امروز باز است · ${openStr} تا ${closeStr}${breakText}`,
    };
  }, [activeBarber, settings]);

  return (
    <SpatialTilt
      as="div"
      id="shop-presence-header" 
      maxTilt={5}
      glareOpacity={0.25}
      scaleOnHover={1.01}
      className="rounded-[26px] mb-3 text-stone-900 shadow-[0_22px_50px_-10px_rgba(15,23,42,0.22),0_10px_22px_-4px_rgba(15,23,42,0.12)]"
    >
      <div className="w-full rounded-[26px]">
        <div className="apple-glass-card liquid-glass-3d rounded-[26px] p-3.5 bg-gradient-to-br from-white/85 via-[#fafaf9]/75 to-[#f6f2f4]/85 backdrop-blur-2xl backdrop-saturate-[190%] border border-slate-300/80 ring-1 ring-inset ring-white/95 shadow-[0_20px_48px_-10px_rgba(15,23,42,0.20),0_8px_20px_-4px_rgba(15,23,42,0.12),inset_0_1.5px_0_0_rgba(255,255,255,1),inset_0_-1px_0_0_rgba(114,28,36,0.18),inset_0_0_22px_rgba(255,255,255,0.7)]">
          <div className="flex items-center justify-between">
            {/* Shop Brand & Name */}
            <div className="flex items-center gap-2.5">
              <SpatialTilt
                as="button"
                id="manager-panel-scissor-button"
                maxTilt={12}
                glareOpacity={0.4}
                scaleOnHover={1.08}
                onClick={onOpenManagement}
                title="ورود به پنل مدیریت آرایشگاه"
                aria-label="ورود به پنل مدیریت آرایشگاه"
                className="group/scissor relative w-10 h-10 rounded-2xl apple-3d-tile text-[#0f172a] hover:text-[#721c24] hover:border-[#d9c5cb] hover:bg-[#f6f2f4] flex items-center justify-center cursor-pointer"
              >
                <Scissors
                  style={{
                    paddingLeft: '0px',
                    marginLeft: '0px',
                    marginTop: '0px',
                    marginBottom: '0px',
                    marginRight: '0px',
                  }}
                  className="w-5 h-5 transition-transform duration-200 group-hover/scissor:rotate-45 group-hover/scissor:scale-110"
                />
              </SpatialTilt>
              <div>
                <h1 className="text-sm font-bold text-stone-900 tracking-tight">
                  {branding.salonName || shopName}
                </h1>
                {/* Live Hours Text */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      liveHoursStatus.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-[10px] font-medium text-stone-600">
                    {liveHoursStatus.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact & Map Actions */}
            <div className="flex items-center gap-2">
              <a
                id="home-quick-call-btn"
                href={`tel:${shopPhone.replace(/\D/g, '')}`}
                className="w-8 h-8 rounded-full apple-3d-tile text-stone-700 hover:text-blue-800 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                title={`تماس با آرایشگاه: ${shopPhone}`}
              >
                <Phone className="w-3.5 h-3.5" />
              </a>

              <button
                id="home-quick-map-btn"
                type="button"
                onClick={onOpenMap}
                className="w-8 h-8 rounded-full apple-3d-tile text-stone-700 hover:text-rose-800 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95"
                title="مشاهده آدرس و مسیریابی"
              >
                <MapPin className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </SpatialTilt>
  );
};

