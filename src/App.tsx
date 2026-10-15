import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScreenMode, BookingStep, NavigationTab, Service, Accoutrement, Reservation, Appointment } from './types';
import { SERVICES_DATA, ACCOUTREMENTS_DATA } from './data/mockData';
import { AtelierProvider, useAtelier, useBranding } from './store/AtelierContext';
import { getCurrentSolarDateInfo, toPersianDigits } from './utils/dateUtils';
import { fetchServerStore } from './api/atelierApi';
import { API_BASE, postJson, getJson } from './api/paymentApi';
import { getDeviceUuid } from './utils/deviceIdentity';
import { addStoredUserBookingId, removeStoredUserBookingId } from './utils/browserStorage';
import { CheckCircle2, XCircle, AlertCircle, RotateCcw, CreditCard, CalendarCheck } from 'lucide-react';
import { hapticStepAdvance, hapticLight, hapticSelection } from './utils/hapticUtils';
import { calculateBookingTotals, checkSlotAvailability, getInitialBookingSlot, isSlotExpired, hasActiveUpcomingBooking } from './utils/bookingUtils';

// All customer screens & booking steps eagerly loaded at once for zero step/tab loading time
import { WelcomeScreen } from './components/WelcomeScreen';
import { AtelierHomeView } from './components/AtelierHomeView';
import { BookServicesView } from './components/BookServicesView';
import { BookPreferenceView } from './components/BookPreferenceView';
import { BookDateTimeView } from './components/BookDateTimeView';
import { BookCheckoutView } from './components/BookCheckoutView';
import { BookConfirmedView } from './components/BookConfirmedView';
import { MyBookingsView } from './components/MyBookingsView';
import { ClientProfileView } from './components/ClientProfileView';
import { OnboardingStep1 } from './components/OnboardingStep1';
import { OnboardingStep2 } from './components/OnboardingStep2';
import { OnboardingStep3 } from './components/OnboardingStep3';
import { AdminAuthModal } from './components/management/AdminAuthModal';
import { AuthModal } from './components/auth/AuthModal';
import { BottomNavBar } from './components/BottomNavBar';
import { AsyncErrorBoundary } from './components/common/AsyncErrorBoundary';

// Resilient code-splitting loader for admin management portal only
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  retries = 3,
  interval = 400
): React.LazyExoticComponent<T> {
  return lazy(() =>
    new Promise<{ default: T }>((resolve, reject) => {
      const attempt = (left: number) => {
        factory()
          .then(resolve)
          .catch((error) => {
            if (left <= 0) {
              reject(error);
              return;
            }
            setTimeout(() => attempt(left - 1), interval);
          });
      };
      attempt(retries);
    })
  );
}

const ManagementShell = lazyWithRetry(() => import('./components/management/ManagementShell').then(m => ({ default: m.ManagementShell })));

const ViewLoadingFallback = () => (
  <div className="flex-1 w-full min-h-[300px] flex items-center justify-center p-8">
    <div className="w-7 h-7 border-2 border-[#721c24] border-t-transparent rounded-full animate-spin" />
  </div>
);

const STEP_ORDER: Record<BookingStep, number> = {
  services: 0,
  addons: 0,
  preference: 1,
  datetime: 2,
  checkout: 3,
  confirmed: 4,
};

const bookingStepVariants = {
  initial: (direction: number) => ({
    x: direction > 0 ? 14 : -14,
    opacity: 0,
  }),
  animate: {
    x: 0,
    opacity: 1,
    transition: {
      duration: 0.14,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -12 : 12,
    opacity: 0,
    transition: {
      duration: 0.08,
    },
  }),
};

const tabVariants = {
  initial: { opacity: 0.88, y: 3 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.12, ease: [0.16, 1, 0.3, 1] as const },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.04 },
  },
};

