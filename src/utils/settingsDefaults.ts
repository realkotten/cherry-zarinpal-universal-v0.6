import { StudioSettings, StudioOpeningHour, Barber } from '../types';

export const DEFAULT_OPERATING_HOURS: StudioOpeningHour[] = [
  { dayOfWeek: 'شنبه', openTime: '10:00', closeTime: '20:30', isClosed: false },
  { dayOfWeek: 'یکشنبه', openTime: '10:00', closeTime: '20:30', isClosed: false },
  { dayOfWeek: 'دوشنبه', openTime: '10:00', closeTime: '20:30', isClosed: false },
  { dayOfWeek: 'سه‌شنبه', openTime: '10:00', closeTime: '20:30', isClosed: false },
  { dayOfWeek: 'چهارشنبه', openTime: '10:00', closeTime: '20:30', isClosed: false },
  { dayOfWeek: 'پنج‌شنبه', openTime: '10:00', closeTime: '22:00', isClosed: false },
  { dayOfWeek: 'جمعه', openTime: '12:00', closeTime: '18:00', isClosed: false },
];

export function normalizeOpeningHours(rawHours?: any[]): StudioOpeningHour[] {
  if (!Array.isArray(rawHours) || rawHours.length === 0) {
    return DEFAULT_OPERATING_HOURS.map((h) => ({ ...h }));
  }
  const normalized = rawHours.map((h: any, idx: number) => {
    const fallbackDay = DEFAULT_OPERATING_HOURS[idx]?.dayOfWeek || 'شنبه';
    const dayOfWeek = h?.dayOfWeek || h?.dayName || fallbackDay;
    const openTime = h?.openTime || h?.startTime || '10:00';
    const closeTime = h?.closeTime || h?.endTime || '20:30';
    const isClosed =
      typeof h?.isClosed === 'boolean'
        ? h.isClosed
        : typeof h?.isOpen === 'boolean'
        ? !h.isOpen
        : false;
    return {
      dayOfWeek,
      openTime,
      closeTime,
      isClosed,
      ...(h?.breakStart ? { breakStart: h.breakStart } : {}),
      ...(h?.breakEnd ? { breakEnd: h.breakEnd } : {}),
    };
  });
  return normalized;
}

export function normalizeBarberSchedule(barber: Barber): Barber {
  const workingHours = normalizeOpeningHours(barber.workingHours);
  const workingDays =
    Array.isArray(barber.workingDays) && barber.workingDays.length > 0
      ? barber.workingDays
      : workingHours.filter((h) => !h.isClosed).map((h) => h.dayOfWeek);
  return {
    ...barber,
    isAvailableToday: typeof barber.isAvailableToday === 'boolean' ? barber.isAvailableToday : true,
    workingDays,
    workingHours,
  };
}

export const DEFAULT_STUDIO_SETTINGS: StudioSettings = {
  profile: {
    name: 'آرایشگاه رویال',
    tagline: 'رزرو آنلاین نوبت آرایشگاه، بدون تماس تلفنی',
    masterName: 'علی رضایی',
    masterTitle: 'سرآرایشگر و مدیر آرایشگاه',
    phone: '۰۲۱-۲۲۳۳۴۴۵۵',
    conciergePhone: '۰۲۱-۲۲۳۳۴۴۵۵',
    email: 'info@royalbarber.ir',
    address: 'تهران، خیابان نامجو بین کوچه ۵ و ۷',
    neighborhood: '',
    city: 'تهران',
    operationalStatus: 'open',
    privateCourtyardCode: '',
    valetServiceAvailable: false,
    valetInstructions: '',
    amenities: [
      'رزرو آنلاین ۲۴ ساعته',
      'یادآوری خودکار پیامکی',
      'ثبت سوابق و سلیقه مشتری',
      'نظافت و استریل کامل ابزارها',
      'پذیرایی چای و قهوه',
    ],
  },
  announcement: {
    headline: '',
    body: '',
    tag: 'اطلاعیه سالن',
    isActive: false,
  },
  operatingHours: DEFAULT_OPERATING_HOURS,
  policies: {
    cancellationWindowHours: 24,
    bookingCutoffHours: 0,
    maxBookingHorizonDays: 30,
    depositAmount: 15000,
    policyNotice: 'لغو یا جابجایی نوبت تا ۲۴ ساعت پیش از زمان رزرو شده بدون کسر ودیعه انجام می‌پذیرد.',
  },
  financialTargets: {
    today: 850,
    week: 4200,
    month: 18000,
    year: 220000,
    custom: 5000,
  },
  notificationPreferences: {
    newOnlineBooking: true,
    appointmentCancellation: true,
    appointmentReschedule: true,
    newBoutiqueOrder: false,
    paymentConfirmation: true,
    lowInventoryAlerts: false,
  },
  hospitalityEnabled: true,
};

