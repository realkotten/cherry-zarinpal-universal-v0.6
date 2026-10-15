import React, { useState } from 'react';
import { LiquiGlass } from '@liqui-design/glass';
import { useAtelier, useBranding } from '../../store/AtelierContext';
import { AtelierShell } from '../AtelierShell';
import { TodayView } from './TodayView';
import { ScheduleView } from './ScheduleView';
import { ClientsView } from './ClientsView';
import { AnalyticsView } from './AnalyticsView';
import { ServiceManagementView } from './ServiceManagementView';
import { ReportsView } from './reports/ReportsView';
import { StudioSettingsView } from './settings/StudioSettingsView';
import { ClientDossierModal } from './ClientDossierModal';
import { WalkInModal } from './WalkInModal';
import { SpatialTilt } from '../common/SpatialTilt';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Calendar, 
  Users, 
  TrendingUp, 
  Sparkles,
  Scissors,
  FileText,
  Sliders,
  BarChart3,
  LogOut,
} from 'lucide-react';
import { FontSelectorModal } from '../common/FontSelectorModal';
import { getSelectedFont, FontOption } from '../../utils/fontManager';
import { API_BASE } from '../../api/paymentApi';
import { mergeServerAppointments } from '../../utils/appointmentUtils';
import { AdminAuthModal } from './AdminAuthModal';