function AtelierAppContent() {
  const {
    currentReservation,
    setCurrentReservation,
    portalMode,
    isAuthModalOpen,
    closeManagementAuth,
    isClientAuthModalOpen,
    closeClientAuthModal,
    clientAuthMode,
    services,
    activeServices,
    accoutrements: contextAccoutrements,
    appointments,
    setAppointments,
    refreshDatabaseData,
    studio,
    addNotification,
    currentCustomer,
  } = useAtelier();

  const branding = useBranding();

  // Primary navigation state
  const [screenMode, setScreenMode] = useState<ScreenMode>('app');
  const [activeTab, setActiveTab] = useState<NavigationTab>('atelier');
  const [bookingStep, setBookingStep] = useState<BookingStep>('services');
  const [bookingDirection, setBookingDirection] = useState<number>(1);
  const [skippedDateTimeConfirmation, setSkippedDateTimeConfirmation] = useState<boolean>(false);

  const [syncTick, setSyncTick] = useState<number>(0);

  // Active upcoming booking check on flow entry (evaluates after clean reconciliation)
  const blockingBooking = useMemo(() => {
    if (activeTab !== 'book' || bookingStep === 'confirmed') return null;
    return hasActiveUpcomingBooking();
  }, [activeTab, bookingStep, appointments, syncTick]);

  // Payment result banner / modal state
  const [paymentBanner, setPaymentBanner] = useState<{
    type: 'success' | 'cancelled' | 'failed';
    aptId: string;
    refId?: string;
    appointment?: Appointment;
  } | null>(null);

  const [isRetryingPayment, setIsRetryingPayment] = useState(false);
  const isRetryingPaymentRef = useRef(false);
  const [retryPaymentError, setRetryPaymentError] = useState<string | null>(null);
  const hasNotifiedPaymentRef = useRef<string | null>(null);

  const handleRetryPayment = async (aptId: string, aptData?: Appointment) => {
    if (isRetryingPaymentRef.current) return;
    isRetryingPaymentRef.current = true;
    setIsRetryingPayment(true);
    setRetryPaymentError(null);
    try {
      let target = aptData;
      if (!target) {
        try {
          const raw = localStorage.getItem('atelier_appointments_v1');
          if (raw) {
            const list: Appointment[] = JSON.parse(raw);
            target = list.find((a) => a.id === aptId);
          }
        } catch {}
      }
      if (!target) {
        target = appointments.find((a) => a.id === aptId);
      }

      if (target) {
        const pendingTarget: Appointment = { ...target, status: 'pending', paymentStatus: 'pending' };
        const res = await postJson<{ ok: boolean; appointment?: Appointment; redirectUrl?: string; error?: string }>(
          `${API_BASE}/create.php`,
          pendingTarget
        );
        if (res && res.ok && res.redirectUrl) {
          try {
            const raw = localStorage.getItem('atelier_appointments_v1');
            const list: Appointment[] = raw ? JSON.parse(raw) : [];
            const finalApt: Appointment = {
              ...(res.appointment || pendingTarget),
              status: 'pending',
              paymentStatus: 'pending',
            };
            const filtered = list.filter((a) => a.id !== finalApt.id);
            filtered.unshift(finalApt);
            localStorage.setItem('atelier_appointments_v1', JSON.stringify(filtered));
          } catch (e) {
            console.warn('[LocalStorage] Error saving retry appointment:', e);
          }
          window.location.href = res.redirectUrl;
          return;
        }
        if (res && res.error) {
          setRetryPaymentError(res.error);
          isRetryingPaymentRef.current = false;
          setIsRetryingPayment(false);
          return;
        }
      }

      const reqRes = await postJson<{ ok: boolean; redirectUrl?: string; error?: string }>(
        '/api/atelier/payment/request',
        { appointmentId: aptId }
      );
      if (reqRes && reqRes.ok && reqRes.redirectUrl) {
        window.location.href = reqRes.redirectUrl;
        return;
      }
      setRetryPaymentError(reqRes?.error || 'خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش فرمایید.');
    } catch (err: any) {
      setRetryPaymentError(err?.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      isRetryingPaymentRef.current = false;
      setIsRetryingPayment(false);
    }
  };

  // Sync dynamic canonical URL and og:url
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.origin + window.location.pathname;
    const canonicalEl = document.querySelector('link[rel="canonical"]');
    if (canonicalEl) canonicalEl.setAttribute('href', currentUrl);
    const ogUrlEl = document.querySelector('meta[property="og:url"]');
    if (ogUrlEl) ogUrlEl.setAttribute('content', currentUrl);

    const absoluteWallpaper = window.location.origin + '/wallpaper.jpg';
    const ogImgEl = document.querySelector('meta[property="og:image"]');
    if (ogImgEl) ogImgEl.setAttribute('content', absoluteWallpaper);
    const ogSecureImgEl = document.querySelector('meta[property="og:image:secure_url"]');
    if (ogSecureImgEl) ogSecureImgEl.setAttribute('content', absoluteWallpaper);
    const twImgEl = document.querySelector('meta[name="twitter:image"]');
    if (twImgEl) twImgEl.setAttribute('content', absoluteWallpaper);
  }, []);

  // Root component useEffect: update document.title based on branding and re-run when branding loads
  useEffect(() => {
    document.title = branding.salonName + (branding.tagline ? ` | ${branding.tagline}` : "");
  }, [branding]);

  // On mount: Auto-login via device UUID before payment-return handler and before booking flow checks
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const initMount = async () => {
      // 1. AUTO-LOGIN ON APP LOAD via device UUID & Server Reconciliation
      try {
        const uuid = await getDeviceUuid();
        const res = await getJson<{ ok: boolean; bookings?: any[] }>(
          `${API_BASE}/my-bookings.php?device=${encodeURIComponent(uuid)}`
        );

        if (res && res.ok === true) {
          const serverBookings: Appointment[] = Array.isArray(res.bookings) ? res.bookings : [];
          // 2. Build a Set of server booking IDs from the response (if ok===true)
          const serverBookingIds = new Set<string>(
            serverBookings.map((b) => b.id).filter(Boolean)
          );

          // 3. Read localStorage "atelier_appointments_v1"
          let storedList: Appointment[] = [];
          try {
            const raw = localStorage.getItem('atelier_appointments_v1');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) storedList = parsed;
            }
          } catch (e) {
            console.warn('[LocalStorage] Error reading appointments for reconciliation:', e);
          }

          // Merge server bookings into storedList
          let mergedList = [...storedList];
          for (const serverBooking of serverBookings) {
            const idx = mergedList.findIndex((a) => a.id === serverBooking.id);
            if (idx >= 0) {
              mergedList[idx] = serverBooking;
            } else {
              mergedList.unshift(serverBooking);
            }
            if (serverBooking.id) {
              addStoredUserBookingId(serverBooking.id);
            }
            if (serverBooking.appointmentNumber) {
              addStoredUserBookingId(serverBooking.appointmentNumber);
            }
          }

          // 3 & 4. Reconcile: For every appointment in it that:
          //   - has bookingSource "online" (or id starts with "apt-online"), AND
          //   - has serverCreatedAt (meaning it was confirmed received by the server at some point), AND
          //   - its id is NOT in the server set, AND
          //   - paymentStatus !== "paid"
          //   → REMOVE it from the array (it was cancelled/lost server-side; it's a stale orphan).
          // Paid appointments and records without serverCreatedAt are NEVER removed locally.
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
              return false; // Stale orphan removed
            }

            return true;
          });

          // 5. Write the filtered array back synchronously. Run this BEFORE the one-booking shield check so shields evaluate clean data.
          try {
            localStorage.setItem('atelier_appointments_v1', JSON.stringify(reconciledList));
          } catch (e) {
            console.warn('[LocalStorage] Error syncing reconciled device bookings:', e);
          }

          if (isMounted) {
            setAppointments(reconciledList);
            setSyncTick((t) => t + 1);
          }
        }
      } catch (err) {
        // 6. try/catch everything; server unreachable → skip reconciliation silently (console.warn).
        console.warn('Device auto-login notice (server unreachable, reconciliation skipped):', err);
      }

      if (!isMounted) return;

      // 2. Handle ZarinPal payment query parameters
      const urlParams = new URLSearchParams(window.location.search);
      const payment = urlParams.get('payment');
      const apt = urlParams.get('apt');
      const refId = urlParams.get('refId');

      if (payment) {
        // 1. Immediately clean URL so refresh doesn't re-trigger
        window.history.replaceState({}, '', window.location.pathname || '/');

        // 2. Ensure data re-syncs
        refreshDatabaseData().catch(() => {});

        if (payment === 'success') {
          let storedAppointments: Appointment[] = [];
          try {
            const raw = localStorage.getItem('atelier_appointments_v1');
            if (raw) storedAppointments = JSON.parse(raw);
          } catch {}

          const foundInStorage = storedAppointments.find((a) => a.id === apt);
          const found = foundInStorage || appointments.find((a) => a.id === apt);

          if (found) {
            const updatedApt: Appointment = {
              ...found,
              status: 'confirmed',
              paymentStatus: 'paid',
              paymentRefId: refId || found.paymentRefId,
              paidAt: found.paidAt || new Date().toISOString(),
            };

            // Synchronously write back to localStorage
            try {
              const list = storedAppointments.length > 0 ? storedAppointments : (appointments.length > 0 ? appointments : [updatedApt]);
              const exists = list.some((a) => a.id === apt);
              const updatedList = exists
                ? list.map((a) => (a.id === apt ? updatedApt : a))
                : [updatedApt, ...list];
              localStorage.setItem('atelier_appointments_v1', JSON.stringify(updatedList));
            } catch (e) {
              console.warn('[LocalStorage] Error saving confirmed appointment:', e);
            }

            // Update React state (replace by id, unshift if missing)
            setAppointments((prev: Appointment[]) => {
              const exists = prev.some((a) => a.id === apt);
              return exists
                ? prev.map((a) => (a.id === apt ? updatedApt : a))
                : [updatedApt, ...prev];
            });

            // Render existing BookConfirmedView + «کد رهگیری پرداخت: {refId}»
            const res: Reservation = {
              ...updatedApt,
              reservationNumber: updatedApt.appointmentNumber || updatedApt.id,
              artisan: updatedApt.barberName || branding.barberName,
              suite: updatedApt.chairName,
              location: branding.address ? `${branding.salonName} · ${branding.address}` : branding.salonName,
              selectedDate: updatedApt.date,
              selectedTime: updatedApt.startTime,
              paymentRefId: refId || updatedApt.paymentRefId,
              paymentStatus: 'paid',
              status: 'confirmed',
            };
            setCurrentReservation(res);
            setActiveTab('book');
            setBookingStep('confirmed');
            setPaymentBanner(null);

            // Success notification exactly once
            const notifKey = refId ? `ref-${refId}` : `apt-${apt || updatedApt.id}`;
            if (hasNotifiedPaymentRef.current !== notifKey) {
              hasNotifiedPaymentRef.current = notifKey;
              addNotification({
                type: 'payment_confirmed',
                title: 'پیش‌پرداخت نوبت با موفقیت تأیید شد',
                message: refId ? `کد رهگیری پرداخت: ${refId}` : 'نوبت شما با موفقیت در سامانه ثبت گردید.',
                timestamp: 'هم‌اکنون',
                isRead: false,
                priority: 'high',
                entityType: 'appointment',
                entityId: updatedApt.id,
              });
            }
          } else {
            // Fallback card if not found
            const notifKey = refId ? `ref-${refId}` : `apt-${apt || 'success'}`;
            if (hasNotifiedPaymentRef.current !== notifKey) {
              hasNotifiedPaymentRef.current = notifKey;
              addNotification({
                type: 'payment_confirmed',
                title: 'پیش‌پرداخت با موفقیت تأیید شد',
                message: refId ? `کد رهگیری پرداخت: ${refId}` : 'پرداخت شما در سامانه ثبت گردید.',
                timestamp: 'هم‌اکنون',
                isRead: false,
                priority: 'high',
                entityType: 'appointment',
                entityId: apt || '',
              });
            }
            setPaymentBanner({ type: 'success', aptId: apt || '', refId: refId || undefined });
          }
        } else if (payment === 'cancelled') {
          // Persist status cancelled
          try {
            const raw = localStorage.getItem('atelier_appointments_v1');
            const list: Appointment[] = raw ? JSON.parse(raw) : [];
            const updatedList = list.map((a) =>
              a.id === apt ? { ...a, status: 'cancelled' as const, paymentStatus: 'cancelled' as const } : a
            );
            localStorage.setItem('atelier_appointments_v1', JSON.stringify(updatedList));
            setAppointments((prev: Appointment[]) =>
              prev.map((a) =>
                a.id === apt ? { ...a, status: 'cancelled' as const, paymentStatus: 'cancelled' as const } : a
              )
            );
          } catch {}
          setPaymentBanner({ type: 'cancelled', aptId: apt || '' });
        } else if (payment === 'failed') {
          // Persist paymentStatus "failed"
          let failedApt: Appointment | undefined;
          try {
            const raw = localStorage.getItem('atelier_appointments_v1');
            if (raw) {
              const list: Appointment[] = JSON.parse(raw);
              failedApt = list.find((a) => a.id === apt);
            }
            const updatedList = (raw ? JSON.parse(raw) : []).map((a: Appointment) =>
              a.id === apt ? { ...a, paymentStatus: 'failed' as const } : a
            );
            localStorage.setItem('atelier_appointments_v1', JSON.stringify(updatedList));
            setAppointments((prev: Appointment[]) =>
              prev.map((a) =>
                a.id === apt ? { ...a, paymentStatus: 'failed' as const } : a
              )
            );
          } catch {}
          setPaymentBanner({
            type: 'failed',
            aptId: apt || '',
            refId: refId || undefined,
            appointment: failedApt,
          });
        }
      }
    };

    initMount();

    return () => {
      isMounted = false;
    };
  }, []);

  // Customer side slots: on load, GET ${API_BASE}/slots.php -> merge taken into conflict checks
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const phone = currentCustomer?.phone ? `?phone=${encodeURIComponent(currentCustomer.phone)}` : '';
        const res = await fetch(`${API_BASE}/slots.php${phone}`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (!isMounted || !data || !data.ok) return;
        if (Array.isArray(data.taken) && data.taken.length > 0) {
          setAppointments((prev: Appointment[]) => {
            const map = new Map<string, Appointment>();
            for (const a of prev) {
              if (a && a.id) map.set(a.id, a);
            }
            for (const t of data.taken) {
              if (t && t.id) {
                if (!map.has(t.id)) {
                  map.set(t.id, t);
                } else {
                  const existing = map.get(t.id)!;
                  map.set(t.id, { ...existing, ...t });
                }
              }
            }
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn('[App] Error fetching slots.php on load:', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [currentCustomer?.phone]);

  // Booking Form State initialized with dynamic Solar date and non-expired time slot
  const initialSlot = useMemo(() => getInitialBookingSlot(appointments), []);
  const [selectedService, setSelectedService] = useState<Service | null>(() => activeServices[0] || services[0] || null);
  const [selectedDay, setSelectedDay] = useState<number>(() => initialSlot.dayNumber);
  const [selectedTime, setSelectedTime] = useState<string>(() => initialSlot.time);
  const [preferredTime, setPreferredTime] = useState<string>(() => initialSlot.time);
  const [accoutrements, setAccoutrements] = useState<Accoutrement[]>(() =>
    (contextAccoutrements || ACCOUTREMENTS_DATA).map((acc) => ({ ...acc, selected: false }))
  );

  // Sync accoutrements whenever admin modifies them
  useEffect(() => {
    if (contextAccoutrements) {
      setAccoutrements((prev) => {
        const selectedMap = new Map(prev.map((a) => [a.id, Boolean(a.selected)]));
        return contextAccoutrements.map((acc) => ({
          ...acc,
          selected: selectedMap.get(acc.id) || false,
        }));
      });
    }
  }, [contextAccoutrements]);

  // Guard against stale or deleted service selection
  useEffect(() => {
    if (selectedService && !services.some((s) => s.id === selectedService.id && s.isActive)) {
      setSelectedService(activeServices[0] || null);
    } else if (!selectedService && activeServices.length > 0) {
      setSelectedService(activeServices[0]);
    }
  }, [services, activeServices, selectedService]);

  const navigateBookingStep = useCallback((nextStep: BookingStep) => {
    const currentIdx = STEP_ORDER[bookingStep] ?? 0;
    const nextIdx = STEP_ORDER[nextStep] ?? 0;
    if (nextIdx > currentIdx) {
      hapticStepAdvance();
    } else {
      hapticLight();
    }
    setBookingDirection(nextIdx >= currentIdx ? 1 : -1);
    setBookingStep(nextStep);

    // Sync with browser history
    if (window.history?.pushState) {
      window.history.pushState({ tab: 'book', step: nextStep, screen: 'app' }, '');
    }
  }, [bookingStep]);

  // Handle browser back button (PopState)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state) {
        if (state.screen) setScreenMode(state.screen);
        if (state.tab) setActiveTab(state.tab);
        if (state.step) setBookingStep(state.step);
      } else {
        setActiveTab('atelier');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Active effective service fallback
  const currentEffectiveService = selectedService || activeServices[0] || services[0];

  // If in Management Portal Mode, render the Management Shell
  if (portalMode === 'management') {
    return (
      <main className="h-[100dvh] max-h-[100dvh] w-full bg-gradient-to-b from-white via-[#fafaf9] to-[#f4f0f2] flex flex-col items-center justify-start sm:justify-center p-0 sm:p-5 overflow-hidden relative selection:bg-[#d9c5cb] selection:text-[#460910]">
        <Suspense fallback={<ViewLoadingFallback />}>
          <ManagementShell />
        </Suspense>
      </main>
    );
  }

  // Handlers for Accoutrements
  const handleToggleAccoutrement = (acc: Accoutrement) => {
    hapticSelection();
    setAccoutrements((prev) =>
      prev.map((item) =>
        item.id === acc.id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // Switch tabs cleanly
  const handleTabChange = (tab: NavigationTab) => {
    hapticLight();
    setActiveTab(tab);
    if (tab === 'book' && bookingStep === 'confirmed') {
      navigateBookingStep('services');
    }
    if (window.history?.pushState) {
      window.history.pushState({ tab, step: bookingStep, screen: 'app' }, '');
    }
  };

  // Rebook an appointment with prefilled service and reset stale selections
  const handleRebook = (service?: Service) => {
    // Reset any stale accoutrements or time with safe non-expired slot
    const freshSlot = getInitialBookingSlot(appointments);
    setAccoutrements((contextAccoutrements || ACCOUTREMENTS_DATA).map((acc) => ({ ...acc, selected: false })));
    setSelectedDay(freshSlot.dayNumber);
    setSelectedTime(freshSlot.time);

    if (service) {
      setSelectedService(service);
      navigateBookingStep('datetime');
    } else {
      navigateBookingStep('services');
    }
    setActiveTab('book');
  };

  // Direct Navigator for user convenience
  const handleDirectNavigation = (mode: ScreenMode, step?: BookingStep) => {
    setScreenMode(mode);
    if (mode === 'app') {
      if (step) {
        setActiveTab('book');
        navigateBookingStep(step);
      } else {
        setActiveTab('atelier');
      }
    }
  };

  return (
    <main className="w-full h-[100dvh] min-h-[100dvh] bg-gradient-to-b from-white via-[#fafaf9] to-[#f4f0f2] flex flex-col items-center justify-start p-0 m-0 overflow-hidden relative selection:bg-[#d9c5cb] selection:text-[#460910]">
      {/* Brand Ambient Blooms (Apple iPhone 18 Dark Cherry & Titanium Slate undertones - clipped & isolated for Safari) */}
      <div 
        className="absolute inset-0 overflow-hidden pointer-events-none -z-10"
        style={{ contain: 'paint', clipPath: 'inset(0)' }}
      >
        <div className="absolute -top-20 -right-20 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-[#721c24]/[0.035] via-slate-100/60 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-24 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-slate-200/40 via-white to-transparent blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 right-1/4 w-[420px] h-[350px] rounded-full bg-gradient-to-t from-[#721c24]/[0.025] via-stone-100/70 to-transparent blur-3xl pointer-events-none" />
      </div>

      {/* 1. Welcome Screen */}
      {screenMode === 'welcome' && (
        <WelcomeScreen
          onEnter={() => {
            setScreenMode('app');
            setActiveTab('book');
            navigateBookingStep('services');
          }}
          onStartOnboarding={() => setScreenMode('onboarding-1')}
        />
      )}

      {/* 2. Onboarding Steps */}
      {screenMode === 'onboarding-1' && (
        <OnboardingStep1
          onNext={() => setScreenMode('onboarding-2')}
          onSkip={() => {
            setScreenMode('app');
            setActiveTab('atelier');
          }}
          onSignIn={() => {
            setScreenMode('app');
            setActiveTab('client');
          }}
        />
      )}

      {screenMode === 'onboarding-2' && (
        <OnboardingStep2
          onNext={() => setScreenMode('onboarding-3')}
          onBack={() => setScreenMode('onboarding-1')}
          onSkip={() => {
            setScreenMode('app');
            setActiveTab('atelier');
          }}
          onSignIn={() => {
            setScreenMode('app');
            setActiveTab('client');
          }}
        />
      )}

      {screenMode === 'onboarding-3' && (
        <OnboardingStep3
          onEnter={() => {
            setScreenMode('app');
            setActiveTab('atelier');
          }}
          onBack={() => setScreenMode('onboarding-2')}
          onSkip={() => {
            setScreenMode('app');
            setActiveTab('atelier');
          }}
          onSignIn={() => {
            setScreenMode('app');
            setActiveTab('client');
          }}
        />
      )}

      {/* 3. Main Application Mode — All tabs and booking steps pre-mounted for instant 0ms switching */}
      {screenMode === 'app' && (
        <div className="relative w-full h-full flex-1 flex flex-col items-center justify-start overflow-hidden">
          {/* Tab 1: Atelier Home */}
          <div className={activeTab === 'atelier' ? 'w-full h-full flex justify-center' : 'hidden'}>
            <AtelierHomeView
              currentReservation={currentReservation}
              onBookClick={() => {
                setActiveTab('book');
                navigateBookingStep('services');
              }}
              onViewReservation={() => {
                setActiveTab('my_bookings');
              }}
            />
          </div>

          {/* Tab 2: Unified Single-Container Multi-Step Booking Flow (all steps pre-loaded at once, non-scrollable between steps) */}
          <div className={activeTab === 'book' ? 'w-full h-full flex justify-center overflow-hidden' : 'hidden'}>
            <AsyncErrorBoundary onReset={() => navigateBookingStep('services')}>
              {blockingBooking ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-6 text-center select-none" dir="rtl">
                  <div className="w-full max-w-md mx-auto clay-card rounded-[32px] p-6 sm:p-8 flex flex-col items-center text-center shadow-xl border border-stone-200/80 bg-white/95 backdrop-blur-xl animate-fade-in">
                    <div className="w-16 h-16 rounded-2xl bg-[#721c24]/10 border border-[#721c24]/20 flex items-center justify-center text-[#721c24] mb-4 shadow-inner">
                      <CalendarCheck className="w-8 h-8 text-[#721c24]" />
                    </div>

                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#721c24]/10 text-[#721c24] mb-3">
                      نوبت فعال در سامانه
                    </span>

                    <h2 className="text-xl font-black text-stone-900 mb-2.5 tracking-tight font-serif">
                      شما یک نوبت فعال دارید
                    </h2>

                    <p className="text-sm font-medium text-stone-600 leading-relaxed mb-6 px-1">
                      تا گذشتن تاریخ و ساعت نوبت فعلی («{blockingBooking.date} ساعت {toPersianDigits(blockingBooking.startTime)}») امکان رزرو نوبت جدید وجود ندارد.
                    </p>

                    <div className="w-full p-3.5 mb-6 rounded-2xl bg-stone-50/90 border border-stone-200/70 text-right space-y-2 text-xs text-stone-700">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">شماره پیگیری:</span>
                        <span className="font-mono font-bold text-stone-900">{toPersianDigits(blockingBooking.appointmentNumber || blockingBooking.id)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">سرویس رزرو شده:</span>
                        <span className="font-bold text-stone-900">{blockingBooking.service?.name || 'خدمات آرایشگاه'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">آرایشگر و جایگاه:</span>
                        <span className="text-stone-800">{blockingBooking.barberName} · {blockingBooking.chairName}</span>
                      </div>
                    </div>

                    <div className="w-full flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setActiveTab('my_bookings');
                        }}
                        className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#721c24] via-[#5c161d] to-[#460910] text-white font-bold text-sm shadow-md hover:shadow-lg active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span>مشاهده نوبت‌های من</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setActiveTab('atelier');
                          navigateBookingStep('services');
                        }}
                        className="w-full py-3 px-5 rounded-2xl bg-stone-100/90 hover:bg-stone-200/90 text-stone-800 font-bold text-xs active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <span>بازگشت به صفحه اصلی</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-full h-full overflow-hidden">
                  {/* Step 1: Services & Accoutrements */}
                <div className={bookingStep === 'services' || bookingStep === 'addons' ? 'w-full h-full flex justify-center' : 'hidden'}>
                  <BookServicesView
                    selectedService={selectedService}
                    onSelectService={(service) => setSelectedService(service)}
                    accoutrements={accoutrements}
                    onToggleAccoutrement={(id) => {
                      setAccoutrements((prev) =>
                        prev.map((item) =>
                          item.id === id ? { ...item, selected: !item.selected } : item
                        )
                      );
                    }}
                    onContinue={() => navigateBookingStep('preference')}
                    onOpenProfile={() => setActiveTab('client')}
                  />
                </div>

                {/* Step 2A: Preferred Day & Time */}
                {currentEffectiveService && (
                  <div className={bookingStep === 'preference' ? 'w-full h-full flex justify-center' : 'hidden'}>
                    <BookPreferenceView
                      service={currentEffectiveService}
                      accoutrements={accoutrements}
                      preferredDay={selectedDay}
                      preferredTime={selectedTime}
                      onSetPreferredDay={(day) => setSelectedDay(day)}
                      onSetPreferredTime={(time) => setSelectedTime(time)}
                      onBack={() => navigateBookingStep('services')}
                      onContinue={(confirmedDay, confirmedTime) => {
                        if (!currentEffectiveService) return;
                        const effDay = confirmedDay !== undefined ? confirmedDay : selectedDay;
                        const effTime = confirmedTime || selectedTime;
                        setSelectedDay(effDay);
                        setPreferredTime(effTime);
                        setSelectedTime(effTime);

                        const totals = calculateBookingTotals(currentEffectiveService, accoutrements);
                        const availability = checkSlotAvailability(
                          effDay,
                          effTime,
                          totals.totalDuration,
                          appointments
                        );

                        const isExpired = isSlotExpired(effDay, effTime);

                        if (availability.isAvailable && !availability.isExpired && !isExpired) {
                          // Slot is available and open: skip confirmation and proceed directly to checkout!
                          setSkippedDateTimeConfirmation(true);
                          navigateBookingStep('checkout');
                        } else {
                          // Slot is expired, occupied or conflicting: show datetime confirmation & gap resolution page
                          setSkippedDateTimeConfirmation(false);
                          navigateBookingStep('datetime');
                        }
                      }}
                      onOpenProfile={() => setActiveTab('client')}
                    />
                  </div>
                )}

                {/* Step 2B: DateTime Slot & Gap Resolution */}
                {currentEffectiveService && (
                  <div className={bookingStep === 'datetime' ? 'w-full h-full flex justify-center' : 'hidden'}>
                    <BookDateTimeView
                      isActive={bookingStep === 'datetime'}
                      service={currentEffectiveService}
                      selectedDay={selectedDay}
                      selectedTime={selectedTime}
                      preferredTime={preferredTime}
                      accoutrements={accoutrements}
                      onSelectDay={(day) => setSelectedDay(day)}
                      onSelectTime={(time) => setSelectedTime(time)}
                      onBackToPreference={() => navigateBookingStep('preference')}
                      onContinueToCheckout={() => {
                        setSkippedDateTimeConfirmation(false);
                        navigateBookingStep('checkout');
                      }}
                      onOpenProfile={() => setActiveTab('client')}
                      onViewMyBookings={() => setActiveTab('my_bookings')}
                    />
                  </div>
                )}

                {/* Step 3: Checkout */}
                {currentEffectiveService && (
                  <div className={bookingStep === 'checkout' ? 'w-full h-full flex justify-center' : 'hidden'}>
                    <BookCheckoutView
                      service={currentEffectiveService}
                      selectedDay={selectedDay}
                      selectedTime={selectedTime}
                      accoutrements={accoutrements}
                      onBack={() => {
                        if (skippedDateTimeConfirmation) {
                          navigateBookingStep('preference');
                        } else {
                          navigateBookingStep('datetime');
                        }
                      }}
                      onConfirmBooking={(confirmedRes) => {
                        setCurrentReservation(confirmedRes);
                        navigateBookingStep('confirmed');
                      }}
                      onOpenProfile={() => setActiveTab('client')}
                    />
                  </div>
                )}

                {/* Step 4: Confirmed Digital Boarding Pass */}
                <div className={bookingStep === 'confirmed' ? 'w-full h-full flex justify-center' : 'hidden'}>
                  <BookConfirmedView
                    reservation={currentReservation}
                    onReturnHome={() => {
                      setActiveTab('atelier');
                      navigateBookingStep('services');
                    }}
                    onOpenProfile={() => setActiveTab('client')}
                  />
                </div>
              </div>
            )}
            </AsyncErrorBoundary>
          </div>

          {/* Tab 3: My Bookings / Visits */}
          <div className={activeTab === 'my_bookings' || activeTab === 'visits' ? 'w-full h-full flex justify-center' : 'hidden'}>
            <MyBookingsView
              currentReservation={currentReservation}
              onViewPass={() => {
                setActiveTab('book');
                navigateBookingStep('confirmed');
              }}
              onRebook={handleRebook}
              onOpenProfile={() => setActiveTab('client')}
            />
          </div>

          {/* Tab 4: Client Quarters / Profile */}
          <div className={activeTab === 'client' ? 'w-full h-full flex justify-center' : 'hidden'}>
            <ClientProfileView
              onNavigateScreen={handleDirectNavigation}
            />
          </div>

          {/* Bottom Dock Navigation */}
          <BottomNavBar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
      )}

      {/* Admin Authentication Modal */}
      <AdminAuthModal isOpen={isAuthModalOpen} onClose={closeManagementAuth} />

      {/* Customer / Client Firebase Auth Modal (Google & Email) */}
      <AuthModal 
        isOpen={isClientAuthModalOpen} 
        onClose={closeClientAuthModal} 
        defaultMode={clientAuthMode} 
      />

      {/* ZarinPal Payment Result Modal Overlay */}
      {paymentBanner && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in" dir="rtl">
          <div className="relative w-full max-w-[340px] bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[32px] p-6 shadow-2xl space-y-4 text-center animate-in zoom-in-95">
            {paymentBanner.type === 'success' && (
              <>
                <div className="text-3xl">✅</div>
                <h3 className="text-base font-serif font-black text-stone-900">
                  پرداخت با موفقیت انجام شد
                </h3>
                <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1.5 text-right font-medium">
                  {paymentBanner.aptId && (
                    <div className="flex justify-between text-stone-600">
                      <span>کد نوبت:</span>
                      <span className="font-mono font-bold text-stone-900">{paymentBanner.aptId}</span>
                    </div>
                  )}
                  {paymentBanner.refId && (
                    <div className="flex justify-between text-stone-600">
                      <span>کد رهگیری:</span>
                      <span className="font-mono font-bold text-emerald-700">{toPersianDigits(paymentBanner.refId)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentBanner(null);
                      setActiveTab('visits');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                  >
                    نوبت‌های من
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentBanner(null);
                      setActiveTab('atelier');
                    }}
                    className="w-full py-2 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-all cursor-pointer"
                  >
                    بازگشت به صفحه اصلی
                  </button>
                </div>
              </>
            )}

            {paymentBanner.type === 'cancelled' && (
              <>
                <div className="text-3xl">❌</div>
                <h3 className="text-sm font-serif font-bold text-stone-900 leading-relaxed">
                  پرداخت لغو شد. نوبت شما ثبت نشد.
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentBanner(null);
                    setActiveTab('book');
                    navigateBookingStep('services');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#721c24] to-[#5c131a] text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                >
                  شروع رزرو جدید
                </button>
              </>
            )}

            {paymentBanner.type === 'failed' && (
              <>
                <div className="text-3xl">❌</div>
                <h3 className="text-sm font-serif font-bold text-stone-900 leading-relaxed">
                  پرداخت ناموفق بود. لطفاً دوباره تلاش کنید.
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentBanner(null);
                    setActiveTab('book');
                    navigateBookingStep('services');
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#721c24] to-[#5c131a] text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                >
                  شروع رزرو جدید
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function App() {
  return (
    <AtelierProvider>
      <AtelierAppContent />
    </AtelierProvider>
  );
}