/**
 * Deep merges partial or untyped settings with complete default studio settings
 */
export function mergeSettingsWithDefaults(raw: Partial<StudioSettings> | null | undefined): StudioSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_STUDIO_SETTINGS };
  }
  const mergedProfile = {
    ...DEFAULT_STUDIO_SETTINGS.profile,
    ...(raw.profile || {}),
  };
  if ((raw.profile as any)?.shopName && !raw.profile?.name) {
    mergedProfile.name = (raw.profile as any).shopName;
  }
  if (mergedProfile.neighborhood && /سعادت|سوهو|soho|saadat/i.test(mergedProfile.neighborhood)) {
    mergedProfile.neighborhood = '';
  }
  if (mergedProfile.address && /سعادت/i.test(mergedProfile.address)) {
    mergedProfile.address = mergedProfile.address
      .replace(/تهران،\s*سعادت[‌\s]*آباد،\s*خیابان سرو غربی،\s*پلاک ۲۴/g, 'تهران، خیابان نامجو بین کوچه ۵ و ۷')
      .replace(/،?\s*سعادت[‌\s]*آباد\s*،?/g, ' ')
      .trim();
  }
  if (mergedProfile.name && mergedProfile.name.includes('آتلیه')) {
    mergedProfile.name = mergedProfile.name.replace(/آتلیه/g, 'آرایشگاه');
  }
  if (mergedProfile.tagline && mergedProfile.tagline.includes('آتلیه')) {
    mergedProfile.tagline = mergedProfile.tagline.replace(/آتلیه/g, 'آرایشگاه');
  }
  if (mergedProfile.masterTitle && mergedProfile.masterTitle.includes('آتلیه')) {
    mergedProfile.masterTitle = mergedProfile.masterTitle.replace(/آتلیه/g, 'آرایشگاه');
  }

  return {
    ...DEFAULT_STUDIO_SETTINGS,
    ...raw,
    profile: mergedProfile,
    announcement: {
      ...DEFAULT_STUDIO_SETTINGS.announcement,
      ...(raw.announcement || {}),
    },
    policies: {
      ...DEFAULT_STUDIO_SETTINGS.policies,
      ...(raw.policies || {}),
    },
    financialTargets: {
      ...DEFAULT_STUDIO_SETTINGS.financialTargets,
      ...(raw.financialTargets || {}),
    },
    notificationPreferences: {
      ...DEFAULT_STUDIO_SETTINGS.notificationPreferences,
      ...(raw.notificationPreferences || {}),
    },
    operatingHours:
      Array.isArray(raw.operatingHours) && raw.operatingHours.length > 0
        ? normalizeOpeningHours(raw.operatingHours)
        : DEFAULT_STUDIO_SETTINGS.operatingHours,
  };
}

/**
 * Validates tariff pricing inputs
 */
export function validateTariffInput(price: number, effectiveDate?: string): {
  isValid: boolean;
  error?: string;
} {
  if (isNaN(price) || price === null || price === undefined) {
    return { isValid: false, error: 'لطفاً یک مبلغ عددی معتبر وارد نمایید.' };
  }
  if (price < 0) {
    return { isValid: false, error: 'تعرفه خدمت نمی‌تواند منفی باشد.' };
  }
  if (price > 10000) {
    return { isValid: false, error: 'مبلغ وارد شده بیش از حد مجاز است.' };
  }
  return { isValid: true };
}