export const ManagementShell: React.FC = () => {
  const { 
    managementTab, 
    setManagementTab, 
    managementSubTab,
    setManagementSubTab,
    logoutManagement,
    setPortalMode,
    activeChair,
    activeBarber,
    customers,
    selectedClientForDossier,
    setSelectedClientForDossier,
    setAppointments,
  } = useAtelier();
  const branding = useBranding();

  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [isWalkInOpen, setIsWalkInOpen] = useState(false);
  const [, setCurrentFont] = useState<FontOption>(() => getSelectedFont());
  const [, setIsRefreshing] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch /payment/bookings.php with X-Admin-Token
  const fetchPaymentBookings = React.useCallback(async () => {
    const adminToken = 
      localStorage.getItem('admin_token') || 
      localStorage.getItem('royal_admin_token') || 
      '';

    if (!adminToken) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/bookings.php`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-Admin-Token': adminToken,
        },
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('royal_admin_token');
        localStorage.removeItem('royal_mgmt_authenticated');
        setIsAuthModalOpen(true);
        return;
      }

      const data = await res.json().catch(() => null);
      if (data && data.ok === true && Array.isArray(data.bookings) && data.bookings.length > 0) {
        setAppointments((prev: any[]) => {
          const merged = mergeServerAppointments(prev, data.bookings as any);
          if (merged.length > 0) {
            try {
              localStorage.setItem('atelier_appointments_v1', JSON.stringify(merged));
            } catch {}
          }
          return merged;
        });
      }
    } catch (e) {
      console.warn('[ManagementShell] Failed to fetch /payment/bookings.php:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [setAppointments]);

  // Fetch /payment/bookings.php with X-Admin-Token on load
  React.useEffect(() => {
    fetchPaymentBookings();
  }, [fetchPaymentBookings]);

  React.useEffect(() => {
    const handleFontChange = (e: any) => {
      if (e.detail?.font) {
        setCurrentFont(e.detail.font);
      }
    };
    window.addEventListener('atelier-font-changed', handleFontChange);
    return () => window.removeEventListener('atelier-font-changed', handleFontChange);
  }, []);

  const handleOpenDossier = (customerId?: string) => {
    if (customerId) {
      const client = customers.find((c) => c.id === customerId);
      if (client) {
        setSelectedClientForDossier(client);
        return;
      }
    }
    setManagementTab('analytics');
    setManagementSubTab('clients');
  };

  return (
    <AtelierShell
      id="management-shell-container"
      isWideLayout={true}
      bottomPadding="pb-0"
    >
      {/* Main Dashboard Canvas (Matching Client View UI & Glassmorphic Cards) */}
      <section
        id="management-main-card"
        className="relative z-20 w-full max-w-full px-4 pt-2 pb-28 flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth overscroll-contain space-y-3.5"
        dir="rtl"
      >
        {/* ─── 1. ADMIN PRESENCE & BRAND HEADER (Client View Glassmorphic Style) ─── */}
        <SpatialTilt
          as="div"
          id="management-presence-header"
          maxTilt={5}
          glareOpacity={0.25}
          scaleOnHover={1.01}
          className="rounded-[26px] text-stone-900 shadow-[0_22px_50px_-10px_rgba(15,23,42,0.22),0_10px_22px_-4px_rgba(15,23,42,0.12)]"
        >
          <div className="w-full rounded-[26px]">
            <div className="apple-glass-card liquid-glass-3d rounded-[26px] p-3.5 bg-gradient-to-br from-white/78 via-[#f1f5f9]/70 to-[#f6f2f4]/85 backdrop-blur-2xl backdrop-saturate-[190%] border border-slate-300/80 ring-1 ring-inset ring-white/95 shadow-[0_20px_48px_-10px_rgba(15,23,42,0.20),0_8px_20px_-4px_rgba(15,23,42,0.12),inset_0_1.5px_0_0_rgba(255,255,255,1),inset_0_-1px_0_0_rgba(114,28,36,0.18),inset_0_0_22px_rgba(255,255,255,0.7)]">
              <div className="flex items-center justify-between gap-2">
                {/* Brand & Barber Info */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => setPortalMode('client')}
                    title="مشاهده نمای مشتری بدون خروج از حساب"
                    aria-label="مشاهده نمای مشتری بدون خروج از حساب"
                    className="group/scissor w-10 h-10 rounded-2xl apple-3d-tile text-[#721c24] bg-[#f6f2f4] border border-[#d9c5cb] flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  >
                    <Scissors className="w-5 h-5 transition-transform duration-200 group-hover/scissor:rotate-45 group-hover/scissor:scale-110" />
                  </button>
                  <div className="min-w-0">
                    <h1 className="text-sm font-bold text-stone-900 tracking-tight truncate">
                      پنل مدیریت {branding.salonName || 'آرایشگاه'}
                    </h1>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span className="text-[10px] font-medium text-stone-600 truncate">
                        {activeBarber?.name || 'آرایشگر ارشد'} · {activeChair?.name || 'صندلی اختصاصی'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Walk-In & Logout */}
                <div className="shrink-0 flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={() => setIsWalkInOpen(true)}
                    className="rounded-2xl px-3.5 py-2 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>پذیرش فوری</span>
                  </Button>

                  <button
                    type="button"
                    onClick={logoutManagement}
                    className="w-8 h-8 rounded-full apple-3d-tile text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                    title="خروج کامل از حساب مدیریت"
                    aria-label="خروج کامل از حساب مدیریت"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </SpatialTilt>

        {managementTab === 'today' && <TodayView onOpenDossier={handleOpenDossier} />}
        {managementTab === 'schedule' && <ScheduleView onOpenDossier={handleOpenDossier} />}
        {managementTab === 'clients' && (
          <ClientsView
            onOpenDossier={(cId) => {
              const client = customers.find((c) => c.id === cId);
              if (client) setSelectedClientForDossier(client);
            }}
          />
        )}
        {managementTab === 'analytics' && (
          <div className="space-y-3.5 w-full max-w-full overflow-x-hidden">
            {/* Analytics & Configuration Hub Sub-Navigation Bar */}
            <div 
              id="management-subtabs-bar"
              className="sticky top-0 z-20 grid grid-cols-2 sm:grid-cols-4 p-1.5 apple-glass-card rounded-[22px] gap-1.5 w-full"
            >
              {[
                { id: 'overview', label: 'آمار و تقاضا', icon: BarChart3 },
                { id: 'clients', label: 'مشتریان', icon: Users },
                { id: 'reports', label: 'گزارش‌ها', icon: FileText },
                { id: 'services', label: 'خدمات', icon: Scissors },
              ].map((st) => {
                const Icon = st.icon;
                const isSelected = managementSubTab === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setManagementSubTab(st.id as any)}
                    className={`py-2 px-2 rounded-2xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#f6f2f4] text-[#721c24] border border-[#d9c5cb] shadow-xs font-black'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[#721c24]' : 'text-slate-500'}`} />
                    <span className="truncate">{st.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Render Subtab View */}
            {managementSubTab === 'overview' && <AnalyticsView onOpenDossier={handleOpenDossier} />}
            {managementSubTab === 'clients' && (
              <ClientsView
                onOpenDossier={(cId) => {
                  const client = customers.find((c) => c.id === cId);
                  if (client) setSelectedClientForDossier(client);
                }}
              />
            )}
            {managementSubTab === 'reports' && <ReportsView />}
            {managementSubTab === 'services' && <ServiceManagementView />}
            {managementSubTab === 'settings' && <StudioSettingsView />}
          </div>
        )}
        {managementTab === 'settings' && <StudioSettingsView />}
      </section>

      {/* Quick Walk-In Modal */}
      <WalkInModal
        isOpen={isWalkInOpen}
        onClose={() => setIsWalkInOpen(false)}
      />

      {/* Client Dossier Detail & History Modal */}
      <ClientDossierModal
        customer={selectedClientForDossier}
        isOpen={!!selectedClientForDossier}
        onClose={() => setSelectedClientForDossier(null)}
        onNavigateToSchedule={() => setManagementTab('schedule')}
      />

      {/* 3. Bottom Floating Navigation Dock (Identical LiquiGlass Style to Client BottomNavBar) */}
      <div
        id="management-bottom-dock-container"
        className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-3.5 px-3"
      >
        <div className="max-w-[390px] mx-auto w-full pointer-events-auto">
          <LiquiGlass
            radius={30}
            blur={1.2}
            refraction={65}
            bezel={14}
            elevated
            className="w-full"
            contentClassName="w-full"
          >
            <nav
              id="management-bottom-dock"
              aria-label="منوی ناوبری مدیریت آرایشگاه"
              className="w-full text-slate-700 rounded-[30px] px-2.5 py-1.5 flex items-center justify-between"
              dir="rtl"
            >
              {/* Today Tab */}
              <button
                id="mgmt-tab-today"
                type="button"
                onClick={() => setManagementTab('today')}
                className={`group relative flex-1 flex flex-col items-center justify-center min-h-[46px] transition-all duration-200 select-none cursor-pointer ${
                  managementTab === 'today' ? 'text-[#0f172a] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                    managementTab === 'today' ? 'bg-[#f6f2f4] border border-[#d9c5cb] scale-105 shadow-xs' : 'bg-transparent'
                  }`}
                >
                  <Clock
                    className={`w-[20px] h-[20px] transition-transform duration-200 ${
                      managementTab === 'today' ? 'text-[#721c24] stroke-[2.3]' : 'text-slate-500 stroke-[1.8] group-hover:scale-110'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] mt-0.5 tracking-tight whitespace-nowrap transition-all duration-200 ${
                    managementTab === 'today' ? 'font-bold text-[#721c24]' : 'font-medium text-slate-500'
                  }`}
                >
                  امروز
                </span>
              </button>

              {/* Schedule Tab */}
              <button
                id="mgmt-tab-schedule"
                type="button"
                onClick={() => setManagementTab('schedule')}
                className={`group relative flex-1 flex flex-col items-center justify-center min-h-[46px] transition-all duration-200 select-none cursor-pointer ${
                  managementTab === 'schedule' ? 'text-[#0f172a] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                    managementTab === 'schedule' ? 'bg-[#f6f2f4] border border-[#d9c5cb] scale-105 shadow-xs' : 'bg-transparent'
                  }`}
                >
                  <Calendar
                    className={`w-[20px] h-[20px] transition-transform duration-200 ${
                      managementTab === 'schedule' ? 'text-[#721c24] stroke-[2.3]' : 'text-slate-500 stroke-[1.8] group-hover:scale-110'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] mt-0.5 tracking-tight whitespace-nowrap transition-all duration-200 ${
                    managementTab === 'schedule' ? 'font-bold text-[#721c24]' : 'font-medium text-slate-500'
                  }`}
                >
                  برنامه
                </span>
              </button>

              {/* Analytics & Stats Tab */}
              <button
                id="mgmt-tab-analytics"
                type="button"
                onClick={() => setManagementTab('analytics')}
                className={`group relative flex-1 flex flex-col items-center justify-center min-h-[46px] transition-all duration-200 select-none cursor-pointer ${
                  managementTab === 'analytics' ? 'text-[#0f172a] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                    managementTab === 'analytics' ? 'bg-[#f6f2f4] border border-[#d9c5cb] scale-105 shadow-xs' : 'bg-transparent'
                  }`}
                >
                  <TrendingUp
                    className={`w-[20px] h-[20px] transition-transform duration-200 ${
                      managementTab === 'analytics' ? 'text-[#721c24] stroke-[2.3]' : 'text-slate-500 stroke-[1.8] group-hover:scale-110'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] mt-0.5 tracking-tight whitespace-nowrap transition-all duration-200 ${
                    managementTab === 'analytics' ? 'font-bold text-[#721c24]' : 'font-medium text-slate-500'
                  }`}
                >
                  آمار
                </span>
              </button>

              {/* Settings Tab */}
              <button
                id="mgmt-tab-settings"
                type="button"
                onClick={() => setManagementTab('settings')}
                className={`group relative flex-1 flex flex-col items-center justify-center min-h-[46px] transition-all duration-200 select-none cursor-pointer ${
                  managementTab === 'settings' ? 'text-[#0f172a] font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center px-4 py-1 rounded-full transition-all duration-200 ${
                    managementTab === 'settings' ? 'bg-[#f6f2f4] border border-[#d9c5cb] scale-105 shadow-xs' : 'bg-transparent'
                  }`}
                >
                  <Sliders
                    className={`w-[20px] h-[20px] transition-transform duration-200 ${
                      managementTab === 'settings' ? 'text-[#721c24] stroke-[2.3]' : 'text-slate-500 stroke-[1.8] group-hover:scale-110'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] mt-0.5 tracking-tight whitespace-nowrap transition-all duration-200 ${
                    managementTab === 'settings' ? 'font-bold text-[#721c24]' : 'font-medium text-slate-500'
                  }`}
                >
                  تنظیمات
                </span>
              </button>
            </nav>
          </LiquiGlass>
        </div>
      </div>

      {/* Admin Auth Modal */}
      <AdminAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          fetchPaymentBookings();
        }}
      />

      {/* Font & Typography Selector Modal */}
      <FontSelectorModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
      />
    </AtelierShell>
  );
};
